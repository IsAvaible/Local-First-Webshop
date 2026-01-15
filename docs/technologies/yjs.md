# Yjs: Shared Editing im Web

**Yjs** ist eine Open-Source-JavaScript-Bibliothek, die auf dem Konzept der **CRDTs (Conflict-free Replicated Data
Types)** basiert. Sie ermöglicht es Entwicklern, kollaborative Anwendungen zu erstellen, bei denen mehrere Benutzer
gleichzeitig an denselben Daten arbeiten können (z. B. Google Docs, Figma, Trello), ohne dass es zu Datenkonflikten
kommt – und das oft sogar ohne zwingende zentrale Server-Logik.

Entwickelt wurde Yjs ursprünglich von **Kevin Jahns**.

---

## 1. Kernfunktion und Zielsetzung

Das Hauptziel von Yjs ist die Synchronisierung von State (Zustand) zwischen verschiedenen Clients in Echtzeit.

- **Dezentralisierung:** Im Gegensatz zu älteren Technologien wie OT (Operational Transformation), die einen zentralen
  Server benötigen, um Konflikte zu lösen, kann Yjs Peer-to-Peer (P2P) funktionieren.
- **Offline-First:** Da alle Änderungen lokal vorgenommen und später synchronisiert werden, unterstützt Yjs von Haus aus
  Offline-Bearbeitung. Sobald eine Verbindung besteht, "mergen" sich die Änderungen automatisch und konfliktfrei.
- **Shared Types:** Yjs abstrahiert die Komplexität der Synchronisation durch Datentypen, die normalen Datenstrukturen
  ähneln (Arrays, Maps, Text), sich aber im Hintergrund magisch synchronisieren.

---

## 2. Features und Leistungsmerkmale

Yjs hebt sich durch spezifische Features von anderen CRDT-Bibliotheken (wie Automerge) ab:

### A. Performance (Das Hauptmerkmal)

Yjs ist extrem auf Leistung optimiert. In zahlreichen Benchmarks übertrifft es Konkurrenten deutlich hinsichtlich
Speicherverbrauch und Geschwindigkeit beim Anwenden von Updates. Dies wird durch eine intelligente interne
Strukturierung und Binär-Codierung erreicht.

### B. Netzwerk-Agnostik

Yjs ist völlig unabhängig vom Übertragungsprotokoll. Es liefert nur die Daten-Updates ("Blobs"). Wie diese von A nach B
kommen, ist dem Entwickler überlassen. Es gibt fertige "Provider" für:

- **WebSockets:** Für klassische Client-Server-Architekturen.
- **WebRTC:** Für direkte Browser-zu-Browser-Kommunikation (Serverless).
- **Dat (Hypercore), IPFS, Matrix:** Für dezentrale Netzwerke.

### C. Editor-Bindings

Das wohl stärkste Argument für Yjs ist das Ökosystem an Bindings für populäre Editoren. Man kann fast jeden Editor mit
wenigen Zeilen Code kollaborativ machen:

- **ProseMirror / Tiptap** (sehr beliebt für Rich Text)
- **Monaco Editor** (VS Code Basis)
- **Quill**
- **CodeMirror**

### D. Versionierung und Undo/Redo

Yjs bietet einen integrierten `UndoManager`. Da Yjs die gesamte Historie der Operationen kennt, kann es selektives Undo
für einen spezifischen Benutzer durchführen (d.h., wenn ich "Rückgängig" drücke, werden nur _meine_ Änderungen
rückgängig gemacht, nicht die meines Kollegen, der gerade auch tippt).

---

## 3. Technische Implementierung (Deep Dive)

Hier liegt die eigentliche Innovation von Yjs. Um zu verstehen, warum es so schnell ist, muss man die interne
Datenstruktur betrachten.

### CRDT Grundlagen

Ein CRDT garantiert **Eventual Consistency**. Egal in welcher Reihenfolge Änderungen eintreffen, am Ende haben alle
Clients denselben Stand.
Mathematisch gesehen müssen die Operationen **kommutativ** (Reihenfolge egal) und **idempotent** (doppelte Ausführung
ändert nichts) sein.

### Die interne Struktur von Yjs

1. **Doppelt verkettete Liste (Doubly Linked List):**
   Alle Daten in Yjs (z. B. Zeichen in einem Textdokument) werden intern als eine flache, doppelt verkettete Liste von "
   Items" dargestellt. Dies ist entscheidend für die Positionsbestimmung bei gleichzeitigen Einfügungen.
2. **Unique IDs (Lamport Timestamps ähnlich):**
   Jedes Item und jede Operation erhält eine einzigartige ID bestehend aus:

- `clientID`: Eine Zufallszahl, die den Benutzer identifiziert.
- `clock`: Ein Zähler, der bei jeder Operation dieses Clients hochzählt (0, 1, 2...).
- Beispiel-ID: `(12345, 0)` -> Client 12345, erste Operation.

3. **Structs und Optimierung:**
   Hier geschieht die Magie. Wenn ein Benutzer "Hallo" tippt, erzeugt er theoretisch 5 Operationen.
   Yjs fasst aufeinanderfolgende Operationen desselben Clients in einem sogenannten **Struct** zusammen. Anstatt 5
   Objekte zu speichern, speichert Yjs ein Objekt: `ContentString("Hallo")` mit der ID `(12345, 0)` und der Länge 5.

- Dies reduziert den Speicherbedarf drastisch.
- Die Komplexität von Operationen ist oft besser als , da über Structs gesprungen werden kann.

4. **Delete Set (Löschen):**
   CRDTs können Daten oft nicht einfach löschen, da dies die Historie für andere Clients zerstören würde (Tombstones).
   Yjs nutzt einen effizienten Ansatz namens **Delete Set**. Anstatt das Item physisch zu entfernen oder aufzublähen,
   wird die ID des gelöschten Items in einer komprimierten Liste (z. B. "Lösche Client A, Clock 5 bis 10") markiert.
   Physisch gelöscht wird erst, wenn Garbage Collection sicher möglich ist (in P2P schwieriger, in Client-Server
   einfacher).
5. **State Vectors und Differential Sync:**
   Wenn zwei Clients synchronisieren, tauschen sie zunächst kleine **State Vectors** aus.

- Client A sagt: "Ich habe von Client B alles bis Clock 50 und von Client C bis Clock 20."
- Client B sieht das und sendet nur die fehlenden Operationen.
- Dies minimiert den Traffic enorm.

6. **Encoding (Lib0):**
   Yjs nutzt ein eigenes binäres Encoding-Format (implementiert in der Hilfsbibliothek `lib0`), das extrem kompakt ist
   und VarInts (Variable Length Integers) nutzt.

---

## 4. Einsetzbarkeit (Use Cases)

Yjs ist nicht nur für Texteditoren geeignet. Durch die Typen `Y.Map` und `Y.Array` lassen sich fast alle Zustände
abbilden.

1. **Collaborative Text Editing:** Google Docs Klone, CMS-Systeme, Notizen-Apps (Obsidian Plugins nutzen teils Yjs).
2. **Zeichnen & Whiteboards:** Anwendungen wie Excalidraw oder tldraw nutzen Yjs, um Positionen von Formen und Strichen
   zu synchronisieren.
3. **3D-Umgebungen:** Synchronisation von Objektpositionen in WebGL/Three.js Szenen.
4. **Backend-Synchronisation:** Synchronisierung von Einstellungen oder Warenkörben über verschiedene Geräte eines
   Nutzers hinweg.
5. **Metaverse / Spiele:** Für rundenbasierte Spiele oder langsame Echtzeit-Spiele ist Yjs geeignet. (Für High-Speed
   Shooter ist die Latenz von TCP/WebSocket oft zu hoch, hier gelten andere Regeln).

---

## 5. Das Ökosystem

Yjs ist modular aufgebaut:

- **yjs:** Die Core-Bibliothek (enthält die CRDT-Logik).
- **y-websocket / y-webrtc / y-dat:** Netzwerk-Provider.
- **y-prosemirror / y-monaco / y-quill:** Editor Bindings.
- **y-indexeddb:** Persistenz im Browser (ermöglicht Offline-Support).
- **y-leveldb:** Persistenz auf dem Server (Node.js).

---

## 6. Reception und Kritik

### Positiv

- **Industrie-Standard:** Yjs hat sich gegen viele akademische und langsamere Implementierungen durchgesetzt. Es wird
  von Firmen wie Atlassian (in Teilen), GitLab und vielen Startups genutzt.
- **Stabilität:** Das System gilt als sehr robust gegenüber Edge-Cases (z. B. verschachtelte Transaktionen).
- **Community:** Sehr aktiv, Kevin Jahns ist präsent und hilft oft direkt.

### Herausforderungen / Nachteile

- **Speicherverbrauch (History):** Wie bei allen CRDTs wächst das Dokument mit jeder Änderung (auch bei Löschungen
  bleiben Metadaten). Obwohl Yjs sehr effizient ist, kann ein Dokument, an dem jahrelang gearbeitet wird, groß werden.
  Es gibt jedoch Möglichkeiten zur "Garbage Collection" oder "Squashing" auf Server-Seite.
- **Lernkurve:** Das Verständnis, dass `sharedArray.push` nicht sofort ein Ergebnis zurückgibt, sondern asynchron über
  das Netzwerk propagiert wird (obwohl lokal sofort sichtbar), erfordert ein Umdenken im State-Management.
- **Server-Validierung:** Da die Logik oft auf dem Client liegt, ist es schwieriger (aber nicht unmöglich), autoritative
  Validierung auf dem Server durchzuführen ("Darf User X das wirklich löschen?").

---

## 7. Alternativen

- **Automerge:** Der größte Konkurrent. Ursprünglich langsamer als Yjs, hat Automerge kürzlich eine Rust-Implementierung
  veröffentlicht, die die Performance-Lücke geschlossen hat. Automerge fokussiert sich noch stärker auf Datenstrukturen
  und weniger auf Editor-Bindings.
- **Fluid Framework (Microsoft):** Ein ähnliches Konzept, aber stärker in das Microsoft-Ökosystem und Azure eingebunden.
- **ShareDB (OT):** Basiert auf Operational Transformation. Benötigt zwingend einen Server, ist aber für reine
  Textbearbeitung mit Server-Validierung oft einfacher zu handhaben, wenn Offline-Fähigkeit keine Priorität hat.

---

## Zusammenfassung

Yjs ist aktuell die **beste Wahl**, wenn Sie eine kollaborative Webanwendung bauen wollen, die robust, offline-fähig und
schnell sein muss. Die Kombination aus technischer Exzellenz (Structs, Binärformat) und pragmatischer Nutzbarkeit (
Editor-Bindings) macht es zum Marktführer im JavaScript-CRDT-Bereich.
