import { useCallback, useEffect, useState } from 'react';
import {
  enqueueMutation,
  flushOfflineQueue,
  getQueueCount,
  subscribeQueue,
} from '../lib/offline-queue';

/** Thin React wrapper around the shared IndexedDB offline queue. */
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => {
      void getQueueCount().then(setPendingCount);
    };
    refresh();
    return subscribeQueue(refresh);
  }, []);

  const queueMutation = useCallback(
    async (method: string, url: string, body: string) => {
      const token = localStorage.getItem('qatrial:token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      await enqueueMutation({ method, url, body, headers, timestamp: Date.now() });
    },
    [],
  );

  const syncQueue = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      void syncQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncQueue]);

  return { queueMutation, syncQueue, pendingCount, isSyncing };
}
