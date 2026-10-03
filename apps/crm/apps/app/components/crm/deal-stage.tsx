import type { DealStage } from "@crm/db/enums";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { useTranslations } from "next-intl";
import { DEAL_STAGE_NAMESPACE, dealStagePresentation } from "@/lib/deal-stage";

export function DealStageIndicator({
	stage,
	className,
}: {
	stage: DealStage;
	className?: string;
}) {
	const t = useTranslations(DEAL_STAGE_NAMESPACE);
	const { tone } = dealStagePresentation(stage);
	return <StatusIndicator tone={tone} label={t(stage)} className={className} />;
}
