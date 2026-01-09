import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Cart } from "@/components/cart/Cart.tsx";
import { useCart } from "@/contexts/useCartContext.ts";

function CartItemsList() {
  const { activeCart, enrichedFlatItems } = useCart();
  const activeCartName = activeCart?.name ?? "Your Cart";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{activeCartName}</CardTitle>
        <CardDescription>
          {enrichedFlatItems?.length ?? 0} items
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Cart
          displayHeader={false}
          displayCheckoutButton={false}
          displayItemSelect={true}
        />
      </CardContent>
    </Card>
  );
}

export default CartItemsList;
