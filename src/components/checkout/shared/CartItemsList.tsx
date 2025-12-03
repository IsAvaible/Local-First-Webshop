import type { EnrichedCartItem } from "@/contexts/useCartContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Cart } from "@/components/cart/Cart.tsx";

function CartItemsList({ items }: { items: EnrichedCartItem[] }) {
  if (items.length === 0)
    return (
      <div className="text-muted-foreground py-8 text-center">
        Your cart is empty.
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Cart</CardTitle>
        <CardDescription>{items.length} items</CardDescription>
      </CardHeader>
      <CardContent>
        <Cart />
      </CardContent>
    </Card>
  );
}

export default CartItemsList;
