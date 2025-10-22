import { createFileRoute } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  productsCollection,
  categoriesCollection,
  companiesCollection,
  assetsCollection,
  pricingTiersCollection
} from "@/lib/collections";
import Product from "@/components/Product.tsx";

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
        .orderBy(({ pricingTier }) => [pricingTier.min_quantity, "asc"])
    );

  const isLoading =
    isProductLoading || isAssetsLoading || isPricingTiersLoading;

  const { product, category, company } = productData[0] || {};

  return (
    <Product
      loading={isLoading}
      product={product}
      category={category}
      company={company}
      assets={assetsData}
      pricingTiers={pricingTiersData}
    />
  );
}
