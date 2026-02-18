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
  type Tag,
  type TagColor
} from "./useCartContext";
import { authClient } from "@/lib/auth-client";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import {
  cartCollaboratorsCollection,
  cartsCollection,
  createApiUrl,
  usersCollection,
  userSelectedCartCollection
} from "@/lib/collections";
import * as Y from "yjs";
import type { TypedMap } from "yjs-types";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  type ConnectivityStatus,
  ElectricProvider,
  parseToDecoder
} from "@electric-sql/y-electric";
import { Awareness } from "y-protocols/awareness";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import * as decoding from "lib0/decoding";
import { trpc } from "@/lib/trpc-client";
import {
  type Cart,
  type CartRole,
  isYFolder,
  isYFolderMap,
  isYItem,
  isYItemMap,
  type YCartFolderShape,
  type YCartItemShape,
  type YCartNodeMap,
  type YCartNodeShape,
  type YCartSnapshotShape,
  type YTagMap
} from "@/db/schema";
import {
  getSnapshotDelta,
  useEnrichedTree,
  useProductLookups
} from "@/contexts/useCartContextUtils.ts";

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
  updateCartName: (cartId: string, name: string) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;
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
  updateCartName,
  deleteCart,
  addCollaborator,
  isLoadingGlobal,
  children
}: CartSessionProps) {
  const roomName = cartId;

  // Initialize YDoc ONCE per session.
  const [ydoc] = useState(() => new Y.Doc({ gc: false }));
  const [awareness] = useState(() => new Awareness(ydoc));

  // Track dirty state to avoid expensive snapshot calculations
  const isDirtyRef = useRef(false);

  const [isSynced, setIsSynced] = useState(false);
  const [connectivityStatus, setConnectivityStatus] =
    useState<ConnectivityStatus>("connected");

  const [onlineUsers, setOnlineUsers] = useState<AwarenessUser[]>([]);

  // --- Yjs Data Binding ---
  const [flatNodes, setFlatNodes] = useState<YCartNodeShape[]>([]);
  const [flatTags, setFlatTags] = useState<Tag[]>([]);
  const [flatSnapshots, setFlatSnapshots] = useState<YCartSnapshotShape[]>([]);

  // The Top-Level maps hold nested Y.Maps (TypedMap<T>)
  const nodesMap = ydoc.getMap<YCartNodeMap>("nodes");
  const tagsMap = ydoc.getMap<YTagMap>("tags");
  const snapshotsArray = ydoc.getArray<YCartSnapshotShape>("snapshots");

  useEffect(() => {
    const updateState = () => {
      isDirtyRef.current = true;

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

    const updateSnapshots = () => {
      setFlatSnapshots(snapshotsArray.toJSON() as YCartSnapshotShape[]);
    };

    // It might be smarter to use a hook like use-yjs in the component instead
    // of serializing the whole tree here. Each yjs change causes a re-serialization.
    // Right now we are trading performance with separation of concerns (The component
    // receives a React representation of the state and does not need to know of the data layer).
    // As we have at most 100 items in a cart this performance hit should be fine.
    nodesMap.observeDeep(updateState);
    tagsMap.observeDeep(updateState);
    snapshotsArray.observe(updateSnapshots);
    updateState();
    updateSnapshots();

    return () => {
      nodesMap.unobserveDeep(updateState);
      tagsMap.unobserveDeep(updateState);
      snapshotsArray.unobserve(updateSnapshots);
    };
  }, [nodesMap, tagsMap, snapshotsArray]);

  // Depending functions on a ref instead of flatNodes will prevent function recreation
  const currentNodesRef = useRef(flatNodes);

  // Update the ref whenever the incoming prop changes
  useEffect(() => {
    currentNodesRef.current = flatNodes;
  }, [flatNodes]);

  useEffect(() => {
    if (!isSynced) return;

    const timer = setInterval(() => {
      if (!isDirtyRef.current) return;

      const currentNodes = currentNodesRef.current;

      // Don't snapshot an empty cart
      if (currentNodes.length === 0) return;

      ydoc.transact(() => {
        // Get the Previous State from the Yjs history
        let lastSavedNodes: YCartNodeShape[] = [];

        if (snapshotsArray.length > 0) {
          try {
            // Get the very last snapshot object from the Y.Array
            const lastSnapshotWrapper = snapshotsArray.get(
              snapshotsArray.length - 1
            );

            if (lastSnapshotWrapper?.snapshot) {
              const snap = Y.decodeSnapshot(lastSnapshotWrapper.snapshot);
              const tempDoc = Y.createDocFromSnapshot(ydoc, snap);

              // Extract the 'nodes' map
              const tempMap = tempDoc.getMap("nodes");
              lastSavedNodes = Object.values(
                tempMap.toJSON()
              ) as YCartNodeShape[];
            }
          } catch (e) {
            console.error(
              "Failed to decode previous snapshot for comparison",
              e
            );
          }
        }

        // Calculate Delta
        const delta = getSnapshotDelta(lastSavedNodes, currentNodes);

        if (
          delta.addedCount === 0 &&
          delta.removedCount === 0 &&
          delta.modifiedCount === 0
        ) {
          isDirtyRef.current = false;
          return; // Exact match found in history. Skipping save.
        }

        // Capture Authors
        const activeAuthors = Array.from(awareness.getStates().values())
          .map(
            (state) => (state.user as AwarenessUser["user"]).name || "Unknown"
          )
          .filter((value, index, self) => self.indexOf(value) === index);

        // Create New Snapshot
        const snapshotObj = Y.snapshot(ydoc);
        const encodedSnapshot = Y.encodeSnapshot(snapshotObj);

        const snapshot: YCartSnapshotShape = {
          id: uuidv4(),
          timestamp: Date.now(),
          snapshot: encodedSnapshot,
          meta: {
            summary: delta.summary,
            delta: delta,
            authors: activeAuthors
          }
        };

        snapshotsArray.push([snapshot]);
        isDirtyRef.current = false;
      }, "snapshot-origin");
    }, 60000);

    return () => clearInterval(timer);
  }, [isSynced, ydoc, snapshotsArray, awareness]);

  // --- Persistence & Sync ---
  useEffect(() => {
    const persistenceName = `yjs-cart-${roomName}`;
    const persistence = new IndexeddbPersistence(persistenceName, ydoc);
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

    let statusTimeout: NodeJS.Timeout | undefined;

    electricProvider.on("status", (event) => {
      const newStatus = event.status;

      clearTimeout(statusTimeout);
      statusTimeout = undefined;

      if (newStatus === "connected") {
        // Immediate update for success
        setConnectivityStatus("connected");
      } else {
        // Delay update for errors/connecting
        statusTimeout = setTimeout(() => {
          setConnectivityStatus(newStatus);
          statusTimeout = undefined;
        }, 500);
      }
    });

    const handleOnline = () => {
      // Force the provider to reconnect immediately when the OS detects internet
      if (!electricProvider.connected) {
        electricProvider.connect();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearTimeout(statusTimeout);

      void persistence.destroy();
      electricProvider.destroy();
      setIsSynced(false);
    };
  }, [roomName, ydoc, awareness, userId]);

  useEffect(() => {
    // Destroy the doc when the component unmounts
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

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
      const link = collaboratorLinks?.find((l) => l.user_id === user.id);

      // Return empty array to "filter" this item out
      if (!link) return [];

      const role: CartRole = link?.role ?? "viewer";

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
    return Array.from(ids);
  }, [flatNodes]);

  // 2. Use Shared Hook
  const { lookupMaps, isLoading: isLoadingLookup } =
    useProductLookups(uniqueProductIds);

  const isLoadingData = isLoadingGlobal || isLoadingLookup;

  // Use Shared Enrichment Hook
  const { rootNodes: enrichedTree, enrichedFlatItems } = useEnrichedTree(
    flatNodes,
    lookupMaps,
    isLoadingData
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
    if (!currentUserProfile) return;

    awareness.setLocalStateField("user", currentUserProfile);
  }, [awareness, currentUserProfile]);

  // 3. Handle Disconnect on Unmount
  useEffect(() => {
    return () => {
      awareness.setLocalState(null);
    };
  }, [awareness]);

  // 4. Listen for Remote Presence
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

  // --- Operations (Inner) ---

  const addItem = useCallback(
    (productId: number, price: string) => {
      return ydoc
        .transact(() => {
          const lastRootNode = currentNodesRef.current
            .filter((n) => n.parent_id === null)
            .sort((a, b) => (a.order < b.order ? -1 : 1))
            .pop();

          const newOrder = generateKeyBetween(
            lastRootNode?.order ?? null,
            null
          );

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
          itemMap.set("notes", new Y.Text());
          itemMap.set("is_selected", true);
          itemMap.set("created_at", Date.now());

          nodesMap.set(id, itemMap);
          return itemMap;
        })
        .get("id");
    },
    [ydoc, nodesMap]
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
        const siblings = currentNodesRef.current
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
    [ydoc, nodesMap, currentNodesRef]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      ydoc.transact(() => {
        const idsToDelete = [itemId];

        // Cascading delete helper
        const scanChildren = (parentId: string) => {
          currentNodesRef.current.forEach((n) => {
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
    [ydoc, nodesMap]
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

  const getItemNotesYText = useCallback(
    (itemId: string) => {
      const item = nodesMap.get(itemId);
      if (item && isYItemMap(item)) {
        return item.get("notes");
      }
      return undefined;
    },
    [nodesMap]
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
    (name: string, color: TagColor) => {
      ydoc.transact(() => {
        const id = uuidv4();
        const tagMap = new Y.Map() as YTagMap;
        tagMap.set("id", id);
        tagMap.set("name", name);
        tagMap.set("color", color);
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
    (tagId: string, name?: string, color?: TagColor) => {
      ydoc.transact(() => {
        const tagMap = tagsMap.get(tagId);
        if (tagMap) {
          if (name) tagMap.set("name", name);
          if (color) tagMap.set("color", color);
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

  const toggleItemSelection = useCallback(
    (itemId: string) => {
      ydoc.transact(() => {
        const item = nodesMap.get(itemId);
        if (item && isYItemMap(item)) {
          const current = item.get("is_selected") ?? true;
          item.set("is_selected", !current);
        }
      });
    },
    [ydoc, nodesMap]
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
    snapshots: flatSnapshots,
    collaborators,
    cartRole,
    canManageUsers,
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
    onlineUsers,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    addItem,
    removeItem,
    updateItemQuantity,
    getItemNotesYText,
    moveNode,
    createFolder,
    updateFolder,
    createTag,
    updateTag,
    deleteTag,
    addTagToItem,
    removeTagFromItem,
    toggleItemSelection,
    __yDoc: ydoc
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

  const updateCartName = useCallback(async (cartId: string, name: string) => {
    await cartsCollection.update(cartId, (draft) => {
      draft.name = name;
      draft.updated_at = new Date();
    }).isPersisted.promise;
  }, []);

  const deleteCart = useCallback(
    async (cartId: string) => {
      // Switch to another one first if possible
      if (activeCartId === cartId && carts && carts.length > 1) {
        const otherCart = carts.find((c) => c.id !== cartId);
        if (otherCart) {
          await setActiveCartId(otherCart.id);
        }
      }

      await cartsCollection.delete(cartId).isPersisted.promise;
    },
    [activeCartId, carts, setActiveCartId]
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
  // If we are loading carts, or if we have carts but no active one yet (logic pending),
  // we delay rendering children until we have a session.
  if (!activeCartId) {
    return null;
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
      updateCartName={updateCartName}
      deleteCart={deleteCart}
      addCollaborator={addCollaborator}
      isLoadingGlobal={isCartsLoading}
    >
      {children}
    </CartSession>
  );
}
