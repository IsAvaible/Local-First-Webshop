import { useState } from "react";
import type { ChangeFn } from "@automerge/react";
import type {
  LedgerDoc,
  Category,
  CategoryId
} from "@/lib/automerge-helpers.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";

interface CategoryListProps {
  ledger: LedgerDoc;
  changeLedger: (fn: ChangeFn<LedgerDoc>) => void;
}

type NewCategoryInput = Omit<Category, "id">;

const defaultNewCategory: NewCategoryInput = {
  name: "",
  description: null,
  icon: null,
  parentId: null
};

export function CategoryList({ ledger, changeLedger }: CategoryListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategory, setNewCategory] =
    useState<NewCategoryInput>(defaultNewCategory);

  const handleCreate = () => {
    if (!newCategory.name) return;
    changeLedger((doc) => {
      const id = crypto.randomUUID() as CategoryId;
      doc.categories[id] = {
        ...newCategory,
        id
      };
    });
    setIsDialogOpen(false);
    setNewCategory(defaultNewCategory);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Category</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="cat-name"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-parent" className="text-right">
                  Parent Category
                </Label>
                <Select
                  value={newCategory.parentId ?? undefined}
                  onValueChange={(value: CategoryId) =>
                    setNewCategory({
                      ...newCategory,
                      parentId: value === "null" ? null : value
                    })
                  }
                >
                  <SelectTrigger id="cat-parent" className="col-span-3">
                    <SelectValue placeholder="None (Top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None (Top-level)</SelectItem>
                    {Object.values(ledger.categories)
                      .filter((c) => !c.parentId) // Only allow one level of nesting for simplicity
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Parent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(ledger.categories)
            .filter((c) => !c.parentId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .flatMap((parent) => [
              <TableRow key={parent.id}>
                <TableCell className="font-medium">{parent.name}</TableCell>
                <TableCell>—</TableCell>
              </TableRow>,
              ...Object.values(ledger.categories)
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="pl-8">{child.name}</TableCell>
                    <TableCell>{parent.name}</TableCell>
                  </TableRow>
                ))
            ])}
        </TableBody>
      </Table>
    </div>
  );
}
