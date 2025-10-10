import { useState } from "react";
import type { DocHandle } from "@automerge/react";
import type { UserId } from "@/lib/automerge-helpers.ts";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";

type DocType = "ledger" | "budget" | "loan-collection";

interface CreateDocumentDialogProps {
  ownerId: UserId;
  onDocumentCreate: (
    docHandle: DocHandle<unknown>,
    docType: DocType,
    name: string
  ) => void;
  children: React.ReactNode;
}

export function CreateDocumentDialog({
  ownerId,
  onDocumentCreate,
  children
}: CreateDocumentDialogProps) {
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<DocType>("ledger");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreate = () => {
    if (docName) {
      const factoryMethodName = `create${
        docType.charAt(0).toUpperCase() + docType.slice(1).replace("-c", "C")
      }` as "createLedger" | "createBudget" | "createLoanCollection";

      const newDocHandle = window.factory[factoryMethodName]({
        ownerId: ownerId,
        name: docName
      });

      onDocumentCreate(newDocHandle, docType, docName);

      setDocName("");
      setDocType("ledger");
      setIsDialogOpen(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="doc-name" className="text-right">
              Name
            </Label>
            <Input
              id="doc-name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="doc-type" className="text-right">
              Type
            </Label>
            <Select
              onValueChange={(value: DocType) => setDocType(value)}
              defaultValue={docType}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ledger">Ledger</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="loan-collection">Loan Collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
