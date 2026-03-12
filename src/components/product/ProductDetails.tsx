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
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

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

  // Stock logic
  const stock = product.stock_sum || 0;
  const isOutOfStock = stock <= 0;

  // Local state for quantity when item is NOT in cart yet
  const [localQuantity, setLocalQuantity] = useState(1);

  // Find if this specific product is already in the cart
  const cartItem = useMemo(
    () => items?.find((item) => item.product_id === product.id),
    [items, product.id]
  );

  // Determine effective quantity (Cart quantity if exists, otherwise local selection)
  const currentQuantity = cartItem ? cartItem.quantity : localQuantity;

  // Calculate Active Tier based on the effective quantity
  const activeTier = useMemo(() => {
    const quantityToCheck = Math.max(1, currentQuantity);
    const sortedTiers = [...pricingTiers].sort(
      (a, b) => b.min_quantity - a.min_quantity
    );
    return (
      sortedTiers.find((tier) => quantityToCheck >= tier.min_quantity) ??
      sortedTiers[sortedTiers.length - 1]
    );
  }, [pricingTiers, currentQuantity]);

  // Prepare Display Tiers (Sorted Ascending for visual list)
  const displayTiers = useMemo(() => {
    return [...pricingTiers].sort((a, b) => a.min_quantity - b.min_quantity);
  }, [pricingTiers]);

  // Get Base Price for Discount Calculation
  const basePrice = displayTiers[0]?.price_per_unit
    ? Number(displayTiers[0].price_per_unit)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const price = activeTier?.price_per_unit.toString() ?? "0";

    if (cartItem) {
      // If already in cart, standard "Add" adds one more
      addItem(product.id, price);
    } else {
      // If not in cart, add with the selected local quantity
      const id = addItem(product.id, price);
      if (id && localQuantity > 1) {
        updateItemQuantity(id, localQuantity);
      }
    }
  };

  const handleIncrement = () => {
    if (currentQuantity >= stock) {
      toast.error(`Only ${stock} items available in stock.`);
      return; // Prevent exceeding stock
    }

    if (cartItem) {
      updateItemQuantity(cartItem.id, currentQuantity + 1);
    } else {
      setLocalQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      if (currentQuantity > 1)
        updateItemQuantity(cartItem.id, currentQuantity - 1);
      else removeItem(cartItem.id);
    } else {
      if (localQuantity > 1) setLocalQuantity((prev) => prev - 1);
    }
  };

  const handleTierClick = (minQty: number) => {
    if (minQty > stock) {
      toast.error(`Not enough stock for this tier. Only ${stock} available.`);
      return;
    }

    if (cartItem) {
      updateItemQuantity(cartItem.id, minQty);
    } else {
      setLocalQuantity(minQty);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      if (val > stock) {
        val = stock;
        toast.error(`You cannot add more. Only ${stock} in stock.`);
      }

      if (cartItem) {
        updateItemQuantity(cartItem.id, val);
      } else {
        setLocalQuantity(val);
      }
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
            <Badge
              variant="secondary"
              className="-my-1 gap-1.5 px-2.5 py-1"
              aria-live="polite"
            >
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
              Syncing
            </Badge>
          )}
        </div>

        <p className="mt-4 text-lg text-gray-600 dark:text-slate-300">
          {product.description}
        </p>

        {customFields && Object.keys(customFields).length > 0 && (
          <ul
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Product specifications"
          >
            {customFields?.map((customField) => {
              const humanized = humanizeCustomFieldValue(
                customField.value,
                customField.field_type
              );
              return (
                <li
                  key={customField.field_name}
                  className="rounded bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-slate-800 dark:text-slate-300"
                  title={humanized}
                  aria-label={`${customField.field_name}: ${humanized}`}
                >
                  {customField.field_name}: {humanized}
                </li>
              );
            })}
          </ul>
        )}

        <div
          className="mt-6 flex items-center gap-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            className="text-3xl font-bold text-gray-900 dark:text-slate-100"
            id="price-id"
          >
            {activeTier.price_per_unit}€
            <span className="ml-2 text-sm font-normal text-gray-500">
              <span className="sr-only">per</span> unit
            </span>
          </p>

          {/* Stock Display Badge */}
          <Badge
            variant="outline"
            className={`px-2.5 py-1 text-xs font-semibold ${
              isOutOfStock
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
                : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
            }`}
          >
            {isOutOfStock ? "Out of Stock" : `${stock} in stock`}
          </Badge>
        </div>

        <div className="mt-6 grid gap-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-slate-200">
            Volume Discounts
          </h2>
          <div className="grid gap-2">
            {displayTiers.map((tier) => {
              const isCurrent = activeTier.id === tier.id;
              const price = Number(tier.price_per_unit);
              const isExceedingStock = tier.min_quantity > stock;

              // Calculate discount percentage relative to base price
              const discountPercent =
                basePrice > 0
                  ? Math.round(((basePrice - price) / basePrice) * 100)
                  : 0;

              return (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => handleTierClick(tier.min_quantity)}
                  aria-pressed={isCurrent}
                  disabled={isExceedingStock || isOutOfStock}
                  className={`relative flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                    isCurrent
                      ? "border-gray-600 bg-gray-50 dark:border-gray-400 dark:bg-gray-950/30"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900"
                  } ${
                    isExceedingStock || isOutOfStock
                      ? "cursor-not-allowed! opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isCurrent
                          ? "border-gray-600 bg-gray-600 text-white"
                          : "border-gray-300"
                      }`}
                      aria-hidden="true"
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
                      {tier.price_per_unit}€
                    </span>
                  </div>
                </button>
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
          aria-label={
            isOutOfStock
              ? `${product.name} is out of stock`
              : cartItem
                ? `Add another ${product.name} to cart`
                : `Add ${product.name} to cart`
          }
          disabled={!!cartItem || isOutOfStock}
          aria-describedby="price-id"
          data-testid="main-add-to-cart"
        >
          <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
          {isOutOfStock
            ? "Out of Stock"
            : cartItem
              ? "Already in Cart"
              : "Add to Cart"}
        </Button>

        <div className="flex-1">
          <ButtonGroup className="h-full w-full">
            <Button
              size="icon"
              variant="outline"
              className="h-full w-12 shrink-0"
              onClick={handleDecrement}
              disabled={isOutOfStock || currentQuantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Input
              type="number"
              className="h-full rounded-none bg-white text-center focus-visible:ring-0 disabled:opacity-50"
              value={currentQuantity}
              onChange={handleInputChange}
              min={1}
              max={stock}
              disabled={isOutOfStock}
              aria-label={`Quantity for ${product.name}`}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-full w-12 shrink-0"
              onClick={handleIncrement}
              disabled={isOutOfStock || currentQuantity >= stock}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>

        <Button
          size="lg"
          variant="outline"
          onClick={onToggleWishlist}
          disabled={!onToggleWishlist}
          className={isInWishlist ? "text-red-500 hover:text-red-600" : ""}
          aria-label="Wishlist"
          aria-pressed={isInWishlist}
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
