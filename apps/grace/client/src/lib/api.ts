import ky, { HTTPError } from 'ky';
import { useAuthStore } from '../stores/auth';
import {
  enqueueMutation,
  flushOfflineQueue,
  isWriteMethod,
  queuedResponse,
} from './offline-queue';

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
}

async function captureWriteBody(init?: RequestInit): Promise<string> {
  if (typeof init?.body === 'string') return init.body;
  if (init?.body instanceof Blob) return init.body.text();
  if (init?.body != null) return String(init.body);
  return '';
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function queueWrite(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<Response> {
  const url = resolveUrl(input);
  if (url.includes('/cyber/evidence')) {
    throw new Error('Offline — evidence upload requires a connection.');
  }
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  await enqueueMutation({
    method: (init?.method ?? 'GET').toUpperCase(),
    url,
    body: await captureWriteBody(init),
    headers,
    timestamp: Date.now(),
  });
  return queuedResponse();
}

export const api = ky.create({
  prefixUrl: '/api',
  timeout: 15000,
  fetch: async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const offline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline && isWriteMethod(method)) {
      return queueWrite(input, init);
    }
    try {
      return await fetch(input, init);
    } catch (err) {
      // Network failure while "online" (airplane mid-request, DNS, etc.) —
      // same behaviour as QAtrial's SW catch path.
      if (isWriteMethod(method)) {
        return queueWrite(input, init);
      }
      throw err;
    }
  },
  hooks: {
    beforeRequest: [
      (req) => {
        const token = useAuthStore.getState().token;
        if (token) req.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (req, _opts, res) => {
        if (res.status !== 401) return;
        const url = new URL(req.url);
        if (
          url.pathname.endsWith('/api/auth/login') ||
          url.pathname.endsWith('/api/auth/register')
        ) {
          return;
        }
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      },
    ],
  },
});

export async function extractError(err: unknown): Promise<string> {
  if (err instanceof HTTPError) {
    try {
      const body = (await err.response.clone().json()) as { error?: string };
      return body.error ?? err.message;
    } catch {
      return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Unknown error';
}
