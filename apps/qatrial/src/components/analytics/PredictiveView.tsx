/**
 * Prédictif — listes + KPI densifiés kit hifi (Card / Pill / EmptyState / Chart).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Target,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { apiFetch } from '../../lib/apiClient';
import { getProjectId } from '../../lib/projectUtils';
import { cn } from '../../lib/cn';
import {
  BarChartView,
  Btn2,
  Card,
  ChartCard,
  EmptyState,
  KPICard,
  Pill,
  type PillVariant,
} from '../hifi';

interface FailureRisk {
  requirementId: string;
  seqId: string;
  title: string;
  riskLevel: string;
  riskScore: number;
  factors: {
    complexity: number;
    riskLevel: number;
    noCoverage: boolean;
    similarityToFailed: number;
  };
}

interface SupplierRisk {
  supplierId: string;
  name: string;
  category: string;
  riskScore: number;
  qualificationStatus: string;
  factors: {
    auditTrend: number;
    defectRate: number;
    overdueAudit: number;
    openActions: number;
  };
}

interface CAPAPattern {
  rootCause: string;
  frequency: number;
  severity: string;
  recentCapas: { id: string; title: string; createdAt: string }[];
}

interface TrainingGaps {
  expiringUsers: {
    userId: string;
    userName: string;
    userRole: string;
    courseName: string;
    validUntil: string | null;
    daysRemaining: number | null;
  }[];
  lowCompletionRoles: {
    role: string;
    completionRate: number;
    totalAssignments: number;
    completed: number;
  }[];
  highFailureCourses: {
    courseId: string;
    courseName: string;
    totalAttempts: number;
    failedAttempts: number;
    failureRate: number;
  }[];
}

type PredictiveTab = 'failure' | 'supplier' | 'capa' | 'training';

function scorePill(score: number): PillVariant {
  if (score >= 70) return 'bad';
  if (score >= 40) return 'warn';
  return 'ok';
}

function scoreRing(score: number): string {
  if (score >= 70) return 'bg-bad-bg text-bad';
  if (score >= 40) return 'bg-warn-bg text-warn';
  return 'bg-ok-bg text-ok';
}

export function PredictiveView() {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);

  const [activeTab, setActiveTab] = useState<PredictiveTab>('failure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failureRisks, setFailureRisks] = useState<FailureRisk[]>([]);
  const [supplierRisks, setSupplierRisks] = useState<SupplierRisk[]>([]);
  const [capaPatterns, setCAPAPatterns] = useState<CAPAPattern[]>([]);
  const [trainingGaps, setTrainingGaps] = useState<TrainingGaps>({
    expiringUsers: [],
    lowCompletionRoles: [],
    highFailureCourses: [],
  });

  const fetchData = useCallback(
    async (tab: PredictiveTab) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        switch (tab) {
          case 'failure': {
            const { predictions } = await apiFetch<{ predictions: FailureRisk[] }>(
              `/predictive/${projectId}/failure-risk`,
            );
            setFailureRisks(predictions);
            break;
          }
          case 'supplier': {
            const { predictions } = await apiFetch<{ predictions: SupplierRisk[] }>(
              `/predictive/${projectId}/supplier-risk`,
            );
            setSupplierRisks(predictions);
            break;
          }
          case 'capa': {
            const { patterns } = await apiFetch<{ patterns: CAPAPattern[] }>(
              `/predictive/${projectId}/capa-recurrence`,
            );
            setCAPAPatterns(patterns);
            break;
          }
          case 'training': {
            const { predictions } = await apiFetch<{ predictions: TrainingGaps }>(
              `/predictive/${projectId}/training-gap`,
            );
            setTrainingGaps(predictions);
            break;
          }
          default: {
            const _exhaustive: never = tab;
            void _exhaustive;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('predictive.noData'));
      } finally {
        setLoading(false);
      }
    },
    [projectId, t],
  );

  useEffect(() => {
    void fetchData(activeTab);
  }, [activeTab, fetchData]);

  const failureChart = useMemo(
    () =>
      failureRisks.slice(0, 8).map((r) => ({
        name: r.seqId || r.title.slice(0, 10),
        value: r.riskScore,
        color:
          r.riskScore >= 70 ? '#b02a1a' : r.riskScore >= 40 ? '#9a6209' : '#2f7a3d',
      })),
    [failureRisks],
  );

  const tabs: { id: PredictiveTab; label: string; icon: typeof Target }[] = [
    { id: 'failure', label: t('predictive.failureRisk'), icon: Target },
    { id: 'supplier', label: t('predictive.supplierRisk'), icon: Building2 },
    { id: 'capa', label: t('predictive.capaRecurrence'), icon: RotateCcw },
    { id: 'training', label: t('predictive.trainingGaps'), icon: GraduationCap },
  ];

  if (!projectId) {
    return (
      <EmptyState
        title={t('predictive.tabPredictive')}
        description={t('predictive.noData')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-r1 px-2.5 text-[11.5px] font-medium transition-colors',
                active
                  ? 'bg-accent text-white'
                  : 'bg-n-100 text-text-tertiary hover:bg-n-200 hover:text-text-secondary',
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
        <Btn2
          variant="ghost"
          className="ml-auto"
          leading={<RefreshCw className="size-3.5" />}
          onClick={() => void fetchData(activeTab)}
          title={t('predictive.refresh')}
        >
          {t('predictive.refresh')}
        </Btn2>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-accent" />
        </div>
      ) : null}

      {error && !loading ? (
        <EmptyState title={t('predictive.noData')} description={error} />
      ) : null}

      {!loading && !error && activeTab === 'failure' && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-tertiary">{t('predictive.failureRiskDesc')}</p>
          {failureRisks.length === 0 ? (
            <EmptyState title={t('predictive.noData')} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KPICard label="Analysées" value={failureRisks.length} />
                <KPICard
                  label="Score ≥ 70"
                  value={failureRisks.filter((r) => r.riskScore >= 70).length}
                  delta={{ value: 'critique', tone: 'bad' }}
                />
                <KPICard
                  label="Sans test"
                  value={failureRisks.filter((r) => r.factors.noCoverage).length}
                  delta={{ value: 'couverture', tone: 'bad' }}
                />
                <KPICard
                  label="Médiane"
                  value={
                    failureRisks.length
                      ? Math.round(
                          [...failureRisks]
                            .map((r) => r.riskScore)
                            .sort((a, b) => a - b)[Math.floor(failureRisks.length / 2)] ?? 0,
                        )
                      : 0
                  }
                />
              </div>
              {failureChart.length > 0 ? (
                <ChartCard title="Top scores de risque d’échec" subtitle="8 premiers">
                  <BarChartView data={failureChart} height={180} />
                </ChartCard>
              ) : null}
              <Card className="divide-y divide-border overflow-hidden">
                {failureRisks.slice(0, 20).map((risk) => (
                  <div key={risk.requirementId} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold',
                        scoreRing(risk.riskScore),
                      )}
                    >
                      {risk.riskScore}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        <span className="font-mono text-accent">{risk.seqId}</span>
                        <span className="text-n-400"> · </span>
                        {risk.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Pill variant="outline">
                          {t('predictive.complexity')}: {risk.factors.complexity}
                        </Pill>
                        <Pill variant="default">{risk.riskLevel || '—'}</Pill>
                        {risk.factors.noCoverage ? (
                          <Pill variant="warn">{t('predictive.noTestCoverage')}</Pill>
                        ) : null}
                        {risk.factors.similarityToFailed > 0 ? (
                          <Pill variant="bad">
                            {t('predictive.similarToFailed', {
                              pct: Math.round(risk.factors.similarityToFailed * 100),
                            })}
                          </Pill>
                        ) : null}
                      </div>
                    </div>
                    <Pill variant={scorePill(risk.riskScore)}>{risk.riskScore}</Pill>
                  </div>
                ))}
              </Card>
            </>
          )}
        </div>
      )}

      {!loading && !error && activeTab === 'supplier' && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-tertiary">{t('predictive.supplierRiskDesc')}</p>
          {supplierRisks.length === 0 ? (
            <EmptyState title={t('predictive.noData')} />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {supplierRisks.map((risk) => (
                <div key={risk.supplierId} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold',
                      scoreRing(risk.riskScore),
                    )}
                  >
                    {risk.riskScore}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text-primary">{risk.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Pill variant="outline">{risk.category}</Pill>
                      <Pill variant="default">{risk.qualificationStatus}</Pill>
                      {risk.factors.overdueAudit > 0 ? (
                        <Pill variant="bad">{t('predictive.overdueAudit')}</Pill>
                      ) : null}
                    </div>
                  </div>
                  <div className="hidden text-right text-[11px] text-text-tertiary sm:block">
                    <div>
                      {t('predictive.auditTrend')}: {risk.factors.auditTrend}
                    </div>
                    <div>
                      {t('predictive.defectRate')}: {risk.factors.defectRate}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {!loading && !error && activeTab === 'capa' && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-tertiary">{t('predictive.capaRecurrenceDesc')}</p>
          {capaPatterns.length === 0 ? (
            <EmptyState title={t('predictive.noPatterns')} />
          ) : (
            <div className="space-y-2">
              {capaPatterns.map((pattern) => (
                <Card key={pattern.rootCause} className="px-3.5 py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <RotateCcw className="size-3.5 text-warn" />
                    <h4 className="text-[13px] font-semibold text-text-primary">
                      {pattern.rootCause}
                    </h4>
                    <Pill
                      variant={
                        pattern.severity === 'high'
                          ? 'bad'
                          : pattern.severity === 'medium'
                            ? 'warn'
                            : 'info'
                      }
                    >
                      {pattern.frequency}x {t('predictive.in6Months')}
                    </Pill>
                  </div>
                  <ul className="space-y-1">
                    {pattern.recentCapas.slice(0, 5).map((capa) => (
                      <li
                        key={capa.id}
                        className="flex justify-between gap-2 text-[11.5px] text-text-tertiary"
                      >
                        <span className="truncate text-text-secondary">{capa.title}</span>
                        <span className="shrink-0 font-mono">
                          {new Date(capa.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && activeTab === 'training' && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-tertiary">{t('predictive.trainingGapsDesc')}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KPICard
              label={t('predictive.expiringCertifications')}
              value={trainingGaps.expiringUsers.length}
            />
            <KPICard
              label={t('predictive.lowCompletionRoles')}
              value={trainingGaps.lowCompletionRoles.length}
            />
            <KPICard
              label={t('predictive.highFailureCourses')}
              value={trainingGaps.highFailureCourses.length}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-3.5 py-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-n-500">
                {t('predictive.expiringCertifications')}
              </h4>
            </div>
            {trainingGaps.expiringUsers.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-text-tertiary">
                {t('predictive.noExpiring')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {trainingGaps.expiringUsers.map((user, idx) => (
                  <li key={`${user.userId}-${idx}`} className="flex items-center gap-2 px-3.5 py-2 text-[12.5px]">
                    <AlertTriangle
                      className={cn(
                        'size-3.5 shrink-0',
                        (user.daysRemaining ?? 999) <= 7 ? 'text-bad' : 'text-warn',
                      )}
                    />
                    <span className="font-medium text-text-primary">{user.userName}</span>
                    <span className="truncate text-text-secondary">{user.courseName}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-text-tertiary">
                      {user.daysRemaining != null
                        ? t('predictive.daysRemaining', { days: user.daysRemaining })
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-3.5 py-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-n-500">
                {t('predictive.lowCompletionRoles')}
              </h4>
            </div>
            {trainingGaps.lowCompletionRoles.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-text-tertiary">
                {t('predictive.allRolesCompliant')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {trainingGaps.lowCompletionRoles.map((role) => (
                  <li key={role.role} className="flex items-center gap-2 px-3.5 py-2 text-[12.5px]">
                    <span className="font-medium capitalize text-text-primary">
                      {role.role.replace('_', ' ')}
                    </span>
                    <span className="ml-auto">
                      <Pill variant={role.completionRate < 50 ? 'bad' : 'warn'}>
                        {role.completionRate}%
                      </Pill>
                    </span>
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {role.completed}/{role.totalAssignments}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-3.5 py-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-n-500">
                {t('predictive.highFailureCourses')}
              </h4>
            </div>
            {trainingGaps.highFailureCourses.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-text-tertiary">
                {t('predictive.noHighFailure')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {trainingGaps.highFailureCourses.map((course) => (
                  <li key={course.courseId} className="flex items-center gap-2 px-3.5 py-2 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                      {course.courseName}
                    </span>
                    <Pill variant="bad">
                      {course.failureRate}% {t('predictive.failRate')}
                    </Pill>
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {course.failedAttempts}/{course.totalAttempts}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
