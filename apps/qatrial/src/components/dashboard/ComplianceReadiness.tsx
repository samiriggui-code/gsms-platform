/**
 * Compliance — score de readiness + indicateurs pondérés (kit hifi).
 * Signature hors formule tant qu’elle n’est pas branchée (évite un faux 0 %).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { Card, CardHeader, EmptyState, KPICard, Pill } from '../hifi';
import { cn } from '../../lib/cn';

type Tone = 'ok' | 'warn' | 'bad';

function toneOf(pct: number): Tone {
  if (pct >= 80) return 'ok';
  if (pct >= 50) return 'warn';
  return 'bad';
}

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
};

const TONE_BAR: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

interface MetricDef {
  id: string;
  label: string;
  hint: string;
  weight: number;
  value: number;
}

export function ComplianceReadiness() {
  const { t } = useTranslation();
  const requirements = useRequirementsStore((s) => s.requirements);
  const tests = useTestsStore((s) => s.tests);

  const metrics = useMemo<MetricDef[]>(() => {
    const totalReqs = requirements.length;
    const activeOrClosed = requirements.filter(
      (r) => r.status === 'Active' || r.status === 'Closed',
    ).length;
    const reqCoverage = totalReqs > 0 ? Math.round((activeOrClosed / totalReqs) * 100) : 0;

    const reqsWithTests = requirements.filter((req) =>
      tests.some((t) => t.linkedRequirementIds.includes(req.id)),
    ).length;
    const testCoverage = totalReqs > 0 ? Math.round((reqsWithTests / totalReqs) * 100) : 0;

    const totalTests = tests.length;
    const passedTests = tests.filter((t) => t.status === 'Passed').length;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const assessedReqs = requirements.filter((r) => r.riskLevel != null).length;
    const riskAssessed = totalReqs > 0 ? Math.round((assessedReqs / totalReqs) * 100) : 0;

    return [
      {
        id: 'req',
        label: t('dashboard.reqCoverage', { defaultValue: 'Exigences actives' }),
        hint: 'Active / Closed vs Draft',
        weight: 0.3,
        value: reqCoverage,
      },
      {
        id: 'test',
        label: t('dashboard.testCoverage', { defaultValue: 'Couverture tests' }),
        hint: 'Exigences liées à ≥ 1 test',
        weight: 0.3,
        value: testCoverage,
      },
      {
        id: 'pass',
        label: t('dashboard.testPassRate', { defaultValue: 'Taux de succès' }),
        hint: 'Tests Passed',
        weight: 0.25,
        value: passRate,
      },
      {
        id: 'risk',
        label: t('dashboard.riskAssessed', { defaultValue: 'Risques évalués' }),
        hint: 'Exigences avec niveau de risque',
        weight: 0.15,
        value: riskAssessed,
      },
    ];
  }, [requirements, tests, t]);

  const hasCriticalRisk = useMemo(
    () => requirements.some((r) => r.riskLevel === 'critical'),
    [requirements],
  );

  const overallScore = useMemo(() => {
    let weighted = 0;
    for (const m of metrics) weighted += m.value * m.weight;
    let score = Math.round(weighted);
    if (hasCriticalRisk && score > 0) score = Math.max(0, score - 10);
    return score;
  }, [metrics, hasCriticalRisk]);

  const overallTone = toneOf(overallScore);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  if (requirements.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-6" />}
        title={t('dashboard.complianceReadiness', { defaultValue: 'Conformité' })}
        description="Ajoutez des exigences pour calculer le score de readiness."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-hifi-title text-text-primary">
          {t('dashboard.complianceReadiness', { defaultValue: 'Readiness conformité' })}
        </h2>
        <p className="mt-0.5 text-hifi-sub text-text-tertiary">
          Score pondéré sur couverture, tests et risques — signature hors calcul pour l’instant.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label={t('dashboard.readinessScore', { defaultValue: 'Score' })}
          value={<span className={TONE_TEXT[overallTone]}>{overallScore}%</span>}
          delta={{
            value: hasCriticalRisk ? '−10 critique' : 'OK',
            tone: hasCriticalRisk ? 'bad' : 'ok',
          }}
        />
        {metrics.slice(0, 3).map((m) => (
          <KPICard
            key={m.id}
            label={m.label}
            value={`${m.value}%`}
            sub={`${Math.round(m.weight * 100)} % du score`}
            footer={
              <div className="h-1 overflow-hidden rounded-full bg-n-100">
                <div
                  className={cn('h-full rounded-full transition-all', TONE_BAR[toneOf(m.value)])}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            }
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title="Indicateurs pondérés"
          subtitle="Chaque barre contribue au score global"
          pills={
            hasCriticalRisk ? (
              <Pill variant="bad">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {t('dashboard.criticalGapPenalty', { defaultValue: 'Pénalité risque critique' })}
                </span>
              </Pill>
            ) : (
              <Pill variant="ok">Aucun risque critique</Pill>
            )
          }
        />

        <div className="flex flex-col gap-5 p-3.5 sm:flex-row sm:items-start">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                className="stroke-n-100"
                strokeWidth="9"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                className={cn(
                  overallTone === 'ok' && 'stroke-ok',
                  overallTone === 'warn' && 'stroke-warn',
                  overallTone === 'bad' && 'stroke-bad',
                )}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-hifi-kpi', TONE_TEXT[overallTone])}>{overallScore}%</span>
              <span className="text-hifi-label font-mono uppercase text-n-500">ready</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3.5">
            {metrics.map((m) => {
              const tone = toneOf(m.value);
              return (
                <div key={m.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[12.5px] font-medium text-text-primary">{m.label}</span>
                      <span className="ml-1.5 text-[11px] text-text-tertiary">
                        · {Math.round(m.weight * 100)}% · {m.hint}
                      </span>
                    </div>
                    <span className={cn('shrink-0 font-mono text-[12px] font-semibold', TONE_TEXT[tone])}>
                      {m.value}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div
                      className={cn('h-full rounded-full transition-all', TONE_BAR[tone])}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-r2 border border-dashed border-border bg-n-50/80 px-3 py-2">
              <div>
                <p className="text-[12px] font-medium text-text-secondary">
                  {t('dashboard.signatureCompleteness', { defaultValue: 'Signatures' })}
                </p>
                <p className="text-[11px] text-text-tertiary">Non branché — exclu du score</p>
              </div>
              <Pill variant="outline">N/A</Pill>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
