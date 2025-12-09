import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useLiveQuery, eq, min, Query } from "@tanstack/react-db";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection
} from "@/lib/collections";
import type { ProductSuggestion, FlowStepId } from "@/lib/checkout/types";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCheckoutLogic } from "@/lib/checkout/useCheckoutLogic";
import { FLOW_ORDER } from "@/lib/checkout/config";
import SuccessView from "@/components/checkout/views/SuccessView";
import CheckoutWizardView from "@/components/checkout/views/CheckoutWizardView";
import CartOverviewView from "@/components/checkout/views/CartOverviewView";
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc-client";
import { Loader2 } from "lucide-react";

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
      assetsCollection.preload()
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

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  const createPaymentIntent = trpc.payment.createPaymentIntent;
  const [paymentIntentPending, setPaymentIntentPending] = useState(false);

  // Track the JSON string of the payload used for the *current* clientSecret
  // This prevents infinite loops and detects stale data
  const [activePayloadJson, setActivePayloadJson] = useState<string | null>(
    null
  );

  // Construct the payload that determines the price
  const currentPayload = useMemo(
    () => ({
      items: state.cartItems.map((item) => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity
      })),
      shippingMethod: state.formData.shippingMethod,
      warranties: state.formData.warranties,
      appliedCoupon: state.formData.appliedCoupon
    }),
    [state.cartItems, state.formData]
  );

  // --- Intent Management Logic ---
  useEffect(() => {
    // If we have a 'redirect_status', we are returning from Stripe.
    if (redirect_status) return;

    // If not in wizard, clean up everything
    if (!state.isWizard) {
      setClientSecret(null);
      setIntentError(null);
      setActivePayloadJson(null);
      return;
    }

    const currentPayloadJson = JSON.stringify(currentPayload);

    // If the payload has changed (Stale) or we have no secret yet
    if (currentPayloadJson !== activePayloadJson) {
      // Clear existing secret to show Loader (and prevent paying old amount)
      setClientSecret(null);
      setIntentError(null);

      // Prevent duplicate firing if already pending
      if (paymentIntentPending) return;
      setPaymentIntentPending(true);

      createPaymentIntent
        .mutate(currentPayload)
        .then((data) => {
          setClientSecret(data.clientSecret);
          setActivePayloadJson(currentPayloadJson);
        })
        .catch((error) => {
          console.error("Stripe Error:", error);
          setIntentError("Failed to initialize payment. Please try again.");
        })
        .finally(() => {
          setPaymentIntentPending(false);
        });
    }
  }, [
    state.isWizard,
    currentPayload,
    activePayloadJson,
    createPaymentIntent,
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
    if (!clientSecret || paymentIntentPending) {
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
          clientSecret,
          appearance: { theme: "stripe" }
        }}
        key={clientSecret}
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
