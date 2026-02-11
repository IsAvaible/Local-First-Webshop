import { createFileRoute } from "@tanstack/react-router";
import { Cart } from "@/components/cart/Cart";
import { useCart } from "@/contexts/useCartContext.ts";
import { useEffect } from "react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import {
  cartsCollection,
  userSelectedCartCollection,
  productsCollection,
  pricingTiersCollection,
  assetsCollection,
  cartCollaboratorsCollection,
  usersCollection
} from "@/lib/collections";

const cartSearchSchema = z.object({
  id: z.string().optional()
});

export const Route = createFileRoute("/cart")({
  ssr: false,
  validateSearch: zodValidator(cartSearchSchema),
  loader: async () => {
    await Promise.all([
      cartsCollection.preload(),
      userSelectedCartCollection.preload(),
      productsCollection.preload(),
      pricingTiersCollection.preload(),
      assetsCollection.preload(),
      cartCollaboratorsCollection.preload(),
      usersCollection.preload()
    ]);
  },
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
