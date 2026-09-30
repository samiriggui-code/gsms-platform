import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ClipboardCheck, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Card, CardHeader, KPICard, Pill } from '../components/hifi';
import { RiskBadge } from '../components/hifi/RiskBadge';
import { Btn2 } from '../components/hifi/Btn2';
import { assessmentsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { PRIORITY_TO_LEVEL, REVIEW_STATUS_VARIANT, reviewStatusLabel, statusLabel } from '../lib/risk-ui';
import { useAuthStore } from '../stores/auth';
import type { AssessmentSummary } from '../lib/csmp-types';
import { useT, useLocale } from '../i18n';

const IN_FLIGHT_STATUSES = new Set<AssessmentSummary['status']>([
  'STEP_1_ASSETS', 'STEP_2_THREATS', 'STEP_3_LIKELIHOOD', 'STEP_4_IMPACT',
  'STEP_5_IRV', 'STEP_6_VULNERABILITY', 'STEP_7_TREATMENT',
]);

export function DashboardPage() {
  const t = useT();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.organization);
  const today = new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const [items, setItems] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await assessmentsApi.list({ pageSize: 200 });
        if (!cancelled) setItems(res.items);
      } catch (err) {
        if (!cancelled) setError(await extractError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const inFlight = items.filter((a) => IN_FLIGHT_STATUSES.has(a.status)).length;
  const awaitingReview = items.filter((a) => a.status === 'REVIEW' || a.reviewStatus === 'IN_REVIEW').length;
  const approved = items.filter((a) => a.status === 'APPROVED').length;
  const highRisk = items.filter((a) => a.highestPriority === 'HIGH' || a.highestPriority === 'HIGHEST').length;

  const recent = [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{org?.name} · {today}</span>}
        title={t('page.dashboard.title', { name: user?.firstName ?? '' })}
        subtitle={t('page.dashboard.subtitle')}
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <KPICard
            label={t('page.dashboard.kpiInProgress')}
            value={loading ? '—' : String(inFlight)}
            sub={t('page.dashboard.kpiInProgressSub')}
          />
          <KPICard
            label={t('page.dashboard.kpiAwaiting')}
            value={loading ? '—' : String(awaitingReview)}
            sub={t('page.dashboard.kpiAwaitingSub')}
          />
          <KPICard
            label={t('page.dashboard.kpiApproved')}
            value={loading ? '—' : String(approved)}
            sub={t('page.dashboard.kpiApprovedSub')}
          />
          <KPICard
            label={t('page.dashboard.kpiHighRisk')}
            value={loading ? '—' : String(highRisk)}
            sub={t('page.dashboard.kpiHighRiskSub')}
          />
        </div>

        <Card>
          <CardHeader
            title={t('page.dashboard.recent')}
            subtitle={t('page.dashboard.recentSub')}
            actions={
              <Link to="/assessments">
                <Btn2 variant="ghost">{t('nav.assessments')}</Btn2>
              </Link>
            }
          />
          {loading ? (
            <div className="p-5 text-[12.5px] text-n-500">{t('page.dashboard.loading')}</div>
          ) : recent.length === 0 ? (
            <div className="p-5 flex items-center justify-between">
              <div className="text-[12.5px] text-n-600">
                {t('page.dashboard.emptyRecent')}
              </div>
              <Link to="/assessments">
                <Btn2 variant="primary">{t('page.dashboard.emptyRecentCta')}</Btn2>
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted border-b border-t border-border">
                <tr className="text-[10.5px] font-mono uppercase text-muted-foreground tracking-[0.4px]">
                  <th className="text-left px-4 py-2">{t('page.dashboard.colTitle')}</th>
                  <th className="text-left px-3 py-2">{t('page.dashboard.colStep')}</th>
                  <th className="text-left px-3 py-2">{t('page.dashboard.colReview')}</th>
                  <th className="text-left px-3 py-2">{t('page.dashboard.colTopPriority')}</th>
                  <th className="text-left px-3 py-2">{t('page.dashboard.colUpdated')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id} className="border-b border-border hover:bg-n-100 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/assessments/$id"
                        params={{ id: a.id }}
                        className="text-[13px] font-medium text-n-900 hover:text-a-500"
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-600">{statusLabel(a.status)}</td>
                    <td className="px-3 py-2.5">
                      <Pill variant={REVIEW_STATUS_VARIANT[a.reviewStatus]}>{reviewStatusLabel(a.reviewStatus)}</Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      {a.highestPriority
                        ? <RiskBadge level={PRIORITY_TO_LEVEL[a.highestPriority]} value={a.highestPriority} />
                        : <span className="text-[11px] text-n-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="grid grid-cols-4 gap-3">
          <Status icon={<ClipboardCheck className="w-3.5 h-3.5" />} label={t('page.dashboard.statusAssessments')} state="ok" />
          <Status icon={<CheckCircle2 className="w-3.5 h-3.5" />} label={t('page.dashboard.statusAssets')} state="ok" />
          <Status icon={<Flame className="w-3.5 h-3.5" />} label={t('page.dashboard.statusTemplates')} state="ok" />
          <Status icon={<AlertTriangle className="w-3.5 h-3.5" />} label={t('page.dashboard.statusIncidents')} state="ok" />
        </div>
      </div>
    </>
  );
}

function Status({ icon, label, state }: { icon: React.ReactNode; label: string; state: 'ok' | 'pending' }) {
  const cls =
    state === 'ok'
      ? 'bg-ok-bg text-ok border-ok/20'
      : 'bg-n-75 text-n-500 border-n-150';
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-r2 border ${cls}`}>
      {icon}
      <span className="text-[11.5px] font-medium">{label}</span>
    </div>
  );
}
