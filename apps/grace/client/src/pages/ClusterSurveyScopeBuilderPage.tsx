// ClusterSurveyScope builder/detail page. DRAFT scopes are editable —
// auto-compose seeds items from the cluster's AAA, operator can add a manual
// question from the library, override per-item weight, drop items, then
// approve. APPROVED scopes are read-only; "Revise" spawns a new DRAFT.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft, Sparkles, Plus, Trash2, Check, GitBranch, Archive, X,
} from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import {
  clusterSurveyScopesApi, surveyQuestionsApi,
} from '../lib/csmp-api';
import { extractError } from '../lib/api';
import {
  type ClusterSurveyScopeDetail,
  type ClusterSurveyScopeItem,
  type ScopeStatus,
  type SurveyQuestionLibraryItem,
  type SurveyType,
} from '../lib/csmp-types';
import { useT } from '../i18n';
import { formatScopeSourceLabel } from '../lib/scope-source-label';

const STATUS_VARIANT: Record<ScopeStatus, 'warn' | 'ok' | 'info'> = {
  DRAFT: 'warn',
  APPROVED: 'ok',
  ARCHIVED: 'info',
};

export function ClusterSurveyScopeBuilderPage() {
  const t = useT();
  const { id } = useParams({ from: '/protected/cluster-scopes/$id' });
  const navigate = useNavigate();

  const [scope, setScope] = useState<ClusterSurveyScopeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await clusterSurveyScopesApi.get(id);
      setScope(r);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Group items by localized AAA source label so the operator sees a clear
  // "questions per Asset/Threat/CM-group" tree.
  const grouped = useMemo(() => {
    if (!scope) return new Map<string, ClusterSurveyScopeItem[]>();
    const map = new Map<string, ClusterSurveyScopeItem[]>();
    for (const it of scope.items) {
      const key = formatScopeSourceLabel(it, t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [scope, t]);

  async function autoCompose(mode: 'replace' | 'merge') {
    if (!scope) return;
    if (
      mode === 'replace' &&
      scope.items.length > 0 &&
      !window.confirm(t('page.surveyScopeBuilder.confirmReplace'))
    ) {
      return;
    }
    setComposing(true);
    setError(null);
    try {
      const r = await clusterSurveyScopesApi.autoCompose(scope.id, mode);
      setScope(r);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setComposing(false);
    }
  }

  async function approve() {
    if (!scope) return;
    if (!window.confirm(t('page.surveyScopeBuilder.confirmApprove'))) return;
    setSaving('approve');
    setError(null);
    try {
      const r = await clusterSurveyScopesApi.approve(scope.id);
      setScope(r);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(null);
    }
  }

  async function revise() {
    if (!scope) return;
    setSaving('revise');
    setError(null);
    try {
      const r = await clusterSurveyScopesApi.revise(scope.id);
      await navigate({ to: '/cluster-scopes/$id', params: { id: r.id } });
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(null);
    }
  }

  async function archive() {
    if (!scope) return;
    if (!window.confirm(t('page.surveyScopeBuilder.confirmArchive'))) return;
    setSaving('archive');
    setError(null);
    try {
      await clusterSurveyScopesApi.archive(scope.id);
      await load();
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!scope) return;
    setSaving(itemId);
    try {
      const r = await clusterSurveyScopesApi.removeItem(scope.id, itemId);
      setScope(r);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(null);
    }
  }

  async function updateItemWeight(itemId: string, value: string) {
    if (!scope) return;
    const v = value.trim() === '' ? null : Number(value);
    if (v != null && (!Number.isFinite(v) || v < 1 || v > 5)) return;
    setSaving(itemId);
    try {
      const r = await clusterSurveyScopesApi.updateItem(scope.id, itemId, {
        weightOverride: v,
      });
      setScope(r);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar breadcrumbs={<span>{t('page.surveyScopeBuilder.crumbsLoading')}</span>} title={t('page.surveyScopeBuilder.title')} />
        <div className="p-6 text-[12.5px] text-n-500">{t('common.loading')}</div>
      </>
    );
  }

  if (!scope) {
    return (
      <>
        <Topbar breadcrumbs={<span>{t('page.surveyScopeBuilder.crumbsNotFound')}</span>} title={t('page.surveyScopeBuilder.notFound')} />
        <div className="p-6 text-[12.5px] text-bad">{error ?? t('page.surveyScopeBuilder.notFound')}</div>
      </>
    );
  }

  const editable = scope.status === 'DRAFT';

  return (
    <>
      <Topbar
        breadcrumbs={
          <span>
            {t('page.surveyScopeBuilder.workCrumb')} /{' '}
            <button
              type="button"
              className="text-a-700 hover:underline"
              onClick={() => void navigate({ to: '/cluster-scopes' })}
            >
              {t('page.surveyScopeBuilder.breadcrumbScopes')}
            </button>{' '}
            / {scope.name}
          </span>
        }
        title={scope.name}
        subtitle={t('page.surveyScopeBuilder.subtitle', {
          cluster: scope.clusterName ?? t('common.cluster'),
          version: scope.version,
          count: scope.itemCount,
        })}
        actions={
          <div className="flex items-center gap-2">
            <Btn2
              variant="ghost"
              leading={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => void navigate({ to: '/cluster-scopes' })}
            >
              {t('page.surveyScopeBuilder.back')}
            </Btn2>
            {editable && (
              <>
                <Btn2
                  variant="ghost"
                  leading={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => void autoCompose('replace')}
                  disabled={composing}
                >
                  {composing ? t('page.surveyScopeBuilder.composing') : t('page.surveyScopeBuilder.autoCompose')}
                </Btn2>
                <Btn2
                  variant="ghost"
                  leading={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setAddOpen(true)}
                >
                  {t('page.surveyScopeBuilder.addManualQuestion')}
                </Btn2>
                <Btn2
                  variant="primary"
                  leading={<Check className="w-3.5 h-3.5" />}
                  onClick={approve}
                  disabled={saving === 'approve' || scope.items.length === 0}
                >
                  {saving === 'approve' ? t('page.surveyScopeBuilder.approving') : t('page.surveyScopeBuilder.approveScope')}
                </Btn2>
              </>
            )}
            {scope.status === 'APPROVED' && (
              <>
                <Btn2
                  variant="ghost"
                  leading={<GitBranch className="w-3.5 h-3.5" />}
                  onClick={revise}
                  disabled={saving === 'revise'}
                >
                  {saving === 'revise' ? t('page.surveyScopeBuilder.revising') : t('page.surveyScopeBuilder.revise')}
                </Btn2>
                <Btn2
                  variant="ghost"
                  leading={<Archive className="w-3.5 h-3.5" />}
                  onClick={archive}
                  disabled={saving === 'archive'}
                >
                  {t('page.surveyScopeBuilder.archive')}
                </Btn2>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-4 flex flex-wrap items-center gap-3">
          <Pill variant={STATUS_VARIANT[scope.status]}>{t(`enum.scopeStatus.${scope.status}`)}</Pill>
          {scope.evidenceTypes.map((et) => (
            <Pill key={et} variant="accent">{t(`enum.surveyType.${et}`)}</Pill>
          ))}
          <Pill variant="outline">
            {scope.aggregationMode === 'AGGREGATE_BY_CM_TEMPLATE'
              ? t('page.surveyScopeBuilder.aggregated')
              : t('page.surveyScopeBuilder.perInstance')}
          </Pill>
          {scope.approvedAt && scope.approvedByName && (
            <div className="text-[11.5px] text-n-500 ml-auto">
              {t('page.surveyScopeBuilder.approvedBy', {
                date: new Date(scope.approvedAt).toLocaleDateString(),
                name: scope.approvedByName,
              })}
            </div>
          )}
        </div>

        {scope.items.length === 0 ? (
          <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-10 text-center">
            <div className="text-[13px] font-medium text-n-800 mb-1">{t('page.surveyScopeBuilder.emptyItems')}</div>
            <div className="text-[12px] text-n-500 mb-4">
              {editable
                ? t('page.surveyScopeBuilder.emptyItemsHintEditable')
                : t('page.surveyScopeBuilder.emptyItemsHintReadonly')}
            </div>
            {editable && (
              <Btn2
                variant="primary"
                leading={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => void autoCompose('replace')}
                disabled={composing}
              >
                {t('page.surveyScopeBuilder.autoComposeCta')}
              </Btn2>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([label, items]) => (
              <div key={label} className="bg-white border border-n-150 rounded-r3 shadow-sh1">
                <div className="px-4 py-2 border-b border-n-150 flex items-center gap-2">
                  <div className="text-[11px] font-mono uppercase text-n-500 tracking-[0.4px] flex-1">
                    {label}
                  </div>
                  <Pill variant="outline">{t('page.surveyScopeBuilder.questionsCount', { count: items.length })}</Pill>
                </div>
                <div className="divide-y divide-n-100">
                  {items.map((it) => (
                    <ScopeItemRow
                      key={it.id}
                      item={it}
                      editable={editable}
                      saving={saving === it.id}
                      onWeightChange={(v) => void updateItemWeight(it.id, v)}
                      onRemove={() => void removeItem(it.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && scope && (
        <AddQuestionDrawer
          scopeId={scope.id}
          evidenceTypes={scope.evidenceTypes}
          onClose={() => setAddOpen(false)}
          onAdded={(updated) => {
            setScope(updated);
            setAddOpen(false);
          }}
        />
      )}
    </>
  );
}

function ScopeItemRow({
  item, editable, saving, onWeightChange, onRemove,
}: {
  item: ClusterSurveyScopeItem;
  editable: boolean;
  saving: boolean;
  onWeightChange: (v: string) => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <div className="px-4 py-2.5 flex items-start gap-3">
      <div className="flex-1">
        <div className="text-[12.5px] text-n-900">{item.prompt}</div>
        <div className="text-[10.5px] font-mono text-n-500 tracking-[0.4px] mt-0.5">
          {t('page.surveyScopeBuilder.itemMeta', {
            evidence: t(`enum.surveyType.${item.evidenceType}`),
            type: t(`enum.questionType.${item.type}`),
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1 text-[11px] text-n-500">
          {t('page.surveyScopeBuilder.weight')}
          <input
            type="number"
            min={1}
            max={5}
            disabled={!editable || saving}
            defaultValue={item.weightOverride ?? item.defaultWeight}
            className="w-12 h-6 border border-n-200 rounded-r1 px-1 text-[11.5px] font-mono"
            onBlur={(e) => {
              const next = e.target.value === '' ? '' : String(Number(e.target.value));
              const current = item.weightOverride ?? item.defaultWeight;
              if (next !== String(current)) onWeightChange(next);
            }}
          />
          {item.weightOverride != null && (
            <span className="text-[10px] font-mono text-a-700">{t('page.surveyScopeBuilder.override')}</span>
          )}
        </label>
        {editable && (
          <button
            type="button"
            onClick={onRemove}
            disabled={saving}
            className="w-6 h-6 flex items-center justify-center text-n-500 hover:text-bad rounded-r1 hover:bg-n-100"
            aria-label={t('page.surveyScopeBuilder.removeItem')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddQuestionDrawer({
  scopeId, evidenceTypes, onClose, onAdded,
}: {
  scopeId: string;
  evidenceTypes: SurveyType[];
  onClose: () => void;
  onAdded: (updated: ClusterSurveyScopeDetail) => void;
}) {
  const t = useT();
  const [questions, setQuestions] = useState<SurveyQuestionLibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const r = await surveyQuestionsApi.list({ search: search.trim() || undefined });
        setQuestions(r.items);
      } catch (e) {
        setErr(await extractError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  const visible = useMemo(
    () => questions.filter((q) => evidenceTypes.includes(q.evidenceType)),
    [questions, evidenceTypes],
  );

  async function add(questionId: string) {
    setAdding(questionId);
    setErr(null);
    try {
      const updated = await clusterSurveyScopesApi.addItem(scopeId, {
        questionId,
        sourceType: 'MANUAL',
      });
      onAdded(updated);
    } catch (e) {
      setErr(await extractError(e));
    } finally {
      setAdding(null);
    }
  }

  const evidenceLabels = evidenceTypes.map((et) => t(`enum.surveyType.${et}`)).join(', ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-[560px] shadow-sh3 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-n-150">
          <div className="text-[14px] font-semibold text-n-900">{t('page.surveyScopeBuilder.addDrawerTitle')}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-n-500 hover:bg-n-100 rounded-r1"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {err && (
            <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
              {err}
            </div>
          )}

          <input
            className="w-full border border-n-200 rounded-r1 h-8 px-2 text-[12.5px]"
            placeholder={t('page.surveyScopeBuilder.searchLibraryPh')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
            {t('page.surveyScopeBuilder.filteredByEvidence', { types: evidenceLabels })}
          </div>

          {loading ? (
            <div className="text-[12px] text-n-500">{t('common.loading')}</div>
          ) : visible.length === 0 ? (
            <div className="text-[12px] text-n-500 bg-n-50 rounded-r1 px-2 py-2">
              {t('page.surveyScopeBuilder.noMatchingQuestions')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {visible.map((q) => (
                <div
                  key={q.id}
                  className="border border-n-200 rounded-r2 px-3 py-2 hover:bg-n-50"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-[12.5px] text-n-900">{q.prompt}</div>
                      <div className="text-[10.5px] font-mono text-n-500 tracking-[0.4px] mt-0.5">
                        {t('page.surveyScopeBuilder.libraryMeta', {
                          evidence: t(`enum.surveyType.${q.evidenceType}`),
                          type: t(`enum.questionType.${q.type}`),
                          weight: q.defaultWeight,
                        })}
                        {q.isSystem ? ` · ${t('page.surveyScopeBuilder.systemMark')}` : ''}
                      </div>
                    </div>
                    <Btn2
                      variant="ghost"
                      onClick={() => void add(q.id)}
                      disabled={adding === q.id}
                    >
                      {adding === q.id ? t('page.surveyScopeBuilder.adding') : t('page.surveyScopeBuilder.add')}
                    </Btn2>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-n-150 px-5 py-3">
          <Btn2 variant="ghost" onClick={onClose}>{t('page.surveyScopeBuilder.done')}</Btn2>
        </div>
      </div>
    </div>
  );
}
