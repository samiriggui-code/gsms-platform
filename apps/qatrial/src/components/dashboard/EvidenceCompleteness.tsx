/**
 * Evidence completeness — KPI + DataTable hifi.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Check, FileSearch, X } from 'lucide-react';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { isApproved } from '../../lib/approvalHelpers';
import { buildCodeMap } from '../../lib/displayId';
import {
  DataTable,
  EmptyState,
  KPICard,
  Pill,
  type ColumnDef,
} from '../hifi';
import { cn } from '../../lib/cn';

interface EvidenceRow {
  reqId: string;
  code: string;
  title: string;
  hasTests: boolean;
  hasRiskAssessment: boolean;
  hasApprovalSignature: boolean;
  evidenceScore: number;
}

const col = createColumnHelper<EvidenceRow>();

function Flag({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex size-6 items-center justify-center rounded-r1 bg-ok-bg text-ok">
      <Check className="size-3.5" strokeWidth={2.5} />
    </span>
  ) : (
    <span className="inline-flex size-6 items-center justify-center rounded-r1 bg-bad-bg text-bad">
      <X className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}

export function EvidenceCompleteness() {
  const { t } = useTranslation();
  const requirements = useRequirementsStore((s) => s.requirements);
  const tests = useTestsStore((s) => s.tests);

  const rows = useMemo<EvidenceRow[]>(() => {
    const codes = buildCodeMap(requirements, 'REQ');
    const result: EvidenceRow[] = requirements.map((req) => {
      const hasTests = tests.some((test) => test.linkedRequirementIds.includes(req.id));
      const hasRiskAssessment = req.riskLevel != null;
      const hasApprovalSignature = isApproved(req.id);
      let score = 0;
      if (hasTests) score += 33;
      if (hasRiskAssessment) score += 33;
      if (hasApprovalSignature) score += 34;
      return {
        reqId: req.id,
        code: codes.get(req.id) ?? 'REQ',
        title: req.title,
        hasTests,
        hasRiskAssessment,
        hasApprovalSignature,
        evidenceScore: score,
      };
    });
    result.sort((a, b) => a.evidenceScore - b.evidenceScore);
    return result;
  }, [requirements, tests]);

  const completeCount = useMemo(
    () => rows.filter((r) => r.evidenceScore === 100).length,
    [rows],
  );
  const partialCount = useMemo(
    () => rows.filter((r) => r.evidenceScore > 0 && r.evidenceScore < 100).length,
    [rows],
  );
  const emptyCount = rows.length - completeCount - partialCount;
  const completePct =
    rows.length > 0 ? Math.round((completeCount / rows.length) * 100) : 0;

  const columns = useMemo(
    () =>
      [
        col.accessor('code', {
          header: t('requirements.id', { defaultValue: 'Code' }),
          cell: ({ getValue }) => (
            <span className="font-mono text-[11px] font-semibold text-accent">{getValue()}</span>
          ),
          size: 72,
        }),
        col.accessor('title', {
          header: t('requirements.title', { defaultValue: 'Exigence' }),
          cell: ({ getValue }) => (
            <span className="line-clamp-2 text-[12.5px] text-text-primary">{getValue()}</span>
          ),
        }),
        col.accessor('hasTests', {
          header: t('dashboard.evidenceHasTests', { defaultValue: 'Tests' }),
          cell: ({ getValue }) => (
            <div className="flex justify-center">
              <Flag ok={getValue()} />
            </div>
          ),
          size: 64,
        }),
        col.accessor('hasRiskAssessment', {
          header: t('dashboard.evidenceHasRisk', { defaultValue: 'Risque' }),
          cell: ({ getValue }) => (
            <div className="flex justify-center">
              <Flag ok={getValue()} />
            </div>
          ),
          size: 64,
        }),
        col.accessor('hasApprovalSignature', {
          header: t('dashboard.evidenceHasApproval', { defaultValue: 'Approb.' }),
          cell: ({ getValue }) => (
            <div className="flex justify-center">
              <Flag ok={getValue()} />
            </div>
          ),
          size: 72,
        }),
        col.accessor('evidenceScore', {
          header: t('dashboard.evidenceScore', { defaultValue: 'Score' }),
          cell: ({ getValue }) => {
            const score = getValue();
            return (
              <div className="flex items-center justify-end gap-2">
                <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-n-100 sm:block">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      score === 100 ? 'bg-ok' : score > 0 ? 'bg-warn' : 'bg-bad',
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <Pill variant={score === 100 ? 'ok' : score > 0 ? 'warn' : 'bad'}>{score}%</Pill>
              </div>
            );
          },
          size: 110,
        }),
      ] as ColumnDef<EvidenceRow, unknown>[],
    [t],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileSearch className="size-6" />}
        title={t('dashboard.evidenceCompleteness', { defaultValue: 'Preuves' })}
        description="Aucune exigence — la complétude des preuves apparaîtra ici."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-hifi-title text-text-primary">
          {t('dashboard.evidenceCompleteness', { defaultValue: 'Complétude des preuves' })}
        </h2>
        <p className="mt-0.5 text-hifi-sub text-text-tertiary">
          Tests · évaluation de risque · approbation — trié par gaps d’abord.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Complètes"
          value={<span className="text-ok">{completeCount}</span>}
          sub={`${completePct} % du dossier`}
          footer={
            <div className="h-1 overflow-hidden rounded-full bg-n-100">
              <div className="h-full rounded-full bg-ok" style={{ width: `${completePct}%` }} />
            </div>
          }
        />
        <KPICard label="Partielles" value={<span className="text-warn">{partialCount}</span>} />
        <KPICard label="Vides" value={<span className="text-bad">{emptyCount}</span>} />
        <KPICard label="Total" value={rows.length} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.reqId}
        searchable
        searchPlaceholder="Filtrer une exigence…"
        footerLabel={(n) => `${n} exigence${n > 1 ? 's' : ''}`}
      />
    </div>
  );
}
