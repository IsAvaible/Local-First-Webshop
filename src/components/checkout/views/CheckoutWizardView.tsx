import { Button } from "@/components/ui/button";

import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import type { WizardStepId } from "@/lib/checkout/types";
import { ChevronRightIcon, Loader2 } from "lucide-react";
import AddressStep from "../steps/AddressStep";
import PaymentStep from "../steps/PaymentStep";
import ReviewStep from "../steps/ReviewStep";
import ShippingSelector from "../shared/ShippingSelector";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { type ReactNode, useState, useMemo } from "react";
import { CheckoutLayout } from "./CheckoutLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TruckIcon } from "lucide-react";

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
        billingAddressId={state.formData.billingAddressId}
        onSelectBillingAddress={actions.setBillingAddressId}
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
    <CheckoutLayout
      currentStepId={currentStepId}
      wizardProgress={state.wizardProgress}
      onBack={actions.goToBack}
      totals={state.totals}
      itemCount={state.cartItems.length}
      paymentError={state.paymentError}
    >
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
    </CheckoutLayout>
  );
}

export default CheckoutWizardView;
