/**
 * IndexedDB offline write queue for QAtrial.
 * Shared store with public/sw.js (`qatrial-offline` / `mutations`).
 * Queues POST/PUT/PATCH/DELETE when offline or when fetch fails; replays on reconnect.
 */

const DB_NAME = 'qatrial-offline';
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

/**
 * Purge les mutations qui ne pourront jamais aboutir et n'auraient jamais dû
 * être mises en file :
 *  - routes d'authentification (corps contenant email + mot de passe en clair) ;
 *  - mutations visant une base d'API différente de celle en vigueur — après un
 *    changement de `VITE_API_URL`, elles pointent sur un serveur qui n'est plus
 *    le bon et bloquent la file indéfiniment.
 *
 * Idempotent, sans effet quand la file est saine.
 */
export async function purgeUnreplayableMutations(currentApiBase: string): Promise<number> {
  let purged = 0;
  try {
    const mutations = await getAll();
    for (const m of mutations) {
      if (m.id === undefined) continue;
      const isAuth = /\/auth\//.test(m.url);
      const isForeignHost = !m.url.startsWith(currentApiBase);
      if (isAuth || isForeignHost) {
        await remove(m.id);
        purged += 1;
      }
    }
  } catch {
    /* IndexedDB indisponible — rien à purger */
  }
  if (purged > 0) notifyQueueListeners();
  return purged;
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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
    // Prefer SW replay when available (same IndexedDB store).
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const viaSw = await new Promise<number>((resolve) => {
        const mc = new MessageChannel();
        mc.port1.onmessage = (event) => {
          resolve(typeof event.data?.replayed === 'number' ? event.data.replayed : 0);
        };
        navigator.serviceWorker.controller!.postMessage(
          { type: 'REPLAY_QUEUE' },
          [mc.port2],
        );
        setTimeout(() => resolve(0), 15000);
      });
      if (viaSw > 0) {
        replayed = viaSw;
        return replayed;
      }
    }

    const mutations = await getAll();
    for (const m of mutations) {
      try {
        // Le jeton n'est jamais persisté avec la mutation (il serait en clair
        // dans IndexedDB et expiré au rejeu) : on en réinjecte un frais ici.
        const token =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem('qatrial:token')
            : null;
        const headers = token
          ? { ...m.headers, Authorization: `Bearer ${token}` }
          : m.headers;
        const res = await fetch(m.url, {
          method: m.method,
          headers,
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
  return new Response(JSON.stringify({ queued: true, offline: true, message: 'Queued for offline sync' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}
