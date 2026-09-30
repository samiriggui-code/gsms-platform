import { create } from 'zustand';
import { en } from './locales/en';
import { fr } from './locales/fr';

export type Locale = 'en' | 'fr';

export type Dict = typeof en;

const CATALOGS: Record<Locale, Dict> = { en, fr };

const LS_KEY = 'grace-locale-v2';

function detectInitial(): Locale {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'en' || stored === 'fr') return stored;
    // One-shot migration: previous default was EN; FR fork prefers French.
    const legacy = localStorage.getItem('grace-locale');
    if (legacy === 'en' || legacy === 'fr') {
      localStorage.setItem(LS_KEY, legacy === 'en' ? 'fr' : legacy);
      return legacy === 'en' ? 'fr' : legacy;
    }
  } catch {
    /* ignore */
  }
  // GSMS FR fork: default to French when no explicit preference is stored.
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'fr';
  return nav.startsWith('en') ? 'en' : 'fr';
}

type I18nState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useI18nStore = create<I18nState>((set) => ({
  locale: detectInitial(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(LS_KEY, locale);
    } catch {
      /* ignore */
    }
    set({ locale });
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  },
}));

function lookup(dict: Dict, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const primary = lookup(CATALOGS[locale], key);
  const fallback = locale === 'en' ? undefined : lookup(CATALOGS.en, key);
  let out = primary ?? fallback ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

/** Hook: re-renders when locale changes. */
export function useT() {
  const locale = useI18nStore((s) => s.locale);
  return (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
}

export function useLocale() {
  return useI18nStore((s) => s.locale);
}
