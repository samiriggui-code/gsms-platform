/**
 * CAPA funnel — KPI + liste densifiée (kit hifi).
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Sparkles, Wrench } from 'lucide-react';
import { useTestsStore } from '../../store/useTestsStore';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useLLMStore } from '../../store/useLLMStore';
import { suggestCAPA } from '../../ai/prompts/capaSuggestion';
import type { CAPAResult } from '../../ai/prompts/capaSuggestion';
import { Btn2, Card, CardHeader, EmptyState, KPICard, Pill, type PillVariant } from '../hifi';
import { buildCodeMap } from '../../lib/displayId';

type CAPAStatus = 'open' | 'in_progress' | 'resolved';

interface CAPARecord {
  testId: string;
  status: CAPAStatus;
  suggestion?: CAPAResult;
}

export function CAPAFunnel() {
  const { t } = useTranslation();
  const tests = useTestsStore((s) => s.tests);
  const requirements = useRequirementsStore((s) => s.requirements);
  const project = useProjectStore((s) => s.project);
  const hasProvider = useLLMStore((s) => s.hasAnyProvider());

  const [capaRecords, setCapaRecords] = useState<Record<string, CAPARecord>>({});
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const failedTests = useMemo(
    () => tests.filter((test) => test.status === 'Failed'),
    [tests],
  );
  const testCodes = useMemo(() => buildCodeMap(tests, 'TST'), [tests]);
  const reqCodes = useMemo(() => buildCodeMap(requirements, 'REQ'), [requirements]);

  const summary = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    for (const test of failedTests) {
      const record = capaRecords[test.id];
      if (!record || record.status === 'open') open++;
      else if (record.status === 'in_progress') inProgress++;
      else resolved++;
    }
    return { total: failedTests.length, open, inProgress, resolved };
  }, [failedTests, capaRecords]);

  const getLinkedReq = useCallback(
    (reqIds: string[]) => {
      if (reqIds.length === 0) return null;
      return requirements.find((r) => r.id === reqIds[0]) || null;
    },
    [requirements],
  );

  const handleSuggestCAPA = useCallback(
    async (testId: string) => {
      const test = tests.find((t) => t.id === testId);
      if (!test) return;
      const linkedReq = getLinkedReq(test.linkedRequirementIds);
      setGeneratingFor(testId);
      setExpandedTest(testId);
      try {
        const result = await suggestCAPA({
          failedTest: {
            id: test.id,
            title: test.title,
            description: test.description,
          },
          linkedRequirement: linkedReq
            ? { id: linkedReq.id, title: linkedReq.title, description: linkedReq.description }
            : { id: 'N/A', title: 'No linked requirement', description: '' },
          vertical: project?.vertical,
          country: project?.country || 'US',
        });
        setCapaRecords((prev) => ({
          ...prev,
          [testId]: { testId, status: 'in_progress', suggestion: result },
        }));
      } catch {
        // retry possible
      } finally {
        setGeneratingFor(null);
      }
    },
    [tests, getLinkedReq, project],
  );

  const handleStatusChange = useCallback((testId: string, status: CAPAStatus) => {
    setCapaRecords((prev) => ({
      ...prev,
      [testId]: { ...prev[testId], testId, status },
    }));
  }, []);

  const statusVariant = (status: CAPAStatus): PillVariant => {
    switch (status) {
      case 'open':
        return 'bad';
      case 'in_progress':
        return 'warn';
      case 'resolved':
        return 'ok';
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  };

  const statusLabel = (status: CAPAStatus): string => {
    switch (status) {
      case 'open':
        return t('dashboard.capaOpen', { defaultValue: 'Ouvert' });
      case 'in_progress':
        return t('dashboard.capaInProgress', { defaultValue: 'En cours' });
      case 'resolved':
        return t('dashboard.capaResolved', { defaultValue: 'Résolu' });
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-hifi-title text-text-primary">
          {t('dashboard.capaFunnel', { defaultValue: 'CAPA' })}
        </h2>
        <p className="mt-0.5 text-hifi-sub text-text-tertiary">
          Actions correctives / préventives sur les tests en échec.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label={t('dashboard.capaTotalFailed', { defaultValue: 'Échecs' })} value={summary.total} />
        <KPICard
          label={t('dashboard.capaOpen', { defaultValue: 'Ouverts' })}
          value={<span className="text-bad">{summary.open}</span>}
        />
        <KPICard
          label={t('dashboard.capaInProgress', { defaultValue: 'En cours' })}
          value={<span className="text-warn">{summary.inProgress}</span>}
        />
        <KPICard
          label={t('dashboard.capaResolved', { defaultValue: 'Résolus' })}
          value={<span className="text-ok">{summary.resolved}</span>}
        />
      </div>

      {failedTests.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-6" />}
          title={t('dashboard.capaNoFailedTests', { defaultValue: 'Aucun test en échec' })}
          description="Les CAPA apparaîtront ici dès qu’un test passera en Failed."
        />
      ) : (
        <Card>
          <CardHeader
            title="File CAPA"
            subtitle={`${failedTests.length} test${failedTests.length > 1 ? 's' : ''} en échec`}
          />
          <ul className="divide-y divide-border">
            {failedTests.map((test) => {
              const record = capaRecords[test.id];
              const status: CAPAStatus = record?.status || 'open';
              const linkedReq = getLinkedReq(test.linkedRequirementIds);
              const isExpanded = expandedTest === test.id;
              const isGenerating = generatingFor === test.id;

              return (
                <li key={test.id} className="px-3.5 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Pill variant={statusVariant(status)}>{statusLabel(status)}</Pill>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-accent">
                          {testCodes.get(test.id) ?? 'TST'}
                        </span>
                        <span className="truncate text-[13px] font-medium text-text-primary">
                          {test.title}
                        </span>
                      </div>
                      {linkedReq ? (
                        <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
                          {reqCodes.get(linkedReq.id) ?? 'REQ'} · {linkedReq.title}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasProvider ? (
                        <Btn2
                          variant="secondary"
                          leading={<Sparkles className="size-3.5" />}
                          onClick={() => handleSuggestCAPA(test.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating
                            ? t('ai.generating', { defaultValue: '…' })
                            : t('dashboard.capaSuggestAI', { defaultValue: 'Suggérer' })}
                        </Btn2>
                      ) : null}
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(test.id, e.target.value as CAPAStatus)
                        }
                        className="h-8 rounded-r2 border border-border bg-card px-2 text-[12px] text-text-primary"
                      >
                        <option value="open">{statusLabel('open')}</option>
                        <option value="in_progress">{statusLabel('in_progress')}</option>
                        <option value="resolved">{statusLabel('resolved')}</option>
                      </select>
                      {record?.suggestion ? (
                        <Btn2
                          variant="ghost"
                          trailing={
                            isExpanded ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )
                          }
                          onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                        >
                          {isExpanded ? 'Masquer' : 'Voir'}
                        </Btn2>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded && isGenerating ? (
                    <div className="mt-3 flex items-center gap-2 rounded-r2 border border-border bg-n-50 px-3 py-2.5">
                      <div className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <span className="text-[12.5px] text-text-secondary">
                        {t('ai.generating', { defaultValue: 'Génération…' })}
                      </span>
                    </div>
                  ) : null}

                  {isExpanded && record?.suggestion ? (
                    <div className="mt-3 grid gap-2 rounded-r2 border border-accent/20 bg-accent-subtle/40 p-3 sm:grid-cols-2">
                      {(
                        [
                          ['dashboard.capaRootCause', 'Cause racine', record.suggestion.rootCause],
                          ['dashboard.capaContainment', 'Containment', record.suggestion.containment],
                          [
                            'dashboard.capaCorrectiveAction',
                            'Corrective',
                            record.suggestion.correctiveAction,
                          ],
                          [
                            'dashboard.capaPreventiveAction',
                            'Préventive',
                            record.suggestion.preventiveAction,
                          ],
                          [
                            'dashboard.capaEffectivenessCheck',
                            'Efficacité',
                            record.suggestion.effectivenessCheck,
                          ],
                        ] as const
                      ).map(([key, fallback, text]) => (
                        <div
                          key={key}
                          className={
                            key === 'dashboard.capaEffectivenessCheck' ? 'sm:col-span-2' : undefined
                          }
                        >
                          <p className="text-hifi-label font-mono uppercase text-n-500">
                            {t(key, { defaultValue: fallback })}
                          </p>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-text-primary">{text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
