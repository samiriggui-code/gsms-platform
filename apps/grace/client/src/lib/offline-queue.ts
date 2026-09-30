/**
 * IndexedDB offline write queue for Grace (pattern from QAtrial).
 * Queues POST/PUT/PATCH/DELETE when offline or when fetch fails mid-flight;
 * replays on reconnect. Multipart / large evidence uploads are not queued in P0.
 */

const DB_NAME = 'grace-offline';
const STORE_NAME = 'mutations';
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type QueuedMutation = {
  id?: number;
  method: string;
  url: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isWriteMethod(method: string): boolean {
  return WRITE.has(method.toUpperCase());
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id'>,
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  notifyQueueListeners();
}

export async function getQueueCount(): Promise<number> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function getAll(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedMutation[]);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function remove(id: number): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

const listeners = new Set<() => void>();

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyQueueListeners() {
  for (const l of listeners) l();
}

let syncing = false;

export async function flushOfflineQueue(): Promise<number> {
  if (syncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }
  syncing = true;
  let replayed = 0;
  try {
    const mutations = await getAll();
    for (const m of mutations) {
      try {
        const res = await fetch(m.url, {
          method: m.method,
          headers: m.headers,
          body: m.body || undefined,
        });
        if (res.ok && m.id !== undefined) {
          await remove(m.id);
          replayed += 1;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  } finally {
    syncing = false;
    notifyQueueListeners();
  }
  return replayed;
}

export function queuedResponse(): Response {
  return new Response(JSON.stringify({ queued: true, offline: true }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}
