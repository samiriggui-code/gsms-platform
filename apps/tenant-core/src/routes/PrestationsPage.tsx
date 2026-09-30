import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock3,
  FileWarning,
  FolderKanban,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortalDataTable, type PortalColumn } from "@/components/PortalDataTable";
import { StatusPill } from "@/components/StatusPill";
import { api, type Prestation } from "@/lib/api";
import { cn } from "@/lib/cn";

type FilterId = "ALL" | "BLOCKED" | "ACTIVE" | "DONE" | string;

/** Page Prestations — pattern Intake (pulse + 2 colonnes + rows Desk). */
export function PrestationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Prestation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [view, setView] = useState<"list" | "table">("list");

  useEffect(() => {
    void api
      .prestations()
      .then((r) => setItems(r.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [t]);

  const stats = useMemo(() => {
    const list = items ?? [];
    const blocked = list.filter((p) => p.status.includes("MANQUANT")).length;
    const active = list.filter(
      (p) => p.status === "EN_COURS" || p.status.includes("MANQUANT"),
    ).length;
    const done = list.filter(
      (p) => p.status === "LIVREE" || p.status === "CLOTUREE",
    ).length;
    const byKind = list.reduce<Record<string, number>>((acc, p) => {
      acc[p.kind] = (acc[p.kind] ?? 0) + 1;
      return acc;
    }, {});
    return { total: list.length, blocked, active, done, byKind };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    switch (filter) {
      case "ALL":
        return items;
      case "BLOCKED":
        return items.filter((p) => p.status.includes("MANQUANT"));
      case "ACTIVE":
        return items.filter(
          (p) => p.status === "EN_COURS" || p.status.includes("MANQUANT"),
        );
      case "DONE":
        return items.filter(
          (p) => p.status === "LIVREE" || p.status === "CLOTUREE",
        );
      default:
        return items.filter((p) => p.kind === filter);
    }
  }, [items, filter]);

  const attention = useMemo(
    () => (items ?? []).filter((p) => p.status.includes("MANQUANT")).slice(0, 4),
    [items],
  );

  const columns = useMemo<PortalColumn<Prestation>[]>(
    () => [
      {
        id: "title",
        header: t("prestations.colPrestation"),
        cell: (p) => (
          <Link
            to="/prestations/$id"
            params={{ id: p.id }}
            className="font-semibold text-foreground hover:underline"
          >
            {p.title}
          </Link>
        ),
      },
      {
        id: "kind",
        header: t("prestations.colType"),
        cell: (p) => <StatusPill code={p.kind} />,
      },
      {
        id: "status",
        header: t("prestations.colStatus"),
        cell: (p) => <StatusPill code={p.status} />,
      },
      {
        id: "started",
        header: t("prestations.colStart"),
        className: "whitespace-nowrap",
        cell: (p) => <span className="text-muted-foreground">{p.startedAt}</span>,
      },
      {
        id: "contact",
        header: t("prestations.colContact"),
        cell: (p) => (
          <span className="text-muted-foreground">{p.contactGsms}</span>
        ),
      },
      {
        id: "open",
        header: "",
        className: "text-right",
        cell: (p) => (
          <Link
            to="/prestations/$id"
            params={{ id: p.id }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("prestations.open")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [t],
  );

  if (error) return <p className="text-red-500">{error}</p>;
  if (!items) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "ALL", label: t("prestations.filterAll", { count: stats.total }) },
    {
      id: "BLOCKED",
      label: t("prestations.filterBlocked", { count: stats.blocked }),
    },
    {
      id: "ACTIVE",
      label: t("prestations.filterActive", { count: stats.active }),
    },
    { id: "DONE", label: t("prestations.filterDone", { count: stats.done }) },
    ...Object.keys(stats.byKind).map((kind) => ({
      id: kind,
      label: `${kind} (${stats.byKind[kind]})`,
    })),
  ];

  return (
    <div className="space-y-7">
      {/* Pulse — même langage que Accueil */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#111721] text-white shadow-[0_24px_70px_-34px_rgba(10,18,35,0.55)] dark:bg-[#182131]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-[hsl(var(--primary)/0.2)]" />
        <div className="relative grid gap-10 px-6 py-8 sm:px-9 sm:py-10 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t("prestations.pulseLabel")}
            </div>
            <h2 className="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-4xl xl:text-[42px]">
              {t("prestations.pulseTitle", { count: stats.active })}{" "}
              <span className="text-white/55">
                {stats.blocked > 0
                  ? t("prestations.pulseBlocked", { count: stats.blocked })
                  : t("prestations.pulseClear")}
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/60">
              {t("prestations.pulseSubtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/documents"
                className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111721] hover:bg-white/90"
              >
                <Sparkles className="mr-2 h-4 w-4 text-[hsl(var(--primary))]" />
                {t("prestations.ctaPieces")}
              </Link>
              <button
                type="button"
                onClick={() => setFilter("BLOCKED")}
                className="inline-flex items-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                {t("prestations.ctaBlocked")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {t("prestations.snapshot")}
            </p>
            <div className="mt-4 divide-y divide-white/10">
              <PulseRow
                label={t("prestations.statActive")}
                value={stats.active}
                detail={t("prestations.statActiveHint")}
              />
              <PulseRow
                label={t("prestations.statBlocked")}
                value={stats.blocked}
                detail={t("prestations.statBlockedHint")}
              />
              <PulseRow
                label={t("prestations.statDone")}
                value={stats.done}
                detail={t("prestations.statDoneHint")}
              />
            </div>
          </div>
        </div>
        <div className="relative grid border-t border-white/10 sm:grid-cols-3">
          <HeroStat
            label={t("prestations.heroTotal")}
            value={String(stats.total)}
            helper={t("prestations.heroTotalHint")}
          />
          <HeroStat
            label={t("prestations.heroCoverage")}
            value={
              stats.total === 0
                ? "—"
                : `${Math.round(((stats.total - stats.blocked) / stats.total) * 100)}%`
            }
            helper={
              stats.blocked === 0
                ? t("prestations.heroCoverageOk")
                : t("prestations.heroCoverageWarn", { count: stats.blocked })
            }
          />
          <HeroStat
            label={t("prestations.heroKinds")}
            value={String(Object.keys(stats.byKind).length)}
            helper={t("prestations.heroKindsHint")}
          />
        </div>
      </section>

      {/* Filtres + bascule vue */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-surface-subtle p-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filter === f.id
                  ? "bg-card font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-border/70 bg-surface-subtle p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              view === "list"
                ? "bg-card font-semibold shadow-sm"
                : "text-muted-foreground",
            )}
            aria-label={t("prestations.viewList")}
          >
            <List className="h-3.5 w-3.5" />
            {t("prestations.viewList")}
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              view === "table"
                ? "bg-card font-semibold shadow-sm"
                : "text-muted-foreground",
            )}
            aria-label={t("prestations.viewTable")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t("prestations.viewTable")}
          </button>
        </div>
      </div>

      {/* Grille Desk */}
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
        <div className="space-y-7">
          {view === "list" ? (
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("prestations.listTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("prestations.listSubtitle", { count: filtered.length })}
                  </p>
                </div>
              </div>
              {!filtered.length ? (
                <div className="px-6 py-16 text-center">
                  <FolderKanban className="mx-auto h-7 w-7 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">{t("prestations.empty")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("prestations.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filtered.map((p) => (
                    <PrestationListRow key={p.id} prestation={p} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
              <div className="border-b border-border/70 px-5 py-4 sm:px-6">
                <h3 className="text-sm font-semibold">{t("prestations.listTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("prestations.listSubtitle", { count: filtered.length })}
                </p>
              </div>
              <PortalDataTable
                columns={columns}
                rows={filtered}
                rowKey={(p) => p.id}
                empty={
                  <p className="text-sm text-muted-foreground">
                    {t("prestations.empty")}
                  </p>
                }
              />
            </section>
          )}
        </div>

        <div className="space-y-7">
          <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                  {t("prestations.attention")}
                </p>
                <h3 className="mt-2 text-base font-semibold">
                  {attention.length
                    ? t("prestations.attentionCount", {
                        count: attention.length,
                      })
                    : t("prestations.attentionClear")}
                </h3>
              </div>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-4 space-y-2">
              {attention.length ? (
                attention.map((p) => (
                  <Link
                    key={p.id}
                    to="/prestations/$id"
                    params={{ id: p.id }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-background/75 px-3 py-2.5 text-xs shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/30"
                  >
                    <span className="min-w-0 truncate font-semibold">{p.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                ))
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("prestations.attentionClearHint")}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("prestations.kindsTitle")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("prestations.kindsSubtitle")}
                </p>
              </div>
              <FileWarning className="h-5 w-5 text-muted-foreground" />
            </div>
            <ul className="mt-5 space-y-3">
              {Object.keys(stats.byKind).length === 0 ? (
                <li className="text-xs text-muted-foreground">—</li>
              ) : (
                Object.entries(stats.byKind).map(([kind, count]) => (
                  <li key={kind}>
                    <button
                      type="button"
                      onClick={() => setFilter(kind)}
                      className="flex w-full items-center justify-between gap-3 text-left text-xs hover:text-primary"
                    >
                      <span className="font-medium">{kind}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </button>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.round((count / Math.max(stats.total, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045]">
            <div className="p-5 sm:p-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em]">
                {t("prestations.nextTitle")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("prestations.nextDesc")}
              </p>
              <ul className="mt-4 space-y-2 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  {t("prestations.next1")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  {t("prestations.next2")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  {t("prestations.next3")}
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PrestationListRow({ prestation }: { prestation: Prestation }) {
  const { t } = useTranslation();
  const blocked = prestation.status.includes("MANQUANT");
  return (
    <Link
      to="/prestations/$id"
      params={{ id: prestation.id }}
      className="group grid gap-3 px-5 py-4 transition hover:bg-surface-subtle/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-subtle text-muted-foreground group-hover:text-primary">
          <FolderKanban className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {prestation.title}
          </span>
          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
            {prestation.summary ||
              `${prestation.contactGsms} · ${prestation.startedAt}`}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3 pl-[54px] sm:pl-0">
        <StatusPill code={prestation.kind} />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium",
            blocked
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {blocked
            ? t("dashboard.piecesStatus")
            : t("dashboard.inProgressStatus")}
        </span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

function PulseRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-xs text-white/55">{label}</span>
      <span className="text-right">
        <strong className="text-sm font-semibold text-white">{value}</strong>
        <span className="ml-2 text-[10px] text-white/40">{detail}</span>
      </span>
    </div>
  );
}

function HeroStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-white/10 px-6 py-5 sm:border-r sm:last:border-r-0 sm:px-9">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        <span className="text-[10px] text-white/45">{helper}</span>
      </div>
    </div>
  );
}
