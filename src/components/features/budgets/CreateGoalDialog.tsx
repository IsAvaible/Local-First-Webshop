import { useState } from "react";
import type { AutomergeUrl } from "@automerge/react";
import {
  type BudgetDoc,
  type Goal,
  type GoalId
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

interface CreateGoalDialogProps {
  budgetUrl: AutomergeUrl;
}

export function CreateGoalDialog({ budgetUrl }: CreateGoalDialogProps) {
  const [doc, changeDoc] = useDocument<BudgetDoc>(budgetUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("0");

  const handleCreate = () => {
    if (!doc || !name || Number(targetAmount) <= 0) return;

    const newGoalId = crypto.randomUUID() as GoalId;
    const newGoal: Goal = {
      id: newGoalId,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      currency: "USD", // Assuming USD for now
      startDate: new Date(),
      targetDate: null,
      status: "active"
    };

    changeDoc((d) => {
      d.goals[newGoalId] = newGoal;
    });

    setIsOpen(false);
    setName("");
    setTargetAmount("0");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
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
              placeholder="e.g. Vacation Fund"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetAmount" className="text-right">
              Target Amount
            </Label>
            <Input
              id="targetAmount"
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g. 2000"
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
