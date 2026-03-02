import { createFileRoute } from "@tanstack/react-router";

import Product from "@/components/Product.tsx";
import { authClient } from "@/lib/auth-client";
import { v4 as uuidv4 } from "uuid";

import { getProductPageData } from "@/server/functions/products.ts";
import {
  useProductWishlistQuery,
  useAddWishlistItemMutation,
  useRemoveWishlistItemMutation
} from "@/hooks/queries/useWishlistQueries.ts";

export const Route = createFileRoute("/products/$productId")({
  ssr: true,
  params: {
    parse: (params) => ({ productId: parseInt(params.productId, 10) })
  },
  component: ProductPageComponent,
  loader: async ({ params: { productId } }) =>
    getProductPageData({ data: { productId } })
});

function ProductPageComponent() {
  const { productId } = Route.useParams();
  const { data: session } = authClient.useSession();

  const { product, category, company, assets, pricingTiers, customFields } =
    Route.useLoaderData();

  // --- Queries & Mutations ---
  const { data: wishlistData, isLoading: isWishlistLoading } =
    useProductWishlistQuery(productId, session?.user?.id);

  const isInWishlist = wishlistData && wishlistData.length > 0;
  const wishlistItemId = isInWishlist ? wishlistData[0].id : null;

  const addMutation = useAddWishlistItemMutation(productId, session?.user?.id);
  const removeMutation = useRemoveWishlistItemMutation(
    productId,
    session?.user?.id
  );

  const isLoading = isWishlistLoading;

  const handleToggleWishlist = () => {
    if (!session || !product || !pricingTiers.length) return;

    if (isInWishlist) {
      if (wishlistItemId) {
        removeMutation.mutate(wishlistItemId);
      }
    } else {
      addMutation.mutate({
        id: uuidv4(),
        user_id: session.user.id,
        product_id: product.id,
        price_snapshot: pricingTiers[0].price_per_unit.toString()
      });
    }
  };

  return (
    <Product
      loading={isLoading}
      product={product}
      category={category ?? undefined}
      company={company}
      assets={assets}
      pricingTiers={pricingTiers}
      customFields={customFields}
      isInWishlist={isInWishlist}
      onToggleWishlist={handleToggleWishlist}
    />
  );
}
