import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  flushOfflineQueue,
  getQueueCount,
  subscribeQueue,
} from '../../lib/offline-queue';

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Amber bar when offline or when queued writes are waiting to sync. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => {
      void getQueueCount().then(setPending);
    };
    refresh();
    return subscribeQueue(refresh);
  }, []);

  useEffect(() => {
    if (online && pending > 0) {
      void flushOfflineQueue();
    }
  }, [online, pending]);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-7 items-center justify-center gap-2 border-b border-warning/20 bg-warning-subtle text-[11.5px] font-medium text-warning"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        {!online
          ? pending > 0
            ? `Offline — ${pending} write(s) queued; will sync when you reconnect.`
            : 'Offline — showing cached data. Writes are queued until you reconnect.'
          : `Syncing ${pending} queued write(s)…`}
      </span>
    </div>
  );
}
