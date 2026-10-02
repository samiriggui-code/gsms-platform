import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/landing/breadcrumb";
import { ClosingCta } from "@/components/landing/closing-cta";
import { IconTile } from "@/components/landing/gsms-icon";
import { Accent, Eyebrow, Section, SectionHeading } from "@/components/landing/section-heading";
import { MISSIONS, SECTEURS, type Prestation } from "@/lib/copy/prestations";

export const metadata: Metadata = {
  title: "Prestations",
  description:
    "Audit de sécurité, commission de sécurité, prévention incendie et réponse à appel d'offres. Nos missions et les secteurs où nous intervenons.",
};

export default function PrestationsPage() {
  return (
    <>
      <section aria-labelledby="prestations-title" className="relative flex w-full flex-col items-center overflow-clip px-5 pt-14 pb-4 sm:px-6 md:pt-20">
        <div aria-hidden className="hero-glow" />
        <div className="relative flex w-full max-w-6xl flex-col gap-6">
          <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Prestations" }]} />
          <Eyebrow className="animate-rise">Nos interventions</Eyebrow>
          <h1 id="prestations-title" className="animate-rise-1 max-w-[820px] text-balance text-[clamp(38px,5vw,64px)]/[1.0] font-[650] tracking-[-0.05em]">
            Ce que nous faisons, <Accent>et pour qui.</Accent>
          </h1>
          <p className="animate-rise-2 max-w-[660px] text-pretty text-[17px]/[1.65] text-muted-foreground">
            Quatre missions, quatre familles d&apos;établissements. Chaque intervention est chiffrée selon votre périmètre.
          </p>
        </div>
      </section>

      <PrestationGrid id="missions" eyebrow="Missions" title="Les interventions." accent="Du constat au passage." items={MISSIONS} />
      <PrestationGrid id="secteurs" eyebrow="Secteurs" title="Les établissements." accent="Chacun ses obligations." items={SECTEURS} />

      <ClosingCta
        eyebrow="Orientation"
        title="Vous ne savez pas quelle mission correspond ?"
        lede="Décrivez votre situation. Nous vous orientons vers la bonne intervention."
      />
    </>
  );
}

function PrestationGrid({
  id,
  eyebrow,
  title,
  accent,
  items,
}: {
  id: string;
  eyebrow: string;
  title: string;
  accent: string;
  items: Prestation[];
}) {
  return (
    <Section id={id} labelledBy={`${id}-title`} className="md:pt-20">
      <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} accent={accent} />
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.slug} className="flex">
            <Link
              href={`/prestations/${item.slug}`}
              className="group/card flex w-full flex-col gap-3 rounded-[14px] border border-border bg-card p-6 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift md:p-7"
            >
              <span className="flex items-center gap-3">
                <IconTile name={item.icon} />
                <span className="font-mono text-[11px]/4 font-medium tracking-[0.08em] text-primary">{String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="text-[20px]/[1.25] font-[650] tracking-[-0.03em]">{item.title.replace(/\.$/, "")}</span>
              <span className="text-[13.5px]/[1.6] text-muted-foreground">{item.lede}</span>
              <span className="mt-auto flex items-center gap-1.5 pt-2 text-[13px]/5 font-medium text-primary">
                Découvrir
                <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
