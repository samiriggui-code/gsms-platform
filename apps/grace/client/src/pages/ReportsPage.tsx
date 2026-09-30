import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import { assessmentsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { REVIEW_STATUS_VARIANT, reviewStatusLabel, statusLabel } from '../lib/risk-ui';
import type { AssessmentSummary } from '../lib/csmp-types';
import { useT } from '../i18n';

export function ReportsPage() {
  const t = useT();
  const [items, setItems] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.list({ pageSize: 200 });
      setItems(res.items.filter((a) => a.status === 'APPROVED' || a.status === 'REVIEW'));
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function download(a: AssessmentSummary) {
    setBusyId(a.id);
    setError(null);
    try {
      const blob = await assessmentsApi.downloadReport(a.id);
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = `${a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'report'}-${a.id.slice(0, 8)}.pdf`;
      document.body.appendChild(el);
      el.click();
      el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.reports.crumbs')}</span>}
        title={t('page.reports.title')}
        subtitle={t('page.reports.subtitle')}
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">Assessment</th>
                <th className="text-left px-3 py-2">Scope</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Review</th>
                <th className="text-left px-3 py-2">Updated</th>
                <th className="text-right px-4 py-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-[12.5px] text-n-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[13px] text-n-600">
                    No reportable assessments yet — approve one to unlock PDF export.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="border-b border-n-100 hover:bg-n-25">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/assessments/$id"
                        params={{ id: a.id }}
                        className="text-[13px] font-medium text-n-900 hover:text-a-600"
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">
                      {a.assetName ?? a.clusterName ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-600">{statusLabel(a.status)}</td>
                    <td className="px-3 py-2.5">
                      <Pill variant={REVIEW_STATUS_VARIANT[a.reviewStatus]}>{reviewStatusLabel(a.reviewStatus)}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn2
                        variant="secondary"
                        leading={<Download className="w-3.5 h-3.5" />}
                        disabled={busyId === a.id || a.status !== 'APPROVED'}
                        onClick={() => void download(a)}
                        title={a.status !== 'APPROVED' ? 'PDF available after approval' : 'Download PDF'}
                      >
                        {busyId === a.id ? 'Generating…' : 'Download'}
                      </Btn2>
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
