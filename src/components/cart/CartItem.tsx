import {
  type EnrichedCartItem,
  useCart,
  TAG_COLORS
} from "@/contexts/useCartContext.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVerticalIcon, Trash2Icon, XIcon, PlusIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea.tsx";
import { AssetImage } from "@/components/ui/assetImage.tsx";
import { Checkbox } from "@/components/ui/checkbox";
import * as React from "react";
import { cn } from "@/lib/utils.ts";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SWATCH_BG_STYLES,
  TAG_PILL_STYLES
} from "@/lib/constants/tag-styles.ts";
import { useCartDisplay } from "@/components/cart/CartDisplayContext.ts";
import { useYjsText } from "@/contexts/useCartContextUtils.ts";
import { TagManager } from "./TagManager";
import { OutOfStockOverlay } from "@/components/browse/OutOfStockOverlay.tsx";

export function CartItem({
  item,
  className,
  dragHandleProps,
  disabled
}: {
  item: EnrichedCartItem;
  dragHandleProps?: SyntheticListenerMap;
  disabled?: boolean;
} & React.ComponentProps<"div">) {
  const {
    tags,
    removeItem,
    updateItemQuantity,
    addTagToItem,
    removeTagFromItem,
    toggleItemSelection,
    getItemNotesYText
  } = useCart();
  const { displayItemSelect } = useCartDisplay();

  // --- YJS Notes Binding ---
  const yNotes = getItemNotesYText(item.id);
  const { value: notesValue, onChange: setNotesValue } = useYjsText(yNotes);

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

  // --- Product name and image ---
  const product = item.product;
  const asset = item.asset;
  const productName = product?.name ?? `Product ${item.product_id}`;
  const priceDisplay = `${item.price ?? item.price_snapshot ?? "N/A"}€`;

  return (
    <div className={"@container"}>
      <div
        className={cn(
          "flex min-w-max items-stretch gap-4 rounded-lg border-b bg-white p-4 shadow-sm",
          "origin-top-left @[16rem]:@max-[18rem]:scale-88",
          className
        )}
        role="group"
        aria-label={`Cart item: ${productName}`}
      >
        {displayItemSelect && (
          <Checkbox
            className="my-auto"
            checked={item.is_selected ?? true}
            onCheckedChange={() => toggleItemSelection(item.id)}
            disabled={disabled}
            aria-label={`Select ${productName} for checkout`}
          />
        )}

        <OutOfStockOverlay
          isOutOfStock={item.product?.stock_sum === 0}
          className={
            "my-auto aspect-3/4 w-20 rounded-md @max-[16rem]:hidden @sm:w-28"
          }
          overlayClassName="rounded-md"
        >
          <AssetImage
            asset={asset}
            alt={productName}
            containerClassName="aspect-3/4 rounded-md object-cover"
          />
        </OutOfStockOverlay>

        <div className="flex flex-1 justify-between gap-3">
          <div className="flex flex-1 flex-col justify-between gap-y-2">
            <h3 className="flex items-center justify-between text-sm font-semibold">
              <span
                className="inline-block max-w-28 truncate @[16rem]:max-w-20 @sm:max-w-none!"
                title={productName}
              >
                {productName}
              </span>
              <span aria-label={`Price: ${priceDisplay}`}>{priceDisplay}</span>
            </h3>

            <Textarea
              placeholder={disabled ? "No notes" : "Add a note..."}
              className="min-h-8 resize-y"
              value={notesValue}
              disabled={disabled}
              aria-label={`Notes for ${productName}`}
              onKeyDownCapture={(e) => {
                if (e.key === " " || e.key === "Enter") e.stopPropagation();
              }}
              onChange={(e) => setNotesValue(e.target.value)}
            />

            {/* --- Display current tags --- */}
            <div
              className="flex max-w-34 flex-wrap gap-1 @[18rem]:max-w-none"
              role="list"
              aria-label={`Tags for ${productName}`}
            >
              {thisItemsTags.map((tag) => {
                const color = tag.color ?? TAG_COLORS[0];

                return (
                  <span
                    key={tag.id}
                    role="listitem"
                    className={cn(
                      "flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors",
                      TAG_PILL_STYLES[color]
                    )}
                  >
                    {tag.name}
                    {!disabled && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="-mr-0.5 ml-1 rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
                        aria-label={`Remove tag ${tag.name} from ${productName}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Input
                type="number"
                value={item.quantity}
                className="h-8 w-20 px-2 @[16rem]:w-12"
                min={1}
                max={item.product?.stock_sum}
                disabled={disabled}
                onChange={handleQuantityChange}
                aria-label={`Quantity of ${productName}`}
              />
              {/* --- Tag Select --- */}
              <Select value="" onValueChange={handleAddTag} disabled={disabled}>
                <SelectTrigger
                  className="h-8!"
                  aria-label={`Add tag to ${productName}`}
                >
                  <SelectValue placeholder="+ Tag" />
                </SelectTrigger>
                <SelectContent>
                  {!tags || tags.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-2">
                      <span className="text-muted-foreground text-xs">
                        No tags found
                      </span>
                      <TagManager
                        disabled={disabled}
                        trigger={
                          <Button variant="secondary" className="w-full">
                            <PlusIcon className="mr-1 h-3 w-3" /> Create Tag
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        value={tag.id}
                        disabled={item.tag_ids.includes(tag.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              SWATCH_BG_STYLES[tag.color ?? TAG_COLORS[0]]
                            )}
                            aria-hidden="true"
                          />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
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
            disabled={disabled}
            className={cn("h-8 w-8 touch-none", !disabled && "cursor-grab")}
            aria-label={`Reorder ${productName}`}
            aria-description="Press Space or Enter to activate drag mode, then use arrow keys to move."
            {...dragHandleProps}
          >
            <GripVerticalIcon className="text-muted-foreground w-4" />
          </Button>

          {/* --- Remove Item Button --- */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${productName} from cart`}
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
