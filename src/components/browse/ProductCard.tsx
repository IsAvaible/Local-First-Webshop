import React, { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCartIcon, Plus, Minus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { AssetImage } from "@/components/ui/assetImage";

import { useCart } from "@/contexts/useCartContext";
import { cn, humanizeCustomFieldValue, type JsonValue } from "@/lib/utils";
import type { Asset, Product } from "@/db/schema";
import { toast } from "sonner";
import { OutOfStockOverlay } from "@/components/browse/OutOfStockOverlay.tsx";

interface ProductCardProps {
  product: Product;
  customFields?: Record<string, { value: JsonValue; type?: string }>;
  asset?: Asset;
  lazy?: boolean;
}

/**
 * Main Component
 */
function ProductCardInternal({
  product,
  customFields,
  asset,
  lazy = false,
  className = "",
  ...props
}: ProductCardProps & React.ComponentProps<typeof Card>) {
  const {
    addItem,
    canManageItems,
    enrichedFlatItems,
    updateItemQuantity,
    removeItem
  } = useCart();

  const cartItem = useMemo(
    () => enrichedFlatItems?.find((item) => item.product?.id === product.id),
    [enrichedFlatItems, product.id]
  );

  // Check if the product is out of stock
  const isOutOfStock = product.stock_sum === 0;

  // Combine disabled conditions
  const isActionDisabled = !canManageItems || isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActionDisabled) return;

    if (product.base_price) {
      addItem(product.id, product.base_price);
    } else {
      toast("This product cannot be added to the cart.", {
        description: "Price information is missing."
      });
    }
  };

  const hasCustomFields = customFields && Object.keys(customFields).length > 0;

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden pt-0 transition-shadow hover:shadow-md",
        className
      )}
      data-testid="product-card"
      {...props}
    >
      <Link
        to="/products/$productId"
        params={{ productId: product.id }}
        className="flex grow flex-col"
        aria-label={`View details for ${product.name}`}
      >
        <CardHeader className="relative p-0">
          <OutOfStockOverlay isOutOfStock={isOutOfStock}>
            <AssetImage
              asset={asset}
              alt={product.name}
              containerClassName="aspect-square w-full rounded-t-xl"
              loading={lazy ? "lazy" : "eager"}
            />
          </OutOfStockOverlay>
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <CardTitle className="line-clamp-1 h-6">{product.name}</CardTitle>
          <CardDescription className="mt-2 line-clamp-2 h-10 text-sm">
            {product.description}
          </CardDescription>

          <div
            className="mt-3 flex h-6 flex-wrap gap-2 overflow-hidden"
            aria-label="Product specifications"
          >
            {hasCustomFields &&
              Object.entries(customFields).map(([key, field]) => {
                const humanized = humanizeCustomFieldValue(
                  field?.value,
                  field?.type
                );
                return (
                  <span
                    key={key}
                    className="rounded bg-gray-100 px-2 py-1 text-xs font-medium whitespace-nowrap"
                  >
                    {key}: {humanized}
                  </span>
                );
              })}
          </div>
        </CardContent>
      </Link>

      <CardFooter className="mt-auto flex items-center justify-between px-4 pb-4">
        <p className="font-semibold text-slate-700">
          {`${product.base_price ?? "0.00"} €`}
        </p>

        {!cartItem ? (
          <Button
            size="icon"
            onClick={handleAddToCart}
            disabled={isActionDisabled}
            className="size-9 shrink-0 transition-transform active:scale-95"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <CartQuantitySelector
            itemId={cartItem.id}
            quantity={cartItem.quantity ?? 0}
            onUpdate={updateItemQuantity}
            onRemove={removeItem}
            disabled={isActionDisabled}
            productName={product.name}
          />
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Skeleton Component
 */
function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn("flex h-full flex-col overflow-hidden pt-0", className)}
      aria-hidden="true"
      aria-busy="true"
      aria-label="Loading product"
      data-testid="product-card-skeleton"
    >
      <div>
        {/* Image Skeleton */}
        <CardHeader className="p-0">
          <Skeleton className="aspect-square w-full rounded-t-xl rounded-b-none" />
        </CardHeader>

        {/* Content Skeleton */}
        <CardContent className="flex-grow p-4">
          {/* Title */}
          <Skeleton className="mb-2 h-6 w-3/4" />

          {/* Description (2 lines) */}
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </div>

      {/* Footer Skeleton */}
      <CardFooter className="mt-auto flex items-center justify-between px-4 pb-4">
        {/* Price */}
        <Skeleton className="h-6 w-20" />

        {/* Button */}
        <Skeleton className="size-9 rounded-md" />
      </CardFooter>
    </Card>
  );
}

/// --- Helpers ---
interface QuantityActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
}

/**
 * Reusable button for Increment/Decrement actions.
 */
function QuantityActionButton({
  onClick,
  icon: Icon,
  label,
  disabled
}: QuantityActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        "bg-primary-foreground/10 hover:bg-primary-foreground/20 active:bg-primary-foreground/10",
        "flex h-full w-0 flex-col items-center justify-center",
        "opacity-0 transition-all duration-300",
        "group-focus-within/quantity:w-8 group-focus-within/quantity:opacity-100",
        "group-hover/quantity:w-8 group-hover/quantity:opacity-100",
        disabled && "cursor-not-allowed"
      )}
      aria-label={label}
      type="button"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

interface CartQuantitySelectorProps {
  itemId: string;
  quantity: number;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  productName: string;
}

function CartQuantitySelector({
  itemId,
  quantity,
  onUpdate,
  onRemove,
  disabled,
  productName
}: CartQuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(quantity.toString());
  const [isHoverEnabled, setIsHoverEnabled] = useState(false);

  // Sync prop changes to local input state
  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  // Grace period on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHoverEnabled(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleIncrement = () => {
    if (disabled) return;
    onUpdate(itemId, quantity + 1);
  };

  const handleDecrement = () => {
    if (disabled) return;
    if (quantity <= 1) {
      onRemove(itemId);
    } else {
      onUpdate(itemId, quantity - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setInputValue(valStr);

    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0) {
      onUpdate(itemId, val);
    } else if (val === 0) {
      onRemove(itemId);
    }
  };

  return (
    <div
      className={cn(
        !disabled && isHoverEnabled && "group/quantity",
        "bg-primary text-primary-foreground relative flex h-9 min-w-9 items-center overflow-hidden rounded-md shadow-sm transition-all duration-300 ease-in-out",
        !disabled &&
          "hover:ring-primary/20 focus-within:ring-primary/20 focus-within:ring-2 hover:ring-2",
        disabled && "cursor-default opacity-50"
      )}
    >
      <QuantityActionButton
        onClick={handleDecrement}
        icon={Minus}
        label={`Decrease quantity of ${productName}`}
        disabled={disabled}
      />

      {/* Center Display (Icon/Badge vs Input) */}
      <div className="relative flex h-full items-center justify-center">
        {/* IDLE State: Icon + Badge */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            "group-focus-within/quantity:opacity-0 group-hover/quantity:opacity-0"
          )}
        >
          <ShoppingCartIcon className="h-4 w-4" />
          <Badge className="absolute -top-0.5 -right-0 flex h-4 min-w-4 items-center justify-center bg-transparent px-0.5 text-[10px] tracking-tight">
            {quantity}
          </Badge>
        </div>

        {/* ACTIVE State: Input Field */}
        <div
          className={cn(
            "flex h-full items-center justify-center opacity-0 transition-opacity duration-300",
            "group-focus-within/quantity:opacity-100 group-hover/quantity:opacity-100"
          )}
        >
          <Input
            type="number"
            min={1}
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            aria-label={`Quantity for ${productName}`}
            className={cn(
              "size-9 border-0 bg-transparent p-0 text-center text-sm font-bold shadow-none",
              "text-primary-foreground placeholder:text-primary-foreground/50",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              disabled && "cursor-not-allowed opacity-50"
            )}
          />
        </div>
      </div>

      <QuantityActionButton
        onClick={handleIncrement}
        icon={Plus}
        label={`Increase quantity of ${productName}`}
        disabled={disabled}
      />
    </div>
  );
}

const ProductCard = Object.assign(ProductCardInternal, {
  Skeleton: ProductCardSkeleton
});

export default ProductCard;
