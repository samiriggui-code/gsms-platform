import { DealStage } from "@crm/db/enums";
import type { StatusTone } from "@crm/ui/components/status-indicator";

const ORDER = [
	DealStage.PROSPECT,
	DealStage.QUALIFICATION,
	DealStage.NEEDS_ANALYSIS,
	DealStage.QUOTE_SENT,
	DealStage.NEGOTIATION,
	DealStage.CLOSED_WON,
	DealStage.CLOSED_LOST,
	DealStage.NOT_QUALIFIED,
] as const;

type DealStagePresentation = Record<
	DealStage,
	{ label: string; tone: StatusTone }
>;

const PRESENTATION: DealStagePresentation = {
	PROSPECT: { label: "Prospect", tone: "neutral" },
	QUALIFICATION: { label: "Qualification", tone: "info" },
	NEEDS_ANALYSIS: { label: "Visite / analyse du besoin", tone: "info" },
	QUOTE_SENT: { label: "Devis envoyé", tone: "warning" },
	NEGOTIATION: { label: "Négociation", tone: "warning" },
	CLOSED_WON: { label: "Gagné", tone: "success" },
	CLOSED_LOST: { label: "Perdu", tone: "error" },
	NOT_QUALIFIED: { label: "Sans suite", tone: "neutral" },
};

export const OPEN_STAGES = ORDER.slice(0, 5) as readonly DealStage[];

export const LOSING_STAGES: readonly DealStage[] = [
	DealStage.CLOSED_LOST,
	DealStage.NOT_QUALIFIED,
];

export const DEAL_STAGE_OPTIONS = ORDER.map((value) => ({
	value,
	label: PRESENTATION[value].label,
}));

const OPEN_STAGE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

export function isClosedStage(stage: DealStage): boolean {
	return !OPEN_STAGES.includes(stage);
}

export function dealStageColor(stage: DealStage): string {
	return (
		OPEN_STAGE_COLORS[OPEN_STAGES.indexOf(stage)] ?? "var(--muted-foreground)"
	);
}

export function dealStageLabel(stage: DealStage): string {
	return PRESENTATION[stage].label;
}

export function dealStagePresentation(stage: DealStage) {
	return PRESENTATION[stage];
}
