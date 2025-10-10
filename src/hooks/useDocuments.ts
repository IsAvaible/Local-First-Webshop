import { useState, useEffect } from "react";
import { DocHandle, useRepo } from "@automerge/react";
import type { DocId, UserRegistryDoc } from "../lib/automerge-helpers";

export const useDocuments = (userDocHandle?: DocHandle<UserRegistryDoc>) => {
  const repo = useRepo();
  const [documents, setDocuments] = useState<Map<DocId, DocHandle<unknown>>>(
    // eslint-disable-next-line react-x/prefer-use-state-lazy-initialization
    new Map()
  );
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userDocHandle) {
      setLoading(false);
      return;
    }

    const loadDocuments = async () => {
      try {
        setLoading(true);
        const userDoc = userDocHandle.doc();
        if (!userDoc?.documentRegistry) {
          setLoading(false);
          return;
        }

        const docIds = Object.keys(userDoc.documentRegistry);
        const newDocuments = new Map<DocId, DocHandle<unknown>>();

        // Using Promise.all for concurrent loading
        await Promise.all(
          docIds.map(async (docId) => {
            const handle = await repo.find(docId as DocId);
            handle.doc(); // Ensure the document is loaded
            newDocuments.set(docId as DocId, handle);
          })
        );

        setDocuments(newDocuments);
      } catch (e) {
        setError(
          e instanceof Error ? e : new Error("Failed to load documents")
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();

    const handleChange = async () => {
      await loadDocuments();
    };
    userDocHandle.on("change", () => {
      void handleChange();
      return;
    });

    return () => {
      userDocHandle.off("change", () => {
        void handleChange();
        return;
      });
    };
  }, [userDocHandle, repo]);

  const changeDoc = <T>(docId: DocId, changeFn: (doc: T) => void) => {
    const handle = documents.get(docId) as DocHandle<T> | undefined;
    if (handle) {
      handle.change(changeFn);
    } else {
      console.error(`Document with id ${docId} not found.`);
      throw new Error(`Document with id ${docId} not found.`);
    }
  };

  return { documents, changeDoc, loading, error };
};
