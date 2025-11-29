import { createContext, use } from "react";
import type { Product, Asset } from "@/db/schema";
import type { YCartItem, YCartFolder } from "@/db/schema";

// Enriched types for UI
export interface EnrichedCartItem extends YCartItem {
  product?: Product | null;
  asset?: Asset | null;
  price?: string | null;
}

export interface EnrichedCartFolder
  extends Omit<YCartFolder, "children" | "type"> {
  type: "folder";
  children: EnrichedCartNode[];
}

export type EnrichedCartNode = EnrichedCartItem | EnrichedCartFolder;

// The Tag Shape
export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export interface CartContextType {
  // --- Data ---
  cartId: string | undefined;
  rootNodes: EnrichedCartNode[] | undefined; // The main tree

  tags: { id: string; name: string; color: string | null }[] | undefined;

  isLoading: boolean;
  isSynced: boolean;

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
