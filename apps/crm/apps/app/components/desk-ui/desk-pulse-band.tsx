import type { ReactNode } from "react";
import { cn } from "@crm/ui/lib/utils";

export type DeskPulseRow = {
	label: string;
	value: ReactNode;
};

export type DeskPulseStat = {
	label: string;
	value: string;
	helper?: string;
};

type DeskPulseBandProps = {
	eyebrow: string;
	headline: ReactNode;
	subhead?: ReactNode;
	body?: ReactNode;
	panelTitle?: string;
	panelRows?: DeskPulseRow[];
	stats?: DeskPulseStat[];
	actions?: ReactNode;
	className?: string;
};

/**
 * Dark hero band — pattern DocuLens / Tenant Core (`#111721`, rounded-[28px]).
 */
export function DeskPulseBand({
	eyebrow,
	headline,
	subhead,
	body,
	panelTitle,
	panelRows,
	stats,
	actions,
	className,
}: DeskPulseBandProps) {
	const hasPanel = Boolean(panelTitle || (panelRows && panelRows.length > 0));

	return (
		<section
			className={cn(
				"relative overflow-hidden rounded-[28px] bg-[#111721] text-white shadow-[0_18px_50px_rgba(17,23,33,0.22)]",
				className,
			)}
		>
			<div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full border-[48px] border-primary/25" />
			<div
				className={cn(
					"relative grid gap-8 px-6 py-8 sm:px-8",
					hasPanel && "xl:grid-cols-[1.3fr_0.7fr] xl:items-end",
				)}
			>
				<div>
					<div className="flex items-center gap-2 font-semibold text-[10px] text-white/55 uppercase tracking-[0.2em]">
						<span className="size-1.5 rounded-full bg-emerald-400" />
						{eyebrow}
					</div>
					<h2 className="mt-4 max-w-3xl text-balance font-semibold text-3xl leading-tight tracking-[-0.035em] sm:text-4xl">
						{headline}
						{subhead ? (
							<span className="mt-1 block text-white/55 text-xl sm:text-2xl">
								{subhead}
							</span>
						) : null}
					</h2>
					{body ? (
						<p className="mt-4 max-w-xl text-sm text-white/60 leading-6">
							{body}
						</p>
					) : null}
					{actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
				</div>

				{hasPanel ? (
					<div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
						{panelTitle ? (
							<p className="font-semibold text-[10px] text-white/45 uppercase tracking-[0.18em]">
								{panelTitle}
							</p>
						) : null}
						{panelRows && panelRows.length > 0 ? (
							<div
								className={cn(
									"divide-y divide-white/10",
									panelTitle && "mt-3",
								)}
							>
								{panelRows.map((row) => (
									<div
										key={row.label}
										className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
									>
										<span className="text-white/55 text-xs">{row.label}</span>
										<strong className="font-semibold text-sm text-white">
											{row.value}
										</strong>
									</div>
								))}
							</div>
						) : null}
					</div>
				) : null}
			</div>

			{stats && stats.length > 0 ? (
				<div
					className={cn(
						"relative grid border-white/10 border-t",
						stats.length >= 3 && "sm:grid-cols-3",
						stats.length === 2 && "sm:grid-cols-2",
						stats.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
					)}
				>
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="border-white/10 px-6 py-4 sm:border-r sm:px-8 sm:last:border-r-0"
						>
							<p className="font-semibold text-[10px] text-white/40 uppercase tracking-[0.16em]">
								{stat.label}
							</p>
							<div className="mt-1.5 flex items-baseline gap-2">
								<span className="font-semibold text-xl tracking-tight">
									{stat.value}
								</span>
								{stat.helper ? (
									<span className="text-[10px] text-white/45">{stat.helper}</span>
								) : null}
							</div>
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}
