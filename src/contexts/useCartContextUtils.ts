import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import {
  assetsCollection,
  pricingTiersCollection,
  productsCollection
} from "@/lib/collections.ts";
import {
  isYFolder,
  isYItem,
  type PricingTier,
  type YCartNodeShape,
  type YCartSnapshotShape
} from "@/db/schema.ts";
import type {
  EnrichedCartNode,
  EnrichedFlatCartNode
} from "@/contexts/useCartContext.ts";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { deepEqual } from "fast-equals";
import diff from "fast-diff";

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
  rawNodes: YCartNodeShape[],
  lookupMaps: ReturnType<typeof useProductLookups>["lookupMaps"],
  isLoadingData: boolean
) {
  const { productMap, assetMap, tiersMap } = lookupMaps;

  // 1. Enrich Flat Nodes
  const enrichedFlatNodes: EnrichedFlatCartNode[] = useMemo(() => {
    if (isLoadingData) return [];

    return rawNodes.map((node) => {
      if (isYItem(node)) {
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
    () => enrichedFlatNodes.filter(isYItem),
    [enrichedFlatNodes]
  );

  // 2. Build Tree
  const rootNodes: EnrichedCartNode[] = useMemo(() => {
    if (enrichedFlatNodes.length === 0) return [];

    const nodesByParent: Record<string, EnrichedCartNode[]> = {};
    const roots: EnrichedCartNode[] = [];

    enrichedFlatNodes.forEach((node) => {
      const newNode: EnrichedCartNode = isYFolder(node)
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
      if (a.order === b.order) return a.id.localeCompare(b.id);
      return a.order < b.order ? -1 : 1;
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

/**
 * Reverts a Y.Doc to the state captured in the provided snapshot update.
 * From: https://github.com/toeverything/AFFiNE/blob/e5db566ef0fe3114180ccd4eff199fc8032e2696/packages/common/y-indexeddb/src/index.ts#L34-L72
 */
export function revertToSnapshot(
  doc: Y.Doc,
  snapshotDoc: Y.Doc,
  getMetadata: (key: string) => "Text" | "Map" | "Array"
) {
  const currentStateVector = Y.encodeStateVector(doc);
  const snapshotStateVector = Y.encodeStateVector(snapshotDoc);

  const changesSinceSnapshotUpdate = Y.encodeStateAsUpdate(
    doc,
    snapshotStateVector
  );

  const undoManager = new Y.UndoManager(
    [...snapshotDoc.share.keys()]
      .filter((key) => key !== "snapshots") // keep history intact
      .map((key) => {
        const type = getMetadata(key);
        if (type === "Text") {
          return snapshotDoc.getText(key);
        } else if (type === "Map") {
          return snapshotDoc.getMap(key);
        } else if (type === "Array") {
          return snapshotDoc.getArray(key);
        }
        throw new Error(`Unknown type for key: ${key}`);
      }),
    {
      trackedOrigins: new Set([SNAPSHOT_ORIGIN])
    }
  );

  Y.applyUpdate(snapshotDoc, changesSinceSnapshotUpdate, SNAPSHOT_ORIGIN);
  undoManager.undo();

  const revertChangesSinceSnapshotUpdate = Y.encodeStateAsUpdate(
    snapshotDoc,
    currentStateVector
  );

  Y.applyUpdate(doc, revertChangesSinceSnapshotUpdate, SNAPSHOT_ORIGIN);
}

// Define a specific origin for these transactions so they can be tracked/filtered if needed
export const SNAPSHOT_ORIGIN = "restore-snapshot-action";

/**
 * Application-specific wrapper to restore a Cart Snapshot.
 */
export function restoreCartSnapshot(doc: Y.Doc, snapshot: YCartSnapshotShape) {
  if (!snapshot.snapshot) {
    throw Error("Snapshot data is missing");
  }

  doc.transact(() => {
    let snapshotDoc: Y.Doc;

    try {
      const snap = Y.decodeSnapshot(snapshot.snapshot);
      // Create a temporary doc that reflects the state at the time of the snapshot
      snapshotDoc = Y.createDocFromSnapshot(doc, snap);
    } catch {
      throw Error("Failed to decode snapshot");
    }

    // Check if all key value pairs are equal
    const keysToCompare = [...doc.share.keys()].filter(
      (key) => key !== "snapshots"
    );

    const isIdentical = keysToCompare.every((key) =>
      deepEqual(doc.share.get(key)?.toJSON(), snapshotDoc.getMap(key)?.toJSON())
    );

    if (isIdentical) {
      throw Error(
        "Document content is identical to snapshot. Skipping restore."
      );
    }

    // 1. Capture State before restore
    const beforeNodes = Object.values(
      doc.getMap("nodes").toJSON()
    ) as YCartNodeShape[];

    // 2. Capture State after restore
    const targetNodes = Object.values(
      snapshotDoc.getMap("nodes").toJSON()
    ) as YCartNodeShape[];

    // Calculate Delta
    const delta = getSnapshotDelta(beforeNodes, targetNodes);

    // Run the revert logic
    revertToSnapshot(doc, snapshotDoc, (key) => {
      switch (key) {
        case "nodes":
        case "tags":
          return "Map";
        case "snapshots":
          return "Array";
        default:
          return "Map";
      }
    });

    // Create a new snapshot of this restored state
    const restoredStateSnapshot = Y.snapshot(doc);
    const encodedSnapshot = Y.encodeSnapshot(restoredStateSnapshot);

    const newSnapshotEntry: YCartSnapshotShape = {
      id: uuidv4(),
      timestamp: Date.now(),
      snapshot: encodedSnapshot,
      restoredFromId: snapshot.id,
      meta: {
        summary: `${delta.summary}`,
        delta: delta,
        authors: snapshot.meta?.authors || []
      }
    };

    // Push to history
    const snapshotsArray = doc.getArray<YCartSnapshotShape>("snapshots");
    snapshotsArray.push([newSnapshotEntry]);
  }, SNAPSHOT_ORIGIN);
}

export function getSnapshotDelta(
  prevItems: YCartNodeShape[],
  currItems: YCartNodeShape[]
) {
  const prevMap = new Map(prevItems.map((i) => [i.id, i]));
  const currMap = new Map(currItems.map((i) => [i.id, i]));

  let added = 0;
  let removed = 0;
  let modified = 0;

  // Calculate Added & Modified
  for (const curr of currItems) {
    const prev = prevMap.get(curr.id);
    if (!prev) {
      added++;
    } else if (!deepEqual(prev, curr)) {
      modified++;
    }
  }

  // Calculate Removed
  for (const prev of prevItems) {
    if (!currMap.has(prev.id)) {
      removed++;
    }
  }

  return {
    addedCount: added,
    removedCount: removed,
    modifiedCount: modified,
    summary: `+${added} / -${removed} / ~${modified}`
  };
}

// inspired by and extended from https://discuss.yjs.dev/t/plain-text-input-component-with-y-text/2358/2
export function useYjsText(yText: Y.Text | undefined) {
  const [value, setValue] = useState("");
  // Block observer from firing during our own local updates
  const isLocalUpdate = useRef(false);

  // Subscribe to Y.Text changes
  useEffect(() => {
    if (!yText) return;

    // Set initial value
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    setValue(yText.toString());

    const observer = () => {
      // Only update local state if the change came from a remote user
      if (!isLocalUpdate.current) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        setValue(yText.toString());
      }
    };

    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
    };
  }, [yText]);

  // Handle Local Changes
  const handleChange = useCallback(
    (newValue: string) => {
      if (!yText) return;

      // Update React state immediately (optimistic)
      setValue(newValue);

      // Lock the observer
      isLocalUpdate.current = true;

      yText.doc?.transact(() => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const oldText = yText.toString();
        // Calculate Delta
        const delta = diffToDelta(diff(oldText, newValue));
        yText.applyDelta(delta);
      });

      isLocalUpdate.current = false;
    },
    [yText]
  );

  return { value, onChange: handleChange };
}

function diffToDelta(diffResult: diff.Diff[]) {
  return diffResult
    .map(([op, value]) => {
      if (op === diff.EQUAL) return { retain: value.length };
      if (op === diff.INSERT) return { insert: value };
      if (op === diff.DELETE) return { delete: value.length };
      return null;
    })
    .filter(Boolean);
}
