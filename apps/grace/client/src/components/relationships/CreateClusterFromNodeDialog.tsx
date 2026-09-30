import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X, Layers } from 'lucide-react';
import { Btn2 } from '../hifi/Btn2';
import { clustersApi } from '../../lib/csmp-api';
import { extractError } from '../../lib/api';
import {
  CLUSTER_TYPES,
  type AssetGraphNode,
  type AssetGraphResponse,
  type ClusterCreateInput,
  type ClusterMemberInput,
  type ClusterSummary,
  type ClusterType,
} from '../../lib/csmp-types';
import { useT } from '../../i18n';

interface Props {
  graph: AssetGraphResponse;
  rootNodeId: string;
  onClose: () => void;
  onCreated: (cluster: ClusterSummary) => void;
}

function descendantsOf(rootId: string, nodes: AssetGraphNode[]): AssetGraphNode[] {
  const childrenMap = new Map<string, AssetGraphNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const arr = childrenMap.get(n.parentId);
    if (arr) arr.push(n);
    else childrenMap.set(n.parentId, [n]);
  }
  const out: AssetGraphNode[] = [];
  const seen = new Set<string>();
  const stack = [...(childrenMap.get(rootId) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
    for (const c of childrenMap.get(n.id) ?? []) stack.push(c);
  }
  return out;
}

export function CreateClusterFromNodeDialog({ graph, rootNodeId, onClose, onCreated }: Props) {
  const t = useT();
  const rootNode = useMemo(
    () => graph.nodes.find((n) => n.id === rootNodeId) ?? null,
    [graph, rootNodeId],
  );

  const [name, setName] = useState(() =>
    rootNode
      ? t('createClusterFromNode.nameDefault', { name: rootNode.name })
      : t('createClusterFromNode.newCluster'),
  );
  const [clusterType, setClusterType] = useState<ClusterType>('OPERATIONAL');
  const [includeProtected, setIncludeProtected] = useState(true);
  const [includeDual, setIncludeDual] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const candidates = useMemo<AssetGraphNode[]>(() => {
    if (!rootNode) return [];
    const all = [rootNode, ...descendantsOf(rootNodeId, graph.nodes)];
    return all.filter((n) => {
      if (n.assetRole === 'PROTECTIVE') return false;
      if (n.assetRole === 'PROTECTED' && !includeProtected) return false;
      if (n.assetRole === 'DUAL' && !includeDual) return false;
      return true;
    });
  }, [rootNode, rootNodeId, graph.nodes, includeProtected, includeDual]);

  const protectiveDroppedCount = useMemo(() => {
    if (!rootNode) return 0;
    const all = [rootNode, ...descendantsOf(rootNodeId, graph.nodes)];
    return all.filter((n) => n.assetRole === 'PROTECTIVE').length;
  }, [rootNode, rootNodeId, graph.nodes]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (candidates.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const members: ClusterMemberInput[] = candidates.map((a) => ({
        assetId: a.id,
        roleInCluster: null,
        isCritical: false,
        dependencyWeight: 0.5,
      }));
      const payload: ClusterCreateInput = {
        name: name.trim(),
        clusterType,
        members,
      };
      const cluster = await clustersApi.create(payload);
      onCreated(cluster);
    } catch (err) {
      setError(await extractError(err));
      setSaving(false);
    }
  };

  if (!rootNode) {
    return (
      <>
        <div className="fixed inset-0 bg-n-900/30 z-30 csmp-no-export" onClick={onClose} aria-hidden />
        <div
          role="dialog"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] max-w-[92vw] bg-card rounded-r2 shadow-sh3 border border-border z-40 csmp-no-export"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-[13.5px] font-semibold text-n-900">{t('createClusterFromNode.assetNotFound')}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-7 h-7 grid place-items-center text-n-500 hover:text-n-800 hover:bg-n-100 rounded-r1"
            >
              <X size={14} />
            </button>
          </header>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-n-900/30 z-30 csmp-no-export" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('createClusterFromNode.title')}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] max-w-[92vw] bg-card rounded-r2 shadow-sh3 border border-border z-40 csmp-no-export flex flex-col max-h-[85vh]"
      >
        <header className="flex items-start justify-between px-4 py-3 border-b border-border gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-n-900">
              <Layers size={14} className="text-a-700" />
              {t('createClusterFromNode.title')}
            </div>
            <div className="text-[11.5px] text-n-500 mt-0.5 truncate" title={rootNode.name}>
              {t('createClusterFromNode.root')}: <span className="font-medium text-n-800">{rootNode.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-7 h-7 grid place-items-center text-n-500 hover:text-n-800 hover:bg-n-100 rounded-r1 shrink-0"
          >
            <X size={14} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <label className="block">
              <span className="text-[11.5px] text-n-600 font-medium">{t('createClusterFromNode.name')}</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                className="mt-1 w-full text-[12.5px] h-8 px-2 border border-border rounded-r1 bg-card focus:outline-none focus:ring-1 focus:ring-a-500"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="text-[11.5px] text-n-600 font-medium">{t('createClusterFromNode.clusterType')}</span>
              <select
                value={clusterType}
                onChange={(e) => setClusterType(e.target.value as ClusterType)}
                className="mt-1 w-full text-[12.5px] h-8 px-2 border border-border rounded-r1 bg-card"
              >
                {CLUSTER_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{t(`enum.clusterType.${ct}`)}</option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-[11.5px] text-n-600 font-medium mb-1.5">{t('createClusterFromNode.includeRoles')}</legend>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[12px] text-n-800">
                  <input
                    type="checkbox"
                    checked={includeProtected}
                    onChange={(e) => setIncludeProtected(e.target.checked)}
                    className="w-3.5 h-3.5 accent-a-600"
                  />
                  <span>{t('createClusterFromNode.roleProtected')}</span>
                </label>
                <label
                  className="flex items-center gap-2 text-[12px] text-n-400"
                  title={t('createClusterFromNode.protectiveTip')}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="w-3.5 h-3.5 accent-a-600"
                  />
                  <span className="line-through">{t('createClusterFromNode.roleProtective')}</span>
                  <span className="text-[10.5px] text-n-400">{t('createClusterFromNode.protectiveNotAllowed')}</span>
                </label>
                <label className="flex items-center gap-2 text-[12px] text-n-800">
                  <input
                    type="checkbox"
                    checked={includeDual}
                    onChange={(e) => setIncludeDual(e.target.checked)}
                    className="w-3.5 h-3.5 accent-a-600"
                  />
                  <span>{t('createClusterFromNode.roleDual')}</span>
                </label>
              </div>
            </fieldset>

            <div className="text-[11.5px] text-n-600 bg-muted border border-border rounded-r1 px-2.5 py-1.5">
              {t('createClusterFromNode.willAdd', { count: candidates.length })}
              {protectiveDroppedCount > 0 && (
                <span className="text-n-500">
                  {' '}{t('createClusterFromNode.protectiveExcluded', { count: protectiveDroppedCount })}
                </span>
              )}
            </div>

            {error && (
              <div className="text-[11.5px] text-bad bg-bad-bg border border-bad/20 rounded-r1 px-2 py-1.5">
                {error}
              </div>
            )}
          </div>

          <footer className="border-t border-border px-4 py-3 flex justify-end gap-2 shrink-0">
            <Btn2 type="button" variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Btn2>
            <Btn2
              type="submit"
              variant="primary"
              disabled={saving || candidates.length === 0 || !name.trim()}
            >
              {saving ? t('createClusterFromNode.creating') : t('createClusterFromNode.create')}
            </Btn2>
          </footer>
        </form>
      </div>
    </>
  );
}
