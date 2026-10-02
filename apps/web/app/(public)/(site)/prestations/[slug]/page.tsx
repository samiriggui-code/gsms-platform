import { ArrowRight, Check, ExternalLink, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/landing/breadcrumb";
import { ClosingCta } from "@/components/landing/closing-cta";
import { IconTile } from "@/components/landing/gsms-icon";
import { MissionCta } from "@/components/landing/mission-cta";
import { Accent, Eyebrow } from "@/components/landing/section-heading";
import { PRESTATIONS, prestationBySlug } from "@/lib/copy/prestations";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRESTATIONS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const prestation = prestationBySlug(slug);
  if (!prestation) return {};
  return { title: prestation.title.replace(/\.$/, ""), description: prestation.lede };
}

export default async function PrestationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prestation = prestationBySlug(slug);
  if (!prestation) notFound();

  const related = PRESTATIONS.filter((item) => item.kind === prestation.kind && item.slug !== prestation.slug).slice(0, 3);
  const ctaParams = prestation.etablissement ? `&etablissement=${prestation.etablissement}` : "";

  return (
    <>
      <section aria-labelledby="prestation-title" className="relative flex w-full flex-col items-center overflow-clip px-5 pt-14 pb-12 sm:px-6 md:pt-20">
        <div aria-hidden className="hero-glow" />
        <div className="relative flex w-full max-w-6xl flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "Accueil", href: "/" },
              { label: "Prestations", href: "/prestations" },
              { label: prestation.title.replace(/\.$/, "") },
            ]}
          />

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
            <div className="flex min-w-0 grow flex-col gap-5">
              <Eyebrow className="animate-rise">{prestation.eyebrow}</Eyebrow>
              <h1 id="prestation-title" className="animate-rise-1 max-w-[760px] text-balance text-[clamp(36px,4.8vw,62px)]/[1.0] font-[650] tracking-[-0.05em]">
                {prestation.title} <Accent>{prestation.accent}</Accent>
              </h1>
              <p className="animate-rise-2 max-w-[640px] text-pretty text-[17px]/[1.65] text-muted-foreground">{prestation.lede}</p>
              <div className="animate-rise-2 flex flex-wrap gap-3 pt-1">
                <Link
                  href={`/demande?type=${prestation.ctaType}&cta=prestation&offer=${prestation.slug}${ctaParams}`}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-[14px] font-semibold text-background hover:bg-foreground/90"
                >
                  {prestation.ctaLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <MissionCta kind="contact" cta="prestation" variant="outline" label="Poser une question" />
              </div>
            </div>

            <aside aria-label="Livrables" className="w-full shrink-0 rounded-[20px] bg-ink p-6 text-ink-foreground shadow-xl lg:w-[320px]">
              <p className="font-mono text-[10px]/4 uppercase tracking-[0.1em] text-white/50">Ce que vous recevez</p>
              <ul className="flex flex-col gap-3 pt-4">
                {prestation.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-white/60" aria-hidden />
                    <span className="text-[13.5px]/5">{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section aria-labelledby="contenu-title" className="flex w-full flex-col items-center px-5 sm:px-6">
        <div className="flex w-full max-w-6xl flex-col gap-10">
          <h2 id="contenu-title" className="sr-only">
            Contenu de la mission
          </h2>
          <p className="max-w-[780px] text-pretty text-[clamp(17px,1.5vw,19px)]/[1.7]">{prestation.intro}</p>

          <ol className="grid gap-3 md:grid-cols-2">
            {prestation.includes.map((item, index) => (
              <li key={item.title} className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-6 md:p-7">
                <span className="font-mono text-[11px]/4 font-medium tracking-[0.08em] text-primary">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-[17px]/6 font-[650] tracking-[-0.02em]">{item.title}</h3>
                <p className="text-[13.5px]/[1.6] text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface-subtle p-6 md:p-7">
            <h3 className="flex items-center gap-2 font-mono text-[11px]/4 uppercase tracking-[0.08em] text-muted-foreground">
              <Scale className="size-3.5 text-primary" aria-hidden />
              Cadre réglementaire
            </h3>
            <ul className="flex flex-wrap gap-2">
              {prestation.references.map((reference) => (
                <li key={reference.label}>
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12.5px]/5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {reference.label}
                    {reference.paid ? <span className="text-[10px]/4 text-muted-foreground/80">(accès payant)</span> : null}
                    <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden />
                    <span className="sr-only">(nouvel onglet)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-5 rounded-[20px] border border-border bg-muted/40 p-7 md:p-9">
            <h3 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">Pour qui</h3>
            <ul className="flex flex-wrap gap-2">
              {prestation.audience.map((item) => (
                <li key={item} className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px]/5 text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="related-title" className="flex w-full flex-col items-center px-5 pt-16 sm:px-6">
          <div className="flex w-full max-w-6xl flex-col gap-6">
            <h2 id="related-title" className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">
              {prestation.kind === "mission" ? "Autres missions" : "Autres secteurs"}
            </h2>
            <ul className="grid gap-3 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug} className="flex">
                  <Link
                    href={`/prestations/${item.slug}`}
                    className="group/rel flex w-full flex-col gap-3 rounded-[14px] border border-border bg-card p-6 transition-[border-color,box-shadow] hover:border-primary/25 hover:shadow-lift"
                  >
                    <IconTile name={item.icon} />
                    <span className="text-[15px]/6 font-[650] tracking-[-0.02em]">{item.title.replace(/\.$/, "")}</span>
                    <span className="mt-auto flex items-center gap-1.5 text-[13px]/5 font-medium text-primary">
                      Découvrir
                      <ArrowRight className="size-3.5 transition-transform group-hover/rel:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <ClosingCta title="Parlons de votre établissement" lede="Décrivez-nous votre contexte. Nous vous proposons une intervention adaptée." />
    </>
  );
}
