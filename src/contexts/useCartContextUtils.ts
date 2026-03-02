import { useMemo } from "react";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import {
  assetsCollection,
  pricingTiersCollection,
  productsCollection
} from "@/lib/collections.ts";
import type { PricingTier } from "@/db/schema.ts";
import type {
  CartNodeShape,
  CartItemShape,
  CartFolderShape,
  EnrichedCartNode,
  EnrichedFlatCartItem,
  EnrichedFlatCartNode
} from "./useCartContext.ts";

// Standard Type Guards
export const isItem = (node: CartNodeShape): node is CartItemShape =>
  node.type === "item";
export const isFolder = (node: CartNodeShape): node is CartFolderShape =>
  node.type === "folder";

// Given a list of product IDs, fetch the data and return Lookup Maps
export function useProductLookups(productIds: number[]) {
  // Memoize IDs to prevent infinite query loops
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(productIds)).sort();
  }, [JSON.stringify(productIds)]);

  const { data: productsData, isLoading: isProductsLoading } = useLiveQuery(
    (q) => {
      if (uniqueIds.length === 0) return undefined;
      return q
        .from({ p: productsCollection })
        .where(({ p }) => inArray(p.id, uniqueIds));
    },
    [uniqueIds]
  );

  const { data: assetsData, isLoading: isAssetsLoading } = useLiveQuery(
    (q) => {
      if (uniqueIds.length === 0) return undefined;
      return q
        .from({ a: assetsCollection })
        .where(({ a }) => inArray(a.product_id, uniqueIds))
        .orderBy(({ a }) => a.id, "desc");
    },
    [uniqueIds]
  );

  const { data: tiersData, isLoading: isTiersLoading } = useLiveQuery(
    (q) => {
      if (uniqueIds.length === 0) return undefined;
      return q
        .from({ pt: pricingTiersCollection })
        .where(({ pt }) => inArray(pt.product_id, uniqueIds));
    },
    [uniqueIds]
  );

  const lookupMaps = useMemo(() => {
    const pMap = new Map(productsData?.map((p) => [p.id, p]));
    const aMap = new Map(assetsData?.map((a) => [a.product_id, a]));

    const tMap = new Map<number, PricingTier[]>();
    (tiersData ?? []).forEach((tier) => {
      if (!tMap.has(tier.product_id)) tMap.set(tier.product_id, []);
      tMap.get(tier.product_id)!.push(tier);
    });

    tMap.forEach((tiers) =>
      tiers.sort((a, b) => b.min_quantity - a.min_quantity)
    );

    return { productMap: pMap, assetMap: aMap, tiersMap: tMap };
  }, [productsData, assetsData, tiersData]);

  return {
    lookupMaps,
    isLoading: isProductsLoading || isAssetsLoading || isTiersLoading
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
      // Fallback to empty string if order is null to prevent sorting errors
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
