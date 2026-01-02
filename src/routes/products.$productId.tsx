import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  productsCollection,
  categoriesCollection,
  companiesCollection,
  assetsCollection,
  pricingTiersCollection,
  customFieldDefinitionsCollection,
  customFieldValuesCollection,
  wishlistCollection
} from "@/lib/collections";
import Product from "@/components/Product.tsx";
import { authClient } from "@/lib/auth-client";
import { v4 as uuidv4 } from "uuid";

// 1. Preload all necessary collections in the route loader
export const Route = createFileRoute("/products/$productId")({
  ssr: false,
  params: {
    parse: (params) => ({ productId: parseInt(params.productId, 10) })
  },
  component: ProductPageComponent
});

function ProductPageComponent() {
  const { productId } = Route.useParams();
  const { data: session } = authClient.useSession();

  // 2. Query the data with useLiveQuery
  const { data: productData, isLoading: isProductLoading } = useLiveQuery(
    (q) => {
      return q
        .from({ product: productsCollection })
        .where(({ product }) => eq(product.id, productId))
        .join({ category: categoriesCollection }, ({ product, category }) =>
          eq(product.category_id, category.id)
        )
        .join({ company: companiesCollection }, ({ product, company }) =>
          eq(product.company_id, company.id)
        );
    }
  );

  const { data: assetsData, isLoading: isAssetsLoading } = useLiveQuery((q) =>
    q
      .from({ asset: assetsCollection })
      .where(({ asset }) => eq(asset.product_id, productId))
  );

  const { data: pricingTiersData, isLoading: isPricingTiersLoading } =
    useLiveQuery((q) =>
      q
        .from({ pricingTier: pricingTiersCollection })
        .where(({ pricingTier }) => eq(pricingTier.product_id, productId))
        .orderBy(({ pricingTier }) => [pricingTier.min_quantity, "desc"])
    );

  // Fetch custom field values and their definitions for this product
  const { data: customFieldData, isLoading: isCustomFieldsLoading } =
    useLiveQuery((q) =>
      q
        .from({ cfv: customFieldValuesCollection })
        .innerJoin({ cfd: customFieldDefinitionsCollection }, ({ cfv, cfd }) =>
          eq(cfv.field_definition_id, cfd.id)
        )
        .where(({ cfv }) => eq(cfv.product_id, productId))
        .select(({ cfv, cfd }) => ({
          ...cfv,
          ...cfd
        }))
    );

  const { data: wishlistData, isLoading: isWishlistLoading } = useLiveQuery(
    (q) => {
      return q
        .from({ w: wishlistCollection })
        .where(({ w }) => eq(w.product_id, productId));
    },
    [productId]
  );

  const isLoading =
    isProductLoading ||
    isAssetsLoading ||
    isPricingTiersLoading ||
    isCustomFieldsLoading ||
    isWishlistLoading;

  const { product, category, company } = productData[0] || {};
  const wishlistItem = wishlistData?.[0];
  const isInWishlist = !!wishlistItem;

  const handleToggleWishlist = () => {
    if (!session || !product || !pricingTiersData.length) return;

    if (isInWishlist) {
      wishlistCollection.delete(wishlistItem.id);
    } else {
      wishlistCollection.insert({
        user_id: session.user.id,
        product_id: product.id,
        price_snapshot: pricingTiersData[0].price_per_unit.toString(),
        id: uuidv4(),
        created_at: new Date()
      });
    }
  };

  return (
    <Product
      loading={isLoading}
      product={product}
      category={category}
      company={company}
      assets={assetsData}
      pricingTiers={pricingTiersData}
      customFields={customFieldData}
      isInWishlist={isInWishlist}
      onToggleWishlist={handleToggleWishlist}
    />
  );
}
