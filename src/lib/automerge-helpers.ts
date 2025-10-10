import type { AutomergeUrl } from "@automerge/react";

// Define basic types for IDs to improve readability.
export type DocId = AutomergeUrl;
type Brand<K, T> = K & { __brand: T };
export type UserId = Brand<string, "UserId">;
export type TransactionId = Brand<string, "TransactionId">;
export type BudgetId = Brand<string, "BudgetId">;
export type GoalId = Brand<string, "GoalId">;
export type LoanId = Brand<string, "LoanId">;
export type CategoryId = Brand<string, "CategoryId">;
export type AccountId = Brand<string, "AccountId">;
export type LoanPaymentId = Brand<string, "LoanPaymentId">;
export type RecurringTransactionId = Brand<string, "RecurringTransactionId">;

// Define the different document types in the system.
type docTypes =
  | "user"
  | "user-registry"
  | "ledger"
  | "budget"
  | "loan-collection";

// Currency code type (ISO 4217)
export type CurrencyCode = Intl.NumberFormatOptions["currency"];

// Base interface for all documents to include common metadata.
export interface AutomergeDoc<T extends docTypes> {
  meta: {
    docId: DocId;
    docType: T;
    name: string;
    ownerId: UserId;
    members: UserId[];
    createdAt: Date;
    schemaVersion: number;
  };
}

// =================================================================
// 1. USER & REGISTRY DOCUMENTS
// =================================================================
/**
 * 1a. User Registry Document (Private to the user)
 * This document is the user's private root, tracking their documents.
 */
export interface UserRegistryDoc extends AutomergeDoc<"user-registry"> {
  meta: AutomergeDoc<"user-registry">["meta"] & {
    members: never[];
  };
  // A registry of all documents (ledgers, budgets, etc.) the user can access
  documentRegistry: Record<
    DocId,
    {
      type: Exclude<docTypes, "user-registry">;
      name: string;
      role: "owner" | "member";
    }
  >;
}

/**
 * 1b. User Document (Publicly discoverable user profile)
 * This document stores the public user information.
 */
export interface UserDoc extends AutomergeDoc<"user"> {
  meta: AutomergeDoc<"user">["meta"] & {
    members: never[];
  };
  profile: {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
}

// =================================================================
// 2. LEDGER DOCUMENT (Sharable)
// =================================================================
/** Represents an internal account within a ledger (e.g., "Checking", "Cash"). */
export interface Account {
  id: AccountId;
  name: string;
  type: "checking" | "savings" | "cash" | "credit-card" | "other";
  icon?: string;
}

export interface Category {
  id: CategoryId;
  parentId?: CategoryId; // For nested categories
  name: string;
  icon?: string;
  description?: string;
}

export interface Transaction {
  id: TransactionId;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: CurrencyCode;
  description: string;
  date: Date;
  categoryId?: CategoryId;
  sourceAccountId?: AccountId;
  /** For internal transfers, the destination of funds. */
  destinationAccountId?: AccountId;
  attachmentUrls: string[];
  createdBy: UserId;
}

/** Defines a transaction that reoccurs on a schedule. */
export interface RecurringTransaction {
  id: RecurringTransactionId;
  baseTransaction: Omit<Transaction, "id" | "date">;
  startDate: Date;
  /** The date the recurrence ends, if applicable. */
  endDate?: Date;
  /** The frequency of the recurrence. */
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  /** The interval of the frequency (e.g., every 2 weeks). */
  interval: number;
  lastGeneratedDate?: Date;
}

// Represents a single ledger for transactions. Can be private or shared.
export interface LedgerDoc extends AutomergeDoc<"ledger"> {
  transactions: Record<TransactionId, Transaction>;
  recurringTransactions: Record<RecurringTransactionId, RecurringTransaction>;
  /** Internal accounts used for transfers. */
  accounts: Record<AccountId, Account>;
  /** All categories available for transactions within this ledger. */
  categories: Record<CategoryId, Category>;
}

// =================================================================
// 3. BUDGET DOCUMENT (Sharable)
// =================================================================
export interface Budget {
  id: BudgetId;
  name: string;
  amount: number;
  currency: CurrencyCode;
  /** Categories from the linked ledger(s) that this budget applies to. */
  categoryIds: CategoryId[];
  /** If true, unspent/overspent amount rolls over to the next period. */
  rollover: boolean;
  span:
    | { type: "period"; start: Date; end: Date }
    | {
        type: "interval";
        start: Date;
        end?: Date;
        /** The unit of time for the interval. */
        intervalUnit: "daily" | "weekly" | "monthly" | "yearly";
        /** The number of units for the interval (e.g., every 2 weeks). */
        interval: number;
        /** The occurrence number within the interval (e.g., 1st of the month). */
        occursOn: number;
      }
    | { type: "ongoing" }; // A continuous budget without a reset period.
}
export interface Goal {
  id: GoalId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  startDate: Date;
  targetDate?: Date;
  status: "active" | "achieved" | "archived";
}

// Contains budgets, goals, and gamification. Can be linked to multiple ledgers.
export interface BudgetDoc extends AutomergeDoc<"budget"> {
  // List of LedgerDoc IDs this budget sources data from
  sourceLedgerIds: DocId[];
  categories: Record<CategoryId, Category>;
  budgets: Record<BudgetId, Budget>;
  goals: Record<GoalId, Goal>;
}

// =================================================================
// 4. LOAN COLLECTION DOCUMENT (Sharable)
// =================================================================

/** A single payment made towards a loan. */
export interface LoanPayment {
  id: LoanPaymentId;
  amount: number;
  date: Date;
  paidBy: UserId;
}

/** A record of a loan between two users. */
export interface Loan {
  id: LoanId;
  lender: UserId;
  borrower: UserId;
  /** The initial amount of the loan. */
  principalAmount: number;
  description: string;
  status: "outstanding" | "partially-paid" | "paid";
  issueDate: Date;
  dueDate?: Date;
  paymentHistory: Record<LoanPaymentId, LoanPayment>;
}

// A dedicated document for tracking loans within a group.
export interface LoanCollectionDoc extends AutomergeDoc<"loan-collection"> {
  loans: Record<LoanId, Loan>;
}
