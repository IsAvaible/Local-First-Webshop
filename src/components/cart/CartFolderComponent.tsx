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
  const { removeItem, updateFolder } = useCart();

  // Local state for editing
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState(folder.name);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const editTriggerRef = React.useRef<HTMLButtonElement>(null);

  const isOver = false;

  // Generate a unique ID for ARIA linking
  const folderHeadingId = `folder-heading-${folder.id}`;

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

    // Restore focus to the edit button after closing the input
    // using setTimeout to ensure the button has remounted first
    setTimeout(() => {
      editTriggerRef.current?.focus();
    }, 0);
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
      setTimeout(() => editTriggerRef.current?.focus(), 0);
    }
  };

  return (
    <div
      data-testid="folder-container"
      className={cn(
        "rounded-lg border bg-gray-50 p-4 shadow-sm transition-colors",
        isOver ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : ""
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="m-0 flex flex-1 items-center overflow-hidden font-semibold text-gray-700">
          <FolderIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />

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
              aria-label={`Rename folder ${folder.name}`}
            />
          ) : (
            <button
              ref={editTriggerRef}
              id={folderHeadingId}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                if (!disabled) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              className={cn(
                "truncate rounded px-1 py-1 text-left transition-colors",
                !disabled &&
                  "focus-visible:ring-ring cursor-text hover:bg-gray-200/50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
              )}
              title="Click to rename"
              aria-label={`Rename folder: ${folder.name}`}
            >
              {folder.name}
            </button>
          )}
        </h3>

        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeItem(folder.id)}
          aria-label={`Delete ${folder.name} folder`}
        >
          <TrashIcon aria-hidden="true" />
        </Button>
      </div>

      <div
        className="flex min-h-[3rem] flex-col gap-2"
        role="group"
        aria-labelledby={folderHeadingId}
      >
        <SortableContext
          items={folder.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {folder.children.length === 0 && !isOver && (
            <p className="rounded border-2 border-dashed py-2 text-center text-xs text-gray-500">
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
