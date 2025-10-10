import type { DocHandle } from "@automerge/react";
import type { UserRegistryDoc } from "@/lib/automerge-helpers.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreateDocumentDialog } from "@/components/features/documents/CreateDocumentDialog.tsx";

type DocType = "ledger" | "budget" | "loan-collection";

interface DashboardProps {
  userRegistryDoc: UserRegistryDoc;
  onDocumentCreate: (
    docHandle: DocHandle<unknown>,
    docType: DocType,
    name: string
  ) => void;
}

export function Dashboard({
  userRegistryDoc,
  onDocumentCreate
}: DashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>An overview of all your documents.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateDocumentDialog
          ownerId={userRegistryDoc.meta.ownerId}
          onDocumentCreate={onDocumentCreate}
        >
          <Button>Create New Document</Button>
        </CreateDocumentDialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(userRegistryDoc.documentRegistry).map(
              ([url, meta]) => (
                <TableRow key={url}>
                  <TableCell>{meta.name}</TableCell>
                  <TableCell>{meta.type}</TableCell>
                  <TableCell>{meta.role}</TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
