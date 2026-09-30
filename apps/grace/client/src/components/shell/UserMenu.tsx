/**
 * Header avatar menu — account details only inside the dropdown.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LogOut, Settings, User } from 'lucide-react';
import { Avatar } from '../hifi/Avatar';
import { useAuthStore } from '../../stores/auth';
import { useAuthAvatarUrl } from '../../lib/useAuthAvatarUrl';
import { useT } from '../../i18n';

export function UserMenu() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const avatarUrl = useAuthAvatarUrl(user?.hasAvatar);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  function handleLogout() {
    setOpen(false);
    if (!window.confirm(`${t('common.signOut')} — GSMS engine?`)) return;
    logout();
    window.location.href = '/login';
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={[
          'inline-flex size-8 items-center justify-center rounded-r2',
          'hover:bg-n-100 transition-colors',
          open ? 'bg-n-100 ring-1 ring-border' : '',
        ].join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={fullName}
        title={fullName}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={fullName} src={avatarUrl} size="sm" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-r3 border border-border bg-card shadow-sh2 py-1.5"
        >
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Avatar name={fullName} src={avatarUrl} size="md" />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-n-900 truncate">
                  {fullName}
                </div>
                <div className="text-[11px] text-n-500 truncate">{user.email}</div>
                <div className="text-[10px] font-mono text-n-500 mt-0.5 tracking-[0.3px]">
                  {user.role}
                  {organization ? ` · ${organization.name}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <Link
              role="menuitem"
              to="/profile"
              className="flex items-center gap-2.5 mx-1 px-2.5 h-8 rounded-r2 text-[12.5px] text-n-700 hover:bg-n-100"
              onClick={() => setOpen(false)}
            >
              <User className="w-4 h-4 text-n-500" />
              {t('shell.userMenu.profile')}
            </Link>
            <Link
              role="menuitem"
              to="/admin/settings"
              className="flex items-center gap-2.5 mx-1 px-2.5 h-8 rounded-r2 text-[12.5px] text-n-700 hover:bg-n-100"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4 text-n-500" />
              {t('nav.settings')}
            </Link>
          </div>

          <div className="border-t border-border pt-1 mt-0.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-[calc(100%-8px)] items-center gap-2.5 mx-1 px-2.5 h-8 rounded-r2 text-[12.5px] text-bad hover:bg-bad-bg"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t('common.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

