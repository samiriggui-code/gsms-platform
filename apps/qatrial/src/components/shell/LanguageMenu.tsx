/**
 * Sélecteur de langue — drapeaux SVG depuis public/media/flags.
 */
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '../../store/useLocaleStore';
import { LANG_FLAGS } from '../../lib/media';
import { cn } from '../../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR', flagSrc: LANG_FLAGS.fr },
  { code: 'en', label: 'English', short: 'EN', flagSrc: LANG_FLAGS.en },
] as const;

function FlagImg({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      className={cn('size-full object-cover', className)}
      draggable={false}
    />
  );
}

export function LanguageMenu() {
  useTranslation();
  const language = useLocaleStore((s) => s.language);
  const setLanguage = useLocaleStore((s) => s.setLanguage);
  const active = LANGUAGES.find((l) => language?.startsWith(l.code)) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-lg',
          'outline-none hover:bg-surface-hover',
          'focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
        aria-label={`Langue : ${active.label}`}
        title={active.label}
      >
        <span className="flex size-5 overflow-hidden rounded-full ring-1 ring-border shadow-sm">
          <FlagImg src={active.flagSrc} />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === active.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => setLanguage(lang.code)}
              className={cn(isActive && 'bg-accent-subtle text-accent')}
            >
              <span className="flex size-4 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                <FlagImg src={lang.flagSrc} />
              </span>
              <span className="flex-1">{lang.label}</span>
              <span className="font-mono text-[11px] text-text-tertiary">{lang.short}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
