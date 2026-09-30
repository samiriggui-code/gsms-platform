import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import { ClipboardCheck, RotateCcw } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Pill } from '../components/hifi/Pill';
import { RiskBadge } from '../components/hifi/RiskBadge';
import { assessmentsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { PRIORITY_TO_LEVEL, REVIEW_STATUS_VARIANT, reviewStatusLabel } from '../lib/risk-ui';
import { hasPermission } from '../lib/permissions';
import { useAuthStore } from '../stores/auth';
import { useT } from '../i18n';
import type { AssessmentSummary } from '../lib/csmp-types';

export function ReviewQueuePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<AssessmentSummary[]>([]);
  const [rejected, setRejected] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canReview = hasPermission(user?.role, 'assessments:review');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inReview, rej] = await Promise.all([
        assessmentsApi.list({ reviewStatus: 'IN_REVIEW', pageSize: 200 }),
        assessmentsApi.list({ reviewStatus: 'REJECTED', pageSize: 200 }),
      ]);
      setPending(inReview.items);
      setRejected(rej.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!canReview) return <Navigate to="/" replace />;

  // "Awaiting your review" hides assessments where current user is the lead
  // (separation of duties enforced server-side anyway).
  const awaitingYou = pending.filter((a) => a.leadAssessorId !== user?.id);
  const awaitingOthers = pending.filter((a) => a.leadAssessorId === user?.id);
  const myRejected = rejected.filter((a) => a.leadAssessorId === user?.id);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.review.crumbs')}</span>}
        title={t('page.review.title')}
        subtitle={t('page.review.subtitle', { awaiting: awaitingYou.length, sentBack: myRejected.length })}
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <QueueSection
          title={t('page.review.sectionAwaiting')}
          icon={<ClipboardCheck className="w-3.5 h-3.5" />}
          items={awaitingYou}
          loading={loading}
          emptyHint={t('page.review.emptyAwaiting')}
        />

        {awaitingOthers.length > 0 && (
          <QueueSection
            title={t('page.review.sectionYours')}
            icon={<ClipboardCheck className="w-3.5 h-3.5 text-n-500" />}
            items={awaitingOthers}
            loading={false}
            emptyHint=""
            subdued
            note={t('page.review.noteOwnReview')}
          />
        )}

        {myRejected.length > 0 && (
          <QueueSection
            title={t('page.review.sectionSentBack')}
            icon={<RotateCcw className="w-3.5 h-3.5 text-warn" />}
            items={myRejected}
            loading={false}
            emptyHint=""
            showNotes
          />
        )}
      </div>
    </>
  );
}

function QueueSection({
  title, icon, items, loading, emptyHint, subdued, note, showNotes,
}: {
  title: string;
  icon: React.ReactNode;
  items: AssessmentSummary[];
  loading: boolean;
  emptyHint: string;
  subdued?: boolean;
  note?: string;
  showNotes?: boolean;
}) {
  const t = useT();
  return (
    <section className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
      <header className="px-4 py-2.5 border-b border-n-150 bg-n-50 flex items-center gap-2">
        {icon}
        <h2 className="text-[12.5px] font-semibold text-n-800">{title}</h2>
        <span className="text-[11px] font-mono text-n-500 tracking-[0.4px] ml-auto">
          {items.length}
        </span>
      </header>

      {note && (
        <div className="px-4 py-2 text-[11.5px] text-n-600 bg-n-25 border-b border-n-100">
          {note}
        </div>
      )}

      <table className="w-full">
        <thead className="bg-n-25 border-b border-n-100">
          <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
            <th className="text-left px-4 py-2">{t('page.assessments.colTitle')}</th>
            <th className="text-left px-3 py-2">{t('page.assessments.colScope')}</th>
            <th className="text-left px-3 py-2">{t('page.assessments.colReview')}</th>
            <th className="text-left px-3 py-2">{t('page.assessments.colThreats')}</th>
            <th className="text-left px-3 py-2">{t('page.assessments.colTopPriority')}</th>
            <th className="text-left px-3 py-2">{t('page.assessments.colLead')}</th>
            <th className="text-left px-3 py-2">{t('page.review.colSubmitted')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className="text-center py-6 text-[12.5px] text-n-500">{t('common.loading')}</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-6 text-[12.5px] text-n-500">{emptyHint}</td></tr>
          ) : items.map((a) => (
            <tr
              key={a.id}
              className={[
                'border-b border-n-100 hover:bg-n-25 transition-colors',
                subdued ? 'opacity-75' : '',
              ].join(' ')}
            >
              <td className="px-4 py-2.5">
                <Link
                  to="/assessments/$id"
                  params={{ id: a.id }}
                  className="text-[13px] font-medium text-n-900 hover:text-a-600"
                >
                  {a.title}
                </Link>
                {showNotes && (
                  <div className="text-[11px] text-n-500 mt-0.5">
                    {t('page.review.rejectedHint')}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 text-[12px] text-n-700">
                {a.assetName ?? a.clusterName ?? '—'}
                {a.clusterId && (
                  <span className="ml-1.5"><Pill variant="outline">cluster</Pill></span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <Pill variant={REVIEW_STATUS_VARIANT[a.reviewStatus]}>
                  {reviewStatusLabel(a.reviewStatus)}
                </Pill>
              </td>
              <td className="px-3 py-2.5 text-[12px] font-mono text-n-700">{a.threatCount}</td>
              <td className="px-3 py-2.5">
                {a.highestPriority
                  ? <RiskBadge level={PRIORITY_TO_LEVEL[a.highestPriority]} value={a.highestPriority} />
                  : <span className="text-[11px] text-n-400">—</span>}
              </td>
              <td className="px-3 py-2.5 text-[12px] text-n-700">{a.leadAssessorName ?? '—'}</td>
              <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">
                {new Date(a.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
