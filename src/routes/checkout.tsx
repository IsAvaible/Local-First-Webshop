import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useLiveQuery, eq, and } from "@tanstack/react-db";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection,
  ordersCollection
} from "@/lib/collections";
import type { FlowStepId } from "@/lib/checkout/types";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCheckoutLogic } from "@/lib/checkout/useCheckoutLogic";
import { FLOW_ORDER } from "@/lib/checkout/config";
import SuccessView from "@/components/checkout/views/SuccessView";
import CheckoutWizardView from "@/components/checkout/views/CheckoutWizardView";
import CartOverviewView from "@/components/checkout/views/CartOverviewView";
import ConnectionErrorView from "@/components/checkout/views/ConnectionErrorView";
import CheckoutLoadingView from "@/components/checkout/views/CheckoutLoadingView";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc-client";
import { deepEqual } from "fast-equals";
import type { UserAddress } from "@/db/schema.ts";
import { toast } from "sonner";

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  throw Error("Stripe Secret missing or not configured");
}

// --- Stripe Setup ---
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
);

// --- Search Param Validation ---
const urlDefaultValues = {
  step: "overview" as FlowStepId
};

const cartUrlSchema = z.object({
  step: z.enum(FLOW_ORDER).optional().default("overview").catch("overview"),
  // Stripe return parameters
  payment_intent: z.string().optional(),
  payment_intent_client_secret: z.string().optional(),
  redirect_status: z.string().optional(),
  orderId: z.string().optional(),
  error: z.string().optional()
});

// --- Loader & Route Definition ---
export const Route = createFileRoute("/checkout")({
  ssr: false,
  validateSearch: zodValidator(cartUrlSchema),
  search: {
    middlewares: [stripSearchParams(urlDefaultValues)]
  },
  loader: async () => {
    await Promise.all([
      productsCollection.preload(),
      pricingTiersCollection.preload(),
      assetsCollection.preload(),
      ordersCollection.preload()
    ]);
  },
  component: CheckoutPage
});

// --- Main Component ---
function CheckoutPage() {
  const navigate = Route.useNavigate();
  const {
    step,
    payment_intent,
    payment_intent_client_secret,
    redirect_status,
    error
  } = Route.useSearch();
  const { state, actions } = useCheckoutLogic({
    step,
    navigate,
    stripeParams: {
      payment_intent,
      payment_intent_client_secret,
      redirect_status,
      error
    }
  });

  useEffect(() => {
    // If we are in a wizard step (address, shipping, payment) but have no items, redirect to overview.
    if (state.isWizard && state.cartItems.length === 0) {
      void navigate({
        search: (prev) => ({ ...prev, step: "overview" }),
        replace: true
      }).then(() => toast("Please select some items, before checking out."));
    }
  }, [state.isWizard, state.cartItems.length, navigate]);

  const { data: activeOrder } = useLiveQuery((q) =>
    q
      .from({ o: ordersCollection })
      .where(({ o }) =>
        and(eq(o.status, "pending"), eq(o.cart_id, state.cartId))
      )
      .findOne()
  );

  // --- Sync db data with form ---
  // TODO: In production the form data and order state would need to be more closely coupled
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    // If DB isn't ready, or we have ALREADY hydrated the form, do nothing.
    if (!activeOrder || hasHydratedRef.current) return;

    let hasChanges = false;

    // Sync Shipping
    const shipId = (activeOrder.shipping_address_snapshot as UserAddress)?.id;
    if (shipId && shipId !== state.formData.selectedAddressId) {
      actions.setSelectedAddressId(shipId);
      hasChanges = true;
    }

    // Sync Billing
    const billId = (activeOrder.billing_address_snapshot as UserAddress)?.id;
    if (billId && billId !== state.formData.billingAddressId) {
      actions.setBillingAddressId(billId);
      hasChanges = true;
    }

    if (hasChanges) {
      hasHydratedRef.current = true;
    }
  }, [
    activeOrder,
    actions,
    state.formData.selectedAddressId,
    state.formData.billingAddressId
  ]);

  const [intentError, setIntentError] = useState<string | null>(null);

  const upsertOrder = trpc.orders.upsert;
  const [paymentIntentPending, setPaymentIntentPending] = useState(false);

  // Construct the payload that determines the price
  const currentPayload: Parameters<typeof upsertOrder.mutate>[0] = useMemo(
    () => ({
      items: state.cartItems.map((item) => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity
      })),
      shippingMethod: state.formData.shippingMethod,
      warranties: state.formData.warranties,
      appliedCoupon: state.formData.appliedCoupon,
      addressId: state.formData.selectedAddressId,
      billingAddressId: state.formData.billingAddressId,
      existingOrderId: activeOrder?.id,
      cartId: state.cartId
    }),
    [
      activeOrder?.id,
      state.cartId,
      state.cartItems,
      state.formData.appliedCoupon,
      state.formData.selectedAddressId,
      state.formData.billingAddressId,
      state.formData.shippingMethod,
      state.formData.warranties
    ]
  );

  const [activePayload, setActivePayload] = useState<
    typeof currentPayload | null
  >(null);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Intent Management Logic ---
  useEffect(() => {
    // If we have a 'redirect_status', we are returning from Stripe.
    if (redirect_status) return;

    // If not in wizard, clean up everything
    if (!state.isWizard) {
      setIntentError(null);
      setActivePayload(null);
      return;
    }

    // Do not auto-retry. Wait for the user to click "Retry" in the UI.
    if (intentError) return;

    // If the payload has changed (Stale)
    if (!deepEqual(currentPayload, activePayload)) {
      // Clear any existing retry timers from previous payload attempts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Clear existing secret to show Loader
      setIntentError(null);

      // Prevent duplicate firing if already pending
      if (paymentIntentPending) return;

      setPaymentIntentPending(true);

      // Define a recursive backoff function
      const MAX_RETRIES = 3;

      const attemptUpsert = (attemptCount: number) => {
        upsertOrder
          .mutate(currentPayload)
          .then(() => {
            setActivePayload(currentPayload);
            setPaymentIntentPending(false);
          })
          .catch((error) => {
            console.error(`Stripe Error (Attempt ${attemptCount + 1}):`, error);

            if (attemptCount < MAX_RETRIES) {
              // Calculate delay: 1s, 2s, 4s...
              const delay = Math.pow(2, attemptCount) * 1000;

              // Wait, then retry.
              retryTimeoutRef.current = setTimeout(() => {
                attemptUpsert(attemptCount + 1);
              }, delay);
            } else {
              // Final failure after retries
              setIntentError(
                "Failed to initialize payment after multiple attempts. Please try again."
              );
              setPaymentIntentPending(false); // Release the lock
            }
          });
      };

      // Trigger the first attempt
      attemptUpsert(0);
    }

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [
    state.isWizard,
    currentPayload,
    activePayload,
    upsertOrder,
    paymentIntentPending,
    redirect_status,
    intentError
  ]);

  // Handle Error State in UI
  if (intentError) {
    return (
      <ConnectionErrorView
        onRetry={() => {
          setIntentError(null);
          setActivePayload(null);
        }}
      />
    );
  }

  if (state.isSuccess) {
    return <SuccessView />;
  }

  if (state.isWizard) {
    // Show loader if secret is missing OR we are currently fetching a new one
    if (!activeOrder?.stripe_client_secret || !activePayload) {
      return <CheckoutLoadingView state={state} actions={actions} />;
    }

    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: activeOrder?.stripe_client_secret,
          appearance: { theme: "stripe" }
        }}
        key={activeOrder.stripe_client_secret}
      >
        <CheckoutWizardView
          state={state}
          actions={actions}
          isPaymentIntentPending={paymentIntentPending}
        />
      </Elements>
    );
  }

  return <CartOverviewView state={state} actions={actions} />;
}
