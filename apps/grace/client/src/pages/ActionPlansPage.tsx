import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Topbar } from '../components/shell/Topbar';
import { Pill } from '../components/hifi/Pill';
import { RiskBadge } from '../components/hifi/RiskBadge';
import { actionPlansApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { PRIORITY_TO_LEVEL } from '../lib/risk-ui';
import {
  ACTION_STATUSES,
  type ActionPlanListItem,
  type ActionStatus,
} from '../lib/csmp-types';
import { useT } from '../i18n';

const STATUS_VARIANT: Record<ActionStatus, 'ok' | 'warn' | 'bad' | 'info' | 'default'> = {
  PENDING: 'warn',
  IN_PROGRESS: 'info',
  COMPLETED: 'ok',
  OVERDUE: 'bad',
  CANCELLED: 'default',
};

export function ActionPlansPage() {
  const t = useT();
  const [items, setItems] = useState<ActionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ActionStatus | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await actionPlansApi.list({ status: status || undefined });
      setItems(res.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.actionPlans.crumbs')}</span>}
        title={t('page.actionPlans.title')}
        subtitle={t('page.actionPlans.subtitle', { count: items.length })}
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono uppercase text-n-500 tracking-[0.4px]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ActionStatus | '')}
            className="text-[12.5px] px-2.5 py-1 border border-n-200 rounded-r2 bg-white focus:border-a-500 focus:outline-none"
          >
            <option value="">All</option>
            {ACTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-3 py-2">Assessment</th>
                <th className="text-left px-3 py-2">Threat</th>
                <th className="text-left px-3 py-2">Priority</th>
                <th className="text-left px-3 py-2">Owner</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-[12.5px] text-n-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[13px] text-n-600">
                    No action plans yet — create them in an assessment (step 7 Treatment).
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b border-n-100 hover:bg-n-25">
                    <td className="px-4 py-2.5 text-[13px] text-n-900 max-w-[320px]">
                      <Link
                        to="/assessments/$id"
                        params={{ id: p.assessmentId }}
                        className="hover:text-a-600"
                      >
                        {p.actionRequired}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">{p.assessmentTitle}</td>
                    <td className="px-3 py-2.5 text-[12px] text-n-600">{p.threatLabel}</td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={PRIORITY_TO_LEVEL[p.riskPriority]} value={p.riskPriority} />
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">{p.responsiblePerson ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">{p.targetDate ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <Pill variant={STATUS_VARIANT[p.status]}>{t(`enum.actionStatus.${p.status}`)}</Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
