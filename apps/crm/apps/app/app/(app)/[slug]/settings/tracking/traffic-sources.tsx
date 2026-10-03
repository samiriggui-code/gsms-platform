"use client";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { CardTableEmpty } from "@crm/ui/components/card-table";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";

const CELL = "px-3 py-2.5 align-middle";

export function TrafficSources() {
	const t = useTranslations("settingsTracking");
	const locale = useLocale();
	const trpc = useTRPC();
	const sources = useQuery(trpc.tracking.sources.queryOptions());

	if (!sources.data) return null;

	const columns: SimpleTableColumn[] = [
		{ id: "source", header: t("sourceColumn") },
		{ id: "medium", header: t("mediumColumn"), width: "w-32" },
		{ id: "views", header: t("viewsColumn"), width: "w-28", align: "right" },
		{
			id: "contacts",
			header: t("contactsColumn"),
			width: "w-24",
			align: "right",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("sourcesTitle")}</CardTitle>
				<CardDescription>{t("sourcesDescription")}</CardDescription>
			</CardHeader>

			{sources.data.length === 0 ? (
				<CardTableEmpty>{t("sourcesEmpty")}</CardTableEmpty>
			) : (
				<SimpleTable columns={columns}>
					{sources.data.map((row) => (
						<SimpleTableRow key={`${row.source}-${row.medium ?? ""}`}>
							<TableCell className={CELL}>{row.source}</TableCell>
							<TableCell className={`${CELL} text-muted-foreground`}>
								{row.medium ?? "—"}
							</TableCell>
							<TableCell className={`${CELL} text-right tabular-nums`}>
								{row.views.toLocaleString(locale)}
							</TableCell>
							<TableCell className={`${CELL} text-right tabular-nums`}>
								{row.contacts.toLocaleString(locale)}
							</TableCell>
						</SimpleTableRow>
					))}
				</SimpleTable>
			)}
		</Card>
	);
}
