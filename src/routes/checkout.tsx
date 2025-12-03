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

// --- Search Param Validation ---
const urlDefaultValues = {
  step: "overview" as FlowStepId
};

const cartUrlSchema = z.object({
  step: z.enum(FLOW_ORDER).optional().default("overview").catch("overview")
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
  const { step } = Route.useSearch();
  const { state, actions } = useCheckoutLogic({ step, navigate });

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

  // View Routing - Clean and Flat
  if (state.isSuccess) {
    return <SuccessView onReset={actions.resetFlow} />;
  }

  if (state.isWizard) {
    return <CheckoutWizardView state={state} actions={actions} />;
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
