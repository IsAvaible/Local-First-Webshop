# Local-First Webshop Project Summary

## 1. Project Overview

This project is a sophisticated **local-first, offline-capable e-commerce application**. It uses cutting-edge technologies (TanStack DB, ElectricSQL, YJS) to provide instant user interactions, real-time collaboration (shared carts), and full functionality without an active internet connection. The application is built to be "production-ready" with features like tiered pricing, custom product fields, and complex order management.

## 2. Architecture & Data Flow

The architecture is unique, prioritizing **local-first** principles where the client database is the primary source of truth for the UI, synced asynchronously with the server.

### **The "Dual Path" State Management**

1.  **Read Path (ElectricSQL + TanStack DB)**:
    - Data is synced from valid Postgres tables to the client via **ElectricSQL**.
    - The client uses **TanStack DB** to query this local data.
    - **Benefit**: Zero-latency reads, works offline, instant filtering/sorting.
    - **Mechanism**: Server exposes "Shapes" (data subsets) -> Electric Client -> Local IndexedDB -> TanStack DB Live Queries.

2.  **Write Path (tRPC + Optimistic UI)**:
    - Mutations (creating orders, updating profiles) are sent via **tRPC** to the server.
    - The server validates logic, checks permissions (using **BetterAuth**), and writes to Postgres.
    - **Sync Loop**: Postgres changes are picked up by ElectricSQL and pushed back to _all_ connected clients (including the sender).
    - **Optimistic Updates**: The UI updates immediately (optimistically) while waiting for the server roundtrip explanation.

3.  **Real-Time Collaboration (YJS)**:
    - Shared carts use **YJS** (CRDTs) to allow multiple users to edit a cart simultaneously without conflicts.
    - Updates are stored in `ydoc_updates` and `ydoc_awareness` tables, enabling "Google Docs-style" collaboration on shopping carts.

### **Infrastructure**

- **Docker Compose**: Orchestrates the complex backend (Postgres + ElectricSQL Service + Caddy Reverse Proxy).
- **Caddy**: Handles SSL and routing between the app and the Electric sync service.

## 3. Technology Stack

### **Frontend**

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)
- **Data/Sync**: [TanStack DB](https://tanstack.com/db), [ElectricSQL](https://electric-sql.com/), [YJS](https://yjs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
- **State Management**: Complex global state via React Context (CartProvider).

### **Backend**

- **API**: [tRPC v10](https://trpc.io/) (End-to-end type safety)
- **Auth**: [BetterAuth](https://www.better-auth.com/)
- **Database Interface**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Functioning as the verified source of truth)

## 4. Key Functionality

### **Storefront & Catalog**

- **Smart Browsing**: Instant filtering/sorting by category, company, and custom fields.
- **Product Variants**: Support for base products with variant links.
- **Custom Fields**: Dynamic schema (`custom_field_definitions` / `custom_field_values`) allowing products to have arbitrary typed attributes (text, number, date, boolean, select) without changing the DB schema.
- **Tiered Pricing**: `pricing_tiers` table enables quantity-based discounts.
- **Assets**: Multiple images/files per product with blurhash support.

### **Shopping Cart (Complex)**

- **Offline Capable**: Add items while offline; syncs when online.
- **Multi-User Collaboration**: Users can invite others (`cart_collaborators`) with roles (`admin`, `contributor`, `viewer`).
- **Real-time Sync**: See other users' cursors/edits in real-time (YJS).
- **Multiple Carts**: Users can manage multiple distinct carts (`carts` table) and switch between them (`user_selected_cart`).

### **Checkout & Orders**

- **Order Flow**: Validation -> Payment Intent (Stripe) -> Order Creation.
- **Snapshots**: Orders store a JSON snapshot of shipping/billing addresses at the time of purchase, preserving history even if user profiles change.
- **Status Tracking**: Granular statuses (`pending`, `shipped`, `delivered`, `cancelled`) and payment statuses (`unpaid`, `paid`, `failed`, `refunded`).

### **User System**

- **Profile**: Personal details (`user_settings`), Localization (Currency/Language).
- **Address Book**: Multiple saved addresses with default flags for billing/delivery.
- **Wishlist**: Price tracking (`price_snapshot`) to notify users of drops.
- **Notifications**: System for alerting users about orders, price drops, shipping, etc.

## 5. Tradeoffs & Considerations

### **Pros**

- **UX Performance**: Zero-latency navigation and interaction once data is loaded.
- **Resilience**: Fully functional offline mode is a massive reliability booster.
- **Real-time**: Built-in support for live updates (inventory, collaboration) without manual polling/websockets.

### **Cons / Complexity**

- **Architectural Overhead**: Requires running ElectricSQL service + Postgres + App. Heavier dev environment than a simple CRUD app.
- **Data Consistency**: The "Eventual Consistency" model requires careful UI design (optimistic states) to prevent user confusion during sync lags.
- **Security Complexity**: Auth logic must be duplicated or carefully managed between the tRPC Write path (authoritative) and the Electric Read path (needs correct "Shape" filtering to ensure users only sync data they are allowed to see).
- **Schema Rigidity**: Changing the DB schema involves migrations _and_ potentially updating Electric shapes/sync logic.

## 6. Database Schema Highlights

- **Product Flexibility**: `custom_field_definitions` allows "EAV-like" flexibility within a relational schema.
- **Collaborative Core**: `carts` are independent entities linked to users via `cart_collaborators`, decoupling the "Shopping Bag" from the "User Session".
- **Auditability**: `orders` snapshot critical data (addresses, product names) to ensure historical accuracy.
