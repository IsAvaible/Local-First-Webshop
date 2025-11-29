import { type EnrichedCartItem, useCart } from "@/contexts/useCartContext.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVerticalIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { cn } from "@/lib/utils.ts";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export function CartItemComponent({
  item,
  className,
  dragHandleProps
}: {
  item: EnrichedCartItem;
  dragHandleProps?: SyntheticListenerMap;
} & React.ComponentProps<"div">) {
  const {
    tags,
    updateItemNotes,
    removeItem,
    updateItemQuantity,
    addTagToItem,
    removeTagFromItem
  } = useCart();

  const thisItemsTags = tags?.filter((t) => item.tag_ids.includes(t.id)) ?? [];

  const handleAddTag = (tagId: string) => {
    addTagToItem(item.id, tagId);
  };

  const handleRemoveTag = (tagId: string) => {
    removeTagFromItem(item.id, tagId);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (newQuantity > 0) {
      updateItemQuantity(item.id, newQuantity);
    }
  };

  // --- Product name and image (joined in provider) ---
  const product = item.product;
  const asset = item.asset;

  const imageSrc =
    asset?.url ?? `https://placehold.co/200x200.png?text=${item.product_id}`;
  const productName = product?.name ?? `Product ${item.product_id}`;

  return (
    <div
      className={cn(
        "flex min-w-[19.5rem] items-stretch gap-4 rounded-lg border-b bg-white p-4 shadow-sm",
        className
      )}
    >
      <img
        src={imageSrc}
        alt={productName}
        className="my-auto aspect-3/4 w-20 rounded-md object-cover"
      />
      <div className="flex flex-1 justify-between">
        <div className="flex flex-1 flex-col justify-between gap-y-2">
          <h3 className="flex items-center justify-between text-sm font-semibold">
            <span className="inline-block max-w-20 truncate">
              {productName}
            </span>
            <span>{`${item.price ?? item.price_snapshot ?? "N/A"}€`}</span>
          </h3>

          <Textarea
            placeholder="Add a note..."
            className="min-h-8 resize-y"
            onChange={(e) => updateItemNotes(item.id, e.target.value)}
          />

          {/* --- Display current tags with remove button --- */}
          <div className="flex flex-wrap gap-1">
            {thisItemsTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center"
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Input
              type="number"
              value={item.quantity}
              className="h-8 w-12 px-2"
              min={1}
              onChange={handleQuantityChange}
              aria-label="Quantity"
            />
            {/* --- Updated Tag Select --- */}
            <Select onValueChange={handleAddTag}>
              <SelectTrigger className="h-8!">
                <SelectValue placeholder="+ Tag" />
              </SelectTrigger>
              <SelectContent>
                {tags?.map((tag) => (
                  <SelectItem
                    key={tag.id}
                    value={tag.id}
                    disabled={item.tag_ids.includes(tag.id)}
                  >
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-between self-stretch">
        {/* --- Drag Handle --- */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          {...dragHandleProps}
        >
          <GripVerticalIcon className="text-muted-foreground w-4 cursor-grab" />
        </Button>

        {/* --- Remove Item Button --- */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => removeItem(item.id)}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>

        {/* --- Move out of Folder Button (conditional) --- */}
        {/*{item.folder_id && (*/}
        {/*  <Button*/}
        {/*    variant="outline"*/}
        {/*    size="icon"*/}
        {/*    className="h-8 w-8"*/}
        {/*    onClick={() => updateItemFolder(item.id, { folder_id: null })}*/}
        {/*  >*/}
        {/*    <CornerLeftUpIcon className="h-4 w-4" />*/}
        {/*  </Button>*/}
        {/*)}*/}
      </div>
    </div>
  );
}
