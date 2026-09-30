import { useEffect, useMemo, useState, lazy, Suspense, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { ShellLayout } from '../shell';
import { useProjectStore } from '../../store/useProjectStore';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useAppMode } from '../../hooks/useAppMode';
import { useApiProjects } from '../../hooks/useApiProjects';
import { useApiRequirements } from '../../hooks/useApiRequirements';
import { useApiTests } from '../../hooks/useApiTests';
import { useApiAudit } from '../../hooks/useApiAudit';
import { ProjectDataProvider } from '../../context/ProjectDataContext';
import { getProjectId } from '../../lib/projectUtils';
import { currentProjectNavSlug, projectPath } from '../../navigation/nav-config';
import { projectEntryPath } from '../../navigation/hub-config';

const SetupWizard = lazy(() =>
  import('../wizard/SetupWizard').then((m) => ({ default: m.SetupWizard })),
);

function TabSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const clearProject = useProjectStore((s) => s.clearProject);
  const requirements = useRequirementsStore((s) => s.requirements);
  const setRequirements = useRequirementsStore((s) => s.setRequirements);
  const tests = useTestsStore((s) => s.tests);
  const setTests = useTestsStore((s) => s.setTests);

  const { mode } = useAppMode();
  const isServerMode = mode === 'server';

  const {
    projects,
    loading: projectsLoading,
    activeProject,
    setActiveProject,
    refetch: refetchProjects,
  } = useApiProjects(isServerMode);
  const activeProjectId = isServerMode ? activeProject?.id ?? getProjectId(project) : '';
  const requirementApi = useApiRequirements(activeProjectId);
  const testApi = useApiTests(activeProjectId);
  const auditApi = useApiAudit(activeProjectId);

  const [showWizard, setShowWizard] = useState(false);
  const [confirmNewProject, setConfirmNewProject] = useState(false);

  // Quitter le wizard si on navigue ailleurs (sidebar / Accueil)
  useEffect(() => {
    setShowWizard(false);
  }, [location.pathname]);

  /**
   * Alignement projet actif.
   * Sur `/app/projects/:id/...` l’URL gagne toujours — sinon le store
   * (dernier dossier) réécrase le clic et ProjectScopeLayout reste en spinner.
   */
  useEffect(() => {
    if (!isServerMode || projectsLoading) return;

    if (projects.length === 0) {
      setActiveProject(null);
      clearProject();
      setRequirements([], 1);
      setTests([], 1);
      useAuditStore.setState({ entries: [] });
      return;
    }

    const urlMatch = location.pathname.match(/^\/app\/projects\/([^/]+)/);
    const urlProjectId = urlMatch?.[1] ?? null;
    if (urlProjectId) {
      const fromUrl = projects.find((candidate) => candidate.id === urlProjectId);
      if (fromUrl && activeProject?.id !== fromUrl.id) {
        setActiveProject(fromUrl);
      }
      return;
    }

    const storedProjectId = getProjectId(project);
    if (storedProjectId) {
      const matchedProject = projects.find((candidate) => candidate.id === storedProjectId);
      if (matchedProject && activeProject?.id !== matchedProject.id) {
        setActiveProject(matchedProject);
        return;
      }
    }

    if (!activeProject) {
      setActiveProject(projects[0]);
    }
  }, [
    activeProject,
    clearProject,
    isServerMode,
    location.pathname,
    project,
    projects,
    projectsLoading,
    setActiveProject,
    setRequirements,
    setTests,
  ]);

  useEffect(() => {
    if (!isServerMode || !activeProject) return;
    if (getProjectId(project) === activeProject.id) return;
    setProject(activeProject);
  }, [activeProject, isServerMode, project, setProject]);

  // Au switch de dossier : vider stores tout de suite (évite graphe de l’ancien dossier → freeze).
  const prevProjectIdRef = useRef(activeProjectId);
  useEffect(() => {
    if (!isServerMode) return;
    if (prevProjectIdRef.current === activeProjectId) return;
    prevProjectIdRef.current = activeProjectId;
    setRequirements([], 1);
    setTests([], 1);
    useAuditStore.setState({ entries: [] });
  }, [activeProjectId, isServerMode, setRequirements, setTests]);

  useEffect(() => {
    if (!isServerMode) return;
    const next = requirementApi.requirements;
    const current = useRequirementsStore.getState().requirements;
    if (current === next) return;
    setRequirements(next, next.length + 1);
  }, [isServerMode, requirementApi.requirements, setRequirements]);

  useEffect(() => {
    if (!isServerMode) return;
    const next = testApi.tests;
    const current = useTestsStore.getState().tests;
    if (current === next) return;
    setTests(next, next.length + 1);
  }, [isServerMode, setTests, testApi.tests]);

  useEffect(() => {
    if (!isServerMode) return;
    if (useAuditStore.getState().entries === auditApi.entries) return;
    useAuditStore.setState({ entries: auditApi.entries });
  }, [auditApi.entries, isServerMode]);

  const hasLocalData = project !== null || requirements.length > 0 || tests.length > 0;
  /**
   * Le wizard ne s'ouvre plus QUE sur action explicite.
   *
   * Avant : `showWizard || projects.length === 0` — sans projet, il prenait
   * l'écran entier sur TOUTES les routes. Effet de bord constaté : impossible
   * d'atteindre la moindre page tant qu'aucun dossier n'existait, et les
   * captures de référence de la refonte photographiaient le wizard au lieu des
   * pages. L'absence de dossier se gère désormais dans le portefeuille, qui a
   * un état vide et un bouton de création.
   */
  const wizardVisible = showWizard;
  /**
   * Bloquer le shell UNIQUEMENT pendant le fetch de la liste dossiers.
   * Avant : on attendait aussi exigences+tests → à chaque ouverture de dossier
   * ShellLayout démontait l’Outlet (spinner) et ProjectScopeLayout voyait
   * `loading=true` via le même flag → page qui « tourne » / bounce vers Accueil.
   */
  const shellBlocking = !wizardVisible && projectsLoading;

  const projectDataValue = useMemo(
    () => ({
      isServerMode,
      /** Liste dossiers seulement — pas le fetch exigences/tests. */
      loading: projectsLoading,
      projects,
      activeProject,
      setActiveProject,
      refetchProjects,
      createRequirement: requirementApi.create,
      updateRequirement: requirementApi.update,
      removeRequirement: requirementApi.remove,
      createTest: testApi.create,
      updateTest: testApi.update,
      removeTest: testApi.remove,
      refetchAudit: auditApi.refetch,
    }),
    [
      activeProject,
      auditApi.refetch,
      isServerMode,
      projects,
      projectsLoading,
      refetchProjects,
      requirementApi.create,
      requirementApi.remove,
      requirementApi.update,
      setActiveProject,
      testApi.create,
      testApi.remove,
      testApi.update,
    ],
  );

  const handleNewProject = () => {
    if (isServerMode) {
      setShowWizard(true);
      return;
    }
    if (hasLocalData) {
      setConfirmNewProject(true);
    } else {
      setShowWizard(true);
    }
  };

  const handleConfirmNewProject = () => {
    if (isServerMode) {
      setConfirmNewProject(false);
      setShowWizard(true);
      return;
    }
    useRequirementsStore.getState().setRequirements([], 1);
    useTestsStore.getState().setTests([], 1);
    clearProject();
    setConfirmNewProject(false);
    setShowWizard(true);
  };

  const projectSelect =
    isServerMode && projects.length > 0 ? (
      <select
        value={activeProject?.id ?? ''}
        onChange={(event) => {
          const nextProject = projects.find((candidate) => candidate.id === event.target.value) ?? null;
          if (!nextProject) return;
          const slug = currentProjectNavSlug(location.pathname);
          if (slug && slug !== 'domains' && slug !== 'hub') {
            navigate(projectPath(nextProject.id, slug));
            return;
          }
          navigate(projectEntryPath(nextProject.id));
        }}
        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        aria-label="Project"
      >
        {projects.map((serverProject) => (
          <option key={serverProject.id} value={serverProject.id}>
            {serverProject.name}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <ProjectDataProvider value={projectDataValue}>
      <ShellLayout
        projectSelect={projectSelect}
        loading={shellBlocking}
        bleed={wizardVisible}
      >
        {wizardVisible ? (
          <Suspense fallback={<TabSpinner />}>
            <SetupWizard onComplete={() => setShowWizard(false)} />
          </Suspense>
        ) : (
          <Outlet context={{ onNewProject: handleNewProject }} />
        )}
      </ShellLayout>

      <ConfirmDialog
        open={confirmNewProject}
        title={t('confirm.newProjectTitle')}
        message={t('confirm.newProjectMessage')}
        onConfirm={handleConfirmNewProject}
        onCancel={() => setConfirmNewProject(false)}
      />
    </ProjectDataProvider>
  );
}
