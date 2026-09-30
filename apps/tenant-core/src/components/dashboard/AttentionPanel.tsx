import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardCounts } from "./types";

/** Panneau attention — pièces / devis en attente. */
export function AttentionPanel({ counts }: { counts: DashboardCounts }) {
  const { t } = useTranslation();
  const items = [
    counts.piecesPending > 0
      ? {
          id: "pieces",
          title: t("dashboard.piecesMissing", { count: counts.piecesPending }),
          href: "/documents" as const,
        }
      : null,
    counts.devisPending > 0
      ? {
          id: "devis",
          title: t("dashboard.quotesPending", { count: counts.devisPending }),
          href: "/finance" as const,
        }
      : null,
  ].filter(Boolean) as { id: string; title: string; href: "/documents" | "/finance" }[];

  const riskCount = items.length;

  return (
    <section className="rounded-2xl border border-amber-300/45 bg-amber-50/60 p-5 dark:border-amber-700/30 dark:bg-amber-950/15 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            {t("dashboard.attention")}
          </p>
          <h3 className="mt-2 text-base font-semibold">
            {riskCount > 0
              ? t("dashboard.attentionCount", { count: riskCount })
              : t("dashboard.noUrgent")}
          </h3>
        </div>
        <Clock3 className="h-5 w-5 text-amber-600" />
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="flex items-center justify-between gap-3 rounded-xl bg-[hsl(var(--background)/0.75)] px-3 py-2.5 text-xs shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/30"
            >
              <span className="font-semibold">{item.title}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          ))
        ) : (
          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {t("dashboard.queueClear")}
          </p>
        )}
      </div>
      <Link
        to="/documents"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300"
      >
        {t("dashboard.openDocuments")} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
