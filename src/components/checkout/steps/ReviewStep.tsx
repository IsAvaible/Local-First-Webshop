import type { EnrichedCartItem } from "@/contexts/useCartContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ShippingMethod } from "@/lib/checkout/types";
import { formatCurrency } from "@/lib/checkout/utils";
import { PackageIcon, ShieldCheckIcon } from "lucide-react";

function ReviewStep({
  cartItems,
  shippingMethod,
  paymentMethod,
  warranties
}: {
  cartItems: EnrichedCartItem[];
  shippingMethod: ShippingMethod;
  paymentMethod: string;
  warranties: Record<string, boolean>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>
          Please review your order before confirming.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              Shipping To:
            </span>
            <p>
              John Doe
              <br />
              123 Main St
              <br />
              New York, NY 10001
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Details:</span>
            <p className="capitalize">Method: {shippingMethod}</p>
            <p className="capitalize">
              Payment: {paymentMethod.replace("_", " ")}
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-semibold">Items</h4>
          {cartItems.map((item: EnrichedCartItem) => (
            <div key={item.id} className="flex gap-4">
              <div className="h-16 w-16 overflow-hidden rounded border bg-gray-100">
                {item.asset ? (
                  <img
                    src={item.asset.url}
                    alt={item.asset.alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PackageIcon className="h-full w-full p-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-medium">{item.product?.name}</h5>
                <p className="text-muted-foreground text-xs">
                  Qty: {item.quantity}
                </p>
                {warranties[item.id] && (
                  <span className="mt-1 flex items-center text-xs text-blue-600">
                    <ShieldCheckIcon className="mr-1 h-3 w-3" /> + Extended
                    Warranty
                  </span>
                )}
              </div>
              <div className="text-sm font-medium">
                {formatCurrency(parseFloat(item.price ?? "0") * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReviewStep;
