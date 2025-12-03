import { type EnrichedCartFolder, useCart } from "@/contexts/useCartContext.ts";
import * as React from "react";
import { cn } from "@/lib/utils.ts";
import { FolderIcon, TrashIcon } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { SortableNode } from "@/components/cart/Cart.tsx";

export const CartFolderComponent = ({
  folder,
  disabled
}: {
  folder: EnrichedCartFolder;
  disabled?: boolean;
}) => {
  // Destructure updateFolder from context
  const { removeItem, updateFolder } = useCart();

  // Local state for editing
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isOver = false;

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync state if external folder name changes
  React.useEffect(() => {
    if (!isEditing) {
      setTempName(folder.name);
    }
  }, [folder.name, isEditing]);

  const handleSave = () => {
    if (tempName.trim() && tempName !== folder.name) {
      updateFolder(folder.id, tempName);
    } else {
      setTempName(folder.name); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " ") {
      e.stopPropagation();
      return;
    }
    if (e.key === "Enter") {
      e.stopPropagation();
      handleSave();
    }
    if (e.key === "Escape") {
      setTempName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-gray-50 p-4 shadow-sm transition-colors",
        isOver ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : ""
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-1 items-center overflow-hidden font-semibold text-gray-700">
          <FolderIcon className="mr-2 h-5 w-5 shrink-0" />

          {isEditing && !disabled ? (
            <Input
              ref={inputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              // Stop propagation to prevent dnd-kit from interpreting
              // the click/focus as a drag start event on the parent SortableNode
              onPointerDown={(e) => e.stopPropagation()}
              className="m-1 h-6"
            />
          ) : (
            <span
              onClick={(e) => {
                if (!disabled) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              className={cn(
                "truncate rounded px-1 py-0.5 transition-colors",
                !disabled && "cursor-text hover:bg-gray-200/50"
              )}
              title="Click to rename"
            >
              {folder.name}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeItem(folder.id)}
        >
          <TrashIcon />
        </Button>
      </div>
      <div className="flex min-h-[3rem] flex-col gap-2">
        <SortableContext
          items={folder.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {folder.children.length === 0 && !isOver && (
            <p className="rounded border-2 border-dashed py-2 text-center text-xs text-gray-400">
              {disabled ? "Empty folder" : "Drop items here"}
            </p>
          )}
          {folder.children.map((child) => (
            <SortableNode key={child.id} node={child} disabled={disabled} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};
