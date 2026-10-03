import { DealStage } from "./generated/prisma/enums";

export const OPEN_DEAL_STAGES = [
	DealStage.PROSPECT,
	DealStage.QUALIFICATION,
	DealStage.NEEDS_ANALYSIS,
	DealStage.QUOTE_SENT,
	DealStage.NEGOTIATION,
] as const;

export const CLOSED_DEAL_STAGES = [
	DealStage.CLOSED_WON,
	DealStage.CLOSED_LOST,
	DealStage.NOT_QUALIFIED,
] as const;

export const LOSING_DEAL_STAGES = [
	DealStage.CLOSED_LOST,
	DealStage.NOT_QUALIFIED,
] as const;

const CLOSED = new Set<DealStage>(CLOSED_DEAL_STAGES);

export function isClosedStage(stage: DealStage): boolean {
	return CLOSED.has(stage);
}
