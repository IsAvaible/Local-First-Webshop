import { useState, useMemo, useCallback, useEffect } from "react";
import type { UseNavigateResult } from "@tanstack/react-router";
import { useCart } from "@/contexts/useCartContext";
import { CONFIG, FLOW_ORDER, WIZARD_STEPS } from "@/lib/checkout/config";
import type { FlowStepId, ShippingMethod } from "@/lib/checkout/types";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import {
  calculateOrderTotals,
  type CalculationResult
} from "@/lib/utils/calcTotals.ts";

// Define the shape of Stripe params based on your Zod schema
interface StripeReturnParams {
  payment_intent?: string;
  payment_intent_client_secret?: string;
  redirect_status?: string;
  error?: string; // Standard Stripe error param
}

interface UseCheckoutLogicProps {
  step: FlowStepId;
  navigate: UseNavigateResult<"/checkout">;
  // Add search params to the hook props
  stripeParams?: StripeReturnParams;
}

interface SubmitPaymentArgs {
  stripe: Stripe | null;
  elements: StripeElements | null;
}

export function useCheckoutLogic({
  step,
  navigate,
  stripeParams
}: UseCheckoutLogicProps) {
  const { enrichedFlatItems: rawCartItems, cartId, removeItem } = useCart();
  const cartItems = useMemo(
    () => (rawCartItems ?? []).filter((item) => item.is_selected ?? true),
    [rawCartItems]
  );

  // Determine current position in the linear flow
  const currentFlowIndex = FLOW_ORDER.indexOf(step);
  const validatedStep = currentFlowIndex === -1 ? "overview" : step;
  const validatedIndex = currentFlowIndex === -1 ? 0 : currentFlowIndex;

  // Form State
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("standard");
  const [warranties, setWarranties] = useState<Record<string, boolean>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [paymentMethodType, setPaymentMethodType] = useState<string | null>(
    null
  );

  // Payment State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Handle Stripe Return Logic ---
  useEffect(() => {
    // If there are no stripe params, do nothing
    if (!stripeParams?.redirect_status && !stripeParams?.error) return;

    const { redirect_status, error, payment_intent } = stripeParams;

    if (!payment_intent) {
      setPaymentError("Missing payment intent information.");
      return;
    }

    if (redirect_status === "succeeded") {
      // The order completion is now handled by the Stripe Webhook.
      setIsProcessing(false);

      // Clear the selected items from the cart
      cartItems.forEach((item) => {
        removeItem(item.id);
      });
    } else if (redirect_status === "failed" || error) {
      setPaymentError(
        error ?? "Payment failed or was cancelled. Please try again."
      );

      void navigate({
        search: () => ({
          // Redirect to the payment step to retry
          step: "payment"
        }),
        replace: true
      });
    }
  }, [stripeParams, navigate, step, cartItems, removeItem]);

  type Totals = CalculationResult["formatted"];

  // Calculate Totals
  const totals = useMemo((): Totals => {
    // Map Frontend "CartItem" to Shared "CalcItem"
    const normalizedItems = cartItems.map((item) => ({
      price: item.price ?? "0",
      quantity: item.quantity ?? 1,
      // Look up warranty status from the separate object
      hasWarranty: warranties[item.id]
    }));

    const result = calculateOrderTotals(
      normalizedItems,
      shippingMethod,
      appliedCoupon
    );

    return result.formatted;
  }, [cartItems, warranties, shippingMethod, appliedCoupon]);

  // Actions & Navigation
  const navigateToStep = useCallback(
    async (targetStep: FlowStepId) => {
      await navigate({ search: (prev) => ({ ...prev, step: targetStep }) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate]
  );

  const actions = {
    goToNext: useCallback(() => {
      const nextIndex = validatedIndex + 1;
      if (nextIndex < FLOW_ORDER.length) {
        void navigateToStep(FLOW_ORDER[nextIndex]);
      }
    }, [validatedIndex, navigateToStep]),

    goToBack: useCallback(() => {
      const prevIndex = validatedIndex - 1;
      if (prevIndex >= 0) {
        void navigateToStep(FLOW_ORDER[prevIndex]);
      }
    }, [validatedIndex, navigateToStep]),

    resetFlow: useCallback(() => {
      setAppliedCoupon(null);
      setWarranties({});
      void navigateToStep("overview");
    }, [navigateToStep]),

    submitPayment: useCallback(
      async ({ stripe, elements }: SubmitPaymentArgs) => {
        if (!stripe || !elements) {
          return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            // Note: We direct to success, but our useEffect above
            // will catch failures and redirect back if status != succeeded
            return_url: `${window.location.origin}/checkout?step=success`
          }
        });

        if (error.type === "card_error" || error.type === "validation_error") {
          setPaymentError(error.message ?? "An unexpected error occurred.");
        } else {
          setPaymentError("An unexpected error occurred.");
        }

        setIsProcessing(false);
      },
      []
    ),

    setStep: navigateToStep,
    setShippingMethod,
    setCouponInput,
    setSelectedAddressId,
    setPaymentMethodType,
    toggleWarranty: useCallback((itemId: string) => {
      setWarranties((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    }, []),
    applyCoupon: useCallback(() => {
      if (CONFIG.COUPONS[couponInput]) {
        setAppliedCoupon(couponInput);
      }
    }, [couponInput])
  };

  // Return consolidated state
  const isWizardStep = (WIZARD_STEPS as readonly string[]).includes(
    validatedStep
  );
  const wizardProgress = isWizardStep
    ? ((WIZARD_STEPS as readonly string[]).indexOf(validatedStep) /
        (WIZARD_STEPS.length - 1)) *
      100
    : 0;

  const result = {
    state: {
      step: validatedStep,
      isOverview: validatedStep === "overview",
      isSuccess: validatedStep === "success",
      isWizard: isWizardStep,
      wizardProgress,
      cartId,
      cartItems,
      totals,
      isProcessing,
      paymentError,
      formData: {
        shippingMethod,
        warranties,
        couponInput,
        appliedCoupon,
        selectedAddressId,
        paymentMethodType
      }
    },
    actions
  };

  return result;
}

export type UseCheckoutLogicReturn = ReturnType<typeof useCheckoutLogic>;
