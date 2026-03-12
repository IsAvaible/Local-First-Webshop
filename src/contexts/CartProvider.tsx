import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
  CartContext,
  type Tag,
  type TagColor,
  type CartNodeShape,
  type CartItemShape,
  type CartFolderShape
} from "./useCartContext";
import { authClient } from "@/lib/auth-client";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import type { Cart } from "@/db/schema";
import { useEnrichedTree } from "@/contexts/useCartContextUtils.ts";
import { useProductLookups } from "@/hooks/queries/useProductQueries.ts";
import { toast } from "sonner";

type CartSessionProps = {
  cartId: string;
  userId: string | undefined;
  carts: Cart[];
  activeCart?: Cart;
  activeCartId: string;
  setActiveCartId: (id: string) => Promise<void>;
  createCart: (name: string) => void;
  updateCartName: (cartId: string, name: string) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;
  isLoadingGlobal: boolean;
  children: ReactNode;
};

function CartSession({
  cartId,
  carts,
  activeCart,
  activeCartId,
  setActiveCartId,
  createCart,
  updateCartName,
  deleteCart,
  isLoadingGlobal,
  children
}: CartSessionProps) {
  // --- In-Memory Data State ---
  const [nodes, setNodes] = useState<CartNodeShape[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Hardcoded for UI compatibility, since everything is client-only now
  const isSynced = true;
  const connectivityStatus = "connected";
  const canManageItems = true;

  // --- Data Fetching: Products & Assets ---
  const uniqueProductIds = useMemo(() => {
    const ids = new Set<number>();
    nodes.forEach((n) => {
      if (n.type === "item") ids.add(n.product_id);
    });
    return Array.from(ids);
  }, [nodes]);

  const { lookupMaps, isLoading: isLoadingLookup } =
    useProductLookups(uniqueProductIds);
  const isLoadingData = isLoadingGlobal || isLoadingLookup;

  const { rootNodes: enrichedTree, enrichedFlatItems } = useEnrichedTree(
    nodes,
    lookupMaps,
    isLoadingData
  );

  // --- Operations (Inner) ---

  const getProductStockInfo = useCallback(
    (productId: number, providedStock?: number, excludeItemId?: string) => {
      // Resolve max available stock
      let maxStock = providedStock;
      if (maxStock === undefined) {
        const enriched = enrichedFlatItems.find(
          (n) => n.product_id === productId
        );
        maxStock = enriched?.product?.stock_sum;
      }

      // Calculate current quantity in the cart
      let currentQty = 0;
      nodes.forEach((n) => {
        if (
          n.type === "item" &&
          n.product_id === productId &&
          n.id !== excludeItemId
        ) {
          currentQty += n.quantity ?? 0;
        }
      });

      return { maxStock, currentQty };
    },
    [enrichedFlatItems, nodes]
  );

  // --- State Operations ---
  const addItem = useCallback(
    (productId: number, price: string, stock_sum?: number) => {
      const { maxStock, currentQty } = getProductStockInfo(
        productId,
        stock_sum
      );

      // Guard against exceeding stock
      if (maxStock !== undefined && currentQty >= maxStock) {
        toast.error(
          `Cannot add product, as the stock limit of ${maxStock} was already reached.`
        );
        return;
      }

      const id = uuidv4();
      setNodes((prev) => {
        const lastRootNode = prev
          .filter((n) => n.parent_id === null)
          .sort((a, b) => ((a.order ?? "") < (b.order ?? "") ? -1 : 1))
          .pop();

        const newOrder = generateKeyBetween(lastRootNode?.order ?? null, null);

        const newItem: CartItemShape = {
          id,
          type: "item",
          parent_id: null,
          order: newOrder,
          product_id: productId,
          quantity: 1,
          price_snapshot: price,
          tag_ids: [],
          notes: "",
          is_selected: true,
          created_at: Date.now()
        };
        return [...prev, newItem];
      });
      return id;
    },
    [getProductStockInfo]
  );

  const createFolder = useCallback((name: string) => {
    setNodes((prev) => {
      const newFolder: CartFolderShape = {
        id: uuidv4(),
        type: "folder",
        parent_id: null,
        order: generateKeyBetween(null, null),
        name
      };
      return [...prev, newFolder];
    });
  }, []);

  const moveNode = useCallback(
    (
      activeId: string,
      targetFolderId: string | null,
      newIndexInFolder: number
    ) => {
      setNodes((prev) => {
        const nodeToMove = prev.find((n) => n.id === activeId);
        if (!nodeToMove) return prev;

        // Cycle Detection
        if (nodeToMove.type === "folder" && targetFolderId) {
          let currentParentId: string | null = targetFolderId;
          let depth = 0;
          while (currentParentId) {
            if (depth++ > 100) return prev;
            if (currentParentId === activeId) return prev;
            const parent = prev.find((n) => n.id === currentParentId);
            currentParentId = parent?.parent_id ?? null;
          }
        }

        const siblings = prev
          .filter((n) => n.parent_id === targetFolderId && n.id !== activeId)
          .sort((a, b) => ((a.order ?? "") < (b.order ?? "") ? -1 : 1));

        const prevNode = siblings[newIndexInFolder - 1];
        const nextNode = siblings[newIndexInFolder];
        const newOrder = generateKeyBetween(
          prevNode?.order ?? null,
          nextNode?.order ?? null
        );

        return prev.map((n) =>
          n.id === activeId
            ? { ...n, parent_id: targetFolderId, order: newOrder }
            : n
        );
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setNodes((prev) => {
      const idsToDelete = new Set([itemId]);
      const scanChildren = (parentId: string) => {
        prev.forEach((n) => {
          if (n.parent_id === parentId) {
            idsToDelete.add(n.id);
            if (n.type === "folder") scanChildren(n.id);
          }
        });
      };
      const node = prev.find((n) => n.id === itemId);
      if (node?.type === "folder") scanChildren(itemId);

      return prev.filter((n) => !idsToDelete.has(n.id));
    });
  }, []);

  const updateItemQuantity = useCallback(
    (itemId: string, qty: number, stock_sum?: number) => {
      const item = nodes.find((n) => n.id === itemId && n.type === "item");
      if (item?.type !== "item") return;

      const productId = item.product_id;

      // Get stock info, excluding the current item
      const { maxStock, currentQty: otherItemsQty } = getProductStockInfo(
        productId,
        stock_sum,
        itemId
      );

      let finalQty = qty;

      // Clamp the requested quantity
      if (maxStock !== undefined) {
        const maxAllowedForThisItem = Math.max(0, maxStock - otherItemsQty);
        finalQty = Math.min(qty, maxAllowedForThisItem);

        if (qty > maxAllowedForThisItem) {
          toast.error(
            `Cannot set quantity to ${qty} as it exceeds available stock. Max allowed is ${maxAllowedForThisItem}.`
          );
        }
      }

      setNodes((prev) =>
        prev.map((n) =>
          n.id === itemId && n.type === "item"
            ? { ...n, quantity: finalQty }
            : n
        )
      );
    },
    [nodes, getProductStockInfo]
  );

  const getItemNotes = useCallback(
    (itemId: string) => {
      const node = nodes.find((n) => n.id === itemId && n.type === "item");
      return node?.type === "item" ? node.notes : undefined;
    },
    [nodes]
  );

  const updateItemNotes = useCallback((itemId: string, text: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === itemId && n.type === "item" ? { ...n, notes: text } : n
      )
    );
  }, []);

  const updateFolder = useCallback((folderId: string, name: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === folderId && n.type === "folder" ? { ...n, name } : n
      )
    );
  }, []);

  const createTag = useCallback((name: string, color: TagColor) => {
    setTags((prev) => [...prev, { id: uuidv4(), name, color }]);
  }, []);

  const addTagToItem = useCallback((itemId: string, tagId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === itemId && n.type === "item") {
          return {
            ...n,
            tag_ids: n.tag_ids.includes(tagId)
              ? n.tag_ids
              : [...n.tag_ids, tagId]
          };
        }
        return n;
      })
    );
  }, []);

  const removeTagFromItem = useCallback((itemId: string, tagId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === itemId && n.type === "item"
          ? { ...n, tag_ids: n.tag_ids.filter((t) => t !== tagId) }
          : n
      )
    );
  }, []);

  const updateTag = useCallback(
    (tagId: string, name?: string, color?: TagColor) => {
      setTags((prev) =>
        prev.map((t) =>
          t.id === tagId
            ? { ...t, ...(name && { name }), ...(color && { color }) }
            : t
        )
      );
    },
    []
  );

  const deleteTag = useCallback((tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setNodes((prev) =>
      prev.map((n) =>
        n.type === "item" && n.tag_ids.includes(tagId)
          ? { ...n, tag_ids: n.tag_ids.filter((t) => t !== tagId) }
          : n
      )
    );
  }, []);

  const toggleItemSelection = useCallback((itemId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === itemId && n.type === "item"
          ? { ...n, is_selected: !n.is_selected }
          : n
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      cartId,
      rootNodes: enrichedTree,
      enrichedFlatItems,
      tags,
      canManageItems,
      isLoading: isLoadingData,
      isSynced,
      connectivityStatus,
      carts,
      activeCart,
      activeCartId,
      setActiveCartId,
      createCart,
      updateCartName,
      deleteCart,
      addItem,
      removeItem,
      updateItemQuantity,
      getItemNotes,
      updateItemNotes,
      moveNode,
      createFolder,
      updateFolder,
      createTag,
      updateTag,
      deleteTag,
      addTagToItem,
      removeTagFromItem,
      toggleItemSelection
    }),
    [
      cartId,
      enrichedTree,
      enrichedFlatItems,
      tags,
      canManageItems,
      isLoadingData,
      isSynced,
      connectivityStatus,
      carts,
      activeCart,
      activeCartId,
      setActiveCartId,
      createCart,
      updateCartName,
      deleteCart,
      addItem,
      removeItem,
      updateItemQuantity,
      getItemNotes,
      updateItemNotes,
      moveNode,
      createFolder,
      updateFolder,
      createTag,
      updateTag,
      deleteTag,
      addTagToItem,
      removeTagFromItem,
      toggleItemSelection
    ]
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // Initialize with a default cart since there's no DB
  const [carts, setCarts] = useState<Cart[]>(() => [
    {
      id: uuidv4(),
      name: "Default Cart",
      created_by_id: userId ?? null,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  const [activeCartId, setActiveCartIdState] = useState<string>(carts[0].id);

  const activeCart = useMemo(
    () => carts.find((c) => c.id === activeCartId),
    [carts, activeCartId]
  );

  // eslint-disable-next-line @typescript-eslint/require-await
  const setActiveCartId = useCallback(async (id: string) => {
    setActiveCartIdState(id);
  }, []);

  const createCart = useCallback(
    (name: string) => {
      const newCart: Cart = {
        id: uuidv4(),
        name,
        created_by_id: userId ?? null,
        created_at: new Date(),
        updated_at: new Date()
      };
      setCarts((prev) => [...prev, newCart]);
    },
    [userId]
  );

  // eslint-disable-next-line @typescript-eslint/require-await
  const updateCartName = useCallback(async (cartId: string, name: string) => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id === cartId ? { ...cart, name, updated_at: new Date() } : cart
      )
    );
  }, []);

  const deleteCart = useCallback(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (cartId: string) => {
      setCarts((prev) => {
        const remaining = prev.filter((c) => c.id !== cartId);

        // If the user deleted the currently active cart, switch to another one
        if (activeCartId === cartId && remaining.length > 0) {
          setActiveCartIdState(remaining[0].id);
        }

        return remaining;
      });
    },
    [activeCartId]
  );

  if (!activeCartId) return null;

  return (
    <CartSession
      key={activeCartId}
      cartId={activeCartId}
      userId={userId}
      carts={carts}
      activeCart={activeCart}
      activeCartId={activeCartId}
      setActiveCartId={setActiveCartId}
      createCart={createCart}
      updateCartName={updateCartName}
      deleteCart={deleteCart}
      isLoadingGlobal={false}
    >
      {children}
    </CartSession>
  );
}
