import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useLiveQuery, eq, min, Query, and } from "@tanstack/react-db";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection,
  ordersCollection
} from "@/lib/collections";
import type { ProductSuggestion, FlowStepId } from "@/lib/checkout/types";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCheckoutLogic } from "@/lib/checkout/useCheckoutLogic";
import { FLOW_ORDER } from "@/lib/checkout/config";
import SuccessView from "@/components/checkout/views/SuccessView";
import CheckoutWizardView from "@/components/checkout/views/CheckoutWizardView";
import CartOverviewView from "@/components/checkout/views/CartOverviewView";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc-client";
import { Loader2 } from "lucide-react";
import { deepEqual } from "fast-equals";
import type { UserAddress } from "@/db/schema.ts";

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

  const { data: activeOrder } = useLiveQuery((q) =>
    q
      .from({ o: ordersCollection })
      .where(({ o }) =>
        and(eq(o.status, "awaiting_payment"), eq(o.cart_id, state.cartId))
      )
      .findOne()
  );
  const shippingAddressSnapshotId = activeOrder
    ? (activeOrder.shipping_address_snapshot as UserAddress).id
    : null;
  if (
    shippingAddressSnapshotId &&
    shippingAddressSnapshotId != state.formData.selectedAddressId
  ) {
    actions.setSelectedAddressId(shippingAddressSnapshotId);
  }

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
      billingAddressId: null,
      existingOrderId: activeOrder?.id,
      cartId: state.cartId
    }),
    [
      activeOrder?.id,
      state.cartId,
      state.cartItems,
      state.formData.appliedCoupon,
      state.formData.selectedAddressId,
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

      // 3. Define the recursive backoff function
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
    redirect_status
  ]);

  // Data Loading for Recommendations
  const { data: suggestions, isLoading: isSuggestionsLoading } = useLiveQuery(
    () => {
      const minPriceSubquery = new Query()
        .from({ pt: pricingTiersCollection })
        .groupBy(({ pt }) => pt.product_id)
        .select(({ pt }) => ({
          product_id: pt.product_id,
          min_price: min(pt.price_per_unit)
        }));

      const firstAssetIdSubquery = new Query()
        .from({ a: assetsCollection })
        .groupBy(({ a }) => a.product_id)
        .select(({ a }) => ({
          product_id: a.product_id,
          first_asset_id: min(a.id)
        }));

      return new Query()
        .from({ p: productsCollection })
        .leftJoin({ price: minPriceSubquery }, ({ p, price }) =>
          eq(p.id, price.product_id)
        )
        .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
          eq(p.id, fa_id.product_id)
        )
        .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
          eq(asset.id, fa_id?.first_asset_id)
        )
        .limit(4)
        .orderBy(({ p }) => p.id)
        .select(({ p, price, asset }) => ({
          ...p,
          min_price: price?.min_price,
          asset: asset
        }));
    }
  );

  // Handle Error State in UI
  if (intentError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-10 text-center">
        <p className="mb-4 text-red-500">{intentError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.isSuccess) {
    return <SuccessView onReset={actions.resetFlow} />;
  }

  if (state.isWizard) {
    // Show loader if secret is missing OR we are currently fetching a new one
    if (!activeOrder?.stripe_client_secret) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      );
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
        <CheckoutWizardView state={state} actions={actions} />
      </Elements>
    );
  }

  return (
    <CartOverviewView
      state={state}
      actions={actions}
      suggestions={suggestions as ProductSuggestion[]}
      isSuggestionsLoading={isSuggestionsLoading}
    />
  );
}
