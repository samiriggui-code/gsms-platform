import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FinancePlaquettePdfDoc } from "@/components/finance/FinancePlaquettePdfDoc";
import type { FinanceItem, Prestation } from "@/lib/api";

type Props = {
  item: FinanceItem;
  prestation: Prestation | null;
  locale: string;
  revision: number;
  onUrlChange?: (url: string | null) => void;
};

/** Génère le PDF depuis le composant React et l’affiche en iframe. */
export function FinancePlaquettePdfViewer({
  item,
  prestation,
  locale,
  revision,
  onUrlChange,
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onUrlChangeRef = useRef(onUrlChange);
  onUrlChangeRef.current = onUrlChange;

  const money = useMemo(
    () => (amount: number) =>
      amount.toLocaleString(locale, { style: "currency", currency: "EUR" }),
    [locale],
  );

  const labels = useMemo(
    () => ({
      docQuote: t("financeDetail.docTitleQuote"),
      docInvoice: t("financeDetail.docTitleInvoice"),
      issuedOn: t("financeDetail.issuedOn", { date: "{{date}}" }),
      validUntil: t("financeDetail.validUntil", { date: "{{date}}" }),
      mission: t("financeDetail.plaquetteMission", { title: "{{title}}" }),
      sectionContext: t("financeDetail.sectionContext"),
      sectionFindings: t("financeDetail.sectionFindings"),
      sectionLines: t("financeDetail.sectionLines"),
      sectionDeliverables: t("financeDetail.sectionDeliverables"),
      sectionConditions: t("financeDetail.sectionConditions"),
      sectionSignature: t("financeDetail.sectionSignature"),
      totalTtc: t("financeDetail.totalTtc"),
      signedBadge: t("financeDetail.signedBadge", { date: "{{date}}" }),
      signClient: t("financeDetail.signClient"),
      signGsms: t("financeDetail.signGsms"),
    }),
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    onUrlChangeRef.current?.(null);

    void pdf(
      <FinancePlaquettePdfDoc
        item={item}
        prestation={prestation}
        money={money}
        locale={locale}
        labels={labels}
      />,
    )
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        onUrlChangeRef.current?.(objectUrl);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("common.error"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item, prestation, money, locale, labels, revision, t]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold">{t("financeDetail.pdfTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("financeDetail.pdfReactHint")}
          </p>
        </div>
        {url ? (
          <a
            href={url}
            download={`${item.reference}.pdf`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 px-3 py-2 text-xs font-semibold hover:bg-surface-subtle"
          >
            <Download className="h-3.5 w-3.5" />
            {t("financeDetail.download")}
          </a>
        ) : null}
      </div>
      <div className="relative min-h-[min(70vh,720px)] bg-muted/30">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-sm">{t("financeDetail.pdfBuilding")}</p>
          </div>
        ) : null}
        {error ? (
          <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-red-500">
            {error}
          </div>
        ) : null}
        {url && !loading ? (
          <iframe
            title={item.reference}
            src={url}
            className="h-[min(70vh,720px)] w-full border-0"
          />
        ) : null}
      </div>
    </section>
  );
}
