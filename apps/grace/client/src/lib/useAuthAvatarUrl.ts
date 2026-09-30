import { useEffect, useState } from 'react';
import { api } from './api';

/** Load authenticated avatar as a blob URL (Bearer cannot go on <img src>). */
export function useAuthAvatarUrl(hasAvatar: boolean | undefined, bust?: number) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const blob = await api.get('auth/me/avatar').blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasAvatar, bust]);

  return url;
}
