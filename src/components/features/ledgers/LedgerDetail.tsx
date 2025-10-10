import { useDocument, type AutomergeUrl } from "@automerge/react";
import type { LedgerDoc } from "@/lib/automerge-helpers.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs.tsx";
import { TransactionList } from "./TransactionList.tsx";
import { AccountList } from "./AccountList.tsx";
import { CategoryList } from "./CategoryList.tsx";

export function LedgerDetail({ ledgerUrl }: { ledgerUrl: AutomergeUrl }) {
  const [ledger, changeLedger] = useDocument<LedgerDoc>(ledgerUrl);

  if (!ledger) return <div>Loading ledger...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ledger.meta.name}</CardTitle>
        <CardDescription>
          Manage your transactions, accounts, and categories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <TransactionList ledger={ledger} changeLedger={changeLedger} />
          </TabsContent>
          <TabsContent value="accounts">
            <AccountList ledger={ledger} changeLedger={changeLedger} />
          </TabsContent>
          <TabsContent value="categories">
            <CategoryList ledger={ledger} changeLedger={changeLedger} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
