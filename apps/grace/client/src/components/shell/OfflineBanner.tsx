import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  flushOfflineQueue,
  getQueueCount,
  subscribeQueue,
} from '../../lib/offline-queue';

/**
 * Amber bar when offline or when queued writes are waiting to sync.
 */
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
      className="flex items-center justify-center gap-2 h-7 bg-warn-bg text-warn text-[11.5px] font-medium border-b border-warn/20"
    >
      <WifiOff className="w-3.5 h-3.5" />
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
