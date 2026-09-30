import type { ThreatSummary } from '../../../lib/csmp-types';
import { IRV_TO_LEVEL, PRIORITY_TO_LEVEL } from '../../../lib/risk-ui';
import { useT } from '../../../i18n';
import { Card } from '../../hifi/Card';
import { CardHeader } from '../../hifi/CardHeader';
import { Pill } from '../../hifi/Pill';
import { RiskBadge } from '../../hifi/RiskBadge';

interface TopThreatsTableProps {
  threats: ThreatSummary[];
}

export function TopThreatsTable({ threats }: TopThreatsTableProps) {
  const t = useT();
  if (threats.length === 0) {
    return (
      <Card>
        <CardHeader title={t('assessment.wizard.summaryTopRisks')} subtitle={t('assessment.wizard.summaryTopRisksSub')} />
        <div className="px-[14px] py-6 text-center text-[12px] text-n-500">
          {t('assessment.wizard.summaryNoThreats')}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t('assessment.wizard.summaryTopRisks')}
        subtitle={t('assessment.wizard.summaryTopRisksSubN', { n: threats.length })}
      />
      <div className="divide-y divide-n-150">
        {threats.map((row, i) => (
          <div key={row.id} className="px-[14px] py-2.5 flex items-start gap-3">
            <div className="text-[11px] font-mono text-n-500 w-5 shrink-0 mt-0.5">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-n-900 truncate">
                {row.targetAssetName ?? '—'}
              </div>
              <div className="text-[11.5px] text-n-500 truncate">
                {t(`enum.adversaryType.${row.adversaryType}`)}
                {' · '}
                {t(`enum.actionType.${row.actionType}`)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {row.irv ? <RiskBadge level={IRV_TO_LEVEL[row.irv]} /> : null}
              {row.riskTreatmentPriority ? (
                <RiskBadge level={PRIORITY_TO_LEVEL[row.riskTreatmentPriority]} />
              ) : null}
              {row.tearStrategy && <Pill variant="outline">{t(`enum.tear.${row.tearStrategy}`)}</Pill>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
