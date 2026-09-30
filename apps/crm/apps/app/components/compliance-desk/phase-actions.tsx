"use client";

import Play from "@carbon/icons-react/es/Play";
import MachineLearning from "@carbon/icons-react/es/MachineLearning";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { AccentActionPanel } from "@/components/desk-ui/soft-panel";
import { cn } from "@crm/ui/lib/utils";

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
	return (
		<AccentActionPanel
			className={cn(className)}
			eyebrow="Phases cabinet"
			title="Lancer les moteurs"
			description="Ingest = DocuLens (OCR, classif, embeddings). Digest = relations GSMS (timeline, prescriptions…). Validation humaine entre les deux."
		>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					disabled={ingestRunning}
					onClick={onIngest}
					className="gap-2"
				>
					<Icon icon={Play} className="size-4" />
					{ingestRunning ? "Ingest en cours…" : "Lancer Ingest"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={digestRunning}
					onClick={onDigest}
					className="gap-2"
				>
					<Icon icon={MachineLearning} className="size-4" />
					{digestRunning ? "Digest en cours…" : "Lancer Digest"}
				</Button>
			</div>
		</AccentActionPanel>
	);
}
