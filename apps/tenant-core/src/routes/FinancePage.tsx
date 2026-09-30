import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileSignature,
  LayoutGrid,
  List,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortalDataTable, type PortalColumn } from "@/components/PortalDataTable";
import { StatusPill } from "@/components/StatusPill";
import { api, type FinanceItem } from "@/lib/api";
import { cn } from "@/lib/cn";

type FilterId =
  | "ALL"
  | "TO_SIGN"
  | "TO_PAY"
  | "DEVIS"
  | "FACTURE"
  | "DONE";

type Tone = "ok" | "warn" | "neutral";

/** Page Devis & factures — même langage Accueil / Prestations. */
export function FinancePage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<FinanceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [view, setView] = useState<"list" | "table">("list");

  useEffect(() => {
    void api
      .finance()
      .then((r) => setItems(r.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [t]);

  const money = (amount: number) =>
    amount.toLocaleString(i18n.language, {
      style: "currency",
      currency: "EUR",
    });

  const stats = useMemo(() => {
    const list = items ?? [];
    const toSign = list.filter((f) => f.status === "A_SIGNER");
    const toPay = list.filter((f) => f.status === "A_PAYER");
    const done = list.filter(
      (f) => f.status === "SIGNE" || f.status === "PAYE",
    );
    const devis = list.filter((f) => f.kind === "DEVIS");
    const factures = list.filter((f) => f.kind === "FACTURE");
    const pendingAmount = [...toSign, ...toPay].reduce(
      (sum, f) => sum + f.amountEur,
      0,
    );
    const settledAmount = done.reduce((sum, f) => sum + f.amountEur, 0);
    return {
      total: list.length,
      toSign,
      toPay,
      done,
      devis,
      factures,
      pendingAmount,
      settledAmount,
      actionCount: toSign.length + toPay.length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    switch (filter) {
      case "ALL":
        return items;
      case "TO_SIGN":
        return items.filter((f) => f.status === "A_SIGNER");
      case "TO_PAY":
        return items.filter((f) => f.status === "A_PAYER");
      case "DEVIS":
        return items.filter((f) => f.kind === "DEVIS");
      case "FACTURE":
        return items.filter((f) => f.kind === "FACTURE");
      case "DONE":
        return items.filter(
          (f) => f.status === "SIGNE" || f.status === "PAYE",
        );
      default: {
        const _exhaustive: never = filter;
        return _exhaustive;
      }
    }
  }, [items, filter]);

  const attention = useMemo(
    () =>
      (items ?? [])
        .filter((f) => f.status === "A_SIGNER" || f.status === "A_PAYER")
        .slice(0, 5),
    [items],
  );

  const columns = useMemo<PortalColumn<FinanceItem>[]>(
    () => [
      {
        id: "label",
        header: t("finance.colLabel"),
        cell: (f) => (
          <Link
            to="/finance/$id"
            params={{ id: f.id }}
            className="font-semibold text-foreground hover:underline"
          >
            {f.label}
          </Link>
        ),
      },
      {
        id: "reference",
        header: t("finance.colRef"),
        className: "whitespace-nowrap font-mono text-xs",
        cell: (f) => (
          <span className="text-muted-foreground">{f.reference}</span>
        ),
      },
      {
        id: "amount",
        header: t("finance.colAmount"),
        className: "whitespace-nowrap",
        cell: (f) => (
          <span className="font-medium tabular-nums">{money(f.amountEur)}</span>
        ),
      },
      {
        id: "kind",
        header: t("finance.colType"),
        cell: (f) => <StatusPill code={f.kind} />,
      },
      {
        id: "status",
        header: t("finance.colStatus"),
        cell: (f) => <StatusPill code={f.status} />,
      },
      {
        id: "open",
        header: "",
        className: "text-right",
        cell: (f) => (
          <Link
            to="/finance/$id"
            params={{ id: f.id }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("finance.view")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [t, i18n.language],
  );

  if (error) return <p className="text-red-500">{error}</p>;
  if (!items) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "ALL", label: t("finance.filterAll", { count: stats.total }) },
    {
      id: "TO_SIGN",
      label: t("finance.filterToSign", { count: stats.toSign.length }),
    },
    {
      id: "TO_PAY",
      label: t("finance.filterToPay", { count: stats.toPay.length }),
    },
    {
      id: "DEVIS",
      label: t("finance.filterQuotes", { count: stats.devis.length }),
    },
    {
      id: "FACTURE",
      label: t("finance.filterInvoices", { count: stats.factures.length }),
    },
    {
      id: "DONE",
      label: t("finance.filterDone", { count: stats.done.length }),
    },
  ];

  const kpiCards: {
    id: FilterId | "PENDING_AMOUNT";
    label: string;
    value: string;
    helper: string;
    tone: Tone;
    icon: typeof Receipt;
    onClick?: () => void;
  }[] = [
    {
      id: "TO_SIGN",
      label: t("finance.cardToSign"),
      value: String(stats.toSign.length),
      helper:
        stats.toSign.length === 0
          ? t("finance.cardToSignOk")
          : money(
              stats.toSign.reduce((s, f) => s + f.amountEur, 0),
            ),
      tone: stats.toSign.length > 0 ? "warn" : "ok",
      icon: FileSignature,
      onClick: () => setFilter("TO_SIGN"),
    },
    {
      id: "TO_PAY",
      label: t("finance.cardToPay"),
      value: String(stats.toPay.length),
      helper:
        stats.toPay.length === 0
          ? t("finance.cardToPayOk")
          : money(stats.toPay.reduce((s, f) => s + f.amountEur, 0)),
      tone: stats.toPay.length > 0 ? "warn" : "ok",
      icon: Wallet,
      onClick: () => setFilter("TO_PAY"),
    },
    {
      id: "PENDING_AMOUNT",
      label: t("finance.cardPending"),
      value: money(stats.pendingAmount),
      helper: t("finance.cardPendingHint", { count: stats.actionCount }),
      tone: stats.pendingAmount > 0 ? "neutral" : "ok",
      icon: Receipt,
      onClick: () => setFilter("ALL"),
    },
    {
      id: "DONE",
      label: t("finance.cardSettled"),
      value: money(stats.settledAmount),
      helper: t("finance.cardSettledHint", { count: stats.done.length }),
      tone: "ok",
      icon: CheckCircle2,
      onClick: () => setFilter("DONE"),
    },
  ];

  return (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)] transition hover:border-border",
                card.tone === "warn" &&
                  "border-amber-300/50 dark:border-amber-700/35",
                card.tone === "ok" &&
                  "border-emerald-300/40 dark:border-emerald-800/30",
                card.tone === "neutral" && "border-border/70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl border",
                    card.tone === "warn" &&
                      "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400",
                    card.tone === "ok" &&
                      "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400",
                    card.tone === "neutral" &&
                      "border-border bg-surface-subtle text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {card.helper}
              </p>
            </button>
          );
        })}
      </section>

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
          >
            <List className="h-3.5 w-3.5" />
            {t("finance.viewList")}
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
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t("finance.viewTable")}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
            <div className="border-b border-border/70 px-5 py-4 sm:px-6">
              <h3 className="text-sm font-semibold">{t("finance.listTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("finance.listSubtitle", { count: filtered.length })}
              </p>
            </div>

            {view === "list" ? (
              !filtered.length ? (
                <div className="px-6 py-16 text-center">
                  <Receipt className="mx-auto h-7 w-7 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">{t("finance.empty")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("finance.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filtered.map((f) => (
                    <FinanceListRow
                      key={f.id}
                      item={f}
                      amount={money(f.amountEur)}
                    />
                  ))}
                </div>
              )
            ) : (
              <PortalDataTable
                columns={columns}
                rows={filtered}
                rowKey={(f) => f.id}
                empty={
                  <p className="text-sm text-muted-foreground">
                    {t("finance.empty")}
                  </p>
                }
              />
            )}
          </section>
        </div>

        <div className="space-y-7">
          <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                  {t("finance.attention")}
                </p>
                <h3 className="mt-2 text-base font-semibold">
                  {attention.length
                    ? t("finance.attentionCount", {
                        count: attention.length,
                      })
                    : t("finance.attentionClear")}
                </h3>
              </div>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-4 space-y-2">
              {attention.length ? (
                attention.map((f) => (
                  <Link
                    key={f.id}
                    to="/finance/$id"
                    params={{ id: f.id }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-background/75 px-3 py-2.5 text-xs shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/30"
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {f.label}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium">
                      {money(f.amountEur)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("finance.attentionClearHint")}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold">{t("finance.splitTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("finance.splitSubtitle")}
            </p>
            <ul className="mt-5 space-y-4">
              <SplitRow
                label={t("finance.splitQuotes")}
                count={stats.devis.length}
                amount={money(
                  stats.devis.reduce((s, f) => s + f.amountEur, 0),
                )}
                total={stats.total}
                onClick={() => setFilter("DEVIS")}
              />
              <SplitRow
                label={t("finance.splitInvoices")}
                count={stats.factures.length}
                amount={money(
                  stats.factures.reduce((s, f) => s + f.amountEur, 0),
                )}
                total={stats.total}
                onClick={() => setFilter("FACTURE")}
              />
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045]">
            <div className="p-5 sm:p-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em]">
                {t("finance.nextTitle")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("finance.nextDesc")}
              </p>
              <ol className="mt-4 space-y-2 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  {t("finance.next1")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  {t("finance.next2")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  {t("finance.next3")}
                </li>
              </ol>
              <Link
                to="/prestations"
                className="mt-5 inline-flex items-center text-xs font-semibold text-primary hover:underline"
              >
                {t("finance.nextCta")}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FinanceListRow({
  item,
  amount,
}: {
  item: FinanceItem;
  amount: string;
}) {
  const { t } = useTranslation();
  const needsAction =
    item.status === "A_SIGNER" || item.status === "A_PAYER";
  const actionLabel =
    item.status === "A_SIGNER"
      ? t("finance.actionSign")
      : item.status === "A_PAYER"
        ? t("finance.actionPay")
        : item.status === "SIGNE"
          ? t("finance.actionSigned")
          : t("finance.actionPaid");

  return (
    <Link
      to="/finance/$id"
      params={{ id: item.id }}
      className="group grid gap-3 px-5 py-4 transition hover:bg-surface-subtle/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-subtle text-muted-foreground group-hover:text-primary">
          {item.kind === "DEVIS" ? (
            <FileSignature className="h-[18px] w-[18px]" />
          ) : (
            <Receipt className="h-[18px] w-[18px]" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {item.label}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px]">{item.reference}</span>
            <StatusPill code={item.kind} />
            <span className="tabular-nums font-medium text-foreground">
              {amount}
            </span>
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3 pl-[54px] sm:pl-0">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium",
            needsAction
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {actionLabel}
        </span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

function SplitRow({
  label,
  count,
  amount,
  total,
  onClick,
}: {
  label: string;
  count: number;
  amount: string;
  total: number;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 text-left text-xs hover:text-primary"
      >
        <span className="font-medium">
          {label}{" "}
          <span className="text-muted-foreground">({count})</span>
        </span>
        <span className="tabular-nums text-muted-foreground">{amount}</span>
      </button>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${Math.round((count / Math.max(total, 1)) * 100)}%`,
          }}
        />
      </div>
    </li>
  );
}
