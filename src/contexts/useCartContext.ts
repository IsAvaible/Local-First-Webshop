import { createContext, use } from "react";
import type {
  Product,
  Asset,
  CartCollaborator,
  Cart,
  CartRole
} from "@/db/schema";

// Assuming you update your schema to replace Y.Text with string for notes
export interface CartItemShape {
  id: string;
  type: "item";
  parent_id: string | null;
  order: string | null;
  product_id: number;
  quantity: number;
  price_snapshot: string;
  tag_ids: string[];
  notes: string; // <-- Changed from Y.Text
  is_selected: boolean;
  created_at: number;
}

export interface CartFolderShape {
  id: string;
  type: "folder";
  parent_id: string | null;
  order: string | null;
  name: string;
}

export type CartNodeShape = CartItemShape | CartFolderShape;

// Enriched types for UI
export interface EnrichedFlatCartItem extends CartItemShape {
  product?: Product | null;
  asset?: Asset | null;
  price?: string | null;
}

export type EnrichedCartItem = Omit<EnrichedFlatCartItem, "parent_id">;

export interface EnrichedCartFolder
  extends Omit<CartFolderShape, "children" | "parent_id"> {
  children: EnrichedCartNode[];
}

export type EnrichedFlatCartNode = EnrichedFlatCartItem | CartFolderShape;
export type EnrichedCartNode = EnrichedCartItem | EnrichedCartFolder;

export const TAG_COLORS = [
  "blue",
  "red",
  "orange",
  "amber",
  "green",
  "emerald",
  "teal",
  "cyan",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose"
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export type Tag = {
  id: string;
  name: string;
  color?: TagColor;
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
  rootNodes: EnrichedCartNode[] | undefined;
  enrichedFlatItems: EnrichedFlatCartItem[] | undefined;
  tags: Tag[] | undefined;

  isLoading: boolean;
  isSynced: boolean;

  // --- Cart Management ---
  carts: Cart[];
  activeCart?: Cart;
  activeCartId: string | null;
  setActiveCartId: (id: string) => Promise<void>;
  createCart: (name: string) => void;
  updateCartName: (cartId: string, name: string) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;

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
  addItem: (productId: number, price: string) => string | undefined;
  removeItem: (itemId: string, parentFolderId?: string | null) => void;
  updateItemQuantity: (itemId: string, newQuantity: number) => void;
  getItemNotes: (itemId: string) => string | undefined;
  updateItemNotes: (itemId: string, text: string) => void;

  moveNode: (
    activeId: string,
    targetFolderId: string | null,
    newIndexInFolder: number
  ) => void;
  createFolder: (name: string) => void;
  updateFolder: (folderId: string, name: string) => void;

  // Tag Ops
  createTag: (name: string, color: TagColor) => void;
  updateTag: (tagId: string, name?: string, color?: TagColor) => void;
  deleteTag: (tagId: string) => void;
  addTagToItem: (itemId: string, tagId: string) => void;
  removeTagFromItem: (itemId: string, tagId: string) => void;

  toggleItemSelection: (itemId: string) => void;
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
