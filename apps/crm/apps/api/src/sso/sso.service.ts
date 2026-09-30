import {
	canConfigureSso,
	isGoogleConfigured,
	isMicrosoftConfigured,
	ssoCallbackBase,
	ssoCallbackURL,
	ssoProviderName,
	WORKSPACE_ID,
	workspaceRoleOf,
} from "@crm/auth";
import type { Db, Prisma } from "@crm/db";
import {
	ForbiddenException,
	Injectable,
	NotImplementedException,
} from "@nestjs/common";
import { z } from "zod";
import { InjectDatabase } from "../database/database.constants";
import {
	type ListResult,
	type OrderByColumns,
	paginate,
	resolveOrderBy,
} from "../trpc/list-input";
import type {
	DeleteSsoProviderInput,
	RegisterSsoProviderInput,
	SignInOptions,
	SsoProvider,
	SsoProviderListInput,
	SsoSettings,
} from "./sso.contracts";

const PROVIDER_SELECT = {
	providerId: true,
	issuer: true,
	domain: true,
	oidcConfig: true,
	samlConfig: true,
} satisfies Prisma.SsoProviderSelect;

type ProviderRow = Prisma.SsoProviderGetPayload<{
	select: typeof PROVIDER_SELECT;
}>;

const SORTABLE: OrderByColumns<Prisma.SsoProviderOrderByWithRelationInput> = {
	providerId: (dir) => ({ providerId: dir }),
	domain: (dir) => ({ domain: dir }),
	issuer: (dir) => ({ issuer: dir }),
};

function splitDomains(value: string): string[] {
	return value
		.split(",")
		.map((part) =>
			part
				.trim()
				.replace(/^https?:\/\//i, "")
				.replace(/\/.*$/, ""),
		)
		.map((part) => part.toLowerCase())
		.filter(Boolean);
}

const oidcConfig = z
	.object({ clientId: z.string().catch("") })
	.catch({ clientId: "" });

type OidcConfig = z.infer<typeof oidcConfig>;

function lastFour(clientId: string): string | null {
	return clientId.length >= 4 ? clientId.slice(-4) : null;
}

function readOidcConfig(value: string | null): OidcConfig | null {
	if (!value) return null;

	try {
		return oidcConfig.parse(JSON.parse(value));
	} catch {
		return null;
	}
}

function toProvider(row: ProviderRow): SsoProvider {
	const oidc = readOidcConfig(row.oidcConfig);

	return {
		providerId: row.providerId,
		name: ssoProviderName(row.providerId),
		type: row.samlConfig ? "saml" : "oidc",
		issuer: row.issuer,
		domains: splitDomains(row.domain),
		clientIdLastFour: oidc ? lastFour(oidc.clientId) : null,
		callbackURL: ssoCallbackURL(row.providerId),
	};
}

@Injectable()
export class SsoService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async signInOptions(): Promise<SignInOptions> {
		const rows = await this.db.ssoProvider.findMany({
			where: { organizationId: WORKSPACE_ID },
			select: { providerId: true },
			orderBy: { providerId: "asc" },
		});

		return {
			google: isGoogleConfigured(),
			microsoft: isMicrosoftConfigured(),
			providers: rows.map((row) => ({
				providerId: row.providerId,
				name: ssoProviderName(row.providerId),
			})),
		};
	}

	async settings(userId: string): Promise<SsoSettings> {
		return {
			canConfigure: canConfigureSso(await workspaceRoleOf(userId, this.db)),
			callbackBase: ssoCallbackBase(),
		};
	}

	async list(input: SsoProviderListInput): Promise<ListResult<SsoProvider>> {
		const where = this.searchWhere(input.q);
		const { skip, take } = paginate(input);

		const [rows, total] = await Promise.all([
			this.db.ssoProvider.findMany({
				where,
				skip,
				take,
				select: PROVIDER_SELECT,
				orderBy: resolveOrderBy(input, SORTABLE, { providerId: "asc" }),
			}),
			this.db.ssoProvider.count({ where }),
		]);

		return { rows: rows.map(toProvider), total, facetCounts: {} };
	}

	async register(
		userId: string,
		_input: RegisterSsoProviderInput,
	): Promise<SsoProvider> {
		await this.requireConfigurer(userId);

		// The runtime OIDC/SAML login handshake (previously the
		// @better-auth/sso plugin) hasn't been rebuilt on NextAuth yet —
		// this table is config storage only for now.
		throw new NotImplementedException(
			"Signing in with SSO isn't available yet — this is being rebuilt.",
		);
	}

	async remove(
		userId: string,
		_input: DeleteSsoProviderInput,
	): Promise<{ providerId: string }> {
		await this.requireConfigurer(userId);

		throw new NotImplementedException(
			"Signing in with SSO isn't available yet — this is being rebuilt.",
		);
	}

	private searchWhere(q: string): Prisma.SsoProviderWhereInput {
		const term = q.trim();
		const where: Prisma.SsoProviderWhereInput = {
			organizationId: WORKSPACE_ID,
		};

		if (term) {
			where.OR = [
				{ providerId: { contains: term, mode: "insensitive" } },
				{ domain: { contains: term, mode: "insensitive" } },
				{ issuer: { contains: term, mode: "insensitive" } },
			];
		}

		return where;
	}

	private async requireConfigurer(userId: string): Promise<void> {
		if (!canConfigureSso(await workspaceRoleOf(userId, this.db))) {
			throw new ForbiddenException(
				"Only an owner or an admin can change how people sign in.",
			);
		}
	}
}
