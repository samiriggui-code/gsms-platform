import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import type { Metadata } from "next";
import Link from "next/link";
import { GsmsIcon } from "@/components/landing/gsms-icons";
import type { Prestation } from "@/components/landing/gsms-prestations";
import { MISSIONS, SECTEURS } from "@/components/landing/gsms-prestations";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MissionCta } from "@/components/landing/mission-cta";
import { Eyebrow, SectionHeading } from "@/components/landing/section-heading";

export const metadata: Metadata = {
	title: "Prestations — GSMS",
	description:
		"Audit de sécurité, commission de sécurité, prévention incendie et réponse à appel d'offres. Nos missions et les secteurs où nous intervenons.",
};

export default function PrestationsPage() {
	return (
		<div className="flex min-h-svh w-full flex-col items-center bg-background font-sans text-foreground">
			<LandingNav />

			<section className="relative flex w-full shrink-0 flex-col items-center overflow-clip px-6 pt-16 pb-10">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent_70%)]"
				/>
				<div className="relative flex w-full max-w-6xl flex-col gap-6">
					<nav className="flex items-center gap-2 font-mono text-[11px]/4 text-muted-foreground uppercase tracking-[0.08em]">
						<Link href="/" className="hover:text-foreground">
							Accueil
						</Link>
						<span>/</span>
						<span className="text-foreground">Prestations</span>
					</nav>

					<Eyebrow>Nos interventions</Eyebrow>

					<h1 className="max-w-[760px] text-balance font-[650] text-[clamp(34px,4.4vw,56px)]/[1.06] tracking-[-0.035em]">
						Ce que nous faisons,{" "}
						<span className="font-serif font-normal text-muted-foreground italic">
							et pour qui.
						</span>
					</h1>

					<p className="max-w-[660px] text-pretty text-[17px]/[1.6] text-muted-foreground">
						Quatre missions, quatre familles d'établissements. Chaque
						intervention est chiffrée selon votre périmètre.
					</p>
				</div>
			</section>

			<PrestationGrid
				id="missions"
				eyebrow="Missions"
				title="Les interventions."
				accent="Du constat au passage."
				items={MISSIONS}
			/>

			<PrestationGrid
				id="secteurs"
				eyebrow="Secteurs"
				title="Les établissements."
				accent="Chacun ses obligations."
				items={SECTEURS}
			/>

			<section className="flex w-full shrink-0 flex-col items-center px-6 py-20">
				<div className="flex w-full max-w-6xl flex-col items-center gap-5 rounded-[20px] border border-border bg-muted/40 px-6 py-14 text-center md:py-16">
					<h2 className="max-w-[620px] text-balance font-[650] text-[clamp(26px,3vw,38px)]/[1.1] tracking-[-0.03em]">
						Vous ne savez pas quelle mission correspond ?
					</h2>
					<p className="max-w-[520px] text-pretty text-[15px]/[1.6] text-muted-foreground">
						Décrivez votre situation. Nous vous orientons vers la bonne
						intervention.
					</p>
					<div className="flex flex-wrap justify-center gap-3 pt-1">
						<MissionCta kind="audit" location="closing" />
						<MissionCta kind="contact" location="closing" variant="outline" />
					</div>
				</div>
			</section>

			<LandingFooter />
		</div>
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
		<section
			id={id}
			className="flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-16"
		>
			<div className="flex w-full max-w-6xl flex-col gap-8">
				<SectionHeading eyebrow={eyebrow} title={title} accent={accent} />

				<div className="grid gap-3 md:grid-cols-2">
					{items.map((item, index) => (
						<Link
							key={item.slug}
							href={`/prestations/${item.slug}`}
							className="group/card flex flex-col gap-3 rounded-[14px] border border-border bg-card p-6 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_56px_-28px_rgb(11_13_18/0.18)] md:p-7"
						>
							<div className="flex items-center gap-3">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary/[0.06]">
									<GsmsIcon
										name={item.icon}
										size={18}
										className="text-primary"
									/>
								</span>
								<span className="font-medium font-mono text-[11px]/4 text-primary tracking-[0.08em]">
									{String(index + 1).padStart(2, "0")}
								</span>
							</div>

							<h3 className="font-[650] text-[19px]/[1.25] tracking-[-0.025em]">
								{item.title.replace(/\.$/, "")}
							</h3>

							<p className="text-[13px]/[21px] text-muted-foreground">
								{item.lede}
							</p>

							<span className="mt-auto flex items-center gap-1.5 pt-2 font-medium text-[13px]/5 text-primary">
								Ouvrir
								<ArrowRight
									size={14}
									className="transition-transform group-hover/card:translate-x-0.5"
								/>
							</span>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
