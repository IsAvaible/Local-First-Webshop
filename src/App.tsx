import { useState } from "react";
import { useDocument, type DocHandle } from "@automerge/react";
import type { UserRegistryDoc } from "@/lib/automerge-helpers.ts";
import { Layout } from "@/components/shared/layout.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs.tsx";
import { Dashboard } from "@/components/features/dashboard/Dashboard.tsx";
import { LedgerManager } from "@/components/features/ledgers/LedgerManager.tsx";
import { BudgetManager } from "@/components/features/budgets/BudgetManager.tsx";
import { LoanManager } from "@/components/features/loans/LoanManager.tsx";

type DocType = "ledger" | "budget" | "loan-collection";

function App() {
  const [userRegistryDoc, changeUserRegistryDoc] = useDocument<UserRegistryDoc>(
    window.handle.url
  );
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const handleDocumentCreate = (
    docHandle: DocHandle<unknown>,
    docType: DocType,
    name: string
  ) => {
    if (!userRegistryDoc) return;

    changeUserRegistryDoc((doc) => {
      doc.documentRegistry[docHandle.url] = {
        type: docType,
        name,
        role: "owner"
      };
    });
  };

  if (!userRegistryDoc) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <h1 className="text-4xl font-bold">Loading...</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Collaborative Budget Tracker
          </h1>
          <p className="text-muted-foreground">
            Welcome, {userRegistryDoc.meta.ownerId}
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ledgers">Ledgers</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard
              userRegistryDoc={userRegistryDoc}
              onDocumentCreate={handleDocumentCreate}
            />
          </TabsContent>
          <TabsContent value="ledgers">
            <LedgerManager userRegistryDoc={userRegistryDoc} />
          </TabsContent>
          <TabsContent value="budgets">
            <BudgetManager userRegistryDoc={userRegistryDoc} />
          </TabsContent>
          <TabsContent value="loans">
            <LoanManager userRegistryDoc={userRegistryDoc} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default App;
