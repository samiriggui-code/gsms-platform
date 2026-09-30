import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FinanceItem, Prestation } from "@/lib/api";

type Props = {
  item: FinanceItem;
  prestation: Prestation | null;
  money: (n: number) => string;
  locale: string;
};

/** Plaquette React écran — même structure que le PDF @react-pdf. */
export function FinancePlaquetteScreen({
  item,
  prestation,
  money,
  locale,
}: Props) {
  const { t } = useTranslation();
  const isQuote = item.kind === "DEVIS";
  const brief = item.plaquette;

  return (
    <article className="mx-auto max-w-2xl bg-white text-[#111721] shadow-sm dark:bg-[#0f141c] dark:text-foreground">
      <div className="bg-[#111721] px-6 py-7 text-white sm:px-10 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              GSMS
            </p>
            <h4 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {isQuote
                ? t("financeDetail.docTitleQuote")
                : t("financeDetail.docTitleInvoice")}
            </h4>
            <p className="mt-2 font-mono text-xs text-white/55">{item.reference}</p>
          </div>
          <div className="text-right text-xs text-white/55">
            <p>
              {t("financeDetail.issuedOn", {
                date: formatDate(item.issuedAt, locale),
              })}
            </p>
            {item.validUntil ? (
              <p className="mt-1">
                {t("financeDetail.validUntil", {
                  date: formatDate(item.validUntil, locale),
                })}
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-6 text-lg font-medium leading-snug">{item.label}</p>
        {prestation ? (
          <p className="mt-2 text-sm text-white/60">
            {t("financeDetail.plaquetteMission", { title: prestation.title })}
          </p>
        ) : null}
      </div>

      <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
        <section>
          <SectionLabel>{t("financeDetail.sectionContext")}</SectionLabel>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {brief.context}
          </p>
          {prestation ? (
            <p className="mt-3 rounded-xl bg-surface-subtle/80 px-4 py-3 text-xs leading-5 text-muted-foreground">
              <span className="font-semibold text-foreground">
                {prestation.title}
              </span>
              {" — "}
              {prestation.summary}
            </p>
          ) : null}
        </section>

        <section>
          <SectionLabel>{t("financeDetail.sectionFindings")}</SectionLabel>
          <ul className="mt-3 space-y-3">
            {brief.findings.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-border/60 px-4 py-3"
              >
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {f.detail}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground/80">
            {brief.sourceNote}
          </p>
        </section>

        <section>
          <SectionLabel>{t("financeDetail.sectionLines")}</SectionLabel>
          <ul className="mt-3 divide-y divide-border/50 border-y border-border/50">
            {item.lines.map((line) => (
              <li
                key={line.label}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0 max-w-[70%]">
                  <p className="text-sm font-semibold">{line.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {line.detail}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {money(line.amountEur)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("financeDetail.totalTtc")}
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {money(item.amountEur)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <SectionLabel>{t("financeDetail.sectionDeliverables")}</SectionLabel>
            <ul className="mt-3 space-y-2">
              {brief.deliverables.map((d) => (
                <li
                  key={d}
                  className="flex gap-2 text-xs leading-5 text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>{t("financeDetail.sectionConditions")}</SectionLabel>
            <ul className="mt-3 space-y-2">
              {brief.conditions.map((c) => (
                <li
                  key={c}
                  className="flex gap-2 text-xs leading-5 text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {item.paymentNote ? (
          <p className="rounded-xl bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {item.paymentNote}
          </p>
        ) : null}

        <section className="border-t border-border/60 pt-6">
          <SectionLabel>{t("financeDetail.sectionSignature")}</SectionLabel>
          {item.signedAt ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("financeDetail.signedBadge", {
                date: formatDate(item.signedAt, locale),
              })}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-xs text-muted-foreground">
                {t("financeDetail.signClient")}
              </div>
              <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-xs text-muted-foreground">
                {t("financeDetail.signGsms")}
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function formatDate(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(locale);
}
