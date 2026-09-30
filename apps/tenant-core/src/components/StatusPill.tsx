import { cn } from "@/lib/cn";
import i18n from "@/i18n/config";

export function statusLabel(code: string) {
  return i18n.t(`status.${code}`, { defaultValue: code });
}

type Tone = "neutral" | "ok" | "warn" | "bad" | "info";

function toneFor(code: string): Tone {
  switch (code) {
    case "EN_COURS":
    case "FOURNI":
    case "REPONDU":
    case "SIGNE":
    case "PAYE":
    case "LIVREE":
      return "ok";
    case "PIECES_MANQUANTES":
    case "A_FOURNIR":
    case "OUVERT":
    case "A_SIGNER":
    case "A_PAYER":
      return "warn";
    case "CLOTUREE":
    case "CLOS":
      return "neutral";
    case "LIVRABLE":
      return "info";
    default:
      return "neutral";
  }
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  info: "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]",
};

export function StatusPill({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        TONE_CLASS[toneFor(code)],
        className,
      )}
    >
      {statusLabel(code)}
    </span>
  );
}
