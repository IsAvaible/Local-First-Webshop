import type { AutomergeUrl } from "@automerge/react";

// Define basic types for IDs to improve readability.
export type DocId = AutomergeUrl;
export type UserId = string;
export type TransactionId = string;
export type BudgetId = string;
export type GoalId = string;
export type LoanId = string;
export type Badge = string;

// Define the different document types in the system.
type docTypes =
  | "user"
  | "user-registry"
  | "ledger"
  | "budget"
  | "loan-collection";

// Base interface for all documents to include common metadata.
export interface AutomergeDoc {
  meta: {
    docId: DocId;
    docType: docTypes;
    name?: string;
    ownerId: UserId;
    members: UserId[];
    createdAt: Date;
    updatedAt: Date;
    schemaVersion: number;
  };
}

// 1. User Document (Private to the user)
// This document is the user's private root, tracking their documents.
export interface UserRegistryDoc extends AutomergeDoc {
  meta: AutomergeDoc["meta"] & {
    docType: "user-registry";
    members: never[];
  };
  // A registry of all documents (ledgers, budgets, etc.) the user can access
  documentRegistry: Record<
    DocId,
    {
      type: Exclude<docTypes, "user">;
      name: string;
      role: "owner" | "member";
    }
  >;
}

// 2. Ledger Document (Sharable)
export interface Transaction {
  id: TransactionId;
  amount: number;
  description: string;
  date: Date;
  categoryId?: string;
}

// Represents a single ledger for transactions. Can be private or shared.
export interface LedgerDoc extends AutomergeDoc {
  meta: AutomergeDoc["meta"] & { docType: "ledger" };
  transactions: Record<TransactionId, Transaction>;
}

// 3. Budget Document (Sharable)
export interface Budget {
  id: BudgetId;
  name: string;
  amount: number;
  categoryId: string;
}
export interface Goal {
  id: GoalId;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

// Contains budgets, goals, and gamification. Can be linked to multiple ledgers.
export interface BudgetDoc extends AutomergeDoc {
  meta: AutomergeDoc["meta"] & { docType: "budget" };
  // List of LedgerDoc IDs this budget sources data from
  sourceLedgerIds: DocId[];
  budgets: Record<BudgetId, Budget>;
  goals: Record<GoalId, Goal>;
  gamification: {
    points: Record<UserId, number>;
    badges: Record<UserId, Badge[]>;
  };
}

// 4. Loan Collection Document (Sharable)
// A dedicated document for tracking loans within a group.
export interface Loan {
  id: LoanId;
  lender: UserId;
  borrower: UserId;
  amount: number;
  description: string;
  payment: {
    status: "unpaid" | "partially-paid" | "paid";
    amountPaid: number;
  };
}
export interface LoanCollectionDoc extends AutomergeDoc {
  meta: AutomergeDoc["meta"] & { docType: "loan-collection" };
  loans: Record<LoanId, Loan>;
}
