import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvaluationData } from '../hooks/useEvaluationData';
import { useRequirementsStore } from '../store/useRequirementsStore';
import { useTestsStore } from '../store/useTestsStore';
import { CHART_COLORS } from '../lib/constants';
import { CoverageCard } from '../components/dashboard/CoverageCard';
import { StatusChart } from '../components/dashboard/StatusChart';
import { TraceabilityMatrix } from '../components/dashboard/TraceabilityMatrix';
import { OrphanedRequirements } from '../components/dashboard/OrphanedRequirements';
import { OrphanedTests } from '../components/dashboard/OrphanedTests';
import { FilterBar } from '../components/dashboard/FilterBar';
import { ComplianceReadiness } from '../components/dashboard/ComplianceReadiness';
import { GapAnalysisView } from '../components/dashboard/GapAnalysisView';
import { RiskMatrixView } from '../components/dashboard/RiskMatrixView';
import { EvidenceCompleteness } from '../components/dashboard/EvidenceCompleteness';
import { CAPAFunnel } from '../components/dashboard/CAPAFunnel';
import { TrendCharts } from '../components/dashboard/TrendCharts';
import type { DashboardFilters } from '../types';

const AnomalyDashboard = lazy(() => import('../components/analytics/AnomalyDashboard').then((m) => ({ default: m.AnomalyDashboard })));
const PredictiveView = lazy(() => import('../components/analytics/PredictiveView').then((m) => ({ default: m.PredictiveView })));

type DashboardTab = 'overview' | 'compliance' | 'risk' | 'evidence' | 'capa' | 'trends' | 'anomalies' | 'predictive';

export function DashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [filters, setFilters] = useState<DashboardFilters>({
    requirementStatus: 'All',
    testStatus: 'All',
  });

  const metrics = useEvaluationData(filters);
  const allRequirements = useRequirementsStore((s) => s.requirements);
  const allTests = useTestsStore((s) => s.tests);

  // Apply filters for the matrix
  const filteredReqs = filters.requirementStatus !== 'All'
    ? allRequirements.filter((r) => r.status === filters.requirementStatus)
    : allRequirements;
  const filteredTests = filters.testStatus !== 'All'
    ? allTests.filter((t) => t.status === filters.testStatus)
    : allTests;

  const reqChartData = Object.entries(metrics.requirementStatusCounts).map(([name, value]) => ({
    name,
    value,
    color: CHART_COLORS.requirement[name as keyof typeof CHART_COLORS.requirement],
  }));

  const testChartData = Object.entries(metrics.testStatusCounts).map(([name, value]) => ({
    name,
    value,
    color: CHART_COLORS.test[name as keyof typeof CHART_COLORS.test],
  }));

  const tabs: { id: DashboardTab; labelKey: string }[] = [
    { id: 'overview', labelKey: 'dashboard.tabOverview' },
    { id: 'compliance', labelKey: 'dashboard.tabCompliance' },
    { id: 'risk', labelKey: 'dashboard.tabRisk' },
    { id: 'evidence', labelKey: 'dashboard.tabEvidence' },
    { id: 'capa', labelKey: 'dashboard.tabCAPA' },
    { id: 'trends', labelKey: 'dashboard.tabTrends' },
    { id: 'anomalies', labelKey: 'analytics.tabAnomalies' },
    { id: 'predictive', labelKey: 'predictive.tabPredictive' },
  ];

  return (
    <div className="space-y-6">
      {/* Sous-vues de la page Évaluation — PAS un palier de navigation app (voir QATRIAL-NAV-DIAGNOSTIC.md) */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          {t('dashboard.viewsLabel', { defaultValue: 'Vues de cette page' })}
        </p>
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label={t('dashboard.viewsLabel', { defaultValue: 'Vues de cette page' })}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-7 rounded-r1 px-2.5 text-[11.5px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-n-100 text-text-tertiary hover:bg-n-200 hover:text-text-secondary'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          <FilterBar filters={filters} onChange={setFilters} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CoverageCard
              coveragePercent={metrics.coveragePercent}
              covered={metrics.totalRequirements - metrics.orphanedRequirements.length}
              total={metrics.totalRequirements}
            />
            <StatusChart title={t('dashboard.reqStatusChart')} data={reqChartData} type="pie" />
            <StatusChart title={t('dashboard.testStatusChart')} data={testChartData} type="pie" />
          </div>

          <TraceabilityMatrix filteredRequirements={filteredReqs} filteredTests={filteredTests} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrphanedRequirements requirements={metrics.orphanedRequirements} />
            <OrphanedTests tests={metrics.orphanedTests} />
          </div>
        </>
      )}

      {/* Compliance tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-5">
          <ComplianceReadiness />
          <GapAnalysisView />
        </div>
      )}

      {/* Risk tab */}
      {activeTab === 'risk' && <RiskMatrixView />}

      {/* Evidence tab */}
      {activeTab === 'evidence' && <EvidenceCompleteness />}

      {/* CAPA tab */}
      {activeTab === 'capa' && <CAPAFunnel />}

      {/* Trends tab */}
      {activeTab === 'trends' && <TrendCharts />}

      {/* Anomalies tab */}
      {activeTab === 'anomalies' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        }>
          <AnomalyDashboard />
        </Suspense>
      )}

      {/* Predictive tab */}
      {activeTab === 'predictive' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        }>
          <PredictiveView />
        </Suspense>
      )}
    </div>
  );
}
