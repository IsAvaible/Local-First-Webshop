import { useState, useMemo, useCallback } from "react";
import type { UseNavigateResult } from "@tanstack/react-router";
import { useCart } from "@/contexts/useCartContext";
import { CONFIG, FLOW_ORDER, WIZARD_STEPS } from "@/lib/checkout/config";
import type { FlowStepId, ShippingMethod } from "@/lib/checkout/types";

interface UseCheckoutLogicProps {
  step: FlowStepId;
  navigate: UseNavigateResult<"/checkout">;
}

export function useCheckoutLogic({ step, navigate }: UseCheckoutLogicProps) {
  const { enrichedFlatItems: rawCartItems } = useCart();
  const cartItems = useMemo(() => rawCartItems ?? [], [rawCartItems]);

  // Determine current position in the linear flow
  const currentFlowIndex = FLOW_ORDER.indexOf(step);
  const validatedStep = currentFlowIndex === -1 ? "overview" : step;
  const validatedIndex = currentFlowIndex === -1 ? 0 : currentFlowIndex;

  // Form State
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [warranties, setWarranties] = useState<Record<string, boolean>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );

  interface Totals {
    subtotal: number;
    warrantyCost: number;
    shippingCost: number;
    tax: number;
    discount: number;
    total: number;
  }

  // Calculate Totals
  const totals = useMemo((): Totals => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.price ?? "0") * item.quantity,
      0
    );

    const warrantyCost = Object.entries(warranties).reduce(
      (sum, [itemId, active]) => {
        if (!active) return sum;
        const item = cartItems.find((i) => i.id === itemId);
        const price = parseFloat(item?.price ?? "0");
        return sum + price * CONFIG.WARRANTY_RATE * (item?.quantity ?? 1);
      },
      0
    );

    const shippingCost = CONFIG.SHIPPING_RATES[shippingMethod];
    const tax = (subtotal + warrantyCost + shippingCost) * CONFIG.TAX_RATE;
    const discount = appliedCoupon ? CONFIG.COUPONS[appliedCoupon] || 0 : 0;
    const total = subtotal + warrantyCost + shippingCost + tax - discount;

    return { subtotal, warrantyCost, shippingCost, tax, discount, total };
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

    setStep: navigateToStep,
    setShippingMethod,
    setPaymentMethod,
    setCouponInput,
    setSelectedAddressId,
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
    ? (((WIZARD_STEPS as readonly string[]).indexOf(validatedStep) + 1) /
        WIZARD_STEPS.length) *
      100
    : 0;

  const result = {
    state: {
      step: validatedStep,
      isOverview: validatedStep === "overview",
      isSuccess: validatedStep === "success",
      isWizard: isWizardStep,
      wizardProgress,
      cartItems,
      totals,
      formData: {
        shippingMethod,
        paymentMethod,
        warranties,
        couponInput,
        appliedCoupon,
        selectedAddressId
      }
    },
    actions
  };

  return result;
}

export type UseCheckoutLogicReturn = ReturnType<typeof useCheckoutLogic>;
