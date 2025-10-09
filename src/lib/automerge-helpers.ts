import type { DocumentId } from "@automerge/react";

// Define basic types for IDs to improve readability.
export type DocId = DocumentId;
export type UserId = string;
export type TransactionId = string;
export type BudgetId = string;
export type GoalId = string;
export type LoanId = string;
export type Badge = string;

// 1. User Document (Private to the user)
// This document is the user's private root, tracking their documents.
export interface UserDoc {
  profile: {
    userId: UserId;
    name: string;
    avatarUrl?: string;
  };
  // A registry of all documents (ledgers, budgets, etc.) the user can access
  documentRegistry: {
    DocId: {
      type: "ledger" | "budget" | "loan-collection";
      name: string;
      role: "owner" | "member";
    };
  };
}

// 2. Ledger Document (Sharable)
// Represents a single ledger for transactions. Can be private or shared.
export interface Transaction {
  id: TransactionId;
  amount: number;
  description: string;
  date: string; // ISO 8601 date string
  categoryId: string;
}
export interface LedgerDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: UserId[];
  };
  transactions: { TransactionId: Transaction };
}

// 3. Budget Document (Sharable)
// Contains budgets, goals, and gamification. Can be linked to multiple ledgers.
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
export interface BudgetDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: UserId[];
    // List of LedgerDoc IDs this budget sources data from
    sourceLedgerIds: DocId[];
  };
  budgets: { BudgetId: Budget };
  goals: { GoalId: Goal };
  gamification: {
    points: { UserId: number };
    badges: { UserId: Badge[] };
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
  isPaid: boolean;
}
export interface LoanCollectionDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: UserId[];
  };
  loans: { LoanId: Loan };
}
