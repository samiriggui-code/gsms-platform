import { Plus } from "lucide-react";
import { FAQ } from "@/lib/copy/landing";
import { Section, SectionHeading } from "./section-heading";

/** Accordéon natif <details>/<summary> : accessible au clavier, sans JS. */
export function FaqSection() {
  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="flex flex-col gap-10 md:flex-row md:gap-16">
        <div className="md:w-[380px] md:shrink-0">
          <SectionHeading id="faq-title" eyebrow={FAQ.eyebrow} title={FAQ.title} accent={FAQ.accent} />
        </div>

        <div className="flex min-w-0 grow flex-col gap-2.5">
          {FAQ.items.map((item) => (
            <details key={item.question} name="faq" className="group rounded-[14px] border border-border bg-card px-5 open:shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px]/[1.35] font-[650] tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden />
              </summary>
              <p className="pb-5 text-[14px]/[1.65] text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
