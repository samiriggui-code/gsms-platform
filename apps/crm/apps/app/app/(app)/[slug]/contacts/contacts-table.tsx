"use client";

import Archive from "@carbon/icons-react/es/Archive";
import { Button } from "@crm/ui/components/button";
import {
	DataTable,
	type DataTableColumn,
	type DataTableFacet,
} from "@crm/ui/components/data-table";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { PersonAvatar } from "@crm/ui/components/person-avatar";
import { useSearchInput } from "@crm/ui/hooks/use-search-input";
import { useTableSelection } from "@crm/ui/hooks/use-table-selection";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CompanyCell } from "@/components/crm/company-cell";
import { contactName } from "@/components/crm/contact-name";
import { useFieldColumns } from "@/components/crm/fields/field-columns";
import { useFieldFacets } from "@/components/crm/fields/field-facets";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { ListSearch } from "@/components/data-table/list-search";
import { SavedViewsMenu } from "@/components/data-table/saved-views-menu";
import { useTableQuery } from "@/components/data-table/use-table-query";
import { EntityListShell } from "@/components/desk-ui/entity-list-shell";
import { LocalRelativeTime } from "@/components/local-date-time";
import {
	ACTIVITY_FACET_OPTIONS,
	ACTIVITY_RECENCY_NAMESPACE,
} from "@/lib/activity-recency";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { ContactsBulkActions } from "./contacts-bulk-actions";
import { contactsSearchParams } from "./contacts-search-params";

type ContactRow = RouterOutputs["contacts"]["list"]["rows"][number];

type Translate = ReturnType<typeof useTranslations>;

const columnsFor = (tt: Translate): DataTableColumn<ContactRow>[] => [
	{
		id: "name",
		header: tt("name"),
		sortable: true,
		hideable: false,
		width: "w-[22%]",
		cell: (row) => (
			<span className="flex min-w-0 items-center gap-2">
				<PersonAvatar
					src={row.imageUrl}
					name={contactName(row)}
					email={row.email}
					size="sm"
				/>
				<span className="truncate font-medium">{contactName(row)}</span>
			</span>
		),
	},
	{
		id: "title",
		header: tt("title"),
		sortable: true,
		width: "w-[20%]",
		hideBelow: "lg",
		cell: (row) =>
			row.title ? (
				<span className="truncate">{row.title}</span>
			) : (
				<EmptyCellValue />
			),
	},
	{
		id: "email",
		header: tt("email"),
		sortable: true,
		width: "w-[24%]",
		hideBelow: "md",
		cell: (row) =>
			row.email ? (
				<span className="truncate text-muted-foreground">{row.email}</span>
			) : (
				<EmptyCellValue />
			),
	},
	{
		id: "company",
		header: tt("company"),
		sortable: true,
		width: "w-[18%]",
		cell: (row) => <CompanyCell company={row.company} />,
	},
	{
		id: "owner",
		header: tt("owner"),
		sortable: true,
		width: "w-[16%]",
		hideBelow: "md",
		cell: (row) => <OwnerCell owner={row.owner} />,
	},
	{
		id: "createdAt",
		header: tt("created"),
		label: tt("createdDate"),
		sortable: true,
		align: "right",
		width: "w-[10%]",
		defaultHidden: true,
		cell: (row) => (
			<span className="text-muted-foreground">
				<LocalRelativeTime date={row.createdAt} />
			</span>
		),
	},
	{
		id: "lastActivity",
		header: tt("lastActivity"),
		sortable: true,
		align: "right",
		width: "w-[12%]",
		hideBelow: "sm",
		cell: (row) => (
			<span className="text-muted-foreground">
				{row.lastActivityAt ? (
					<LocalRelativeTime date={row.lastActivityAt} />
				) : (
					<EmptyCellValue />
				)}
			</span>
		),
	},
];

const archivedColumn = (tt: Translate): DataTableColumn<ContactRow> => ({
	id: "archivedAt",
	header: tt("archived"),
	label: tt("archivedDate"),
	sortable: true,
	align: "right",
	width: "w-[12%]",
	cell: (row) => (
		<span className="text-muted-foreground">
			{row.archivedAt ? (
				<LocalRelativeTime date={row.archivedAt} />
			) : (
				<EmptyCellValue />
			)}
		</span>
	),
});

export function ContactsTable() {
	const t = useTranslations("contacts");
	const tt = useTranslations("crmTables");
	const tRecency = useTranslations(ACTIVITY_RECENCY_NAMESPACE);
	const openRecord = useOpenRecord();
	const trpc = useTRPC();
	const prefetchRecord = usePrefetchRecord();
	const table = useTableQuery(contactsSearchParams);
	const { query, input, setArchived } = table;

	const contacts = useQuery({
		...trpc.contacts.list.queryOptions(input),
		placeholderData: (previous) => previous,
	});
	const users = useQuery(trpc.users.list.queryOptions());

	const [companyQuery, setCompanyQuery] = useState("");
	const [companyText, setCompanyText] = useSearchInput(
		companyQuery,
		setCompanyQuery,
	);
	const companies = useQuery({
		...trpc.companies.options.queryOptions({ q: companyQuery }),
		placeholderData: (previous) => previous,
	});

	const rows = contacts.data?.rows ?? [];
	const total = contacts.data?.total ?? 0;
	const selection = useTableSelection(
		useMemo(() => rows.map((row) => row.id), [rows]),
	);
	const settledIds = useMemo(() => {
		const matching = new Set(
			rows
				.filter((row) => Boolean(row.archivedAt) === input.archived)
				.map((row) => row.id),
		);
		return selection.ids.filter((id) => matching.has(id));
	}, [rows, input.archived, selection.ids]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearing on archived-mode change is the entire purpose of this effect.
	useEffect(() => {
		selection.clear();
	}, [input.archived]);

	const toggleArchived = (next: boolean) => {
		selection.clear();
		if (!next && query.sort === "archivedAt") query.setSort("");
		setArchived(next);
	};

	const facetCounts = contacts.data?.facetCounts;
	const fieldFacets = useFieldFacets("CONTACT", facetCounts);

	const facets: DataTableFacet[] = [
		{
			id: "owner",
			label: tt("owner"),
			options: [
				{ value: "unassigned", label: tt("unassigned") },
				...(users.data ?? []).map((user) => ({
					value: user.id,
					label: user.name,
				})),
			].filter((option) => (facetCounts?.owner?.[option.value] ?? 0) > 0),
		},
		{
			id: "company",
			label: tt("company"),
			searchable: true,
			search: companyText,
			onSearchChange: setCompanyText,
			stale: companies.isFetching || companyText.trim() !== companyQuery.trim(),
			empty: companies.isFetching ? tt("searching") : tt("noCompanyMatches"),
			options: [
				...(companyQuery.trim()
					? []
					: [{ value: "none", label: tt("noCompany") }]),
				...(companies.data ?? []).map((company) => ({
					value: company.id,
					label: company.name,
				})),
			].filter((option) => (facetCounts?.company?.[option.value] ?? 0) > 0),
		},
		{
			id: "title",
			label: tt("title"),
			options: Object.keys(facetCounts?.title ?? {})
				.sort()
				.map((value) => ({ value, label: value })),
		},
		{
			id: "seniority",
			label: tt("seniority"),
			options: Object.keys(facetCounts?.seniority ?? {})
				.sort()
				.map((value) => ({ value, label: value })),
		},
		{
			id: "persona",
			label: tt("persona"),
			options: Object.keys(facetCounts?.persona ?? {})
				.sort()
				.map((value) => ({ value, label: value })),
		},
		{
			id: "activity",
			label: tt("activity"),
			options: ACTIVITY_FACET_OPTIONS.filter(
				(option) => (facetCounts?.activity?.[option.value] ?? 0) > 0,
			).map((option) => ({
				value: option.value,
				label: tRecency(option.labelKey),
			})),
		},
		...fieldFacets,
	];

	const fieldColumns = useFieldColumns<ContactRow>("CONTACT");
	const columns = useMemo(
		() =>
			input.archived
				? [...columnsFor(tt), archivedColumn(tt), ...fieldColumns]
				: [...columnsFor(tt), ...fieldColumns],
		[fieldColumns, input.archived, tt],
	);

	return (
		<EntityListShell
			eyebrow={t("pulseEyebrow")}
			headline={t("pulseHeadline", { count: total.toLocaleString("fr-FR") })}
			subhead={input.archived ? t("pulseSubheadArchived") : t("pulseSubhead")}
			body={t("pulseBody")}
			panelTitle={t("panelTitle")}
			panelRows={[
				{ label: t("shown"), value: rows.length },
				{ label: t("total"), value: total },
				{
					label: t("archives"),
					value: input.archived ? t("archivesYes") : t("archivesNo"),
				},
			]}
			stats={[
				{
					label: t("statContacts"),
					value: String(total),
					helper: t("statFiltered"),
				},
				{
					label: t("statPage"),
					value: String(rows.length),
					helper: t("statRows"),
				},
				{
					label: t("statMode"),
					value: input.archived ? t("modeArchive") : t("modeActive"),
					helper: t("modeView"),
				},
			]}
		>
			<DataTable
				query={query}
				search={<ListSearch placeholder={t("search")} />}
				actions={
					<>
						<SavedViewsMenu entity="CONTACT" table={table} />
						<Button
							variant={input.archived ? "contrast" : "outline"}
							size="sm"
							className="justify-start sm:justify-center"
							onClick={() => toggleArchived(!input.archived)}
						>
							<Archive data-icon="inline-start" />
							{t("archived")}
						</Button>
					</>
				}
				columns={columns}
				rows={rows}
				total={total}
				facetCounts={facetCounts}
				facets={facets}
				selection={{
					state: selection,
					actions: (
						<ContactsBulkActions
							ids={settledIds}
							onDone={selection.clear}
							archived={input.archived}
						/>
					),
					rowLabel: (row) => contactName(row),
				}}
				getRowId={(row) => row.id}
				loading={contacts.isFetching}
				onRowHover={(row) => prefetchRecord({ kind: "contact", id: row.id })}
				onRowClick={(row) => openRecord({ kind: "contact", id: row.id })}
				empty={input.archived ? t("emptyArchived") : t("empty")}
			/>
		</EntityListShell>
	);
}
