import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Heart, Minus, Plus } from "lucide-react";
import ProductConfigurator from "@/components/product/ProductConfigurator";
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  PricingTier,
  Product
} from "@/db/schema.ts";
import { humanizeCustomFieldValue } from "@/lib/utils.ts";
import { useCart } from "@/contexts/useCartContext.ts";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";

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
  const {
    enrichedFlatItems: items,
    addItem,
    updateItemQuantity,
    removeItem
  } = useCart();

  // Find if this specific product is already in the cart
  const cartItem = useMemo(
    () => items?.find((item) => item.product_id === product.id),
    [items, product.id]
  );
  const quantity = cartItem?.quantity ?? 0;

  const handleAddToCart = () => {
    const price = pricingTiers[0]?.price_per_unit.toString() ?? "0";
    addItem(product.id, price);
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateItemQuantity(cartItem.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      if (quantity > 1) {
        updateItemQuantity(cartItem.id, quantity - 1);
      } else {
        // Optional: Remove if decreasing from 1, or keep at 1 depending on UX preference
        removeItem(cartItem.id);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!cartItem) return;
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      updateItemQuantity(cartItem.id, val);
    }
  };

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
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="list"
            aria-label="Product specifications"
          >
            {customFields?.map((customField) => {
              const humanized = humanizeCustomFieldValue(
                customField.value,
                customField.field_type
              );
              return (
                <span
                  key={customField.field_name}
                  role="listitem"
                  className="rounded bg-gray-100 px-2 py-1 text-xs font-medium"
                  title={humanized}
                  aria-label={`${customField.field_name}: ${humanized}`}
                >
                  {customField.field_name}: {humanized}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <p
            className="text-3xl text-gray-900 dark:text-slate-100"
            aria-label={`Price: ${pricingTiers[0].price_per_unit.toLocaleString()} Euros`}
          >
            {pricingTiers[0].price_per_unit.toLocaleString()}€
          </p>
        </div>
        <ProductConfigurator />
      </div>

      <Separator className="my-8" role="separator" />

      <div className="flex-grow" />

      <div className="mt-auto flex gap-4">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          aria-label={`Add ${cartItem ? "another " : ""}${product.name} to cart`}
        >
          <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
          Add {cartItem && "another "}to cart
        </Button>

        {cartItem && (
          <div className="flex-1">
            <ButtonGroup className="h-full w-full">
              <Button
                size="icon"
                variant="outline"
                className="h-full w-12 shrink-0"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Input
                type="number"
                className="h-full rounded-none bg-white text-center focus-visible:ring-0"
                value={quantity}
                onChange={handleInputChange}
                min={1}
                aria-label="Quantity"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-full w-12 shrink-0"
                onClick={handleIncrement}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </ButtonGroup>
          </div>
        )}

        <Button
          size="lg"
          variant="outline"
          onClick={onToggleWishlist}
          disabled={!onToggleWishlist}
          className={isInWishlist ? "text-red-500 hover:text-red-600" : ""}
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
}
