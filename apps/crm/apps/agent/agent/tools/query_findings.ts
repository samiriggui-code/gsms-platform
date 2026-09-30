import { defineTool } from "eve/tools";
import { z } from "zod";
import { queryFindings } from "../lib/findings-client";

export default defineTool({
	description:
		"Query security / compliance findings across Grace (physical audit + module-cyber ISO/SOC2) and QAtrial (CAPA). Use when a rep asks about open non-conformities, cyber checklist status, or Trust Center posture. Requires GRACE_API_URL / QATRIAL_API_URL on the agent.",
	inputSchema: z.object({
		sources: z
			.array(z.enum(["grace", "qatrial", "module-cyber", "tenderai"]))
			.optional()
			.describe("Narrow producers. Default: grace + module-cyber + qatrial."),
		status: z
			.enum([
				"conforme",
				"non_conforme",
				"en_cours",
				"non_applicable",
				"a_verifier",
			])
			.optional(),
		category: z
			.enum([
				"acces_physique",
				"incendie_prevention",
				"habilitation_agent",
				"materiel_securite",
				"cyber",
				"piece_ao",
				"qualite_capa",
				"administratif",
			])
			.optional(),
		clientId: z.string().optional().describe("Filter by circuit client_id."),
		limit: z.number().int().min(1).max(500).default(100),
	}),
	async execute(input) {
		const result = await queryFindings({
			sources: input.sources,
			status: input.status,
			category: input.category,
			clientId: input.clientId,
			limit: input.limit,
			includeCyber: true,
		});

		const open = result.findings.filter(
			(f) => f.status === "non_conforme" || f.status === "en_cours" || f.status === "a_verifier",
		);

		return {
			generatedAt: result.generatedAt,
			configured: result.configured,
			count: result.count,
			open_count: open.length,
			errors: result.errors.length ? result.errors : undefined,
			findings: result.findings.map((f) => ({
				id: f.id,
				source: f.source,
				status: f.status,
				category: f.category,
				control_ref: f.control_ref,
				title: f.title,
				client_id: f.client_id,
				severity: f.severity,
			})),
			note:
				!result.configured.grace && !result.configured.qatrial
					? "No findings backends configured. Set GRACE_API_URL (and optionally QATRIAL_API_URL) plus bearer tokens on the Eve agent process."
					: result.errors.length
						? "Some backends failed — see errors. Report what you have; do not invent findings."
						: result.count === 0
							? "No findings matched. That is a valid answer."
							: undefined,
		};
	},
});
