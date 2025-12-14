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
  MeasuringStrategy
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon } from "lucide-react";

import { type EnrichedCartNode, useCart } from "@/contexts/useCartContext.ts";
import { TagManager } from "./TagManager";
import { CartItemComponent } from "./CartItem";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartShareDialog } from "@/components/cart/CartShareDialog.tsx";
import { CartFolderComponent } from "@/components/cart/CartFolderComponent.tsx";
import { Link } from "@tanstack/react-router";
import { CartHistoryDialog } from "@/components/cart/CartHistory.tsx";

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

const findActiveNode = (
  nodes: EnrichedCartNode[] | undefined,
  id: string
): EnrichedCartNode | null => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "folder") {
      const found = findActiveNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to check if a node contains another node (prevent circular folder drops)
const doesNodeContain = (
  nodes: EnrichedCartNode[],
  parentId: string,
  childId: string
): boolean => {
  const parent = findActiveNode(nodes, parentId);
  if (parent?.type !== "folder" || !parent.children) return false;
  if (parent?.type !== "folder" || !parent.children) return false;

  const checkChildren = (children: EnrichedCartNode[]): boolean => {
    for (const child of children) {
      if (child.id === childId) return true;
      if (child.type === "folder" && child.children) {
        if (checkChildren(child.children)) return true;
      }
    }
    return false;
  };
  return checkChildren(parent.children);
};

const findNodeContext = (
  nodes: EnrichedCartNode[],
  targetId: string,
  parentId: string | null = null
): {
  siblings: EnrichedCartNode[];
  index: number;
  parentId: string | null;
} | null => {
  const index = nodes.findIndex((n) => n.id === targetId);
  if (index !== -1) return { siblings: nodes, index, parentId };

  for (const node of nodes) {
    if (node.type === "folder" && node.children) {
      const result = findNodeContext(node.children, targetId, node.id);
      if (result) return result;
    }
  }
  return null;
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
        <CartItemComponent item={node} disabled={disabled} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function (optional but recommended for objects)
    // Only re-render if the node ID, type, or children count changes
    // or if the "disabled" state changes.
    return (
      prevProps.node.id === nextProps.node.id &&
      prevProps.node === nextProps.node && // Reference check usually sufficient if data is immutable
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

interface CartProps {
  displayHeader?: boolean;
  displayFooter?: boolean;
  displayCheckoutButton?: boolean;
}
export function Cart({
  displayHeader,
  displayFooter,
  displayCheckoutButton,
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
    createCart,
    canManageItems,
    collaborators
  } = useCart();

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [newCartName, setNewCartName] = React.useState("");
  const [isCreateCartOpen, setIsCreateCartOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canManageItems) return;
    setActiveId(String(event.active.id));
  };

  /**
   * Handles moving items BETWEEN containers (e.g. Root -> Folder)
   * This updates the state *during* the drag to allow visual nesting.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;
    const activeId = active.id;

    if (!overId || activeId === overId || !rootNodes) return;

    const activeContext = findNodeContext(rootNodes, String(activeId));
    const overContext = findNodeContext(rootNodes, String(overId));

    if (!activeContext || !overContext) return;

    const activeParentId = activeContext.parentId;
    const overParentId = overContext.parentId;

    const overNode = findActiveNode(rootNodes, String(overId));

    // SCENARIO 1: Dropping OVER a Folder (Drilling down)
    // We are hovering over a Folder Node, not an item inside it yet.
    if (overNode?.type === "folder" && activeParentId !== overNode.id) {
      // Prevent circular dependency
      if (doesNodeContain(rootNodes, String(activeId), String(overId))) return;

      // Move item into the folder (at the end)
      // This allows the user to hover a folder to "open" it and drop inside
      moveNode(
        String(activeId),
        String(overId),
        overNode.children?.length || 0
      );
      return;
    }

    // SCENARIO 2: Moving between lists or reordering in same list
    if (activeParentId !== overParentId) {
      moveNode(String(activeId), overParentId, overContext.index);
      // SCENARIO 3: Reordering within the same list
    } else if (activeContext.index !== overContext.index) {
      moveNode(String(activeId), activeParentId, overContext.index);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canManageItems) return;

    const { active, over } = event;
    setActiveId(null);

    if (!over || !rootNodes) return;

    const activeNodeId = String(active.id);
    const overId = String(over.id);

    // 1. Explicit drop on Root (White space)
    if (overId === "root-droppable") {
      const activeContext = findNodeContext(rootNodes, activeNodeId);
      // Only move if it wasn't already in the root
      if (activeContext?.parentId !== null) {
        moveNode(activeNodeId, null, rootNodes.length);
      }
      return;
    }

    // 2. Handle dropping explicitly onto a Folder Droppable Zone
    if (overId.startsWith("folder-droppable-")) {
      const targetFolderId = overId.replace("folder-droppable-", "");
      // Safety: Don't drag folder into itself
      if (targetFolderId === activeNodeId) return;

      const folderContext = findNodeContext(rootNodes, targetFolderId);
      if (folderContext) {
        const targetFolder = folderContext.siblings[folderContext.index];
        if (targetFolder.type !== "folder") return;
        // Don't drag folder into its own child
        if (doesNodeContain(rootNodes, activeNodeId, targetFolderId)) return;

        moveNode(
          activeNodeId,
          targetFolderId,
          targetFolder.children?.length || 0
        );
      }
      return;
    }

    // 3. Handle Sorting (Reordering within the same container)
    if (activeNodeId !== overId) {
      const activeContext = findNodeContext(rootNodes, activeNodeId);
      const overContext = findNodeContext(rootNodes, overId);

      if (
        activeContext &&
        overContext &&
        activeContext.parentId === overContext.parentId
      ) {
        // Only trigger move if indices are different
        if (activeContext.index !== overContext.index) {
          moveNode(activeNodeId, activeContext.parentId, overContext.index);
        }
      }
    }
  };

  const activeNode = activeId ? findActiveNode(rootNodes, activeId) : null;
  const rootIds = rootNodes?.map((node) => node.id) ?? [];

  if (isLoading) {
    return (
      <div className={cn("flex h-full flex-col p-4", className)}>
        Loading...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
              <h2 className="text-lg font-semibold tracking-tight">Cart</h2>

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
              <Dialog
                open={isCreateCartOpen}
                onOpenChange={setIsCreateCartOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-gray-50">
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
              <Link disabled={!canManageItems} to={"/checkout"}>
                <Button className="mt-4 w-full" disabled={!canManageItems}>
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
              <CartItemComponent item={activeNode} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
