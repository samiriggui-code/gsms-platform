import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import Certificate from "@carbon/icons-react/es/Certificate";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Launch from "@carbon/icons-react/es/Launch";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GsmsIcon } from "@/components/landing/gsms-icons";
import {
	PRESTATIONS,
	prestationBySlug,
} from "@/components/landing/gsms-prestations";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MissionCta } from "@/components/landing/mission-cta";
import { Eyebrow } from "@/components/landing/section-heading";

export const instant = false;

export function generateStaticParams() {
	return PRESTATIONS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const prestation = prestationBySlug(slug);
	if (!prestation) return {};
	return {
		title: `${prestation.title.replace(/\.$/, "")} — GSMS`,
		description: prestation.lede,
	};
}

export default async function PrestationPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const prestation = prestationBySlug(slug);
	if (!prestation) notFound();

	const related = PRESTATIONS.filter(
		(item) => item.kind === prestation.kind && item.slug !== prestation.slug,
	).slice(0, 3);

	return (
		<div className="flex min-h-svh w-full flex-col items-center bg-background font-sans text-foreground">
			<LandingNav />

			<section className="relative flex w-full shrink-0 flex-col items-center overflow-clip px-6 pt-16 pb-12">
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
						<Link href="/prestations" className="hover:text-foreground">
							Prestations
						</Link>
					</nav>

					<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-16">
						<div className="flex min-w-0 grow flex-col gap-5">
							<Eyebrow>{prestation.eyebrow}</Eyebrow>

							<h1 className="max-w-[720px] text-balance font-[650] text-[clamp(34px,4.4vw,56px)]/[1.06] tracking-[-0.035em]">
								{prestation.title}{" "}
								<span className="font-serif font-normal text-muted-foreground italic">
									{prestation.accent}
								</span>
							</h1>

							<p className="max-w-[640px] text-pretty text-[17px]/[1.6] text-muted-foreground">
								{prestation.lede}
							</p>

							<div className="flex flex-wrap gap-3 pt-1">
								<MissionCta
									kind={prestation.ctaType}
									location="hero"
									label={prestation.ctaLabel}
									offer={prestation.slug}
								/>
								<MissionCta
									kind="contact"
									location="hero"
									variant="outline"
									label="Poser une question"
								/>
							</div>
						</div>

						<aside className="w-full shrink-0 rounded-[20px] bg-foreground p-6 text-background shadow-xl lg:w-[300px]">
							<p className="font-mono text-[10px]/4 text-background/50 uppercase tracking-[0.1em]">
								Ce que vous recevez
							</p>
							<ul className="flex flex-col gap-3 pt-4">
								{prestation.deliverables.map((item) => (
									<li key={item} className="flex items-start gap-2.5">
										<Checkmark
											size={15}
											className="mt-0.5 shrink-0 text-background/60"
										/>
										<span className="text-[13px]/5">{item}</span>
									</li>
								))}
							</ul>
						</aside>
					</div>
				</div>
			</section>

			<section className="flex w-full shrink-0 flex-col items-center px-6 pt-6">
				<div className="flex w-full max-w-6xl flex-col gap-10">
					<p className="max-w-[760px] text-pretty text-[17px]/[1.65]">
						{prestation.intro}
					</p>

					<div className="grid gap-3 md:grid-cols-2">
						{prestation.includes.map((item, index) => (
							<article
								key={item.title}
								className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-6 md:p-7"
							>
								<span className="font-medium font-mono text-[11px]/4 text-primary tracking-[0.08em]">
									{String(index + 1).padStart(2, "0")}
								</span>
								<h2 className="font-[650] text-[17px]/6 tracking-[-0.02em]">
									{item.title}
								</h2>
								<p className="text-[13px]/[21px] text-muted-foreground">
									{item.body}
								</p>
							</article>
						))}
					</div>

					<div className="flex flex-col gap-3 rounded-[14px] border border-border bg-muted/30 p-6 md:p-7">
						<p className="flex items-center gap-2 font-mono text-[11px]/4 text-muted-foreground uppercase tracking-[0.08em]">
							<Certificate size={14} className="text-primary" />
							Cadre réglementaire
						</p>
						<ul className="flex flex-wrap gap-2">
							{prestation.references.map((reference) => (
								<li key={reference.label}>
									<a
										href={reference.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 text-[12.5px]/5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
									>
										{reference.label}
										{reference.paid ? (
											<span className="text-[10px]/4 text-muted-foreground/70">
												(accès payant)
											</span>
										) : null}
										<Launch size={12} className="shrink-0 opacity-60" />
									</a>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="flex w-full shrink-0 flex-col items-center px-6 pt-16">
				<div className="flex w-full max-w-6xl flex-col gap-6 rounded-[20px] border border-border bg-muted/40 p-7 md:p-9">
					<h2 className="font-[650] text-[22px]/[1.2] tracking-[-0.025em]">
						Pour qui
					</h2>
					<ul className="flex flex-wrap gap-2">
						{prestation.audience.map((item) => (
							<li
								key={item}
								className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px]/5 text-muted-foreground"
							>
								{item}
							</li>
						))}
					</ul>
				</div>
			</section>

			{related.length > 0 ? (
				<section className="flex w-full shrink-0 flex-col items-center px-6 pt-16">
					<div className="flex w-full max-w-6xl flex-col gap-6">
						<h2 className="font-[650] text-[22px]/[1.2] tracking-[-0.025em]">
							{prestation.kind === "mission"
								? "Autres missions"
								: "Autres secteurs"}
						</h2>
						<div className="grid gap-3 md:grid-cols-3">
							{related.map((item) => (
								<Link
									key={item.slug}
									href={`/prestations/${item.slug}`}
									className="group/rel flex flex-col gap-3 rounded-[14px] border border-border bg-card p-6 transition-[border-color,box-shadow] hover:border-primary/25 hover:shadow-[0_12px_32px_-20px_rgb(11_13_18/0.14)]"
								>
									<span className="flex size-9 items-center justify-center rounded-[10px] border border-primary/15 bg-primary/[0.06]">
										<GsmsIcon
											name={item.icon}
											size={18}
											className="text-primary"
										/>
									</span>
									<h3 className="font-[650] text-[15px]/6 tracking-[-0.02em]">
										{item.title.replace(/\.$/, "")}
									</h3>
									<span className="mt-auto flex items-center gap-1.5 font-medium text-[13px]/5 text-primary">
										Ouvrir
										<ArrowRight
											size={14}
											className="transition-transform group-hover/rel:translate-x-0.5"
										/>
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			) : null}

			<section className="flex w-full shrink-0 flex-col items-center px-6 py-20">
				<div className="flex w-full max-w-6xl flex-col items-center gap-5 rounded-[20px] border border-border bg-muted/40 px-6 py-14 text-center md:py-16">
					<h2 className="max-w-[620px] text-balance font-[650] text-[clamp(26px,3vw,38px)]/[1.1] tracking-[-0.03em]">
						Parlons de votre établissement
					</h2>
					<p className="max-w-[520px] text-pretty text-[15px]/[1.6] text-muted-foreground">
						Décrivez-nous votre contexte. Nous vous proposons une intervention
						adaptée.
					</p>
					<div className="flex flex-wrap justify-center gap-3 pt-1">
						<MissionCta
							kind={prestation.ctaType}
							location="closing"
							label={prestation.ctaLabel}
							offer={prestation.slug}
						/>
					</div>
				</div>
			</section>

			<LandingFooter />
		</div>
	);
}
