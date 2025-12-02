import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS } from "@/lib/checkout/config";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import type { WizardStepId } from "@/lib/checkout/types";
import { ChevronLeftIcon, ChevronRightIcon, TruckIcon } from "lucide-react";
import AddressStep from "../steps/AddressStep";
import PaymentStep from "../steps/PaymentStep";
import ReviewStep from "../steps/ReviewStep";
import ShippingSelector from "../shared/ShippingSelector";
import OrderSummary from "../shared/OrderSummary";
import * as React from "react";

function CheckoutWizardView({
  state,
  actions
}: {
  state: UseCheckoutLogicReturn["state"];
  actions: UseCheckoutLogicReturn["actions"];
}) {
  // Use a map to render steps instead of if/else chains
  // We strictly cast state.step to WizardStepId because we know isWizard is true here
  const currentStepId = state.step as WizardStepId;

  const STEP_CONTENT: Record<WizardStepId, React.ReactNode> = {
    address: <AddressStep />,
    shipping: (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" /> Shipping Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShippingSelector
            value={state.formData.shippingMethod}
            onChange={actions.setShippingMethod}
            variant="detailed"
          />
        </CardContent>
      </Card>
    ),
    payment: (
      <PaymentStep
        method={state.formData.paymentMethod}
        setMethod={actions.setPaymentMethod}
        coupon={state.formData.couponInput}
        setCoupon={actions.setCouponInput}
        onApplyCoupon={actions.applyCoupon}
        isCouponApplied={!!state.formData.appliedCoupon}
      />
    ),
    review: (
      <ReviewStep
        cartItems={state.cartItems}
        shippingMethod={state.formData.shippingMethod}
        paymentMethod={state.formData.paymentMethod}
        warranties={state.formData.warranties}
      />
    )
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Wizard Header */}
        <div className="mb-8 space-y-4">
          <Button
            variant="ghost"
            onClick={actions.goToBack}
            className="pl-0 hover:bg-transparent"
          >
            <ChevronLeftIcon className="mr-2 h-4 w-4" /> Back
          </Button>

          <h1 className="text-3xl font-bold">Checkout</h1>

          <div className="space-y-2">
            <div className="text-muted-foreground flex justify-between text-sm font-medium">
              {WIZARD_STEPS.map((stepId, idx) => (
                <span
                  key={stepId}
                  className={
                    currentStepId === stepId ? "text-primary font-bold" : ""
                  }
                >
                  {idx + 1}. {stepId.charAt(0).toUpperCase() + stepId.slice(1)}
                </span>
              ))}
            </div>
            <Progress value={state.wizardProgress} className="h-2" />
          </div>
        </div>

        {/* Wizard Body */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Dynamic Step Content */}
            {STEP_CONTENT[currentStepId]}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={actions.goToBack}>
                Back
              </Button>
              <Button onClick={actions.goToNext} size="lg">
                {currentStepId === "review" ? "Pay & Confirm" : "Next Step"}
                {currentStepId !== "review" && (
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <OrderSummary
                totals={state.totals}
                itemCount={state.cartItems.length}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutWizardView;
