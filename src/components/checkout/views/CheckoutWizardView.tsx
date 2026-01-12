import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS } from "@/lib/checkout/config";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import type { WizardStepId } from "@/lib/checkout/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2,
  TruckIcon
} from "lucide-react";
import AddressStep from "../steps/AddressStep";
import PaymentStep from "../steps/PaymentStep";
import ReviewStep from "../steps/ReviewStep";
import ShippingSelector from "../shared/ShippingSelector";
import OrderSummary from "../shared/OrderSummary";
import { Link } from "@tanstack/react-router";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { type ReactNode, useState, useMemo } from "react";

function CheckoutWizardView({
  state,
  actions,
  isPaymentIntentPending
}: {
  state: UseCheckoutLogicReturn["state"];
  actions: UseCheckoutLogicReturn["actions"];
  isPaymentIntentPending?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  const handleNextClick = () => {
    if (state.step === "review") {
      void actions.submitPayment({ stripe, elements });
    } else {
      actions.goToNext();
    }
  };

  const currentStepId = state.step as WizardStepId;

  const isCurrentStepValid = useMemo(() => {
    switch (currentStepId) {
      case "address":
        return !!state.formData.selectedAddressId;
      case "shipping":
        return !!state.formData.shippingMethod;
      case "payment":
        return isPaymentComplete;
      default:
        return true;
    }
  }, [currentStepId, state.formData, isPaymentComplete]);

  const STEP_CONTENT_EARLY_STAGES: Partial<Record<WizardStepId, ReactNode>> = {
    address: (
      <AddressStep
        selectedAddressId={state.formData.selectedAddressId}
        onSelectAddress={actions.setSelectedAddressId}
      />
    ),
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
                <Link
                  key={stepId}
                  to={"/checkout"}
                  search={{ step: stepId }}
                  className={
                    currentStepId === stepId ? "text-primary font-bold" : ""
                  }
                >
                  {idx + 1}. {stepId.charAt(0).toUpperCase() + stepId.slice(1)}
                </Link>
              ))}
            </div>
            <Progress value={state.wizardProgress} className="h-2" />
          </div>
        </div>

        {/* Wizard Body */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {STEP_CONTENT_EARLY_STAGES[currentStepId]}

            {(currentStepId === "payment" || currentStepId === "review") && (
              <div className={currentStepId === "review" ? "hidden" : "block"}>
                <PaymentStep
                  coupon={state.formData.couponInput}
                  setCoupon={actions.setCouponInput}
                  onApplyCoupon={actions.applyCoupon}
                  isCouponApplied={!!state.formData.appliedCoupon}
                  onPaymentMethodChange={actions.setPaymentMethodType}
                  onPaymentComplete={setIsPaymentComplete}
                />
              </div>
            )}

            {currentStepId === "review" && (
              <ReviewStep
                cartItems={state.cartItems}
                shippingMethod={state.formData.shippingMethod}
                warranties={state.formData.warranties}
                selectedAddressId={state.formData.selectedAddressId}
                paymentMethodType={state.formData.paymentMethodType}
              />
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={actions.goToBack}
                disabled={state.isProcessing}
              >
                Back
              </Button>
              <Button
                onClick={handleNextClick}
                size="lg"
                disabled={
                  state.isProcessing ||
                  !isCurrentStepValid ||
                  (currentStepId === "review" && isPaymentIntentPending)
                }
              >
                {state.isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {currentStepId === "review"
                  ? state.isProcessing
                    ? "Processing..."
                    : "Pay & Confirm"
                  : "Next Step"}
                {currentStepId !== "review" && !state.isProcessing && (
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 h-full pb-20">
              <OrderSummary
                totals={state.totals}
                itemCount={state.cartItems.length}
                paymentError={state.paymentError}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutWizardView;
