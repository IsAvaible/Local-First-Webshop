### 1. Die Architektur: Session-basierte Isolation

Die Implementierung ist in zwei Hauptkomponenten unterteilt: `CartProvider` (Outer) und `CartSession` (Inner).

- **Der Trick mit dem `key`:**
  Der `CartProvider` mountet die `CartSession` mit `key={activeCartId}`.
  Das ist entscheidend: Wenn der Benutzer den Warenkorb wechselt, erzwingt React, dass die alte `CartSession` komplett zerstört (unmount) und eine neue erstellt wird (mount). Das garantiert, dass das `Y.Doc` immer sauber initialisiert wird und keine Daten zwischen verschiedenen Warenkörben "überlaufen".

### 2. Das Y.js Datenmodell (CRDTs)

Statt eines einfachen JSON-Objekts verwendet der Code spezialisierte Y.js-Datentypen (CRDTs - Conflict-free Replicated Data Types). Diese ermöglichen, dass mehrere Nutzer gleichzeitig editieren können, ohne dass Konflikte entstehen.

Innerhalb der `CartSession` werden folgende Strukturen auf dem `ydoc` definiert:

- **`nodes` (Y.Map):** Hier liegen **alle** Items und Ordner flach nebeneinander.
- Die Hierarchie (Baumstruktur) wird nicht durch Verschachtelung, sondern durch Referenzen (`parent_id`) erzeugt.
- Jeder Eintrag hat eine `id` (UUID).

- **`tags` (Y.Map):** Eine separate Map für Tags (Labels), um sie unabhängig von Items zu verwalten.
- **`snapshots` (Y.Array):** Ein Array, das historische Zustände des Warenkorbs speichert (für Versionierung/Undo-Funktionalität).

### 3. Synchronisation & Persistenz (Der "Dual-Layer"-Ansatz)

Der Code nutzt zwei Ebenen der Speicherung, um Offline-Fähigkeit und Echtzeit-Kollaboration zu verbinden:

1. **Lokale Persistenz (`IndexeddbPersistence`):**

- Die Daten werden sofort im Browser (IndexedDB) gespeichert.
- Wenn der Nutzer die Seite neu lädt (oder offline ist), ist der Warenkorb sofort da (`persistence.on("synced", ...)`).

2. **Remote Synchronisation (`ElectricProvider`):**

- Dies verbindet das lokale `Y.Doc` mit dem Backend (ElectricSQL).
- Es werden Deltas (kleine Änderungen) über WebSockets/HTTP ausgetauscht.
- Wenn der Nutzer wieder online kommt (`window.addEventListener("online", ...)`), verbindet sich der Provider automatisch neu und gleicht fehlende Änderungen ab.

### 4. Die React-Y.js Brücke (Reaktivität)

Y.js ist imperativ, React ist deklarativ. Der Code muss diese Welten verbinden:

- **Beobachten (`observeDeep`):**
  Der `useEffect` Hook registriert Listener auf `nodesMap` und `tagsMap`.
- **Konvertierung:**
  Sobald sich in Y.js etwas ändert (z.B. ein anderer Nutzer fügt ein Item hinzu), feuert der Observer. Der Code iteriert dann über die Maps (`nodeMap.toJSON()`), wandelt sie in reguläre JavaScript-Arrays um (`flatNodes`) und speichert sie im React-State (`useState`).
  _Dadurch wird ein Re-Render der UI ausgelöst._

### 5. Kritische Operationen & Logik

Hier sind die spannenden Details, wie spezifische Warenkorb-Funktionen gelöst wurden:

#### A. Sortierung (Fractional Indexing)

Wenn ein Item bewegt wird, müssen nicht alle Indizes neu berechnet werden.

- **Code:** `generateKeyBetween(prevNode.order, nextNode.order)`
- **Logik:** Es wird ein String generiert, der lexikographisch genau zwischen zwei anderen Strings liegt. Das erlaubt extrem schnelles Umordnen ohne Konflikte bei gleichzeitiger Bearbeitung.

#### B. Hierarchie & Zyklus-Erkennung (`moveNode`)

Da Items und Ordner flach gespeichert werden (`flatNodes`), wird Verschieben durch Ändern der `parent_id` erreicht.

- **Schutzmechanismus:** Bevor ein Ordner verschoben wird, prüft der Code, ob der Ziel-Ordner ein Kind des zu verschiebenden Ordners ist (`while (currentParentId)` Loop). Dies verhindert Endlosschleifen, die die App zum Absturz bringen würden.

#### C. Transaktionen (`ydoc.transact`)

Alle Änderungen (z.B. `addItem`, `updateItemQuantity`) werden in `ydoc.transact(() => { ... })` gewickelt.

- Das stellt sicher, dass eine Reihe von Änderungen (z.B. Item erstellen + Werte setzen) als **ein einziger atomarer Schritt** an andere Clients gesendet wird. Das verhindert inkonsistente Zwischenzustände.

#### D. Snapshots (Historie)

Der Code enthält einen intelligenten "Auto-Save"-Mechanismus:

1. Ein Timer läuft alle 60 Sekunden.
2. Er prüft mittels `isDirtyRef`, ob Änderungen vorliegen.
3. Er vergleicht den aktuellen Zustand mit dem letzten Snapshot (`getSnapshotDelta`).
4. Nur wenn es relevante Unterschiede gibt, wird ein binärer Y.js Snapshot (`Y.encodeSnapshot`) erstellt und im `snapshotsArray` gespeichert.

### 6. Awareness (Präsenz-Anzeige)

Neben den persistenten Daten gibt es flüchtige Daten ("Wer ist online?").

- Dafür wird `y-protocols/awareness` genutzt.
- Jeder Client sendet seinen Zustand (`user`: Name, Farbe, ID) an alle anderen.
- Der `useEffect` Hook lauscht auf `awareness.on("change")` und aktualisiert die Liste `onlineUsers`. Wenn ein Nutzer den Tab schließt, verschwindet er nach kurzer Zeit automatisch aus dieser Liste.

### Zusammenfassung

Der Workflow ist:

1. **User Aktion** (Klick auf "Item hinzufügen").
2. **Transaktion:** `addItem` schreibt in die lokale `Y.Map` (nodes).
3. **Observer:** Y.js meldet "Daten geändert" -> React State `flatNodes` wird aktualisiert -> UI zeigt Item.
4. **Sync:** `ElectricProvider` schickt das Delta an den Server -> Andere Nutzer sehen das Item fast zeitgleich.
5. **Persistenz:** `IndexeddbPersistence` speichert es im Browser für den nächsten Besuch.
