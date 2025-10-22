import { useCart } from "@/contexts/useCartContext.ts";
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

export function TagManager() {
  const { cart, dispatch } = useCart();
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() !== "") {
      dispatch({ type: "ADD_TAG", payload: { tag: newTag.trim() } });
      setNewTag("");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Tags</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button onClick={handleAddTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cart.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-200 px-2 py-1 text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
