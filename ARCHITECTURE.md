# Collaborative Budgeting & Expense Tracking App: Architecture Plan

## 1. Vision & Guiding Principles

This document outlines the architectural plan for a collaborative budget and expense tracking web application. The core vision is to create a tool that is not only functional for individual use but excels at managing shared finances between partners, friends, or groups.

### Guiding Principles:

- **Collaboration-First:** The data model and user experience should be designed around sharing and multi-user interaction from the ground up.
- **Offline-Capable:** Users should be able to view and input data even with an unstable internet connection. Changes will sync automatically when connectivity is restored.
- **Engaging & Motivating:** Scientifically-backed gamification will be used to encourage positive financial habits, focusing on intrinsic motivation rather than just rewards.
- **Extensible:** The architecture must be modular to accommodate future features like AI-powered receipt scanning and advanced financial analysis.
- **Secure & Private:** User financial data is sensitive. The system must be designed with privacy and security in mind.

## 2. Technology Stack

<table>
  <tr>
   <td><strong>Category</strong>
   </td>
   <td><strong>Technology</strong>
   </td>
   <td><strong>Rationale</strong>
   </td>
  </tr>
  <tr>
   <td><strong>Frontend Framework</strong>
   </td>
   <td><a href="https://react.dev/">React</a>
   </td>
   <td>Industry-standard for building dynamic user interfaces with a vast ecosystem and component-based architecture.
   </td>
  </tr>
  <tr>
   <td><strong>Build Tool</strong>
   </td>
   <td><a href="https://vitejs.dev/">Vite</a>
   </td>
   <td>Provides an extremely fast development experience with Hot Module Replacement (HMR) and optimized production builds.
   </td>
  </tr>
  <tr>
   <td><strong>Styling</strong>
   </td>
   <td><a href="https://tailwindcss.com/">Tailwind CSS</a>
   </td>
   <td>A utility-first CSS framework that allows for rapid UI development without leaving your HTML.
   </td>
  </tr>
  <tr>
   <td><strong>UI Components</strong>
   </td>
   <td><a href="https://ui.shadcn.com/">shadcn/ui</a>
   </td>
   <td>A collection of beautifully designed, accessible, and composable components that can be easily customized.
   </td>
  </tr>
  <tr>
   <td><strong>Data Layer (CRDT)</strong>
   </td>
   <td><a href="https://automerge.org/">Automerge</a>
   </td>
   <td>The core of our collaboration model. It's a Conflict-Free Replicated Data Type (CRDT) library that enables local-first, collaborative software. It naturally handles offline changes and peer-to-peer merging.
   </td>
  </tr>
  <tr>
   <td><strong>State Management</strong>
   </td>
   <td>React Context + Custom Hooks
   </td>
   <td>For managing the Automerge document and application state. A custom useAutomerge hook will provide a clean interface for components.
   </td>
  </tr>
  <tr>
   <td><strong>Sync Server</strong>
   </td>
   <td>Node.js + WebSocket (ws library) (Optional)
   </td>
   <td>A simple backend can be used to broadcast changes between connected clients, acting as a signaling and sync server. WebRTC is an alternative for more direct peer-to-peer connections.
   </td>
  </tr>
</table>

## 3. Core Architecture

### 3.1. Data Model with Automerge

The application state is split across multiple Automerge documents, categorized by their function. This ensures that data is only synchronized with users who have explicit access to that specific document, enhancing privacy and efficiency.

A central User Document will act as a private index, tracking all other documents a user has access to.

```ts
// High-level structure of the Automerge document
// 1. User Document (Private to the user)
// This document is the user's private root, tracking their documents.
interface UserDoc {
  profile: {
    userId: string;
    name: string;
    avatarUrl?: string;
  };
  // A registry of all documents (ledgers, budgets, etc.) the user can access
  documentRegistry: Automerge.Map<
    DocId,
    {
      type: "ledger" | "budget" | "loan-collection";
      name: string;
      role: "owner" | "member";
    }
  >;
}

// 2. Ledger Document (Sharable)
// Represents a single ledger for transactions. Can be private or shared.
interface LedgerDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: Automerge.List<UserId>;
  };
  transactions: Automerge.Map<TransactionId, Transaction>;
}

// 3. Budget Document (Sharable)
// Contains budgets, goals, and gamification. Can be linked to multiple ledgers.
interface BudgetDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: Automerge.List<UserId>;
    // List of LedgerDoc IDs this budget sources data from
    sourceLedgerIds: Automerge.List<DocId>;
  };
  budgets: Automerge.Map<BudgetId, Budget>;
  goals: Automerge.Map<GoalId, Goal>;
  gamification: {
    points: Automerge.Map<UserId, number>;
    badges: Automerge.Map<UserId, Automerge.List<Badge>>;
  };
}

// 4. Loan Collection Document (Sharable)
// A dedicated document for tracking loans within a group.
interface LoanCollectionDoc {
  meta: {
    name: string;
    ownerId: UserId;
    members: Automerge.List<UserId>;
  };
  loans: Automerge.Map<LoanId, Loan>;
}
```

### 3.2. Collaboration & Syncing

1. **Local-First Approach:** All changes are first applied to the local Automerge document. The UI updates instantly, providing a fast user experience.
2. **Syncing Mechanism:**
   - Automerge handles merging changes from different sources automatically.
   - A simple WebSocket server will broadcast changes to all connected clients in the same "room" (based on the document ID).
   - Clients will listen for incoming changes and merge them into their local document.
3. **Conflict Resolution:** Automerge's CRDT nature ensures that conflicts are resolved automatically without data loss. For example, if two users edit the same transaction simultaneously, both changes will be merged in a predictable manner.
4. **Offline Support:** Users can continue to add/edit transactions while offline. Changes will sync automatically once the connection is restored.

### 3.3. Component Structure (High-Level)

```
/src
├── components
│   ├── ui/                   # Shadcn UI components
│   ├── shared/               # Common components (e.g., Header, Layout)
│   ├── features/             # Feature-specific components
│   │   ├── Dashboard.tsx
│   │   ├── LedgerView.tsx
│   │   ├── TransactionList.tsx
│   │   ├── BudgetCard.tsx
│   │   ├── GoalTracker.tsx
│   │   └── Gamification/
│   │       ├── BadgeDisplay.tsx
│   │       └── Leaderboard.tsx
├── hooks
│   └── useDocuments.ts       # Hook to manage and interact with multiple Automerge docs
├── contexts
│   └── DocumentsContext.tsx  # Provides access to all loaded Automerge documents
├── lib
│   ├── documents-helpers.ts  # Functions for initializing/loading/managing docs
│   └── utils.ts
└── App.tsx                   # Main application component and routing
```

## 4. Actionable Development Plan

### Phase 1: Foundation & Core Features

**Goal:** A functional single-user expense tracker.

1. **Project Setup:**
   - [x] npm create vite@latest with React + TypeScript template.
   - [x] Integrate Tailwind CSS and configure tailwind.config.js.
   - [x] Set up shadcn/ui using its CLI.
   - [x] Install Automerge and set up basic project structure.
2. **Automerge Integration:**
   - [x] Create `DocumentsContext` to hold a map of loaded document handles (`docId` -> `handle`).
   - [x] Develop the `useDocuments` custom hook. It will manage loading documents listed in the user's `UserDoc` and provide functions to change a specific document.
3. **UI - Core Ledger:**
   - [ ] Build the main layout (sidebar for navigation, main content area).
   - [ ] Create a LedgerView component that displays transactions.
   - [ ] Implement a TransactionList component with items.
   - [ ] Create a form (using a shadcn Dialog or Sheet) to add/edit transactions. The form submission will call the change function from useAutomerge.
4. **UI - Budgeting:**
   - [ ] Create a `BudgetCard` component.
   - [ ] Implement a form to create a monthly budget for a specific category (e.g., "Groceries: $400").
   - [ ] The BudgetCard should display progress based on transactions in its category.

### Phase 2: Collaboration & Sharing

**Goal:** Enable two or more users to share and edit a ledger in real-time.

1. **Sync Server:**
   - Set up a secure server based on the Automerge docs and use it to broadcast changes between connected clients.
2. **Sharing UI:**
   - Implement a "Share" button on the ledger view.
   - Create a UI to invite another user (e.g., by their user ID or email). This adds their ID to the members list in the Automerge doc.
3. **Shared Features:**
   - **Loans:** Add a "Loans" section to the ledger. Create a form to track who owes whom and for what.
   - **Shared Goals:** Create a UI for setting a shared savings goal (e.g., "Vacation Fund: $2000"). The progress bar updates as members contribute.

### Phase 3: Gamification

**Goal:** Increase user engagement through positive reinforcement.

1. **Gamification Design (Based on Self-Determination Theory):**
   - **Competence:** Users feel effective. Award badges for milestones (e.g., "On-Budget Week," "Savings Streak," "First Shared Goal Achieved").
   - **Autonomy:** Users feel in control. Let them choose which goals to pursue and which budgets to set.
   - **Relatedness:** Users feel connected. Implement a simple leaderboard for shared goals to foster friendly competition and collaboration.
2. **Implementation:**
   - Extend the Automerge doc to include gamification state.
   - Create logic that runs after each change to check if a badge condition has been met.
   - Build the UI components: BadgeDisplay to show earned badges on a profile, and a Leaderboard component for shared goals.

### Phase 4: AI & Advanced Features (optional)

**Goal:** Prepare the app for future extension and polish the user experience.

1. **AI Receipt Scanning Stub:**
   - Add a button "Scan Receipt" with a file upload input.
   - On upload, display a loading state and simulate an API call with setTimeout.
   - After the delay, return mock data (e.g., { amount: 42.50, description: "Supermarket Purchase", date: "..." }).
   - Use this mock data to pre-fill the "Add Transaction" form.
   - This builds the complete user flow, making it easy to swap in a real AI service later (like Google's Document AI or a custom model).
2. **Data Visualization:**
   - Integrate a charting library like [Recharts](https://recharts.org/).
   - Create components for pie charts (spending by category) and bar charts (spending over time).
3. **UX/UI Polish:**
   - Add animations and transitions using framer-motion.
   - Conduct an accessibility audit.
   - Refine the mobile and responsive views.

## 5. Deployment

1. **Frontend:** The Vite build output (static HTML, CSS, JS) can be deployed to any static hosting provider like **Vercel** or **Netlify**.
2. **Sync Server:** The Automerge WebSocket server is lightweight and can be deployed to services like **Fly.io**, **Render**, or **Heroku**.
