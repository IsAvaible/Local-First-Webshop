import { createContext, use } from "react";
import type { Product, Asset, CartCollaborator } from "@/db/schema";
import type {
  YCartItemShape,
  YCartFolderShape,
  Cart,
  CartRole,
  YCartSnapshotShape
} from "@/db/schema";
import * as Y from "yjs";
import type { ConnectivityStatus } from "@electric-sql/y-electric";

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

// The Tag Shape
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
  rootNodes: EnrichedCartNode[] | undefined; // The main tree
  enrichedFlatItems: EnrichedFlatCartItem[] | undefined;

  snapshots: YCartSnapshotShape[];

  tags: Tag[] | undefined;

  isLoading: boolean;
  isSynced: boolean;
  connectivityStatus: ConnectivityStatus;

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
  getItemNotesYText: (itemId: string) => Y.Text | undefined;

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

  // --- Internal Yjs Doc ---
  __yDoc: Y.Doc;
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
