/**
 * Traçabilité exigence ↔ test — modes Graph + Matrix (idée Grace Relationships).
 * Copie UI locale — aucun import depuis apps/grace.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Filter,
  FlaskConical,
  LayoutGrid,
  Network,
  Search,
  X,
} from 'lucide-react';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import type { Requirement, Test, TestStatus } from '../../types';
import { Btn2, Card, Pill } from '../hifi';
import { buildCodeMap, truncateLabel } from '../../lib/displayId';
import { cn } from '../../lib/cn';
import { TraceabilityGraph } from './TraceabilityGraph';

interface Props {
  filteredRequirements?: Requirement[];
  filteredTests?: Test[];
}

type ViewMode = 'graph' | 'matrix';

const STATUS_DOT: Record<TestStatus, string> = {
  'Not Run': 'bg-warn',
  Passed: 'bg-ok',
  Failed: 'bg-bad',
};

export function TraceabilityMatrix({ filteredRequirements, filteredTests }: Props) {
  const { t } = useTranslation();
  const allRequirements = useRequirementsStore((s) => s.requirements);
  const allTests = useTestsStore((s) => s.tests);

  const baseReqs = filteredRequirements ?? allRequirements;
  const baseTests = filteredTests ?? allTests;

  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [search, setSearch] = useState('');
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [onlyOrphans, setOnlyOrphans] = useState(false);

  const linkMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const test of baseTests) {
      for (const reqId of test.linkedRequirementIds) {
        if (!map.has(reqId)) map.set(reqId, new Set());
        map.get(reqId)!.add(test.id);
      }
    }
    return map;
  }, [baseTests]);

  const { requirements, tests } = useMemo(() => {
    const q = search.trim().toLowerCase();
    let reqs = baseReqs;
    let tsts = baseTests;

    if (q) {
      reqs = reqs.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q),
      );
      tsts = tsts.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      );
    }

    if (onlyUncovered) {
      reqs = reqs.filter((r) => (linkMap.get(r.id)?.size ?? 0) === 0);
    }
    if (onlyOrphans) {
      tsts = tsts.filter(
        (t) =>
          t.linkedRequirementIds.length === 0 ||
          !t.linkedRequirementIds.some((id) => baseReqs.some((r) => r.id === id)),
      );
    }

    return { requirements: reqs, tests: tsts };
  }, [baseReqs, baseTests, search, onlyUncovered, onlyOrphans, linkMap]);

  const reqCodes = useMemo(() => buildCodeMap(requirements, 'REQ'), [requirements]);
  const testCodes = useMemo(() => buildCodeMap(tests, 'TST'), [tests]);

  const stats = useMemo(() => {
    const links = Array.from(linkMap.values()).reduce((s, set) => s + set.size, 0);
    const uncovered = baseReqs.filter((r) => (linkMap.get(r.id)?.size ?? 0) === 0).length;
    const orphans = baseTests.filter(
      (t) =>
        t.linkedRequirementIds.length === 0 ||
        !t.linkedRequirementIds.some((id) => baseReqs.some((r) => r.id === id)),
    ).length;
    return {
      reqs: baseReqs.length,
      tests: baseTests.length,
      links,
      uncovered,
      orphans,
    };
  }, [baseReqs, baseTests, linkMap]);

  const subtitle = [
    `${stats.reqs} exigences`,
    `${stats.tests} tests`,
    `${stats.links} liens`,
    stats.uncovered > 0 ? `${stats.uncovered} sans test` : null,
    stats.orphans > 0 ? `${stats.orphans} tests orphelins` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (baseReqs.length === 0 && baseTests.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-sm text-text-tertiary">
          {t('dashboard.traceabilityEmpty')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Traçabilité exigences ↔ tests
          </h3>
          <p className="mt-0.5 text-[12px] text-text-tertiary">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-n-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer…"
              className="h-7 w-40 rounded-r1 border border-border bg-card pl-7 pr-2 text-[11.5px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </label>
          <Btn2
            variant={onlyUncovered ? 'primary' : 'ghost'}
            leading={<AlertTriangle className="size-3" />}
            onClick={() => setOnlyUncovered((v) => !v)}
            title="Exigences sans test"
          >
            Sans test
          </Btn2>
          <Btn2
            variant={onlyOrphans ? 'primary' : 'ghost'}
            leading={<Filter className="size-3" />}
            onClick={() => setOnlyOrphans((v) => !v)}
            title="Tests sans exigence"
          >
            Orphelins
          </Btn2>
          {(search || onlyUncovered || onlyOrphans) && (
            <Btn2
              variant="ghost"
              leading={<X className="size-3" />}
              onClick={() => {
                setSearch('');
                setOnlyUncovered(false);
                setOnlyOrphans(false);
              }}
            >
              Reset
            </Btn2>
          )}
        </div>
      </div>

      {/* Tabs Graph | Matrix — comme Grace Relationships */}
      <div className="border-b border-border bg-card px-4 py-1.5">
        <div className="inline-flex overflow-hidden rounded-r1 border border-border">
          {(
            [
              {
                id: 'graph' as const,
                label: 'Graph',
                icon: <Network className="size-3" />,
                title: 'Vue graphe des liens de couverture',
              },
              {
                id: 'matrix' as const,
                label: 'Matrix',
                icon: <LayoutGrid className="size-3" />,
                title: 'Matrice de couverture',
              },
            ] as const
          ).map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              title={tab.title}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 px-3 text-[11.5px] font-medium transition-colors',
                viewMode === tab.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-tertiary hover:bg-surface-hover',
                i > 0 && 'border-l border-border',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'graph' ? (
        <TraceabilityGraph
          requirements={requirements}
          tests={tests}
          linkMap={linkMap}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-n-50/80 px-4 py-2 text-[11px] text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex size-4 items-center justify-center rounded-full border-2 border-accent bg-accent-subtle" />
              Lien exigence ↔ test
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', STATUS_DOT.Passed)} /> Passed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', STATUS_DOT.Failed)} /> Failed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', STATUS_DOT['Not Run'])} /> Not Run
            </span>
          </div>

          {requirements.length === 0 || tests.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-text-tertiary">
              Aucune ligne ou colonne ne correspond aux filtres.
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto bg-n-50/40">
              <table className="border-separate border-spacing-0 text-[11px]">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 top-0 z-30 border-b border-r border-border bg-card px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wide text-n-500"
                      style={{ minWidth: 220 }}
                    >
                      Exigence ↓ / Test →
                    </th>
                    {tests.map((test) => {
                      const code = testCodes.get(test.id) ?? 'TST';
                      const uncoveredCol =
                        test.linkedRequirementIds.filter((id) =>
                          requirements.some((r) => r.id === id),
                        ).length === 0;
                      return (
                        <th
                          key={test.id}
                          className="sticky top-0 z-20 border-b border-r border-border bg-card p-0 align-bottom"
                          style={{ width: 28, height: 140 }}
                          title={`${code} — ${test.title} (${test.status})`}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-end gap-1 px-0 py-2">
                            {uncoveredCol ? (
                              <span className="size-1.5 shrink-0 rounded-full bg-warn" title="Aucun lien" />
                            ) : (
                              <span
                                className={cn(
                                  'size-1.5 shrink-0 rounded-full',
                                  STATUS_DOT[test.status],
                                )}
                              />
                            )}
                            <FlaskConical className="size-3 shrink-0 text-accent" />
                            <span
                              className="max-w-[128px] truncate font-mono text-[10.5px] font-semibold text-accent"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              {code}
                            </span>
                            <span
                              className="max-w-[128px] truncate text-[10px] text-n-600"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              {truncateLabel(test.title, 32)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky top-0 z-20 border-b border-border bg-card px-2 py-2 text-[10.5px] font-medium text-n-500">
                      Liens
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => {
                    const linked = linkMap.get(req.id);
                    const linkCount = linked
                      ? [...linked].filter((tid) => tests.some((t) => t.id === tid)).length
                      : 0;
                    const code = reqCodes.get(req.id) ?? 'REQ';
                    const orphan = linkCount === 0;
                    return (
                      <tr key={req.id} className="hover:bg-accent-subtle/30">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-b border-r border-border bg-card px-2 py-1 text-left font-normal"
                          style={{ minWidth: 220, maxWidth: 280 }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-accent">
                              {code}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-[12px] text-text-primary"
                              title={req.title}
                            >
                              {req.title}
                            </span>
                            {orphan ? (
                              <Pill variant="warn">0</Pill>
                            ) : (
                              <span className="shrink-0 font-mono text-[10px] tabular-nums text-n-500">
                                {linkCount}
                              </span>
                            )}
                          </div>
                        </th>
                        {tests.map((test) => {
                          const isLinked = linked?.has(test.id) ?? false;
                          return (
                            <td
                              key={test.id}
                              className={cn(
                                'border-b border-r border-border p-0 text-center align-middle',
                                isLinked ? 'bg-accent-subtle' : 'bg-card',
                              )}
                              style={{ width: 28, height: 28 }}
                              title={
                                isLinked
                                  ? `${code} ↔ ${testCodes.get(test.id)} — ${test.title}`
                                  : `${code} × ${testCodes.get(test.id)}`
                              }
                            >
                              <div className="grid h-full w-full place-items-center">
                                {isLinked ? (
                                  <span className="inline-flex size-3.5 items-center justify-center rounded-full border-2 border-accent bg-card" />
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                        <td
                          className={cn(
                            'border-b border-border px-2 py-1 text-center font-mono text-[11px] font-semibold',
                            orphan ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok',
                          )}
                        >
                          {linkCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
