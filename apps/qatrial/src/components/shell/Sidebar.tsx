/**
 * Sidebar XOR :
 * - hors dossier → palier 1 (sections ; Accueil = topbar OK)
 * - dossier ouvert → palier 2 uniquement (retour via top Accueil / breadcrumb)
 */
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  PROJECT_NAV_GROUPS,
  SETTINGS_ENTRY,
  isProjectScopePath,
  projectPath,
} from '../../navigation/nav-config';
import {
  APP_SECTION_CARDS,
  HOME_PATH,
  projectHubPath,
} from '../../navigation/hub-config';
import { useProjectStore } from '../../store/useProjectStore';
import { getProjectId } from '../../lib/projectUtils';

const SIDEBAR_KEY = 'qatrial:sidebar-collapsed';
const GROUPS_KEY = 'qatrial:sidebar-groups';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

function readOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    /* ignore */
  }
  return Object.fromEntries(PROJECT_NAV_GROUPS.map((g) => [g.id, true]));
}

interface SidebarProps {
  projectSelect?: React.ReactNode;
}

export function Sidebar({ projectSelect }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);
  const inProject = isProjectScopePath(location.pathname);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [openGroups, setOpenGroups] = useState(readOpenGroups);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const onHome =
    location.pathname === HOME_PATH ||
    location.pathname === '/app' ||
    location.pathname === '/app/';

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center rounded-md text-[11.5px] font-normal leading-snug transition-colors',
      collapsed ? 'size-9 justify-center' : 'gap-2 px-2 py-1.5',
      active
        ? 'bg-accent-subtle font-medium text-accent'
        : 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary',
    );

  return (
    <aside
      className={cn(
        'hidden md:flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-[15.5rem]',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          collapsed ? 'justify-center' : 'justify-between gap-2',
        )}
      >
        {!collapsed && (
          <p className="truncate text-[12px] font-semibold text-text-primary">
            {inProject ? (project?.name ?? 'Dossier') : 'QAtrial'}
          </p>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
          title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>      </div>

      {inProject && !collapsed && projectSelect ? (
        <div className="border-b border-border px-3 py-2">{projectSelect}</div>
      ) : null}

      <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto p-2.5', collapsed && 'items-center')}>
        {!inProject ? (
          <>
            <NavLink to={HOME_PATH} end title="Accueil" className={() => linkClass(onHome)}>
              <LayoutGrid className="size-3.5 shrink-0 opacity-80" />
              {!collapsed && <span className="truncate">Accueil</span>}
            </NavLink>

            {APP_SECTION_CARDS.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  title={item.title}
                  className={() => linkClass(active)}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </NavLink>
              );
            })}
          </>
        ) : projectId ? (
          <>
            <NavLink
              to={projectHubPath(projectId)}
              end
              title="Domaines"
              className={({ isActive }) => linkClass(isActive)}
            >
              <LayoutGrid className="size-3.5 shrink-0 opacity-80" />
              {!collapsed && <span className="truncate">Domaines</span>}
            </NavLink>

            {PROJECT_NAV_GROUPS.map((group) => {
              const open = openGroups[group.id] !== false;
              const groupActive = group.items.some((item) =>
                location.pathname.endsWith(`/${item.path}`),
              );
              return (
                <div
                  key={group.id}
                  className={cn('mt-1 flex flex-col gap-0.5', collapsed && 'items-center')}
                >
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide',
                        groupActive
                          ? 'text-accent'
                          : 'text-text-tertiary hover:text-text-secondary',
                      )}
                    >
                      {t(group.labelKey)}
                      <ChevronDown
                        className={cn('size-3 transition-transform', !open && '-rotate-90')}
                      />
                    </button>
                  )}
                  {(collapsed || open) &&
                    group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.id}
                          to={projectPath(projectId, item.path)}
                          title={t(item.labelKey)}
                          className={({ isActive }) => linkClass(isActive)}
                        >
                          <Icon className="size-3.5 shrink-0 opacity-80" />
                          {!collapsed && (
                            <span className="truncate">{t(item.labelKey)}</span>
                          )}
                        </NavLink>
                      );
                    })}
                </div>
              );
            })}
          </>
        ) : null}
      </nav>

      {inProject ? (
        <div
          className={cn(
            'border-t border-border p-2.5',
            collapsed && 'flex flex-col items-center gap-1',
          )}
        >
          <NavLink
            to={SETTINGS_ENTRY.path}
            title={t(SETTINGS_ENTRY.labelKey)}
            className={({ isActive }) =>
              linkClass(isActive || location.pathname.startsWith('/app/settings'))
            }
          >
            <SETTINGS_ENTRY.icon className="size-3.5" />
            {!collapsed && t(SETTINGS_ENTRY.labelKey)}
          </NavLink>
        </div>
      ) : null}
    </aside>
  );
}

export { Sidebar as AppSidebar };
