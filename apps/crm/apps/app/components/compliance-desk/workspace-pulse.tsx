"use client";

import { useTranslations } from "next-intl";
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
	const t = useTranslations("shellCompliance");
	return (
		<DeskPulseBand
			className={className}
			eyebrow={t("pulseEyebrow")}
			headline={t("pulseHeadline", { count: totalDocuments })}
			subhead={
				needsReview > 0
					? t("pulseSubheadReview", { count: needsReview })
					: t("pulseSubheadClear")
			}
			body={t("pulseBody")}
			panelTitle={t("pulsePanelTitle")}
			panelRows={[
				{ label: t("pulseWaiting"), value: waitingAnalysis },
				{
					label: t("pulseClassified"),
					value: t("percent", { value: classifiedPct }),
				},
				{ label: t("pulseNeedsReview"), value: needsReview },
			]}
			stats={[
				{
					label: t("statCoverage"),
					value: t("percent", { value: classifiedPct }),
					helper: t("statCoverageHelper"),
				},
				{
					label: t("statQueue"),
					value: "MAX 2",
					helper: t("statQueueHelper"),
				},
				{
					label: t("statControl"),
					value: t("statControlValue"),
					helper: "Ingest / Digest",
				},
			]}
		/>
	);
}
