import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  ListTodo,
  Boxes,
  Shield,
  ShieldCheck,
  FileText,
  History,
  Users,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  GitBranch,
  Package,
  MapPin,
  Inbox,
  ListTree,
  Lock,
} from 'lucide-react';

import { useAuthStore } from '../../stores/auth';
import { hasPermission } from '../../lib/permissions';
import type { Permission } from '../../lib/permissions';
import { useT } from '../../i18n';


interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  requires?: Permission;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.work',
    items: [
      { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/assessments', labelKey: 'nav.assessments', icon: ClipboardCheck },
      { to: '/surveys', labelKey: 'nav.surveys', icon: ClipboardCheck, requires: 'surveys:read' },
      { to: '/surveys/mine', labelKey: 'nav.mySurveys', icon: Inbox, requires: 'surveys:read' },
      { to: '/cluster-scopes', labelKey: 'nav.surveyScopes', icon: ClipboardCheck, requires: 'surveys:read' },
      { to: '/incidents', labelKey: 'nav.incidents', icon: AlertTriangle, requires: 'incidents:read' },
      { to: '/tasks', labelKey: 'nav.actionPlans', icon: ListTodo },
    ],
  },
  {
    labelKey: 'nav.catalog',
    items: [
      { to: '/assets', labelKey: 'nav.assets', icon: Boxes },
      { to: '/assets/tree', labelKey: 'nav.assetTree', icon: ListTree },
      { to: '/relationships', labelKey: 'nav.relationships', icon: GitBranch },
      { to: '/site-map', labelKey: 'nav.siteMap', icon: MapPin },
      { to: '/clusters', labelKey: 'nav.clusters', icon: Network },
      { to: '/threats', labelKey: 'nav.threats', icon: Shield },
      { to: '/countermeasures', labelKey: 'nav.countermeasures', icon: ShieldCheck },
      { to: '/admin/templates', labelKey: 'nav.templates', icon: Package, requires: 'templates:manage' },
    ],
  },
  {
    labelKey: 'nav.compliance',
    items: [
      { to: '/review', labelKey: 'nav.reviewQueue', icon: ClipboardCheck, requires: 'assessments:review' },
      { to: '/cyber', labelKey: 'nav.cyber', icon: Lock },
      { to: '/reports', labelKey: 'nav.reports', icon: FileText },
      { to: '/audit', labelKey: 'nav.auditLog', icon: History },
    ],
  },
  {
    labelKey: 'nav.admin',
    items: [
      { to: '/admin/settings/users', labelKey: 'nav.users', icon: Users, requires: 'users:manage' },
      { to: '/admin/sites', labelKey: 'nav.sites', icon: Building2, requires: 'assets:write' },
      { to: '/admin/survey-templates', labelKey: 'nav.surveyTemplates', icon: ClipboardCheck, requires: 'surveys:admin' },
      { to: '/admin/survey-config', labelKey: 'nav.surveyConfig', icon: Settings, requires: 'surveys:admin' },
      { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings, requires: 'org:manage' },
    ],
  },
];

const LS_KEY = 'csmp-sidebar-collapsed';

export function Sidebar() {
  const t = useT();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(LS_KEY) === '1',
  );
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    localStorage.setItem(LS_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <aside
      className={[
        'h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-[180ms]',
        collapsed ? 'w-[4.25rem]' : 'w-[15.5rem]',
      ].join(' ')}
    >
      <div
        className={[
          'flex items-center border-b border-sidebar-border h-12',
          collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-r2 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4f56e5 0%, #3436a4 100%)',
            }}
            aria-hidden
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold tracking-[-0.15px] text-n-900 truncate">
                {t('app.name')}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-8 h-8 flex items-center justify-center text-n-500 hover:bg-n-100 rounded-r2"
            aria-label={t('common.collapseSidebar')}
            title={t('common.collapseSidebar')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center border-b border-sidebar-border py-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center text-n-500 hover:bg-n-100 rounded-r2"
            aria-label={t('common.expandSidebar')}
            title={t('common.expandSidebar')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!collapsed && organization && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 mt-0.5 text-n-500 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-n-800">
                {organization.name}
              </p>
              <p className="truncate font-mono text-[10px] text-n-500 tracking-[0.3px]">
                {organization.slug}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav
        className={[
          'flex-1 overflow-y-auto py-2.5 px-2 flex flex-col gap-3',
          collapsed ? 'items-center' : '',
        ].join(' ')}
      >
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.requires || hasPermission(user?.role, item.requires),
          );
          if (visibleItems.length === 0) return null;
          return (
          <div
            key={group.labelKey}
            className={['flex flex-col gap-0.5', collapsed ? 'items-center' : ''].join(' ')}
          >
            {!collapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase text-n-500/80 tracking-wider">
                {t(group.labelKey)}
              </div>
            )}
            {visibleItems.map((item) => {
              const active =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              const label = t(item.labelKey);
              const cls = [
                'flex items-center rounded-r2 text-[12.5px] font-medium transition-colors',
                collapsed ? 'size-10 justify-center' : 'gap-2.5 h-9 px-2.5',
                active && !item.disabled
                  ? 'bg-a-500/10 text-a-600'
                  : '',
                item.disabled
                  ? 'text-n-400 cursor-not-allowed'
                  : !active
                  ? 'text-n-500 hover:text-n-900 hover:bg-n-100/70'
                  : '',
              ]
                .filter(Boolean)
                .join(' ');

              const content = (
                <>
                  <Icon
                    className={[
                      'w-[18px] h-[18px] shrink-0 opacity-80',
                      active && !item.disabled ? 'text-a-600 opacity-100' : '',
                    ].join(' ')}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && item.disabled && (
                    <span className="ml-auto text-[9px] font-mono uppercase text-n-400">
                      {t('common.comingSoon')}
                    </span>
                  )}
                </>
              );

              if (item.disabled) {
                return (
                  <span
                    key={item.to}
                    className={cls}
                    title={collapsed ? `${label} — ${t('common.comingSoon')}` : t('common.comingSoon')}
                  >
                    {content}
                  </span>
                );
              }

              return (
                <Link key={item.to} to={item.to} className={cls} title={collapsed ? label : undefined}>
                  {content}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>
    </aside>
  );
}
