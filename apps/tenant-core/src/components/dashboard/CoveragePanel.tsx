import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardCounts } from "./types";

/** « Disponibilité » — équivalent CoveragePanel IntakePage Desk. */
export function CoveragePanel({ counts }: { counts: DashboardCounts }) {
  const { t } = useTranslation();
  const piecesBase = Math.max(counts.piecesPending + 3, 1);
  const piecesCoverage =
    counts.piecesPending === 0
      ? 100
      : Math.max(0, Math.round((1 - counts.piecesPending / piecesBase) * 100));

  const devisBase = Math.max(counts.devisPending + 2, 1);
  const devisCoverage =
    counts.devisPending === 0
      ? 100
      : Math.max(0, Math.round((1 - counts.devisPending / devisBase) * 100));

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{t("dashboard.coverageTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("dashboard.coverageDesc")}
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="mt-6 space-y-5">
        <CoverageRow
          label={t("dashboard.piecesProvided")}
          value={piecesCoverage}
          helper={
            counts.piecesPending === 0
              ? t("dashboard.upToDate")
              : t("dashboard.pendingHelper", { count: counts.piecesPending })
          }
        />
        <CoverageRow
          label={t("dashboard.quotesProcessed")}
          value={devisCoverage}
          helper={
            counts.devisPending === 0
              ? t("dashboard.nothingToSign")
              : t("dashboard.toSignHelper", { count: counts.devisPending })
          }
        />
      </div>
      <div className="mt-6 flex items-center gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        {t("dashboard.coverageFooter")}
      </div>
    </section>
  );
}

function CoverageRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {helper} ·{" "}
          <strong className="font-semibold text-foreground">{value}%</strong>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
