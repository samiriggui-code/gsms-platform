"use client";

import MachineLearning from "@carbon/icons-react/es/MachineLearning";
import Play from "@carbon/icons-react/es/Play";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import { useTranslations } from "next-intl";
import { AccentActionPanel } from "@/components/desk-ui/soft-panel";

type PhaseActionsProps = {
	ingestRunning?: boolean;
	digestRunning?: boolean;
	onIngest?: () => void;
	onDigest?: () => void;
	className?: string;
};

/** Actions pilotées Ingest / Digest — pas d’auto à l’upload. */
export function PhaseActions({
	ingestRunning,
	digestRunning,
	onIngest,
	onDigest,
	className,
}: PhaseActionsProps) {
	const t = useTranslations("shellCompliance");
	return (
		<AccentActionPanel
			className={cn(className)}
			eyebrow={t("phasesEyebrow")}
			title={t("phasesTitle")}
			description={t("phasesBody")}
		>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					disabled={ingestRunning}
					onClick={onIngest}
					className="gap-2"
				>
					<Icon icon={Play} className="size-4" />
					{ingestRunning ? t("ingestRunning") : t("ingestRun")}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={digestRunning}
					onClick={onDigest}
					className="gap-2"
				>
					<Icon icon={MachineLearning} className="size-4" />
					{digestRunning ? t("digestRunning") : t("digestRun")}
				</Button>
			</div>
		</AccentActionPanel>
	);
}
