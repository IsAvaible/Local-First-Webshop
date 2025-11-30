import { type Tag, useCart } from "@/contexts/useCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useState } from "react";
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";

interface TagManagerProps {
  disabled?: boolean;
}

export function TagManager({ disabled }: TagManagerProps) {
  const { tags, createTag, deleteTag, updateTag } = useCart();
  const [newTag, setNewTag] = useState("");

  // --- State for inline editing ---
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() !== "") {
      createTag(newTag.trim());
      setNewTag("");
    }
  };

  // --- Handlers for editing ---
  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingTagName("");
  };

  const handleUpdateTag = () => {
    if (editingTagId && editingTagName.trim() !== "") {
      updateTag(editingTagId, editingTagName.trim());
    }
    cancelEditing();
  };

  return (
    <Dialog onOpenChange={(open) => !open && cancelEditing()}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* --- Add Tag Input --- */}
          <div className="flex gap-2">
            <Input
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            />
            <Button onClick={handleAddTag}>Add</Button>
          </div>

          {/* --- List of Existing Tags --- */}
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-2">
            {(!tags || tags.length === 0) && (
              <p className="text-muted-foreground text-sm">
                No tags created yet.
              </p>
            )}
            {tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-md bg-gray-50 p-2"
              >
                {editingTagId === tag.id ? (
                  // --- Editing View ---
                  <Input
                    value={editingTagName}
                    onChange={(e) => setEditingTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateTag()}
                    className="h-8"
                    autoFocus
                  />
                ) : (
                  // --- Default View ---
                  <span className="text-sm font-medium">{tag.name}</span>
                )}

                {/* --- Action Buttons --- */}
                <div className="flex gap-1">
                  {editingTagId === tag.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUpdateTag}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(tag)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteTag(tag.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
