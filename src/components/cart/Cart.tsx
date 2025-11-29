import * as React from "react";
import {
  DndContext,
  useDroppable,
  type DragEndEvent,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  pointerWithin
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { FolderIcon, PlusIcon, TrashIcon } from "lucide-react";

import {
  type EnrichedCartNode,
  type EnrichedCartFolder,
  useCart
} from "@/contexts/useCartContext.ts";
import { TagManager } from "./TagManager";
import { CartItemComponent } from "./CartItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";

// ------------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------------

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

  // Found in the current list
  if (index !== -1) {
    return { siblings: nodes, index, parentId };
  }

  // Search recursively in children
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

const CartFolderComponent = ({ folder }: { folder: EnrichedCartFolder }) => {
  const { removeItem } = useCart();
  const droppableId = `folder-droppable-${folder.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: "folder", acceptDrop: true, folderId: folder.id }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-gray-50 p-4 shadow-sm transition-colors",
        isOver ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : ""
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center font-semibold text-gray-700">
          <FolderIcon className="mr-2 h-5 w-5" /> {folder.name}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeItem(folder.id)}
        >
          <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-500" />
        </Button>
      </div>

      <div className="flex min-h-[3rem] flex-col gap-2">
        <SortableContext
          items={folder.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {folder.children.length === 0 && !isOver && (
            <p className="rounded border-2 border-dashed py-2 text-center text-xs text-gray-400">
              Drop items here
            </p>
          )}

          {folder.children.map((child) => (
            <SortableNode
              key={child.id}
              node={child}
              className={
                child.type === "item" ? "origin-top-left scale-90" : ""
              }
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const SortableNode = ({
  node,
  className
}: { node: EnrichedCartNode } & React.ComponentProps<"div">) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: node.id,
    data: { type: node.type, node }
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

  if (node.type === "folder") {
    return (
      <div {...commonProps}>
        <CartFolderComponent folder={node} />
      </div>
    );
  }

  return (
    <div {...commonProps}>
      <CartItemComponent item={node} />
    </div>
  );
};

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------

export function Cart({ className }: React.ComponentProps<"div">) {
  const { rootNodes, isLoading, createFolder, moveNode } = useCart();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !rootNodes) return;

    const activeNodeId = active.id as string;
    const overId = over.id as string;

    // CASE 1: Drop into Root Zone
    if (overId === "root-droppable") {
      moveNode(activeNodeId, null, rootNodes.length);
      return;
    }

    // CASE 2: Drop into Folder Zone
    if (overId.startsWith("folder-droppable-")) {
      const targetFolderId = overId.replace("folder-droppable-", "");
      const folderContext = findNodeContext(rootNodes, targetFolderId);

      if (folderContext) {
        const targetFolder = folderContext.siblings[folderContext.index];
        if (targetFolder.type === "folder") {
          const newIndex = targetFolder.children?.length || 0;
          moveNode(activeNodeId, targetFolderId, newIndex);
        }
      }
      return;
    }

    // CASE 3: Reordering / Sorting
    if (activeNodeId !== overId) {
      const overContext = findNodeContext(rootNodes, overId);

      if (overContext) {
        const { parentId, index: overIndex } = overContext;
        const activeContext = findNodeContext(rootNodes, activeNodeId);

        let newIndex = overIndex;

        // Adjust index if moving strictly downwards within the same list
        if (
          activeContext?.parentId === parentId &&
          activeContext.index < overIndex
        ) {
          // Standard DND adjustment for same-list sorting
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
      <div className={cn("flex h-full w-80 flex-col", className)}>
        <p className="p-4 text-center">Loading cart...</p>
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
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
        </div>

        {/* Scrollable Cart Area */}
        <RootDroppable className="flex max-h-[70dvh] flex-1 flex-col gap-y-4 overflow-x-clip overflow-y-auto px-1 py-4">
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
                <SortableNode key={node.id} node={node} />
              ))}
            </SortableContext>
          )}
        </RootDroppable>

        {/* Footer Actions */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              onClick={() => createFolder("New Folder")}
              variant="outline"
              className="flex-1"
            >
              <PlusIcon className="mr-2 h-4 w-4" /> Add Folder
            </Button>
            <TagManager />
          </div>
          <Button className="mt-4 w-full">Checkout</Button>
        </div>
      </div>

      {/* Drag Preview */}
      <DragOverlay>
        {activeNode ? (
          <div className="cursor-grabbing opacity-90">
            {activeNode.type === "folder" ? (
              <CartFolderComponent folder={activeNode} />
            ) : (
              <CartItemComponent item={activeNode} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
