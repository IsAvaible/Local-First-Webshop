import { useMemo } from "react";
import { useProductLookups } from "@/hooks/queries/useProductQueries.ts";

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
