import { createContext, use } from "react";
import type { Product, Asset, CartCollaborator } from "@/db/schema";
import type {
  YCartItemShape,
  YCartFolderShape,
  Cart,
  CartRole
} from "@/db/schema";

// Enriched types for UI
export interface EnrichedFlatCartItem extends YCartItemShape {
  product?: Product | null;
  asset?: Asset | null;
  price?: string | null;
}

export type EnrichedCartItem = Omit<EnrichedFlatCartItem, "parent_id">;

export interface EnrichedCartFolder
  extends Omit<YCartFolderShape, "children" | "parent_id"> {
  children: EnrichedCartNode[];
}

export type EnrichedFlatCartNode = EnrichedFlatCartItem | YCartFolderShape;
export type EnrichedCartNode = EnrichedCartItem | EnrichedCartFolder;

// The Tag Shape
export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type AwarenessUser = {
  clientId: number;
  user: {
    id: string;
    name: string;
    color: string;
    avatarUrl?: string;
  };
};

export type CartCollaboratorWithUser = CartCollaborator & {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isOnline: boolean;
};

export interface CartContextType {
  // --- Data ---
  cartId: string | undefined;
  rootNodes: EnrichedCartNode[] | undefined; // The main tree
  enrichedFlatItems: EnrichedFlatCartItem[] | undefined;

  tags: { id: string; name: string; color: string | null }[] | undefined;

  isLoading: boolean;
  isSynced: boolean;

  // --- Cart Management ---
  carts: Cart[];
  activeCart?: Cart;
  activeCartId: string | null;
  setActiveCartId: (id: string) => void;
  createCart: (name: string) => void;

  cartRole: CartRole;
  canManageUsers: boolean;
  canManageItems: boolean;

  onlineUsers: AwarenessUser[];
  collaborators: CartCollaboratorWithUser[];
  addCollaborator: (email: string, role: CartRole) => Promise<void>;
  updateCollaboratorRole: (
    collaboratorRowId: string,
    newRole: CartRole
  ) => Promise<void>;
  removeCollaborator: (collaboratorRowId: string) => Promise<void>;

  // --- Operations ---
  addItem: (productId: number, price: string) => void;
  removeItem: (itemId: string, parentFolderId?: string | null) => void;
  updateItemQuantity: (itemId: string, newQuantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;

  moveNode: (
    activeId: string,
    targetFolderId: string | null,
    newIndexInFolder: number
  ) => void;

  createFolder: (name: string) => void;
  updateFolder: (folderId: string, name: string) => void;

  // Tag Ops
  createTag: (name: string) => void;
  updateTag: (tagId: string, name: string) => void;
  deleteTag: (tagId: string) => void;
  addTagToItem: (itemId: string, tagId: string) => void;
  removeTagFromItem: (itemId: string, tagId: string) => void;
}

export const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export const useCart = () => {
  const context = use(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
