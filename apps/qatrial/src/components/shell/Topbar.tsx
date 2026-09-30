/**
 * Chrome global — logo + recherche + notifs + langue (flag) + thème + user (avatar seul).
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, UserRound } from 'lucide-react';
import { GlobalSearch } from '../shared/GlobalSearch';
import { NotificationInbox } from '../shared/NotificationInbox';
import { LanguageMenu } from './LanguageMenu';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar } from '../hifi';
import { useAuth } from '../../hooks/useAuth';
import { useAppMode } from '../../hooks/useAppMode';
import { useUserPrefsStore } from '../../store/useUserPrefsStore';
import { cn } from '../../lib/cn';
import { HOME_PATH } from '../../navigation/hub-config';

interface TopbarProps {
  className?: string;
}

export function Topbar({ className }: TopbarProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { apiUrl } = useAppMode();
  const avatarSrc = useUserPrefsStore((s) =>
    user?.id ? s.avatars[user.id] ?? null : null,
  );

  const displayName = isAuthenticated && user ? user.name : '—';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <MobileNav />

        <Link to={HOME_PATH} className="flex shrink-0 items-center gap-2" title="Accueil">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end">
            <span className="text-xs font-bold text-white">QA</span>
          </div>
          <span className="hidden text-base font-semibold tracking-tight text-text-primary sm:inline">
            {t('app.name')}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearch />
        <NotificationInbox />
        <LanguageMenu />
        <ThemeToggle />

        <div className="ml-1 border-l border-border pl-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex rounded-full outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label={t('settings.nav.profile', { defaultValue: 'Profil' })}
              title={displayName}
            >
              <Avatar name={displayName} src={avatarSrc} size="md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-1 font-normal normal-case tracking-normal">
                <p className="truncate text-[13px] font-medium text-text-primary">{displayName}</p>
                {user?.email ? (
                  <p className="truncate text-[12px] text-text-secondary">{user.email}</p>
                ) : null}
                {user?.role ? (
                  <p className="font-mono text-[11px] text-text-tertiary">{user.role}</p>
                ) : null}
                <p className="pt-0.5 text-[11px] leading-snug text-text-tertiary">
                  {t('auth.serverModeHint', { url: apiUrl ?? '—' })}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/settings/profile">
                  <UserRound className="size-4" />
                  {t('settings.nav.profile', { defaultValue: 'Profil' })}
                </Link>
              </DropdownMenuItem>
              {isAuthenticated && (
                <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
                  <LogOut className="size-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export { Topbar as AppHeader };
