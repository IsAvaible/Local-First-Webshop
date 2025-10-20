import { type CartItem, useCart } from "@/contexts/useCartContext.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVerticalIcon, Trash2Icon, CornerLeftUpIcon } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea.tsx";
import * as React from "react";
import { cn } from "@/lib/utils.ts";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export function CartItemComponent({
  item,
  className,
  dragHandleProps
}: {
  item: CartItem;
  dragHandleProps?: SyntheticListenerMap;
} & React.ComponentProps<"div">) {
  const { cart, dispatch } = useCart();
  const [notes, setNotes] = useState(item.notes ?? "");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (notes !== item.notes) {
        dispatch({
          type: "UPDATE_ITEM_NOTES",
          payload: { itemId: item.id, notes }
        });
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [notes, item.id, item.notes, dispatch]);

  const handleAddTag = (tag: string) => {
    dispatch({ type: "ADD_TAG_TO_ITEM", payload: { itemId: item.id, tag } });
  };

  // @ts-expect-error Function is not used currently, remove this comment once in use
  const _handleRemoveTag = (tag: string) => {
    dispatch({
      type: "REMOVE_TAG_FROM_ITEM",
      payload: { itemId: item.id, tag }
    });
  };

  return (
    <div
      className={cn(
        "flex min-w-[19.5rem] items-stretch gap-4 rounded-lg border-b bg-white p-4 shadow-sm",
        className
      )}
    >
      <img
        src={`https://placehold.co/200x200.png?text=${item.productId}`}
        alt={item.productId}
        className="my-auto aspect-3/4 w-20 rounded-md object-cover"
      />
      <div className="flex justify-between">
        <div className="flex flex-col justify-between">
          <h3 className="flex items-center justify-between text-sm font-semibold">
            <span className="inline-block max-w-16 truncate">
              Product {item.productId}
            </span>
            ⋅<span>199.999$</span>
          </h3>
          <Textarea
            placeholder="Add a note..."
            className="min-h-8 resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex items-center gap-2 text-xs">
            <Input
              type="number"
              value={item.quantity}
              className="h-8 w-10 px-2"
              readOnly
            />
            <Select onValueChange={handleAddTag}>
              <SelectTrigger className="h-8!">
                <SelectValue placeholder="+ Tag" />
              </SelectTrigger>
              <SelectContent>
                {cart.tags.map((tag) => (
                  <SelectItem
                    key={tag}
                    value={tag}
                    disabled={item.tags?.includes(tag)}
                  >
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-between self-stretch">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          {...dragHandleProps}
        >
          <GripVerticalIcon className="text-muted-foreground w-4 cursor-grab" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Trash2Icon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <CornerLeftUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
