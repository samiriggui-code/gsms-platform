"use client";

import { DeskPulseBand } from "@/components/desk-ui/desk-pulse-band";

type WorkspacePulseProps = {
	totalDocuments: number;
	needsReview: number;
	classifiedPct: number;
	waitingAnalysis: number;
	className?: string;
};

/**
 * Hero « workspace pulse » — pattern DocuLens IntakePage (MIT, adapté CRM).
 */
export function WorkspacePulse({
	totalDocuments,
	needsReview,
	classifiedPct,
	waitingAnalysis,
	className,
}: WorkspacePulseProps) {
	return (
		<DeskPulseBand
			className={className}
			eyebrow="Compliance Desk"
			headline={`${totalDocuments.toLocaleString("fr-FR")} documents dans le workspace.`}
			subhead={
				needsReview > 0
					? `${needsReview} à examiner avant Digest.`
					: "Rien ne bloque l’équipe."
			}
			body="Upload client ≠ analyse auto. Lancez Ingest puis Digest quand le dossier est prêt."
			panelTitle="État atelier"
			panelRows={[
				{ label: "En attente d’analyse", value: waitingAnalysis },
				{ label: "Classifiés", value: `${classifiedPct} %` },
				{ label: "À examiner", value: needsReview },
			]}
			stats={[
				{
					label: "Couverture classif.",
					value: `${classifiedPct} %`,
					helper: "après Ingest",
				},
				{ label: "File lourde", value: "MAX 2", helper: "jobs simultanés" },
				{ label: "Pilotage", value: "Manuel", helper: "Ingest / Digest" },
			]}
		/>
	);
}
