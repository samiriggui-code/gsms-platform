import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileText,
  MessageSquare,
  Receipt,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  api,
  type Echange,
  type FinanceItem,
  type PortalDocument,
  type Prestation,
} from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { useUploadStore } from "@/stores/uploadStore";
import { cn } from "@/lib/cn";

type Detail = {
  prestation: Prestation;
  documents: PortalDocument[];
  echanges: Echange[];
  finance: FinanceItem[];
};

type Tab = "synthese" | "documents" | "echanges" | "finance";

export function PrestationDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams({ strict: false }) as { id: string };
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("synthese");
  const openUpload = useUploadStore((s) => s.openUpload);

  useEffect(() => {
    void api
      .prestation(id)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [id, t]);

  const readiness = useMemo(() => {
    if (!data) return null;
    const toProvide = data.documents.filter((d) => d.bucket === "A_FOURNIR").length;
    const provided = data.documents.filter((d) => d.bucket === "FOURNI").length;
    const deliverables = data.documents.filter((d) => d.bucket === "LIVRABLE").length;
    const openMessages = data.echanges.filter((e) => e.status === "OUVERT").length;
    const financePending = data.finance.filter(
      (f) => f.status === "A_SIGNER" || f.status === "A_PAYER",
    ).length;
    const blocked = data.prestation.status.includes("MANQUANT") || toProvide > 0;
    return {
      toProvide,
      provided,
      deliverables,
      openMessages,
      financePending,
      blocked,
      docsTotal: data.documents.length,
    };
  }, [data]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data || !readiness) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  const { prestation } = data;
  const startedAt = formatDate(prestation.startedAt, i18n.language);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "synthese", label: t("prestationDetail.tabSummary") },
    {
      id: "documents",
      label: t("prestationDetail.tabDocuments"),
      count: data.documents.length,
    },
    {
      id: "echanges",
      label: t("prestationDetail.tabEchanges"),
      count: data.echanges.length,
    },
    {
      id: "finance",
      label: t("prestationDetail.tabFinance"),
      count: data.finance.length,
    },
  ];

  return (
    <div className="space-y-7">
      <Link
        to="/prestations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("prestationDetail.back")}
      </Link>

      {/* Hero pulse — même langage Accueil / Prestations */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#111721] text-white shadow-[0_24px_70px_-34px_rgba(10,18,35,0.55)] dark:bg-[#182131]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-[hsl(var(--primary)/0.2)]" />
        <div className="relative grid gap-10 px-6 py-8 sm:px-9 sm:py-10 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  readiness.blocked ? "bg-amber-400" : "bg-emerald-400",
                )}
              />
              {prestation.kind}
              <span className="text-white/30">·</span>
              {t("prestationDetail.pulseLabel")}
            </div>
            <h2 className="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-4xl xl:text-[40px]">
              {prestation.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/60">
              {prestation.summary || t("prestationDetail.noSummary")}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusPill code={prestation.status} />
              <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                <UserRound className="h-3.5 w-3.5" />
                {prestation.contactGsms}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                <Clock3 className="h-3.5 w-3.5" />
                {t("prestationDetail.startedOn", { date: startedAt })}
              </span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setTab("documents");
                  openUpload({ prestationId: prestation.id });
                }}
                className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111721] hover:bg-white/90"
              >
                <Upload className="mr-2 h-4 w-4 text-[hsl(var(--primary))]" />
                {t("prestationDetail.ctaDeposit")}
              </button>
              <button
                type="button"
                onClick={() => setTab("echanges")}
                className="inline-flex items-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                {t("prestationDetail.ctaMessages")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {t("prestationDetail.readiness")}
            </p>
            <div className="mt-4 divide-y divide-white/10">
              <PulseRow
                label={t("prestationDetail.statPieces")}
                value={readiness.toProvide}
                detail={t("prestationDetail.statPiecesHint")}
              />
              <PulseRow
                label={t("prestationDetail.statMessages")}
                value={readiness.openMessages}
                detail={t("prestationDetail.statMessagesHint")}
              />
              <PulseRow
                label={t("prestationDetail.statFinance")}
                value={readiness.financePending}
                detail={t("prestationDetail.statFinanceHint")}
              />
            </div>
          </div>
        </div>

        <div className="relative grid border-t border-white/10 sm:grid-cols-3">
          <HeroStat
            label={t("prestationDetail.heroDocs")}
            value={String(readiness.docsTotal)}
            helper={t("prestationDetail.heroDocsHint", {
              missing: readiness.toProvide,
            })}
          />
          <HeroStat
            label={t("prestationDetail.heroDeliverables")}
            value={String(readiness.deliverables)}
            helper={t("prestationDetail.heroDeliverablesHint")}
          />
          <HeroStat
            label={t("prestationDetail.heroCoverage")}
            value={
              readiness.docsTotal === 0
                ? "—"
                : `${Math.round(
                    ((readiness.docsTotal - readiness.toProvide) /
                      readiness.docsTotal) *
                      100,
                  )}%`
            }
            helper={
              readiness.blocked
                ? t("prestationDetail.heroCoverageWarn")
                : t("prestationDetail.heroCoverageOk")
            }
          />
        </div>
      </section>

      {/* Grille contenu + panneau latéral */}
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
          <div className="flex gap-1 overflow-x-auto border-b border-border/70 px-2 pt-2 sm:px-4">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-xs transition",
                  tab === tabItem.id
                    ? "border-foreground font-semibold"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {tabItem.label}
                {tabItem.count !== undefined ? (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                    {tabItem.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {tab === "synthese" ? (
              <Synthese
                p={prestation}
                locale={i18n.language}
                readiness={readiness}
                onOpenDocs={() => setTab("documents")}
              />
            ) : null}
            {tab === "documents" ? (
              <DocsList items={data.documents} prestationId={prestation.id} />
            ) : null}
            {tab === "echanges" ? <EchangesList items={data.echanges} /> : null}
            {tab === "finance" ? (
              <FinanceList items={data.finance} locale={i18n.language} />
            ) : null}
          </div>
        </section>

        <div className="space-y-7">
          {readiness.toProvide > 0 ? (
            <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                    {t("prestationDetail.attention")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold">
                    {t("prestationDetail.attentionCount", {
                      count: readiness.toProvide,
                    })}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("prestationDetail.attentionHint")}
                  </p>
                </div>
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <button
                type="button"
                onClick={() => setTab("documents")}
                className="mt-4 inline-flex w-full items-center justify-between rounded-xl bg-background/75 px-3 py-2.5 text-xs font-semibold shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/30"
              >
                {t("prestationDetail.seePieces")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          ) : (
            <section className="rounded-2xl border border-emerald-300/40 bg-emerald-50/50 p-5 dark:border-emerald-800/30 dark:bg-emerald-950/15 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                {t("prestationDetail.attention")}
              </p>
              <h3 className="mt-2 text-base font-semibold">
                {t("prestationDetail.attentionClear")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("prestationDetail.attentionClearHint")}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold">
              {t("prestationDetail.factsTitle")}
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact
                label={t("prestationDetail.start")}
                value={startedAt}
              />
              <Fact
                label={t("prestationDetail.contact")}
                value={prestation.contactGsms}
              />
              <Fact
                label={t("prestationDetail.status")}
                value={<StatusPill code={prestation.status} />}
              />
              <Fact
                label={t("prestationDetail.type")}
                value={<StatusPill code={prestation.kind} />}
              />
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045]">
            <div className="p-5 sm:p-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em]">
                {t("prestationDetail.nextTitle")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("prestationDetail.nextDesc")}
              </p>
              <ol className="mt-4 space-y-2 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  {t("prestationDetail.next1")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  {t("prestationDetail.next2")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  {t("prestationDetail.next3")}
                </li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Synthese({
  p,
  locale,
  readiness,
  onOpenDocs,
}: {
  p: Prestation;
  locale: string;
  readiness: {
    toProvide: number;
    provided: number;
    deliverables: number;
    openMessages: number;
    financePending: number;
    blocked: boolean;
    docsTotal: number;
  };
  onOpenDocs: () => void;
}) {
  const { t } = useTranslation();
  const startedAt = formatDate(p.startedAt, locale);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface-subtle/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {t("prestationDetail.summary")}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {p.summary || t("prestationDetail.noSummary")}
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-border/60 bg-surface-subtle/60 p-4 text-sm">
          <Row label={t("prestationDetail.start")} value={startedAt} />
          <Row label={t("prestationDetail.contact")} value={p.contactGsms} />
          <Row
            label={t("prestationDetail.status")}
            value={<StatusPill code={p.status} />}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          label={t("prestationDetail.miniToProvide")}
          value={readiness.toProvide}
          tone={readiness.toProvide > 0 ? "warn" : "ok"}
          onClick={onOpenDocs}
        />
        <MiniStat
          label={t("prestationDetail.miniProvided")}
          value={readiness.provided}
          tone="neutral"
        />
        <MiniStat
          label={t("prestationDetail.miniDeliverables")}
          value={readiness.deliverables}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "neutral";
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-xl border px-4 py-3 text-left",
    tone === "warn" &&
      "border-amber-300/50 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/20",
    tone === "ok" &&
      "border-emerald-300/40 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/15",
    tone === "neutral" && "border-border/60 bg-surface-subtle/50",
    onClick && "transition hover:ring-1 hover:ring-border",
  );
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function DocsList({
  items,
  prestationId,
}: {
  items: PortalDocument[];
  prestationId: string;
}) {
  const { t } = useTranslation();
  const openUpload = useUploadStore((s) => s.openUpload);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openUpload({ prestationId })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("prestationDetail.deposit")}
        </button>
      </div>
      {!items.length ? (
        <Empty
          icon={<FileText className="h-5 w-5" />}
          text={t("prestationDetail.emptyDocs")}
        />
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate font-medium">{d.title}</span>
              <div className="flex items-center gap-2">
                {d.bucket === "A_FOURNIR" ? (
                  <button
                    type="button"
                    onClick={() =>
                      openUpload({
                        prestationId,
                        demandeId: d.id,
                        demandeTitle: d.title,
                      })
                    }
                    className="rounded-lg border border-border/80 px-2 py-1 text-[11px] font-semibold"
                  >
                    {t("prestationDetail.respond")}
                  </button>
                ) : null}
                <StatusPill code={d.bucket} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EchangesList({ items }: { items: Echange[] }) {
  const { t } = useTranslation();
  if (!items.length) {
    return (
      <Empty
        icon={<MessageSquare className="h-5 w-5" />}
        text={t("prestationDetail.emptyEchanges")}
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li
          key={e.id}
          className="rounded-xl border border-border/60 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{e.subject}</p>
            <StatusPill code={e.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{e.preview}</p>
        </li>
      ))}
    </ul>
  );
}

function FinanceList({
  items,
  locale,
}: {
  items: FinanceItem[];
  locale: string;
}) {
  const { t } = useTranslation();
  if (!items.length) {
    return (
      <Empty
        icon={<Receipt className="h-5 w-5" />}
        text={t("prestationDetail.emptyFinance")}
      />
    );
  }
  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
      {items.map((f) => (
        <li key={f.id}>
          <Link
            to="/finance/$id"
            params={{ id: f.id }}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-surface-subtle/70"
          >
            <div className="min-w-0">
              <p className="font-medium">{f.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.reference} ·{" "}
                {f.amountEur.toLocaleString(locale, {
                  style: "currency",
                  currency: "EUR",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill code={f.kind} />
              <StatusPill code={f.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
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

function formatDate(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale);
}
