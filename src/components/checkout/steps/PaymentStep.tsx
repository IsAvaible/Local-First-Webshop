import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaymentElement } from "@stripe/react-stripe-js";
import { CreditCardIcon } from "lucide-react";
import type { StripePaymentElementChangeEvent } from "@stripe/stripe-js";

function PaymentStep({
  coupon,
  setCoupon,
  onApplyCoupon,
  isCouponApplied,
  onPaymentMethodChange,
  onPaymentComplete
}: {
  coupon: string;
  setCoupon: (coupon: string) => void;
  onApplyCoupon: () => void;
  isCouponApplied: boolean;
  onPaymentMethodChange: (type: string) => void;
  onPaymentComplete: (complete: boolean) => void;
}) {
  useEffect(() => {
    onPaymentComplete(false);
  }, [onPaymentComplete]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" /> Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentElement
            options={{
              layout: "tabs"
            }}
            onChange={(e: StripePaymentElementChangeEvent) => {
              onPaymentComplete(e.complete);
              if (e.value?.type) {
                onPaymentMethodChange(e.value.type);
              }
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coupon Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter code (Try SAVE20)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              disabled={isCouponApplied}
            />
            <Button
              variant="outline"
              onClick={onApplyCoupon}
              disabled={!coupon || isCouponApplied}
            >
              {isCouponApplied ? "Applied" : "Apply"}
            </Button>
          </div>
          {isCouponApplied && (
            <p className="mt-2 text-sm text-green-600">
              Coupon applied successfully!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentStep;
