/**
 * Clears all local cart Yjs documents stored in IndexedDB.
 */
export async function clearYjsStorage() {
  // Check support
  if (!window.indexedDB?.databases) {
    console.warn("indexedDB.databases() is not supported in this browser.");
    return;
  }

  try {
    const dbs = await window.indexedDB.databases();

    // Filter for Yjs cart databases
    const yjsDbs = dbs.filter((db) => db.name?.startsWith("yjs-cart-"));

    // Delete each Yjs database
    const deletePromises = yjsDbs.map((db) => {
      return new Promise<void>((resolve, _reject) => {
        if (!db.name) return resolve();

        console.log(`Deleting Yjs DB: ${db.name}`);
        const request = window.indexedDB.deleteDatabase(db.name);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error(`Failed to delete DB ${db.name}`);
          resolve();
        };
        request.onblocked = () => {
          console.warn(
            `Delete blocked for DB ${db.name} - ensure tabs are closed.`
          );
          resolve();
        };
      });
    });

    await Promise.all(deletePromises);
    console.log("All local Yjs documents cleared.");
  } catch (error) {
    console.error("Error clearing Yjs storage:", error);
  }
}
