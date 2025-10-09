import "./App.css";
import { useDocumentsContext } from "./contexts/DocumentsContext";
import { useDocument } from "@automerge/react";
import type { UserDoc } from "./lib/automerge-helpers";

function App() {
  const { documents, loading, error } = useDocumentsContext();
  const [userDoc] = useDocument<UserDoc>(window.handle.url);

  if (loading) {
    return <div>Loading documents...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Collaborative Budget Tracker</h1>
      {userDoc && (
        <div>
          <h2>Welcome, {userDoc.profile.name}</h2>
          <p>User ID: {userDoc.profile.userId}</p>
        </div>
      )}
      <h3>Documents:</h3>
      <ul>
        {Array.from(documents.keys()).map((docId) => (
          <li key={docId}>{docId}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
