import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Non-intrusive install prompt (same pattern as Grace InstallAppToast).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const VISIT_KEY = 'qatrial-pwa-visits';
const SUPPRESS_UNTIL_KEY = 'qatrial-pwa-install-suppressed-until';
const INSTALLED_KEY = 'qatrial-pwa-installed';

function isSuppressed(): boolean {
  const raw = localStorage.getItem(SUPPRESS_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

function bumpVisitCount(): number {
  const raw = localStorage.getItem(VISIT_KEY);
  const prev = raw ? Number(raw) : 0;
  const next = Number.isFinite(prev) ? prev + 1 : 1;
  localStorage.setItem(VISIT_KEY, String(next));
  return next;
}

export function InstallAppToast() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(INSTALLED_KEY) === '1') return;

    const visits = bumpVisitCount();

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      if (isSuppressed()) return;
      if (visits < 2) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onInstalled() {
      localStorage.setItem(INSTALLED_KEY, '1');
      setDeferred(null);
      setVisible(false);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'dismissed') {
      localStorage.setItem(
        SUPPRESS_UNTIL_KEY,
        String(Date.now() + 30 * 24 * 60 * 60 * 1000),
      );
    }
    setDeferred(null);
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(
      SUPPRESS_UNTIL_KEY,
      String(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ background: 'linear-gradient(135deg, #4f56e5 0%, #3436a4 100%)' }}
      >
        <Download className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-text-primary">Install QAtrial</div>
        <div className="mt-0.5 text-[11.5px] text-text-secondary">
          Launch from your home screen and keep working offline on-site.
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="h-7 rounded-md bg-accent px-3 text-[11.5px] font-medium text-text-inverse hover:bg-accent-hover"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-7 rounded-md px-3 text-[11.5px] font-medium text-text-secondary hover:bg-surface-hover"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex h-5 w-5 items-center justify-center text-text-tertiary hover:text-text-secondary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
