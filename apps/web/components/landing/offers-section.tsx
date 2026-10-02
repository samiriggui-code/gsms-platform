import { Check } from "lucide-react";
import { OFFERS } from "@/lib/copy/landing";
import { cn } from "@/lib/utils";
import { MissionCta } from "./mission-cta";
import { Section, SectionHeading } from "./section-heading";

export function OffersSection() {
  return (
    <Section id="offres" labelledBy="offres-title">
      <SectionHeading id="offres-title" eyebrow={OFFERS.eyebrow} title={OFFERS.title} lede={OFFERS.lede} />

      <ul className="grid items-stretch gap-4 lg:grid-cols-3">
        {OFFERS.plans.map((plan) => (
          <li key={plan.name}>
            <article
              className={cn(
                "relative flex h-full flex-col gap-6 rounded-[18px] border p-6 md:p-8",
                plan.highlighted ? "border-ink bg-ink text-ink-foreground shadow-xl" : "border-border bg-card",
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="flex min-h-6 items-start gap-3">
                  <h3 className="min-w-0 grow text-[17px]/6 font-semibold tracking-tight">{plan.name}</h3>
                  {"badge" in plan && plan.badge ? (
                    <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 font-mono text-[10px]/4 uppercase tracking-wide text-primary-foreground">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className={cn("font-mono text-[11px]/4 uppercase tracking-widest", plan.highlighted ? "text-white/60" : "text-muted-foreground")}>
                  {plan.price}
                </p>
                <p className={cn("text-[13.5px]/[1.6]", plan.highlighted ? "text-white/70" : "text-muted-foreground")}>{plan.description}</p>
              </div>

              <ul className={cn("flex flex-col gap-2.5 border-t pt-5", plan.highlighted ? "border-white/15" : "border-border")}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px]/5">
                    <Check className={cn("mt-0.5 size-3.5 shrink-0", plan.highlighted ? "text-white/60" : "text-primary")} aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-1">
                <MissionCta
                  kind={plan.kind}
                  cta="offers"
                  offer={plan.name}
                  label="Demander un devis"
                  variant={plan.highlighted ? "onInk" : "outline"}
                  className="w-full sm:w-auto"
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
