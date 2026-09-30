import {
  enqueueMutation,
  flushOfflineQueue,
  isWriteMethod,
  purgeUnreplayableMutations,
  queuedResponse,
} from './offline-queue';

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const API_URL_KEY = 'qatrial:api-url';
/** Valeur de VITE_API_URL ayant produit l'URL stockée, pour détecter un changement. */
const API_URL_ENV_KEY = 'qatrial:api-url:env';

/**
 * `useAppMode` recopie `VITE_API_URL` dans localStorage au premier démarrage,
 * et la valeur stockée l'emporte ensuite pour toujours : une fois l'URL gravée
 * dans le navigateur, changer le `.env` n'avait plus AUCUN effet, et l'app
 * restait collée à une API obsolète sans moyen de s'en sortir côté code.
 *
 * On garde donc la trace de la valeur d'environnement qui a produit l'URL
 * stockée. Si `VITE_API_URL` a changé depuis, c'est le `.env` qui fait foi et
 * on réaligne. Un réglage saisi à la main dans l'écran Intégrations continue
 * de gagner tant que le `.env` ne bouge pas.
 */
function reconcileApiBaseWithEnv(): void {
  if (typeof window === 'undefined') return;
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (!env) return;
  try {
    if (localStorage.getItem(API_URL_ENV_KEY) !== env) {
      localStorage.setItem(API_URL_KEY, env.replace(/\/$/, ''));
      localStorage.setItem(API_URL_ENV_KEY, env);
    }
  } catch {
    /* stockage indisponible */
  }
}

reconcileApiBaseWithEnv();

export function getApiBase(): string {
  const storedApiBase =
    typeof window !== 'undefined' ? localStorage.getItem(API_URL_KEY) : null;

  return (storedApiBase || import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(
    /\/$/,
    '',
  );
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
  // Au démarrage : retire de la file ce qui ne pourra jamais être rejoué
  // (routes d'auth, mutations visant une ancienne base d'API). Sans ça, une
  // seule entrée bloquée affiche « Syncing 1 queued write(s)… » indéfiniment.
  void purgeUnreplayableMutations(getApiBase());
}

function buildAuthHeaders(extra?: HeadersInit): Record<string, string> {
  const token = localStorage.getItem('qatrial:token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (extra) {
    const h = new Headers(extra);
    h.forEach((value, key) => {
      headers[key] = value;
    });
  }
  return headers;
}

function bodyToString(body: BodyInit | null | undefined): string {
  if (typeof body === 'string') return body;
  if (body == null) return '';
  return String(body);
}

/**
 * Routes JAMAIS mises en file hors-ligne.
 *
 * Une requête d'authentification n'a aucun sens en différé — rejouer un login
 * vieux de plusieurs heures ne sert à rien — et son corps contient l'email et
 * le mot de passe EN CLAIR, qui resteraient stockés dans IndexedDB
 * (`qatrial-offline`) tant que le rejeu échoue. En cas d'API injoignable,
 * l'erreur doit remonter à l'utilisateur, pas être avalée en « queued ».
 */
const NEVER_QUEUE = ['/auth/'];

function isQueueable(path: string): boolean {
  return !NEVER_QUEUE.some((prefix) => normalizePath(path).startsWith(prefix));
}

/**
 * Le jeton n'est pas persisté avec la mutation : il serait en clair dans
 * IndexedDB et de toute façon probablement expiré au moment du rejeu.
 * `flushOfflineQueue` réinjecte un jeton frais au moment d'envoyer.
 */
function headersForQueue(headers: Record<string, string>): Record<string, string> {
  const { Authorization: _drop, ...rest } = headers;
  return rest;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();
  const url = `${getApiBase()}${normalizePath(path)}`;
  const headers = buildAuthHeaders(options?.headers);
  const body = bodyToString(options?.body);

  const offline =
    typeof navigator !== 'undefined' && navigator.onLine === false;

  if (offline && isWriteMethod(method) && isQueueable(path)) {
    await enqueueMutation({
      method,
      url,
      body,
      headers: headersForQueue(headers),
      timestamp: Date.now(),
    });
    return (await queuedResponse().json()) as T;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(
        (error as { message?: string }).message || res.statusText,
      );
    }
    if (res.status === 202) {
      return (await res.json()) as T;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    const isNetwork =
      err instanceof TypeError ||
      (err instanceof Error &&
        /failed to fetch|networkerror|load failed/i.test(err.message));
    if (isWriteMethod(method) && isNetwork && isQueueable(path)) {
      await enqueueMutation({
        method,
        url,
        body,
        headers: headersForQueue(headers),
        timestamp: Date.now(),
      });
      return (await queuedResponse().json()) as T;
    }
    throw err;
  }
}
