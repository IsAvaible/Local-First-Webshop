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
import type { UserRegistryDoc } from "./lib/automerge-helpers.ts";
import { DocumentsProvider } from "./contexts/DocumentsContext.tsx";

const repo = new Repo({
  network: [new BroadcastChannelNetworkAdapter()],
  storage: new IndexedDBStorageAdapter()
});

declare global {
  interface Window {
    repo: Repo;
    handle: DocHandle<UserRegistryDoc>;
  }
}
window.repo = repo;

// Check the URL for a document to load
const locationHash = document.location.hash.substring(1);
let userDocHandle: DocHandle<UserRegistryDoc>;

if (isValidAutomergeUrl(locationHash)) {
  userDocHandle = await repo.find(locationHash);
} else {
  userDocHandle = repo.create<UserRegistryDoc>();
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
