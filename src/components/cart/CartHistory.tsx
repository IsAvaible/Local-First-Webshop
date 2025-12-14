import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HistoryIcon,
  ClockIcon,
  ArrowRightIcon,
  UsersIcon
} from "lucide-react";
import {
  useCart,
  CartContext,
  type CartContextType,
  type Tag
} from "@/contexts/useCartContext";
import { Cart } from "./Cart";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type YCartSnapshotShape,
  isYItem,
  type YCartNodeShape
} from "@/db/schema";
import * as Y from "yjs";
import {
  useEnrichedTree,
  useProductLookups
} from "@/contexts/useCartContextUtils.ts";

// --- Helper to enrich nodes ---
function useEnrichedSnapshot(snapshot: YCartSnapshotShape) {
  const { __yDoc: originalDoc } = useCart();

  // 1. Reconstruct Raw Data from Snapshot
  const { restoredNodes, restoredTags } = useMemo(() => {
    if (!originalDoc || !snapshot.snapshot) {
      return { restoredNodes: [], restoredTags: [] };
    }
    try {
      const snap = Y.decodeSnapshot(snapshot.snapshot);
      const tempDoc = Y.createDocFromSnapshot(originalDoc, snap);
      const nodesMap = tempDoc.getMap("nodes");
      const tagsMap = tempDoc.getMap("tags");

      return {
        restoredNodes: Object.values(
          nodesMap.toJSON() as Record<string, YCartNodeShape>
        ),
        restoredTags: Object.values(tagsMap.toJSON() as Record<string, Tag>)
      };
    } catch (e) {
      console.error("Failed to restore snapshot", e);
      return { restoredNodes: [], restoredTags: [] };
    }
  }, [snapshot, originalDoc]);

  // 2. Extract Product IDs from the SNAPSHOT nodes
  const snapshotProductIds = useMemo(() => {
    return restoredNodes.filter(isYItem).map((n) => n.product_id);
  }, [restoredNodes]);

  // 3. Live Query specific to these IDs
  // This ensures we get data even if the product isn't in the active cart
  const { lookupMaps, isLoading } = useProductLookups(snapshotProductIds);

  // 4. Enrich & Build Tree using shared logic
  const { rootNodes, enrichedFlatItems } = useEnrichedTree(
    restoredNodes,
    lookupMaps,
    isLoading
  );

  return { rootNodes, enrichedFlatItems, restoredTags, isLoading };
}

function SnapshotCartView({
  snapshot,
  parentContext
}: {
  snapshot: YCartSnapshotShape;
  parentContext: CartContextType;
}) {
  const { rootNodes, enrichedFlatItems, restoredTags } =
    useEnrichedSnapshot(snapshot);

  // Create mock context
  // FIX: Explicitly cast partial object or ensure all CartContextType props exist
  // We use the parent context spread to fill gaps, then override relevant parts
  const mockContext: CartContextType = useMemo(
    () => ({
      ...parentContext,
      cartId: `snapshot-${snapshot.id}`,
      rootNodes,
      enrichedFlatItems,
      tags: restoredTags,
      // Read-only overrides
      canManageItems: false,
      canManageUsers: false,
      isLoading: false,
      isSynced: true, // Snapshots are static, so they are "synced"
      // Disable all mutations with no-ops
      /* eslint-disable @typescript-eslint/no-empty-function */
      addItem: () => {},
      removeItem: () => {},
      updateItemQuantity: () => {},
      updateItemNotes: () => {},
      moveNode: () => {},
      createFolder: () => {},
      updateFolder: () => {},
      createTag: () => {},
      updateTag: () => {},
      deleteTag: () => {},
      addTagToItem: () => {},
      removeTagFromItem: () => {},
      addCollaborator: async () => {},
      updateCollaboratorRole: async () => {},
      removeCollaborator: async () => {},
      setActiveCartId: async () => {},
      createCart: () => {}
    }),
    [snapshot, rootNodes, enrichedFlatItems, restoredTags, parentContext]
  );

  return (
    <CartContext value={mockContext}>
      <div className="h-full opacity-90 select-none">
        <Cart
          displayHeader={false}
          displayFooter={false}
          displayCheckoutButton={false}
        />
      </div>
    </CartContext>
  );
}

export function CartHistoryDialog() {
  const context = useCart();
  const { snapshots } = context;
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<YCartSnapshotShape | null>(null);

  // Reverse snapshots to show newest first
  const sortedSnapshots = useMemo(
    () => [...(snapshots || [])].reverse(),
    [snapshots]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="History">
          <HistoryIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] flex-col sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden pt-4">
          {/* Sidebar List */}
          <div className="flex w-64 flex-col gap-2 border-r pr-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-500">
              Snapshots
            </h3>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {sortedSnapshots.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No snapshots yet.
                  </p>
                )}
                {sortedSnapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;

                  const deltaSummary = snap.meta.summary;
                  const authors = snap.meta.authors;

                  return (
                    <button
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-gray-100",
                        isSelected
                          ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                          : "border-transparent bg-gray-50/50"
                      )}
                    >
                      {/* Row 1: Time */}
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          {formatDistanceToNow(new Date(snap.timestamp), {
                            addSuffix: true
                          })}
                        </div>
                      </div>

                      {/* Row 2: Delta Summary */}
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isSelected ? "text-blue-900" : "text-gray-800"
                        )}
                      >
                        {deltaSummary}
                      </span>

                      {/* Row 3: Authors (if available) */}
                      {authors.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                          <UsersIcon className="h-3 w-3 text-gray-400" />
                          <span className="max-w-[180px] truncate">
                            {authors.join(", ")}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main View */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selectedSnapshot ? (
              <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Snapshot State */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-gray-50/50">
                  <div className="border-b bg-gray-100 p-2 text-center text-sm font-medium text-gray-600">
                    Snapshot State (
                    {formatDistanceToNow(selectedSnapshot.timestamp, {
                      addSuffix: true
                    })}
                    )
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <SnapshotCartView
                      snapshot={selectedSnapshot}
                      parentContext={context}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center text-gray-300">
                  <ArrowRightIcon className="h-6 w-6" />
                </div>

                {/* Live State (Reference) */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white">
                  <div className="border-b bg-blue-50 p-2 text-center text-sm font-medium text-blue-600">
                    Current Live State
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <div className="select-none">
                      <Cart
                        displayHeader={false}
                        displayFooter={false}
                        displayCheckoutButton={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border-2 border-dashed bg-gray-50">
                <div className="text-center">
                  <HistoryIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Select a snapshot from the sidebar to compare.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
