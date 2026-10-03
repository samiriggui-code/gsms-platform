import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hasTime = value.includes("T");
  return new Intl.DateTimeFormat("fr-FR", hasTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

export function formatAmount(value: unknown, currency = "EUR") {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

/** Rendu par défaut d'une valeur renvoyée par le Core. */
export function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return new Intl.NumberFormat("fr-FR").format(value);
  if (typeof value === "string") return ISO_DATE.test(value) ? formatDate(value) : value;
  if (Array.isArray(value)) return `${value.length}`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const label = obj.name ?? obj.label ?? obj.title;
    if (typeof label === "string") return label;
  }
  return <span className="font-mono text-[11px] text-muted-foreground">{JSON.stringify(value).slice(0, 80)}</span>;
}

const STATUS_TONES: Record<string, "neutral" | "primary" | "success" | "warning" | "danger"> = {
  open: "primary",
  ouvert: "primary",
  in_progress: "primary",
  en_cours: "primary",
  draft: "neutral",
  brouillon: "neutral",
  done: "success",
  closed: "success",
  termine: "success",
  conforme: "success",
  compliant: "success",
  go: "success",
  late: "danger",
  overdue: "danger",
  en_retard: "danger",
  non_conforme: "danger",
  critical: "danger",
  critique: "danger",
  no_go: "danger",
  high: "warning",
  elevee: "warning",
  pending: "warning",
  a_valider: "warning",
  partial: "warning",
  review: "primary",
  en_relecture: "primary",
  ready: "primary",
  pret: "primary",
  approved: "success",
  approuve: "success",
  submitted: "success",
  depose: "success",
  parsed: "success",
  recue: "success",
  failed: "danger",
  manquante: "danger",
  depassee: "danger",
  a_venir: "primary",
  rec_go: "primary",
  rec_no_go: "warning",
  moyenne: "neutral",
};

/** Codes renvoyés par le Core affichés en clair. */
const STATUS_LABELS: Record<string, string> = {
  draft: "brouillon",
  review: "en relecture",
  ready: "prêt",
  approved: "approuvé",
  submitted: "déposé",
  pending: "en attente",
  parsed: "analysée",
  failed: "échec",
  a_venir: "à venir",
  depassee: "dépassée",
  rec_go: "recommandé go",
  rec_no_go: "recommandé no-go",
  no_go: "no-go",
  elevee: "élevée",
};

export function StatusBadge({ value }: { value: unknown }) {
  if (typeof value !== "string" || value === "") return <span className="text-muted-foreground">—</span>;
  const key = value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s-]+/g, "_");
  return <Badge tone={STATUS_TONES[key] ?? "neutral"}>{STATUS_LABELS[key] ?? value.replace(/_/g, " ")}</Badge>;
}
