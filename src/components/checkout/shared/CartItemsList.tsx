import type { EnrichedCartItem } from "@/contexts/useCartContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheckIcon, PackageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/checkout/utils";

function CartItemsList({
  items,
  warranties,
  onToggleWarranty
}: {
  items: EnrichedCartItem[];
  warranties: Record<string, boolean>;
  onToggleWarranty: (id: string) => void;
}) {
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
      <CardContent className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 sm:flex-row">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
              {item.asset ? (
                <img
                  src={item.asset.url}
                  alt={item.asset.alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <PackageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {item.product?.name ?? "Unknown Product"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(
                      parseFloat(item.price ?? "0") * item.quantity
                    )}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-muted-foreground text-xs">
                      {formatCurrency(parseFloat(item.price ?? "0"))} each
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={`warranty-${item.id}`}
                  checked={warranties[item.id]}
                  onCheckedChange={() => onToggleWarranty(item.id)}
                />
                <Label
                  htmlFor={`warranty-${item.id}`}
                  className="flex cursor-pointer items-center text-sm select-none"
                >
                  <ShieldCheckIcon className="mr-1 h-4 w-4 text-blue-500" /> Add
                  Extended Warranty (+10%)
                </Label>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default CartItemsList;
