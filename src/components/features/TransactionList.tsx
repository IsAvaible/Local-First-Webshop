import type { Transaction } from "@/lib/automerge-helpers";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({
  transactions
}: TransactionListProps) {
  if (transactions.length === 0) {
    return <p>No transactions yet.</p>;
  }

  return (
    <Table>
      <TableCaption>A list of your recent transactions.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
            <TableCell>{tx.description}</TableCell>
            <TableCell className="text-right">
              ${tx.amount.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
