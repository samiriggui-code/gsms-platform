/**
 * Accueil = une page, cards = sections du 1er palier (comme gsms-school).
 * Couleurs : neutres + accent CRM #4f56e5 (déjà dans tokens QAtrial).
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  FolderKanban,
  ClipboardList,
  FlaskConical,
  BarChart3,
  RefreshCw,
  TriangleAlert,
  ClipboardCheck,
  GitBranch,
  FileCheck,
  FormInput,
  AlertTriangle,
  Workflow,
  FileText,
  Clock,
  Server,
  Building2,
  GraduationCap,
  CheckSquare,
  Gauge,
  Shield,
  Settings,
} from 'lucide-react';
import { PROJECT_NAV_GROUPS, SETTINGS_ENTRY, projectPath, type NavItem } from './nav-config';

export interface HubCardDef {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  chips?: { label: string; path?: string }[];
  badgeCount?: number;
}

/** Entrées sidebar palier 1 + cards Accueil — même liste. Pas de sous-puces. */
export const APP_SECTION_CARDS: HubCardDef[] = [
  {
    id: 'dossiers',
    title: 'Dossiers',
    description: 'Tous les chantiers qualité : état, avancement, ouverture d’un dossier.',
    path: '/app/projects',
    icon: FolderKanban,
  },
  {
    id: 'systems',
    title: 'Inventaire des systèmes',
    description: 'Catalogue des systèmes informatisés et de sûreté, partagé entre dossiers.',
    path: '/app/systems',
    icon: Server,
  },
  {
    id: 'suppliers',
    title: 'Fournisseurs',
    description: 'Référentiel et qualification fournisseurs.',
    path: '/app/suppliers',
    icon: Building2,
  },
  {
    id: 'training',
    title: 'Formation',
    description: 'Cours, matrice et conformité formation.',
    path: '/app/training',
    icon: GraduationCap,
  },
  {
    id: 'tasks',
    title: 'Tâches',
    description: 'Inbox des tâches assignées sur tous les dossiers.',
    path: '/app/tasks',
    icon: CheckSquare,
  },
  {
    id: 'kpi',
    title: 'KPI',
    description: 'Tableaux de bord KPI de l’organisation.',
    path: '/app/kpi',
    icon: Gauge,
  },
  {
    id: 'forms',
    title: 'Formulaires',
    description: 'Modèles et soumissions — transverse à l’organisation.',
    path: '/app/forms',
    icon: FormInput,
  },
  {
    id: 'workflows',
    title: 'Flux de travail',
    description: 'Templates et exécutions de workflows — transverse à l’organisation.',
    path: '/app/workflows',
    icon: Workflow,
  },
  {
    id: 'scheduled_reports',
    title: 'Rapports planifiés',
    description: 'Planifications et envois récurrents — transverse à l’organisation.',
    path: '/app/scheduled-reports',
    icon: Clock,
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Thème, équipe, intégrations, import/export et journal d’audit.',
    path: SETTINGS_ENTRY.path,
    icon: Settings,
  },
];

export const ACCUEIL_CARDS = APP_SECTION_CARDS;

export const REFERENTIELS_CARDS = APP_SECTION_CARDS.filter((c) =>
  ['systems', 'suppliers', 'training'].includes(c.id),
);

export const PILOTAGE_CARDS = APP_SECTION_CARDS.filter((c) =>
  ['tasks', 'kpi', 'forms', 'workflows', 'scheduled_reports'].includes(c.id),
);

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  quality: ClipboardList,
  compliance: Shield,
  documents: FileCheck,
  organization: AlertTriangle,
  reports: FileText,
};

const DOMAIN_META: Record<string, { title: string; description: string }> = {
  quality: {
    title: 'Qualité opérationnelle',
    description: 'Exigences, tests et évaluation de couverture.',
  },
  compliance: {
    title: 'Conformité réglementaire',
    description: 'Changements, déviations, audits, impact.',
  },
  documents: {
    title: 'Documents & preuves',
    description: 'Preuves documentaires rattachées au dossier.',
  },
  organization: {
    title: 'Organisation',
    description: 'Réclamations liées au dossier.',
  },
  reports: {
    title: 'Rapports',
    description: 'Génération de rapports pour ce dossier.',
  },
};

const LEAF_META: Record<string, { title: string; description: string }> = {
  requirements: { title: 'Exigences', description: 'Liste et statut des exigences du dossier.' },
  tests: { title: 'Tests', description: 'Protocoles et exécutions de tests.' },
  dashboard: { title: 'Évaluation', description: 'Vue d’évaluation et sous-vues analytiques.' },
  change_control: { title: 'Maîtrise des changements', description: 'Demandes de changement.' },
  deviations: { title: 'Déviations', description: 'Écarts et non-conformités.' },
  audit_records: { title: 'Audits', description: 'Enregistrements d’audit.' },
  impact: { title: 'Analyse d’impact', description: 'Impact entre entités du dossier.' },
  documents: { title: 'Documents', description: 'Documents et preuves rattachés.' },
  forms: { title: 'Formulaires', description: 'Formulaires et soumissions.' },
  complaints: { title: 'Réclamations', description: 'Réclamations liées au dossier.' },
  workflows: { title: 'Flux de travail', description: 'Exécutions de workflows.' },
  reports: { title: 'Rapports', description: 'Génération de rapports.' },
  scheduled_reports: { title: 'Rapports planifiés', description: 'Planifications de rapports.' },
};

/** Ouverture d’un dossier = Évaluation (état couverture / traçabilité). */
export function projectEntryPath(projectId: string): string {
  return projectPath(projectId, 'dashboard');
}

/** Hub MenuCard des domaines (accès secondaire via « Domaines »). */
export function projectHubPath(projectId: string): string {
  return `/app/projects/${projectId}/hub`;
}

export function domainHubPath(projectId: string, domainId: string): string {
  return `/app/projects/${projectId}/domains/${domainId}`;
}

export function projectDomainCards(projectId: string): HubCardDef[] {
  return PROJECT_NAV_GROUPS.map((group) => {
    const meta = DOMAIN_META[group.id];
    return {
      id: group.id,
      title: meta?.title ?? group.id,
      description: meta?.description ?? '',
      path: domainHubPath(projectId, group.id),
      icon: DOMAIN_ICONS[group.id] ?? LayoutGrid,
      badgeCount: group.items.length,
    };
  });
}

const LEAF_ICONS: Record<string, LucideIcon> = {
  requirements: ClipboardList,
  tests: FlaskConical,
  dashboard: BarChart3,
  change_control: RefreshCw,
  deviations: TriangleAlert,
  audit_records: ClipboardCheck,
  impact: GitBranch,
  documents: FileCheck,
  forms: FormInput,
  complaints: AlertTriangle,
  workflows: Workflow,
  reports: FileText,
  scheduled_reports: Clock,
};

export function domainLeafCards(projectId: string, domainId: string): HubCardDef[] {
  const group = PROJECT_NAV_GROUPS.find((g) => g.id === domainId);
  if (!group) return [];
  return group.items.map((navItem: NavItem) => {
    const meta = LEAF_META[navItem.id];
    return {
      id: navItem.id,
      title: meta?.title ?? navItem.id,
      description: meta?.description ?? '',
      path: `/app/projects/${projectId}/${navItem.path}`,
      icon: LEAF_ICONS[navItem.id] ?? navItem.icon,
    };
  });
}

export const HOME_PATH = '/app/accueil';
