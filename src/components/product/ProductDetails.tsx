import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Heart, Minus, Plus, Check, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge.tsx";

export default function ProductDetails({
  product,
  pricingTiers,
  customFields,
  isInWishlist,
  onToggleWishlist,
  isSyncing
}: {
  product: Product;
  pricingTiers: PricingTier[];
  customFields?: (CustomFieldValue & CustomFieldDefinition)[];
  isInWishlist?: boolean;
  onToggleWishlist?: () => void;
  isSyncing: boolean;
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

  // Calculate Active Tier
  const activeTier = useMemo(() => {
    const quantityToCheck = Math.max(1, quantity);
    const sortedTiers = [...pricingTiers].sort(
      (a, b) => b.min_quantity - a.min_quantity
    );
    return (
      sortedTiers.find((tier) => quantityToCheck >= tier.min_quantity) ??
      sortedTiers[sortedTiers.length - 1]
    );
  }, [pricingTiers, quantity]);

  // Prepare Display Tiers (Sorted Ascending for visual list 1 -> 100)
  const displayTiers = useMemo(() => {
    return [...pricingTiers].sort((a, b) => a.min_quantity - b.min_quantity);
  }, [pricingTiers]);

  // Get Base Price for Discount Calculation
  const basePrice = displayTiers[0]?.price_per_unit
    ? Number(displayTiers[0].price_per_unit)
    : 0;

  const handleAddToCart = () => {
    const price = activeTier?.price_per_unit.toString() ?? "0";
    addItem(product.id, price);
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateItemQuantity(cartItem.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      if (quantity > 1) updateItemQuantity(cartItem.id, quantity - 1);
      else removeItem(cartItem.id);
    }
  };

  const handleTierClick = (minQty: number, tierPrice: string) => {
    if (cartItem) {
      updateItemQuantity(cartItem.id, minQty);
    } else {
      const id = addItem(product.id, tierPrice);

      // Use the returned item ID to update quantity
      if (id) {
        updateItemQuantity(id, minQty);
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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
            {product.name}
          </h1>
          {isSyncing && (
            <Badge variant="secondary" className="-my-1 gap-1.5 px-2.5 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </Badge>
          )}
        </div>

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
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {Number(activeTier.price_per_unit).toLocaleString()}€
            <span className="ml-2 text-sm font-normal text-gray-500">
              / unit
            </span>
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-200">
            Volume Discounts
          </p>
          <div className="grid gap-2">
            {displayTiers.map((tier) => {
              const isCurrent = activeTier.id === tier.id;
              const price = Number(tier.price_per_unit);

              // Calculate discount percentage relative to base price
              const discountPercent =
                basePrice > 0
                  ? Math.round(((basePrice - price) / basePrice) * 100)
                  : 0;

              return (
                <div
                  key={tier.id}
                  onClick={() =>
                    handleTierClick(
                      tier.min_quantity,
                      tier.price_per_unit.toString()
                    )
                  }
                  className={`relative flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                    isCurrent
                      ? "border-gray-600 bg-gray-50 dark:border-gray-400 dark:bg-gray-950/30"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900"
                  } `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isCurrent
                          ? "border-gray-600 bg-gray-600 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isCurrent && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-medium ${
                          isCurrent
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-900 dark:text-slate-200"
                        }`}
                      >
                        Buy {tier.min_quantity}+
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {discountPercent > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        Save {discountPercent}%
                      </span>
                    )}
                    <span
                      className={`font-semibold ${
                        isCurrent
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {price.toLocaleString()}€
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <ProductConfigurator />
        </div>
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
