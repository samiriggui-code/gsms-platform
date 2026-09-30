import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import { incidentsApi, assetsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { hasPermission } from '../lib/permissions';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type AssetSummary,
} from '../lib/csmp-types';
import { useT } from '../i18n';

const SEV_VARIANT: Record<IncidentSeverity, 'ok' | 'warn' | 'bad' | 'default'> = {
  LOW: 'default',
  MEDIUM: 'warn',
  HIGH: 'bad',
  CRITICAL: 'bad',
};

const STATUS_VARIANT: Record<IncidentStatus, 'ok' | 'warn' | 'info' | 'default'> = {
  OPEN: 'warn',
  INVESTIGATING: 'info',
  CONTAINED: 'ok',
  CLOSED: 'default',
};

type Draft = {
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string;
  assetId: string;
  resolutionNotes: string;
};

const EMPTY: Draft = {
  title: '',
  description: '',
  severity: 'MEDIUM',
  status: 'OPEN',
  occurredAt: new Date().toISOString().slice(0, 10),
  assetId: '',
  resolutionNotes: '',
};

export function IncidentsPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const canWrite = hasPermission(user?.role, 'incidents:write');

  const [items, setItems] = useState<Incident[]>([]);
  const [sites, setSites] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
  const [editing, setEditing] = useState<Incident | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inc, siteRes] = await Promise.all([
        incidentsApi.list({ status: statusFilter || undefined }),
        assetsApi.list({ assetType: 'SITE', pageSize: 200 }),
      ]);
      setItems(inc.items);
      setSites(siteRes.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setDraft(EMPTY);
  }

  function openEdit(inc: Incident) {
    setEditing(inc);
    setCreating(false);
    setDraft({
      title: inc.title,
      description: inc.description ?? '',
      severity: inc.severity,
      status: inc.status,
      occurredAt: inc.occurredAt.slice(0, 10),
      assetId: inc.assetId ?? '',
      resolutionNotes: inc.resolutionNotes ?? '',
    });
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setDraft(EMPTY);
  }

  async function save() {
    if (!draft.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        severity: draft.severity,
        status: draft.status,
        occurredAt: draft.occurredAt,
        assetId: draft.assetId || null,
        resolutionNotes: draft.resolutionNotes.trim() || null,
      };
      if (editing) {
        await incidentsApi.update(editing.id, body);
      } else {
        await incidentsApi.create(body);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(inc: Incident) {
    if (!window.confirm(`Delete incident "${inc.title}"?`)) return;
    try {
      await incidentsApi.remove(inc.id);
      await load();
    } catch (err) {
      setError(await extractError(err));
    }
  }

  const formOpen = creating || editing != null;

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.incidents.crumbs')}</span>}
        title={t('page.incidents.title')}
        subtitle={t('page.incidents.subtitle')}
        actions={
          canWrite ? (
            <Btn2 variant="primary" leading={<Plus className="w-3.5 h-3.5" />} onClick={openCreate}>
              {t('page.incidents.new')}
            </Btn2>
          ) : undefined
        }
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
            className="text-[12.5px] px-2.5 py-1 border border-n-200 rounded-r2 bg-white focus:border-a-500 focus:outline-none"
          >
            <option value="">All</option>
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {formOpen && (
          <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 p-4 space-y-3">
            <div className="text-[13px] font-semibold text-n-900">
              {editing ? 'Edit incident' : 'New incident'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block md:col-span-2">
                <span className="text-[11px] font-mono uppercase text-n-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1 w-full h-8 px-2.5 border border-n-200 rounded-r2 text-[12.5px]"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] font-mono uppercase text-n-500">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-2.5 py-1.5 border border-n-200 rounded-r2 text-[12.5px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-mono uppercase text-n-500">Severity</span>
                <select
                  value={draft.severity}
                  onChange={(e) => setDraft({ ...draft, severity: e.target.value as IncidentSeverity })}
                  className="mt-1 w-full h-8 px-2.5 border border-n-200 rounded-r2 text-[12.5px]"
                >
                  {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{t(`enum.incidentSeverity.${s}`)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-mono uppercase text-n-500">Status</span>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as IncidentStatus })}
                  className="mt-1 w-full h-8 px-2.5 border border-n-200 rounded-r2 text-[12.5px]"
                >
                  {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{t(`enum.incidentStatus.${s}`)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-mono uppercase text-n-500">Occurred</span>
                <input
                  type="date"
                  value={draft.occurredAt}
                  onChange={(e) => setDraft({ ...draft, occurredAt: e.target.value })}
                  className="mt-1 w-full h-8 px-2.5 border border-n-200 rounded-r2 text-[12.5px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-mono uppercase text-n-500">Site</span>
                <select
                  value={draft.assetId}
                  onChange={(e) => setDraft({ ...draft, assetId: e.target.value })}
                  className="mt-1 w-full h-8 px-2.5 border border-n-200 rounded-r2 text-[12.5px]"
                >
                  <option value="">—</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] font-mono uppercase text-n-500">Resolution notes</span>
                <textarea
                  value={draft.resolutionNotes}
                  onChange={(e) => setDraft({ ...draft, resolutionNotes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full px-2.5 py-1.5 border border-n-200 rounded-r2 text-[12.5px]"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Btn2 variant="ghost" onClick={closeForm} disabled={saving}>Cancel</Btn2>
              <Btn2 variant="primary" onClick={() => void save()} disabled={saving || !draft.title.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Btn2>
            </div>
          </div>
        )}

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-3 py-2">Site</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Occurred</th>
                <th className="text-left px-3 py-2">Reporter</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-[12.5px] text-n-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[13px] text-n-600">
                    No incidents yet.
                    {canWrite && (
                      <>
                        {' '}
                        <button type="button" className="text-a-700 hover:underline" onClick={openCreate}>
                          Create one
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((inc) => (
                  <tr key={inc.id} className="border-b border-n-100 hover:bg-n-25">
                    <td className="px-4 py-2.5">
                      <div className="text-[13px] font-medium text-n-900">{inc.title}</div>
                      {inc.threatLabel && (
                        <div className="text-[11px] text-n-500">
                          Linked threat: {inc.threatLabel}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">
                      {inc.assetName ? (
                        <Link to="/assets" search={{ siteId: inc.assetId ?? undefined }} className="hover:text-a-600">
                          {inc.assetName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill variant={SEV_VARIANT[inc.severity]}>{t(`enum.incidentSeverity.${inc.severity}`)}</Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill variant={STATUS_VARIANT[inc.status]}>{t(`enum.incidentStatus.${inc.status}`)}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">
                      {new Date(inc.occurredAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-n-700">{inc.reportedByName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {canWrite && (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="text-n-500 hover:text-a-700"
                            onClick={() => openEdit(inc)}
                            aria-label="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="text-n-500 hover:text-bad"
                            onClick={() => void remove(inc)}
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
