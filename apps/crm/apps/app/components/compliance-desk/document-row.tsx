"use client";

import Document from "@carbon/icons-react/es/Document";
import { Badge } from "@crm/ui/components/badge";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import type { DeskDocStatus, DeskDocument } from "./types";

const STATUS_LABEL = {
	received: "statusReceived",
	waiting: "statusWaiting",
	ingesting: "statusIngesting",
	ready: "statusReady",
	needs_review: "statusNeedsReview",
} as const satisfies Record<DeskDocStatus, string>;

const STATUS_VARIANT: Record<
	DeskDocStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	received: "secondary",
	waiting: "outline",
	ingesting: "default",
	ready: "secondary",
	needs_review: "destructive",
};

type DocumentRowProps = {
	document: DeskDocument;
	className?: string;
};

/** Ligne document — pattern DocuLens DocumentRow (MIT, adapté). */
export function DocumentRow({ document, className }: DocumentRowProps) {
	const t = useTranslations("shellCompliance");
	const locale = useLocale();
	return (
		<div
			className={cn(
				"flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:px-6",
				className,
			)}
		>
			<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
				<Icon icon={Document} className="size-4" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{document.filename}</p>
				<p className="mt-0.5 truncate text-muted-foreground text-xs">
					{document.docType} · {document.workspaceLabel} ·{" "}
					{formatShortDate(locale, document.uploadedAt)}
				</p>
			</div>
			<Badge variant={STATUS_VARIANT[document.status]}>
				{t(STATUS_LABEL[document.status])}
			</Badge>
		</div>
	);
}

function formatShortDate(locale: string, iso: string): string {
	try {
		return new Intl.DateTimeFormat(locale, {
			day: "2-digit",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(iso));
	} catch {
		return iso;
	}
}
