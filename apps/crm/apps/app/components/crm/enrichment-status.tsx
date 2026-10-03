import type { EnrichmentStatus } from "@crm/db/enums";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { useTranslations } from "next-intl";
import {
	ENRICHMENT_LABEL_NAMESPACE,
	enrichmentPresentation,
} from "@/lib/enrichment-status";

export function EnrichmentIndicator({
	status,
	queued = false,
	title,
	className,
}: {
	status: EnrichmentStatus;
	queued?: boolean;
	title?: string | null;
	className?: string;
}) {
	const t = useTranslations(ENRICHMENT_LABEL_NAMESPACE);
	const { labelKey, tone, busy } = enrichmentPresentation(status, queued);
	const label = t(labelKey);

	return (
		<StatusIndicator
			tone={tone}
			busy={busy}
			label={label}
			title={title ?? undefined}
			className={className}
		/>
	);
}
