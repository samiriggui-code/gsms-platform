import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, FolderKanban } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardPrestation } from "./types";
import { cn } from "@/lib/cn";

/** Liste « Continue working » — rows type DocumentRow DocuLens. */
export function ContinueWorking({
  prestations,
}: {
  prestations: DashboardPrestation[];
}) {
  const { t } = useTranslation();
  return (
    <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border)/0.7)] px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold">{t("dashboard.continueWorking")}</h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {t("dashboard.recentPrestations")}
          </p>
        </div>
        <Link
          to="/prestations"
          className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          {t("dashboard.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!prestations.length ? (
        <div className="px-6 py-16 text-center">
          <FileText className="mx-auto h-7 w-7 text-[hsl(var(--muted-foreground)/0.5)]" />
          <p className="mt-3 text-sm font-medium">{t("dashboard.spaceReady")}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {t("dashboard.prestationsAppear")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[hsl(var(--border)/0.6)]">
          {prestations.map((p) => (
            <PrestationRow key={p.id} prestation={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function PrestationRow({ prestation }: { prestation: DashboardPrestation }) {
  const { t } = useTranslation();
  const ready = !prestation.status.includes("MANQUANT");
  return (
    <Link
      to="/prestations/$id"
      params={{ id: prestation.id }}
      className="group grid gap-3 px-5 py-4 transition hover:bg-[hsl(var(--surface-subtle)/0.7)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-subtle))] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]">
          <FolderKanban className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {prestation.title}
          </span>
          <span className="mt-1 block truncate text-[11px] text-[hsl(var(--muted-foreground))]">
            {prestation.kind} · {prestation.status}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3 pl-[54px] sm:pl-0">
        <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
          {prestation.kind}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium",
            ready
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {ready ? t("dashboard.inProgressStatus") : t("dashboard.piecesStatus")}
        </span>
        <ArrowRight className="ml-auto h-4 w-4 text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-0.5 group-hover:text-[hsl(var(--foreground))]" />
      </div>
    </Link>
  );
}
