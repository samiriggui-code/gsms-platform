/**
 * Layout `/app/projects/:projectId` — synchronise l'URL vers le store.
 *
 * Les pages métier lisent `useProjectStore` / `useProjectData`.
 * Ce layout lit le paramètre d'URL et aligne le projet actif.
 * Si l'id est inconnu (liste déjà chargée) → retour au portefeuille.
 */
import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useProjectData } from '../../context/ProjectDataContext';

function TabSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

export function ProjectScopeLayout() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { projects, loading: projectsLoading, activeProject, setActiveProject } =
    useProjectData();

  const matched = projects.find((candidate) => candidate.id === projectId) ?? null;

  useEffect(() => {
    if (projectsLoading || !projectId || !matched) return;
    if (activeProject?.id === matched.id) return;
    setActiveProject(matched);
  }, [activeProject?.id, matched, projectId, projectsLoading, setActiveProject]);

  if (!projectId) {
    return <Navigate to="/app/projects" replace />;
  }

  // Liste dossiers en cours — pas exigences/tests
  if (projectsLoading) {
    return <TabSpinner />;
  }

  if (!matched) {
    // Dossier inconnu / plus dans la liste → portefeuille (pas Accueil)
    return <Navigate to="/app/projects" replace />;
  }

  // Aligner le store avant de monter les pages (effet ci-dessus)
  if (activeProject?.id !== projectId) {
    return <TabSpinner />;
  }

  return <Outlet />;
}
