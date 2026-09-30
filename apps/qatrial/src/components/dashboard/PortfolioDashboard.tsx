import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectData } from '../../context/ProjectDataContext';
import { projectPath } from '../../navigation/nav-config';
import type { ProjectMeta } from '../../types';
import { Card, Pill } from '../hifi';

type ProjectHealth = 'on_track' | 'at_risk' | 'blocked';

type ProjectCounts = {
  requirements: number;
  tests: number;
  capas: number;
  deviations: number;
};

type ProjectRow = ProjectMeta & { id: string; _count?: ProjectCounts };

function getHealthVariant(health: ProjectHealth): 'ok' | 'warn' | 'bad' {
  switch (health) {
    case 'on_track':
      return 'ok';
    case 'at_risk':
      return 'warn';
    case 'blocked':
      return 'bad';
    default: {
      const _exhaustive: never = health;
      return _exhaustive;
    }
  }
}

function getHealthBarColor(health: ProjectHealth): string {
  switch (health) {
    case 'on_track':
      return 'bg-success';
    case 'at_risk':
      return 'bg-warning';
    case 'blocked':
      return 'bg-danger';
    default: {
      const _exhaustive: never = health;
      return _exhaustive;
    }
  }
}

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return '';
  const offset = 0x1f1e6;
  const a = code.toUpperCase().charCodeAt(0) - 65 + offset;
  const b = code.toUpperCase().charCodeAt(1) - 65 + offset;
  return String.fromCodePoint(a, b);
}

function rowHealth(counts?: ProjectCounts): { health: ProjectHealth; readiness: number } {
  if (!counts || counts.requirements === 0) {
    return { health: 'blocked', readiness: 0 };
  }
  const readiness = Math.min(100, Math.round((counts.tests / counts.requirements) * 100));
  if (counts.deviations > 0) return { health: 'at_risk', readiness };
  if (readiness >= 70) return { health: 'on_track', readiness };
  if (readiness >= 40) return { health: 'at_risk', readiness };
  return { health: 'blocked', readiness };
}

/**
 * Onglet « portefeuille » du dashboard — désormais alimenté par la liste
 * complète (`useProjectData().projects`), pas par le seul projet actif.
 * Un clic ouvre le dossier via l'URL `/app/projects/:id/dashboard`.
 */
export function PortfolioDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects } = useProjectData();

  const rows = useMemo(() => {
    return (projects as ProjectRow[]).map((project) => {
      const { health, readiness } = rowHealth(project._count);
      const verticalKey = project.vertical ? `verticals.${project.vertical}.name` : '';
      return {
        id: project.id,
        name: project.name,
        country: project.country || 'US',
        vertical: verticalKey,
        readiness,
        health,
        totalReqs: project._count?.requirements ?? 0,
        totalTests: project._count?.tests ?? 0,
        lastUpdated: project.createdAt,
      };
    });
  }, [projects]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {t('dashboard.portfolio')}
        </h3>
        <p className="text-sm text-text-secondary">
          {t('dashboard.portfolioDescription')}
        </p>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-text-tertiary">
            {t('common.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioProject')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioCountry')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioVertical')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioReadiness')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioStatus')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioReqs')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioTests')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t('dashboard.portfolioLastUpdated')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 hover:bg-surface-secondary/50 transition-colors cursor-pointer"
                    onClick={() => navigate(projectPath(row.id, 'dashboard'))}
                  >
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-text-primary">{row.name}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-lg" title={row.country}>
                        {countryFlag(row.country)}
                      </span>
                      <span className="ml-1.5 text-xs text-text-tertiary">{row.country}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">
                      {row.vertical ? t(row.vertical) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-surface-tertiary rounded-full h-2">
                          <div
                            className={`${getHealthBarColor(row.health)} h-2 rounded-full transition-all`}
                            style={{ width: `${row.readiness}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text-primary">{row.readiness}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Pill variant={getHealthVariant(row.health)}>
                        {t(`dashboard.portfolioHealth_${row.health}`)}
                      </Pill>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-text-secondary">{row.totalReqs}</td>
                    <td className="px-4 py-4 text-center text-sm text-text-secondary">{row.totalTests}</td>
                    <td className="px-4 py-4 text-right text-xs text-text-tertiary">
                      {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
