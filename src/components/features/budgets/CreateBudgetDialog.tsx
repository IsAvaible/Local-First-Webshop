import { useState } from "react";
import type { AutomergeUrl } from "@automerge/react";
import {
  type Budget,
  type BudgetDoc,
  type BudgetId
} from "@/lib/automerge-helpers.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useDocument } from "@automerge/react";
import { Checkbox } from "@/components/ui/checkbox.tsx";

interface CreateBudgetDialogProps {
  budgetUrl: AutomergeUrl;
}

export function CreateBudgetDialog({ budgetUrl }: CreateBudgetDialogProps) {
  const [doc, changeDoc] = useDocument<BudgetDoc>(budgetUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0");
  const [rollover, setRollover] = useState(false);

  const handleCreate = () => {
    if (!doc || !name || Number(amount) <= 0) return;

    const newBudgetId = crypto.randomUUID() as BudgetId;
    const newBudget: Budget = {
      id: newBudgetId,
      name,
      amount: Number(amount),
      currency: "USD", // Assuming USD for now, could be taken from doc
      categoryIds: [],
      rollover,
      span: { type: "ongoing" }
    };

    changeDoc((d) => {
      d.budgets[newBudgetId] = newBudget;
    });

    setIsOpen(false);
    setName("");
    setAmount("0");
    setRollover(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Budget</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Groceries"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g. 500"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rollover" className="text-right">
              Rollover
            </Label>
            <Checkbox
              id="rollover"
              checked={rollover}
              onCheckedChange={(checked) => setRollover(Boolean(checked))}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
