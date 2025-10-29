import { createContext, use } from "react";
import {
  type Cart,
  type CartItem,
  type CartCollaborator,
  type CartRole,
  type User,
  type CartFolder,
  type CartTag,
  type CartItemTag,
  type Product,
  type Asset
} from "@/db/schema";

export interface EnrichedCartItem extends CartItem {
  product?: Product | null;
  asset?: Asset | null;
}

export interface CartContextType {
  // --- Data ---
  cart: Cart | undefined;
  items: EnrichedCartItem[] | undefined;
  folders: CartFolder[] | undefined;
  tags: CartTag[] | undefined;
  itemTags: CartItemTag[] | undefined;
  collaborators: CartCollaborator[] | undefined;
  allUsers: User[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  session: unknown | null | undefined;
  isLoading: boolean;

  // --- Cart Item Operations ---
  addItem: (productId: number, price: string, currency?: string) => void;
  removeItem: (itemId: number) => void;
  updateItemQuantity: (itemId: number, newQuantity: number) => void;
  updateItemNotes: (itemId: number, notes: string) => void;
  updateItemFolderAndSort: (
    itemId: number,
    data: { folder_id?: number | null; sort_order?: number }
  ) => void;

  // --- Cart/Collaborator Operations ---
  updateCartName: (newName: string) => void;
  addCollaborator: (userId: string, role: CartRole) => void;
  removeCollaborator: (collaboratorId: number) => void;
  updateCollaboratorRole: (collaboratorId: number, newRole: CartRole) => void;

  // --- Folder Operations (Added Section) ---
  createFolder: (name: string, sort_order: number) => void;
  updateFolder: (
    folderId: number,
    data: { name?: string; sort_order?: number }
  ) => void;
  deleteFolder: (folderId: number) => void;

  // --- Tag Operations (Added Section) ---
  createTag: (name: string) => void;
  updateTag: (tagId: number, name: string) => void;
  deleteTag: (tagId: number) => void;

  // --- Item-Tag Association Operations (Added Section) ---
  addTagToItem: (itemId: number, tagId: number) => void;
  removeTagFromItem: (itemTagId: number) => void;
}

// --- Context ---
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
