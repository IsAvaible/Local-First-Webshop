import { createFileRoute } from "@tanstack/react-router";
import { Cart } from "@/components/cart/Cart";

export const Route = createFileRoute("/cart")({
  component: CartPage
});

function CartPage() {
  return (
    <div className="container mx-auto p-4">
      <Cart />
    </div>
  );
}
