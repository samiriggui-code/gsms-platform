import { PARCOURS } from "@/lib/copy/landing";
import { Section, SectionHeading } from "./section-heading";

export function ParcoursSection() {
  return (
    <Section id="parcours" labelledBy="parcours-title">
      <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="parcours-title" eyebrow={PARCOURS.eyebrow} title={PARCOURS.title} lede={PARCOURS.lede} />
        </div>

        <ol className="divide-y divide-border border-y border-border">
          {PARCOURS.steps.map((step, index) => (
            <li key={step.title} className="grid gap-4 py-8 sm:grid-cols-[52px_1fr]">
              <span className="font-mono text-[11px]/6 text-muted-foreground/70">{String(index + 1).padStart(2, "0")}</span>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[18px]/6 font-[650] tracking-[-0.025em]">{step.title}</h3>
                  <span className="rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-primary">
                    {step.result}
                  </span>
                </div>
                <p className="text-[14.5px]/[1.65] text-muted-foreground">{step.lead}</p>
                <ul className="flex flex-col gap-1.5 pl-4 text-[13.5px]/[1.6] text-muted-foreground marker:text-primary [list-style:disc]">
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p className="text-[13px] font-medium">{step.footer}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
