import { useLiveQuery, Query, min, eq, not } from "@tanstack/react-db";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection
} from "@/lib/collections";
import ProductCard from "@/components/browse/ProductCard";

interface RelatedProductsProps {
  currentProductId?: number;
}

export default function RelatedProducts({
  currentProductId
}: RelatedProductsProps) {
  // 1. Define the Query logic
  const { data: products, isLoading } = useLiveQuery(
    () => {
      // Subquery: Get lowest price per product
      const minPriceSubquery = new Query()
        .from({ pt: pricingTiersCollection })
        .groupBy(({ pt }) => pt.product_id)
        .select(({ pt }) => ({
          product_id: pt.product_id,
          min_price: min(pt.price_per_unit)
        }));

      // Subquery: Get the first asset ID (thumbnail) per product
      const firstAssetIdSubquery = new Query()
        .from({ a: assetsCollection })
        .groupBy(({ a }) => a.product_id)
        .select(({ a }) => ({
          product_id: a.product_id,
          first_asset_id: min(a.id)
        }));

      // Main Query
      let query = new Query()
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
        .select(({ p, price, asset }) => ({
          ...p,
          min_price: price?.min_price as number | null | undefined,
          asset: asset
        }))
        .orderBy(({ p }) => p.id)
        .limit(4);

      // Exclude current product if ID is provided
      if (currentProductId) {
        query = query.where(({ p }) => not(eq(p.id, currentProductId)));
      }

      return query;
    },
    [currentProductId] // Re-run if current product changes
  );

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">You might also like</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {!isLoading
          ? products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                asset={product.asset}
              />
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <ProductCard.Skeleton key={i} />
            ))}
      </div>
    </div>
  );
}
