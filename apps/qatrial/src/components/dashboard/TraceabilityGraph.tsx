/**
 * Traçabilité Graph — pattern Overview+Detail (InfoVis / FalkorDB / Vega) :
 * 1) le canvas remplit la surface (grille calée sur le ratio du panneau)
 * 2) clic nœud → détail + voisins en bas ; le reste est atténué
 * Données live dossier. Zéro import Grace.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ClipboardList, FlaskConical, Info, LayoutGrid, X } from 'lucide-react';
import type { Requirement, Test, TestStatus } from '../../types';
import { buildCodeMap, truncateLabel } from '../../lib/displayId';
import { cn } from '../../lib/cn';
import { Btn2, Pill } from '../hifi';

/** Ancienne MiniMap : forcer masquage si un bundle/HMR la laisse en overlay blanc. */
const hideMiniMapCss = `
.react-flow__minimap { display: none !important; width: 0 !important; height: 0 !important; }
`;

const STATUS_COLOR: Record<TestStatus, string> = {
  'Not Run': '#f59e0b',
  Passed: '#22c55e',
  Failed: '#ef4444',
};

const LEAF_W = 176;
const LEAF_H = 58;
/** Espacement mini — le surplus de surface est redistribué en air entre cartes. */
const GAP_X_MIN = 40;
const GAP_Y_MIN = 44;
/** Au-delà : pas toutes les arêtes d’un coup (freeze navigateur). */
const EDGE_BUDGET = 80;

type Kind = 'req' | 'test';

type LeafData = {
  kind: Kind;
  entityId: string;
  code: string;
  title: string;
  status?: TestStatus;
  links: number;
  accent: string;
  dimmed: boolean;
  selected: boolean;
  /** Texte infobulle (hover). */
  tip: string;
};

type Selection =
  | { kind: 'req'; id: string }
  | { kind: 'test'; id: string }
  | null;

function portStyle(color: string): CSSProperties {
  return {
    width: 6,
    height: 6,
    background: color,
    border: '1.5px solid #fff',
    borderRadius: '50%',
  };
}

function LeafNode({ data }: NodeProps<Node<LeafData>>) {
  const Icon = data.kind === 'req' ? ClipboardList : FlaskConical;
  return (
    <div
      title={data.tip}
      className={cn(
        'relative w-[176px] cursor-pointer rounded-r2 border bg-card shadow-sh1 transition-[opacity,box-shadow]',
        data.selected && 'ring-2 ring-accent ring-offset-2 shadow-sh2',
        data.dimmed && 'opacity-25',
        !data.dimmed && 'hover:shadow-sh2',
      )}
      style={{ borderColor: `color-mix(in srgb, ${data.accent} 50%, #d4d4d0)` }}
    >
      <Handle id="l" type="source" position={Position.Left} style={portStyle(data.accent)} />
      <Handle id="r" type="source" position={Position.Right} style={portStyle(data.accent)} />
      <Handle id="t" type="source" position={Position.Top} style={portStyle(data.accent)} />
      <Handle id="b" type="source" position={Position.Bottom} style={portStyle(data.accent)} />
      <Handle
        id="tl"
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 6, height: 6, pointerEvents: 'none' }}
      />
      <Handle
        id="tr"
        type="target"
        position={Position.Right}
        style={{ opacity: 0, width: 6, height: 6, pointerEvents: 'none' }}
      />
      <Handle
        id="tt"
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 6, height: 6, pointerEvents: 'none' }}
      />
      <Handle
        id="tb"
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0, width: 6, height: 6, pointerEvents: 'none' }}
      />

      <div className="flex items-start gap-1.5 px-2.5 py-2">
        <span
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-r1"
          style={{
            backgroundColor: `color-mix(in srgb, ${data.accent} 16%, white)`,
            color: data.accent,
          }}
        >
          <Icon className="size-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] font-semibold" style={{ color: data.accent }}>
              {data.code}
            </span>
            <span className="text-[8.5px] uppercase tracking-wide text-n-400">
              {data.kind === 'req' ? 'exig.' : 'test'}
            </span>
            {data.kind === 'test' && data.status ? (
              <span
                className="ml-auto size-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[data.status] }}
              />
            ) : (
              <span className="ml-auto font-mono text-[9px] text-n-400">{data.links}</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-primary">
            {truncateLabel(data.title, 34)}
          </p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { leaf: LeafNode };

/**
 * Pack PAYSAGE (largeur d’abord) — pas une tour portrait.
 *
 * Avant : colonnes plafonnées à la largeur du panneau → ~4 cols × N rows = bande
 * verticale (minimap en « I »). Maintenant : peu de lignes (hauteur du panneau),
 * le surplus s’étale en colonnes (panorama / scroll horizontal).
 */
function wideAirGrid(
  count: number,
  paneW: number,
  paneH: number,
): { cols: number; rows: number; positions: { x: number; y: number }[] } {
  if (count === 0) return { cols: 0, rows: 0, positions: [] };

  const pad = 28;
  const usableW = Math.max(paneW - pad * 2, LEAF_W);
  const usableH = Math.max(paneH - pad * 2, LEAF_H);

  // Lignes max qui tiennent dans la hauteur avec gap mini
  const maxRowsByHeight = Math.max(
    1,
    Math.floor((usableH + GAP_Y_MIN) / (LEAF_H + GAP_Y_MIN)),
  );
  // Biais paysage (~2.4× plus large que haut) même si la hauteur permettrait plus
  const rowsFromAspect = Math.max(1, Math.ceil(Math.sqrt(count / 2.4)));
  const rows = Math.min(count, maxRowsByHeight, rowsFromAspect);
  const cols = Math.ceil(count / rows);

  // Largeur peut dépasser le panneau → React Flow panne ; gapX reste aéré
  const naturalW = cols * LEAF_W + Math.max(0, cols - 1) * GAP_X_MIN;
  const gapX =
    cols <= 1
      ? GAP_X_MIN
      : naturalW <= usableW
        ? Math.max(GAP_X_MIN, (usableW - cols * LEAF_W) / (cols - 1))
        : GAP_X_MIN;
  const gapY =
    rows <= 1
      ? GAP_Y_MIN
      : Math.max(GAP_Y_MIN, (usableH - rows * LEAF_H) / (rows - 1));

  const gridW = cols * LEAF_W + (cols - 1) * gapX;
  const gridH = rows * LEAF_H + (rows - 1) * gapY;
  // Centrer sur la hauteur du panneau ; en X, ancrer à gauche si panorama
  const originX = pad + (gridW <= usableW ? Math.max(0, (usableW - gridW) / 2) : 0);
  const originY = pad + Math.max(0, (usableH - gridH) / 2);

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: originX + col * (LEAF_W + gapX),
      y: originY + row * (LEAF_H + gapY),
    });
  }
  return { cols, rows, positions };
}

function orderLeaves(
  requirements: Requirement[],
  tests: Test[],
  linkMap: Map<string, Set<string>>,
): { kind: Kind; id: string }[] {
  // Intercaler : chaque exigence suivie de ses tests (1re occurrence) — parcours relationnel
  const out: { kind: Kind; id: string }[] = [];
  const usedTests = new Set<string>();
  const testIds = new Set(tests.map((t) => t.id));

  for (const req of requirements) {
    out.push({ kind: 'req', id: req.id });
    const linked = [...(linkMap.get(req.id) ?? [])].filter((tid) => testIds.has(tid));
    for (const tid of linked) {
      if (usedTests.has(tid)) continue;
      usedTests.add(tid);
      out.push({ kind: 'test', id: tid });
    }
  }
  for (const test of tests) {
    if (usedTests.has(test.id)) continue;
    out.push({ kind: 'test', id: test.id });
  }
  return out;
}

function neighborIds(
  selection: Selection,
  tests: Test[],
  linkMap: Map<string, Set<string>>,
): Set<string> {
  const set = new Set<string>();
  if (!selection) return set;
  if (selection.kind === 'req') {
    set.add(`req:${selection.id}`);
    for (const tid of linkMap.get(selection.id) ?? []) set.add(`test:${tid}`);
  } else {
    set.add(`test:${selection.id}`);
    const test = tests.find((t) => t.id === selection.id);
    for (const rid of test?.linkedRequirementIds ?? []) set.add(`req:${rid}`);
  }
  return set;
}

function TraceabilityGraphCanvas({
  requirements,
  tests,
  linkMap,
}: {
  requirements: Requirement[];
  tests: Test[];
  linkMap: Map<string, Set<string>>;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const { fitView, setCenter, getNode } = useReactFlow();
  const [paneSize, setPaneSize] = useState({ w: 960, h: 420 });
  const [selection, setSelection] = useState<Selection>(null);
  const [arrangeNonce, setArrangeNonce] = useState(0);

  const reqCodes = useMemo(() => buildCodeMap(requirements, 'REQ'), [requirements]);
  const testCodes = useMemo(() => buildCodeMap(tests, 'TST'), [tests]);
  const reqById = useMemo(() => new Map(requirements.map((r) => [r.id, r])), [requirements]);
  const testById = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    let debounce: number | undefined;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(320, Math.floor(cr.width));
      const h = Math.max(240, Math.floor(cr.height));
      // Seuil large + debounce — évite boucle fitView ↔ ResizeObserver (freeze).
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        setPaneSize((prev) => {
          if (Math.abs(prev.w - w) < 48 && Math.abs(prev.h - h) < 48) return prev;
          return { w, h };
        });
      }, 120);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(debounce);
      ro.disconnect();
    };
  }, []);

  // Changement de dossier → reset sélection (évite état fantôme + recalcul focus)
  const projectDataKey = `${requirements.length}|${tests.length}|${requirements[0]?.id ?? ''}|${tests[0]?.id ?? ''}`;
  useEffect(() => {
    setSelection(null);
  }, [projectDataKey]);

  const focus = useMemo(
    () => neighborIds(selection, tests, linkMap),
    [selection, tests, linkMap],
  );

  /** Layout seul — PAS de sélection dedans (évite boucle setNodes → fitView → freeze). */
  const layout = useMemo(() => {
    void arrangeNonce;
    const order = orderLeaves(requirements, tests, linkMap);
    const { positions } = wideAirGrid(order.length, paneSize.w, paneSize.h);
    const nodes: Node[] = [];
    const posMap = new Map<string, { x: number; y: number }>();

    order.forEach((item, i) => {
      const pos = positions[i] ?? { x: 24, y: 24 };
      if (item.kind === 'req') {
        const req = reqById.get(item.id)!;
        const links = [...(linkMap.get(req.id) ?? [])].filter((tid) => testById.has(tid)).length;
        const nid = `req:${req.id}`;
        posMap.set(nid, pos);
        const tip =
          links === 0
            ? `Exigence sans test lié.\nÀ couvrir : créer ou rattacher au moins un test.`
            : `Exigence couverte par ${links} test${links > 1 ? 's' : ''}.\nCliquez pour voir lesquels et leur statut.`;
        nodes.push({
          id: nid,
          type: 'leaf',
          position: pos,
          data: {
            kind: 'req',
            entityId: req.id,
            code: reqCodes.get(req.id) ?? 'REQ',
            title: req.title,
            links,
            accent: links === 0 ? '#f59e0b' : '#4f56e5',
            dimmed: false,
            selected: false,
            tip,
          } satisfies LeafData,
        });
      } else {
        const test = testById.get(item.id)!;
        const orphan = test.linkedRequirementIds.every((id) => !reqById.has(id));
        const nid = `test:${test.id}`;
        posMap.set(nid, pos);
        const tip = orphan
          ? `Test orphelin — aucune exigence rattachée.\nStatut : ${test.status}. Reliez-le pour la traçabilité.`
          : `Test de couverture · ${test.status}.\nRelie ${test.linkedRequirementIds.length} exigence(s). Cliquez pour le détail.`;
        nodes.push({
          id: nid,
          type: 'leaf',
          position: pos,
          data: {
            kind: 'test',
            entityId: test.id,
            code: testCodes.get(test.id) ?? 'TST',
            title: test.title,
            status: test.status,
            links: test.linkedRequirementIds.length,
            accent: orphan ? '#f59e0b' : '#0d9488',
            dimmed: false,
            selected: false,
            tip,
          } satisfies LeafData,
        });
      }
    });

    const edges: Edge[] = [];
    for (const test of tests) {
      for (const reqId of test.linkedRequirementIds) {
        if (!reqById.has(reqId)) continue;
        const source = `req:${reqId}`;
        const target = `test:${test.id}`;
        const sp = posMap.get(source);
        const tp = posMap.get(target);
        let sourceHandle = 'r';
        let targetHandle = 'tl';
        if (sp && tp) {
          const dx = tp.x - sp.x;
          const dy = tp.y - sp.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx >= 0) {
              sourceHandle = 'r';
              targetHandle = 'tl';
            } else {
              sourceHandle = 'l';
              targetHandle = 'tr';
            }
          } else if (dy >= 0) {
            sourceHandle = 'b';
            targetHandle = 'tt';
          } else {
            sourceHandle = 't';
            targetHandle = 'tb';
          }
        }
        edges.push({
          id: `${reqId}->${test.id}`,
          source,
          target,
          sourceHandle,
          targetHandle,
          type: 'default',
          animated: false,
          style: {
            stroke: STATUS_COLOR[test.status],
            strokeWidth: 1.25,
            opacity: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: STATUS_COLOR[test.status],
          },
        });
      }
    }

    return { nodes, edges, edgeCount: edges.length };
  }, [
    arrangeNonce,
    requirements,
    tests,
    linkMap,
    paneSize,
    reqById,
    testById,
    reqCodes,
    testCodes,
  ]);

  /** Trop d’arêtes sans sélection = freeze : on n’affiche le voisinage qu’au clic. */
  const visibleEdges = useMemo(() => {
    const all = layout.edges;
    if (selection && focus.size > 0) {
      return all.filter((e) => focus.has(e.source) && focus.has(e.target));
    }
    if (all.length > EDGE_BUDGET) return [];
    return all;
  }, [layout.edges, selection, focus]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  const dataSig = `${requirements.length}:${tests.length}:${layout.edgeCount}`;

  // Appliquer nœuds quand le layout change — SANS fitView ici
  useEffect(() => {
    setNodes(layout.nodes);
  }, [layout.nodes, setNodes]);

  useEffect(() => {
    setEdges(visibleEdges);
  }, [visibleEdges, setEdges]);

  // fitView uniquement au chargement dossier / Arrange — pas à chaque resize (boucle freeze)
  useEffect(() => {
    const t = window.setTimeout(
      () => fitView({ padding: 0.1, duration: 0, minZoom: 0.35, maxZoom: 0.95 }),
      80,
    );
    return () => window.clearTimeout(t);
  }, [dataSig, arrangeNonce, fitView]);

  // Focus / dim sans rebuild ni fitView
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const data = n.data as LeafData;
        const selected =
          selection != null &&
          data.kind === selection.kind &&
          data.entityId === selection.id;
        const dimmed = focus.size > 0 && !focus.has(n.id);
        if (data.selected === selected && data.dimmed === dimmed && n.selected === selected) {
          return n;
        }
        return {
          ...n,
          selected,
          data: { ...data, selected, dimmed },
        };
      }),
    );
  }, [selection, focus, setNodes]);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const n = params.nodes[0];
    if (!n) {
      setSelection((prev) => (prev === null ? prev : null));
      return;
    }
    const data = n.data as LeafData;
    setSelection((prev) => {
      if (prev?.kind === data.kind && prev.id === data.entityId) return prev;
      return { kind: data.kind, id: data.entityId };
    });
  }, []);

  const clearSelection = useCallback(() => setSelection(null), []);

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      setCenter(node.position.x + LEAF_W / 2, node.position.y + LEAF_H / 2, {
        zoom: 1.15,
        duration: 280,
      });
    },
    [getNode, setCenter],
  );

  const detail = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'req') {
      const req = reqById.get(selection.id);
      if (!req) return null;
      const linked = [...(linkMap.get(req.id) ?? [])]
        .map((tid) => testById.get(tid))
        .filter(Boolean) as Test[];
      return {
        kind: 'req' as const,
        code: reqCodes.get(req.id) ?? 'REQ',
        title: req.title,
        description: req.description ?? '',
        status: req.status,
        linked,
      };
    }
    const test = testById.get(selection.id);
    if (!test) return null;
    const linked = test.linkedRequirementIds
      .map((rid) => reqById.get(rid))
      .filter(Boolean) as Requirement[];
    return {
      kind: 'test' as const,
      code: testCodes.get(test.id) ?? 'TST',
      title: test.title,
      description: test.description ?? '',
      status: test.status,
      linked,
    };
  }, [selection, reqById, testById, linkMap, reqCodes, testCodes]);

  if (requirements.length === 0 && tests.length === 0) {
    return (
      <div className="flex h-[min(70vh,640px)] items-center justify-center text-[12.5px] text-text-tertiary">
        Aucun nœud — ajoutez des exigences ou tests dans ce dossier.
      </div>
    );
  }

  return (
    <div className="flex h-[min(78vh,760px)] flex-col">
      {/* Mode d’emploi — sans ça le graphe est illisible */}
      <div className="flex shrink-0 items-start gap-2.5 border-b border-border bg-accent-subtle/40 px-4 py-2.5">
        <Info className="mt-0.5 size-3.5 shrink-0 text-accent" />
        <div className="min-w-0 text-[11.5px] leading-snug text-text-secondary">
          <p>
            <span className="font-medium text-text-primary">Comment lire :</span>{' '}
            carte bleue = exigence · carte verte = test · trait coloré = couverture
            (vert OK, orange non exécuté, rouge échec). Survolez une carte (infobulle),
            cliquez pour le détail et les liens en bas.
          </p>
        </div>
      </div>

      {/* Overview — occupe la largeur ; aération via gaps */}
      <div ref={paneRef} className="relative min-h-0 flex-1 overflow-hidden bg-n-50/50">
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <Btn2
            variant="ghost"
            leading={<LayoutGrid className="size-3.5" />}
            onClick={() => setArrangeNonce((n) => n + 1)}
          >
            Arrange
          </Btn2>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.35, maxZoom: 0.95 }}
          minZoom={0.22}
          maxZoom={1.8}
          onlyRenderVisibleElements
          nodesConnectable={false}
          edgesReconnectable={false}
          nodesDraggable={false}
          elementsSelectable
          selectionOnDrag={false}
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          className="h-full w-full"
        >
          <style>{hideMiniMapCss}</style>
          <Background gap={20} size={1} color="#e4e4e1" />
          <Controls showInteractive={false} className="!rounded-r2 !border-border !shadow-sh1" />
        </ReactFlow>

        <div className="pointer-events-none absolute bottom-3 left-14 rounded-r2 border border-border bg-card/95 px-2.5 py-1.5 text-[10px] text-n-500 shadow-sh1">
          {layout.edgeCount > EDGE_BUDGET && !selection
            ? `Paysage · ${layout.edgeCount} liens — cliquez une carte pour les traits`
            : 'Paysage · pan horizontal · clic = liens'}
        </div>
      </div>

      {/* Detail — bande fixe sous le graphe (surface utile, pas du vide) */}
      <div className="shrink-0 border-t border-border bg-card">
        {!detail ? (
          <div className="flex h-[148px] flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-[13px] font-medium text-text-secondary">Sélectionnez une carte</p>
            <p className="max-w-lg text-[11.5px] text-text-tertiary">
              Vous verrez ici le titre, le statut et les relations exigence ↔ test.
              Sans sélection, survolez une carte pour une aide rapide.
            </p>
          </div>
        ) : (
          <div className="flex max-h-[220px] flex-col gap-2 overflow-auto px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-accent">{detail.code}</span>
                  <Pill variant={detail.kind === 'req' ? 'info' : 'default'}>
                    {detail.kind === 'req' ? 'Exigence' : 'Test'}
                  </Pill>
                  {'status' in detail && detail.status ? (
                    <Pill
                      variant={
                        detail.status === 'Passed' || detail.status === 'Active'
                          ? 'ok'
                          : detail.status === 'Failed'
                            ? 'bad'
                            : 'warn'
                      }
                    >
                      {String(detail.status)}
                    </Pill>
                  ) : null}
                </div>
                <h4 className="mt-1 text-[14px] font-semibold text-text-primary">{detail.title}</h4>
                {detail.description ? (
                  <p className="mt-1 line-clamp-2 text-[12px] text-text-secondary">
                    {detail.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Btn2
                  variant="ghost"
                  onClick={() =>
                    focusNode(
                      detail.kind === 'req'
                        ? `req:${selection!.id}`
                        : `test:${selection!.id}`,
                    )
                  }
                >
                  Zoom
                </Btn2>
                <Btn2 variant="ghost" leading={<X className="size-3.5" />} onClick={clearSelection}>
                  Fermer
                </Btn2>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-n-500">
                {detail.kind === 'req'
                  ? `Tests liés (${detail.linked.length})`
                  : `Exigences liées (${detail.linked.length})`}
              </p>
              {detail.linked.length === 0 ? (
                <p className="text-[12px] text-warn">Aucun lien de couverture.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {detail.linked.map((item) => {
                    if (detail.kind === 'req') {
                      const t = item as Test;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelection({ kind: 'test', id: t.id });
                            focusNode(`test:${t.id}`);
                          }}
                          className="inline-flex max-w-[240px] items-center gap-1.5 rounded-r1 border border-border bg-n-50 px-2 py-1 text-left text-[11px] hover:border-accent hover:bg-accent-subtle"
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_COLOR[t.status] }}
                          />
                          <span className="font-mono font-semibold text-accent">
                            {testCodes.get(t.id)}
                          </span>
                          <span className="truncate text-text-secondary">{t.title}</span>
                        </button>
                      );
                    }
                    const r = item as Requirement;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelection({ kind: 'req', id: r.id });
                          focusNode(`req:${r.id}`);
                        }}
                        className="inline-flex max-w-[240px] items-center gap-1.5 rounded-r1 border border-border bg-n-50 px-2 py-1 text-left text-[11px] hover:border-accent hover:bg-accent-subtle"
                      >
                        <ClipboardList className="size-3 shrink-0 text-accent" />
                        <span className="font-mono font-semibold text-accent">
                          {reqCodes.get(r.id)}
                        </span>
                        <span className="truncate text-text-secondary">{r.title}</span>
                      </button>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TraceabilityGraph(props: {
  requirements: Requirement[];
  tests: Test[];
  linkMap: Map<string, Set<string>>;
}) {
  return (
    <ReactFlowProvider>
      <TraceabilityGraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
