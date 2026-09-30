// List of cluster survey scopes — the per-cluster, reusable, versioned
// AAA-driven survey configuration. Operators (admin / country security
// manager) build scopes here, approve them, then the SurveysPage drawer
// lets anyone with surveys:write start a run from an APPROVED scope.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, FolderTree, X } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import {
  clusterSurveyScopesApi,
  clustersApi,
} from '../lib/csmp-api';
import { extractError } from '../lib/api';
import {
  SURVEY_TYPES,
  type ClusterSurveyScopeSummary,
  type ClusterSummary,
  type ScopeStatus,
  type SurveyType,
  type ScopeAggregationMode,
} from '../lib/csmp-types';
import { useT } from '../i18n';

const STATUS_VARIANT: Record<ScopeStatus, 'warn' | 'ok' | 'info'> = {
  DRAFT: 'warn',
  APPROVED: 'ok',
  ARCHIVED: 'info',
};

export function ClusterSurveyScopesPage() {
  const t = useT();
  const [items, setItems] = useState<ClusterSurveyScopeSummary[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCluster, setFilterCluster] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ScopeStatus | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cls] = await Promise.all([
        clusterSurveyScopesApi.list({
          clusterId: filterCluster || undefined,
          status: filterStatus || undefined,
        }),
        clustersApi.list(),
      ]);
      setItems(list.items);
      setClusters(cls.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [filterCluster, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.surveyScopes.crumbs')}</span>}
        title={t('page.surveyScopes.title')}
        subtitle={t('page.surveyScopes.subtitle', { count: items.length })}
        actions={
          <Btn2
            variant="primary"
            leading={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setDrawerOpen(true)}
          >
            {t('page.surveyScopes.new')}
          </Btn2>
        }
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 bg-white border border-n-150 rounded-r3 shadow-sh1 p-3">
          <FilterSelect
            label={t('common.cluster')}
            value={filterCluster}
            options={clusters.map((c) => ({
              value: c.id,
              label: `${c.name} · ${t(`enum.clusterType.${c.clusterType}`)}`,
            }))}
            onChange={(v) => setFilterCluster(v)}
          />
          <FilterSelect
            label={t('common.status')}
            value={filterStatus}
            options={(['DRAFT', 'APPROVED', 'ARCHIVED'] as const).map((s) => ({
              value: s,
              label: t(`enum.scopeStatus.${s}`),
            }))}
            onChange={(v) => setFilterStatus((v as ScopeStatus) || '')}
          />
          {(filterCluster || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setFilterCluster('');
                setFilterStatus('');
              }}
              className="text-[11.5px] text-n-500 hover:text-n-800 underline ml-auto"
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-10 text-center text-[12.5px] text-n-500">
            {t('common.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-10 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-r2 bg-n-75 text-n-500 mb-3">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="text-[13px] font-medium text-n-800 mb-1">{t('page.surveyScopes.empty')}</div>
            <div className="text-[12px] text-n-500 mb-4">
              {t('page.surveyScopes.emptyHint')}
            </div>
            <Btn2 variant="primary" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => setDrawerOpen(true)}>
              {t('page.surveyScopes.new')}
            </Btn2>
          </div>
        ) : (
          <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-n-50 text-[11px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <tr>
                  <th className="text-left px-4 py-2">{t('common.name')}</th>
                  <th className="text-left px-4 py-2">{t('common.cluster')}</th>
                  <th className="text-left px-4 py-2">{t('common.evidence')}</th>
                  <th className="text-left px-4 py-2">{t('common.status')}</th>
                  <th className="text-left px-4 py-2">{t('common.questions')}</th>
                  <th className="text-left px-4 py-2">{t('common.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-n-100 hover:bg-n-50">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/cluster-scopes/$id"
                        params={{ id: s.id }}
                        className="font-medium text-n-900 hover:text-a-700"
                      >
                        {s.name}
                      </Link>
                      <div className="text-[10.5px] font-mono text-n-500 tracking-[0.4px] mt-0.5">
                        v{s.version} · {s.aggregationMode === 'AGGREGATE_BY_CM_TEMPLATE'
                          ? t('page.surveyScopeBuilder.aggregated')
                          : t('page.surveyScopeBuilder.perInstance')}
                        {s.createdByName && ` · ${t('page.surveyScopes.createdBy', { name: s.createdByName })}`}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-n-700">{s.clusterName ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.evidenceTypes.map((et) => (
                          <Pill key={et} variant="accent">{t(`enum.surveyType.${et}`)}</Pill>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Pill variant={STATUS_VARIANT[s.status]}>{t(`enum.scopeStatus.${s.status}`)}</Pill>
                    </td>
                    <td className="px-4 py-2.5 text-n-700">{s.itemCount}</td>
                    <td className="px-4 py-2.5 text-n-600 text-[11.5px]">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <NewScopeDrawer
          clusters={clusters}
          presetClusterId={filterCluster || undefined}
          onClose={() => setDrawerOpen(false)}
          onCreated={(id) => {
            setDrawerOpen(false);
            void load();
            window.setTimeout(() => {
              window.location.href = `/cluster-scopes/${id}`;
            }, 50);
          }}
        />
      )}
    </>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <label className="inline-flex items-center gap-1.5 text-[11.5px] text-n-700">
      <span className="font-mono uppercase text-[10px] text-n-500 tracking-[0.4px]">{label}</span>
      <select
        className="h-7 border border-n-200 rounded-r1 px-2 text-[12px] bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('common.all')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function NewScopeDrawer({
  clusters, presetClusterId, onClose, onCreated,
}: {
  clusters: ClusterSummary[];
  presetClusterId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const t = useT();
  const [clusterId, setClusterId] = useState(presetClusterId ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceTypes, setEvidenceTypes] = useState<SurveyType[]>(['PHYSICAL', 'DOC_REVIEW']);
  const [aggregationMode, setAggregationMode] = useState<ScopeAggregationMode>('AGGREGATE_BY_CM_TEMPLATE');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cluster = useMemo(
    () => clusters.find((c) => c.id === clusterId),
    [clusterId, clusters],
  );

  function toggleEvidence(st: SurveyType) {
    setEvidenceTypes((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st],
    );
  }

  async function submit() {
    if (!clusterId || !name.trim() || evidenceTypes.length === 0) return;
    setSaving(true);
    setErr(null);
    try {
      const created = await clusterSurveyScopesApi.create({
        clusterId,
        name: name.trim(),
        description: description.trim() || null,
        evidenceTypes,
        aggregationMode,
      });
      onCreated(created.id);
    } catch (e) {
      setErr(await extractError(e));
    } finally {
      setSaving(false);
    }
  }

  const canSave = clusterId && name.trim() && evidenceTypes.length > 0 && !saving;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-[520px] shadow-sh3 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-n-150">
          <div className="text-[14px] font-semibold text-n-900">{t('page.surveyScopes.newDrawerTitle')}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-n-500 hover:bg-n-100 rounded-r1"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {err && (
            <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
              {err}
            </div>
          )}

          <Field label={t('page.surveyScopes.fieldCluster')}>
            <select
              className="w-full border border-n-200 rounded-r1 h-8 px-2 text-[12.5px] bg-white"
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
            >
              <option value="">{t('page.surveyScopes.pickCluster')}</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {t(`enum.clusterType.${c.clusterType}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('page.surveyScopes.fieldName')}>
            <input
              className="w-full border border-n-200 rounded-r1 h-8 px-2 text-[12.5px]"
              placeholder={cluster
                ? t('page.surveyScopes.namePhCluster', { name: cluster.name })
                : t('page.surveyScopes.namePh')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label={t('page.surveyScopes.fieldDescription')}>
            <textarea
              className="w-full border border-n-200 rounded-r1 px-2 py-1.5 text-[12.5px] min-h-[60px]"
              placeholder={t('page.surveyScopes.descriptionPh')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label={t('page.surveyScopes.fieldEvidenceTypes')}>
            <div className="flex flex-wrap gap-1.5">
              {SURVEY_TYPES.map((st) => {
                const active = evidenceTypes.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleEvidence(st)}
                    className={[
                      'text-[11.5px] font-medium rounded-r1 px-2 h-7 border',
                      active
                        ? 'bg-a-50 text-a-700 border-a-300'
                        : 'bg-white text-n-700 border-n-200 hover:bg-n-75',
                    ].join(' ')}
                  >
                    {t(`enum.surveyType.${st}`)}
                  </button>
                );
              })}
            </div>
            <div className="text-[10.5px] text-n-500 mt-1">
              {t('page.surveyScopes.evidenceTypesHint')}
            </div>
          </Field>

          <Field label={t('page.surveyScopes.fieldAggregation')}>
            <div className="flex flex-col gap-1.5 text-[12px] text-n-700">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="aggMode"
                  className="mt-0.5"
                  checked={aggregationMode === 'AGGREGATE_BY_CM_TEMPLATE'}
                  onChange={() => setAggregationMode('AGGREGATE_BY_CM_TEMPLATE')}
                />
                <div>
                  <div className="font-medium text-n-900">{t('page.surveyScopes.aggByCm')}</div>
                  <div className="text-[11px] text-n-500">
                    {t('page.surveyScopes.aggByCmHint')}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="aggMode"
                  className="mt-0.5"
                  checked={aggregationMode === 'PER_INSTANCE'}
                  onChange={() => setAggregationMode('PER_INSTANCE')}
                />
                <div>
                  <div className="font-medium text-n-900">{t('page.surveyScopes.aggPerInstance')}</div>
                  <div className="text-[11px] text-n-500">
                    {t('page.surveyScopes.aggPerInstanceHint')}
                  </div>
                </div>
              </label>
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-n-150 px-5 py-3">
          <Btn2 variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Btn2>
          <Btn2 variant="primary" onClick={submit} disabled={!canSave}>
            {saving ? t('page.surveyScopes.creating') : t('page.surveyScopes.create')}
          </Btn2>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase text-n-500 tracking-[0.4px] mb-1">{label}</div>
      {children}
    </label>
  );
}
