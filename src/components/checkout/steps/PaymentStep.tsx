import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BanknoteIcon, CreditCardIcon, SmartphoneIcon } from "lucide-react";

function PaymentStep({
  method,
  setMethod,
  coupon,
  setCoupon,
  onApplyCoupon,
  isCouponApplied
}: {
  method: string;
  setMethod: (method: string) => void;
  coupon: string;
  setCoupon: (coupon: string) => void;
  onApplyCoupon: () => void;
  isCouponApplied: boolean;
}) {
  const paymentOptions = [
    { id: "klarna", label: "Klarna", icon: BanknoteIcon },
    { id: "paypal", label: "PayPal", icon: CreditCardIcon },
    { id: "apple_pay", label: "Apple Pay", icon: SmartphoneIcon },
    { id: "card", label: "Credit Card", icon: CreditCardIcon }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" /> Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={method}
            onValueChange={setMethod}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {paymentOptions.map((p) => (
              <Label
                key={p.id}
                htmlFor={p.id}
                className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground [&:has(:checked)]:border-primary flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4"
              >
                <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                <p.icon className="mb-3 h-6 w-6" /> {p.label}
              </Label>
            ))}
          </RadioGroup>
          {method === "card" && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="0000 0000 0000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input placeholder="123" />
                </div>
              </div>
            </div>
          )}
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
