import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import { RiskBadge } from '../components/hifi/RiskBadge';
import { NewAssessmentDialog } from '../components/NewAssessmentDialog';
import { assessmentsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { PRIORITY_TO_LEVEL, REVIEW_STATUS_VARIANT, reviewStatusLabel, statusLabel } from '../lib/risk-ui';
import {
  COMPLIANCE_TAGS, COMPLIANCE_TAG_LABEL,
  type AssessmentSummary, type ComplianceTag, type EvidenceBasis,
} from '../lib/csmp-types';
import { useT } from '../i18n';

const EVIDENCE_BASIS_VARIANT: Record<EvidenceBasis, 'outline' | 'accent' | 'warn'> = {
  EXPERT_JUDGMENT: 'outline',
  SURVEY_LINKED: 'accent',
  MIXED: 'warn',
};

export function AssessmentsPage() {
  const t = useT();
  const [items, setItems] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<ComplianceTag | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.list({
        pageSize: 200,
        complianceTag: tagFilter || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [tagFilter]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(a: AssessmentSummary) {
    if (!window.confirm(`Delete assessment "${a.title}"? This cannot be undone.`)) return;
    try {
      await assessmentsApi.remove(a.id);
      await load();
    } catch (err) {
      setError(await extractError(err));
    }
  }

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.assessments.crumbs')}</span>}
        title={t('page.assessments.title')}
        subtitle={t('page.assessments.subtitle', { count: items.length })}
        actions={
          <Btn2
            variant="primary"
            leading={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setDialogOpen(true)}
          >
            {t('page.assessments.new')}
          </Btn2>
        }
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono uppercase text-n-500 tracking-[0.4px]">
            {t('page.assessments.complianceTag')}
          </label>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value as ComplianceTag | '')}
            className="text-[12.5px] px-2.5 py-1 border border-n-200 rounded-r2 bg-white focus:border-a-500 focus:outline-none"
          >
            <option value="">{t('page.assessments.allTags')}</option>
            {COMPLIANCE_TAGS.map((tag) => (
              <option key={tag} value={tag}>{COMPLIANCE_TAG_LABEL[tag]}</option>
            ))}
          </select>
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter('')}
              className="text-[11.5px] text-n-500 hover:text-n-800"
            >
              {t('common.clear')}
            </button>
          )}
        </div>

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">{t('page.assessments.colTitle')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colScope')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colEvidence')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colStep')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colReview')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colThreats')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colTopPriority')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colLead')}</th>
                <th className="text-left px-3 py-2">{t('page.assessments.colUpdated')}</th>
                <th className="text-right px-4 py-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-6 text-[12.5px] text-n-500">{t('common.loading')}</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="text-[13px] text-n-600 mb-2">{t('page.assessments.empty')}</div>
                    <Btn2 variant="primary" onClick={() => setDialogOpen(true)}>{t('page.assessments.emptyCta')}</Btn2>
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="border-b border-n-100 hover:bg-n-25 transition-colors">
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
                      {a.clusterId && (
                        <span className="ml-1.5"><Pill variant="outline">cluster</Pill></span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill variant={EVIDENCE_BASIS_VARIANT[a.evidenceBasis]}>
                        {t(`enum.evidenceBasis.${a.evidenceBasis}`)}
                      </Pill>
                      {a.surveyPending && a.evidenceBasis !== 'SURVEY_LINKED' && (
                        <span className="ml-1 text-[10px] font-mono text-warn" title="Survey recommended">●</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-600">
                      {statusLabel(a.status)}
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
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        className="w-7 h-7 inline-flex items-center justify-center text-n-500 hover:bg-bad-bg hover:text-bad rounded-r1"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <NewAssessmentDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => { setDialogOpen(false); void load(); }}
        />
      )}
    </>
  );
}
