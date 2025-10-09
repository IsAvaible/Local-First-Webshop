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
import type { UserDoc } from "./lib/automerge-helpers.ts";
import { DocumentsProvider } from "./contexts/DocumentsContext.tsx";

const repo = new Repo({
  network: [new BroadcastChannelNetworkAdapter()],
  storage: new IndexedDBStorageAdapter()
});

declare global {
  interface Window {
    repo: Repo;
    handle: DocHandle<UserDoc>;
  }
}
window.repo = repo;

const initUserDoc = (): UserDoc => ({
  profile: {
    userId: "user-" + Math.random().toString(36).substring(2, 9), // dummy user id
    name: "New User"
  },
  documentRegistry: {}
});

// Check the URL for a document to load
const locationHash = document.location.hash.substring(1);
let userDocHandle: DocHandle<UserDoc>;

if (isValidAutomergeUrl(locationHash)) {
  userDocHandle = await repo.find(locationHash);
} else {
  userDocHandle = repo.create<UserDoc>(initUserDoc());
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
