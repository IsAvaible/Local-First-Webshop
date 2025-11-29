import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { CartContext, type EnrichedCartNode, type Tag } from "./useCartContext";
import { authClient } from "@/lib/auth-client";
import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db";
import {
  cartsCollection,
  productsCollection,
  assetsCollection,
  pricingTiersCollection,
  createApiUrl
} from "@/lib/collections";
import * as Y from "yjs";
import type { TypedMap } from "yjs-types";
import { IndexeddbPersistence } from "y-indexeddb";
import { ElectricProvider, parseToDecoder } from "@electric-sql/y-electric";
import { Awareness } from "y-protocols/awareness";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import * as decoding from "lib0/decoding";

// --- 1. Strict Type Definitions ---

// Common fields for all nodes
type BaseNodeShape = {
  id: string;
  parent_id: string | null; // null = root
  order: string; // Fractional index key
};

// Item specific fields
type YCartItemShape = BaseNodeShape & {
  type: "item";
  product_id: number;
  quantity: number;
  price_snapshot: string;
  tag_ids: string[];
  notes: string | null;
  created_at: number;
};

// Folder specific fields
type YCartFolderShape = BaseNodeShape & {
  type: "folder";
  name: string;
};

// The Union Type representing the raw JSON data
type YCartNodeShape = YCartItemShape | YCartFolderShape;

// --- Yjs Specific Types ---
// These wrap the JSON shapes into Yjs TypedMaps
type YCartNodeMap = TypedMap<YCartNodeShape>;
type YTagMap = TypedMap<Tag>;

// Type Guards for narrowing the union
function isItem(node: YCartNodeShape): node is YCartItemShape {
  return node.type === "item";
}

function isFolder(node: YCartNodeShape): node is YCartFolderShape {
  return node.type === "folder";
}

// Helper to safely check type on a Y.Map without full JSON conversion
function isYItemMap(map: YCartNodeMap): map is TypedMap<YCartItemShape> {
  return map.get("type") === "item";
}

function isYFolderMap(map: YCartNodeMap): map is TypedMap<YCartFolderShape> {
  return map.get("type") === "folder";
}

interface UpdateTableSchema {
  update: decoding.Decoder;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // --- 2. SQL Discovery & Initialization ---

  const { data: sqlCart, isLoading: isSqlCartLoading } = useLiveQuery(
    (q) => {
      if (!userId) return undefined;
      return q
        .from({ carts: cartsCollection })
        .where(({ carts }) =>
          and(eq(carts.owner_user_id, userId), eq(carts.is_default, true))
        )
        .findOne();
    },
    [userId]
  );

  const initAttempted = useRef(false);

  useEffect(() => {
    // This might not seem 100% safe, as unique creation of resources shouldn't
    // be up to the client. However, if a duplication happens, the database constraint
    // should reject the duplicate cart and the client can recover by re-querying.
    if (userId && !isSqlCartLoading && !sqlCart && !initAttempted.current) {
      initAttempted.current = true;
      const tx = cartsCollection.insert({
        id: uuidv4(),
        name: "Cart",
        owner_user_id: userId,
        guest_session_id: null,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      tx.isPersisted.promise.catch((e) => {
        console.error("Failed to init cart", e);
        initAttempted.current = false;
      });
    }
  }, [userId, isSqlCartLoading, sqlCart]);

  const roomName = sqlCart?.id;

  // --- 3. Yjs Setup (Strictly Typed) ---

  const [ydoc] = useState(() => new Y.Doc());
  const [awareness] = useState(() => new Awareness(ydoc));
  const [isSynced, setIsSynced] = useState(false);

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

  useEffect(() => {
    if (!roomName) return;
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
  }, [roomName, ydoc, awareness]);

  // --- 4. Enrichment (Strictly Typed) ---

  const uniqueProductIds = useMemo(() => {
    const ids = new Set<number>();
    flatNodes.forEach((n) => {
      if (isItem(n)) ids.add(n.product_id);
    });
    return Array.from(ids).sort();
  }, [
    // Stable stringify of strictly relevant fields
    // This might cause issues if flatNodes is out of sync (as it is built from the source of truth from by React)
    JSON.stringify(flatNodes.map((n) => (isItem(n) ? n.product_id : "F")))
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
        .where(({ a }) => inArray(a.product_id, uniqueProductIds));
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

  // --- 5. Tree Construction (Read Logic) ---

  const isLoadingData =
    isSqlCartLoading || isTiersLoading || isProductsLoading || isAssetsLoading;

  const enrichedTree: EnrichedCartNode[] = useMemo(() => {
    if (isLoadingData) return []; // Basic loading check

    const nodesByParent: Record<string, YCartNodeShape[]> = {};
    const rootNodes: YCartNodeShape[] = [];

    flatNodes.forEach((node) => {
      if (!node.parent_id) {
        rootNodes.push(node);
      } else {
        if (!nodesByParent[node.parent_id]) {
          nodesByParent[node.parent_id] = [];
        }
        nodesByParent[node.parent_id].push(node);
      }
    });

    const sortNodes = (a: YCartNodeShape, b: YCartNodeShape) => {
      if (a.order === b.order) return a.id.localeCompare(b.id);
      return a.order < b.order ? -1 : 1;
    };

    const buildTree = (node: YCartNodeShape): EnrichedCartNode => {
      if (isItem(node)) {
        const product = productsData?.find((p) => p.id === node.product_id);
        const asset = assetsData?.find((a) => a.product_id === node.product_id);

        const validTiers = (tiersData ?? [])
          .filter((t) => t.product_id === node.product_id)
          .sort((a, b) => b.min_quantity - a.min_quantity);

        const bestTier = validTiers.find(
          (t) => t.min_quantity <= node.quantity
        );

        return {
          ...node,
          product,
          asset,
          price: bestTier?.price_per_unit ?? node.price_snapshot
        };
      } else {
        const children = nodesByParent[node.id] || [];
        children.sort(sortNodes);

        return {
          ...node,
          type: "folder",
          children: children.map(buildTree)
        };
      }
    };

    rootNodes.sort(sortNodes);
    return rootNodes.map(buildTree);
  }, [flatNodes, productsData, assetsData, tiersData, isTiersLoading]);

  // --- 6. Operations (Write Logic) ---

  const addItem = useCallback(
    (productId: number, price: string) => {
      ydoc.transact(() => {
        // Find the last node in the root to append after
        const lastRootNode = flatNodes
          .filter((n) => n.parent_id === null)
          .sort((a, b) => (a.order < b.order ? -1 : 1))
          .pop();

        const newOrder = generateKeyBetween(lastRootNode?.order ?? null, null);

        const id = uuidv4();
        // Initialize as TypedMap
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

        // 2. Find Siblings (using JS array for speed)
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
              if (isFolder(n)) scanChildren(n.id);
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

  const value = {
    cartId: roomName,
    rootNodes: enrichedTree,
    tags: flatTags,
    isLoading: isLoadingData,
    isSynced,
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
