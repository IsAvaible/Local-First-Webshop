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

function OrderSummary({
  totals,
  itemCount
}: {
  totals: UseCheckoutLogicReturn["state"]["totals"];
  itemCount: number;
}) {
  const { subtotal, warrantyCost, shippingCost, tax, discount, total } = totals;

  return (
    <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <CardHeader>
        <CardTitle>Total Cost</CardTitle>
        <CardDescription>{itemCount} items</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryRow label="Subtotal" value={subtotal} />
        {warrantyCost > 0 && (
          <SummaryRow label="Warranties" value={warrantyCost} />
        )}
        <SummaryRow
          label="Shipping"
          value={shippingCost}
          isFree={shippingCost === 0}
        />
        <SummaryRow label="Tax (19%)" value={tax} />
        {discount > 0 && (
          <SummaryRow
            label="Discount"
            value={-discount}
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
  );
}

const SummaryRow = ({
  label,
  value,
  isFree,
  className
}: {
  label: string;
  value: number;
  isFree?: boolean;
  className?: string;
}) => (
  <div className={`flex justify-between text-sm ${className ?? ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span>{isFree ? "Free" : formatCurrency(value)}</span>
  </div>
);

export default OrderSummary;
