import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-mono text-[11px]/4 font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_85%)]"
      />
      {children}
    </p>
  );
}

/** Accent éditorial (serif italique, ton atténué) — direction artistique DocuLens. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="font-serif font-normal italic tracking-[-0.02em] text-muted-foreground">{children}</span>;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  accent,
  lede,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  accent?: string;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-3xl flex-col gap-4", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-balance text-[clamp(30px,3.8vw,54px)]/[1.04] font-[650] tracking-[-0.045em]">
        {title}
        {accent ? (
          <>
            {" "}
            <Accent>{accent}</Accent>
          </>
        ) : null}
      </h2>
      {lede ? <p className="max-w-2xl text-pretty text-[17px]/[1.7] text-muted-foreground">{lede}</p> : null}
    </div>
  );
}

export function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("relative flex w-full flex-col items-center px-5 pt-20 sm:px-6 md:pt-28", className)}
    >
      <div className="flex w-full max-w-6xl flex-col gap-10">{children}</div>
    </section>
  );
}
