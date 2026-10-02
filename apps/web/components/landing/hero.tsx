import { Check } from "lucide-react";
import { GAUGE, HERO, TRUST } from "@/lib/copy/landing";
import { MissionCta } from "./mission-cta";
import { Accent, Eyebrow } from "./section-heading";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative flex w-full flex-col items-center overflow-clip px-5 pt-16 pb-6 sm:px-6 md:pt-24">
      <div aria-hidden className="hero-glow" />

      <div className="relative grid w-full max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="flex flex-col items-start gap-7">
          <Eyebrow className="animate-rise">{HERO.badge}</Eyebrow>

          <h1
            id="hero-title"
            className="animate-rise-1 text-balance text-[clamp(40px,6vw,76px)]/[0.98] font-[650] tracking-[-0.055em]"
          >
            {HERO.title} <Accent>{HERO.accent}</Accent>
          </h1>

          <p className="animate-rise-2 max-w-[600px] text-pretty text-[clamp(17px,1.5vw,19px)]/[1.65] text-muted-foreground">
            {HERO.lede}
          </p>

          <div className="animate-rise-2 flex flex-wrap items-center gap-3 pt-1">
            <MissionCta kind="audit" cta="hero" arrow />
            <MissionCta kind="ao" cta="hero" variant="outline" />
          </div>

          <ul className="animate-rise-3 flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[12px] font-medium text-muted-foreground">
            {HERO.domains.map((domain) => (
              <li key={domain.label} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden />
                {domain.label}
              </li>
            ))}
          </ul>
        </div>

        <ReadinessGauge />
      </div>

      <ul className="relative mt-16 grid w-full max-w-6xl gap-px overflow-clip rounded-[14px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.items.map((item, index) => (
          <li
            key={item.label}
            className="flex flex-col gap-1.5 bg-background px-5 py-6 sm:px-6"
          >
            <span className="font-mono text-[10px]/4 text-muted-foreground/70">0{index + 1}</span>
            <span className="text-[14px]/5 font-[650] tracking-[-0.01em]">{item.label}</span>
            <span className="text-[13px]/[1.55] text-muted-foreground">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadinessGauge() {
  return (
    <figure
      aria-label={`${GAUGE.caption} : ${GAUGE.title}`}
      className="animate-rise-2 w-full rounded-[20px] border border-border bg-card p-6 shadow-lift sm:p-8"
    >
      <figcaption className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <span className="text-[14px] font-semibold tracking-[-0.015em]">{GAUGE.title}</span>
        <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {GAUGE.caption}
        </span>
      </figcaption>

      <div className="flex items-start justify-between gap-6 pt-5">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[clamp(44px,5vw,60px)]/[0.9] font-[700] tracking-[-0.05em]">{GAUGE.score}</span>
          <span className="text-[22px]/[1] font-[700] text-muted-foreground">%</span>
          <span className="pl-1.5 text-[13px]/5 text-muted-foreground">{GAUGE.scoreLabel}</span>
        </p>
        <p className="shrink-0 text-right font-mono text-[11px]/[1.5] text-muted-foreground">{GAUGE.subtitle}</p>
      </div>

      <ul className="flex flex-col gap-3.5 pt-6">
        {GAUGE.rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[minmax(0,150px)_1fr_36px] items-center gap-3.5">
            <span className="truncate text-[12.5px]/5 text-muted-foreground">{row.label}</span>
            <span className="h-2 overflow-clip rounded-full bg-muted" aria-hidden>
              <span
                className={row.value >= 70 ? "block h-full rounded-full bg-primary" : "block h-full rounded-full bg-foreground/35"}
                style={{ width: `${row.value}%` }}
              />
            </span>
            <span className="text-right font-mono text-[11px] text-muted-foreground">{row.value}%</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-border pt-4 font-mono text-[11px]/5 text-muted-foreground">{GAUGE.footer}</p>
    </figure>
  );
}
