import { CheckoutLayout } from "./CheckoutLayout";
import { Skeleton } from "@/components/ui/skeleton";
import type { UseCheckoutLogicReturn } from "@/lib/checkout/useCheckoutLogic";
import type { WizardStepId } from "@/lib/checkout/types";

interface CheckoutLoadingViewProps {
  state: UseCheckoutLogicReturn["state"];
  actions: UseCheckoutLogicReturn["actions"];
}

export default function CheckoutLoadingView({
  state,
  actions
}: CheckoutLoadingViewProps) {
  return (
    <CheckoutLayout
      currentStepId={state.step as WizardStepId}
      wizardProgress={state.wizardProgress}
      onBack={actions.goToBack}
      totals={state.totals}
      itemCount={state.cartItems.length}
      paymentError={state.paymentError}
    >
      <div className="space-y-6">
        {/* Step Content Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>

        {/* Buttons Skeleton */}
        <div className="flex justify-between pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </CheckoutLayout>
  );
}
