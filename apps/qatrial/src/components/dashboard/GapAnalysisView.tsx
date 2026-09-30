/**
 * Gap analysis IA — KPI + standards + gaps (kit hifi).
 */
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useLLMStore } from '../../store/useLLMStore';
import { useGapStore } from '../../store/useGapStore';
import { analyzeGaps } from '../../ai/prompts/gapAnalysis';
import { VERTICAL_DEFINITIONS } from '../../templates/registry';
import type { AIGapAnalysis, GapStatus } from '../../types';
import { Btn2, Card, CardHeader, EmptyState, KPICard, Pill } from '../hifi';

interface StandardSummary {
  standard: string;
  total: number;
  covered: number;
  partial: number;
  missing: number;
}

const STATUS_PILL: Record<GapStatus, 'ok' | 'warn' | 'bad'> = {
  covered: 'ok',
  partial: 'warn',
  missing: 'bad',
};

export function GapAnalysisView() {
  const { t } = useTranslation();
  const requirements = useRequirementsStore((s) => s.requirements);
  const tests = useTestsStore((s) => s.tests);
  const project = useProjectStore((s) => s.project);
  const hasProvider = useLLMStore((s) => s.hasAnyProvider());

  const addRequirement = useRequirementsStore((s) => s.addRequirement);
  const addGapRun = useGapStore((s) => s.addRun);

  const [results, setResults] = useState<AIGapAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReqs, setGeneratedReqs] = useState<Set<string>>(new Set());

  const handleRunAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const country = project?.country || 'FR';
      const vertical = project?.vertical;
      const applicableStandards: string[] = [];

      for (const req of requirements) {
        if (req.regulatoryRef && !applicableStandards.includes(req.regulatoryRef)) {
          applicableStandards.push(req.regulatoryRef);
        }
      }

      if (applicableStandards.length === 0) {
        const verticalDef = VERTICAL_DEFINITIONS.find((v) => v.id === vertical);
        applicableStandards.push(...(verticalDef?.primaryStandards ?? ['ISO 9001', 'ISO 31000']));
      }

      const gaps = await analyzeGaps({
        country,
        vertical,
        applicableStandards,
        requirements: requirements.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
        })),
        tests: tests.map((t) => ({
          id: t.id,
          title: t.title,
          linkedRequirementIds: t.linkedRequirementIds,
        })),
      });

      setResults(gaps);
      setGeneratedReqs(new Set());

      const covered = gaps.filter((g) => g.status === 'covered').length;
      const partial = gaps.filter((g) => g.status === 'partial').length;
      const weighted = covered + partial * 0.5;
      const readiness = gaps.length > 0 ? Math.round((weighted / gaps.length) * 100) : 0;

      addGapRun({
        analyzedAt: new Date().toISOString(),
        country,
        vertical,
        standards: applicableStandards,
        gaps,
        readinessScore: readiness,
        providerId: 'current',
        model: 'current',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [requirements, tests, project, addGapRun]);

  const standardSummaries = useMemo<StandardSummary[]>(() => {
    const map = new Map<string, StandardSummary>();
    for (const gap of results) {
      let entry = map.get(gap.standard);
      if (!entry) {
        entry = { standard: gap.standard, total: 0, covered: 0, partial: 0, missing: 0 };
        map.set(gap.standard, entry);
      }
      entry.total++;
      entry[gap.status]++;
    }
    return Array.from(map.values());
  }, [results]);

  const overallReadiness = useMemo(() => {
    if (results.length === 0) return 0;
    const covered = results.filter((r) => r.status === 'covered').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    return Math.round(((covered + partial * 0.5) / results.length) * 100);
  }, [results]);

  const criticalGaps = useMemo(
    () => results.filter((r) => r.status === 'missing' || r.status === 'partial'),
    [results],
  );

  const handleGenerateRequirement = useCallback(
    (gap: AIGapAnalysis) => {
      const key = `${gap.standard}-${gap.clause}`;
      if (generatedReqs.has(key)) return;
      addRequirement({
        title: `[${gap.standard}] ${gap.clause}`,
        description:
          gap.suggestion ||
          `Requirement to address ${gap.status} coverage for ${gap.standard} clause ${gap.clause}`,
        status: 'Draft',
        tags: ['auto-generated', 'gap-analysis', gap.standard.toLowerCase().replace(/\s+/g, '-')],
        regulatoryRef: `${gap.standard} ${gap.clause}`,
        riskLevel: gap.status === 'missing' ? 'high' : 'medium',
      });
      setGeneratedReqs((prev) => new Set(prev).add(key));
    },
    [addRequirement, generatedReqs],
  );

  const handleGenerateAllReqs = useCallback(() => {
    for (const gap of criticalGaps) handleGenerateRequirement(gap);
  }, [criticalGaps, handleGenerateRequirement]);

  if (!hasProvider) {
    return (
      <EmptyState
        icon={<Search className="size-6" />}
        title={t('dashboard.gapAnalysis', { defaultValue: 'Analyse de gaps' })}
        description={t('ai.noProvider', {
          defaultValue: 'Configurez un fournisseur IA dans Réglages pour lancer l’analyse.',
        })}
      />
    );
  }

  const remaining = criticalGaps.length - generatedReqs.size;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-hifi-title text-text-primary">
            {t('dashboard.gapAnalysis', { defaultValue: 'Analyse de gaps' })}
          </h2>
          <p className="mt-0.5 text-hifi-sub text-text-tertiary">
            Standards applicables vs exigences du dossier (IA).
          </p>
        </div>
        <Btn2 variant="primary" onClick={handleRunAnalysis} disabled={loading}>
          {loading
            ? t('ai.generating', { defaultValue: 'Analyse…' })
            : t('ai.gapAnalysis', { defaultValue: 'Lancer l’analyse' })}
        </Btn2>
      </div>

      {error ? (
        <div className="rounded-r2 border border-bad/30 bg-bad-bg px-3 py-2 text-[12.5px] text-bad">
          {error}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label={t('dashboard.overallReadiness', {
              percent: overallReadiness,
              defaultValue: 'Readiness',
            })}
            value={`${overallReadiness}%`}
            footer={
              <div className="h-1 overflow-hidden rounded-full bg-n-100">
                <div
                  className={
                    overallReadiness >= 80
                      ? 'h-full bg-ok'
                      : overallReadiness >= 50
                        ? 'h-full bg-warn'
                        : 'h-full bg-bad'
                  }
                  style={{ width: `${overallReadiness}%` }}
                />
              </div>
            }
          />
          <KPICard label="Standards" value={standardSummaries.length} />
          <KPICard label="Clauses" value={results.length} />
          <KPICard
            label={t('dashboard.criticalGaps', { defaultValue: 'Gaps' })}
            value={<span className="text-bad">{criticalGaps.length}</span>}
          />
        </div>
      ) : null}

      {standardSummaries.length > 0 ? (
        <Card>
          <CardHeader title="Par standard" subtitle="Couverture / partiel / manquant" />
          <div className="overflow-x-auto px-3.5 py-2">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-hifi-label font-mono uppercase text-n-500">
                  <th className="py-2 pr-3">{t('dashboard.standard', { defaultValue: 'Standard' })}</th>
                  <th className="px-2 py-2 text-center">Total</th>
                  <th className="px-2 py-2">{t('dashboard.covered', { defaultValue: 'Couvert' })}</th>
                  <th className="px-2 py-2">{t('dashboard.partial', { defaultValue: 'Partiel' })}</th>
                  <th className="px-2 py-2">{t('dashboard.missing', { defaultValue: 'Manquant' })}</th>
                </tr>
              </thead>
              <tbody>
                {standardSummaries.map((s) => (
                  <tr key={s.standard} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-text-primary">{s.standard}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-text-secondary">{s.total}</td>
                    {(['covered', 'partial', 'missing'] as const).map((k) => {
                      const n = s[k];
                      const pct = s.total > 0 ? (n / s.total) * 100 : 0;
                      const bar =
                        k === 'covered' ? 'bg-ok' : k === 'partial' ? 'bg-warn' : 'bg-bad';
                      return (
                        <td key={k} className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-n-100">
                              <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-5 text-right font-mono text-[11px] text-n-500">{n}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {results.length > 0 ? (
        <Card>
          <CardHeader
            title={t('dashboard.criticalGaps', { defaultValue: 'Gaps à traiter' })}
            subtitle={`${criticalGaps.length} clause${criticalGaps.length > 1 ? 's' : ''}`}
            actions={
              criticalGaps.length > 0 ? (
                <Btn2 variant="secondary" onClick={handleGenerateAllReqs} disabled={remaining <= 0}>
                  {t('dashboard.generateAllReqs', { defaultValue: 'Générer tout' })} ({Math.max(0, remaining)})
                </Btn2>
              ) : undefined
            }
          />
          <div className="px-3.5 py-2">
            {criticalGaps.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-text-tertiary">
                {t('dashboard.noCriticalGaps', { defaultValue: 'Aucun gap critique.' })}
              </p>
            ) : (
              <ul className="space-y-2">
                {criticalGaps.map((gap, idx) => {
                  const key = `${gap.standard}-${gap.clause}`;
                  const done = generatedReqs.has(key);
                  return (
                    <li
                      key={`${key}-${idx}`}
                      className="flex items-start justify-between gap-3 rounded-r2 border border-border bg-n-50/50 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Pill variant={STATUS_PILL[gap.status]}>
                            {t(`ai.gapStatus.${gap.status}`, { defaultValue: gap.status })}
                          </Pill>
                          <span className="text-[11px] text-text-tertiary">{gap.standard}</span>
                        </div>
                        <p className="mt-0.5 text-[12.5px] font-medium text-text-primary">
                          {gap.clause}
                        </p>
                        {gap.suggestion ? (
                          <p className="mt-0.5 text-[11.5px] text-text-tertiary">{gap.suggestion}</p>
                        ) : null}
                      </div>
                      <Btn2
                        variant={done ? 'secondary' : 'ghost'}
                        disabled={done}
                        onClick={() => handleGenerateRequirement(gap)}
                      >
                        {done
                          ? t('common.created', { defaultValue: 'Créé' })
                          : t('dashboard.generateRequirement', { defaultValue: '+ Exig.' })}
                      </Btn2>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      {results.length === 0 && !loading && !error ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title={t('dashboard.noGapResults', { defaultValue: 'Pas encore d’analyse' })}
          description="Lancez l’analyse pour comparer le dossier aux standards applicables."
          actionLabel={t('ai.gapAnalysis', { defaultValue: 'Lancer l’analyse' })}
          onAction={handleRunAnalysis}
        />
      ) : null}
    </div>
  );
}
