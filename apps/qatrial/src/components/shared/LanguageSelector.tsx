import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '../../store/useLocaleStore';
import { cn } from '../../lib/cn';

interface LanguageOption {
  code: string;
  flag: string;
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'FR' },
  { code: 'en', flag: '\u{1F1FA}\u{1F1F8}', label: 'EN' },
];

export function LanguageSelector() {
  useTranslation();
  // Atomic selectors — full-store destructure loops with Zustand 5 + React 19 (#185)
  const language = useLocaleStore((s) => s.language);
  const setLanguage = useLocaleStore((s) => s.setLanguage);

  const activeCode = language?.startsWith('fr') ? 'fr' : 'en';

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {LANGUAGES.map((lang) => {
        const isActive = lang.code === activeCode;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-subtle text-accent-text'
                : 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary',
            )}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
