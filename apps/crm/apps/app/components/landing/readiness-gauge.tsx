import Checkmark from "@carbon/icons-react/es/Checkmark";
import { GAUGE } from "./gsms-copy";

export function ReadinessGauge() {
	return (
		<div className="w-full max-w-[560px] select-none rounded-[20px] border border-border bg-card p-7 shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_24px_56px_-28px_rgb(11_13_18/0.18)] md:p-9">
			<div className="flex items-start justify-between gap-6">
				<p className="flex items-baseline gap-1.5">
					<span className="font-[700] text-[clamp(40px,5vw,58px)]/[0.9] tracking-[-0.04em]">
						{GAUGE.score}
					</span>
					<span className="font-[700] text-[22px]/[1] text-muted-foreground">
						%
					</span>
					<span className="pl-1.5 text-[13px]/5 text-muted-foreground">
						{GAUGE.scoreLabel}
					</span>
				</p>

				<p className="shrink-0 text-right font-mono text-[11px]/[1.5] text-muted-foreground">
					{GAUGE.subtitle}
				</p>
			</div>

			<div className="flex flex-col gap-3.5 pt-7">
				{GAUGE.rows.map((row) => (
					<div
						key={row.label}
						className="grid grid-cols-[minmax(0,150px)_1fr_18px] items-center gap-3.5"
					>
						<span className="truncate text-[12.5px]/5 text-muted-foreground">
							{row.label}
						</span>
						<span className="h-2 overflow-clip rounded-full bg-border">
							<span
								className="block h-full rounded-full bg-primary"
								style={{ width: `${row.value}%` }}
							/>
						</span>
						<Checkmark
							size={16}
							className={row.value >= 70 ? "text-primary" : "text-transparent"}
						/>
					</div>
				))}
			</div>

			<p className="mt-7 border-border border-t pt-5 font-mono text-[11px]/5 text-muted-foreground">
				{GAUGE.footer}
			</p>
		</div>
	);
}
