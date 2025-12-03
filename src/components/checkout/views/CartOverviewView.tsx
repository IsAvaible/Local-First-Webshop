import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import type { ProductSuggestion } from "@/lib/checkout/types";
import CartItemsList from "../shared/CartItemsList";
import OrderSummary from "../shared/OrderSummary";
import ShippingSelector from "../shared/ShippingSelector";
import ProductCard from "@/components/browse/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CartOverviewView({
  state,
  actions,
  suggestions,
  isSuggestionsLoading: _isSuggestionsLoading
}: {
  state: UseCheckoutLogicReturn["state"];
  actions: UseCheckoutLogicReturn["actions"];
  suggestions?: ProductSuggestion[];
  isSuggestionsLoading: boolean;
}) {
  const { cartItems, totals, formData } = state;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-3xl font-bold">Shopping Cart</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <CartItemsList items={cartItems} />

            <Card>
              <CardHeader>
                <CardTitle>Estimated Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <ShippingSelector
                  value={formData.shippingMethod}
                  onChange={actions.setShippingMethod}
                  variant="simple"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 lg:col-span-1">
            <OrderSummary totals={totals} itemCount={cartItems.length} />
            <Button
              className="h-12 w-full text-lg"
              size="lg"
              onClick={actions.goToNext}
            >
              Proceed to Payment <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {suggestions?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                imageUrl={product.asset?.url}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartOverviewView;
