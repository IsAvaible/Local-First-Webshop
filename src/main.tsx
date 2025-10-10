import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import {
  BroadcastChannelNetworkAdapter,
  DocHandle,
  IndexedDBStorageAdapter,
  isValidAutomergeUrl,
  Repo,
  RepoContext
} from "@automerge/react";
import type { UserId, UserRegistryDoc } from "./lib/automerge-helpers.ts";
import { DocumentsProvider } from "./contexts/DocumentsContext.tsx";
import { DocFactory } from "@/lib/doc-factory.ts";

const repo = new Repo({
  network: [new BroadcastChannelNetworkAdapter()],
  storage: new IndexedDBStorageAdapter()
});

declare global {
  interface Window {
    repo: Repo;
    handle: DocHandle<UserRegistryDoc>;
    factory: DocFactory;
  }
}
window.repo = repo;

const factory = new DocFactory(repo);
window.factory = factory; // Make factory globally available for simplicity

// The root document URL is stored in the URL hash.
// If there is no hash, we create a new document and redirect.
const locationHash = document.location.hash.substring(1);
let userDocHandle: DocHandle<UserRegistryDoc>;

if (isValidAutomergeUrl(locationHash)) {
  userDocHandle = await repo.find(locationHash);
} else {
  // This is a fresh start. Let's create a user ID.
  // In a real app, this would involve login.
  const userId = crypto.randomUUID() as UserId;
  userDocHandle = factory.createUserRegistry({
    ownerId: userId,
    name: `My Document Registry`
  });
  document.location.hash = userDocHandle.url;
}
window.handle = userDocHandle;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RepoContext value={repo}>
      <DocumentsProvider userDocHandle={userDocHandle}>
        <App />
      </DocumentsProvider>
    </RepoContext>
  </StrictMode>
);
