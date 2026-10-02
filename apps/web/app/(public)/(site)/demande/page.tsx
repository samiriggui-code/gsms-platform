import type { Metadata } from "next";
import { Breadcrumb } from "@/components/landing/breadcrumb";
import { MissionRequestForm, type MissionType } from "@/components/landing/mission-request-form";
import { Eyebrow } from "@/components/landing/section-heading";

export const metadata: Metadata = {
  title: "Demande de mission",
  description: "Demandez un audit, un accompagnement appel d'offres ou contactez GSMS. Votre demande est transmise à nos équipes.",
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DemandePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawType = pick(params.type);
  const type: MissionType = rawType === "ao" || rawType === "contact" ? rawType : "audit";

  return (
    <div className="flex w-full max-w-6xl flex-col gap-10 px-5 py-12 sm:px-6 md:py-16 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
      <div className="flex flex-col gap-5">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Demande" }]} />
        <Eyebrow>Demande de mission</Eyebrow>
        <p className="max-w-md text-pretty text-[clamp(22px,2.4vw,30px)]/[1.25] font-[650] tracking-[-0.035em]">
          Décrivez votre contexte. <span className="font-serif font-normal italic text-muted-foreground">Nous revenons vers vous avec le bon interlocuteur.</span>
        </p>
        <ul className="flex flex-col gap-2 text-[13.5px]/[1.6] text-muted-foreground">
          <li>Un échange de cadrage, sans engagement.</li>
          <li>Un périmètre défini avec vous avant toute visite.</li>
          <li>Une proposition chiffrée selon votre établissement.</li>
        </ul>
      </div>

      <MissionRequestForm
        type={type}
        cta={pick(params.cta)}
        offer={pick(params.offer)}
        etablissement={pick(params.etablissement)}
      />
    </div>
  );
}
