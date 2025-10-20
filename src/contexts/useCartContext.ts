import { createContext, use, type Dispatch } from "react";
import { arrayMove } from "@dnd-kit/sortable";

// Types
export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  tags?: string[];
}

export interface CartFolder {
  id: string;
  name: string;
  items: CartItem[];
}

export type CartSortableItem = CartItem | CartFolder;

export interface CartState {
  items: CartSortableItem[];
  tags: string[];
}

// Actions
export type Action =
  | { type: "ADD_TO_CART"; payload: { productId: string } }
  | { type: "REMOVE_ITEM"; payload: { itemId: string } }
  | {
      type: "UPDATE_ITEM_QUANTITY";
      payload: { itemId: string; quantity: number };
    }
  | { type: "UPDATE_ITEM_NOTES"; payload: { itemId: string; notes: string } }
  | { type: "ADD_TAG"; payload: { tag: string } }
  | { type: "ADD_TAG_TO_ITEM"; payload: { itemId: string; tag: string } }
  | { type: "REMOVE_TAG_FROM_ITEM"; payload: { itemId: string; tag: string } }
  | { type: "CREATE_FOLDER"; payload: { name: string } }
  | {
      type: "MOVE_ITEM_TO_FOLDER";
      payload: { itemId: string; folderId: string };
    }
  | { type: "MOVE_ITEM"; payload: { activeId: string; overId: string } };

// Reducer
export const cartReducer = (state: CartState, action: Action): CartState => {
  switch (action.type) {
    case "ADD_TO_CART": {
      // Simplified: doesn't handle nested items
      const existingItemIndex = state.items.findIndex(
        (item) =>
          "productId" in item && item.productId === action.payload.productId
      );
      if (existingItemIndex > -1) {
        const items = [...state.items];
        const item = items[existingItemIndex] as CartItem;
        items[existingItemIndex] = { ...item, quantity: item.quantity + 1 };
        return { ...state, items };
      } else {
        const newItem: CartItem = {
          id: `item-${Date.now()}`,
          productId: action.payload.productId,
          quantity: 1,
          tags: []
        };
        return { ...state, items: [...state.items, newItem] };
      }
    }
    case "CREATE_FOLDER": {
      const newFolder: CartFolder = {
        id: `folder-${Date.now()}`,
        name: action.payload.name,
        items: []
      };
      return { ...state, items: [...state.items, newFolder] };
    }
    case "MOVE_ITEM": {
      const { activeId, overId } = action.payload;
      const activeIndex = state.items.findIndex((item) => item.id === activeId);
      const overIndex = state.items.findIndex((item) => item.id === overId);
      return {
        ...state,
        items: arrayMove(state.items, activeIndex, overIndex)
      };
    }
    // ... other cases ...
    case "UPDATE_ITEM_NOTES": {
      const { itemId, notes } = action.payload;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === itemId ? { ...item, notes } : item
        )
      };
    }
    case "ADD_TAG": {
      if (state.tags.includes(action.payload.tag)) return state;
      return { ...state, tags: [...state.tags, action.payload.tag] };
    }
    case "ADD_TAG_TO_ITEM": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.itemId && "tags" in item
            ? { ...item, tags: [...(item.tags ?? []), action.payload.tag] }
            : item
        )
      };
    }
    case "REMOVE_TAG_FROM_ITEM": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.itemId && "tags" in item
            ? {
                ...item,
                tags: item.tags?.filter((t) => t !== action.payload.tag)
              }
            : item
        )
      };
    }
    case "MOVE_ITEM_TO_FOLDER": {
      const { itemId, folderId } = action.payload;
      const itemToMove = state.items.find(
        (item) => item.id === itemId
      ) as CartItem;
      if (!itemToMove) return state;

      return {
        ...state,
        items: state.items
          .filter((item) => item.id !== itemId)
          .map((item) =>
            item.id === folderId && "items" in item
              ? { ...item, items: [...item.items, itemToMove] }
              : item
          )
      };
    }
    default:
      return state;
  }
};

// Context
export interface CartContextType {
  cart: CartState;
  dispatch: Dispatch<Action>;
  addToCart: (productId: string) => void;
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
