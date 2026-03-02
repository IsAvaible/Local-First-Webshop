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
import {
  PackageIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  Loader2
} from "lucide-react";
import { AssetImage } from "@/components/ui/assetImage.tsx";

// TanStack Start & React Query
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// Drizzle ORM
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { userAddressesTable } from "@/db/schema";

// --- Server Functions ---

const getAddressById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ addressId: z.string() }))
  .handler(async ({ data: { addressId } }) => {
    const [address] = await db
      .select()
      .from(userAddressesTable)
      .where(eq(userAddressesTable.id, addressId))
      .limit(1);

    return address || null;
  });

// --- Client Component ---

function ReviewStep({
  cartItems,
  shippingMethod,
  warranties,
  selectedAddressId,
  paymentMethodType
}: {
  cartItems: EnrichedCartItem[];
  shippingMethod: ShippingMethod;
  warranties: Record<string, boolean>;
  selectedAddressId: string | null;
  paymentMethodType: string | null;
}) {
  // Fetch specific address details via React Query
  const { data: address, isLoading: isAddressLoading } = useQuery({
    queryKey: ["address", selectedAddressId],
    queryFn: () => getAddressById({ data: { addressId: selectedAddressId! } }),
    enabled: !!selectedAddressId // Only fetch if an address was actually selected
  });

  // Helper to make the stripe type readable
  const formatPaymentType = (type: string | null) => {
    if (!type) return "Not selected";
    if (type === "card") return "Credit/Debit Card";
    // Capitalize other types (e.g. 'klarna' -> 'Klarna')
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

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
          {/* Shipping Address */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              Shipping To:
            </span>
            {isAddressLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading address...</span>
              </div>
            ) : address ? (
              <p>
                {address.recipient_name}
                <br />
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {address.zip_code} {address.city}, {address.country_code}
              </p>
            ) : (
              <p className="text-red-500">No address selected</p>
            )}
          </div>

          {/* Details Column containing Shipping Method & Payment */}
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">
                Shipping Method:
              </span>
              <p className="capitalize">{shippingMethod}</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">
                Payment Method:
              </span>
              <div className="flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4 text-slate-500" />
                <p className="font-medium">
                  {formatPaymentType(paymentMethodType)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-semibold">Items</h4>
          {cartItems.map((item: EnrichedCartItem) => (
            <div key={item.id} className="flex gap-4">
              <div className="h-16 w-16 overflow-hidden rounded border bg-gray-100">
                {item.asset ? (
                  <AssetImage
                    asset={item.asset}
                    containerClassName="h-full w-full object-cover"
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
