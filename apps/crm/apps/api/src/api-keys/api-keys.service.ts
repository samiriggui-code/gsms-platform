import { API_KEY_PREFIX, DAY_SECONDS, generateApiKey } from "@crm/auth";
import type { Db, Prisma } from "@crm/db";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import {
	type ListResult,
	type OrderByColumns,
	paginate,
	resolveOrderBy,
} from "../trpc/list-input";
import type {
	ApiKeyListInput,
	ApiKeySummary,
	CreateApiKeyInput,
	CreatedApiKey,
	RevokeApiKeyInput,
} from "./api-keys.contracts";

const KEY_SELECT = {
	id: true,
	name: true,
	start: true,
	enabled: true,
	createdAt: true,
	lastRequest: true,
	expiresAt: true,
} satisfies Prisma.ApikeySelect;

type KeyRow = Prisma.ApikeyGetPayload<{ select: typeof KEY_SELECT }>;

const SORTABLE: OrderByColumns<Prisma.ApikeyOrderByWithRelationInput> = {
	name: (dir) => ({ name: dir }),
	createdAt: (dir) => ({ createdAt: dir }),
	lastRequest: (dir) => ({ lastRequest: dir }),
	expiresAt: (dir) => ({ expiresAt: dir }),
};

function toSummary(row: KeyRow): ApiKeySummary {
	return {
		id: row.id,
		name: row.name,
		start: row.start,
		enabled: row.enabled ?? true,
		createdAt: row.createdAt.toISOString(),
		lastRequest: row.lastRequest?.toISOString() ?? null,
		expiresAt: row.expiresAt?.toISOString() ?? null,
	};
}

@Injectable()
export class ApiKeysService {
	private readonly logger = new Logger(ApiKeysService.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(
		userId: string,
		input: ApiKeyListInput,
	): Promise<ListResult<ApiKeySummary>> {
		const where = this.searchWhere(userId, input.q);
		const { skip, take } = paginate(input);

		const [rows, total] = await Promise.all([
			this.db.apikey.findMany({
				where,
				skip,
				take,
				select: KEY_SELECT,
				orderBy: resolveOrderBy(input, SORTABLE, { createdAt: "desc" }),
			}),
			this.db.apikey.count({ where }),
		]);

		return { rows: rows.map(toSummary), total, facetCounts: {} };
	}

	async create(
		userId: string,
		input: CreateApiKeyInput,
	): Promise<CreatedApiKey> {
		const { raw, hash, start } = generateApiKey();
		const expiresAt =
			input.expiresInDays === null
				? null
				: new Date(Date.now() + input.expiresInDays * DAY_SECONDS * 1000);

		const created = await this.db.apikey.create({
			data: {
				name: input.name,
				keyHash: hash,
				start,
				prefix: API_KEY_PREFIX,
				referenceId: userId,
				expiresAt,
			},
			select: KEY_SELECT,
		});

		this.logger.log({
			message: "API key created",
			userId,
			apiKeyId: created.id,
		});

		return { ...toSummary(created), key: raw };
	}

	async revoke(
		userId: string,
		input: RevokeApiKeyInput,
	): Promise<{ id: string }> {
		const { count } = await this.db.apikey.deleteMany({
			where: { id: input.id, referenceId: userId },
		});

		if (count === 0) {
			throw new NotFoundException("No such API key.");
		}

		this.logger.log({
			message: "API key revoked",
			userId,
			apiKeyId: input.id,
		});

		return { id: input.id };
	}

	private searchWhere(userId: string, q: string): Prisma.ApikeyWhereInput {
		const where: Prisma.ApikeyWhereInput = { referenceId: userId };
		const term = q.trim();

		if (term) {
			where.name = { contains: term, mode: "insensitive" };
		}

		return where;
	}
}
