# Erfahrungsbericht: Architektur und Implementierung eines Local-First Webshops

## 1. Einleitung und Zielsetzung

Im Rahmen eines elfwöchigen Praxisprojekts habe ich die Paradigmen von **Local-First Software** intensiv erforscht. Ziel
war es, die Anwendbarkeit, die Developer Experience (DX) und den Reifegrad aktueller Technologien in einem
realitätsnahen Szenario zu evaluieren. Anders als bei den üblichen "Todo-Listen"-Demos sollte hier ein komplexer
E-Commerce-Anwendungsfall ("Webshop") umgesetzt werden, der hohe Anforderungen an Datenkonsistenz, Filterung und
Kollaboration stellt.

## 2. Technologische Evaluation: Der Weg von Automerge zu ElectricSQL

### Der ursprüngliche Plan: Wissenschaftliche Reinheit

Zu Beginn des Projekts favorisierte ich **Automerge**. Als Technologie, die stark von der Forschungsgruppe _Ink &
Switch_ (rund um Martin Kleppmann) vorangetrieben wird, repräsentiert Automerge für mich den "puristischen" und
wissenschaftlich fundiertesten Ansatz für Local-First. Projekte wie **Keyhive** (für dezentrale Zugangskontrolle) oder \*
\*Patchwork\*\* (für Daten-Versionierung) zeigen das enorme theoretische Potenzial dieser CRDT-Bibliothek.

### Die Realität: Local-First als Spektrum

Während der Konzeption wurde jedoch deutlich, dass "Local-First" kein binärer Zustand ist, sondern ein Spektrum. Man
muss oft zwischen maximaler Dezentralisierung (Pure CRDTs) und der Handhabung komplexer Datenbeziehungen abwägen.

#### Der "Tipping Point": Die Query Engine

Die Entscheidung gegen eine reine CRDT-Lösung für den Produktkatalog fiel aufgrund der fehlenden **Query Capabilities**.
Ein moderner Webshop benötigt zwingend performante Filterung (nach Kategorien, Preisspannen, Attributen) und Sortierung.

- **Das Problem:** In einer reinen Automerge/YJS-Lösung müsste der Client den gesamten Datensatz in den Speicher laden
  und mittels `Array.filter()` o.ä. durchsuchen.
- **Die Konsequenz:** Dies führt zu massiver "Technical Debt". Es gibt keine standardisierte Query-Sprache, keine
  Indizes und bei wachsendem Sortiment (Future Proofing) leidet die Performance auf mobilen Endgeräten drastisch.
- **Die Lösung:** Ich entschied mich für **ElectricSQL**. Es ermöglicht **partielle Replikation** (nur relevante Daten
  werden zum Client gesynct) und bietet durch die Integration mit einer lokalen SQL-Datenbank (im Browser via
  WASM/IndexedDB) eine echte Query Engine. Für strukturierte Katalogdaten ist dies der überlegene Ansatz.

#### Das ungelöste Problem der Migrationen

Ein weiterer kritischer Faktor war die **Schema-Evolution**. In einer produktiven Anwendung ändert sich das Datenmodell
zwangsläufig.

- **CRDT-Status:** Weder YJS noch Automerge bieten native Konzepte für Schema-Migrationen (wie `ALTER TABLE`). Da CRDTs
  oft die gesamte Historie von Änderungen bewahren, ist es extrem komplex, rückwirkend die Struktur von Daten zu ändern,
  ohne die Historie zu brechen. Empfehlungen, wie das Versionieren von Objekten im App-Code, sind für komplexe
  Refactorings oft unzureichend.
- **ElectricSQL-Ansatz:** Durch die Nutzung von **PostgreSQL** als "Source of Truth" konnte ich auf etablierte
  Migrations-Workflows (via Drizzle Kit) zurückgreifen. Dies vermittelte ein Gefühl von Stabilität, das reinen
  CRDT-Lösungen aktuell noch fehlt.

## 3. Architektur & Developer Experience (DX)

Die gewählte Architektur basierte auf einem "Dual-Path"-Ansatz: **ElectricSQL + TanStack DB** für den Read-Path und
**tRPC** für den Write-Path.

### Der "Boilerplate"-Faktor

Die Arbeit mit diesem Stack erfordert eine hohe Toleranz für Boilerplate-Code. Die Implementierung einer einzigen neuen
Entität erforderte oft sieben manuelle Schritte:

1. **Drizzle Schema:** Definition der Tabelle in TypeScript.
2. **Migration:** Generierung und Ausführung der SQL-Migration auf dem Server.
3. **Electric Shape:** Definition, welche Daten subsetted und gesynct werden sollen.
4. **tRPC Router:** Erstellung der Backend-Endpunkte für Mutationen (Writes).
5. **Wiring:** Registrierung des Routers im Backend.
6. **Electric Collection:** Definition der lokalen Repräsentation im Client.
7. **Frontend Integration:** Nutzung in den Routes.

Hier fehlt dem Ökosystem noch das Tooling, das Frameworks wie **Laravel** oder **Ruby on Rails** bieten (Scaffolding via
CLI), um diese repetitiven Aufgaben zu automatisieren.

### Validierung & Logik-Duplizierung

Ein architektonischer Schmerzpunkt war die **Split-Brain-Situation** bei der Validierung.

- **Type Safety:** Dank Drizzle und Zod konnte ich Typen zwischen Client und Server teilen. Das war exzellent.
- **Business Logic:** Semantische Validierung (z.B. "Darf dieser Nutzer dieses Produkt kaufen?", "Ist der Preis
  korrekt?") musste zwingend auf dem Server (in Drizzle/Postgres) erfolgen. Da der Client jedoch eine andere Technologie
  zur Datenabfrage nutzt (TanStack DB auf lokalem SQLite), konnte diese Logik nicht 1:1 wiederverwendet werden. In
  formularlastigen Anwendungen würde dies zu signifikantem Mehraufwand führen.

### Optimistic UI: Grenzen des Determinismus

Electric bietet "Collections" an, die Änderungen optimistisch lokal anwenden, während der Request im Hintergrund läuft.
Dies funktionierte reibungslos, solange das Ergebnis **deterministisch** war.
Bei der **Order Creation** stieß ich jedoch an Grenzen: Da die ID eines Stripe Payment Intents extern generiert wird,
kann der Client sie nicht "erraten". Hier musste ich die optimistische UI umgehen und klassisch auf die Server-Antwort
warten ("Loading State"). Das zeigt: Local-First funktioniert nur so weit, wie man keine synchronen externen
Abhängigkeiten hat.

## 4. Kollaboration: Der Warenkorb mit YJS

Für den kollaborativen Warenkorb entschied ich mich gegen Electric (da Offline-Writes dort discouraged sind) und für
**YJS**, aufgrund der besseren Integration in das Ökosystem.

### Abstraktion und Performance

YJS hat eine gewöhnungsbedürftige API (explizite `get`/`set` Methoden auf `Y.Map` Objekten). Um die DX zu verbessern,
implementierte ich einen **zentralen Provider**, der den YJS-State transparent in normale JavaScript-Objekte
serialisiert und in einem React Context bereitstellt.

- **Bewertung:** Für Warenkörbe (< 50 Items) war der Performance-Overhead der Serialisierung nicht spürbar. Bei
  Szenarien mit hunderten Objekten müsste man jedoch direkt auf den YJS-Typen arbeiten, um Re-Renders und CPU-Last zu
  minimieren.

### Konfliktlösung und "Last Write Wins"

Konflikte (z.B. User A ändert Menge, User B löscht Item) werden durch den CRDT-Algorithmus automatisch gelöst, meistens
mit einer "Last-Write-Wins"-Strategie.
Leider bietet YJS keinen nativen Weg, um "semantische Konflikte" (die technisch lösbar, aber inhaltlich widersprüchlich
sind) für den User zu markieren. Eine Implementierung, die dem Nutzer anzeigt "Achtung, Menge wurde parallel geändert",
hätte einen manuellen Vergleich (Diffing) der Änderungen erfordert, was den Rahmen des Projekts gesprengt hätte.

### Das Offline-Auth Dilemma

Ein theoretisch ungelöstes Problem betrifft **Offline-Writes bei Rechteentzug**.

- **Szenario:** Ein Nutzer arbeitet offline am Warenkorb. Parallel entzieht ihm ein Admin die Schreibrechte.
- **Ergebnis:** Sobald der Nutzer online geht, werden seine Änderungen vom Server abgelehnt. Seine Arbeit ist verloren.
- **Lösungsidee:** Ideal wäre ein Ansatz wie bei **Keyhive** (kryptographische Keys), oder zumindest ein lokaler "
  Outbox"-Mechanismus, der dem Nutzer meldet: _"Deine Änderungen konnten mangels Rechten nicht gesendet werden.
  Exportiere sie oder kontaktiere den Admin."_ Aktuell bietet der Stack hierfür keine Out-of-the-Box Lösung.

## 5. Der hybride Bruch: Checkout & Payment

Der Checkout-Prozess stellt den unvermeidbaren Bruch im Local-First-Paradigma dar. Aufgrund regulatorischer
Anforderungen (SCA, PCI-DSS) und technischer Notwendigkeiten (Stripe API) muss dieser Prozess **online und synchron**
ablaufen.

- **UX-Folgen:** Der Nutzer erlebt einen harten Kontextwechsel. Vom "instant" Browsing-Erlebnis wechselt die App in
  einen Modus mit Ladebalken und Blockierungen.
- **Fazit:** Ein Webshop kann nie zu 100% "Local-First" sein. Er ist zwingend ein Hybrid: **"Local-First Browsing,
  Server-First Transaction"**.

## 6. Gesamtfazit & Ausblick

### Produktionsreife und "Innovationsbudget"

Local-First ist für kleine Projekte und Teams aktuell noch ein Risiko. Es gilt der Grundsatz des **"Innovationsbudgets"**:
Jedes Projekt verträgt nur eine gewisse Menge an neuartiger, ungetesteter Technologie.
Der aktuelle Stack erfordert eine komplexe Infrastruktur (Docker, Electric Sync Service, Proxy, Postgres), deren Wartung
Ressourcen bindet. Für ein kleines Team (2-3 Entwickler) kann dieser Ops-Aufwand die Vorteile der schnelleren
UI-Entwicklung schnell auffressen.

### Zukunftsprognose

Dennoch ist die UX (keine Ladezeiten, Offline-Support) ein massives Alleinstellungsmerkmal.
Ich würde für zukünftige local-first Webshop-Projekte weiterhin auf **ElectricSQL + Postgres** setzen. Die relationale Datenbank
als "Source of Truth" ist für strukturierte Katalogdaten unabdingbar. CRDTs haben ihren Platz in der Kollaboration
(Warenkorb), sollten aber nicht als Ersatz für eine Datenbank missbraucht werden ("Right tool for the job"). Sollte das
Tooling (weniger Boilerplate, einfachere Migrationen) reifen, hat dieser Stack das Potenzial, zum neuen Standard für
datenintensive Web-Apps zu werden.
