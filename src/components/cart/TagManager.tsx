import {
  TAG_COLORS,
  useCart,
  type Tag,
  type TagColor
} from "@/contexts/useCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import React, { useState, useMemo } from "react";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
  AlertCircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SWATCH_BG_STYLES,
  TAG_PILL_STYLES
} from "@/lib/constants/tag-styles.ts";

// ------------------------------------------------------------------
// COMPONENTS
// ------------------------------------------------------------------

const ColorSwatch = ({
  color,
  isSelected,
  onClick
}: {
  color: TagColor;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-4 w-4 rounded-full border border-gray-200 transition-all",
      SWATCH_BG_STYLES[color],
      isSelected
        ? "scale-110 ring-2 ring-black ring-offset-1"
        : "hover:scale-110"
    )}
    title={color}
  />
);

interface TagManagerProps {
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function TagManager({ disabled, trigger }: TagManagerProps) {
  const { tags, createTag, deleteTag, updateTag } = useCart();

  // Input states
  const [inputValue, setInputValue] = useState("");
  const [selectedColor, setSelectedColor] = useState<TagColor>("blue");

  // Editing states
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState<TagColor>("blue");

  // Deleting state
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  // Derived state for Add Input
  const cleanedInput = inputValue.trim();
  const isDuplicate = tags?.some(
    (t) => t.name.toLowerCase() === cleanedInput.toLowerCase()
  );

  // Derived state for Edit Input
  const isEditingDuplicate = useMemo(() => {
    if (!editingTagId || !editingTagName.trim()) return false;
    return tags?.some(
      (t) =>
        t.name.toLowerCase() === editingTagName.trim().toLowerCase() &&
        t.id !== editingTagId
    );
  }, [tags, editingTagId, editingTagName]);

  const visibleTags = useMemo(() => {
    if (!tags) return [];
    if (!inputValue.trim()) return tags;
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [tags, inputValue]);

  // --- Actions ---

  const handleAddTag = () => {
    if (cleanedInput !== "" && !isDuplicate) {
      createTag(cleanedInput, selectedColor);
      setInputValue("");
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color ?? TAG_COLORS[0]);
    setDeletingTagId(null);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingTagName("");
  };

  const handleUpdateTag = () => {
    if (
      editingTagId &&
      editingTagName.trim() !== "" &&
      !isEditingDuplicate // Prevent update if duplicate
    ) {
      const originalTag = tags?.find((t) => t.id === editingTagId);
      const newName = editingTagName.trim();

      const nameChanged = originalTag?.name !== newName;
      const colorChanged = originalTag?.color !== editingTagColor;

      if (nameChanged || colorChanged) {
        updateTag(editingTagId, newName, editingTagColor);
      }
      cancelEditing();
    }
  };

  const confirmDelete = (id: string) => {
    deleteTag(id);
    setDeletingTagId(null);
  };

  const resetState = () => {
    cancelEditing();
    setDeletingTagId(null);
    setInputValue("");
    setSelectedColor("blue");
  };

  return (
    <Dialog onOpenChange={(open) => !open && resetState()}>
      <DialogTrigger asChild>
        {/* If a custom trigger is passed, use it; otherwise use default button */}
        {trigger ?? (
          <Button
            variant="outline"
            size="default"
            disabled={disabled}
            className="gap-2"
          >
            <TagIcon className="h-4 w-4" />
            Manage Tags
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create and manage categories for your items.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* --- Input Area --- */}
          <div className="flex flex-col gap-3">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Create or search tags..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                  }}
                  className={cn(
                    isDuplicate
                      ? "border-amber-500 focus-visible:ring-amber-500"
                      : ""
                  )}
                />
                {inputValue && (
                  <div className="text-muted-foreground absolute top-2.5 right-2 text-xs">
                    {isDuplicate ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircleIcon className="h-3 w-3" /> Exists
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <span className="rounded border px-1 text-[10px]">
                          ↵
                        </span>{" "}
                        to add
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleAddTag}
                disabled={!cleanedInput || isDuplicate}
                size="icon"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Color Selection for New Tag */}
            <div className="flex flex-wrap gap-2 px-1">
              {TAG_COLORS.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  isSelected={selectedColor === color}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="bg-border h-px" />

          {/* --- Tag List --- */}
          <div className="-mr-1 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {(!tags || tags.length === 0) && (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <TagIcon className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">No tags found.</p>
              </div>
            )}

            {visibleTags.length === 0 && inputValue && !isDuplicate && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Press Enter to create "{inputValue}"
              </p>
            )}

            {visibleTags.map((tag) => {
              const isEditing = editingTagId === tag.id;
              const isDeleting = deletingTagId === tag.id;
              const displayColor = tag.color ?? TAG_COLORS[0];

              return (
                <div
                  key={tag.id}
                  className={cn(
                    "group/tag flex flex-col gap-2 rounded-lg border p-2 transition-all",
                    isEditing
                      ? "border-primary bg-primary/5 ring-primary ring-1"
                      : "bg-card hover:bg-accent/50",
                    isDeleting ? "border-red-200 bg-red-50" : ""
                  )}
                >
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      // --- Edit Mode Input ---
                      <div className="relative flex flex-1 items-center gap-2">
                        <Input
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateTag();
                            if (e.key === "Escape") cancelEditing();
                          }}
                          className={cn(
                            "h-8 bg-white pr-16", // Added padding right for badge
                            isEditingDuplicate
                              ? "border-amber-500 focus-visible:ring-amber-500"
                              : ""
                          )}
                          autoFocus
                        />
                        {/* Edit Mode Duplicate Badge */}
                        {isEditingDuplicate && (
                          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-amber-600">
                            <AlertCircleIcon className="h-3 w-3" /> Exists
                          </div>
                        )}
                      </div>
                    ) : isDeleting ? (
                      // --- Delete Confirmation Mode ---
                      <div className="flex flex-1 items-center gap-2 text-sm font-medium text-red-700">
                        <AlertCircleIcon className="h-4 w-4" />
                        Delete "{tag.name}"?
                      </div>
                    ) : (
                      // --- View Mode ---
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={cn(
                            "max-w-[200px] truncate rounded-full border px-2 py-0.5 text-xs font-semibold",
                            TAG_PILL_STYLES[displayColor]
                          )}
                        >
                          {tag.name}
                        </span>
                      </div>
                    )}

                    {/* --- Actions --- */}
                    <div className="ml-2 flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                            onClick={handleUpdateTag}
                            // Disable save if duplicate or empty
                            disabled={
                              !editingTagName.trim() || isEditingDuplicate
                            }
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-7 w-7"
                            onClick={cancelEditing}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : isDeleting ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => confirmDelete(tag.id)}
                          >
                            Yes, Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setDeletingTagId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-1 opacity-0 transition-opacity group-focus-within/tag:opacity-100 group-hover/tag:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground h-7 w-7"
                            onClick={() => startEditing(tag)}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground h-7 w-7 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeletingTagId(tag.id)}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* --- Edit Mode Color Selection --- */}
                  {isEditing && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {TAG_COLORS.map((color) => (
                        <ColorSwatch
                          key={color}
                          color={color}
                          isSelected={editingTagColor === color}
                          onClick={() => setEditingTagColor(color)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
