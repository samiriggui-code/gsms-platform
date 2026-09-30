import { Injectable } from "@nestjs/common";

export interface CatalogModel {
	id: string;
	name: string;
	provider: string;
	contextWindowTokens: number;
	pricing: { input: number; output: number } | null;
}

/**
 * The GLM lineup this install serves directly on Z.ai — no Vercel AI
 * Gateway. Ids are the ones Z.ai's `/models` endpoint actually serves;
 * context windows follow Z.ai's published specs where stated (5.2/5.3 = 1M,
 * 4.6/4.7 = 200K, 4.5 = 128K) and stay conservative where not, because an
 * understated window only compacts early while an overstated one fails
 * requests. Pricing is deliberately omitted: it drifts, and the dropdown
 * falls back to showing the context window.
 */
const GLM_CATALOG: CatalogModel[] = [
	{
		id: "zai/glm-5.3-flash",
		name: "GLM-5.3 Flash",
		provider: "zai",
		contextWindowTokens: 1_000_000,
		pricing: null,
	},
	{
		id: "zai/glm-5.3",
		name: "GLM-5.3",
		provider: "zai",
		contextWindowTokens: 1_000_000,
		pricing: null,
	},
	{
		id: "zai/glm-5.2",
		name: "GLM-5.2",
		provider: "zai",
		contextWindowTokens: 1_000_000,
		pricing: null,
	},
	{
		id: "zai/glm-5.1",
		name: "GLM-5.1",
		provider: "zai",
		contextWindowTokens: 200_000,
		pricing: null,
	},
	{
		id: "zai/glm-5-turbo",
		name: "GLM-5 Turbo",
		provider: "zai",
		contextWindowTokens: 200_000,
		pricing: null,
	},
	{
		id: "zai/glm-5",
		name: "GLM-5",
		provider: "zai",
		contextWindowTokens: 200_000,
		pricing: null,
	},
	{
		id: "zai/glm-4.7",
		name: "GLM-4.7",
		provider: "zai",
		contextWindowTokens: 200_000,
		pricing: null,
	},
	{
		id: "zai/glm-4.6",
		name: "GLM-4.6",
		provider: "zai",
		contextWindowTokens: 200_000,
		pricing: null,
	},
	{
		id: "zai/glm-4.5-air",
		name: "GLM-4.5 Air",
		provider: "zai",
		contextWindowTokens: 128_000,
		pricing: null,
	},
	{
		id: "zai/glm-4.5",
		name: "GLM-4.5",
		provider: "zai",
		contextWindowTokens: 128_000,
		pricing: null,
	},
];

@Injectable()
export class ModelCatalogService {
	async models(): Promise<CatalogModel[] | null> {
		return GLM_CATALOG;
	}

	async find(id: string): Promise<CatalogModel | null> {
		return GLM_CATALOG.find((model) => model.id === id) ?? null;
	}
}
