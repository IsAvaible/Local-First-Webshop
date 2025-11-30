import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
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

export const SortableNode = ({
  node,
  className,
  disabled
}: {
  node: EnrichedCartNode;
  disabled?: boolean;
} & React.ComponentProps<"div">) => {
  // Disable dragging if disabled prop is true
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
};

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------

export function Cart({ className }: React.ComponentProps<"div">) {
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // Extra safety check
    if (!canManageItems) return;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Extra safety check
    if (!canManageItems) return;

    const { active, over } = event;
    setActiveId(null);
    if (!over || !rootNodes) return;
    const activeNodeId = active.id as string;
    const overId = over.id as string;

    if (overId === "root-droppable") {
      moveNode(activeNodeId, null, rootNodes.length);
      return;
    }

    if (overId.startsWith("folder-droppable-")) {
      const targetFolderId = overId.replace("folder-droppable-", "");
      const folderContext = findNodeContext(rootNodes, targetFolderId);
      if (folderContext) {
        const targetFolder = folderContext.siblings[folderContext.index];
        if (targetFolder.type === "folder") {
          moveNode(
            activeNodeId,
            targetFolderId,
            targetFolder.children?.length || 0
          );
        }
      }
      return;
    }

    if (activeNodeId !== overId) {
      const overContext = findNodeContext(rootNodes, overId);
      if (overContext) {
        const { parentId, index: overIndex } = overContext;
        const activeContext = findNodeContext(rootNodes, activeNodeId);
        let newIndex = overIndex;
        if (
          activeContext?.parentId === parentId &&
          activeContext.index < overIndex
        ) {
          newIndex = overIndex;
        }
        moveNode(activeNodeId, parentId, newIndex);
      }
    }
  };

  const activeNode = activeId ? findActiveNode(rootNodes, activeId) : null;
  const rootIds = rootNodes?.map((node) => node.id) ?? [];

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-80 flex-col p-4", className)}>
        Loading...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className={cn("flex h-full w-80 flex-col", className)}>
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-3 border-b p-4">
          {/* Top Row: Title, Avatars, Share */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Cart</h2>

            <div className="flex items-center gap-3">
              {/* Face Pile */}
              <div className="flex -space-x-2 overflow-hidden">
                {collaborators.slice(0, 3).map((user) => (
                  <UserAvatar
                    key={user.id}
                    name={user.name}
                    src={user.avatarUrl}
                  />
                ))}
                {collaborators.length > 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-medium text-gray-600">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>

              {/* Share Dialog */}
              <CartShareDialog
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
              />
            </div>
          </div>

          {/* Cart Selection Row */}
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
            <Dialog open={isCreateCartOpen} onOpenChange={setIsCreateCartOpen}>
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

        {/* CART BODY */}
        <RootDroppable className="flex max-h-[65dvh] flex-1 flex-col gap-y-4 overflow-x-clip overflow-y-auto px-1 py-4">
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
        <div className="border-t bg-gray-50/50 p-4">
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
          <Button className="mt-4 w-full" disabled={!canManageItems}>
            Checkout
          </Button>
        </div>
      </div>

      <DragOverlay>
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
