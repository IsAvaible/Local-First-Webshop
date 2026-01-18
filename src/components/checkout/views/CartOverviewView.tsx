import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import CartItemsList from "../shared/CartItemsList";
import OrderSummary from "../shared/OrderSummary";
import RelatedProducts from "@/components/product/RelatedProducts.tsx";

function CartOverviewView({
  state,
  actions
}: {
  state: UseCheckoutLogicReturn["state"];
  actions: UseCheckoutLogicReturn["actions"];
}) {
  const { cartItems, totals, paymentError } = state;
  const isCartEmpty = cartItems.length === 0;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-3xl font-bold">Shopping Cart</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <CartItemsList />
          </div>

          <div className="space-y-8 lg:col-span-1">
            <OrderSummary
              totals={totals}
              itemCount={cartItems.length}
              paymentError={paymentError}
            />
            <Button
              className="h-12 w-full text-lg"
              size="lg"
              onClick={actions.goToNext}
              disabled={isCartEmpty}
            >
              Proceed to Payment <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-16">
          <RelatedProducts />
        </div>
      </div>
    </div>
  );
}

export default CartOverviewView;
