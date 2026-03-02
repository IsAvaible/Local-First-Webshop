import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CartContext,
  type Tag,
  type TagColor,
  type CartNodeShape,
  type CartItemShape,
  type CartFolderShape
} from "./useCartContext";
import { authClient } from "@/lib/auth-client";
import { useLiveQuery } from "@tanstack/react-db";
import { cartsCollection, userSelectedCartCollection } from "@/lib/collections";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import { trpc } from "@/lib/trpc-client";
import type { Cart } from "@/db/schema";
import {
  useEnrichedTree,
  useProductLookups
} from "@/contexts/useCartContextUtils.ts";
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

  // --- State Operations ---
  const addItem = useCallback((productId: number, price: string) => {
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
  }, []);

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
    (itemId: string, qty: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === itemId && n.type === "item" ? { ...n, quantity: qty } : n
        )
      );
    }, []);

  const getItemNotes = useCallback(
    (itemId: string) => {
      const node = nodes.find((n) => n.id === itemId && n.type === "item");

      // Get stock info, excluding the current item
      const { maxStock, currentQty: otherItemsQty } = getProductStockInfo(
        node.product_id,
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

  const { data: carts, isLoading: isCartsLoading } = useLiveQuery(
    (q) => {
      if (userId === undefined) return undefined;
      return q.from({ carts: cartsCollection });
    },
    [userId]
  );

  const { data } = useLiveQuery(
    (q) => {
      if (userId === undefined) return undefined;
      return q.from({ usc: userSelectedCartCollection }).findOne();
    },
    [userId]
  );
  const activeCartId = data?.cart_id;

  const activeCart = useMemo(
    () => carts?.find((c) => c.id === activeCartId),
    [carts, activeCartId]
  );

  const setActiveCartId = useCallback(
    async (id: string) => {
      if (!userId) return undefined;
      if (activeCartId) {
        await userSelectedCartCollection.update(userId, (drafts) => {
          drafts.cart_id = id;
        }).isPersisted.promise;
      } else {
        await userSelectedCartCollection.insert({
          user_id: userId,
          cart_id: id,
          created_at: new Date(),
          updated_at: new Date()
        }).isPersisted.promise;
      }
    },
    [activeCartId, userId]
  );

  const isInitializing = useRef(false);
  useEffect(() => {
    if (
      !isCartsLoading &&
      carts?.length === 0 &&
      !isInitializing.current &&
      userId
    ) {
      isInitializing.current = true;
      trpc.carts.ensureSelected.mutate().catch((e) => {
        console.error("Failed to init cart", e);
        isInitializing.current = false;
      });
    }
  }, [isCartsLoading, carts, userId]);

  const createCart = useCallback(
    (name: string) => {
      cartsCollection.insert({
        id: uuidv4(),
        name,
        created_by_id: userId ?? null,
        created_at: new Date(),
        updated_at: new Date()
      });
    },
    [userId]
  );

  const updateCartName = useCallback(async (cartId: string, name: string) => {
    await cartsCollection.update(cartId, (draft) => {
      draft.name = name;
      draft.updated_at = new Date();
    }).isPersisted.promise;
  }, []);

  const deleteCart = useCallback(
    async (cartId: string) => {
      if (activeCartId === cartId && carts && carts.length > 1) {
        const otherCart = carts.find((c) => c.id !== cartId);
        if (otherCart) await setActiveCartId(otherCart.id);
      }
      await cartsCollection.delete(cartId).isPersisted.promise;
    },
    [activeCartId, carts, setActiveCartId]
  );

  if (!activeCartId) return null;

  return (
    <CartSession
      key={activeCartId}
      cartId={activeCartId}
      userId={userId}
      carts={carts ?? []}
      activeCart={activeCart}
      activeCartId={activeCartId}
      setActiveCartId={setActiveCartId}
      createCart={createCart}
      updateCartName={updateCartName}
      deleteCart={deleteCart}
      isLoadingGlobal={isCartsLoading}
    >
      {children}
    </CartSession>
  );
}
