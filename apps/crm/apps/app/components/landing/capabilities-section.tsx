import { FEATURES } from "./gsms-copy";
import { GsmsIcon } from "./gsms-icons";
import { SectionHeading } from "./section-heading";

export function CapabilitiesSection() {
	return (
		<section
			id="savoir-faire"
			className="relative flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-20 md:pt-28"
		>
			<div className="flex w-full max-w-6xl flex-col gap-12">
				<SectionHeading
					eyebrow={FEATURES.eyebrow}
					title={FEATURES.title}
					lede={FEATURES.lede}
				/>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.cards.map((card) => (
						<article
							key={card.title}
							className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-6 transition-[border-color,box-shadow] hover:border-primary/25 hover:shadow-[0_12px_32px_-20px_rgb(11_13_18/0.14)] md:p-7"
						>
							<GsmsIcon
								name={card.icon}
								size={22}
								className="shrink-0 text-primary"
							/>
							<h3 className="font-semibold text-[17px]/6 tracking-tight">
								{card.title}
							</h3>
							<p className="text-[13px]/[21px] text-muted-foreground">
								{card.description}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
