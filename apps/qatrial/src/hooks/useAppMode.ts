import { useState, useCallback, useMemo, useEffect } from 'react';

export type AppMode = 'server';

const MODE_KEY = 'qatrial:mode';
const API_URL_KEY = 'qatrial:api-url';

function getApiUrl(): string {
  return (
    localStorage.getItem(API_URL_KEY) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:3001/api'
  );
}

/**
 * QAtrial runs in server mode only (API + auth). Standalone / demo mode removed.
 */
export function useAppMode() {
  const [apiUrl, setApiUrl] = useState<string>(getApiUrl);

  useEffect(() => {
    // Purge leftover demo mode from older builds
    localStorage.setItem(MODE_KEY, 'server');
    if (!localStorage.getItem(API_URL_KEY) && import.meta.env.VITE_API_URL) {
      localStorage.setItem(API_URL_KEY, import.meta.env.VITE_API_URL);
    }
  }, []);

  const setServerMode = useCallback((url: string) => {
    const normalized = url.replace(/\/$/, '');
    localStorage.setItem(MODE_KEY, 'server');
    localStorage.setItem(API_URL_KEY, normalized);
    setApiUrl(normalized);
  }, []);

  return useMemo(
    () => ({
      mode: 'server' as const,
      apiUrl,
      setServerMode,
      /** @deprecated Demo mode removed — no-op kept so old call sites don't break. */
      setStandaloneMode: () => {
        localStorage.setItem(MODE_KEY, 'server');
      },
    }),
    [apiUrl, setServerMode],
  );
}
