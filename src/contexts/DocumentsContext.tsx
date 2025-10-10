import { createContext, type ReactNode, use } from "react";
import { DocHandle } from "@automerge/react";
import type { DocId, UserRegistryDoc } from "../lib/automerge-helpers";
import { useDocuments } from "../hooks/useDocuments";

export interface DocumentsContextType {
  documents: Map<DocId, DocHandle<unknown>>;
  changeDoc: <T>(docId: DocId, changeFn: (doc: T) => void) => void;
  loading: boolean;
  error: Error | null;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DocumentsContext = createContext<DocumentsContextType | null>(
  null
);

// eslint-disable-next-line react-refresh/only-export-components
export const useDocumentsContext = () => {
  const context = use(DocumentsContext);
  if (!context) {
    throw new Error(
      "useDocumentsContext must be used within a DocumentsProvider"
    );
  }
  return context;
};

interface DocumentsProviderProps {
  userDocHandle?: DocHandle<UserRegistryDoc>;
  children: ReactNode;
}

export const DocumentsProvider = ({
  userDocHandle,
  children
}: DocumentsProviderProps) => {
  const contextValue = useDocuments(userDocHandle);

  return <DocumentsContext value={contextValue}>{children}</DocumentsContext>;
};
