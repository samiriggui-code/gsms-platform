import {
	MAX_ARCHIVE_RETENTION_DAYS,
	MIN_ARCHIVE_RETENTION_DAYS,
} from "@crm/db/settings";
import { z } from "zod";

export const catalogModelOutput = z.object({
	id: z.string(),
	name: z.string(),
	provider: z.string(),
	contextWindowTokens: z.number(),
	pricing: z.object({ input: z.number(), output: z.number() }).nullable(),
});

export type CatalogModel = z.infer<typeof catalogModelOutput>;

export const agentModelOutput = z.object({
	selectedId: z.string().nullable(),
	effectiveId: z.string(),
	defaultId: z.string(),
	effective: catalogModelOutput.nullable(),
	updatedAt: z.string().nullable(),
});

export type AgentModelSettings = z.infer<typeof agentModelOutput>;

export const modelCatalogOutput = z.object({
	models: z.array(catalogModelOutput),
	available: z.boolean(),
});

export type ModelCatalogResult = z.infer<typeof modelCatalogOutput>;

export const researchKeyOutput = z.object({
	configured: z.boolean(),
	hint: z.string().nullable(),
});

export type ResearchKeySettings = z.infer<typeof researchKeyOutput>;

export const archiveRetentionOutput = z.object({
	days: z.number(),
});

export type ArchiveRetentionSettings = z.infer<typeof archiveRetentionOutput>;

export const setAgentModelInput = z.object({
	modelId: z.string().trim().min(1).max(200).nullable(),
});

export type SetAgentModelInput = z.infer<typeof setAgentModelInput>;

export const setResearchKeyInput = z.object({
	apiKey: z
		.string()
		.trim()
		.min(
			8,
			"Cela ne ressemble pas à une clé API Context — elle est trop courte.",
		)
		.max(
			500,
			"Cela ne ressemble pas à une clé API Context — elle est trop longue.",
		)
		.refine(
			(value) => !/\s/.test(value),
			"Une clé API ne contient pas d’espaces. Collez la clé complète, seule.",
		),
});

export type SetResearchKeyInput = z.infer<typeof setResearchKeyInput>;

export const setArchiveRetentionDaysInput = z.object({
	days: z
		.number()
		.int()
		.min(
			MIN_ARCHIVE_RETENTION_DAYS,
			`La durée de conservation doit être d’au moins ${MIN_ARCHIVE_RETENTION_DAYS} jour.`,
		)
		.max(
			MAX_ARCHIVE_RETENTION_DAYS,
			`La durée de conservation ne peut pas dépasser ${MAX_ARCHIVE_RETENTION_DAYS} jours.`,
		),
});

export type SetArchiveRetentionDaysInput = z.infer<
	typeof setArchiveRetentionDaysInput
>;
