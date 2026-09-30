/**
 * Chrome dossier — fil d’Ariane uniquement (pas d’onglets peers).
 * Navigation métier = hubs MenuCard (ProjectHub / DomainHub).
 */
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_APP_PATH, PROJECT_NAV_GROUPS } from '../../navigation/nav-config';
import { projectEntryPath } from '../../navigation/hub-config';
import { useProjectStore } from '../../store/useProjectStore';

interface ProjectChromeProps {
  projectSelect?: ReactNode;
  onNewProject: () => void;
}

export function ProjectChrome({ projectSelect }: ProjectChromeProps) {
  const { t } = useTranslation();
  const { projectId = '', domainId } = useParams();
  const project = useProjectStore((s) => s.project);
  const domain = domainId
    ? PROJECT_NAV_GROUPS.find((g) => g.id === domainId)
    : null;

  return (
    <div className="sticky top-14 z-30 border-b border-border bg-surface">
      <div className="flex h-11 items-center gap-2 px-3 sm:px-4">
        <Link
          to="/app/projects"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">
            {t('portfolio.title', { defaultValue: 'Dossiers' })}
          </span>
        </Link>

        <span className="text-border" aria-hidden>
          /
        </span>

        <Link
          to={projectId ? projectEntryPath(projectId) : DEFAULT_APP_PATH}
          className="truncate text-sm font-semibold text-text-primary hover:text-accent"
        >
          {project?.name ?? '…'}
        </Link>

        {domain ? (
          <>
            <span className="text-border" aria-hidden>
              /
            </span>
            <span className="truncate text-sm text-text-secondary">{t(domain.labelKey)}</span>
          </>
        ) : null}

        {projectSelect ? (
          <div className="ml-auto hidden max-w-[14rem] sm:block">{projectSelect}</div>
        ) : null}
      </div>
    </div>
  );
}
