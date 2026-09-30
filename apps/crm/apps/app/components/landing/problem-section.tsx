import { CompareTable } from "./compare-table";
import { PROBLEM } from "./gsms-copy";
import { SectionHeading } from "./section-heading";

export function ProblemSection() {
	return (
		<section className="relative flex w-full shrink-0 flex-col items-center px-6 pt-20 md:pt-28">
			<div className="flex w-full max-w-6xl flex-col gap-10">
				<SectionHeading
					eyebrow={PROBLEM.eyebrow}
					title={PROBLEM.title}
					accent={PROBLEM.accent}
					lede={PROBLEM.lede}
				/>

				<div className="grid gap-3 md:grid-cols-2">
					{PROBLEM.pains.map((pain) => (
						<p
							key={pain}
							className="rounded-[14px] border border-border bg-card p-6 text-[15px]/[24px] text-muted-foreground md:p-7"
						>
							{pain}
						</p>
					))}
				</div>

				<p className="max-w-3xl text-pretty font-medium text-[17px]/[28px]">
					{PROBLEM.answer}
				</p>

				<div className="pt-4">
					<CompareTable />
				</div>
			</div>
		</section>
	);
}
