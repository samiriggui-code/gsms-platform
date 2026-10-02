import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CONTEXTS } from "@/lib/copy/landing";
import { IconTile } from "./gsms-icon";
import { Section, SectionHeading } from "./section-heading";

export function ContextsSection() {
  return (
    <Section id="environnements" labelledBy="environnements-title">
      <SectionHeading id="environnements-title" eyebrow={CONTEXTS.eyebrow} title={CONTEXTS.title} accent={CONTEXTS.accent} lede={CONTEXTS.lede} />

      <ul className="grid gap-3 md:grid-cols-2">
        {CONTEXTS.groups.map((group) => (
          <li key={group.slug} className="flex">
            <Link
              href={`/prestations/${group.slug}`}
              className="group/ctx flex w-full flex-col gap-4 rounded-[14px] border border-border bg-card p-6 shadow-[0_12px_32px_-20px_rgb(11_13_18/0.10)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift md:p-7"
            >
              <span className="flex items-center gap-3">
                <IconTile name={group.icon} />
                <span className="min-w-0 grow text-[17px]/6 font-semibold tracking-tight">{group.title}</span>
              </span>
              <span className="text-[13.5px]/[1.6] text-muted-foreground">{group.description}</span>
              <span className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="rounded-md border border-border px-2.5 py-1 text-[12px]/5 text-muted-foreground">
                    {item}
                  </span>
                ))}
              </span>
              <span className="mt-auto flex items-center gap-1.5 pt-2 text-[13px]/5 font-medium text-primary">
                {CONTEXTS.cta}
                <ArrowRight className="size-3.5 transition-transform group-hover/ctx:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
