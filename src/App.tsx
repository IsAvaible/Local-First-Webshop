import "./App.css";
import { useDocumentsContext } from "./contexts/DocumentsContext";
import {
  type AutomergeUrl,
  type DocHandle,
  useDocument,
  useRepo
} from "@automerge/react";
import type { LedgerDoc, UserRegistryDoc } from "./lib/automerge-helpers";
import { Button } from "./components/ui/button";
import { Layout } from "./components/shared/layout";
import LedgerView from "./components/features/LedgerView";

function App() {
  const { documents, loading, error } = useDocumentsContext();
  const [userDoc, changeUserDoc] = useDocument<UserRegistryDoc>(
    window.handle.url
  );
  const repo = useRepo();

  const createLedger = () => {
    const newLedgerHandle = repo.create<LedgerDoc>();

    changeUserDoc((doc) => {
      doc.documentRegistry[newLedgerHandle.url] = {
        type: "ledger",
        name: "My First Ledger",
        role: "owner"
      };
    });
  };

  if (loading && !userDoc) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const ledgerDocs = Array.from(documents.entries()).filter(
    (entry): entry is [AutomergeUrl, DocHandle<LedgerDoc>] => {
      const [, handle] = entry;
      return userDoc?.documentRegistry[handle.url]?.type === "ledger";
    }
  );

  return (
    <Layout>
      <h1>Collaborative Budget Tracker</h1>
      {userDoc && (
        <div>
          <h2>Welcome</h2>
          <p>User ID: unimplemented</p>
        </div>
      )}

      {ledgerDocs.length === 0 ? (
        <div>
          <h3>No ledgers found.</h3>
          <Button onClick={createLedger}>Create a Ledger</Button>
        </div>
      ) : (
        <div>
          <h3>Your Ledgers:</h3>
          {ledgerDocs.map(([docId, handle]) => (
            <LedgerView key={docId} ledgerDocHandle={handle} />
          ))}
        </div>
      )}
    </Layout>
  );
}

export default App;
