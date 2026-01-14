import { useEffect, useMemo, useRef, useState } from "react";

import * as Y from "yjs";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import {
  ElectricProvider,
  type ElectricProviderOptions,
  LocalStorageResumeStateProvider,
  parseToDecoder
} from "@electric-sql/y-electric";
import { Awareness } from "y-protocols/awareness";

import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";

import * as random from "lib0/random";
import * as decoding from "lib0/decoding";
import { createApiUrl } from "@/lib/collections.ts"; // Ensure this path is correct in your project
import { createFileRoute } from "@tanstack/react-router";
import { IndexeddbPersistence } from "y-indexeddb";

// --- Configuration & Types ---
interface UpdateTableSchema {
  update: decoding.Decoder;
}

const users = [
  { color: `#30bced`, light: `#30bced33` },
  { color: `#6eeb83`, light: `#6eeb8333` },
  { color: `#ffbc42`, light: `#ffbc4233` },
  { color: `#ecd444`, light: `#ecd44433` },
  { color: `#ee6352`, light: `#ee635233` },
  { color: `#9ac2c9`, light: `#9ac2c933` }
];

const room = `electric-demo`;

export const Route = createFileRoute("/yjs")({
  ssr: false,
  component: Page
});

function ElectricEditor() {
  // Initialize YJS constructs only once per component lifecycle
  const { ydoc, awareness, user } = useMemo(() => {
    const doc = new Y.Doc();
    const aware = new Awareness(doc);
    const randomUser = users[random.uint32() % users.length];

    aware.setLocalStateField(`user`, {
      name: randomUser.color,
      color: randomUser.color,
      colorLight: randomUser.light
    });

    return { ydoc: doc, awareness: aware, user: randomUser };
  }, []);

  // Refs for DOM and Instances
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const electricProviderRef = useRef<ElectricProvider | null>(null);

  // State
  const [connectivityStatus, setConnectivityStatus] = useState<
    `connected` | `disconnected` | `connecting`
  >(`disconnected`);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // Handle Persistence (IndexedDB)
  useEffect(() => {
    const persistence = new IndexeddbPersistence(room, ydoc);

    persistence.once("synced", () => {
      setIsSynced(true);
    });

    return () => {
      void persistence.destroy();
    };
  }, [ydoc]);

  // Handle Electric Provider & CodeMirror
  useEffect(() => {
    // Wait for IndexedDB to sync first so we don't overwrite local changes
    if (!isSynced || !editorContainerRef.current) return;

    const resumeStateProvider = new LocalStorageResumeStateProvider(user.color);

    // Define options stably
    const options: ElectricProviderOptions<
      // @ts-expect-error Type inference issue with ElectricProviderOptions generic
      UpdateTableSchema,
      UpdateTableSchema
    > = {
      doc: ydoc,
      documentUpdates: {
        shape: {
          url: createApiUrl(`/api/ydoc-updates`),
          params: {
            table: `ydoc_updates`,
            where: `room = '${room}'`
          },
          // @ts-expect-error Type inference issue with ElectricProviderOptions generic
          parser: parseToDecoder
        },
        sendUrl: createApiUrl(`/api/ydoc-updates?room=${room}`),
        getUpdateFromRow: (row) => row.update
      },
      awarenessUpdates: {
        shape: {
          url: createApiUrl(`/api/ydoc-awareness`),
          params: {
            table: `ydoc_awareness`,
            where: `room = '${room}'`
          },
          // @ts-expect-error Type inference issue with ElectricProviderOptions generic
          parser: parseToDecoder
        },
        sendUrl: createApiUrl(
          `/api/ydoc-awareness?room=${room}&clientId=${ydoc.clientID}`
        ),
        protocol: awareness,
        getUpdateFromRow: (row) => row.update
      },
      resumeState: resumeStateProvider.load()
    };

    // Initialize Electric Provider
    // @ts-expect-error Type inference issue with ElectricProviderOptions generic
    const electricProvider = new ElectricProvider(options);
    electricProviderRef.current = electricProvider;

    // Handle Status Updates
    const statusHandler = (status: {
      status: "connected" | "disconnected" | "connecting";
    }) => {
      setConnectivityStatus(status.status);
    };
    electricProvider.on("status", statusHandler);

    // Initialize CodeMirror
    const ytext = ydoc.getText(room);
    const state = EditorState.create({
      doc: ytext.toJSON(),
      extensions: [
        keymap.of([...yUndoManagerKeymap]),
        basicSetup,
        javascript(),
        EditorView.lineWrapping,
        yCollab(ytext, awareness)
      ]
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorContainerRef.current
    });

    // Setup Resume State Sync
    const resumeUnsubscribe =
      resumeStateProvider.subscribeToResumeState(electricProvider);

    // Cleanup function
    return () => {
      electricProvider.off("status", statusHandler);
      electricProvider.destroy();
      electricProviderRef.current = null;

      resumeUnsubscribe();

      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
  }, [isSynced, ydoc, awareness, user.color]);

  const toggleNetwork = () => {
    if (!electricProviderRef.current) return;

    if (connectivityStatus === `connected`) {
      electricProviderRef.current.disconnect();
    } else {
      electricProviderRef.current.connect();
    }
  };

  if (!isSynced) {
    return <span>Loading local data...</span>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={toggleNetwork}
          className="button rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Status: {connectivityStatus}
        </button>
      </div>

      <p className="mb-2">
        Demo of{" "}
        <a
          href="https://github.com/yjs/yjs"
          className="text-blue-600 underline"
        >
          Yjs
        </a>{" "}
        +{` `}
        <a
          href="https://github.com/electric-sql/electric"
          className="text-blue-600 underline"
        >
          Electric
        </a>
        . User Color:{" "}
        <span style={{ color: user.color, fontWeight: "bold" }}>
          {user.color}
        </span>
      </p>

      <div className="rounded border shadow-sm" ref={editorContainerRef}></div>
    </div>
  );
}

function Page() {
  return <ElectricEditor />;
}
