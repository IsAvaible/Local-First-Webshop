import { useState } from "react";
import type { AutomergeUrl } from "@automerge/react";
import {
  type Loan,
  type LoanCollectionDoc,
  type LoanId,
  type UserId
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

interface CreateLoanDialogProps {
  loanCollectionUrl: AutomergeUrl;
}

export function CreateLoanDialog({ loanCollectionUrl }: CreateLoanDialogProps) {
  const [doc, changeDoc] = useDocument<LoanCollectionDoc>(loanCollectionUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [lender, setLender] = useState<UserId | "">("");
  const [borrower, setBorrower] = useState<UserId | "">("");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!doc || !lender || !borrower || Number(amount) <= 0 || !description)
      return;

    const newLoanId = crypto.randomUUID() as LoanId;
    const newLoan: Loan = {
      id: newLoanId,
      lender,
      borrower,
      principalAmount: Number(amount),
      currency: "USD", // Assuming USD for now
      description,
      status: "outstanding",
      issueDate: new Date(),
      dueDate: null,
      paymentHistory: {}
    };

    changeDoc((d) => {
      d.loans[newLoanId] = newLoan;
    });

    setIsOpen(false);
    setLender("");
    setBorrower("");
    setAmount("0");
    setDescription("");
  };

  const users = doc ? [doc.meta.ownerId, ...doc.meta.members] : [];
  const uniqueUsers = [...new Set(users)];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Loan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Lunch money"
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
              placeholder="e.g. 20"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lender" className="text-right">
              Lender
            </Label>
            <Select
              onValueChange={(value) => setLender(value as UserId)}
              value={lender || undefined}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a lender" />
              </SelectTrigger>
              <SelectContent>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="borrower" className="text-right">
              Borrower
            </Label>
            <Select
              onValueChange={(value) => setBorrower(value as UserId)}
              value={borrower || undefined}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a borrower" />
              </SelectTrigger>
              <SelectContent>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
