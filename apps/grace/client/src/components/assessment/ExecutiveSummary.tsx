import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { assessmentsApi } from '../../lib/csmp-api';
import { extractError } from '../../lib/api';
import type { AssessmentSummaryResponse } from '../../lib/csmp-types';
import { Btn2 } from '../hifi/Btn2';
import { useT } from '../../i18n';
import { HeroStrip } from './summary/HeroStrip';
import { PostureKpis } from './summary/PostureKpis';
import { DistributionBars } from './summary/DistributionBars';
import { TopThreatsTable } from './summary/TopThreatsTable';
import { ActionPlanProgress } from './summary/ActionPlanProgress';
import { ComplianceCoverage } from './summary/ComplianceCoverage';
import { ProtectiveCoverage } from './summary/ProtectiveCoverage';
import { RecommendationsList } from './summary/RecommendationsList';

interface ExecutiveSummaryProps {
  assessmentId: string;
  assessmentTitle: string;
  onDownloadReport: () => void | Promise<void>;
  downloadingReport: boolean;
}

const IRV_TONE: Record<string, 'Extreme' | 'High' | 'Moderate' | 'Low' | 'Negligible' | 'Neutral'> = {
  EXTREME: 'Extreme',
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
  NEGLIGIBLE: 'Negligible',
  UNSCORED: 'Neutral',
};

const PRIORITY_TONE: Record<string, 'Extreme' | 'High' | 'Moderate' | 'Low' | 'Neutral'> = {
  HIGHEST: 'Extreme',
  HIGH: 'High',
  MEDIUM: 'Moderate',
  LOW: 'Low',
  UNSCORED: 'Neutral',
};

const TEAR_TONE: Record<string, 'Neutral'> = {
  REDUCE: 'Neutral',
  TRANSFER: 'Neutral',
  ACCEPT: 'Neutral',
  ELIMINATE: 'Neutral',
  UNSCORED: 'Neutral',
};

const VULN_TONE: Record<string, 'Extreme' | 'High' | 'Moderate' | 'Low' | 'Neutral'> = {
  INADEQUATE: 'Extreme',
  BARELY_ADEQUATE: 'High',
  BASELINE: 'Moderate',
  STRONG: 'Low',
  UNSCORED: 'Neutral',
};

export function ExecutiveSummary({
  assessmentId,
  assessmentTitle,
  onDownloadReport,
  downloadingReport,
}: ExecutiveSummaryProps) {
  const t = useT();
  const [data, setData] = useState<AssessmentSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const irvLabels = useMemo(() => ({
    EXTREME: t('enum.irvBand.EXTREME'),
    HIGH: t('enum.irvBand.HIGH'),
    MODERATE: t('enum.irvBand.MODERATE'),
    LOW: t('enum.irvBand.LOW'),
    NEGLIGIBLE: t('enum.irvBand.NEGLIGIBLE'),
    UNSCORED: t('assessment.wizard.summaryUnscored'),
  }), [t]);

  const priorityLabels = useMemo(() => ({
    HIGHEST: t('enum.riskPriority.HIGHEST'),
    HIGH: t('enum.riskPriority.HIGH'),
    MEDIUM: t('enum.riskPriority.MEDIUM'),
    LOW: t('enum.riskPriority.LOW'),
    UNSCORED: t('assessment.wizard.summaryUnscored'),
  }), [t]);

  const tearLabels = useMemo(() => ({
    REDUCE: t('enum.tear.REDUCE'),
    TRANSFER: t('enum.tear.TRANSFER'),
    ACCEPT: t('enum.tear.ACCEPT'),
    ELIMINATE: t('enum.tear.ELIMINATE'),
    UNSCORED: t('assessment.wizard.summaryNotSet'),
  }), [t]);

  const vulnLabels = useMemo(() => ({
    INADEQUATE: t('enum.vulnerabilityRating.INADEQUATE'),
    BARELY_ADEQUATE: t('enum.vulnerabilityRating.BARELY_ADEQUATE'),
    BASELINE: t('enum.vulnerabilityRating.BASELINE'),
    STRONG: t('enum.vulnerabilityRating.STRONG'),
    UNSCORED: t('assessment.wizard.summaryUnscored'),
  }), [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.getSummary(assessmentId);
      setData(res);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-6 text-center text-[12px] text-n-500">
        {t('assessment.wizard.summaryLoading')}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2 text-[12px] text-bad">
        {error ?? t('assessment.wizard.summaryFailed')}
      </div>
    );
  }

  void assessmentTitle;
  const totalThreats = data.posture.totalThreats;

  return (
    <div className="space-y-4">
      <HeroStrip hero={data.hero} />

      <PostureKpis posture={data.posture} actionPlan={data.actionPlan} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DistributionBars
          title={t('assessment.wizard.summaryIrvTitle')}
          subtitle={t('assessment.wizard.summaryIrvSub')}
          buckets={data.irvDistribution}
          labels={irvLabels}
          tones={IRV_TONE}
        />
        <DistributionBars
          title={t('assessment.wizard.summaryPriorityTitle')}
          subtitle={t('assessment.wizard.summaryPrioritySub')}
          buckets={data.priorityDistribution}
          labels={priorityLabels}
          tones={PRIORITY_TONE}
        />
      </div>

      <TopThreatsTable threats={data.topThreats} />

      <ActionPlanProgress actionPlan={data.actionPlan} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DistributionBars
          title={t('assessment.wizard.summaryTearTitle')}
          subtitle={t('assessment.wizard.summaryTearSub')}
          buckets={data.tearMix}
          labels={tearLabels}
          tones={TEAR_TONE}
        />
        <DistributionBars
          title={t('assessment.wizard.summaryVulnTitle')}
          subtitle={t('assessment.wizard.summaryVulnSub')}
          buckets={data.vulnerabilityMix}
          labels={vulnLabels}
          tones={VULN_TONE}
        />
      </div>

      <ComplianceCoverage items={data.compliance} totalThreats={totalThreats} />

      <ProtectiveCoverage items={data.protectiveCoverage} />

      <RecommendationsList items={data.recommendations} />

      <div className="flex justify-end">
        <Btn2
          variant="primary"
          leading={<Download className="w-3.5 h-3.5" />}
          disabled={downloadingReport}
          onClick={() => void onDownloadReport()}
        >
          {downloadingReport ? t('assessment.wizard.summaryDownloading') : t('assessment.wizard.summaryDownloadPdf')}
        </Btn2>
      </div>
    </div>
  );
}
