import { AlertTriangle, Ban, CloudOff, Inbox, MapPin, SearchX, Settings2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { CoreFailure } from "@/lib/core/client";
import { CORE_STATE_COPY as C } from "@/lib/copy/platform";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-[12px] border border-border bg-surface-subtle text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.7} aria-hidden />
      </span>
      <p className="text-[14.5px] font-semibold tracking-[-0.01em]">{title}</p>
      {description ? <p className="max-w-md text-[13px]/[1.6] text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

const STATES: Record<CoreFailure["kind"], { icon: LucideIcon; title: string; body?: string; tone: "danger" | "neutral" }> = {
  unavailable: { icon: CloudOff, title: C.unavailableTitle, body: C.unavailableBody, tone: "danger" },
  not_configured: { icon: Settings2, title: C.notConfiguredTitle, body: C.notConfiguredBody, tone: "danger" },
  unauthorized: { icon: Ban, title: "Session expirée", body: "Reconnectez-vous pour continuer.", tone: "neutral" },
  forbidden: { icon: Ban, title: C.forbiddenTitle, body: C.forbiddenBody, tone: "neutral" },
  not_found: { icon: SearchX, title: C.notFoundTitle, body: C.notFoundBody, tone: "neutral" },
  invalid: { icon: AlertTriangle, title: C.errorTitle, tone: "danger" },
  error: { icon: AlertTriangle, title: C.errorTitle, tone: "danger" },
};

/** État explicite quand le Core ne fournit pas la donnée. Jamais de données de repli. */
export function CoreFailureState({ failure, compact }: { failure: CoreFailure; compact?: boolean }) {
  const state = STATES[failure.kind];
  const Icon = state.icon;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start",
        compact ? "p-5" : "px-6 py-10",
        state.tone === "danger" ? "text-foreground" : "",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[12px] border",
          state.tone === "danger" ? "border-destructive/25 bg-destructive/[0.06] text-destructive" : "border-border bg-surface-subtle text-muted-foreground",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[14.5px] font-semibold tracking-[-0.01em]">{state.title}</p>
        <p className="max-w-xl text-[13px]/[1.6] text-muted-foreground">{state.body ?? failure.message}</p>
        <p className="font-mono text-[11px] text-muted-foreground/80">
          {failure.endpoint} · {failure.status} · {failure.message}
        </p>
        {failure.kind === "unauthorized" ? (
          <Link href="/api/auth/logout" prefetch={false} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1 w-fit")}>
            Se reconnecter
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function NoWorkspaceState() {
  return <EmptyState icon={MapPin} title={C.noWorkspaceTitle} description={C.noWorkspaceBody} />;
}
