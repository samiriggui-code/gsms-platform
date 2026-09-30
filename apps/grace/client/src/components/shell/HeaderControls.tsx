import { Moon, Sun } from 'lucide-react';
import { useI18nStore, useLocale, useT, type Locale } from '../../i18n';
import { useThemeStore } from '../../stores/theme';

const btnCls =
  'h-8 w-8 flex items-center justify-center rounded-r2 text-n-600 hover:bg-n-100 hover:text-n-900 transition-colors';

function FlagFr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="8" height="16" fill="#002395" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ED2939" />
    </svg>
  );
}

function FlagGb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="4.2" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2.2" />
    </svg>
  );
}

export function HeaderControls() {
  const t = useT();
  const locale = useLocale();
  const setLocale = useI18nStore((s) => s.setLocale);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  function toggleLocale() {
    const next: Locale = locale === 'en' ? 'fr' : 'en';
    setLocale(next);
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={toggleLocale}
        className={btnCls}
        title={locale === 'en' ? 'Passer en français' : 'Switch to English'}
        aria-label={t('lang.switch')}
      >
        <span className="relative inline-flex w-[18px] h-3 overflow-hidden rounded-[2px] ring-1 ring-n-200 shadow-sm">
          {locale === 'fr' ? <FlagFr className="w-full h-full" /> : <FlagGb className="w-full h-full" />}
        </span>
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className={btnCls}
        title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        aria-label={t('theme.switch')}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}
