import { CLOSING } from "./gsms-copy";
import { MissionCta } from "./mission-cta";
import { Eyebrow } from "./section-heading";

export function ClosingCta() {
	return (
		<section className="relative flex w-full shrink-0 flex-col items-center px-6 pt-20 pb-20 md:pt-28">
			<div className="relative flex w-full max-w-6xl flex-col items-center gap-6 overflow-clip rounded-lg border border-border bg-muted/30 px-6 py-16 md:px-12 md:py-20">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,color-mix(in_oklch,var(--primary),transparent_86%),transparent_70%)]"
				/>

				<div className="relative">
					<Eyebrow>{CLOSING.eyebrow}</Eyebrow>
				</div>

				<h2 className="relative max-w-[720px] text-balance text-center font-semibold text-4xl/[42px] tracking-tight md:text-[44px]/[50px]">
					{CLOSING.title}
				</h2>

				<p className="relative max-w-[560px] text-pretty text-center text-lg/[28px] text-muted-foreground">
					{CLOSING.lede}
				</p>

				<div className="relative flex flex-wrap items-center justify-center gap-3 pt-2">
					<MissionCta kind="audit" location="closing" />
					<MissionCta kind="contact" location="closing" variant="outline" />
				</div>
			</div>
		</section>
	);
}
