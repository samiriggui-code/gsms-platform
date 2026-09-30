import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import Link from "next/link";
import { CONTEXTS } from "./gsms-copy";
import { GsmsIcon } from "./gsms-icons";
import { SectionHeading } from "./section-heading";

export function ContextsStrip() {
	return (
		<section
			id="environnements"
			className="relative flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-20 md:pt-28"
		>
			<div className="flex w-full max-w-6xl flex-col gap-10">
				<SectionHeading
					eyebrow={CONTEXTS.eyebrow}
					title={CONTEXTS.title}
					accent={CONTEXTS.accent}
					lede={CONTEXTS.lede}
				/>

				<div className="grid gap-3 md:grid-cols-2">
					{CONTEXTS.groups.map((group) => (
						<Link
							key={group.slug}
							href={`/prestations/${group.slug}`}
							className="group/situation flex flex-col gap-4 rounded-[14px] border border-border bg-card p-6 shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_12px_32px_-20px_rgb(11_13_18/0.10)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_24px_56px_-28px_rgb(11_13_18/0.18)] md:p-7"
						>
							<div className="flex items-center gap-3">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary/[0.06]">
									<GsmsIcon
										name={group.icon}
										size={18}
										className="text-primary"
									/>
								</span>
								<h3 className="min-w-0 grow font-semibold text-[17px]/6 tracking-tight">
									{group.title}
								</h3>
							</div>

							<p className="text-[13px]/[21px] text-muted-foreground">
								{group.description}
							</p>

							<ul className="flex flex-wrap gap-2">
								{group.items.map((item) => (
									<li
										key={item}
										className="rounded-sm border border-border px-2.5 py-1 text-[12px]/5 text-muted-foreground"
									>
										{item}
									</li>
								))}
							</ul>

							<span className="mt-auto flex items-center gap-1.5 pt-2 font-medium text-[13px]/5 text-primary">
								{CONTEXTS.cta}
								<ArrowRight
									size={14}
									className="shrink-0 transition-transform group-hover/situation:translate-x-0.5"
								/>
							</span>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
