import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart } from "lucide-react";
import ProductConfigurator from "@/components/product/ProductConfigurator";
import type { PricingTier, Product } from "@/db/schema.ts";

export default function ProductDetails({
  product,
  pricingTiers
}: {
  product: Product;
  pricingTiers: PricingTier[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
          {product.name}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-slate-300">
          {product.description}
        </p>
        <div className="mt-6">
          <p className="text-3xl text-gray-900 dark:text-slate-100">
            {pricingTiers[0].price_per_unit.toLocaleString()}€
          </p>
        </div>
        <ProductConfigurator />
      </div>

      <Separator className="my-8" />

      <div className="flex-grow" />

      <div className="mt-auto">
        <Button size="lg" className="w-full">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to cart
        </Button>
      </div>
    </div>
  );
}
