/**
 * Demo types for Compliance Desk UI (DocuLens-inspired).
 * Wired to DocuLens API later — no auto-ingest.
 */

export type DeskDocStatus =
	| "received"
	| "waiting"
	| "ingesting"
	| "ready"
	| "needs_review";

export type DeskDocument = {
	id: string;
	filename: string;
	docType: string;
	status: DeskDocStatus;
	uploadedAt: string;
	workspaceLabel: string;
};

export type DeskMetrics = {
	totalDocuments: number;
	classified: number;
	duplicates: number;
	needsReview: number;
	waitingAnalysis: number;
	ingestRunning: boolean;
	digestRunning: boolean;
};
