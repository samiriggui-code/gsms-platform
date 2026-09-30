import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MapPin, Plus, Pencil } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Btn2 } from '../components/hifi/Btn2';
import { Pill } from '../components/hifi/Pill';
import { RiskBadge } from '../components/hifi/RiskBadge';
import { AssetFormDrawer } from '../components/AssetFormDrawer';
import { assetsApi } from '../lib/csmp-api';
import { extractError } from '../lib/api';
import { criticalityToRiskLevel, type AssetSummary, type AssetStatus } from '../lib/csmp-types';
import { useT } from '../i18n';

const STATUS_VARIANT: Record<AssetStatus, 'ok' | 'warn' | 'bad' | 'default'> = {
  ACTIVE: 'ok',
  UNDER_REVIEW: 'warn',
  COMPROMISED: 'bad',
  DECOMMISSIONED: 'default',
};

type Drawer =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; id: string };

export function SitesAdminPage() {
  const t = useT();
  const [items, setItems] = useState<AssetSummary[]>([]);
  const [parents, setParents] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>({ kind: 'none' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sites, all] = await Promise.all([
        assetsApi.list({ assetType: 'SITE', pageSize: 200 }),
        assetsApi.list({ pageSize: 200 }),
      ]);
      setItems(sites.items);
      setParents(all.items);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.sites.crumbs')}</span>}
        title={t('page.sites.title')}
        subtitle={t('page.sites.subtitle', { count: items.length })}
        actions={
          <div className="flex gap-2">
            <Link to="/site-map">
              <Btn2 variant="ghost" leading={<MapPin className="w-3.5 h-3.5" />}>
                {t('page.sites.siteMap')}
              </Btn2>
            </Link>
            <Btn2
              variant="primary"
              leading={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setDrawer({ kind: 'create' })}
            >
              {t('page.sites.new')}
            </Btn2>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}

        <p className="text-[12px] text-n-600">
          Sites are root assets with type <span className="font-mono">SITE</span>.
          After creating one, set type to SITE in the form (default is EQUIPMENT) and add coordinates for the site map.
        </p>

        <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-n-50 border-b border-n-150">
              <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-3 py-2">Path</th>
                <th className="text-left px-3 py-2">Criticality</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Children</th>
                <th className="text-left px-3 py-2">Updated</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-[12.5px] text-n-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="text-[13px] text-n-600 mb-2">No sites yet</div>
                    <Btn2 variant="primary" onClick={() => setDrawer({ kind: 'create' })}>
                      Create first site
                    </Btn2>
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="border-b border-n-100 hover:bg-n-25">
                    <td className="px-4 py-2.5 text-[13px] font-medium text-n-900">{a.name}</td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-600 max-w-[240px] truncate">
                      {a.path || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={criticalityToRiskLevel(a.criticality)} value={String(a.criticality)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill variant={STATUS_VARIANT[a.status]}>{t(`enum.assetStatus.${a.status}`)}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] font-mono text-n-700">{a.childCount}</td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-n-500">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[12px] text-n-600 hover:text-a-700"
                        onClick={() => setDrawer({ kind: 'edit', id: a.id })}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawer.kind === 'create' && (
        <AssetFormDrawer
          mode={{ kind: 'create' }}
          availableParents={parents}
          onClose={() => setDrawer({ kind: 'none' })}
          onSaved={() => {
            setDrawer({ kind: 'none' });
            void load();
          }}
        />
      )}
      {drawer.kind === 'edit' && (
        <AssetFormDrawer
          key={drawer.id}
          mode={{ kind: 'edit', id: drawer.id }}
          availableParents={parents}
          onClose={() => setDrawer({ kind: 'none' })}
          onSaved={() => {
            setDrawer({ kind: 'none' });
            void load();
          }}
        />
      )}
    </>
  );
}
