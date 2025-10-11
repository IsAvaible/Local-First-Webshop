import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App, { type Scene } from "./App.tsx";
import {
  BroadcastChannelNetworkAdapter,
  DocHandle,
  IndexedDBStorageAdapter,
  isValidAutomergeUrl,
  Repo,
  RepoContext
} from "@automerge/react";

const repo = new Repo({
  network: [new BroadcastChannelNetworkAdapter()],
  storage: new IndexedDBStorageAdapter()
});

// Add the repo to the global window object so it can be accessed in the browser console
// This is useful for debugging and testing purposes.
declare global {
  interface Window {
    repo: Repo;
    handle: DocHandle<Scene>;
  }
}
window.repo = repo;

// Check the URL for a document to load
const locationHash = document.location.hash.substring(1);
// Depending on if we have an AutomergeUrl, either find or create the document
if (isValidAutomergeUrl(locationHash)) {
  window.handle = await repo.find(locationHash);
} else {
  window.handle = repo.create<Scene>({
    walls: []
  });
  // Set the location hash to the new document we just made.
  document.location.hash = window.handle.url;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RepoContext value={repo}>
      <App docUrl={window.handle.url} />
    </RepoContext>
  </StrictMode>
);
