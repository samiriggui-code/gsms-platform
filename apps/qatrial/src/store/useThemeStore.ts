import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'qatrial:theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme === 'dark' ? 'dark' : 'light');
      },
    },
  ),
);

// Appliquer tout de suite si déjà en mémoire (avant rehydrate async)
if (typeof document !== 'undefined') {
  try {
    const raw = localStorage.getItem('qatrial:theme');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: string } };
      applyTheme(parsed.state?.theme === 'dark' ? 'dark' : 'light');
    }
  } catch {
    applyTheme('light');
  }
}
