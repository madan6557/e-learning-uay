const lifetime = 14 * 86400000;
const quota = 15 * 1024 * 1024;
type Draft = {
  key: string;
  userId: string;
  value: unknown;
  updatedAt: number;
  bytes: number;
};
export async function countDrafts(userId: string) {
  const db = await database();
  try {
    const all = await result<Draft[]>(
      db.transaction("drafts").objectStore("drafts").getAll(),
    );
    return all.filter(
      (d) => d.userId === userId && Date.now() - d.updatedAt < lifetime,
    ).length;
  } finally {
    db.close();
  }
}
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("uay-learning-drafts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("drafts", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function complete(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function saveDraft(
  userId: string,
  entityId: string,
  value: unknown,
) {
  const key = `${userId}:${entityId}`;
  const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
  if (bytes > quota) throw new Error("DRAFT_TOO_LARGE");
  const db = await database();
  try {
    const tx = db.transaction("drafts", "readwrite");
    const done = complete(tx);
    const store = tx.objectStore("drafts");
    const all = await result<Draft[]>(store.getAll());
    const own = all.filter((d) => d.userId === userId && d.key !== key);
    for (const draft of own.filter((d) => Date.now() - d.updatedAt >= lifetime))
      store.delete(draft.key);
    const retained = own
      .filter((d) => Date.now() - d.updatedAt < lifetime)
      .sort((a, b) => a.updatedAt - b.updatedAt);
    let total = retained.reduce((s, d) => s + d.bytes, 0) + bytes;
    while (retained.length >= 50 || total > quota) {
      const removed = retained.shift();
      if (!removed) break;
      store.delete(removed.key);
      total -= removed.bytes;
    }
    store.put({ key, userId, value, updatedAt: Date.now(), bytes });
    await done;
  } finally {
    db.close();
  }
}
export async function getDraft(userId: string, entityId: string) {
  const db = await database();
  try {
    const draft = await result<Draft | undefined>(
      db
        .transaction("drafts")
        .objectStore("drafts")
        .get(`${userId}:${entityId}`),
    );
    if (draft && Date.now() - draft.updatedAt < lifetime) return draft;
    return undefined;
  } finally {
    db.close();
  }
}
export async function removeDraft(userId: string, entityId?: string) {
  const db = await database();
  try {
    const tx = db.transaction("drafts", "readwrite"),
      done = complete(tx),
      store = tx.objectStore("drafts");
    if (entityId) store.delete(`${userId}:${entityId}`);
    else {
      const all = await result<Draft[]>(store.getAll());
      for (const draft of all)
        if (draft.userId === userId) store.delete(draft.key);
    }
    await done;
  } finally {
    db.close();
  }
}
