import { useState } from "react";
import type { ChangeFn } from "@automerge/react";
import type { LedgerDoc, Account, AccountId } from "@/lib/automerge-helpers.ts";
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

interface AccountListProps {
  ledger: LedgerDoc;
  changeLedger: (fn: ChangeFn<LedgerDoc>) => void;
}

type NewAccountInput = Omit<Account, "id">;

const defaultNewAccount: NewAccountInput = {
  name: "",
  type: "checking",
  icon: null
};

export function AccountList({ ledger, changeLedger }: AccountListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAccount, setNewAccount] =
    useState<NewAccountInput>(defaultNewAccount);

  const handleCreate = () => {
    if (!newAccount.name) return;
    changeLedger((doc) => {
      const id = crypto.randomUUID() as AccountId;
      doc.accounts[id] = {
        ...newAccount,
        id
      };
    });
    setIsDialogOpen(false);
    setNewAccount(defaultNewAccount);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Account</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="acct-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="acct-name"
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="acct-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newAccount.type}
                  onValueChange={(value: NewAccountInput["type"]) =>
                    setNewAccount({ ...newAccount, type: value })
                  }
                >
                  <SelectTrigger id="acct-type" className="col-span-3">
                    <SelectValue placeholder="Account Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit-card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(ledger.accounts).map((acct) => (
            <TableRow key={acct.id}>
              <TableCell>{acct.name}</TableCell>
              <TableCell>{acct.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
