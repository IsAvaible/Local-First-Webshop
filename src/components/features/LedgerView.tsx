import { DocHandle, useDocument } from "@automerge/react";
import type { LedgerDoc, Transaction } from "@/lib/automerge-helpers";
import TransactionList from "./TransactionList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import TransactionForm from "./TransactionForm";
import { useState } from "react";

interface LedgerViewProps {
  ledgerDocHandle: DocHandle<LedgerDoc>;
}

export default function LedgerView({ ledgerDocHandle }: LedgerViewProps) {
  const [doc, changeDoc] = useDocument<LedgerDoc>(ledgerDocHandle.url);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!doc) {
    return (
      <>
        <div>Loading ledger...</div>
      </>
    );
  }

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    changeDoc((doc) => {
      const newId = crypto.randomUUID();
      doc.transactions[newId] = { ...transaction, id: newId };
    });
    setDialogOpen(false); // Close dialog after submission
  };

  return (
    <div className="my-4 rounded-lg border p-4">
      <h3 className="text-xl font-bold">{doc.meta.name}</h3>

      <div className="my-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm onSubmit={addTransaction} />
          </DialogContent>
        </Dialog>
      </div>

      <TransactionList transactions={Object.values(doc.transactions)} />
    </div>
  );
}
