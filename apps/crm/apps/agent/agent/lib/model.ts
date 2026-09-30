import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { db } from "@crm/db";
import { DEFAULT_AGENT_MODEL, readAgentModel } from "@crm/db/settings";
import type { LanguageModel } from "ai";

export interface ModelSelection {
	model: string | LanguageModel;
	modelContextWindowTokens: number;
}

const DEFAULT_ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4";

/** Gateway-era ids that the direct Z.ai API never served. */
const LEGACY_ALIASES: Record<string, string> = {
	"zai/glm-5.2-fast": "glm-5.3-flash",
};

type DirectProvider = ReturnType<typeof createOpenAICompatible>;

let cached: DirectProvider | null | undefined;

/**
 * The direct Z.ai (GLM) provider, used instead of the Vercel AI Gateway for
 * every session once ZAI_API_KEY is set. The default base URL is the Coding
 * Plan endpoint; a pay-as-you-go key needs ZAI_BASE_URL pointed at
 * https://api.z.ai/api/paas/v4 instead.
 */
function directProvider(): DirectProvider | null {
	cached ??= process.env.ZAI_API_KEY
		? createOpenAICompatible({
				name: "zai",
				baseURL: (process.env.ZAI_BASE_URL ?? DEFAULT_ZAI_BASE_URL).replace(
					/\/+$/,
					"",
				),
				apiKey: process.env.ZAI_API_KEY,
			})
		: null;
	return cached;
}

/**
 * Resolve a stored model id against the direct provider. Only `zai/` ids
 * route to Z.ai; anything else stays a gateway id untouched. Legacy ids are
 * aliased to the model that actually replaced them.
 */
export function resolveModel(id: string): string | LanguageModel {
	const provider = directProvider();
	const aliased = LEGACY_ALIASES[id] ?? id;
	if (!provider || !aliased.startsWith("zai/")) return id;
	return provider.chatModel(aliased.slice("zai/".length));
}

/** The model eve falls back to when no model has ever been chosen. */
export function defaultModel(): string | LanguageModel {
	return resolveModel(DEFAULT_AGENT_MODEL.id);
}

export async function selectedModel(): Promise<ModelSelection | null> {
	try {
		const setting = await readAgentModel(db);

		if (setting.isDefault) return null;

		return {
			model: resolveModel(setting.id),
			modelContextWindowTokens: setting.contextWindowTokens,
		};
	} catch (error) {
		console.error(
			`[agent] could not read the configured model, falling back: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return null;
	}
}
