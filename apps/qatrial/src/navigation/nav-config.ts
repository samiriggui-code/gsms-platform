import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  FlaskConical,
  BarChart3,
  FileText,
  AlertTriangle,
  Building2,
  GraduationCap,
  FileCheck,
  Server,
  GitBranch,
  ClipboardCheck,
  Workflow,
  RefreshCw,
  TriangleAlert,
  CheckSquare,
  Gauge,
  FormInput,
  Clock,
  Settings,
  Bot,
  Webhook,
  Plug,
  Shield,
  Palette,
  Users,
  Download,
  ScrollText,
  PenLine,
  UserRound,
} from 'lucide-react';
import type { ViewTab } from '../types';

/**
 * Règle de placement (tranchée) :
 * - Menu principal (org) = tout ce qui n’est PAS lié à un projectId unique
 *   → systems, suppliers, training, tasks, kpi, forms, workflows, scheduled_reports, settings
 * - Menu dossier = données du dossier ouvert uniquement
 *   → exigences, tests, évaluation, conformité, documents, réclamations, rapports (génération)
 */
/** Screens under `/app/projects/:id/:slug` (excludes settings + org-wide). */
export type ProjectNavId = Exclude<
  ViewTab,
  | 'settings'
  | 'systems'
  | 'suppliers'
  | 'training'
  | 'tasks'
  | 'kpi'
  | 'scheduled_reports'
  | 'forms'
  | 'workflows'
>;

/** Org / workspace screens at `/app/:slug` (no projectId). */
export type GlobalNavId =
  | 'systems'
  | 'suppliers'
  | 'training'
  | 'tasks'
  | 'kpi'
  | 'scheduled_reports'
  | 'forms'
  | 'workflows';

/** Any app screen id except settings. */
export type AppNavId = ProjectNavId | GlobalNavId;

export interface NavItem {
  id: AppNavId;
  /** Segment d'URL, ex. `change-control` pour `change_control`. */
  path: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  labelKey: string;
  items: NavItem[];
}

export interface SettingsNavItem {
  id: string;
  path: string;
  labelKey: string;
  icon: LucideIcon;
}

function item(id: AppNavId, labelKey: string, icon: LucideIcon): NavItem {
  return { id, path: id.replace(/_/g, '-'), labelKey, icon };
}

/** Outils transverses org — hors périmètre dossier → menu principal. */
export const GLOBAL_NAV_GROUPS: NavGroup[] = [
  {
    id: 'transversal',
    labelKey: 'nav.groups.transversal',
    items: [
      item('tasks', 'nav.tasks', CheckSquare),
      item('kpi', 'nav.kpi', Gauge),
      item('systems', 'nav.systems', Server),
      item('suppliers', 'nav.suppliers', Building2),
      item('training', 'nav.training', GraduationCap),
      item('forms', 'nav.forms', FormInput),
      item('workflows', 'nav.workflows', Workflow),
      item('scheduled_reports', 'nav.scheduledReports', Clock),
    ],
  },
];

/** Palier PROJET — données projectId uniquement. */
export const PROJECT_NAV_GROUPS: NavGroup[] = [
  {
    id: 'quality',
    labelKey: 'nav.groups.quality',
    items: [
      /** Évaluation = état du dossier — première entrée à l’ouverture. */
      item('dashboard', 'nav.dashboard', BarChart3),
      item('requirements', 'nav.requirements', ClipboardList),
      item('tests', 'nav.tests', FlaskConical),
    ],
  },
  {
    id: 'compliance',
    labelKey: 'nav.groups.compliance',
    items: [
      item('change_control', 'nav.changeControl', RefreshCw),
      item('deviations', 'nav.deviations', TriangleAlert),
      item('audit_records', 'nav.auditRecords', ClipboardCheck),
      item('impact', 'nav.impact', GitBranch),
    ],
  },
  {
    id: 'documents',
    labelKey: 'nav.groups.documents',
    items: [item('documents', 'nav.documents', FileCheck)],
  },
  {
    id: 'organization',
    labelKey: 'nav.groups.organization',
    items: [item('complaints', 'nav.complaints', AlertTriangle)],
  },
  {
    id: 'reports',
    labelKey: 'nav.groups.reports',
    items: [
      /** Génération VSR / traçabilité = données du dossier courant. */
      item('reports', 'nav.reports', FileText),
    ],
  },
];

/** @deprecated Prefer GLOBAL_NAV_GROUPS + PROJECT_NAV_GROUPS. */
export const NAV_GROUPS: NavGroup[] = PROJECT_NAV_GROUPS;

export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', path: '/app/settings/profile', labelKey: 'settings.nav.profile', icon: UserRound },
  { id: 'general', path: '/app/settings/general', labelKey: 'settings.nav.general', icon: Palette },
  {
    id: 'signatures',
    path: '/app/settings/signatures',
    labelKey: 'settings.nav.signatures',
    icon: PenLine,
  },
  { id: 'ai', path: '/app/settings/ai', labelKey: 'settings.aiProviders', icon: Bot },
  { id: 'webhooks', path: '/app/settings/webhooks', labelKey: 'settings.webhooks', icon: Webhook },
  { id: 'integrations', path: '/app/settings/integrations', labelKey: 'settings.integrations', icon: Plug },
  { id: 'sso', path: '/app/settings/sso', labelKey: 'settings.sso', icon: Shield },
  { id: 'team', path: '/app/settings/team', labelKey: 'auth.team', icon: Users },
  { id: 'import-export', path: '/app/settings/import-export', labelKey: 'settings.nav.importExport', icon: Download },
  { id: 'audit-trail', path: '/app/settings/audit-trail', labelKey: 'audit.title', icon: ScrollText },
];

export const SETTINGS_ENTRY = {
  path: '/app/settings',
  labelKey: 'nav.settings',
  icon: Settings,
} as const;

const PROJECT_SLUG_TO_TAB = new Map<string, ProjectNavId>();
for (const group of PROJECT_NAV_GROUPS) {
  for (const navItem of group.items) {
    PROJECT_SLUG_TO_TAB.set(navItem.path, navItem.id as ProjectNavId);
  }
}

const GLOBAL_SLUG_TO_TAB = new Map<string, GlobalNavId>();
for (const group of GLOBAL_NAV_GROUPS) {
  for (const navItem of group.items) {
    GLOBAL_SLUG_TO_TAB.set(navItem.path, navItem.id as GlobalNavId);
  }
}

export const GLOBAL_NAV_SLUGS = [...GLOBAL_SLUG_TO_TAB.keys()];

export function isGlobalNavSlug(slug: string): boolean {
  return GLOBAL_SLUG_TO_TAB.has(slug);
}

/** Chemin org-wide : `/app/systems`, `/app/tasks`, … */
export function globalPath(tab: GlobalNavId | string): string {
  const slug = String(tab).replace(/_/g, '-');
  return `/app/${slug}`;
}

/** Chemin métier scopé par dossier. */
export function projectPath(projectId: string, tab: AppNavId | string = 'dashboard'): string {
  const raw = String(tab).replace(/_/g, '-');
  if (isGlobalNavSlug(raw)) {
    return globalPath(raw);
  }
  const slug =
    typeof tab === 'string' && !tab.includes('_') && PROJECT_SLUG_TO_TAB.has(tab)
      ? tab
      : raw;
  return `/app/projects/${projectId}/${slug}`;
}

/** Segment courant sous `/app/projects/:id/:slug`, ou null hors scope. */
export function currentProjectNavSlug(pathname: string): string | null {
  const match = pathname.match(/^\/app\/projects\/[^/]+\/([^/]+)/);
  return match?.[1] ?? null;
}

export function isProjectScopePath(pathname: string): boolean {
  return /^\/app\/projects\/[^/]+/.test(pathname);
}

export function pathToViewTab(pathname: string): AppNavId | 'settings' | null {
  if (pathname.startsWith('/app/settings')) return 'settings';
  if (pathname === '/app/projects' || pathname === '/app/projects/') return null;
  const projectSlug = currentProjectNavSlug(pathname);
  if (projectSlug) return PROJECT_SLUG_TO_TAB.get(projectSlug) ?? null;
  const globalMatch = pathname.match(/^\/app\/([^/]+)/);
  if (globalMatch && GLOBAL_SLUG_TO_TAB.has(globalMatch[1])) {
    return GLOBAL_SLUG_TO_TAB.get(globalMatch[1]) ?? null;
  }
  return null;
}

export function viewTabToPath(tab: ViewTab, projectId?: string | null): string {
  if (tab === 'settings') return '/app/settings';
  const slug = tab.replace(/_/g, '-');
  if (isGlobalNavSlug(slug)) return globalPath(slug);
  if (!projectId) return DEFAULT_APP_PATH;
  return projectPath(projectId, tab);
}

/**
 * Racine = Accueil MenuCard (pattern gsms-school).
 * Voir docs/QATRIAL-VUES-MENUCARD.md.
 */
export const DEFAULT_APP_PATH = '/app/accueil';
