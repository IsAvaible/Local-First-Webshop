import { Repo, DocHandle } from "@automerge/react";
import type {
  UserRegistryDoc,
  UserDoc,
  LedgerDoc,
  BudgetDoc,
  LoanCollectionDoc,
  UserId,
  DocId
} from "./automerge-helpers"; // Assuming this is in the same directory

// =================================================================
// PARAMETER TYPES FOR FACTORY METHODS
// =================================================================

/** Basic parameters required for creating any new shareable document. */
interface CreateDocParams {
  ownerId: UserId;
  name: string;
  members?: UserId[];
}

/** Parameters for creating a User's private registry document. */
interface CreateUserRegistryParams {
  ownerId: UserId;
  name: string; // e.g., "Alice's Registry"
}

/** Parameters for creating a User's public profile document. */
interface CreateUserParams {
  ownerId: UserId;
  displayName: string;
  // The 'name' for the meta block can be derived from displayName.
}

/** Parameters for creating a new Budget document. */
interface CreateBudgetParams extends CreateDocParams {
  sourceLedgerIds?: DocId[]; // Budgets can be linked to ledgers
}

// =================================================================
// DOCUMENT FACTORY ABSTRACTION
// =================================================================

export class DocFactory {
  private repo: Repo;

  /**
   * Initializes the factory with an active Automerge Repo instance.
   * @param repo The Automerge Repo to use for creating documents.
   */
  constructor(repo: Repo) {
    this.repo = repo;
  }

  /**
   * Creates the user's private root document for tracking their other documents.
   */
  public createUserRegistry(
    params: CreateUserRegistryParams
  ): DocHandle<UserRegistryDoc> {
    const handle = this.repo.create<UserRegistryDoc>();
    const { ownerId, name } = params;

    handle.change((doc) => {
      doc.meta = {
        docId: handle.url,
        docType: "user-registry",
        name,
        ownerId,
        members: [] as never[],
        createdAt: new Date(),
        schemaVersion: 1
      };
      doc.documentRegistry = {};
    });

    return handle;
  }

  /**
   * Creates a publicly discoverable user profile document.
   */
  public createUser(params: CreateUserParams): DocHandle<UserDoc> {
    const handle = this.repo.create<UserDoc>();
    const { ownerId, displayName } = params;

    handle.change((doc) => {
      doc.meta = {
        docId: handle.url,
        docType: "user",
        name: `${displayName}'s Profile`,
        ownerId,
        members: [] as never[],
        createdAt: new Date(),
        schemaVersion: 1
      };
      doc.profile = {
        displayName: displayName
      };
    });

    return handle;
  }

  /**
   * Creates a new ledger document for tracking transactions.
   */
  public createLedger(params: CreateDocParams): DocHandle<LedgerDoc> {
    const handle = this.repo.create<LedgerDoc>();
    const { ownerId, name, members = [] } = params;

    handle.change((doc) => {
      doc.meta = {
        docId: handle.url,
        docType: "ledger",
        name,
        ownerId,
        members,
        createdAt: new Date(),
        schemaVersion: 1
      };
      // Initialize empty records for all collections
      doc.transactions = {};
      doc.recurringTransactions = {};
      doc.accounts = {};
      doc.categories = {};
    });

    return handle;
  }

  /**
   * Creates a new budget document for tracking financial goals.
   */
  public createBudget(params: CreateBudgetParams): DocHandle<BudgetDoc> {
    const handle = this.repo.create<BudgetDoc>();
    const { ownerId, name, members = [], sourceLedgerIds = [] } = params;

    handle.change((doc) => {
      doc.meta = {
        docId: handle.url,
        docType: "budget",
        name,
        ownerId,
        members,
        createdAt: new Date(),
        schemaVersion: 1
      };
      doc.sourceLedgerIds = sourceLedgerIds;
      doc.categories = {};
      doc.budgets = {};
      doc.goals = {};
    });

    return handle;
  }

  /**
   * Creates a new loan collection document for tracking debts.
   */
  public createLoanCollection(
    params: CreateDocParams
  ): DocHandle<LoanCollectionDoc> {
    const handle = this.repo.create<LoanCollectionDoc>();
    const { ownerId, name, members = [] } = params;

    handle.change((doc) => {
      doc.meta = {
        docId: handle.url,
        docType: "loan-collection",
        name,
        ownerId,
        members,
        createdAt: new Date(),
        schemaVersion: 1
      };
      doc.loans = {};
    });

    return handle;
  }
}
