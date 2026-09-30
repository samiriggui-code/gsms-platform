import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Loader2,
  Receipt,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FinancePlaquettePdfViewer } from "@/components/finance/FinancePlaquettePdfViewer";
import { FinancePlaquetteScreen } from "@/components/finance/FinancePlaquetteScreen";
import { StatusPill } from "@/components/StatusPill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type FinanceDetail, type Prestation } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Fiche devis / facture — plaquette React + PDF React + mission + signature. */
export function FinanceDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams({ strict: false }) as { id: string };
  const [data, setData] = useState<FinanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [pdfRevision, setPdfRevision] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    void api
      .financeItem(id)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [id, t]);

  const money = (amount: number) =>
    amount.toLocaleString(i18n.language, {
      style: "currency",
      currency: "EUR",
    });

  async function onConfirmSign() {
    if (!data) return;
    setSigning(true);
    setSignError(null);
    try {
      const next = await api.signFinance(data.item.id);
      setData(next);
      setSignOpen(false);
      setPdfRevision((k) => k + 1);
    } catch (e: unknown) {
      setSignError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSigning(false);
    }
  }

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  const { item, prestation } = data;
  const isQuote = item.kind === "DEVIS";
  const canSign = isQuote && item.status === "A_SIGNER";
  const needsPay = item.kind === "FACTURE" && item.status === "A_PAYER";

  return (
    <div className="space-y-7">
      <Link
        to="/finance"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("financeDetail.back")}
      </Link>

      <section className="relative overflow-hidden rounded-[28px] bg-[#111721] text-white shadow-[0_24px_70px_-34px_rgba(10,18,35,0.55)] dark:bg-[#182131]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-[hsl(var(--primary)/0.2)]" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-9 sm:py-10 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  canSign || needsPay ? "bg-amber-400" : "bg-emerald-400",
                )}
              />
              {isQuote
                ? t("financeDetail.badgeQuote")
                : t("financeDetail.badgeInvoice")}
              <span className="text-white/30">·</span>
              {item.reference}
            </div>
            <h2 className="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
              {item.label}
            </h2>
            <p className="mt-4 text-sm text-white/60">
              {t("financeDetail.issuedOn", {
                date: formatDate(item.issuedAt, i18n.language),
              })}
              {item.validUntil
                ? ` · ${t("financeDetail.validUntil", {
                    date: formatDate(item.validUntil, i18n.language),
                  })}`
                : null}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill code={item.kind} />
              <StatusPill code={item.status} />
              <span className="text-lg font-semibold tabular-nums">
                {money(item.amountEur)}
              </span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {canSign ? (
                <button
                  type="button"
                  onClick={() => setSignOpen(true)}
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111721] hover:bg-white/90"
                >
                  <FileSignature className="mr-2 h-4 w-4 text-[hsl(var(--primary))]" />
                  {t("financeDetail.ctaSign")}
                </button>
              ) : null}
              {pdfBlobUrl ? (
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("financeDetail.ctaPdf")}
                </a>
              ) : (
                <span className="inline-flex items-center rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/40">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("financeDetail.pdfBuilding")}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {t("financeDetail.summaryLabel")}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">{t("financeDetail.total")}</dt>
                <dd className="font-semibold tabular-nums">
                  {money(item.amountEur)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">{t("financeDetail.lines")}</dt>
                <dd>{item.lines.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">{t("financeDetail.findings")}</dt>
                <dd>{item.plaquette.findings.length}</dd>
              </div>
              {item.signedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">{t("financeDetail.signedAt")}</dt>
                  <dd>{formatDate(item.signedAt, i18n.language)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
            <div className="border-b border-border/70 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  {isQuote
                    ? t("financeDetail.plaquetteQuote")
                    : t("financeDetail.plaquetteInvoice")}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("financeDetail.plaquetteReactHint")}
              </p>
            </div>
            <div className="bg-[#f7f5f1] px-4 py-6 dark:bg-[#121820] sm:px-8 sm:py-8">
              <FinancePlaquetteScreen
                item={item}
                prestation={prestation}
                money={money}
                locale={i18n.language}
              />
            </div>
          </section>

          <FinancePlaquettePdfViewer
            item={item}
            prestation={prestation}
            locale={i18n.language}
            revision={pdfRevision}
            onUrlChange={setPdfBlobUrl}
          />
        </div>

        <div className="space-y-7">
          <PrestationCompanion prestation={prestation} />

          {canSign ? (
            <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
              <FileSignature className="h-5 w-5 text-amber-600" />
              <h3 className="mt-3 text-base font-semibold">
                {t("financeDetail.signTitle")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("financeDetail.signHint")}
              </p>
              <button
                type="button"
                onClick={() => setSignOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-xs font-semibold text-background"
              >
                {t("financeDetail.ctaSign")}
              </button>
            </section>
          ) : null}

          {item.status === "SIGNE" ? (
            <section className="rounded-2xl border border-emerald-300/40 bg-emerald-50/50 p-5 dark:border-emerald-800/30 dark:bg-emerald-950/15 sm:p-6">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-3 text-base font-semibold">
                {t("financeDetail.signedTitle")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("financeDetail.signedHint", {
                  date: formatDate(
                    item.signedAt ?? item.updatedAt,
                    i18n.language,
                  ),
                })}
              </p>
            </section>
          ) : null}

          {needsPay ? (
            <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
              <Receipt className="h-5 w-5 text-amber-600" />
              <h3 className="mt-3 text-base font-semibold">
                {t("financeDetail.payTitle")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.paymentNote ?? t("financeDetail.payHint")}
              </p>
              <p className="mt-3 text-lg font-semibold tabular-nums">
                {money(item.amountEur)}
              </p>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045]">
            <div className="p-5 sm:p-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em]">
                {t("financeDetail.nextTitle")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("financeDetail.nextDesc")}
              </p>
              <ol className="mt-4 space-y-2 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  {t("financeDetail.next1")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  {t("financeDetail.next2")}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  {t("financeDetail.next3")}
                </li>
              </ol>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("financeDetail.signDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("financeDetail.signDialogDesc", {
                reference: item.reference,
                amount: money(item.amountEur),
              })}
            </DialogDescription>
          </DialogHeader>
          {signError ? (
            <p className="text-sm text-red-500">{signError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setSignOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
              disabled={signing}
            >
              {t("financeDetail.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void onConfirmSign()}
              disabled={signing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-60"
            >
              {signing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSignature className="h-3.5 w-3.5" />
              )}
              {t("financeDetail.confirmSign")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrestationCompanion({
  prestation,
}: {
  prestation: Prestation | null;
}) {
  const { t } = useTranslation();

  if (!prestation) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold">
          {t("financeDetail.missionTitle")}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("financeDetail.missionNone")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("financeDetail.missionEyebrow")}
      </p>
      <h3 className="mt-2 text-base font-semibold">{prestation.title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill code={prestation.kind} />
        <StatusPill code={prestation.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {prestation.summary}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("financeDetail.missionContact", { name: prestation.contactGsms })}
      </p>
      <Link
        to="/prestations/$id"
        params={{ id: prestation.id }}
        className="mt-5 inline-flex items-center text-xs font-semibold text-primary hover:underline"
      >
        {t("financeDetail.openMission")}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function formatDate(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(locale);
}
