import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  MeasuringStrategy,
  pointerWithin,
  type CollisionDetection
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Loader2,
  PlusIcon,
  Wifi,
  WifiOff,
  Settings,
  Trash2,
  AlertTriangle
} from "lucide-react";

import { type EnrichedCartNode, useCart } from "@/contexts/useCartContext.ts";
import { TagManager } from "./TagManager";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartShareDialog } from "@/components/cart/CartShareDialog.tsx";
import { CartFolderComponent } from "@/components/cart/CartFolderComponent.tsx";
import { Link } from "@tanstack/react-router";
import { CartHistoryDialog } from "@/components/cart/CartHistory.tsx";
import { CartDisplayContext } from "@/components/cart/CartDisplayContext.ts";
import { toast } from "sonner";

// ------------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------------

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// ------------------------------------------------------------------
// SUB-COMPONENTS
// ------------------------------------------------------------------

export const UserAvatar = ({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) => (
  <Avatar className={cn("h-8 w-8 border-2 border-white", className)}>
    <AvatarImage src={src ?? undefined} alt={name} />
    <AvatarFallback>{getInitials(name)}</AvatarFallback>
  </Avatar>
);

const RootDroppable = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { setNodeRef } = useDroppable({
    id: "root-droppable",
    data: { type: "root" }
  });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

export const SortableNode = React.memo(
  ({
    node,
    className,
    disabled
  }: {
    node: EnrichedCartNode;
    disabled?: boolean;
  } & React.ComponentProps<"div">) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: node.id,
      data: { type: node.type, node },
      disabled: disabled
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1
    };

    const commonProps = {
      ref: setNodeRef,
      style,
      ...attributes,
      ...listeners,
      className: cn("touch-none", className)
    };

    if (node.type === "folder")
      return (
        <div {...commonProps}>
          <CartFolderComponent folder={node} disabled={disabled} />
        </div>
      );
    return (
      <div {...commonProps}>
        <CartItem item={node} disabled={disabled} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.node.id === nextProps.node.id &&
      prevProps.node === nextProps.node &&
      prevProps.disabled === nextProps.disabled
    );
  }
);

// ------------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------------

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5"
      }
    }
  })
};

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------

// Type for our optimized lookup map
type NodeMetadata = {
  node: EnrichedCartNode;
  parentId: string | null;
  index: number;
  depth: number;
};

interface CartProps {
  displayHeader?: boolean;
  displayFooter?: boolean;
  displayCheckoutButton?: boolean;
  displayItemSelect?: boolean;
}

export function Cart({
  displayHeader,
  displayFooter,
  displayCheckoutButton,
  displayItemSelect,
  className
}: CartProps & React.ComponentProps<"div">) {
  const {
    rootNodes,
    isLoading,
    createFolder,
    moveNode,
    carts,
    activeCartId,
    setActiveCartId,
    activeCart,
    createCart,
    updateCartName,
    deleteCart,
    canManageItems,
    cartRole,
    collaborators,
    connectivityStatus
  } = useCart();

  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Create Cart State
  const [newCartName, setNewCartName] = React.useState("");
  const [isCreateCartOpen, setIsCreateCartOpen] = React.useState(false);

  // Edit/Settings Cart State
  const [editingCartName, setEditingCartName] = React.useState("");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Share State
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Flatten the tree for O(1) lookups during drag
  const nodesMap = React.useMemo(() => {
    const map = new Map<string, NodeMetadata>();
    const traverse = (
      nodes: EnrichedCartNode[],
      parentId: string | null = null,
      depth = 0
    ) => {
      nodes.forEach((node, index) => {
        map.set(node.id, { node, parentId, index, depth });
        if (node.type === "folder" && node.children) {
          traverse(node.children, node.id, depth + 1);
        }
      });
    };
    if (rootNodes) traverse(rootNodes);
    return map;
  }, [rootNodes]);

  const activeNode = activeId ? nodesMap.get(activeId)?.node : null;
  const rootIds = React.useMemo(
    () => rootNodes?.map((node) => node.id) ?? [],
    [rootNodes]
  );

  const cartAdmins = React.useMemo(() => {
    return collaborators.filter((c) => c.role === "admin");
  }, [collaborators]);

  // Can delete cart if user is the only admin
  const isAdmin = cartRole === "admin";
  const canDeleteCart = isAdmin && cartAdmins.length === 1;

  // Custom Collision to prioritize containers correctly
  const customCollisionDetection: CollisionDetection = React.useCallback(
    (args) => {
      // First, check if pointer is over a specific sorting container or root
      const pointerCollisions = pointerWithin(args);
      const rootCollision = pointerCollisions.find(
        (c) => c.id === "root-droppable"
      );

      // If we are strictly over the root background (and no other items), return root
      if (pointerCollisions.length === 1 && rootCollision) {
        return pointerCollisions;
      }

      // Otherwise use closestCorners for item reordering
      return closestCorners(args);
    },
    []
  );

  // Helper: Check if target is a descendant of source to prevent circular drops
  const isAncestor = React.useCallback(
    (activeId: string, overId: string) => {
      let currentId: string | null = overId;
      while (currentId) {
        if (currentId === activeId) return true;
        currentId = nodesMap.get(currentId)?.parentId ?? null;
      }
      return false;
    },
    [nodesMap]
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canManageItems) return;
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    if (!overId || activeId === overId) return;

    const activeMeta = nodesMap.get(activeId);
    const overMeta = nodesMap.get(overId);

    if (!activeMeta || !overMeta) return;

    // Prevent dragging parent into child
    if (isAncestor(activeId, overId)) return;

    const isOverDifferentParent = activeMeta.parentId !== overMeta.parentId;

    // SCENARIO 1: Dropping INTO a folder
    // If we are over a folder, and we are not already inside it, and not merely sorting past it
    if (overMeta.node.type === "folder" && activeMeta.parentId !== overId) {
      const folderChildren = overMeta.node.children || [];
      // Move into folder (append to end)
      moveNode(activeId, overId, folderChildren.length);
      return;
    }

    // SCENARIO 2: Moving between lists (Parent change)
    // We only update state in DragOver when changing containers.
    // In-list sorting (index change) is handled by DragEnd to prevent jitter.
    if (isOverDifferentParent) {
      moveNode(activeId, overMeta.parentId, overMeta.index);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canManageItems) return;
    setActiveId(null);

    const { active, over } = event;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    if (!overId) return;

    // 1. Explicit drop on Root (Empty Space)
    if (overId === "root-droppable") {
      const activeMeta = nodesMap.get(activeId);
      if (activeMeta?.parentId !== null) {
        moveNode(activeId, null, rootNodes?.length ?? 0);
      }
      return;
    }

    // 2. Explicit drop on Folder Zone
    if (overId.startsWith("folder-droppable-")) {
      const targetFolderId = overId.replace("folder-droppable-", "");
      if (activeId === targetFolderId) return;
      if (isAncestor(activeId, targetFolderId)) return;

      const folderMeta = nodesMap.get(targetFolderId);
      if (folderMeta?.node.type === "folder") {
        moveNode(
          activeId,
          targetFolderId,
          folderMeta.node.children?.length || 0
        );
      }
      return;
    }

    // 3. Reordering / Sorting (Index Change)
    if (activeId !== overId) {
      const activeMeta = nodesMap.get(activeId);
      const overMeta = nodesMap.get(overId);

      if (
        activeMeta &&
        overMeta &&
        activeMeta.parentId === overMeta.parentId &&
        activeMeta.index !== overMeta.index
      ) {
        moveNode(activeId, activeMeta.parentId, overMeta.index);
      }
    }
  };

  // Handler for renaming cart
  const handleRenameCart = async () => {
    if (editingCartName.trim() && activeCartId) {
      setIsSettingsOpen(false);
      await updateCartName(activeCartId, editingCartName);
    }
  };

  const handleDeleteCart = async () => {
    if (activeCartId && canDeleteCart) {
      setIsSettingsOpen(false);
      try {
        await deleteCart(activeCartId);
      } catch (error) {
        toast("Failed to delete cart :(");
        console.error(error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex h-full flex-col p-4", className)}>
        Loading...
      </div>
    );
  }

  return (
    <CartDisplayContext value={{ displayItemSelect }}>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.WhileDragging
          }
        }}
      >
        <div className={cn("flex h-full flex-col", className)}>
          {/* HEADER SECTION */}
          {displayHeader !== false && (
            <div className="flex flex-col gap-3 border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">Cart</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full p-1 transition-colors",
                            connectivityStatus != "disconnected"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}
                        >
                          {connectivityStatus === "connected" && (
                            <Wifi className="h-4 w-4" />
                          )}
                          {connectivityStatus === "connecting" && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {connectivityStatus === "disconnected" && (
                            <WifiOff className="h-4 w-4" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {connectivityStatus === "connected"
                            ? "Connected to sync server"
                            : connectivityStatus === "connecting"
                              ? "Connecting..."
                              : "Offline. Changes will sync when reconnected."}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-3">
                  <CartHistoryDialog />

                  {collaborators.length > 1 && (
                    <div className="flex -space-x-2 overflow-hidden">
                      {collaborators.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="relative inline-block rounded-full border-2 border-white"
                        >
                          <UserAvatar name={user.name} src={user.avatarUrl} />
                          {user.isOnline && (
                            <span className="absolute right-0 bottom-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                          )}
                        </div>
                      ))}
                      {collaborators.length > 3 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-medium text-gray-600">
                          +{collaborators.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  <CartShareDialog
                    open={isShareOpen}
                    onOpenChange={setIsShareOpen}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select
                  value={activeCartId ?? undefined}
                  onValueChange={setActiveCartId}
                >
                  <SelectTrigger className="flex-1 bg-gray-50">
                    <SelectValue placeholder="Select Cart" />
                  </SelectTrigger>
                  <SelectContent>
                    {carts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* --- CART SETTINGS (RENAME & DELETE) --- */}
                <Dialog
                  open={isSettingsOpen}
                  onOpenChange={(open) => {
                    setIsSettingsOpen(open);
                    if (open && activeCart) {
                      setEditingCartName(activeCart.name);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-gray-50"
                      disabled={!activeCartId || !canManageItems}
                      title="Cart Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cart Settings</DialogTitle>
                      <DialogDescription>
                        Rename or delete your cart
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-6 py-4">
                      {/* Section 1: General Info */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="edit-name"
                          className="text-sm font-semibold"
                        >
                          Cart Name
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="edit-name"
                            value={editingCartName}
                            onChange={(e) => setEditingCartName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleRenameCart();
                                setIsSettingsOpen(false);
                              }
                            }}
                          />
                          <Button onClick={handleRenameCart} variant="outline">
                            Save
                          </Button>
                        </div>
                      </div>

                      {isAdmin && (
                        <>
                          <div className="bg-border h-px w-full" />

                          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                            <div className="mb-4 flex items-center gap-2 text-red-700 dark:text-red-400">
                              <AlertTriangle className="h-5 w-5" />
                              <h4 className="font-semibold">Danger Zone</h4>
                            </div>

                            <div className="flex flex-col gap-3">
                              {!canDeleteCart ? (
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                  You cannot delete this cart because there are
                                  other administrators. You must be the only
                                  admin to perform this action.
                                </p>
                              ) : (
                                <p className="text-sm text-red-700 dark:text-red-400">
                                  Deleting this cart will permanently remove it
                                  for all collaborators. This action cannot be
                                  undone.
                                </p>
                              )}

                              <Button
                                variant="destructive"
                                onClick={handleDeleteCart}
                                disabled={!canDeleteCart}
                                className="mt-2 w-full sm:w-auto"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Cart
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* --- CREATE NEW CART BUTTON --- */}
                <Dialog
                  open={isCreateCartOpen}
                  onOpenChange={setIsCreateCartOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-gray-50"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Cart</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="name">Cart Name</Label>
                      <Input
                        id="name"
                        value={newCartName}
                        onChange={(e) => setNewCartName(e.target.value)}
                        className="mt-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (newCartName.trim()) {
                              createCart(newCartName);
                              setNewCartName("");
                              setIsCreateCartOpen(false);
                            }
                          }
                        }}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (newCartName.trim()) {
                            createCart(newCartName);
                            setNewCartName("");
                            setIsCreateCartOpen(false);
                          }
                        }}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {/* CART BODY */}
          <RootDroppable className="flex max-h-[65dvh] flex-1 flex-col gap-y-4 overflow-x-clip overflow-y-auto px-0.5 py-4">
            {!rootNodes || rootNodes.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center">
                Your cart is empty.
              </p>
            ) : (
              <SortableContext
                items={rootIds}
                strategy={verticalListSortingStrategy}
              >
                {rootNodes.map((node) => (
                  <SortableNode
                    key={node.id}
                    node={node}
                    disabled={!canManageItems}
                  />
                ))}
              </SortableContext>
            )}
          </RootDroppable>

          {/* FOOTER */}
          {displayFooter !== false && (
            <div className="border-t bg-transparent p-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => createFolder("New Folder")}
                  variant="outline"
                  className="flex-1"
                  disabled={!canManageItems}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Add Folder
                </Button>
                <TagManager disabled={!canManageItems} />
              </div>

              {displayCheckoutButton !== false && (
                <Link
                  disabled={!canManageItems || !rootNodes?.length}
                  to={"/checkout"}
                >
                  <Button
                    className="mt-4 w-full"
                    disabled={!canManageItems || !rootNodes?.length}
                  >
                    Checkout
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeNode ? (
            <div className="cursor-grabbing opacity-90">
              {activeNode.type === "folder" ? (
                <CartFolderComponent
                  folder={activeNode}
                  disabled={!canManageItems}
                />
              ) : (
                <CartItem item={activeNode} />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </CartDisplayContext>
  );
}
