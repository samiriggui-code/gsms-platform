/**
 * Matrice de risque — KPI + grille 5×5 + panneau détail (kit hifi).
 * Les exigences n’ont souvent qu’un riskLevel : répartition dans la zone
 * correspondante (pas uniquement la diagonale).
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useLLMStore } from '../../store/useLLMStore';
import { classifyRisk } from '../../ai/prompts/riskClassification';
import type { Requirement, RiskLevel, Severity, Likelihood } from '../../types';
import { Btn2, Card, CardHeader, EmptyState, KPICard, Pill, type PillVariant } from '../hifi';
import { buildCodeMap } from '../../lib/displayId';
import { cn } from '../../lib/cn';

type CellCoord = { severity: Severity; likelihood: Likelihood };

const RISK_PILL: Record<RiskLevel, PillVariant> = {
  critical: 'bad',
  high: 'warn',
  medium: 'warn',
  low: 'ok',
};

const ZONE_OPTS: Record<RiskLevel, CellCoord[]> = {
  critical: [
    { severity: 5, likelihood: 5 },
    { severity: 5, likelihood: 4 },
    { severity: 4, likelihood: 5 },
  ],
  high: [
    { severity: 4, likelihood: 4 },
    { severity: 5, likelihood: 3 },
    { severity: 3, likelihood: 5 },
    { severity: 4, likelihood: 3 },
    { severity: 3, likelihood: 4 },
  ],
  medium: [
    { severity: 3, likelihood: 3 },
    { severity: 4, likelihood: 2 },
    { severity: 2, likelihood: 4 },
    { severity: 3, likelihood: 2 },
    { severity: 2, likelihood: 3 },
  ],
  low: [
    { severity: 2, likelihood: 2 },
    { severity: 1, likelihood: 3 },
    { severity: 3, likelihood: 1 },
    { severity: 1, likelihood: 2 },
    { severity: 2, likelihood: 1 },
    { severity: 1, likelihood: 1 },
  ],
};

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return h;
}

function riskLevelToCoords(level: RiskLevel, seed: string): CellCoord {
  const opts = ZONE_OPTS[level];
  return opts[hashSeed(seed) % opts.length]!;
}

function zoneTone(sev: number, lik: number): 'critical' | 'high' | 'medium' | 'low' {
  const score = sev * lik;
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function zoneBg(sev: number, lik: number): string {
  const tone = zoneTone(sev, lik);
  switch (tone) {
    case 'critical':
      return 'bg-r-ext/90 hover:bg-r-ext';
    case 'high':
      return 'bg-r-high/80 hover:bg-r-high';
    case 'medium':
      return 'bg-r-mod/70 hover:bg-r-mod';
    case 'low':
      return 'bg-r-low/70 hover:bg-r-low';
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

const SEVERITY_LABELS = ['Néglig.', 'Mineur', 'Modéré', 'Majeur', 'Critique'];
const LIKELIHOOD_LABELS = ['Rare', 'Peu prob.', 'Possible', 'Probable', 'Quasi sûr'];

export function RiskMatrixView() {
  const { t } = useTranslation();
  const requirements = useRequirementsStore((s) => s.requirements);
  const reqCodes = useMemo(() => buildCodeMap(requirements, 'REQ'), [requirements]);
  const updateRequirement = useRequirementsStore((s) => s.updateRequirement);
  const project = useProjectStore((s) => s.project);
  const hasProvider = useLLMStore((s) => s.hasAnyProvider());

  const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);
  const [classifying, setClassifying] = useState(false);

  const grid = useMemo(() => {
    const cells = new Map<string, Requirement[]>();
    for (const req of requirements) {
      if (!req.riskLevel) continue;
      const coords = riskLevelToCoords(req.riskLevel, req.id);
      const key = `${coords.severity}-${coords.likelihood}`;
      const existing = cells.get(key) || [];
      existing.push(req);
      cells.set(key, existing);
    }
    return cells;
  }, [requirements]);

  const summary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, unassessed: 0 };
    for (const req of requirements) {
      if (!req.riskLevel) counts.unassessed++;
      else counts[req.riskLevel]++;
    }
    return counts;
  }, [requirements]);

  const selectedReqs = useMemo(() => {
    if (!selectedCell) return [];
    const key = `${selectedCell.severity}-${selectedCell.likelihood}`;
    return grid.get(key) || [];
  }, [selectedCell, grid]);

  const handleClassifyAll = useCallback(async () => {
    if (!hasProvider) return;
    setClassifying(true);
    try {
      const unassessed = requirements.filter((r) => !r.riskLevel);
      for (const req of unassessed) {
        try {
          const result = await classifyRisk({
            requirement: { id: req.id, title: req.title, description: req.description },
            vertical: project?.vertical,
            country: project?.country || 'US',
            riskTaxonomy: 'generic',
            allRequirements: requirements.map((r) => ({ id: r.id, title: r.title })),
          });
          const score = result.proposedSeverity * result.proposedLikelihood;
          let level: RiskLevel;
          if (score >= 16) level = 'critical';
          else if (score >= 9) level = 'high';
          else if (score >= 4) level = 'medium';
          else level = 'low';
          updateRequirement(req.id, { riskLevel: level });
        } catch {
          // continue
        }
      }
    } finally {
      setClassifying(false);
    }
  }, [requirements, hasProvider, project, updateRequirement]);

  if (requirements.length === 0) {
    return (
      <EmptyState
        title={t('dashboard.riskMatrix', { defaultValue: 'Matrice de risque' })}
        description="Aucune exigence — rien à classer pour l’instant."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-hifi-title text-text-primary">
            {t('dashboard.riskMatrix', { defaultValue: 'Matrice de risque' })}
          </h2>
          <p className="mt-0.5 text-hifi-sub text-text-tertiary">
            Sévérité × probabilité — clic cellule pour le détail.
          </p>
        </div>
        {summary.unassessed > 0 && hasProvider ? (
          <Btn2
            variant="secondary"
            leading={<Sparkles className="size-3.5" />}
            onClick={handleClassifyAll}
            disabled={classifying}
          >
            {classifying
              ? t('ai.generating', { defaultValue: 'Analyse…' })
              : `Classer ${summary.unassessed} non évaluée${summary.unassessed > 1 ? 's' : ''}`}
          </Btn2>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label={t('risk.critical', { defaultValue: 'Critique' })}
          value={<span className="text-bad">{summary.critical}</span>}
        />
        <KPICard
          label={t('risk.high', { defaultValue: 'Élevé' })}
          value={<span className="text-warn">{summary.high}</span>}
        />
        <KPICard label={t('risk.medium', { defaultValue: 'Moyen' })} value={summary.medium} />
        <KPICard
          label={t('risk.low', { defaultValue: 'Faible' })}
          value={<span className="text-ok">{summary.low}</span>}
        />
        <KPICard
          label={t('dashboard.unassessed', { defaultValue: 'Non évalué' })}
          value={summary.unassessed}
          delta={
            summary.unassessed > 0
              ? { value: 'À traiter', tone: 'bad' }
              : { value: 'Complet', tone: 'ok' }
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader
            title="Grille 5 × 5"
            subtitle="Probabilité (Y) × Sévérité (X)"
            pills={
              <>
                <Pill variant="ok">{t('risk.low', { defaultValue: 'Faible' })}</Pill>
                <Pill variant="warn">{t('risk.medium', { defaultValue: 'Moyen' })}</Pill>
                <Pill variant="warn">{t('risk.high', { defaultValue: 'Élevé' })}</Pill>
                <Pill variant="bad">{t('risk.critical', { defaultValue: 'Critique' })}</Pill>
              </>
            }
          />
          <div className="overflow-x-auto p-3.5">
            <div className="inline-block min-w-[320px]">
              <div className="mb-1.5 pl-[4.5rem] text-center text-[10px] font-medium uppercase tracking-wide text-n-500">
                {t('risk.severity', { defaultValue: 'Sévérité' })}
              </div>
              <div className="flex">
                <div className="flex w-[4.5rem] shrink-0 flex-col-reverse">
                  {([1, 2, 3, 4, 5] as const).map((lik) => (
                    <div key={lik} className="flex h-14 items-center justify-end pr-2">
                      <span className="text-right text-[10px] leading-tight text-text-tertiary">
                        {lik}
                        <br />
                        {LIKELIHOOD_LABELS[lik - 1]}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="grid grid-cols-5 gap-1">
                    {([5, 4, 3, 2, 1] as const).map((lik) =>
                      ([1, 2, 3, 4, 5] as const).map((sev) => {
                        const key = `${sev}-${lik}`;
                        const cellReqs = grid.get(key) || [];
                        const isSelected =
                          selectedCell?.severity === sev && selectedCell?.likelihood === lik;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedCell({ severity: sev, likelihood: lik })}
                            className={cn(
                              'flex h-14 w-14 items-center justify-center rounded-r2 transition-all',
                              zoneBg(sev, lik),
                              isSelected && 'ring-2 ring-accent ring-offset-1',
                            )}
                          >
                            {cellReqs.length > 0 ? (
                              <span className="text-[13px] font-bold text-white drop-shadow-sm">
                                {cellReqs.length}
                              </span>
                            ) : null}
                          </button>
                        );
                      }),
                    )}
                  </div>
                  <div className="mt-1 grid grid-cols-5 gap-1">
                    {SEVERITY_LABELS.map((label, i) => (
                      <div key={label} className="w-14 text-center text-[9px] text-n-500">
                        {i + 1}
                        <br />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 pl-[4.5rem] text-[10px] font-medium uppercase tracking-wide text-n-500">
                {t('risk.likelihood', { defaultValue: 'Probabilité' })} ↑
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-[280px] flex-col">
          <CardHeader
            title={
              selectedCell
                ? `Cellule S${selectedCell.severity} × P${selectedCell.likelihood}`
                : 'Détail'
            }
            subtitle={
              selectedCell
                ? t(`risk.${zoneTone(selectedCell.severity, selectedCell.likelihood)}`, {
                    defaultValue: zoneTone(selectedCell.severity, selectedCell.likelihood),
                  })
                : 'Sélectionnez une case'
            }
            pills={
              selectedCell ? (
                <Pill variant={RISK_PILL[zoneTone(selectedCell.severity, selectedCell.likelihood)]}>
                  {selectedReqs.length} exig.
                </Pill>
              ) : undefined
            }
          />
          <div className="flex-1 overflow-auto p-3.5">
            {!selectedCell ? (
              <p className="py-10 text-center text-[12.5px] text-text-tertiary">
                {t('dashboard.clickCellHint', {
                  defaultValue: 'Cliquez une case de la matrice pour lister les exigences.',
                })}
              </p>
            ) : selectedReqs.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-text-tertiary">
                {t('dashboard.noRequirementsInCell', { defaultValue: 'Aucune exigence ici.' })}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedReqs.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-start gap-2 rounded-r2 border border-border bg-n-50/60 px-2.5 py-2"
                  >
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-accent">
                      {reqCodes.get(req.id) ?? 'REQ'}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-text-primary">
                      {req.title}
                    </span>
                    {req.riskLevel ? (
                      <Pill variant={RISK_PILL[req.riskLevel]}>{t(`risk.${req.riskLevel}`)}</Pill>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
