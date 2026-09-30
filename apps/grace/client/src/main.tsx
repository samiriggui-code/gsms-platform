import { StrictMode, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { registerSW } from 'virtual:pwa-register';
import { router } from './routes/router';
import { useAuthStore } from './stores/auth';
import { useI18nStore, useT } from './i18n';
import { useThemeStore } from './stores/theme';
import './styles/index.css';

declare global {
  interface Window {
    /** Reuse across Vite HMR — a second createRoot(#root) causes removeChild NotFoundError. */
    __GRACE_ROOT__?: Root;
  }
}

// Register the PWA service worker. `registerType: 'autoUpdate'` in vite.config
// means new versions activate silently on next navigation — no prompt needed.
// No-op in dev because `devOptions.enabled = false`.
registerSW({ immediate: true });

function Boot() {
  const [ready, setReady] = useState(false);
  const refresh = useAuthStore((s) => s.refresh);
  const locale = useI18nStore((s) => s.locale);
  const theme = useThemeStore((s) => s.theme);
  const t = useT();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-[11.5px] font-mono text-muted-foreground tracking-[0.4px]">
          {t('app.loading')}
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root element');

const root = window.__GRACE_ROOT__ ?? createRoot(rootEl);
window.__GRACE_ROOT__ = root;

root.render(
  <StrictMode>
    <Boot />
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
