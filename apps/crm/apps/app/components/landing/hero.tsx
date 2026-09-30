import { HERO } from "./gsms-copy";
import { MissionCta } from "./mission-cta";
import { ReadinessGauge } from "./readiness-gauge";
import { Eyebrow } from "./section-heading";
import { TrustGrid } from "./trust-band";

export function Hero() {
	return (
		<section className="relative flex w-full shrink-0 flex-col items-center overflow-clip px-6 pt-20 pb-14 md:pt-28">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_88%),transparent_70%)]"
			/>

			<div className="relative flex w-full max-w-6xl flex-col items-center gap-7">
				<Eyebrow>{HERO.badge}</Eyebrow>

				<h1 className="max-w-[900px] text-balance text-center font-[650] text-[clamp(38px,5.2vw,68px)]/[1.04] tracking-[-0.035em]">
					{HERO.title}{" "}
					<span className="font-serif font-normal text-muted-foreground italic">
						{HERO.accent}
					</span>
				</h1>

				<p className="max-w-[680px] text-pretty text-center text-[clamp(17px,1.6vw,20px)]/[1.55] text-muted-foreground">
					{HERO.lede}
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-1">
					<MissionCta kind="audit" location="hero" />
					<MissionCta kind="ao" location="hero" variant="outline" />
				</div>

				<div className="flex w-full flex-col items-center gap-4 pt-10 lg:flex-row lg:items-stretch lg:justify-center">
					<ReadinessGauge />
					<TrustGrid />
				</div>
			</div>
		</section>
	);
}
