import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Heart } from "lucide-react";
import ProductConfigurator from "@/components/product/ProductConfigurator";
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  PricingTier,
  Product
} from "@/db/schema.ts";
import { humanizeCustomFieldValue } from "@/lib/utils.ts";

export default function ProductDetails({
  product,
  pricingTiers,
  customFields,
  isInWishlist,
  onToggleWishlist
}: {
  product: Product;
  pricingTiers: PricingTier[];
  customFields?: (CustomFieldValue & CustomFieldDefinition)[];
  isInWishlist?: boolean;
  onToggleWishlist?: () => void;
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

        {customFields && Object.keys(customFields).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customFields?.map((customField) => {
              const humanized = humanizeCustomFieldValue(
                customField.value,
                customField.field_type
              );
              return (
                <span
                  key={customField.field_name}
                  className="rounded bg-gray-100 px-2 py-1 text-xs font-medium"
                  title={humanized}
                >
                  {customField.field_name}: {humanized}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <p className="text-3xl text-gray-900 dark:text-slate-100">
            {pricingTiers[0].price_per_unit.toLocaleString()}€
          </p>
        </div>
        <ProductConfigurator />
      </div>

      <Separator className="my-8" />

      <div className="flex-grow" />

      <div className="mt-auto flex gap-4">
        <Button size="lg" className="flex-1">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to cart
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onToggleWishlist}
          disabled={!onToggleWishlist}
          className={isInWishlist ? "text-red-500 hover:text-red-600" : ""}
        >
          <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
          <span className="sr-only">
            {isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          </span>
        </Button>
      </div>
    </div>
  );
}
