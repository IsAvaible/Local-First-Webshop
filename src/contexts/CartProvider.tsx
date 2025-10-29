import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { CartContext } from "./useCartContext";
import { authClient } from "@/lib/auth-client.ts";
import { and, eq, useLiveQuery, Query, min } from "@tanstack/react-db";
import {
  cartCollaboratorsCollection,
  cartItemsCollection,
  cartsCollection,
  usersCollection,
  cartFoldersCollection,
  cartItemTagsCollection,
  cartTagsCollection,
  productsCollection,
  assetsCollection
} from "@/lib/collections.ts";
import type { CartRole } from "@/db/schema.ts";

// --- Provider ---
export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // 1. Get the user's default cart
  const { data: cart, isLoading: isCartPending } = useLiveQuery(
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

  useEffect(() => {
    // We only create a cart if:
    // - We have a logged-in user (userId)
    // - The query for the cart is finished (!isCartPending)
    // - No default cart was found (!cart)
    if (userId && !isCartPending && !cart) {
      const createDefaultCart = () => {
        try {
          cartsCollection.insert({
            id: Math.floor(Math.random() * 1000000), // Client-gen ID
            name: "Cart",
            owner_user_id: userId,
            is_default: true,
            guest_session_id: null,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`Created default cart for user: ${userId}`);
        } catch (error) {
          console.error("Failed to create default cart:", error);
        }
      };

      createDefaultCart();
    }
  }, [userId, isCartPending, cart]);

  const cartId = cart?.id;

  // 2. Get items for that cart (enriched with product and first asset)
  const { data: items, isLoading: isItemsPending } = useLiveQuery(
    (q) => {
      if (!cartId) return undefined;

      // Build a subquery to find the first asset id per product
      const firstAssetIdSubquery = new Query()
        .from({ a: assetsCollection })
        .groupBy(({ a }) => a.product_id)
        .select(({ a }) => ({
          product_id: a.product_id,
          first_asset_id: min(a.id)
        }));

      // Main query: cart items joined to product and asset
      return q
        .from({ i: cartItemsCollection })
        .where(({ i }) => eq(i.cart_id, cartId))
        .leftJoin({ p: productsCollection }, ({ i, p }) =>
          eq(p.id, i.product_id)
        )
        .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
          eq(p?.id, fa_id.product_id)
        )
        .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
          eq(asset.id, fa_id?.first_asset_id)
        )
        .orderBy(({ i }) => i.created_at)
        .select(({ i, p, asset }) => ({
          ...i,
          product: p,
          asset: asset
        }));
    },
    [cartId]
  );
  const itemIds = useMemo(() => items?.map((i) => i.id) ?? [], [items]);

  // 3. Get collaborators for that cart
  const { data: collaborators, isLoading: isCollabsPending } = useLiveQuery(
    (q) => {
      if (!cartId) return undefined;
      return q
        .from({ collabs: cartCollaboratorsCollection })
        .where(({ collabs }) => eq(collabs.cart_id, cartId));
    },
    [cartId]
  );

  // 4. Get all users
  const { data: allUsers, isLoading: isUsersPending } = useLiveQuery((q) =>
    q.from({ users: usersCollection })
  );

  // 5. Get folders for that cart
  const { data: folders, isLoading: isFoldersPending } = useLiveQuery(
    (q) => {
      if (!cartId) return undefined;
      return q
        .from({ folders: cartFoldersCollection })
        .where(({ folders }) => eq(folders.cart_id, cartId))
        .orderBy(({ folders }) => folders.sort_order);
    },
    [cartId]
  );

  // 6. Get all available tags for that cart
  const { data: tags, isLoading: isTagsPending } = useLiveQuery(
    (q) => {
      if (!cartId) return undefined;
      return q
        .from({ tags: cartTagsCollection })
        .where(({ tags }) => eq(tags.cart_id, cartId));
    },
    [cartId]
  );

  // 7. Get all item-tag associations
  const { data: itemTags, isLoading: isItemTagsPending } = useLiveQuery(
    (q) => {
      if (itemIds.length === 0) return undefined;
      return q
        .from({ itemTags: cartItemTagsCollection })
        .where(({ itemTags }) => eq(itemTags.cart_item_id, cartId));
    },
    [itemIds]
  );

  const isLoading =
    isCartPending ||
    isItemsPending ||
    isCollabsPending ||
    isUsersPending ||
    isFoldersPending ||
    isTagsPending ||
    isItemTagsPending;

  // --- Operations ---

  const addItem = useCallback(
    (productId: number, price: string, currency = "EUR") => {
      if (!cart) return;
      const existingItem = items?.find(
        (i) => i.product_id === productId && i.cart_id === cart.id
      );
      if (existingItem) {
        cartItemsCollection.update(existingItem.id, (draft) => {
          draft.quantity = (draft.quantity ?? 1) + 1;
        });
      } else {
        cartItemsCollection.insert({
          id: Math.floor(Math.random() * 1000000), // Client-gen ID
          cart_id: cart.id,
          product_id: productId,
          quantity: 1,
          price_snapshot: price,
          currency: currency,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
          folder_id: null,
          sort_order: 0
        });
      }
    },
    [cart, items]
  );

  const removeItem = useCallback((itemId: number) => {
    cartItemsCollection.delete(itemId);
  }, []);

  const updateItemQuantity = useCallback(
    (itemId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        cartItemsCollection.delete(itemId);
      } else {
        cartItemsCollection.update(itemId, (draft) => {
          draft.quantity = newQuantity;
        });
      }
    },
    []
  );

  const updateItemNotes = useCallback((itemId: number, notes: string) => {
    cartItemsCollection.update(itemId, (draft) => {
      draft.notes = notes;
    });
  }, []);

  const updateItemFolderAndSort = useCallback(
    (
      itemId: number,
      data: { folder_id?: number | null; sort_order?: number }
    ) => {
      cartItemsCollection.update(itemId, (draft) => {
        if (data.folder_id !== undefined) {
          draft.folder_id = data.folder_id;
        }
        if (data.sort_order !== undefined) {
          draft.sort_order = data.sort_order;
        }
      });
    },
    []
  );

  const updateCartName = useCallback(
    (newName: string) => {
      if (cart) {
        cartsCollection.update(cart.id, (draft) => {
          draft.name = newName;
        });
      }
    },
    [cart]
  );

  const addCollaborator = useCallback(
    (userId: string, role: CartRole) => {
      if (cart) {
        cartCollaboratorsCollection.insert({
          id: Math.floor(Math.random() * 1000000), // Client-gen ID
          cart_id: cart.id,
          user_id: userId,
          role: role,
          created_at: new Date()
        });
      }
    },
    [cart]
  );

  const removeCollaborator = useCallback((collaboratorId: number) => {
    cartCollaboratorsCollection.delete(collaboratorId);
  }, []);

  const updateCollaboratorRole = useCallback(
    (collaboratorId: number, newRole: CartRole) => {
      cartCollaboratorsCollection.update(collaboratorId, (draft) => {
        draft.role = newRole;
      });
    },
    []
  );

  // --- Folder Operations ---
  const createFolder = useCallback(
    (name: string, sort_order: number) => {
      if (cart) {
        cartFoldersCollection.insert({
          id: Math.floor(Math.random() * 1000000), // Client-gen ID
          cart_id: cart.id,
          name: name,
          sort_order: sort_order,
          created_at: new Date()
        });
      }
    },
    [cart]
  );

  const updateFolder = useCallback(
    (folderId: number, data: { name?: string; sort_order?: number }) => {
      cartFoldersCollection.update(folderId, (draft) => {
        if (data.name !== undefined) draft.name = data.name;
        if (data.sort_order !== undefined) draft.sort_order = data.sort_order;
      });
    },
    []
  );

  const deleteFolder = useCallback((folderId: number) => {
    cartFoldersCollection.delete(folderId);
  }, []);

  // --- Tag Operations ---
  const createTag = useCallback(
    (name: string) => {
      if (cart) {
        cartTagsCollection.insert({
          id: Math.floor(Math.random() * 1000000),
          cart_id: cart.id,
          name: name,
          color: "",
          created_at: new Date()
        });
      }
    },
    [cart]
  );

  const updateTag = useCallback((tagId: number, name: string) => {
    cartTagsCollection.update(tagId, (draft) => {
      draft.name = name;
    });
  }, []);

  const deleteTag = useCallback((tagId: number) => {
    cartTagsCollection.delete(tagId);
  }, []);

  // --- Item-Tag Association Operations ---
  const addTagToItem = useCallback((itemId: number, tagId: number) => {
    cartItemTagsCollection.insert({
      id: Math.floor(Math.random() * 1000000), // Client-gen ID
      cart_item_id: itemId,
      cart_tag_id: tagId,
      created_at: new Date()
    });
  }, []);

  const removeTagFromItem = useCallback((itemTagId: number) => {
    cartItemTagsCollection.delete(itemTagId);
  }, []);

  // --- Context Value ---
  const value = {
    cart,
    items,
    folders,
    tags,
    itemTags,
    collaborators,
    allUsers,
    session,
    isLoading,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemNotes,
    updateItemFolderAndSort,
    updateCartName,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorRole,
    createFolder,
    updateFolder,
    deleteFolder,
    createTag,
    updateTag,
    deleteTag,
    addTagToItem,
    removeTagFromItem
  };

  return <CartContext value={value}>{children}</CartContext>;
}
