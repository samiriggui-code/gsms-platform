import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SETTINGS_NAV } from '../../navigation/nav-config';
import { cn } from '../../lib/cn';

export function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden lg:flex-row lg:gap-5">
      <aside className="w-full shrink-0 lg:w-44">
        <h2 className="mb-2 text-[15px] font-semibold tracking-tight text-text-primary">
          {t('settings.title')}
        </h2>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-r2 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary',
                  )
                }
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">
                  {t(item.labelKey, {
                    defaultValue:
                      item.id === 'profile'
                        ? 'Profil'
                        : item.id === 'signatures'
                          ? 'Signature électronique'
                          : undefined,
                  })}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
