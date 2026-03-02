import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProductLookupData,
  getRelatedProducts
} from "@/server/functions/products.ts";
import type { PricingTier } from "@/db/schema";

export function useProductLookups(productIds: number[]) {
  // Memoize IDs to prevent infinite query loops and unnecessary refetches
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(productIds)).sort();
  }, [JSON.stringify(productIds)]);

  // Fetch data from the server function
  const { data, isLoading } = useQuery({
    queryKey: ["productLookups", uniqueIds],
    queryFn: () => getProductLookupData({ data: { productIds: uniqueIds } }),
    // Only run the query if we actually have IDs to look up
    enabled: uniqueIds.length > 0
  });

  // Rebuild the lookup maps on the client side
  const lookupMaps = useMemo(() => {
    const pMap = new Map((data?.products ?? []).map((p) => [p.id, p]));
    const aMap = new Map((data?.assets ?? []).map((a) => [a.product_id, a]));

    const tMap = new Map<number, PricingTier[]>();
    (data?.tiers ?? []).forEach((tier) => {
      if (!tMap.has(tier.product_id)) tMap.set(tier.product_id, []);
      // Cast is necessary here unless your drizzle schema strictly infers the identical type
      tMap.get(tier.product_id)!.push(tier as PricingTier);
    });

    tMap.forEach((tiers) =>
      tiers.sort((a, b) => b.min_quantity - a.min_quantity)
    );

    return { productMap: pMap, assetMap: aMap, tiersMap: tMap };
  }, [data]);

  return {
    lookupMaps,
    // If we have no IDs, it's not loading. Otherwise, use the query's loading state.
    isLoading: uniqueIds.length > 0 ? isLoading : false
  };
}

export function useRelatedProductsQuery(currentProductId?: number) {
  return useQuery({
    queryKey: ["related-products", currentProductId],
    queryFn: () => getRelatedProducts({ data: { currentProductId } })
  });
}
