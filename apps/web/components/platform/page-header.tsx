import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-balance text-[clamp(24px,2.6vw,32px)]/[1.1] font-[650] tracking-[-0.04em]">{title}</h1>
        {description ? <p className="max-w-2xl text-[14px]/[1.6] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
