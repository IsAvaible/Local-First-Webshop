import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { inArray, asc, ne } from "drizzle-orm";

import { db } from "@/db/connection";
import { productsTable, assetsTable, type Asset } from "@/db/schema";
import ProductCard from "@/components/browse/ProductCard";

// --- Server Functions ---

const getRelatedProducts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      currentProductId: z.number().optional()
    })
  )
  .handler(async ({ data: { currentProductId } }) => {
    const products = await db
      .select()
      .from(productsTable)
      .where(
        currentProductId ? ne(productsTable.id, currentProductId) : undefined
      )
      .limit(4);

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);
    const firstAssetByProductId = new Map<number, Asset>();

    const assetRows = await db
      .select()
      .from(assetsTable)
      .where(inArray(assetsTable.product_id, productIds))
      .orderBy(asc(assetsTable.id));

    for (const asset of assetRows) {
      if (!firstAssetByProductId.has(asset.product_id)) {
        firstAssetByProductId.set(asset.product_id, asset);
      }
    }

    return products.map((product) => ({
      ...product,
      asset: firstAssetByProductId.get(product.id)
    }));
  });

// --- Client Component ---

interface RelatedProductsProps {
  currentProductId?: number;
}

export default function RelatedProducts({
  currentProductId
}: RelatedProductsProps) {
  // Fetch related products data via React Query
  const { data: products, isLoading } = useQuery({
    queryKey: ["related-products", currentProductId],
    queryFn: () => getRelatedProducts({ data: { currentProductId } })
  });

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">You might also like</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCard.Skeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Handle Empty State
  if (!products || products.length === 0) {
    return null;
  }

  // Handle Render
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">You might also like</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            asset={product.asset}
          />
        ))}
      </div>
    </div>
  );
}
