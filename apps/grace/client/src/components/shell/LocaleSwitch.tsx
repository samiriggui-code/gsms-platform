import { Languages } from 'lucide-react';
import { useI18nStore, useLocale, type Locale } from '../../i18n';

export function LocaleSwitch({ collapsed = false }: { collapsed?: boolean }) {
  const locale = useLocale();
  const setLocale = useI18nStore((s) => s.setLocale);

  function toggle() {
    const next: Locale = locale === 'en' ? 'fr' : 'en';
    setLocale(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        'flex items-center gap-1.5 h-7 px-2 rounded-r1 text-[11px] font-mono uppercase tracking-[0.3px]',
        'text-n-600 hover:bg-n-100 hover:text-n-900',
        collapsed ? 'justify-center w-full px-0' : '',
      ].join(' ')}
      title={locale === 'en' ? 'Passer en français' : 'Switch to English'}
      aria-label="Language"
    >
      <Languages className="w-3.5 h-3.5 shrink-0" />
      {!collapsed && <span>{locale === 'en' ? 'EN · FR' : 'FR · EN'}</span>}
    </button>
  );
}
