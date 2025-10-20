import { type ReactNode, useReducer } from "react";
import { CartContext, cartReducer } from "@/contexts/useCartContext.ts";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, dispatch] = useReducer(cartReducer, { items: [], tags: [] });

  const addToCart = (productId: string) => {
    dispatch({ type: "ADD_TO_CART", payload: { productId } });
  };

  const value = {
    cart,
    dispatch,
    addToCart
  };

  return <CartContext value={value}>{children}</CartContext>;
};
