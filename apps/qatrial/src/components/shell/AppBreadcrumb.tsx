/**
 * Fil d’Ariane sobre — neutres + accent CRM (#4f56e5 via tokens QAtrial).
 */
import { Fragment } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  APP_SECTION_CARDS,
  HOME_PATH,
  projectEntryPath,
} from '../../navigation/hub-config';
import {
  PROJECT_NAV_GROUPS,
  currentProjectNavSlug,
  isProjectScopePath,
} from '../../navigation/nav-config';
import { useProjectStore } from '../../store/useProjectStore';
import { getProjectId } from '../../lib/projectUtils';

type Crumb = { label: string; to?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Accueil', to: HOME_PATH }];

  if (pathname === HOME_PATH || pathname === '/app' || pathname === '/app/') {
    return crumbs;
  }

  if (pathname.startsWith('/app/settings')) {
    crumbs.push({ label: 'Paramètres' });
    return crumbs;
  }

  if (pathname === '/app/projects' || pathname === '/app/projects/') {
    crumbs.push({ label: 'Dossiers' });
    return crumbs;
  }

  const section = APP_SECTION_CARDS.find(
    (c) => pathname === c.path || pathname.startsWith(`${c.path}/`),
  );
  if (section && !pathname.startsWith('/app/projects/')) {
    crumbs.push({ label: section.title });
    return crumbs;
  }

  if (isProjectScopePath(pathname)) {
    crumbs.push({ label: 'Dossiers', to: '/app/projects' });
    return crumbs;
  }

  return crumbs;
}

export function AppBreadcrumb() {
  const location = useLocation();
  const { projectId = '', domainId } = useParams();
  const project = useProjectStore((s) => s.project);
  const activeId = projectId || getProjectId(project);

  let crumbs = buildCrumbs(location.pathname);

  if (isProjectScopePath(location.pathname) && activeId) {
    crumbs = [
      { label: 'Accueil', to: HOME_PATH },
      { label: 'Dossiers', to: '/app/projects' },
      {
        label: project?.name ?? 'Dossier',
        to: projectEntryPath(activeId),
      },
    ];

    const slug = currentProjectNavSlug(location.pathname);
    if (slug === 'hub') {
      crumbs.push({ label: 'Domaines' });
    } else if (domainId) {
      const titles: Record<string, string> = {
        quality: 'Qualité',
        compliance: 'Conformité',
        documents: 'Documents',
        organization: 'Organisation',
        reports: 'Rapports',
      };
      crumbs.push({ label: titles[domainId] ?? domainId });
    } else if (slug && slug !== 'domains') {
      for (const group of PROJECT_NAV_GROUPS) {
        const item = group.items.find((i) => i.path === slug);
        if (item) {
          const titles: Record<string, string> = {
            quality: 'Qualité',
            compliance: 'Conformité',
            documents: 'Documents',
            organization: 'Organisation',
            reports: 'Rapports',
          };
          crumbs.push({
            label: titles[group.id] ?? group.id,
            to: `/app/projects/${activeId}/domains/${group.id}`,
          });
          // leaf label from nav - use path-based French
          const leafTitles: Record<string, string> = {
            requirements: 'Exigences',
            tests: 'Tests',
            dashboard: 'Évaluation',
            'change-control': 'Changements',
            deviations: 'Déviations',
            'audit-records': 'Audits',
            impact: 'Impact',
            documents: 'Documents',
            forms: 'Formulaires',
            complaints: 'Réclamations',
            workflows: 'Workflows',
            reports: 'Rapports',
            'scheduled-reports': 'Planifiés',
          };
          crumbs.push({ label: leafTitles[slug] ?? slug });
          break;
        }
      }
    }
  }

  // Hide on bare Accueil (only one crumb)
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Fil d’Ariane"
      className="mb-5 flex flex-wrap items-center gap-1 text-xs text-text-tertiary"
    >
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? <ChevronRight className="size-3 shrink-0 opacity-50" /> : null}
            {crumb.to && !last ? (
              <Link
                to={crumb.to}
                className="truncate hover:text-text-secondary hover:underline underline-offset-2"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  last ? 'truncate font-medium text-text-secondary' : 'truncate'
                }
              >
                {crumb.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
