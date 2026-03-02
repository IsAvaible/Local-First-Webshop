import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { inArray, desc } from "drizzle-orm";

import { db } from "@/db/connection";
import { productsTable, assetsTable, pricingTiersTable } from "@/db/schema";
import type { PricingTier } from "@/db/schema";
import type {
  CartNodeShape,
  CartItemShape,
  CartFolderShape,
  EnrichedCartNode,
  EnrichedFlatCartItem,
  EnrichedFlatCartNode
} from "./useCartContext";

// --- Standard Type Guards ---
export const isItem = (node: CartNodeShape): node is CartItemShape =>
  node.type === "item";
export const isFolder = (node: CartNodeShape): node is CartFolderShape =>
  node.type === "folder";

// --- Server Functions ---

const getProductLookupData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productIds: z.array(z.number()) }))
  .handler(async ({ data: { productIds } }) => {
    if (!productIds || productIds.length === 0) {
      return { products: [], assets: [], tiers: [] };
    }

    // Deduplicate IDs for the DB query
    const uniqueIds = Array.from(new Set(productIds));

    // Fetch all related data concurrently
    const [products, assets, tiers] = await Promise.all([
      db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, uniqueIds)),
      db
        .select()
        .from(assetsTable)
        .where(inArray(assetsTable.product_id, uniqueIds))
        .orderBy(desc(assetsTable.id)),
      db
        .select()
        .from(pricingTiersTable)
        .where(inArray(pricingTiersTable.product_id, uniqueIds))
    ]);

    return { products, assets, tiers };
  });

// --- Client Hooks ---

// Given a list of product IDs, fetch the data via React Query and return Lookup Maps
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

// Given raw nodes and lookup maps, return the Tree and Enriched Flat list
export function useEnrichedTree(
  rawNodes: CartNodeShape[],
  lookupMaps: ReturnType<typeof useProductLookups>["lookupMaps"],
  isLoadingData: boolean
) {
  const { productMap, assetMap, tiersMap } = lookupMaps;

  // 1. Enrich Flat Nodes
  const enrichedFlatNodes: EnrichedFlatCartNode[] = useMemo(() => {
    if (isLoadingData) return [];

    return rawNodes.map((node) => {
      if (isItem(node)) {
        const product = productMap.get(node.product_id);
        const asset = assetMap.get(node.product_id);
        const validTiers = tiersMap.get(node.product_id) ?? [];

        const bestTier = validTiers.find(
          (t) => t.min_quantity <= node.quantity
        );

        return {
          ...node,
          product,
          asset,
          price: bestTier?.price_per_unit ?? node.price_snapshot
        };
      }
      return { ...node };
    });
  }, [rawNodes, productMap, assetMap, tiersMap, isLoadingData]);

  const enrichedFlatItems = useMemo(
    () => enrichedFlatNodes.filter(isItem),
    [enrichedFlatNodes]
  ) as EnrichedFlatCartItem[];

  // 2. Build Tree
  const rootNodes: EnrichedCartNode[] = useMemo(() => {
    if (enrichedFlatNodes.length === 0) return [];

    const nodesByParent: Record<string, EnrichedCartNode[]> = {};
    const roots: EnrichedCartNode[] = [];

    enrichedFlatNodes.forEach((node) => {
      const newNode: EnrichedCartNode = isFolder(node)
        ? { ...node, children: [] }
        : { ...node };

      if (!node.parent_id) {
        roots.push(newNode);
      } else {
        if (!nodesByParent[node.parent_id]) {
          nodesByParent[node.parent_id] = [];
        }
        nodesByParent[node.parent_id].push(newNode);
      }
    });

    const sortNodes = (a: EnrichedCartNode, b: EnrichedCartNode) => {
      const orderA = a.order ?? "";
      const orderB = b.order ?? "";
      if (orderA === orderB) return a.id.localeCompare(b.id);
      return orderA < orderB ? -1 : 1;
    };

    const buildHierarchy = (node: EnrichedCartNode): EnrichedCartNode => {
      if (node.type === "item") {
        return { ...node };
      }
      const children = nodesByParent[node.id] || [];
      children.sort(sortNodes);
      return { ...node, children: children.map(buildHierarchy) };
    };

    roots.sort(sortNodes);
    return roots.map(buildHierarchy);
  }, [enrichedFlatNodes]);

  return { rootNodes, enrichedFlatItems };
}
