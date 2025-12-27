import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/checkout/utils";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import { TriangleAlertIcon } from "lucide-react";

function OrderSummary({
  totals,
  itemCount,
  paymentError
}: {
  totals: UseCheckoutLogicReturn["state"]["totals"];
  itemCount: number;
  paymentError: string | null;
}) {
  const { subtotal, warrantyCost, shippingCost, tax, discount, total } = totals;

  return (
    <div className="flex flex-col justify-between space-y-6">
      <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle>Total Cost</CardTitle>
          <CardDescription>{itemCount} items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SummaryRow label="Subtotal" value={subtotal} />
          {parseFloat(warrantyCost) > 0 && (
            <SummaryRow label="Warranties" value={warrantyCost} />
          )}
          <SummaryRow
            label="Shipping"
            value={shippingCost}
            isFree={shippingCost === "0.00"}
          />
          <SummaryRow label="Tax (19%)" value={tax} />
          {parseFloat(discount) > 0 && (
            <SummaryRow
              label="Discount"
              value={`-${discount}`}
              className="font-medium text-green-600"
            />
          )}
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>
      {paymentError && (
        <Card className="h-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900">
          <CardHeader>
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>{paymentError}</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full items-center justify-center">
            <TriangleAlertIcon className="size-16 text-red-200" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const SummaryRow = ({
  label,
  value,
  isFree,
  className
}: {
  label: string;
  value: string | number;
  isFree?: boolean;
  className?: string;
}) => (
  <div className={`flex justify-between text-sm ${className ?? ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span>{isFree ? "Free" : formatCurrency(value)}</span>
  </div>
);

export default OrderSummary;
