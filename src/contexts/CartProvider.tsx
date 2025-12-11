import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  type AwarenessUser,
  type CartCollaboratorWithUser,
  CartContext,
  type EnrichedCartNode,
  type EnrichedFlatCartNode,
  type Tag
} from "./useCartContext";
import { authClient } from "@/lib/auth-client";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import {
  cartsCollection,
  productsCollection,
  assetsCollection,
  pricingTiersCollection,
  cartCollaboratorsCollection,
  createApiUrl,
  usersCollection,
  userSelectedCartCollection
} from "@/lib/collections";
import * as Y from "yjs";
import type { TypedMap } from "yjs-types";
import { IndexeddbPersistence } from "y-indexeddb";
import { ElectricProvider, parseToDecoder } from "@electric-sql/y-electric";
import { Awareness } from "y-protocols/awareness";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import * as decoding from "lib0/decoding";
import { trpc } from "@/lib/trpc-client";
import {
  type CartRole,
  type Cart,
  type YCartNodeShape,
  type YCartNodeMap,
  type YTagMap,
  isYItem,
  type YCartFolderShape,
  isYFolderMap,
  isYFolder,
  isYItemMap,
  type YCartItemShape,
  type PricingTier
} from "@/db/schema";

// --- 1. Type Definitions ---

interface UpdateTableSchema {
  update: decoding.Decoder;
}

const COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
  "#f472b6"
];
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};

// --- 2. Inner Component: The Cart Session ---
// This component handles ONE specific cart.
// When the parent changes the `key` prop, this component unmounts and remounts,
// ensuring a clean YDoc and no state bleeding.

type CartSessionProps = {
  cartId: string;
  userId: string | undefined;
  // Global props passed down from Provider
  carts: Cart[];
  activeCart?: Cart;
  activeCartId: string;
  setActiveCartId: (id: string) => Promise<void>;
  createCart: (name: string) => void;
  addCollaborator: (email: string, role: CartRole) => Promise<void>;
  isLoadingGlobal: boolean;
  children: ReactNode;
};

function CartSession({
  cartId,
  userId,
  carts,
  activeCart,
  activeCartId,
  setActiveCartId,
  createCart,
  addCollaborator,
  isLoadingGlobal,
  children
}: CartSessionProps) {
  const roomName = cartId;

  // Initialize YDoc ONCE per session.
  const [ydoc] = useState(() => new Y.Doc());
  const [awareness] = useState(() => new Awareness(ydoc));
  const [isSynced, setIsSynced] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<AwarenessUser[]>([]);

  // --- Yjs Data Binding ---
  const [flatNodes, setFlatNodes] = useState<YCartNodeShape[]>([]);
  const [flatTags, setFlatTags] = useState<Tag[]>([]);

  // The Top-Level maps hold nested Y.Maps (TypedMap<T>)
  const nodesMap = ydoc.getMap<YCartNodeMap>("nodes");
  const tagsMap = ydoc.getMap<YTagMap>("tags");

  useEffect(() => {
    const updateState = () => {
      // Convert Y.Maps to JS Objects
      const nodes: YCartNodeShape[] = [];
      nodesMap.forEach((nodeMap) => {
        nodes.push(nodeMap.toJSON() as YCartNodeShape);
      });
      setFlatNodes(nodes);

      const tags: Tag[] = [];
      tagsMap.forEach((tagMap) => {
        tags.push(tagMap.toJSON() as Tag);
      });
      setFlatTags(tags);
    };

    // It might be smarter to use a hook like use-yjs in the component instead
    // of serializing the whole tree here. Each yjs change causes a re-serialization.
    // Right now we are trading performance with separation of concerns (The component
    // receives a React representation of the state and does not need to know of the data layer).
    // As we have at most 100 items in a cart this performance hit should be fine.
    nodesMap.observeDeep(updateState);
    tagsMap.observeDeep(updateState);
    updateState();

    return () => {
      nodesMap.unobserveDeep(updateState);
      tagsMap.unobserveDeep(updateState);
    };
  }, [nodesMap, tagsMap]);

  // --- Persistence & Sync ---
  useEffect(() => {
    const persistence = new IndexeddbPersistence(roomName, ydoc);
    persistence.on("synced", () => setIsSynced(true));

    const electricProvider = new ElectricProvider<
      // @ts-expect-error This doesn't matter as it's only used for inferring the row.update type
      UpdateTableSchema,
      UpdateTableSchema
    >({
      doc: ydoc,
      documentUpdates: {
        shape: {
          url: createApiUrl(`/api/ydoc-updates`),
          params: { table: `ydoc_updates`, where: `room = '${roomName}'` },
          parser: parseToDecoder
        },
        sendUrl: createApiUrl(`/api/ydoc-updates?room=${roomName}`),
        getUpdateFromRow: (row) => row.update
      },
      awarenessUpdates: {
        protocol: awareness,
        shape: {
          url: createApiUrl(`/api/ydoc-awareness`),
          params: { table: `ydoc_awareness`, where: `room = '${roomName}'` },
          parser: parseToDecoder
        },
        sendUrl: createApiUrl(
          `/api/ydoc-awareness?room=${roomName}&clientId=${ydoc.clientID}`
        ),
        getUpdateFromRow: (row) => row.update
      }
    });

    return () => {
      void persistence.destroy();
      electricProvider.destroy();
      setIsSynced(false);
    };
  }, [roomName, ydoc, awareness, userId]);

  // --- Data Fetching: Collaborators & Users ---

  // 1. Get Collaborators for this cart
  const { data: collaboratorLinks } = useLiveQuery((q) =>
    q
      .from({ collaborator: cartCollaboratorsCollection })
      .where(({ collaborator }) => eq(collaborator.cart_id, cartId))
  );

  const currentCart = carts.find((c) => c.id === cartId);

  // 2. Identify all User IDs involved (Owner + Collaborators)
  const relevantUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentCart?.created_by_id) ids.add(currentCart.created_by_id);
    collaboratorLinks?.forEach((l) => ids.add(l.user_id));
    return Array.from(ids);
  }, [currentCart, collaboratorLinks]);

  // 3. Fetch User Profiles
  const { data: usersData } = useLiveQuery(
    (q) => {
      if (relevantUserIds.length === 0) return undefined;
      return q
        .from({ user: usersCollection })
        .where(({ user }) => inArray(user.id, relevantUserIds));
    },
    [relevantUserIds]
  );

  // 4. Construct Collaborator Objects
  const collaborators: CartCollaboratorWithUser[] = useMemo(() => {
    if (!usersData || !currentCart) return [];

    return usersData.flatMap((user) => {
      const isOwner = user.id === currentCart.created_by_id;
      const link = collaboratorLinks?.find((l) => l.user_id === user.id);

      // Return empty array to "filter" this item out
      if (!link) return [];

      const role: CartRole = isOwner ? "admin" : (link?.role ?? "viewer");

      const isOnline =
        user.id === userId ||
        !!onlineUsers.find((aw) => aw.user.id === user.id);

      return [
        {
          name: user.name ?? "Unknown User",
          email: user.email ?? "",
          avatarUrl: user.image ?? undefined,
          isOnline,
          ...link,
          role
        }
      ];
    });
  }, [userId, usersData, currentCart, onlineUsers, collaboratorLinks]);

  // 5. Determine Current User's Permissions
  const cartRole: CartRole = useMemo(() => {
    if (userId) {
      const myCollab = collaborators.find((c) => c.user_id === userId);
      if (myCollab) return myCollab.role;
    }

    return "viewer";
  }, [collaborators, userId]);
  const canManageUsers = cartRole === "admin";
  const canManageItems = cartRole !== "viewer";

  // --- Data Fetching: Products & Assets ---

  const uniqueProductIds = useMemo(() => {
    const ids = new Set<number>();
    flatNodes.forEach((n) => {
      if (isYItem(n)) ids.add(n.product_id);
    });
    return Array.from(ids).sort();
  }, [
    // Stable stringify of strictly relevant fields
    // This might cause issues if flatNodes is out of sync (as it is built from the source of truth from by React)
    JSON.stringify(flatNodes.map((n) => (isYItem(n) ? n.product_id : "F")))
  ]);

  const { data: productsData, isLoading: isProductsLoading } = useLiveQuery(
    (q) => {
      if (uniqueProductIds.length === 0) return undefined;
      return q
        .from({ p: productsCollection })
        .where(({ p }) => inArray(p.id, uniqueProductIds));
    },
    [uniqueProductIds]
  );

  const { data: assetsData, isLoading: isAssetsLoading } = useLiveQuery(
    (q) => {
      if (uniqueProductIds.length === 0) return undefined;
      return q
        .from({ a: assetsCollection })
        .where(({ a }) => inArray(a.product_id, uniqueProductIds))
        .orderBy(({ a }) => a.id, "desc");
    },
    [uniqueProductIds]
  );

  const { data: tiersData, isLoading: isTiersLoading } = useLiveQuery(
    (q) => {
      if (uniqueProductIds.length === 0) return undefined;
      return q
        .from({ pt: pricingTiersCollection })
        .where(({ pt }) => inArray(pt.product_id, uniqueProductIds));
    },
    [uniqueProductIds]
  );

  // --- Awareness Logic ---

  // 1. Identify Current User Details for Awareness
  const currentUserProfile = useMemo(() => {
    if (userId) {
      const currentUser = usersData?.find((u) => u.id === userId);
      return {
        id: userId,
        name: currentUser?.name ?? "Unknown User",
        avatarUrl: currentUser?.image ?? undefined,
        color: stringToColor(userId)
      };
    }
    return undefined;
  }, [userId, usersData]);

  // 2. Broadcast Local Presence
  useEffect(() => {
    if (!isSynced || !currentUserProfile) return;

    awareness.setLocalStateField("user", currentUserProfile);

    return () => {
      awareness.setLocalState(null);
    };
  }, [awareness, currentUserProfile, isSynced]);

  // 3. Listen for Remote Presence
  useEffect(() => {
    const onAwarenessChange = () => {
      const states = awareness.getStates();
      const users: AwarenessUser[] = [];

      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            clientId,
            user: state.user as AwarenessUser["user"]
          });
        }
      });

      // Deduplicate by User ID (in case user has multiple tabs open)
      const uniqueUsers = Array.from(
        new Map(users.map((u) => [u.user.id, u])).values()
      );

      setOnlineUsers(uniqueUsers);
    };

    awareness.on("change", onAwarenessChange);
    // Trigger initial load
    onAwarenessChange();

    return () => {
      awareness.off("change", onAwarenessChange);
    };
  }, [awareness]);

  // --- Tree Construction ---

  const isLoadingData =
    isLoadingGlobal || isTiersLoading || isProductsLoading || isAssetsLoading;

  // --- 0. Create Lookup Maps (O(M)) ---
  const { productMap, assetMap, tiersMap } = useMemo(() => {
    // Map: Product ID -> Product
    const pMap = new Map(productsData?.map((p) => [p.id, p]));

    // Map: Product ID -> Asset
    const aMap = new Map(assetsData?.map((a) => [a.product_id, a]));

    // Map: Product ID -> Sorted Tiers Array
    // Group tiers by product_id once, upfront
    const tMap = new Map<number, PricingTier[]>();
    (tiersData ?? []).forEach((tier) => {
      if (!tMap.has(tier.product_id)) tMap.set(tier.product_id, []);
      tMap.get(tier.product_id)!.push(tier);
    });
    // Sort tiers once
    tMap.forEach((tiers) =>
      tiers.sort((a, b) => b.min_quantity - a.min_quantity)
    );

    return { productMap: pMap, assetMap: aMap, tiersMap: tMap };
  }, [productsData, assetsData, tiersData]);

  // --- 1. Create Intermediate Enriched Flat Array (O(N)) ---
  const enrichedFlatNodes: EnrichedFlatCartNode[] = useMemo(() => {
    if (isLoadingData) return [];

    return flatNodes.map((node) => {
      if (isYItem(node)) {
        // O(1) Lookups!
        const product = productMap.get(node.product_id);
        const asset = assetMap.get(node.product_id);
        const validTiers = tiersMap.get(node.product_id) ?? [];

        const bestTier = validTiers.find(
          (t) => t.min_quantity <= node.quantity
        );

        return {
          ...node,
          product,
          asset,
          price: bestTier?.price_per_unit ?? node.price_snapshot
        };
      }
      return { ...node };
    });
  }, [flatNodes, productMap, assetMap, tiersMap, isLoadingData]);

  const enrichedFlatItems = useMemo(
    () => enrichedFlatNodes.filter(isYItem),
    [enrichedFlatNodes]
  );

  // Build Tree from Enriched Flat Nodes
  const enrichedTree: EnrichedCartNode[] = useMemo(() => {
    if (enrichedFlatNodes.length === 0) return [];

    const nodesByParent: Record<string, EnrichedCartNode[]> = {};
    const rootNodes: EnrichedCartNode[] = [];

    enrichedFlatNodes.forEach((node) => {
      let newNode: EnrichedCartNode;
      if (isYFolder(node)) {
        newNode = { ...node, children: [] };
      } else {
        newNode = node;
      }
      if (!node.parent_id) {
        rootNodes.push(newNode);
      } else {
        if (!nodesByParent[node.parent_id]) {
          nodesByParent[node.parent_id] = [];
        }
        nodesByParent[node.parent_id].push(newNode);
      }
    });

    const sortNodes = (a: EnrichedCartNode, b: EnrichedCartNode) => {
      if (a.order === b.order) return a.id.localeCompare(b.id);
      return a.order < b.order ? -1 : 1;
    };

    // Recursive builder that grabs children from the lookup table
    const buildHierarchy = (node: EnrichedCartNode): EnrichedCartNode => {
      if (node.type === "item") {
        return { ...node };
      }
      const children = nodesByParent[node.id] || [];
      children.sort(sortNodes);

      return {
        ...node,
        children: children.map(buildHierarchy)
      };
    };

    rootNodes.sort(sortNodes);
    return rootNodes.map(buildHierarchy);
  }, [enrichedFlatNodes]);

  // --- Operations (Inner) ---

  const addItem = useCallback(
    (productId: number, price: string) => {
      ydoc.transact(() => {
        const lastRootNode = flatNodes
          .filter((n) => n.parent_id === null)
          .sort((a, b) => (a.order < b.order ? -1 : 1))
          .pop();

        const newOrder = generateKeyBetween(lastRootNode?.order ?? null, null);

        const id = uuidv4();
        const itemMap = new Y.Map() as TypedMap<YCartItemShape>;

        itemMap.set("id", id);
        itemMap.set("type", "item");
        itemMap.set("parent_id", null);
        itemMap.set("order", newOrder);
        itemMap.set("product_id", productId);
        itemMap.set("quantity", 1);
        itemMap.set("price_snapshot", price);
        itemMap.set("tag_ids", []);
        itemMap.set("notes", null);
        itemMap.set("created_at", Date.now());

        nodesMap.set(id, itemMap);
      });
    },
    [ydoc, nodesMap, flatNodes]
  );

  const createFolder = useCallback(
    (name: string) => {
      ydoc.transact(() => {
        const id = uuidv4();
        const folderMap = new Y.Map() as TypedMap<YCartFolderShape>;

        folderMap.set("id", id);
        folderMap.set("type", "folder");
        folderMap.set("parent_id", null);
        folderMap.set("order", generateKeyBetween(null, null));
        folderMap.set("name", name);

        nodesMap.set(id, folderMap);
      });
    },
    [ydoc, nodesMap]
  );

  const moveNode = useCallback(
    (
      activeId: string,
      targetFolderId: string | null,
      newIndexInFolder: number
    ) => {
      ydoc.transact(() => {
        const nodeToMove = nodesMap.get(activeId);
        if (!nodeToMove) return;

        // 1. Cycle Detection
        if (isYFolderMap(nodeToMove) && targetFolderId) {
          let currentParentId: string | null = targetFolderId;

          // Limit nesting depth to prevent infinite loops (due to erroneous state in yjs)
          const MAX_NESTING = 100;
          let depth = 0;

          while (currentParentId) {
            if (depth++ > MAX_NESTING) {
              console.error(
                "Exceeded MAX_NESTING. Aborting move to prevent infinite loop."
              );
              return;
            }
            if (currentParentId === activeId) {
              console.warn("Cannot move a folder into its own child.");
              return;
            }
            const parentMap = nodesMap.get(currentParentId);
            currentParentId = parentMap?.get("parent_id") ?? null;
          }
        }

        // 2. Find Siblings
        const siblings = flatNodes
          .filter((n) => n.parent_id === targetFolderId && n.id !== activeId)
          .sort((a, b) => (a.order < b.order ? -1 : 1));

        const prevNode = siblings[newIndexInFolder - 1];
        const nextNode = siblings[newIndexInFolder];

        const newOrder = generateKeyBetween(
          prevNode?.order || null,
          nextNode?.order || null
        );

        nodeToMove.set("parent_id", targetFolderId);
        nodeToMove.set("order", newOrder);
      });
    },
    [ydoc, nodesMap, flatNodes]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      ydoc.transact(() => {
        const idsToDelete = [itemId];

        // Cascading delete helper
        const scanChildren = (parentId: string) => {
          flatNodes.forEach((n) => {
            if (n.parent_id === parentId) {
              idsToDelete.push(n.id);
              if (isYFolder(n)) scanChildren(n.id);
            }
          });
        };

        const node = nodesMap.get(itemId);
        if (node && isYFolderMap(node)) {
          scanChildren(itemId);
        }

        idsToDelete.forEach((id) => nodesMap.delete(id));
      });
    },
    [ydoc, nodesMap, flatNodes]
  );

  const updateItemQuantity = useCallback(
    (itemId: string, qty: number) => {
      ydoc.transact(() => {
        const item = nodesMap.get(itemId);
        if (item && isYItemMap(item)) {
          item.set("quantity", qty);
        }
      });
    },
    [ydoc, nodesMap]
  );

  const updateItemNotes = useCallback(
    (itemId: string, notes: string) => {
      ydoc.transact(() => {
        const item = nodesMap.get(itemId);
        if (item && isYItemMap(item)) {
          item.set("notes", notes);
        }
      });
    },
    [ydoc, nodesMap]
  );

  const updateFolder = useCallback(
    (folderId: string, name: string) => {
      ydoc.transact(() => {
        const folder = nodesMap.get(folderId);
        if (folder && isYFolderMap(folder)) {
          folder.set("name", name);
        }
      });
    },
    [ydoc, nodesMap]
  );

  const createTag = useCallback(
    (name: string) => {
      ydoc.transact(() => {
        const id = uuidv4();
        const tagMap = new Y.Map() as YTagMap;
        tagMap.set("id", id);
        tagMap.set("name", name);
        tagMap.set("color", null);
        tagsMap.set(id, tagMap);
      });
    },
    [ydoc, tagsMap]
  );

  const addTagToItem = useCallback(
    (itemId: string, tagId: string) => {
      ydoc.transact(() => {
        const item = nodesMap.get(itemId);
        if (item && isYItemMap(item)) {
          const tags = item.get("tag_ids") ?? [];
          if (!tags.includes(tagId)) {
            item.set("tag_ids", [...tags, tagId]);
          }
        }
      });
    },
    [ydoc, nodesMap]
  );

  const removeTagFromItem = useCallback(
    (itemId: string, tagId: string) => {
      ydoc.transact(() => {
        const item = nodesMap.get(itemId);
        if (item && isYItemMap(item)) {
          const tags = item.get("tag_ids") ?? [];
          item.set(
            "tag_ids",
            tags.filter((t) => t !== tagId)
          );
        }
      });
    },
    [ydoc, nodesMap]
  );

  const updateTag = useCallback(
    (tagId: string, name: string) => {
      ydoc.transact(() => {
        const tagMap = tagsMap.get(tagId);
        if (tagMap) {
          tagMap.set("name", name);
        }
      });
    },
    [ydoc, tagsMap]
  );

  const deleteTag = useCallback(
    (tagId: string) => {
      ydoc.transact(() => {
        // 1. Delete tag definition
        tagsMap.delete(tagId);

        // 2. Remove tag reference from all items
        // We iterate the Y.Map directly for writes to ensure atomicity
        // (Using flatNodes for reads is okay, but for writes we want direct map access)
        for (const nodeMap of nodesMap.values()) {
          if (isYItemMap(nodeMap)) {
            const currentTags = nodeMap.get("tag_ids") ?? [];
            if (currentTags.includes(tagId)) {
              nodeMap.set(
                "tag_ids",
                currentTags.filter((t) => t !== tagId)
              );
            }
          }
        }
      });
    },
    [ydoc, tagsMap, nodesMap]
  );

  // --- Collaborator Management Actions ---

  const updateCollaboratorRole = async (
    collaboratorRowId: string,
    newRole: CartRole
  ) => {
    const tx = cartCollaboratorsCollection.update(
      collaboratorRowId,
      (draft) => {
        draft.role = newRole;
      }
    );
    await tx.isPersisted.promise;
  };

  const removeCollaborator = async (collaboratorRowId: string) => {
    const tx = cartCollaboratorsCollection.delete(collaboratorRowId);
    await tx.isPersisted.promise;
  };

  const value = {
    cartId: roomName,
    rootNodes: enrichedTree,
    enrichedFlatItems,
    tags: flatTags,
    collaborators,
    cartRole,
    canManageUsers,
    canManageItems,
    isLoading: isLoadingData,
    isSynced,
    carts,
    activeCart,
    activeCartId,
    setActiveCartId,
    createCart,
    onlineUsers,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemNotes,
    moveNode,
    createFolder,
    updateFolder,
    createTag,
    updateTag,
    deleteTag,
    addTagToItem,
    removeTagFromItem
  };

  return <CartContext value={value}>{children}</CartContext>;
}

// --- 3. Outer Component: The Provider ---
// This handles Global state (Auth, Carts List) and deciding WHICH session to render.

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // Fetch all relevant carts
  // The server handles the filtering for Owner, Collaborator.
  const { data: carts, isLoading: isCartsLoading } = useLiveQuery(
    (q) => {
      if (userId === undefined) return undefined;
      return q.from({ carts: cartsCollection });
    },
    [userId] // Trigger re-fetches on auth change
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
      const tx = userSelectedCartCollection.update(userId, (drafts) => {
        drafts.cart_id = id;
      });
      await tx.isPersisted.promise;
    },
    [userId]
  );

  // Create initial cart if needed
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

  // Global Actions passed to session
  const createCart = useCallback(
    (name: string) => {
      const id = uuidv4();
      cartsCollection.insert({
        id,
        name,
        created_by_id: userId ?? null,
        created_at: new Date(),
        updated_at: new Date()
      });
    },
    [userId]
  );

  const addCollaborator = useCallback(
    async (email: string, role: CartRole) => {
      if (!activeCartId) return;
      await trpc.cartCollaborators.invite.mutate({
        cart_id: activeCartId,
        email,
        role
      });
    },
    [activeCartId]
  );

  // Loading state
  // If we are loading carts, or if we have carts but no active one yet (logic pending), we show generic loading or nothing.
  // But we must provide context even if loading to avoid errors in children?
  // No, children use `useCart()`. If we don't render `CartSession` (which renders Provider), `useCart` throws.
  // So we must render *something* or make sure children handle missing context (they don't).
  // So we delay rendering children until we have a session.

  if (!activeCartId) {
    return null; // Or a spinner
  }

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
      addCollaborator={addCollaborator}
      isLoadingGlobal={isCartsLoading}
    >
      {children}
    </CartSession>
  );
}
