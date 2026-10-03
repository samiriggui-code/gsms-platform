"use client";

import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { formatMoney } from "@crm/ui/lib/format";
import { useTranslations } from "next-intl";
import { CompanyCell } from "@/components/crm/company-cell";
import { DealStageIndicator } from "@/components/crm/deal-stage";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { LocalDay } from "@/components/local-date-time";
import type { DealListItem, DealListResult } from "@/lib/agent-transcript";
import { DEAL_STAGE_OPTIONS } from "@/lib/deal-stage";

type Translate = ReturnType<typeof useTranslations>;

function dealColumns(t: Translate): SimpleTableColumn[] {
	return [
		{ id: "deal", header: t("columnDeal"), width: "w-[20%]" },
		{ id: "company", header: t("columnCompany"), width: "w-[18%]" },
		{ id: "stage", header: t("columnStage"), width: "w-[18%]" },
		{
			id: "amount",
			header: t("columnAmount"),
			width: "w-[12%]",
			align: "right",
		},
		{ id: "owner", header: t("columnOwner"), width: "w-[14%]" },
		{ id: "close", header: t("columnCloseDate"), width: "w-[12%]" },
		{ id: "idle", header: t("columnIdle"), width: "w-[8%]", align: "right" },
	];
}

export function DealListResultTable({ result }: { result: DealListResult }) {
	const t = useTranslations("agentsDealList");
	const openRecord = useOpenRecord();
	const prefetchRecord = usePrefetchRecord();
	const count = result.deals.length;
	const title = tableTitle(result, t);
	const columns = dealColumns(t);

	return (
		<section aria-label={title} className="flex w-full flex-col gap-3">
			<SimpleTable
				columns={columns}
				className="min-w-[56rem] table-fixed [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
				headerHeight="h-11"
			>
				{count === 0 ? (
					<SimpleTableRow>
						<TableCell
							colSpan={columns.length}
							className="h-32 whitespace-normal py-8 text-center align-middle text-muted-foreground"
						>
							{t("empty")}
						</TableCell>
					</SimpleTableRow>
				) : (
					result.deals.map((deal) => {
						const record = { kind: "deal" as const, id: deal.id };

						return (
							<SimpleTableRow
								key={deal.id}
								clickable
								onClick={() => openRecord(record)}
								onFocus={() => prefetchRecord(record)}
								onMouseEnter={() => prefetchRecord(record)}
							>
								<TableCell className="overflow-hidden px-3 py-3">
									<span className="block truncate font-medium">
										{deal.name}
									</span>
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<CompanyCell company={deal.company} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<Stage stage={deal.stage} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3 text-right">
									{deal.amount === null ? (
										<EmptyCellValue />
									) : (
										<span className="tabular-nums">
											{formatMoney(
												Math.round(deal.amount * 100),
												deal.currency,
											)}
										</span>
									)}
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<OwnerCell owner={deal.owner} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									{deal.expectedCloseDate ? (
										<span className="text-muted-foreground">
											<LocalDay date={deal.expectedCloseDate} />
										</span>
									) : (
										<EmptyCellValue />
									)}
								</TableCell>
								<TableCell
									className="overflow-hidden px-3 py-3 text-right text-muted-foreground tabular-nums"
									title={deal.neverActive ? t("neverActive") : undefined}
								>
									{t("idleDays", { days: deal.daysSinceLastActivity })}
								</TableCell>
							</SimpleTableRow>
						);
					})
				)}
			</SimpleTable>
			<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
				<span>{tableMeta(result, t)}</span>
				<span>
					{t("asOf")} <LocalDay date={result.asOf} />
				</span>
			</div>
		</section>
	);
}

function Stage({ stage }: { stage: string }) {
	const option = DEAL_STAGE_OPTIONS.find(
		(candidate) => candidate.value === stage,
	);
	return option ? (
		<DealStageIndicator stage={option.value} />
	) : (
		<span className="text-muted-foreground">{humaniseStage(stage)}</span>
	);
}

function tableTitle(result: DealListResult, t: Translate): string {
	return t("title", {
		count: result.deals.length,
		status: result.criteria.status,
		stale: result.criteria.inactiveForDays === null ? "no" : "yes",
	});
}

function tableMeta(result: DealListResult, t: Translate): string {
	const total = pipelineTotal(result.deals);
	const details = [
		t("dealCount", { count: result.deals.length }),
		total ? t("pipelineTotal", { amount: total }) : null,
		result.criteria.inactiveForDays === null
			? null
			: t("inactiveDays", { days: result.criteria.inactiveForDays }),
		result.hasMore ? t("moreResults") : null,
	].filter((detail): detail is string => Boolean(detail));

	return details.join(" · ");
}

function humaniseStage(stage: string): string {
	return stage
		.toLowerCase()
		.split("_")
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function pipelineTotal(deals: readonly DealListItem[]): string | null {
	const currencies = new Set(deals.map((deal) => deal.currency));
	if (currencies.size !== 1) return null;

	const currency = currencies.values().next().value;
	if (!currency) return null;

	const amount = deals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
	return formatMoney(Math.round(amount * 100), currency);
}
