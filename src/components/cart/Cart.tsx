import {
  type CartFolder,
  type CartItem,
  useCart
} from "@/contexts/useCartContext.ts";
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

const SortableCartItem = ({ item }: { item: CartItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CartItemComponent item={item} />
    </div>
  );
};

const CartFolderComponent = ({ folder }: { folder: CartFolder }) => {
  const { setNodeRef } = useDroppable({ id: folder.id });

  return (
    <div ref={setNodeRef} className="rounded-lg bg-gray-100 p-4">
      <h3 className="flex items-center font-semibold">
        <FolderIcon className="mr-2 h-5 w-5" /> {folder.name}
      </h3>
      <div className="mt-2 flex flex-col">
        {folder.items.map((item) => (
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

export function Cart() {
  const { cart, dispatch } = useCart();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (
      over === null ||
      typeof over.id === "number" ||
      typeof active.id === "number"
    ) {
      return;
    }

    if (active.id !== over.id) {
      const overIsFolder = cart.items.find(
        (item) => item.id === over.id && "items" in item
      );

      if (overIsFolder) {
        dispatch({
          type: "MOVE_ITEM_TO_FOLDER",
          payload: { itemId: active.id, folderId: over.id }
        });
      } else {
        dispatch({
          type: "MOVE_ITEM",
          payload: { activeId: active.id, overId: over.id }
        });
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex h-full w-80 flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
        </div>
        <div className="flex max-h-[70dvh] flex-1 flex-col gap-y-4 overflow-y-auto px-1 py-4">
          {cart.items.length === 0 ? (
            <p className="text-muted-foreground">Your cart is empty.</p>
          ) : (
            <SortableContext
              items={cart.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {cart.items.map((item) => {
                if ("items" in item) {
                  return <CartFolderComponent key={item.id} folder={item} />;
                } else {
                  return <SortableCartItem key={item.id} item={item} />;
                }
              })}
            </SortableContext>
          )}
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              onClick={() =>
                dispatch({
                  type: "CREATE_FOLDER",
                  payload: { name: "New Folder" }
                })
              }
            >
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
