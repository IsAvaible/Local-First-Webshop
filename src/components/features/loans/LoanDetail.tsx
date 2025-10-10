import { useDocument, type AutomergeUrl } from "@automerge/react";
import type { LoanCollectionDoc } from "@/lib/automerge-helpers.ts";
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
import { CreateLoanDialog } from "./CreateLoanDialog.tsx";

export function LoanDetail({
  loanCollectionUrl
}: {
  loanCollectionUrl: AutomergeUrl;
}) {
  const [loanDoc] = useDocument<LoanCollectionDoc>(loanCollectionUrl);

  if (!loanDoc) return <div>Loading loans...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{loanDoc.meta.name}</CardTitle>
            <CardDescription>Track loans and payments.</CardDescription>
          </div>
          <CreateLoanDialog loanCollectionUrl={loanCollectionUrl} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(loanDoc.loans).map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>{loan.description}</TableCell>
                <TableCell>{loan.lender}</TableCell>
                <TableCell>{loan.borrower}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: loan.currency
                  }).format(loan.principalAmount)}
                </TableCell>
                <TableCell>{loan.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
