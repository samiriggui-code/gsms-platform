import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  FileWarning,
  FolderKanban,
  PackageCheck,
  Receipt,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { DashboardData } from "./types";

type Tone = "ok" | "warn" | "neutral";

type StatusCard = {
  id: string;
  to: "/prestations" | "/documents" | "/finance" | "/echanges";
  label: string;
  value: number;
  helper: string;
  tone: Tone;
  icon: typeof FolderKanban;
};

/** 4 cards d’état — remplace le bandeau pulse sur l’Accueil. */
export function WorkspaceStatusCards({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { counts } = data;

  const cards: StatusCard[] = [
    {
      id: "prestations",
      to: "/prestations",
      label: t("dashboard.cardPrestations"),
      value: counts.prestationsOpen,
      helper:
        counts.prestationsOpen === 0
          ? t("dashboard.cardPrestationsOk")
          : t("dashboard.cardPrestationsHint", {
              count: counts.prestationsOpen,
            }),
      tone: counts.prestationsOpen > 0 ? "neutral" : "ok",
      icon: FolderKanban,
    },
    {
      id: "pieces",
      to: "/documents",
      label: t("dashboard.cardPieces"),
      value: counts.piecesPending,
      helper:
        counts.piecesPending === 0
          ? t("dashboard.cardPiecesOk")
          : t("dashboard.cardPiecesHint", { count: counts.piecesPending }),
      tone: counts.piecesPending > 0 ? "warn" : "ok",
      icon: FileWarning,
    },
    {
      id: "devis",
      to: "/finance",
      label: t("dashboard.cardQuotes"),
      value: counts.devisPending,
      helper:
        counts.devisPending === 0
          ? t("dashboard.cardQuotesOk")
          : t("dashboard.cardQuotesHint", { count: counts.devisPending }),
      tone: counts.devisPending > 0 ? "warn" : "ok",
      icon: Receipt,
    },
    {
      id: "livrables",
      to: "/documents",
      label: t("dashboard.cardDeliverables"),
      value: counts.livrablesUnread,
      helper:
        counts.livrablesUnread === 0
          ? t("dashboard.cardDeliverablesOk")
          : t("dashboard.cardDeliverablesHint", {
              count: counts.livrablesUnread,
            }),
      tone: counts.livrablesUnread > 0 ? "neutral" : "ok",
      icon: PackageCheck,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatusMetricCard key={card.id} card={card} />
      ))}
    </section>
  );
}

function StatusMetricCard({ card }: { card: StatusCard }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_12px_40px_-32px_rgba(10,18,35,0.32)] transition hover:border-border",
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
      <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
        {card.value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.helper}</p>
    </Link>
  );
}
