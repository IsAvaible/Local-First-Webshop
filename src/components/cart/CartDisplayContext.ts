import { createContext, use } from "react";

export const CartDisplayContext = createContext<{
  displayItemSelect?: boolean;
}>({});

export const useCartDisplay = () => use(CartDisplayContext);
