/**
 * Cyber checklist UI — ISO 27001 / SOC 2 responses → Finding source=module-cyber.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { api, extractError } from '../lib/api';
import { useT } from '../i18n';

type CatalogSlug = 'iso27001-2022' | 'soc2-tsc';

type ControlRow = { identifier: string; name: string };

type CyberStatus =
  | 'not_started'
  | 'in_progress'
  | 'conforme'
  | 'non_conforme'
  | 'non_applicable';

type CyberResponse = {
  id: string;
  catalogSlug: CatalogSlug;
  controlIdentifier: string;
  controlName: string;
  status: CyberStatus;
  notes?: string;
  evidence: { id: string; fileName: string }[];
};

const STATUS_OPTIONS: CyberStatus[] = [
  'not_started',
  'in_progress',
  'conforme',
  'non_conforme',
  'non_applicable',
];

function trimId(s: string) {
  return s.replace(/^\s+|\s+$/g, '').replace(/\t/g, '');
}

export function CyberChecklistPage() {
  const t = useT();
  const [catalog, setCatalog] = useState<CatalogSlug>('iso27001-2022');
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [responses, setResponses] = useState<CyberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const byControl = useMemo(() => {
    const map = new Map<string, CyberResponse>();
    for (const r of responses) {
      map.set(trimId(r.controlIdentifier), r);
    }
    return map;
  }, [responses]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, res] = await Promise.all([
        api.get(`controls/${catalog}`).json<{ controls?: ControlRow[] }>(),
        api
          .get('cyber/responses', { searchParams: { catalog } })
          .json<{ responses: CyberResponse[] }>(),
      ]);
      setControls(
        (cat.controls ?? []).map((c) => ({
          identifier: trimId(c.identifier),
          name: c.name.trim(),
        })),
      );
      setResponses(res.responses);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, [catalog]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return controls;
    return controls.filter(
      (c) =>
        c.identifier.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [controls, filter]);

  async function saveStatus(control: ControlRow, status: CyberStatus) {
    const key = control.identifier;
    setBusyKey(key);
    setError(null);
    try {
      const { response } = await api
        .put('cyber/responses', {
          json: {
            catalogSlug: catalog,
            controlIdentifier: control.identifier,
            controlName: control.name,
            status,
          },
        })
        .json<{ response: CyberResponse }>();
      setResponses((prev) => {
        const others = prev.filter(
          (r) => trimId(r.controlIdentifier) !== control.identifier,
        );
        return [...others, response];
      });
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadEvidence(control: ControlRow, file: File) {
    const existing = byControl.get(control.identifier);
    if (!existing) {
      setError(t('page.cyber.needStatusFirst'));
      return;
    }
    setBusyKey(control.identifier);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const contentBase64 = btoa(binary);
      const { response } = await api
        .post('cyber/evidence', {
          json: {
            responseId: existing.id,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            contentBase64,
          },
        })
        .json<{ response: CyberResponse }>();
      setResponses((prev) =>
        prev.map((r) => (r.id === response.id ? response : r)),
      );
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.cyber.crumbs')}</span>}
        title={t('page.cyber.title')}
        subtitle={t('page.cyber.subtitle')}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-r2 border border-n-150 bg-white px-3 text-[12.5px]"
            value={catalog}
            onChange={(e) => setCatalog(e.target.value as CatalogSlug)}
          >
            <option value="iso27001-2022">ISO 27001:2022</option>
            <option value="soc2-tsc">SOC 2 TSC</option>
          </select>
          <input
            className="h-9 min-w-[220px] flex-1 rounded-r2 border border-n-150 bg-white px-3 text-[12.5px]"
            placeholder={t('page.cyber.filter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Btn2 variant="ghost" onClick={() => void load()} disabled={loading}>
            {t('common.refresh')}
          </Btn2>
        </div>

        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">{t('page.cyber.colControl')}</th>
                <th className="text-left px-3 py-2">{t('page.cyber.colStatus')}</th>
                <th className="text-left px-3 py-2">{t('page.cyber.colEvidence')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-[12.5px] text-n-500">
                    {t('common.loading')}
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((c) => {
                  const row = byControl.get(c.identifier);
                  const busy = busyKey === c.identifier;
                  return (
                    <tr key={c.identifier} className="border-t border-n-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-n-500">
                          {c.identifier}
                        </div>
                        <div className="text-[12.5px] text-n-800 mt-0.5">{c.name}</div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="h-8 rounded-r2 border border-n-150 bg-white px-2 text-[12px] disabled:opacity-50"
                          disabled={busy}
                          value={row?.status ?? 'not_started'}
                          onChange={(e) =>
                            void saveStatus(c, e.target.value as CyberStatus)
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {t(`page.cyber.status.${s}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-[11.5px] text-accent cursor-pointer underline-offset-2 hover:underline">
                            <input
                              type="file"
                              className="sr-only"
                              disabled={busy || !row}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void uploadEvidence(c, f);
                                e.target.value = '';
                              }}
                            />
                            {t('page.cyber.upload')}
                          </label>
                          {row?.evidence?.length ? (
                            <span className="text-[11px] text-n-500">
                              {row.evidence.map((e) => e.fileName).join(', ')}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default CyberChecklistPage;
