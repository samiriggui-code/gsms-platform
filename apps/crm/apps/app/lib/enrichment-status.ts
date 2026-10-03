import type { EnrichmentStatus } from "@crm/db/enums";
import type { StatusTone } from "@crm/ui/components/status-indicator";

type EnrichmentPresentation = Record<
	EnrichmentStatus,
	{
		label: string;
		labelKey: EnrichmentLabelKey;
		tone: StatusTone;
		busy?: boolean;
	}
>;

export type EnrichmentLabelKey = EnrichmentStatus | "QUEUED";

export const ENRICHMENT_LABEL_NAMESPACE = "shellEnrichmentStatus";

const PRESENTATION: EnrichmentPresentation = {
	PENDING: { label: "Not researched", labelKey: "PENDING", tone: "neutral" },
	RUNNING: {
		label: "Researching",
		labelKey: "RUNNING",
		tone: "info",
		busy: true,
	},
	COMPLETE: { label: "Enriched", labelKey: "COMPLETE", tone: "success" },
	FAILED: { label: "Enrichment failed", labelKey: "FAILED", tone: "error" },
	SKIPPED: { label: "Nothing found", labelKey: "SKIPPED", tone: "neutral" },
};

const QUEUED = {
	label: "Queued",
	labelKey: "QUEUED" as EnrichmentLabelKey,
	tone: "neutral" as StatusTone,
	busy: false,
};

export const ENRICHMENT_POLL_MS = 3_000;

export const ENRICHMENT_IDLE_POLL_MS = 30_000;

export const ENRICHMENT_FACET_OPTIONS = (
	Object.keys(PRESENTATION) as EnrichmentStatus[]
).map((value) => ({
	value,
	label: PRESENTATION[value].label,
	labelKey: PRESENTATION[value].labelKey,
}));

export function enrichmentPresentation(
	status: EnrichmentStatus,
	queued: boolean,
) {
	return status === "PENDING" && queued ? QUEUED : PRESENTATION[status];
}

export function isEnriching(status: EnrichmentStatus, queued = false): boolean {
	return status === "RUNNING" || (status === "PENDING" && queued);
}
