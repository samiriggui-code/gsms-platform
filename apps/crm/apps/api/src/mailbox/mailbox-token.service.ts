import {
	googleCredentials,
	type MailboxProviderId,
	microsoftCredentials,
	parseScopes,
	type SignInAccount,
} from "@crm/auth";
import { type Db } from "@crm/db";
import { Injectable, Logger } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import {
	GOOGLE_PROVIDER_ID,
	MICROSOFT_PROVIDER_ID,
	PROVIDER_FOR_SOURCE,
	SCOPE_FOR_SOURCE,
	type SyncSource,
} from "./mailbox.constants";

export type TokenFailure =
	| { outcome: "needs-reconnect"; reason: string }
	| { outcome: "not-connected"; reason: string };

export type TokenResult = { outcome: "ok"; accessToken: string } | TokenFailure;

const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// A token expiring inside this window is treated as already-expired, so a
// slow request never lands mid-refresh with a token the provider just rejected.
const REFRESH_SKEW_MS = 60_000;

type RefreshedToken = {
	accessToken: string;
	expiresAt: Date | null;
	refreshToken: string | null;
};

@Injectable()
export class MailboxTokenService {
	private readonly logger = new Logger(MailboxTokenService.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	async grantedScopes(
		userId: string,
		providerId: MailboxProviderId,
	): Promise<Set<string>> {
		const account = await this.db.account.findFirst({
			where: { userId, providerId },
			select: { scope: true },
		});

		return parseScopes(account?.scope);
	}

	async isConnected(userId: string, source: SyncSource): Promise<boolean> {
		const scopes = await this.grantedScopes(
			userId,
			PROVIDER_FOR_SOURCE[source],
		);
		return scopes.has(SCOPE_FOR_SOURCE[source]);
	}

	async signInAccounts(userId: string): Promise<SignInAccount[]> {
		return this.db.account.findMany({
			where: { userId },
			select: { providerId: true, scope: true },
		});
	}

	async hasRefreshToken(
		userId: string,
		providerId: MailboxProviderId,
	): Promise<boolean> {
		const account = await this.db.account.findFirst({
			where: { userId, providerId },
			select: { refreshToken: true },
		});

		return Boolean(account?.refreshToken);
	}

	async accessTokenFor(
		userId: string,
		source: SyncSource,
	): Promise<TokenResult> {
		const providerId = PROVIDER_FOR_SOURCE[source];

		if (!(await this.isConnected(userId, source))) {
			return {
				outcome: "not-connected",
				reason: `The ${source} scope has not been granted.`,
			};
		}

		const account = await this.db.account.findFirst({
			where: { userId, providerId },
			select: { accessToken: true, refreshToken: true, accessTokenExpiresAt: true },
		});

		if (!account?.accessToken) {
			return {
				outcome: "needs-reconnect",
				reason: `${label(providerId)} returned no access token.`,
			};
		}

		const fresh =
			!account.accessTokenExpiresAt ||
			account.accessTokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS;

		if (fresh) return { outcome: "ok", accessToken: account.accessToken };

		if (!account.refreshToken) {
			return {
				outcome: "needs-reconnect",
				reason: `${label(providerId)} access token expired and there is no refresh token.`,
			};
		}

		try {
			const refreshed =
				providerId === GOOGLE_PROVIDER_ID
					? await this.refreshGoogleToken(account.refreshToken)
					: await this.refreshMicrosoftToken(account.refreshToken);

			await this.db.account.updateMany({
				where: { userId, providerId },
				data: {
					accessToken: refreshed.accessToken,
					accessTokenExpiresAt: refreshed.expiresAt,
					...(refreshed.refreshToken ? { refreshToken: refreshed.refreshToken } : {}),
				},
			});

			return { outcome: "ok", accessToken: refreshed.accessToken };
		} catch (error) {
			this.logger.warn({
				message: "Mailbox token refresh failed",
				userId,
				providerId,
				source,
				reason: error instanceof Error ? error.message : String(error),
			});

			return {
				outcome: "needs-reconnect",
				reason: `${label(providerId)} would not refresh the access token.`,
			};
		}
	}

	private async refreshGoogleToken(refreshToken: string): Promise<RefreshedToken> {
		const credentials = googleCredentials();
		if (!credentials) throw new Error("Google is not configured.");

		const response = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				refresh_token: refreshToken,
				grant_type: "refresh_token",
			}),
		});

		const tokens = (await response.json()) as Record<string, unknown>;
		if (!response.ok || typeof tokens.access_token !== "string") {
			throw new Error(typeof tokens.error === "string" ? tokens.error : "refresh_failed");
		}

		return {
			accessToken: tokens.access_token,
			expiresAt:
				typeof tokens.expires_in === "number"
					? new Date(Date.now() + tokens.expires_in * 1000)
					: null,
			// Google only returns a new refresh_token on rare rotations — keep the existing one otherwise.
			refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
		};
	}

	private async refreshMicrosoftToken(refreshToken: string): Promise<RefreshedToken> {
		const credentials = microsoftCredentials();
		if (!credentials) throw new Error("Microsoft is not configured.");

		const response = await fetch(
			`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: credentials.clientId,
					client_secret: credentials.clientSecret,
					refresh_token: refreshToken,
					grant_type: "refresh_token",
				}),
			},
		);

		const tokens = (await response.json()) as Record<string, unknown>;
		if (!response.ok || typeof tokens.access_token !== "string") {
			throw new Error(typeof tokens.error === "string" ? tokens.error : "refresh_failed");
		}

		return {
			accessToken: tokens.access_token,
			expiresAt:
				typeof tokens.expires_in === "number"
					? new Date(Date.now() + tokens.expires_in * 1000)
					: null,
			// Microsoft always rotates the refresh token — the old one stops working.
			refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
		};
	}

	async revoke(
		userId: string,
		providerId: MailboxProviderId,
	): Promise<boolean> {
		if (
			providerId === GOOGLE_PROVIDER_ID &&
			!(await this.revokeWithGoogle(userId))
		) {
			return false;
		}

		const cleared = await this.db.account.updateMany({
			where: { userId, providerId },
			data: {
				accessToken: null,
				refreshToken: null,
				scope: null,
				accessTokenExpiresAt: null,
				refreshTokenExpiresAt: null,
			},
		});

		if (cleared.count === 0) return false;

		this.logger.log({ message: "Mailbox access revoked", userId, providerId });
		return true;
	}

	private async revokeWithGoogle(userId: string): Promise<boolean> {
		const account = await this.db.account.findFirst({
			where: { userId, providerId: GOOGLE_PROVIDER_ID },
			select: { refreshToken: true, accessToken: true },
		});

		const token = account?.refreshToken ?? account?.accessToken;
		if (!token) return true;

		const response = await fetch(GOOGLE_REVOKE_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ token }),
		});

		if (response.ok) return true;

		this.logger.warn({
			message: "Google token revocation failed",
			userId,
			status: response.status,
		});

		return false;
	}
}

function label(providerId: MailboxProviderId): string {
	return providerId === GOOGLE_PROVIDER_ID ? "Google" : "Microsoft";
}
