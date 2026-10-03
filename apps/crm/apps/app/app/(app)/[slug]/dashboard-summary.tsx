"use client";

import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardPanel,
	CardPanelEmpty,
	CardTitle,
} from "@crm/ui/components/card";
import { CardTableEmpty } from "@crm/ui/components/card-table";
import { Checkbox } from "@crm/ui/components/checkbox";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { Spinner } from "@crm/ui/components/spinner";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { TableCell } from "@crm/ui/components/table";
import { formatMoneyCompact } from "@crm/ui/lib/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";
import { DealStageIndicator } from "@/components/crm/deal-stage";
import { RecordLink } from "@/components/crm/record-sheet/record-link";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { SoftPanel } from "@/components/desk-ui/soft-panel";
import { LocalRelativeTime } from "@/components/local-date-time";
import { ACTIVITY_LABEL_NAMESPACE } from "@/lib/activity-presentation";
import { dealStageColor } from "@/lib/deal-stage";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { overviewParsers } from "./overview-search-params";
import { SalesDashboard } from "./sales-dashboard";

const CELL = "px-3 py-2.5 align-middle";
type Translate = ReturnType<typeof useTranslations>;

const openColumns = (t: Translate): SimpleTableColumn[] => [
	{ id: "deal", header: t("colDeal") },
	{
		id: "stage",
		header: t("colStage"),
		width: "w-32",
		className: "hidden lg:table-cell",
	},
	{
		id: "share",
		srLabel: t("colShare"),
		width: "w-24",
		className: "hidden sm:table-cell",
	},
	{ id: "value", header: t("colValue"), width: "w-20", align: "right" },
];
const taskColumns = (t: Translate): SimpleTableColumn[] => [
	{ id: "done", srLabel: t("colDone"), width: "w-8" },
	{ id: "task", header: t("colTask") },
	{ id: "overdue", header: t("colOverdue"), width: "w-24", align: "right" },
];
const activityColumns = (t: Translate): SimpleTableColumn[] => [
	{ id: "activity", header: t("colActivity") },
	{
		id: "company",
		header: t("colCompany"),
		width: "w-44",
		className: "hidden md:table-cell",
	},
	{
		id: "deal",
		header: t("colDeal"),
		width: "w-48",
		className: "hidden lg:table-cell",
	},
	{
		id: "who",
		header: t("colWho"),
		width: "w-32",
		className: "hidden md:table-cell",
	},
	{ id: "when", header: t("colWhen"), width: "w-20", align: "right" },
];

export function DashboardSummary() {
	const t = useTranslations("crmDashboard");
	const tActivity = useTranslations(ACTIVITY_LABEL_NAMESPACE);
	const trpc = useTRPC();
	const cache = useCrmCache();
	const openRecord = useOpenRecord();
	const workspaceUrl = useWorkspaceUrl();

	const [scope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	const summaryQuery = useQuery({
		...trpc.dashboard.summary.queryOptions({ scope }),
		placeholderData: (previous) => previous,
	});

	const complete = useMutation(
		trpc.activities.complete.mutationOptions({
			onSuccess: () => cache.activity(),
			onError: (error) => toast.error(error.message),
		}),
	);

	const summary = summaryQuery.data;

	if (!summary) {
		return (
			<div className="flex flex-1 justify-center py-12">
				<Spinner />
			</div>
		);
	}

	const { biggestOpen, overdueTasks, recentActivity } = summary;

	const mine = scope === "me";
	const largestOpenCents = biggestOpen[0]?.baseAmountCents ?? 0;

	return (
		<div className="flex flex-col gap-6">
			<SalesDashboard summary={summary} />

			<div className="grid gap-6 @3xl/page-content:grid-cols-2">
				<SoftPanel flush className="min-w-0">
					<Card className="min-w-0">
					<CardHeader className="border-border border-b px-5 py-4 sm:px-6">
						<CardTitle>{t("inProgressTitle")}</CardTitle>
						<CardDescription>
							{t("inProgressDescription")}
						</CardDescription>
						<CardAction>
							<Button asChild variant="contrast" size="sm">
								<Link href={workspaceUrl("/deals")}>{t("openDeals")}</Link>
							</Button>
						</CardAction>
					</CardHeader>
					<CardPanel className="h-auto rounded-none border-0">
						{biggestOpen.length === 0 ? (
							<CardPanelEmpty>
									{t("inProgressEmpty")}
							</CardPanelEmpty>
						) : (
							<SimpleTable
								variant="panel"
								surface="page"
								columns={openColumns(t)}
							>
								{biggestOpen.map((deal) => (
									<SimpleTableRow
										key={deal.id}
										clickable
										onClick={() => openRecord({ kind: "deal", id: deal.id })}
									>
										<TableCell className={CELL}>
											<DealCell
												name={deal.name}
												company={deal.company}
												meta={<LocalRelativeTime date={deal.stageChangedAt} />}
											/>
										</TableCell>
										<TableCell className={`${CELL} hidden lg:table-cell`}>
											<DealStageIndicator stage={deal.stage} />
										</TableCell>
										<TableCell className={`${CELL} hidden sm:table-cell`}>
											<ValueMeter
												share={
													largestOpenCents > 0
														? ((deal.baseAmountCents ?? 0) / largestOpenCents) *
															100
														: 0
												}
												color={dealStageColor(deal.stage)}
											/>
										</TableCell>
										<TableCell className={`${CELL} text-right tabular-nums`}>
											{deal.amountCents === null ? (
												<EmptyCellValue />
											) : (
												formatMoneyCompact(deal.amountCents, deal.currency)
											)}
										</TableCell>
									</SimpleTableRow>
								))}
							</SimpleTable>
						)}
					</CardPanel>
				</Card>
				</SoftPanel>

				<SoftPanel flush className="min-w-0">
					<Card className="min-w-0">
					<CardHeader className="border-border border-b px-5 py-4 sm:px-6">
						<CardTitle>{t("overdueTitle")}</CardTitle>
						<CardDescription>
							{overdueTasks.length === 0
								? t("overdueNone")
								: t("overdueCount", { count: overdueTasks.length })}
						</CardDescription>
					</CardHeader>
					<CardPanel className="h-auto rounded-none border-0">
						{overdueTasks.length === 0 ? (
							<CardPanelEmpty>{t("overdueEmpty")}</CardPanelEmpty>
						) : (
							<SimpleTable
								variant="panel"
								surface="page"
								columns={taskColumns(t)}
							>
								{overdueTasks.map((task) => (
									<SimpleTableRow key={task.id}>
										<TableCell className={CELL}>
											<Checkbox
												checked={false}
												disabled={complete.isPending}
												aria-label={t("markDone")}
												onCheckedChange={() =>
													complete.mutate({ id: task.id, completed: true })
												}
											/>
										</TableCell>
										<TableCell className={CELL}>
											<span className="flex min-w-0 flex-col">
												<span className="truncate">{task.subject}</span>
												<span className="flex min-w-0 text-muted-foreground">
													{task.deal ? (
														<RecordLink kind="deal" id={task.deal.id}>
															{task.deal.name}
														</RecordLink>
													) : task.company ? (
														<RecordLink kind="company" id={task.company.id}>
															{task.company.name}
														</RecordLink>
													) : null}
												</span>
											</span>
										</TableCell>
										<TableCell className={`${CELL} text-right`}>
											<StatusIndicator
												tone="error"
												label={
													task.dueAt ? (
														<LocalRelativeTime date={task.dueAt} />
													) : (
														t("noDueDate")
													)
												}
											/>
										</TableCell>
									</SimpleTableRow>
								))}
							</SimpleTable>
						)}
					</CardPanel>
				</Card>
				</SoftPanel>
			</div>

			<SoftPanel flush className="min-w-0">
			<Card className="min-w-0">
				<CardHeader className="border-border border-b px-5 py-4 sm:px-6">
					<CardTitle>
						{mine ? t("recentMine") : t("recentAll")}
					</CardTitle>
					<CardDescription>
						{mine
							? t("recentMineDescription")
							: t("recentAllDescription")}
					</CardDescription>
					<CardAction>
						<Button asChild variant="contrast" size="sm">
							<Link href={workspaceUrl("/companies")}>{t("allCompanies")}</Link>
						</Button>
					</CardAction>
				</CardHeader>
				{recentActivity.length === 0 ? (
					<CardTableEmpty>{t("recentEmpty")}</CardTableEmpty>
				) : (
					<SimpleTable columns={activityColumns(t)}>
						{recentActivity.map((entry) => (
							<SimpleTableRow key={entry.id}>
								<TableCell className={CELL}>
									<span className="truncate">
										{entry.subject ?? tActivity(entry.type)}
									</span>
								</TableCell>
								<TableCell className={`${CELL} hidden md:table-cell`}>
									{entry.company ? (
										<RecordLink kind="company" id={entry.company.id}>
											{entry.company.name}
										</RecordLink>
									) : (
										<EmptyCellValue />
									)}
								</TableCell>
								<TableCell className={`${CELL} hidden lg:table-cell`}>
									{entry.deal ? (
										<RecordLink kind="deal" id={entry.deal.id}>
											{entry.deal.name}
										</RecordLink>
									) : (
										<EmptyCellValue />
									)}
								</TableCell>
								<TableCell
									className={`${CELL} hidden truncate text-muted-foreground md:table-cell`}
								>
									{entry.createdBy.name}
								</TableCell>
								<TableCell
									className={`${CELL} text-right text-muted-foreground`}
								>
									<LocalRelativeTime date={entry.createdAt} />
								</TableCell>
							</SimpleTableRow>
						))}
					</SimpleTable>
				)}
			</Card>
			</SoftPanel>
		</div>
	);
}

function DealCell({
	name,
	company,
	meta,
}: {
	name: string;
	company: {
		name: string;
		iconUrl: string | null;
		iconDarkUrl: string | null;
		iconTone: string | null;
	};
	meta?: ReactNode;
}) {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<EntityLogo
				src={company.iconUrl}
				darkSrc={company.iconDarkUrl}
				tone={company.iconTone as EntityLogoTone | null | undefined}
				name={company.name}
				size="sm"
			/>
			<span className="flex min-w-0 flex-col">
				<span className="truncate font-medium">{name}</span>
				<span className="truncate text-muted-foreground">
					{meta ? (
						<>
							{company.name} · {meta}
						</>
					) : (
						company.name
					)}
				</span>
			</span>
		</span>
	);
}

function ValueMeter({ share, color }: { share: number; color: string }) {
	return (
		<span
			className="bloom-low flex h-1.5 w-full overflow-hidden bg-muted"
			style={{ "--bloom-color": color } as CSSProperties}
		>
			<span
				className="h-full w-(--share)"
				style={
					{
						backgroundColor: color,
						"--share": `${Math.round(Math.max(Math.min(share, 100), 0))}%`,
					} as CSSProperties
				}
			/>
		</span>
	);
}
