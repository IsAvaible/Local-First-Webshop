import { createFileRoute } from "@tanstack/react-router";
import { Cart } from "@/components/cart/Cart";
import { useCart } from "@/contexts/useCartContext.ts";
import { useEffect } from "react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";

const cartSearchSchema = z.object({
  id: z.string().optional()
});

export const Route = createFileRoute("/cart")({
  ssr: true,
  validateSearch: zodValidator(cartSearchSchema),
  component: CartPage
});

function CartPage() {
  const { id: cartId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { setActiveCartId } = useCart();

  useEffect(() => {
    if (cartId) {
      void setActiveCartId(cartId).catch(() => toast("Failed to load cart"));
    }
  }, [cartId, navigate, setActiveCartId]);

  return (
    <div className="container mx-auto p-4">
      <Cart />
    </div>
  );
}
