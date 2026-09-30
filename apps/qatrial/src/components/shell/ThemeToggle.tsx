/**
 * Switch clair / sombre — header.
 */
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { cn } from '../../lib/cn';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg',
        'text-text-secondary outline-none hover:bg-surface-hover',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
