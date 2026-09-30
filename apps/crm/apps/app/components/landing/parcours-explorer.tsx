"use client";

import { useState } from "react";
import { PARCOURS } from "./gsms-copy";

export function ParcoursExplorer() {
	const [active, setActive] = useState(0);

	return (
		<div className="flex flex-col gap-10 pt-8 md:flex-row md:gap-14">
			<nav className="flex w-48 shrink-0 flex-col gap-1 self-start md:sticky md:top-24">
				<p className="mb-2 font-mono text-[11px]/4 text-muted-foreground uppercase tracking-[0.08em]">
					Votre mission
				</p>
				{PARCOURS.steps.map((step, index) => (
					<button
						key={step.title}
						type="button"
						onClick={() => setActive(index)}
						className={
							active === index
								? "rounded-md bg-muted px-3 py-2 text-left font-medium text-[13px]/5 text-foreground"
								: "rounded-md px-3 py-2 text-left text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground"
						}
					>
						{step.title}
					</button>
				))}
			</nav>

			<div className="min-w-0 grow">
				{PARCOURS.steps.map((step, index) =>
					active === index ? (
						<div key={step.title}>
							<p className="font-mono text-[11px]/4 text-primary uppercase tracking-[0.08em]">
								{String(index + 1).padStart(2, "0")} · {PARCOURS.eyebrow}
							</p>

							<h3 className="max-w-xl pt-3 text-balance font-[650] text-[clamp(22px,2.4vw,30px)]/[1.15] tracking-[-0.025em]">
								{step.title}.
							</h3>

							<p className="max-w-2xl pt-2.5 text-[15px]/[1.6] text-muted-foreground">
								{step.lead}
							</p>

							<ul className="flex flex-col gap-2.5 pt-6">
								{step.bullets.map((bullet) => (
									<li
										key={bullet}
										className="rounded-lg border border-border px-4 py-3 text-[13px]/5"
									>
										{bullet}
									</li>
								))}
							</ul>

							<span className="mt-6 inline-flex w-fit rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 font-medium font-mono text-[10px]/4 text-primary uppercase tracking-[0.06em]">
								{step.result}
							</span>
						</div>
					) : null,
				)}
			</div>
		</div>
	);
}
