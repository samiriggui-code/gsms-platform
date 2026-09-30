import { Outlet, Link, useLocation } from '@tanstack/react-router';
import {
  Paintbrush,
  Users as UsersIcon,
  ShieldCheck,
  Building2,
  Info,
  GitBranch,
  Hexagon,
  AlertTriangle,
  Anchor,
  Package,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { Topbar } from '../shell/Topbar';
import { useAuthStore } from '../../stores/auth';
import { hasPermission, type Permission } from '../../lib/permissions';
import { useT } from '../../i18n';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  perm: Permission;
}
interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    labelKey: 'settingsNav.appearance',
    items: [
      { to: '/admin/settings/appearance/asset-roles', labelKey: 'settingsNav.assetRoles', icon: ShieldCheck, perm: 'org:manage' },
      { to: '/admin/settings/appearance/asset-types', labelKey: 'settingsNav.assetTypes', icon: Hexagon, perm: 'org:manage' },
      { to: '/admin/settings/appearance/edges', labelKey: 'settingsNav.edgeStyles', icon: GitBranch, perm: 'org:manage' },
      { to: '/admin/settings/appearance/node-ports', labelKey: 'settingsNav.nodePorts', icon: Anchor, perm: 'org:manage' },
      { to: '/admin/settings/appearance/risk-levels', labelKey: 'settingsNav.riskLevels', icon: AlertTriangle, perm: 'org:manage' },
    ],
  },
  {
    labelKey: 'settingsNav.access',
    items: [
      { to: '/admin/settings/users', labelKey: 'settingsNav.users', icon: UsersIcon, perm: 'users:manage' },
      { to: '/admin/settings/roles', labelKey: 'settingsNav.roles', icon: ShieldCheck, perm: 'org:manage' },
    ],
  },
  {
    labelKey: 'settingsNav.templates',
    items: [
      { to: '/admin/settings/template-packages', labelKey: 'settingsNav.packages', icon: Package, perm: 'templates:manage' },
    ],
  },
  {
    labelKey: 'settingsNav.organization',
    items: [
      { to: '/admin/settings/organization', labelKey: 'settingsNav.general', icon: Building2, perm: 'org:manage' },
    ],
  },
  {
    labelKey: 'settingsNav.system',
    items: [
      { to: '/admin/settings/glossary', labelKey: 'settingsNav.glossary', icon: BookOpen, perm: 'org:manage' },
      { to: '/admin/settings/about', labelKey: 'settingsNav.about', icon: Info, perm: 'org:manage' },
    ],
  },
];

export function SettingsLayout() {
  const t = useT();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t('nav.settings')}
        subtitle={t('nav.settingsSubtitle')}
        breadcrumbs={
          <span>
            {t('nav.admin')} <span className="text-n-300 mx-1">/</span> {t('nav.settings')}
          </span>
        }
        actions={
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-n-500 tracking-[0.4px]">
            <Paintbrush className="w-3 h-3" />
            customizable
          </span>
        }
      />

      <div className="flex-1 grid grid-cols-[220px_1fr] overflow-hidden">
        <aside className="border-r border-n-150 bg-n-50/40 overflow-y-auto py-3">
          {NAV.map((group) => {
            const visible = group.items.filter((it) => hasPermission(user?.role, it.perm));
            if (visible.length === 0) return null;
            return (
              <div key={group.labelKey} className="mb-3">
                <div className="px-4 mb-1 text-[10px] font-mono uppercase text-n-500 tracking-[0.4px]">
                  {t(group.labelKey)}
                </div>
                {visible.map((item) => {
                  const active = location.pathname === item.to
                    || (item.to.includes('/appearance/') && location.pathname.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={[
                        'flex items-center gap-2.5 h-8 px-3 mx-1.5 rounded-r2 text-[12.5px]',
                        active
                          ? 'bg-a-50 text-a-700 font-medium border-l-2 border-l-a-500 pl-[10px]'
                          : 'text-n-700 hover:bg-n-75',
                      ].join(' ')}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </aside>
        <main className="overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
