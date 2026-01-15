### 1. React 19

**Status:** Die neueste Major-Version der populärsten UI-Library.

- **Funktion:** Deklarative Erstellung von Benutzeroberflächen mit Fokus auf Performance und Server-Integration.
- **Key Features:**
- **React Compiler:** Automatische Memoization (macht `useMemo` und `useCallback` weitgehend überflüssig).
- **Server Components & Actions:** Nahtlose Integration von Server-Logik und Datenmutationen (`<form action={myServerAction} />`).
- **Assets Loading:** Natives Handling von Stylesheets und Scripts im Document-Head.
- **Use Hook:** `use()` zum Auslesen von Promises und Context.

- **Technische Implementierung:** Basiert weiterhin auf dem Virtual DOM, nutzt aber nun einen Compiler zur Build-Zeit, um Re-Renders drastisch zu optimieren. Starke Integration in Next.js.
- **Reception & Einsetzbarkeit:** Extrem positiv aufgenommen, da es die "Boilerplate"-Komplexität für Performance-Optimierung entfernt. Standard für alle neuen React-Projekte.

### 2. Vite

**Status:** Der Industriestandard für Frontend-Tooling.

- **Funktion:** Next-Generation Build-Tool und Dev-Server.
- **Key Features:**
- **Blitzschneller Start:** Nutzt native ES-Modules im Browser während der Entwicklung (kein Bundling nötig).
- **HMR (Hot Module Replacement):** Änderungen sind fast instantan sichtbar.
- **Optimierter Build:** Nutzt `esbuild` (Go-basiert) für Dev und `Rollup` für Production-Builds.

- **Technische Implementierung:** Dient als Middleware im Dev-Mode und als Orchestrator für Rollup im Prod-Mode. Framework-agnostisch (React, Vue, Svelte).
- **Reception & Einsetzbarkeit:** Hat Webpack in den meisten neuen Projekten abgelöst. Unverzichtbar für eine gute Developer Experience (DX).

### 3. Drizzle ORM

**Status:** Der moderne Herausforderer von Prisma.

- **Funktion:** TypeScript ORM (Object Relational Mapper) für die Datenbankinteraktion.
- **Key Features:**
- **"If you know SQL, you know Drizzle":** Die Syntax ist sehr nah an SQL gehalten.
- **Lightweight:** Keine massive Runtime oder Code-Generierung.
- **Serverless-Ready:** Extrem geringer Kaltstart-Overhead (gut für Edge Functions).

- **Technische Implementierung:** Definiert Schemata in TypeScript, die direkt auf SQL-Tabellen mappen. SQL-Migrationen werden via CLI generiert.
- **Reception & Einsetzbarkeit:** Wird aktuell stark gehyped und oft Prisma vorgezogen, da es performanter ist und keine komplexen Binary-Engines benötigt.

### 4. tRPC

**Status:** Die Lösung für typensichere Fullstack-Kommunikation.

- **Funktion:** Ermöglicht Typsicherheit über die API-Grenze hinweg _ohne_ Schemas (wie GraphQL) oder Code-Generierung (wie OpenAPI).
- **Key Features:**
- **End-to-End Type Safety:** Ändert man den Backend-Code, zeigt der Frontend-Code sofort einen TypeScript-Fehler.
- **Autocompletion:** IDE-Support für API-Aufrufe im Frontend.

- **Technische Implementierung:** Nutzt TypeScript Inference. Client und Server teilen sich nur die Typ-Definitionen, keinen Runtime-Code.
- **Reception & Einsetzbarkeit:** Perfekt für Monorepos (z.B. Next.js App). Weniger geeignet für Projekte mit getrennten Teams oder externen Public APIs.

### 5. Tailwind CSS

**Status:** Das dominante Styling-Framework.

- **Funktion:** Utility-First CSS Framework.
- **Key Features:**
- **Atomic CSS:** Vordefinierte Klassen wie `flex`, `pt-4`, `text-center`.
- **Responsive & Dark Mode:** Einfach via Prefixes (`md:flex`, `dark:bg-black`).
- **JIT (Just-in-Time) Engine:** Generiert nur das CSS, das tatsächlich genutzt wird.

- **Technische Implementierung:** PostCSS-Plugin, das HTML-Files scannt und eine statische CSS-Datei generiert.
- **Reception & Einsetzbarkeit:** Kontrovers diskutiert wegen "unleserlichem HTML", aber in der Praxis wegen der Entwicklungsgeschwindigkeit und Konsistenz extrem beliebt.

### 6. shadcn/ui

**Status:** Kein Framework, sondern eine Kopiervorlage. Der aktuelle "Goldstandard" für UI.

- **Funktion:** Sammlung von wiederverwendbaren Komponenten, die man per Copy-Paste (oder CLI) in den eigenen Code holt.
- **Key Features:**
- **Full Ownership:** Der Code gehört dir. Du kannst alles anpassen.
- **Accessibility:** Basiert auf `Radix UI` (Headless Primitives) für Barrierefreiheit.
- **Styling:** Nutzt Tailwind CSS und `class-variance-authority` für Varianten.

- **Technische Implementierung:** Installiert Dependencies (wie Radix) und kopiert den Komponenten-Code (z.B. `Button.tsx`) direkt in deinen `src/components` Ordner.
- **Reception & Einsetzbarkeit:** Hat die Ära der monolithischen UI-Libraries (wie Material UI) beendet. Maximale Flexibilität bei minimalem Vendor-Lock-in.

### 7. ESLint + Prettier

**Status:** Die Wächter über Code-Qualität und Stil.

- **Funktion:** Statische Code-Analyse (Linting) und Code-Formatierung.
- **Key Features:**
- **ESLint:** Findet logische Fehler, Bugs und Verstöße gegen Best Practices (z.B. ungenutzte Variablen, Hooks-Regeln).
- **Prettier:** Erzwingt einen einheitlichen Style (Einrückung, Semikolons, Anführungszeichen) unabhängig vom Entwickler.

- **Technische Implementierung:**
- _ESLint:_ Analysiert den Abstract Syntax Tree (AST) des Codes.
- _Prettier:_ Parst den Code und druckt ihn komplett neu nach definierten Regeln aus.

- **Reception & Einsetzbarkeit:** Nicht verhandelbar. Pflicht in jedem professionellen Projekt, um "Bikeshedding" (Diskussionen über Formatierung) zu vermeiden und Bugs früh zu finden.
