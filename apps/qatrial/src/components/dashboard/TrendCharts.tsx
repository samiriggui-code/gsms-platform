/**
 * Tendances — snapshot distributions via kit Chart hifi (plus de Recharts brut).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { CHART_COLORS } from '../../lib/constants';
import {
  BarChartView,
  ChartCard,
  EmptyState,
  PieChartView,
} from '../hifi';

const RISK_COLORS: Record<string, string> = {
  critical: '#b02a1a',
  high: '#c45c12',
  medium: '#9a6209',
  low: '#2f7a3d',
  unassessed: '#72726e',
};

export function TrendCharts() {
  const { t } = useTranslation();
  const requirements = useRequirementsStore((s) => s.requirements);
  const tests = useTestsStore((s) => s.tests);

  const reqStatusData = useMemo(() => {
    const counts: Record<string, number> = { Draft: 0, Active: 0, Closed: 0 };
    for (const req of requirements) {
      counts[req.status] = (counts[req.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: CHART_COLORS.requirement[name as keyof typeof CHART_COLORS.requirement],
    }));
  }, [requirements]);

  const testStatusData = useMemo(() => {
    const counts: Record<string, number> = { 'Not Run': 0, Passed: 0, Failed: 0 };
    for (const test of tests) {
      counts[test.status] = (counts[test.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: CHART_COLORS.test[name as keyof typeof CHART_COLORS.test],
    }));
  }, [tests]);

  const riskData = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unassessed: 0,
    };
    for (const req of requirements) {
      const level = req.riskLevel || 'unassessed';
      counts[level] = (counts[level] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: RISK_COLORS[name],
      }));
  }, [requirements]);

  const coverageByCategory = useMemo(() => {
    const categories = new Map<string, { total: number; covered: number }>();
    for (const req of requirements) {
      const category =
        req.tags && req.tags.length > 0 ? req.tags[0] : req.riskLevel || 'Uncategorized';
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      if (!categories.has(label)) categories.set(label, { total: 0, covered: 0 });
      const entry = categories.get(label)!;
      entry.total++;
      if (tests.some((test) => test.linkedRequirementIds.includes(req.id))) {
        entry.covered++;
      }
    }
    return Array.from(categories.entries()).map(([name, data]) => ({
      name,
      value: data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0,
      color: '#4f56e5',
    }));
  }, [requirements, tests]);

  const hasData = requirements.length > 0 || tests.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title={t('dashboard.trends')}
        description={t('common.noData')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-text-tertiary">{t('dashboard.trendsDescription')}</p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title={t('dashboard.trendReqByStatus')}
          subtitle={`${requirements.length} exigences`}
        >
          <BarChartView data={reqStatusData} height={200} empty={t('common.noData')} />
        </ChartCard>

        <ChartCard
          title={t('dashboard.trendTestByStatus')}
          subtitle={`${tests.length} tests`}
        >
          <BarChartView data={testStatusData} height={200} empty={t('common.noData')} />
        </ChartCard>

        <ChartCard title={t('dashboard.trendRiskDistribution')}>
          <PieChartView data={riskData} height={200} empty={t('common.noData')} />
        </ChartCard>

        <ChartCard
          title={t('dashboard.trendCoverageByCategory')}
          subtitle="% couverture par catégorie"
        >
          <BarChartView data={coverageByCategory} height={200} empty={t('common.noData')} />
        </ChartCard>
      </div>
    </div>
  );
}
