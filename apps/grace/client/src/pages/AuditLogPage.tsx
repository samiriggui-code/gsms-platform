import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Topbar } from '../components/shell/Topbar';
import { Pill } from '../components/hifi/Pill';
import { auditLogApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import {
  type AuditLogEvent,
  type SnapshotReason,
} from '../lib/csmp-types';
import { useT } from '../i18n';

const REASON_VARIANT: Record<SnapshotReason, 'ok' | 'warn' | 'info' | 'bad' | 'default'> = {
  APPROVED: 'ok',
  SUBMITTED_FOR_REVIEW: 'warn',
  MANUAL_SAVE: 'info',
  REJECTED: 'bad',
  STEP_ADVANCED: 'default',
  THREAT_ADDED: 'default',
  THREAT_REMOVED: 'default',
  RECOMMENDATION_ADDED: 'default',
  METADATA_UPDATED: 'default',
};

export function AuditLogPage() {
  const t = useT();
  const [items, setItems] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<SnapshotReason | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogApi.list({
        limit: 200,
        reason: reason || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [reason]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.audit.crumbs')}</span>}
        title={t('page.audit.title')}
        subtitle={t('page.audit.subtitle')}
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono uppercase text-n-500 tracking-[0.4px]">
            {t('page.audit.reason')}
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as SnapshotReason | '')}
            className="text-[12.5px] px-2.5 py-1 border border-n-200 rounded-r2 bg-white focus:border-a-500 focus:outline-none"
          >
            <option value="">{t('common.all')}</option>
            {(Object.keys(REASON_VARIANT) as SnapshotReason[]).map((r) => (
              <option key={r} value={r}>{t(`enum.snapshotReason.${r}`)}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">{t('page.audit.colWhen')}</th>
                <th className="text-left px-3 py-2">{t('page.audit.colEvent')}</th>
                <th className="text-left px-3 py-2">{t('page.audit.colAssessment')}</th>
                <th className="text-left px-3 py-2">{t('page.audit.colBy')}</th>
                <th className="text-left px-3 py-2">{t('page.audit.colNote')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-[12.5px] text-n-500">{t('common.loading')}</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[13px] text-n-600">
                    {t('page.audit.empty')}
                  </td>
                </tr>
              ) : (
                items.map((ev) => (
                  <tr key={ev.id} className="border-b border-n-100 hover:bg-n-25">
                    <td className="px-4 py-2.5 text-[11px] font-mono text-n-500 whitespace-nowrap">
                      {new Date(ev.capturedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill variant={REASON_VARIANT[ev.reason]}>
                        {t(`enum.snapshotReason.${ev.reason}`)}
                      </Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        to="/assessments/$id"
                        params={{ id: ev.assessmentId }}
                        className="text-[13px] font-medium text-n-900 hover:text-a-600"
                      >
                        {ev.assessmentTitle}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">{ev.capturedByName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-n-600 max-w-[280px] truncate">
                      {ev.note ?? '—'}
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
