import { type CartFolder } from "@/db/schema";
import { type EnrichedCartItem, useCart } from "@/contexts/useCartContext.ts";
import { TagManager } from "./TagManager";
import { Button } from "@/components/ui/button";
import { FolderIcon, PlusIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  useDroppable,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CartItemComponent } from "./CartItem";
import { cn } from "@/lib/utils.ts";
import * as React from "react";
import { restrictToParentElement } from "@dnd-kit/modifiers";

// --- Sortable Item ---
const SortableCartItem = ({ item }: { item: EnrichedCartItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CartItemComponent item={item} dragHandleProps={listeners} />
    </div>
  );
};

// --- Folder Component ---
const CartFolderComponent = ({ folder }: { folder: CartFolder }) => {
  const { setNodeRef } = useDroppable({ id: folder.id });
  // Get all items from the context to find this folder's children
  const { items } = useCart();

  // Find and sort items that belong to this folder
  const folderItems =
    items
      ?.filter((item) => item.folder_id === folder.id)
      .sort((a, b) => a.sort_order - b.sort_order) ?? [];

  return (
    <div ref={setNodeRef} className="rounded-lg bg-gray-100 p-4">
      <h3 className="flex items-center font-semibold">
        <FolderIcon className="mr-2 h-5 w-5" /> {folder.name}
      </h3>
      <div className="mt-2 flex flex-col">
        {/* Render this folder's items */}
        {folderItems.map((item) => (
          <CartItemComponent
            className="origin-left scale-90"
            key={item.id}
            item={item}
          />
        ))}
      </div>
    </div>
  );
};

// --- Main Cart Component ---
export function Cart({ className }: React.ComponentProps<"div">) {
  const { items, folders, isLoading, createFolder, updateItemFolderAndSort } =
    useCart();

  // --- Data Preparation ---
  // 1. Get items that are *not* in a folder
  const itemsWithoutFolder =
    items?.filter((item) => item.folder_id === null) ?? [];

  // 2. Create a combined list of top-level folders and loose items
  const combinedList = [...(folders ?? []), ...(itemsWithoutFolder || [])];

  // 3. Sort the combined list by their shared 'sort_order'
  combinedList.sort((a, b) => a.sort_order - b.sort_order);

  // --- Drag and Drop Handler (Updated) ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeItemId = active.id as number;

    // Check if the drop target ('over') is a folder
    const overIsFolder = folders?.some((f) => f.id === over.id);

    if (overIsFolder) {
      // --- Case 1: Dropped onto a folder ---
      const folderId = over.id as number;

      // Find new sort_order (append to end of folder)
      const itemsInFolder =
        items?.filter((i) => i.folder_id === folderId) ?? [];
      const newSortOrder =
        itemsInFolder.length > 0
          ? Math.max(...itemsInFolder.map((i) => i.sort_order)) + 1
          : 0;

      updateItemFolderAndSort(activeItemId, {
        folder_id: folderId,
        sort_order: newSortOrder
      });
    } else {
      // --- Case 2: Dropped onto another loose item (re-sorting) ---
      const overItemId = over.id as number;
      const overItem = itemsWithoutFolder.find((i) => i.id === overItemId);

      if (overItem) {
        // Set active item's sort_order to the 'over' item's sort_order
        // The context/backend logic is expected to handle re-shuffling.
        updateItemFolderAndSort(activeItemId, {
          folder_id: null, // Ensure it's a loose item
          sort_order: overItem.sort_order
        });
      }
    }
  };

  // --- Add Folder Handler ---
  const handleAddFolder = () => {
    // Calculate new sort_order (append to end of combined list)
    const newSortOrder =
      combinedList.length > 0
        ? Math.max(...combinedList.map((c) => c.sort_order)) + 1
        : 0;
    createFolder("New Folder", newSortOrder);
  };

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-80 flex-col", className)}>
        <p className="p-4 text-center">Loading cart...</p>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      <div className={cn("flex h-full w-80 flex-col", className)}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
        </div>
        <div className="flex max-h-[70dvh] flex-1 flex-col gap-y-4 overflow-y-auto px-1 py-4">
          {combinedList.length === 0 ? (
            <p className="text-muted-foreground">Your cart is empty.</p>
          ) : (
            // SortableContext now only contains the IDs of the *sortable* items
            <SortableContext
              items={itemsWithoutFolder.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Map over the combined/sorted list for rendering */}
              {combinedList.map((entry) => {
                // Check if the entry is an item by looking for a unique property
                if ("product_id" in entry) {
                  return <SortableCartItem key={entry.id} item={entry} />;
                } else {
                  // Otherwise, it's a folder
                  return <CartFolderComponent key={entry.id} folder={entry} />;
                }
              })}
            </SortableContext>
          )}
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button onClick={handleAddFolder}>
              <PlusIcon className="mr-2 h-4 w-4" /> Add Folder
            </Button>
            <TagManager />
          </div>
          <Button className="mt-4 w-full">Checkout</Button>
        </div>
      </div>
    </DndContext>
  );
}
