import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const LS_KEY = 'grace-theme';

function detectInitial(): Theme {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/** Metronic/next-themes pattern: class on <html> + color-scheme, no transition flash. */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('disable-theme-transitions');
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  // Force a reflow so the disable class covers the paint, then remove it.
  window.setTimeout(() => {
    root.classList.remove('disable-theme-transitions');
  }, 0);
}

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = detectInitial();
  applyTheme(initial);
  return {
    theme: initial,
    setTheme: (theme) => {
      try {
        localStorage.setItem(LS_KEY, theme);
      } catch {
        /* ignore */
      }
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});

