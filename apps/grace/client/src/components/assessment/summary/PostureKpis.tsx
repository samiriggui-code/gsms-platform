import type { AssessmentSummaryPosture, AssessmentSummaryActionPlan } from '../../../lib/csmp-types';
import { PRIORITY_TO_LEVEL } from '../../../lib/risk-ui';
import { useT } from '../../../i18n';
import { KPICard } from '../../hifi/KPICard';
import { RiskBadge } from '../../hifi/RiskBadge';

interface PostureKpisProps {
  posture: AssessmentSummaryPosture;
  actionPlan: AssessmentSummaryActionPlan;
}

export function PostureKpis({ posture, actionPlan }: PostureKpisProps) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard
        label={t('assessment.wizard.summaryHighestPriority')}
        value={posture.highestPriority
          ? <RiskBadge level={PRIORITY_TO_LEVEL[posture.highestPriority]} />
          : <span className="text-[14px] text-n-500">—</span>}
        sub={posture.unscoredThreatsCount > 0
          ? t('assessment.wizard.summaryUnscoredN', { n: posture.unscoredThreatsCount })
          : t('assessment.wizard.summaryAcrossThreats')}
      />
      <KPICard
        label={t('assessment.wizard.summaryHighExtremeIrv')}
        value={posture.highOrExtremeIrvCount}
        sub={posture.totalThreats > 0
          ? t('assessment.wizard.summaryOfThreats', { n: posture.totalThreats })
          : null}
      />
      <KPICard
        label={t('assessment.wizard.summaryTotalThreats')}
        value={posture.totalThreats}
      />
      <KPICard
        label={t('assessment.wizard.summaryActionProgress')}
        value={`${actionPlan.completionPct}%`}
        delta={actionPlan.overdueCount > 0
          ? { value: t('assessment.wizard.summaryOverdue', { n: actionPlan.overdueCount }), tone: 'bad' }
          : undefined}
        sub={actionPlan.total > 0
          ? t('assessment.wizard.summaryActionsTracked', { n: actionPlan.total })
          : t('assessment.wizard.summaryNoActions')}
      />
    </div>
  );
}
