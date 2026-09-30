/**
 * Workspace — dossiers avec KPIs + DataTable densifiée (vraiment différente).
 */
import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FolderKanban, FolderPlus } from 'lucide-react';
import { createColumnHelper } from '@tanstack/react-table';

import {
  Btn2,
  DataTable,
  EmptyState,
  KPICard,
  Pill,
  type ColumnDef,
} from '../components/hifi';
import { useProjectData } from '../context/ProjectDataContext';
import { projectEntryPath } from '../navigation/hub-config';
import type { ProjectMeta } from '../types';

type ProjectCounts = {
  requirements: number;
  tests: number;
  capas: number;
  deviations: number;
};

type ProjectRow = ProjectMeta & { id: string; _count?: ProjectCounts };

function health(counts?: ProjectCounts): 'empty' | 'at_risk' | 'on_track' {
  if (!counts || counts.requirements === 0) return 'empty';
  if (counts.deviations > 0) return 'at_risk';
  return 'on_track';
}

function coverage(counts?: ProjectCounts): number {
  if (!counts || counts.requirements === 0) return 0;
  return Math.min(100, Math.round((counts.tests / counts.requirements) * 100));
}

type ShellOutletContext = { onNewProject: () => void };

const col = createColumnHelper<ProjectRow>();

export function PortfolioPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onNewProject } = useOutletContext<ShellOutletContext>();
  const { projects, loading, setActiveProject } = useProjectData();

  const rows = projects as ProjectRow[];

  const totals = useMemo(() => {
    const base = rows.reduce(
      (acc, p) => ({
        requirements: acc.requirements + (p._count?.requirements ?? 0),
        tests: acc.tests + (p._count?.tests ?? 0),
        deviations: acc.deviations + (p._count?.deviations ?? 0),
        atRisk: acc.atRisk + (health(p._count) === 'at_risk' ? 1 : 0),
      }),
      { requirements: 0, tests: 0, deviations: 0, atRisk: 0 },
    );
    const avgCoverage =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((s, p) => s + coverage(p._count), 0) / rows.length);
    return { ...base, avgCoverage };
  }, [rows]);

  function openProject(project: ProjectRow) {
    setActiveProject(project);
    navigate(projectEntryPath(project.id));
  }

  const columns = useMemo(
    () =>
      [
        col.accessor((r) => r.name, {
          id: 'name',
          header: t('portfolio.colName', { defaultValue: 'Dossier' }),
          cell: ({ row }) => {
            const p = row.original;
            const initial = (p.name?.charAt(0) || 'D').toUpperCase();
            return (
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-r2 bg-accent-subtle text-[13px] font-semibold text-accent">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{p.name}</p>
                  <p className="truncate text-[11px] text-text-tertiary">
                    v{p.version}
                    {p.country ? ` · ${p.country.toUpperCase()}` : ''}
                    {p.vertical ? ` · ${p.vertical}` : ''}
                  </p>
                </div>
              </div>
            );
          },
        }),
        col.display({
          id: 'status',
          header: t('portfolio.colStatus', { defaultValue: 'État' }),
          cell: ({ row }) => {
            const state = health(row.original._count);
            return (
              <Pill
                variant={state === 'at_risk' ? 'warn' : state === 'empty' ? 'default' : 'ok'}
              >
                {state === 'at_risk'
                  ? t('portfolio.atRisk', { defaultValue: 'À traiter' })
                  : state === 'empty'
                    ? t('portfolio.empty', { defaultValue: 'Vide' })
                    : t('portfolio.onTrack', { defaultValue: 'En cours' })}
              </Pill>
            );
          },
        }),
        col.display({
          id: 'coverage',
          header: t('portfolio.colCoverage', { defaultValue: 'Avancement' }),
          cell: ({ row }) => {
            const pct = coverage(row.original._count);
            return (
              <div className="min-w-[8.5rem]">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold text-text-primary">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-n-100">
                  <div
                    className={
                      pct >= 80
                        ? 'h-full rounded-full bg-ok'
                        : pct >= 40
                          ? 'h-full rounded-full bg-accent'
                          : 'h-full rounded-full bg-bad'
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          },
        }),
        col.accessor((r) => r._count?.requirements ?? 0, {
          id: 'reqs',
          header: () => (
            <span className="block text-right">
              {t('nav.requirements', { defaultValue: 'Exig.' })}
            </span>
          ),
          cell: ({ getValue }) => (
            <span className="flex justify-end">
              <span className="inline-flex min-w-[2rem] items-center justify-center rounded-r2 bg-n-100 px-2 py-0.5 font-mono text-[12px] font-semibold text-text-primary">
                {getValue()}
              </span>
            </span>
          ),
        }),
        col.accessor((r) => r._count?.tests ?? 0, {
          id: 'tests',
          header: () => (
            <span className="block text-right">{t('nav.tests', { defaultValue: 'Tests' })}</span>
          ),
          cell: ({ getValue }) => (
            <span className="flex justify-end">
              <span className="inline-flex min-w-[2rem] items-center justify-center rounded-r2 bg-accent-subtle px-2 py-0.5 font-mono text-[12px] font-semibold text-accent">
                {getValue()}
              </span>
            </span>
          ),
        }),
        col.accessor((r) => r._count?.deviations ?? 0, {
          id: 'devs',
          header: () => (
            <span className="block text-right">
              {t('nav.deviations', { defaultValue: 'Dév.' })}
            </span>
          ),
          cell: ({ getValue }) => {
            const n = getValue();
            return (
              <span className="flex justify-end">
                <span
                  className={
                    n > 0
                      ? 'inline-flex min-w-[2rem] items-center justify-center rounded-r2 bg-warn-bg px-2 py-0.5 font-mono text-[12px] font-semibold text-warn'
                      : 'inline-flex min-w-[2rem] items-center justify-center rounded-r2 bg-n-100 px-2 py-0.5 font-mono text-[12px] text-text-tertiary'
                  }
                >
                  {n}
                </span>
              </span>
            );
          },
        }),
        col.display({
          id: 'open',
          header: '',
          cell: () => (
            <span className="inline-flex w-full items-center justify-end gap-1 text-[12px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Ouvrir
              <ArrowRight className="size-3.5" />
            </span>
          ),
          size: 88,
        }),
      ] as ColumnDef<ProjectRow, unknown>[],
    [t],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            {t('portfolio.title', { defaultValue: 'Dossiers' })}
          </h1>
          <p className="mt-1 text-[13px] text-text-tertiary">
            Portefeuille qualité — ouvrir un dossier pour le travail métier.
          </p>
        </div>
        <Btn2 variant="primary" leading={<FolderPlus className="h-4 w-4" />} onClick={onNewProject}>
          {t('portfolio.create', { defaultValue: 'Créer un dossier' })}
        </Btn2>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Dossiers"
          value={rows.length}
          sub={<span className="inline-flex items-center gap-1"><FolderKanban className="size-3" /> actifs</span>}
        />
        <KPICard label="Exigences" value={totals.requirements} />
        <KPICard
          label="Couverture moy."
          value={`${totals.avgCoverage}%`}
          delta={{
            value: totals.avgCoverage >= 80 ? 'OK' : 'À suivre',
            tone: totals.avgCoverage >= 80 ? 'ok' : 'neutral',
          }}
        />
        <KPICard
          label="À traiter"
          value={totals.atRisk}
          delta={{
            value: totals.deviations > 0 ? `${totals.deviations} dév.` : 'RAS',
            tone: totals.atRisk > 0 ? 'bad' : 'ok',
          }}
        />
      </div>

      {loading ? (
        <p className="text-sm text-text-tertiary">
          {t('common.loading', { defaultValue: 'Chargement…' })}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          onRowClick={openProject}
          searchable
          searchPlaceholder="Filtrer un dossier…"
          footerLabel={(n) => `${n} dossier${n > 1 ? 's' : ''}`}
          empty={
            <EmptyState
              title={t('portfolio.emptyTitle', { defaultValue: 'Aucun dossier' })}
              description={t('portfolio.emptyBody', {
                defaultValue:
                  "Créez un dossier, ou attendez qu'un devis validé en amorce un automatiquement.",
              })}
              actionLabel={t('portfolio.create', { defaultValue: 'Créer un dossier' })}
              onAction={onNewProject}
            />
          }
        />
      )}
    </div>
  );
}
