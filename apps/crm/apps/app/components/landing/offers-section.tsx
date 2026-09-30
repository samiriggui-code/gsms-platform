import Checkmark from "@carbon/icons-react/es/Checkmark";
import { cn } from "@crm/ui/lib/utils";
import { OFFERS } from "./gsms-copy";
import { MissionCta } from "./mission-cta";
import { SectionHeading } from "./section-heading";

export function OffersSection() {
	return (
		<section
			id="offres"
			className="relative flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-20 md:pt-28"
		>
			<div className="flex w-full max-w-6xl flex-col gap-12">
				<SectionHeading
					eyebrow={OFFERS.eyebrow}
					title={OFFERS.title}
					lede={OFFERS.lede}
				/>

				<div className="grid items-start gap-4 lg:grid-cols-3">
					{OFFERS.plans.map((plan) => (
						<article
							key={plan.name}
							className={cn(
								"relative flex h-full flex-col gap-6 rounded-lg border p-6 md:p-8",
								plan.highlighted
									? "border-foreground bg-foreground text-background shadow-xl"
									: "border-border bg-background",
							)}
						>
							<div className="flex flex-col gap-3">
								<div className="flex min-h-6 items-start gap-3">
									<h3 className="min-w-0 grow font-semibold text-[17px]/6 tracking-tight">
										{plan.name}
									</h3>
									{"badge" in plan && plan.badge ? (
										<span className="shrink-0 rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px]/4 text-primary-foreground tracking-wide uppercase">
											{plan.badge}
										</span>
									) : null}
								</div>

								<p
									className={cn(
										"font-mono text-[11px]/4 tracking-widest uppercase",
										plan.highlighted
											? "text-background/60"
											: "text-muted-foreground",
									)}
								>
									{plan.price}
								</p>

								<p
									className={cn(
										"text-[13px]/[21px]",
										plan.highlighted
											? "text-background/70"
											: "text-muted-foreground",
									)}
								>
									{plan.description}
								</p>
							</div>

							<ul
								className={cn(
									"flex flex-col gap-2.5 border-t pt-5",
									plan.highlighted ? "border-background/20" : "border-border",
								)}
							>
								{plan.features.map((feature) => (
									<li
										key={feature}
										className="flex items-start gap-2.5 text-[13px]/5"
									>
										<Checkmark
											size={14}
											className={cn(
												"mt-0.5 shrink-0",
												plan.highlighted
													? "text-background/60"
													: "text-muted-foreground",
											)}
										/>
										<span>{feature}</span>
									</li>
								))}
							</ul>

							<div className="mt-auto pt-1">
								<MissionCta
									kind={plan.kind}
									location="offers"
									variant={plan.highlighted ? "onInk" : "outline"}
									label="Demander un devis"
									offer={plan.name}
								/>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
