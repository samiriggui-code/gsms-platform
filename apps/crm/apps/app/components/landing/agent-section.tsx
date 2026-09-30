import { PARCOURS } from "./gsms-copy";
import { ParcoursExplorer } from "./parcours-explorer";
import { Eyebrow } from "./section-heading";

export function AgentSection() {
	return (
		<section
			id="parcours"
			className="relative flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-20 md:pt-28"
		>
			<div className="flex w-full max-w-6xl flex-col gap-4">
				<Eyebrow>{PARCOURS.eyebrow}</Eyebrow>
				<h2 className="max-w-2xl text-balance font-[650] text-[clamp(30px,3.6vw,44px)]/[1.08] tracking-[-0.03em]">
					{PARCOURS.title}
				</h2>
				<p className="max-w-2xl text-[16px]/[1.55] text-muted-foreground">
					{PARCOURS.lede}
				</p>

				<ParcoursExplorer />
			</div>
		</section>
	);
}
