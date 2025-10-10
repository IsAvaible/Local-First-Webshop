import React, { useState } from "react";
import type { ChangeFn } from "@automerge/react";
import type {
  LedgerDoc,
  Transaction,
  TransactionId,
  CategoryId,
  AccountId
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
import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface TransactionListProps {
  ledger: LedgerDoc;
  changeLedger: (fn: ChangeFn<LedgerDoc>) => void;
}

// Omit properties that are auto-generated
type NewTransactionInput = Omit<
  Transaction,
  "id" | "createdBy" | "attachmentUrls"
>;

const defaultNewTx: NewTransactionInput = {
  type: "expense",
  amount: 0,
  currency: "USD",
  description: "",
  date: new Date(),
  categoryId: null,
  sourceAccountId: null,
  destinationAccountId: null
};

export function TransactionList({
  ledger,
  changeLedger
}: TransactionListProps) {
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [newTx, setNewTx] = useState<NewTransactionInput>(defaultNewTx);

  const handleCreateTransaction = () => {
    if (!ledger) return;
    changeLedger((doc: LedgerDoc) => {
      const id = crypto.randomUUID() as TransactionId;
      doc.transactions[id] = {
        ...newTx,
        id,
        createdBy: doc.meta.ownerId,
        attachmentUrls: []
      };
    });
    setIsTxDialogOpen(false);
    setNewTx(defaultNewTx);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newTx.type}
                  onValueChange={(value: "income" | "expense" | "transfer") =>
                    setNewTx({ ...newTx, type: value })
                  }
                >
                  <SelectTrigger id="tx-type" className="col-span-3">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-desc" className="text-right">
                  Description
                </Label>
                <Input
                  id="tx-desc"
                  value={newTx.description}
                  onChange={(e) =>
                    setNewTx({ ...newTx, description: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              {/* Amount */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="tx-amount"
                  type="number"
                  value={newTx.amount}
                  onChange={(e) =>
                    setNewTx({
                      ...newTx,
                      amount: parseFloat(e.target.value) || 0
                    })
                  }
                  className="col-span-3"
                />
              </div>
              {/* Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-date" className="text-right">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !newTx.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTx.date ? (
                        format(newTx.date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newTx.date}
                      onSelect={(date) => date && setNewTx({ ...newTx, date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Category */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-cat" className="text-right">
                  Category
                </Label>
                <Select
                  value={newTx.categoryId ?? undefined}
                  onValueChange={(value: CategoryId) =>
                    setNewTx({ ...newTx, categoryId: value })
                  }
                >
                  <SelectTrigger id="tx-cat" className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ledger.categories)
                      .filter((c) => !c.parentId)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((parent) => (
                        <React.Fragment key={parent.id}>
                          <SelectItem value={parent.id}>
                            {parent.name}
                          </SelectItem>
                          {Object.values(ledger.categories)
                            .filter((c) => c.parentId === parent.id)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((child) => (
                              <SelectItem
                                key={child.id}
                                value={child.id}
                                className="pl-8"
                              >
                                {child.name}
                              </SelectItem>
                            ))}
                        </React.Fragment>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Source Account */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-src-acct" className="text-right">
                  {newTx.type === "income" ? "To Account" : "From Account"}
                </Label>
                <Select
                  value={newTx.sourceAccountId ?? undefined}
                  onValueChange={(value: AccountId) =>
                    setNewTx({ ...newTx, sourceAccountId: value })
                  }
                >
                  <SelectTrigger id="tx-src-acct" className="col-span-3">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ledger.accounts).map((acct) => (
                      <SelectItem key={acct.id} value={acct.id}>
                        {acct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Destination Account (for transfers) */}
              {newTx.type === "transfer" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tx-dest-acct" className="text-right">
                    To Account
                  </Label>
                  <Select
                    value={newTx.destinationAccountId ?? undefined}
                    onValueChange={(value: AccountId) =>
                      setNewTx({ ...newTx, destinationAccountId: value })
                    }
                  >
                    <SelectTrigger id="tx-dest-acct" className="col-span-3">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ledger.accounts).map((acct) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTransaction}>
                Save Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(ledger.transactions)
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{format(new Date(tx.date), "PPP")}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell>
                  {tx.categoryId
                    ? ledger.categories[tx.categoryId]?.name
                    : "N/A"}
                </TableCell>
                <TableCell
                  className={cn(
                    tx.type === "income"
                      ? "text-green-600"
                      : tx.type === "expense"
                        ? "text-red-600"
                        : ""
                  )}
                >
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: tx.currency
                  }).format(tx.amount)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
