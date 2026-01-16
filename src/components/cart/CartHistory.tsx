import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HistoryIcon,
  ClockIcon,
  ArrowRightIcon,
  UsersIcon,
  RotateCcw,
  CornerUpLeft
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
  restoreCartSnapshot,
  useEnrichedTree,
  useProductLookups
} from "@/contexts/useCartContextUtils.ts";
import { toast } from "sonner";

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
      toast(`Failed to restore snapshot ${e as string}`);
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
      addItem: () => undefined,
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
  const { snapshots, __yDoc: doc } = context;

  const [isOpen, setIsOpen] = useState(false);

  const [selectedSnapshot, setSelectedSnapshot] =
    useState<YCartSnapshotShape | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);

  const snapshotMap = useMemo(() => {
    return new Map((snapshots || []).map((s) => [s.id, s]));
  }, [snapshots]);

  // Reverse snapshots to show newest first
  const sortedSnapshots = useMemo(
    () => [...(snapshots || [])].reverse(),
    [snapshots]
  );

  const handleRestore = () => {
    if (!doc || !selectedSnapshot) return;

    setIsRestoring(true);

    try {
      // Perform the restore
      restoreCartSnapshot(doc, selectedSnapshot);

      // Clear selection and close dialog
      setSelectedSnapshot(null);
      setIsOpen(false);

      toast("Snapshot restored successfully");
    } catch (error) {
      toast(`Failed to restore snapshot. ${error as string}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="History">
          <HistoryIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[85vh] max-w-6xl flex-col sm:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            Compare past versions with the live cart and restore if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden pt-4">
          {/* Sidebar List */}
          <div className="flex w-64 flex-col gap-2 border-r pr-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-500">
              Snapshots
            </h3>
            <div className="flex-1 overflow-y-auto pr-2">
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

                  // Lookup the source snapshot if this was a restore
                  const sourceSnapshot = snap.restoredFromId
                    ? snapshotMap.get(snap.restoredFromId)
                    : null;

                  return (
                    <button
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-gray-100",
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
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
                          "line-clamp-2 text-sm font-semibold",
                          isSelected ? "text-blue-900" : "text-gray-800"
                        )}
                      >
                        {deltaSummary || "Updates"}
                      </span>

                      {/* Row 3: Authors */}
                      {authors && authors.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                          <UsersIcon className="h-3 w-3 text-gray-400" />
                          <span className="max-w-[180px] truncate">
                            {authors.join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Row 4: Restore Indicator (New) */}
                      {snap.restoredFromId && (
                        <div className="mt-2 flex w-full items-start gap-1.5 rounded border border-amber-100/50 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                          <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="leading-tight">
                            Restored from{" "}
                            {sourceSnapshot
                              ? formatDistanceToNow(
                                  new Date(sourceSnapshot.timestamp),
                                  { addSuffix: true }
                                )
                              : "deleted snapshot"}
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
                {/* Snapshot State (Historical) */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-blue-200 bg-blue-50/30">
                  <div className="flex items-center justify-between border-b bg-blue-100/50 p-2 px-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                      <span>Snapshot Preview</span>
                    </div>

                    {selectedSnapshot.restoredFromId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-2"
                        onClick={() => {
                          const restoredSnapshot = snapshotMap.get(
                            selectedSnapshot.restoredFromId!
                          );
                          if (restoredSnapshot) {
                            setSelectedSnapshot(restoredSnapshot);
                          } else {
                            toast("Original snapshot not found");
                          }
                        }}
                      >
                        <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Go to Restored Version
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="h-7 gap-2 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {isRestoring ? (
                          "Restoring..."
                        ) : (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore this version
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="relative flex-1 overflow-auto p-2">
                    <SnapshotCartView
                      snapshot={selectedSnapshot}
                      parentContext={context}
                    />
                  </div>
                </div>

                {/* Visual Separator */}
                <div className="flex flex-col items-center justify-center gap-2 text-gray-300">
                  <span className="rotate-90 text-xs font-medium tracking-wider text-gray-400 uppercase sm:rotate-0">
                    Replaces
                  </span>
                  <ArrowRightIcon className="h-6 w-6" />
                </div>

                {/* Live State (Reference) */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white">
                  <div className="border-b bg-gray-100 p-2 text-center text-sm font-medium text-gray-600">
                    Current Live State
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <Cart
                      displayHeader={false}
                      displayFooter={false}
                      displayCheckoutButton={false}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border-2 border-dashed bg-gray-50">
                <div className="text-center">
                  <HistoryIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>
                    Select a snapshot from the sidebar to compare and restore.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
