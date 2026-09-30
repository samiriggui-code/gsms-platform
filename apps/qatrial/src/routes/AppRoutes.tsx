import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProjectScopeLayout } from '../components/layout/ProjectScopeLayout';
import { PortfolioPage } from '../pages/PortfolioPage';
import { AccueilPage } from '../pages/AccueilPage';
import { ReferentielsPage } from '../pages/ReferentielsPage';
import { PilotagePage } from '../pages/PilotagePage';
import { ProjectHubPage } from '../pages/ProjectHubPage';
import { DomainHubPage } from '../pages/DomainHubPage';
import { SettingsLayout } from '../components/layout/SettingsLayout';
import {
  PROJECT_NAV_GROUPS,
  GLOBAL_NAV_GROUPS,
  GLOBAL_NAV_SLUGS,
  DEFAULT_APP_PATH,
  projectPath,
  globalPath,
  isGlobalNavSlug,
} from '../navigation/nav-config';
import { useProjectStore } from '../store/useProjectStore';
import { getProjectId } from '../lib/projectUtils';
import {
  SettingsAiPage,
  SettingsAuditTrailPage,
  SettingsGeneralPage,
  SettingsImportExportPage,
  SettingsIntegrationsPage,
  SettingsSignaturesPage,
  SettingsSsoPage,
  SettingsTeamPage,
  SettingsWebhooksPage,
} from '../components/settings/SettingsPages';
import { SettingsProfilePage } from '../components/settings/SettingsProfilePage';

const RequirementsPage = lazy(() =>
  import('../pages/RequirementsPage').then((m) => ({ default: m.RequirementsPage })),
);
const TestsPage = lazy(() =>
  import('../pages/TestsPage').then((m) => ({ default: m.TestsPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReportsPage = lazy(() =>
  import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const ComplaintsPage = lazy(() =>
  import('../pages/ComplaintsPage').then((m) => ({ default: m.ComplaintsPage })),
);
const SuppliersPage = lazy(() =>
  import('../pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const TrainingPage = lazy(() =>
  import('../pages/TrainingPage').then((m) => ({ default: m.TrainingPage })),
);
const DocumentsPage = lazy(() =>
  import('../pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const SystemsPage = lazy(() =>
  import('../pages/SystemsPage').then((m) => ({ default: m.SystemsPage })),
);
const ImpactPage = lazy(() =>
  import('../pages/ImpactPage').then((m) => ({ default: m.ImpactPage })),
);
const AuditsPage = lazy(() =>
  import('../pages/AuditsPage').then((m) => ({ default: m.AuditsPage })),
);
const WorkflowsPage = lazy(() =>
  import('../pages/WorkflowsPage').then((m) => ({ default: m.WorkflowsPage })),
);
const ChangeControlPage = lazy(() =>
  import('../pages/ChangeControlPage').then((m) => ({ default: m.ChangeControlPage })),
);
const DeviationsPage = lazy(() =>
  import('../pages/DeviationsPage').then((m) => ({
    default: m.DeviationsPage,
  })),
);
const TasksPage = lazy(() =>
  import('../pages/TasksPage').then((m) => ({ default: m.TasksPage })),
);
const KpiPage = lazy(() =>
  import('../pages/KpiPage').then((m) => ({ default: m.KpiPage })),
);
const FormsPage = lazy(() =>
  import('../pages/FormsPage').then((m) => ({ default: m.FormsPage })),
);
const ScheduledReportsPage = lazy(() =>
  import('../pages/ScheduledReportsPage').then((m) => ({ default: m.ScheduledReportsPage })),
);
const AuditModePage = lazy(() =>
  import('../pages/AuditModePage').then((m) => ({ default: m.AuditModePage })),
);
const SupplierPortalPage = lazy(() =>
  import('../pages/SupplierPortalPage').then((m) => ({ default: m.SupplierPortalPage })),
);

function TabSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

const PAGE_BY_ID: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  requirements: RequirementsPage,
  tests: TestsPage,
  dashboard: DashboardPage,
  reports: ReportsPage,
  complaints: ComplaintsPage,
  suppliers: SuppliersPage,
  training: TrainingPage,
  documents: DocumentsPage,
  systems: SystemsPage,
  impact: ImpactPage,
  audit_records: AuditsPage,
  workflows: WorkflowsPage,
  change_control: ChangeControlPage,
  deviations: DeviationsPage,
  tasks: TasksPage,
  kpi: KpiPage,
  forms: FormsPage,
  scheduled_reports: ScheduledReportsPage,
};

function LazyPage({ id }: { id: string }) {
  const Comp = PAGE_BY_ID[id];
  if (!Comp) return <Navigate to={DEFAULT_APP_PATH} replace />;
  return (
    <Suspense fallback={<TabSpinner />}>
      <Comp />
    </Suspense>
  );
}

/**
 * Anciennes URLs plates `/app/requirements` → projet actif, sinon portefeuille.
 * Les slugs org-wide (`/app/systems`…) sont de vraies routes, pas des redirects.
 */
function LegacyProjectRedirect({ slug }: { slug: string }) {
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);
  if (projectId) {
    return <Navigate to={projectPath(projectId, slug)} replace />;
  }
  return <Navigate to={DEFAULT_APP_PATH} replace />;
}

export function AppRoutes() {
  const projectLegacySlugs = PROJECT_NAV_GROUPS.flatMap((g) => g.items.map((item) => item.path));
  const globalItems = GLOBAL_NAV_GROUPS.flatMap((g) => g.items);

  return (
    <Routes>
      <Route
        path="/audit/:token"
        element={
          <Suspense fallback={<TabSpinner />}>
            <AuditTokenRoute />
          </Suspense>
        }
      />
      <Route
        path="/supplier/:token"
        element={
          <Suspense fallback={<TabSpinner />}>
            <SupplierTokenRoute />
          </Suspense>
        }
      />

      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to={DEFAULT_APP_PATH} replace />} />
        <Route path="accueil" element={<AccueilPage />} />
        <Route path="referentiels" element={<ReferentielsPage />} />
        <Route path="pilotage" element={<PilotagePage />} />
        <Route path="projects" element={<PortfolioPage />} />
        <Route path="projects/:projectId" element={<ProjectScopeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="hub" element={<ProjectHubPage />} />
          <Route path="domains/:domainId" element={<DomainHubPage />} />
          {PROJECT_NAV_GROUPS.flatMap((g) =>
            g.items.map((navItem) => (
              <Route
                key={navItem.id}
                path={navItem.path}
                element={<LazyPage id={navItem.id} />}
              />
            )),
          )}
          {/* Anciennes URLs projet pour écrans devenus globaux */}
          {GLOBAL_NAV_SLUGS.map((slug) => (
            <Route
              key={`project-global-${slug}`}
              path={slug}
              element={<Navigate to={globalPath(slug)} replace />}
            />
          ))}
        </Route>

        {/* Feuilles org */}
        {globalItems.map((navItem) => (
          <Route
            key={`global-${navItem.id}`}
            path={navItem.path}
            element={<LazyPage id={navItem.id} />}
          />
        ))}

        {/* Compat : anciennes routes plates `/app/:slug` (projet seulement) */}
        {projectLegacySlugs
          .filter((slug) => !isGlobalNavSlug(slug))
          .map((slug) => (
            <Route
              key={`legacy-${slug}`}
              path={slug}
              element={<LegacyProjectRedirect slug={slug} />}
            />
          ))}

        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<SettingsProfilePage />} />
          <Route path="general" element={<SettingsGeneralPage />} />
          <Route path="signatures" element={<SettingsSignaturesPage />} />
          <Route path="ai" element={<SettingsAiPage />} />
          <Route path="webhooks" element={<SettingsWebhooksPage />} />
          <Route path="integrations" element={<SettingsIntegrationsPage />} />
          <Route path="sso" element={<SettingsSsoPage />} />
          <Route path="team" element={<SettingsTeamPage />} />
          <Route path="import-export" element={<SettingsImportExportPage />} />
          <Route path="audit-trail" element={<SettingsAuditTrailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={DEFAULT_APP_PATH} replace />} />
    </Routes>
  );
}

function AuditTokenRoute() {
  const { token = '' } = useParams();
  return <AuditModePage token={token} />;
}

function SupplierTokenRoute() {
  const { token = '' } = useParams();
  return <SupplierPortalPage token={token} />;
}
