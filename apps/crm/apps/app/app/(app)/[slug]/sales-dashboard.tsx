"use client";

import type { ChartConfig } from "@crm/ui/components/chart";
import { DashboardRow } from "@crm/ui/components/dashboard";
import {
	formatMoney,
	formatMoneyCompact,
	formatPercent,
} from "@crm/ui/lib/format";
import Link from "next/link";
import type { ReactNode } from "react";
import { AreaTrend, DonutStat } from "@/components/dashboard-charts";
import { DeskPulseBand } from "@/components/desk-ui/desk-pulse-band";
import { SoftPanel } from "@/components/desk-ui/soft-panel";
import { dealStageColor, dealStageLabel } from "@/lib/deal-stage";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { useTranslations } from "next-intl";

type Summary = RouterOutputs["dashboard"]["summary"];

export function SalesDashboard({ summary }: { summary: Summary }) {
	const t = useTranslations("overview");
	const tc = useTranslations("crmDashboard");
	const trendConfig: ChartConfig = {
		won: { label: tc("trendWon"), color: "var(--success)" },
		created: { label: tc("trendCreated"), color: "var(--chart-1)" },
	};
	const workspaceUrl = useWorkspaceUrl();

	const {
		pipeline,
		wonThisMonth,
		wonPrevMonth,
		performance,
		trend,
		closingThisMonthTotal,
		reportingCurrency,
		unconverted,
	} = summary;

	const money = (cents: number) => formatMoneyCompact(cents, reportingCurrency);
	const exact = (value: number | string) =>
		formatMoney(Number(value), reportingCurrency);

	const hasTrend = trend.some((point) => point.won > 0 || point.created > 0);

	const wonDelta =
		wonPrevMonth.valueCents === 0
			? null
			: Math.round(
					((wonThisMonth.valueCents - wonPrevMonth.valueCents) /
						wonPrevMonth.valueCents) *
						100,
				);

	const stageSlices = pipeline.stages.flatMap((stage) =>
		stage.valueCents > 0
			? [
					{
						key: stage.stage,
						label: dealStageLabel(stage.stage),
						value: stage.valueCents,
						color: dealStageColor(stage.stage),
						count: stage.count,
					},
				]
			: [],
	);

	return (
		<div className="flex flex-col gap-6">
			<DeskPulseBand
				eyebrow={t("pulseEyebrow")}
				headline={t("pulseHeadline", { value: money(pipeline.totalCents) })}
				subhead={
					wonDelta === null
						? t("pulseSubheadWon", { value: money(wonThisMonth.valueCents) })
						: t("pulseSubheadDelta", {
								value: money(wonThisMonth.valueCents),
								delta: `${wonDelta >= 0 ? "+" : ""}${wonDelta}`,
							})
				}
				body={t("pulseBody", {
					deals: tc("dealCount", { count: pipeline.totalDeals }),
					due: money(closingThisMonthTotal.valueCents),
				})}
				panelTitle={t("panelTitle")}
				panelRows={[
					{
						label: t("winRate"),
						value:
							performance.winRate === null
								? "—"
								: formatPercent(performance.winRate),
					},
					{
						label: t("avgDeal", { days: performance.windowDays }),
						value:
							performance.avgDealCents === null
								? "—"
								: money(performance.avgDealCents),
					},
					{
						label: t("wonThisMonth"),
						value: tc("dealCount", { count: wonThisMonth.count }),
					},
				]}
				stats={[
					{
						label: t("statClosedWon"),
						value: money(wonThisMonth.valueCents),
						helper: t("statThisMonth"),
					},
					{
						label: t("statOpenPipeline"),
						value: money(pipeline.totalCents),
						helper: tc("dealCount", { count: pipeline.totalDeals }),
					},
					{
						label: t("winRate"),
						value:
							performance.winRate === null
								? "—"
								: formatPercent(performance.winRate),
						helper: tc("days", { count: performance.windowDays }),
					},
					{
						label: t("statAvgCycle"),
						value:
							performance.avgCycleDays === null
								? "—"
								: tc("days", { count: performance.avgCycleDays }),
						helper: t("statClosedWonHelper"),
					},
				]}
			/>

			{unconverted.count > 0 ? (
				<p className="text-muted-foreground text-xs">
					{tc("unconverted", {
						currency: reportingCurrency,
						count: unconverted.count,
						currencies: unconverted.currencies.join(", "),
					})}{" "}
					<Link
						href={workspaceUrl("/settings/currencies")}
						className="underline hover:no-underline"
					>
						{tc("setRate")}
					</Link>
				</p>
			) : null}

			<DashboardRow split="hero">
				<ChartPanel
					title={tc("trendTitle")}
					description={tc("trendDescription")}
				>
					{hasTrend ? (
						<div className="flex flex-1 flex-col justify-center py-4">
							<AreaTrend
								data={trend}
								config={trendConfig}
								xKey="month"
								height={196}
								variant="gradient"
								bloom="high"
								showLegend
								formatValue={exact}
							/>
						</div>
					) : (
						<EmptyChart label={tc("trendEmpty")} />
					)}
				</ChartPanel>

				<ChartPanel
					title={tc("stageTitle")}
					description={tc("stageDescription")}
				>
					{stageSlices.length > 0 ? (
						<div className="flex flex-1 flex-col justify-between gap-1 pt-4">
							<DonutStat
								data={stageSlices}
								height={168}
								centerValue={money(pipeline.totalCents)}
								centerLabel={tc("stageCenter")}
								formatValue={exact}
							/>
							<ul className="flex flex-col px-5 pb-1 md:px-6">
								{stageSlices.map((slice) => (
									<li key={slice.key} className="border-t first:border-t-0">
										<Link
											href={`${workspaceUrl("/deals")}?stage=${slice.key}`}
											className="flex items-center gap-2.5 py-2 text-xs hover:underline"
										>
											<span
												aria-hidden
												className="size-1.5 shrink-0"
												style={{ backgroundColor: slice.color }}
											/>
											<span className="min-w-0 flex-1 truncate">
												{slice.label}
											</span>
											<span className="shrink-0 text-muted-foreground tabular-nums">
												{slice.count}
											</span>
											<span className="w-14 shrink-0 text-right font-medium tabular-nums">
												{money(slice.value)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : (
						<EmptyChart label={tc("stageEmpty")} />
					)}
				</ChartPanel>
			</DashboardRow>
		</div>
	);
}

function ChartPanel({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<SoftPanel flush className="flex min-w-0 flex-col">
			<div className="border-border border-b px-5 py-4 sm:px-6">
				<h3 className="font-semibold text-sm tracking-tight">{title}</h3>
				{description ? (
					<p className="mt-1 text-muted-foreground text-xs leading-5">
						{description}
					</p>
				) : null}
			</div>
			<div className="flex flex-1 flex-col">{children}</div>
		</SoftPanel>
	);
}

function EmptyChart({ label }: { label: string }) {
	return (
		<div className="flex flex-1 items-center justify-center px-5 py-10 text-muted-foreground text-sm md:px-6">
			{label}
		</div>
	);
}
