import {
	GOOGLE_PROVIDER_ID,
	googleCredentials,
	IDENTITY_SCOPES,
	MICROSOFT_PROVIDER_ID,
	MICROSOFT_SYNC_SCOPES,
	microsoftCredentials,
	SYNC_SCOPES,
} from "@crm/auth";
import { db } from "@crm/db";
import { type NextRequest, NextResponse } from "next/server";
import { decodeConnectState } from "../../oauth-state";

const GRAPH_SCOPE_PREFIX = "https://graph.microsoft.com/";

type ExchangedAccount = {
	accountId: string;
	email: string;
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date | null;
	scope: string;
};

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const { provider } = await params;
	if (provider !== "google" && provider !== "microsoft") {
		return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
	}

	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const providerError = url.searchParams.get("error");
	const state = await decodeConnectState(url.searchParams.get("state"));

	if (!state) {
		return NextResponse.redirect(new URL("/sign-in", url.origin));
	}

	const failWith = (error: string) => {
		const target = new URL(state.errorCallbackURL, url.origin);
		target.searchParams.set("provider", provider);
		target.searchParams.set("error", error);
		return NextResponse.redirect(target);
	};

	if (providerError || !code) {
		return failWith(providerError ?? "missing_code");
	}

	const redirectUri = new URL(
		`/api/connections/${provider}/callback`,
		url.origin,
	).toString();

	let exchanged: ExchangedAccount;
	try {
		exchanged =
			provider === "google"
				? await exchangeGoogle(code, redirectUri)
				: await exchangeMicrosoft(code, redirectUri);
	} catch (error) {
		return failWith(error instanceof Error ? error.message : "token_exchange_failed");
	}

	const user = await db.user.findUnique({
		where: { id: state.userId },
		select: { email: true },
	});
	if (!user) return failWith("session_expired");

	if (exchanged.email.toLowerCase() !== user.email.toLowerCase()) {
		return failWith("email_doesn't_match");
	}

	const providerId = provider === "google" ? GOOGLE_PROVIDER_ID : MICROSOFT_PROVIDER_ID;

	const existing = await db.account.findFirst({
		where: { userId: state.userId, providerId },
		select: { id: true },
	});

	const data = {
		accountId: exchanged.accountId,
		accessToken: exchanged.accessToken,
		refreshToken: exchanged.refreshToken,
		accessTokenExpiresAt: exchanged.expiresAt,
		scope: exchanged.scope,
	};

	if (existing) {
		await db.account.update({ where: { id: existing.id }, data });
	} else {
		await db.account.create({
			data: { id: crypto.randomUUID(), userId: state.userId, providerId, ...data },
		});
	}

	return NextResponse.redirect(new URL(state.callbackURL, url.origin));
}

async function exchangeGoogle(
	code: string,
	redirectUri: string,
): Promise<ExchangedAccount> {
	const credentials = googleCredentials();
	if (!credentials) throw new Error("not_configured");

	const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});
	const tokens = (await tokenResponse.json()) as Record<string, unknown>;
	if (!tokenResponse.ok || typeof tokens.access_token !== "string") {
		throw new Error(typeof tokens.error === "string" ? tokens.error : "token_exchange_failed");
	}

	const profileResponse = await fetch(
		"https://openidconnect.googleapis.com/v1/userinfo",
		{ headers: { Authorization: `Bearer ${tokens.access_token}` } },
	);
	const profile = (await profileResponse.json()) as Record<string, unknown>;
	if (!profileResponse.ok || typeof profile.email !== "string" || typeof profile.sub !== "string") {
		throw new Error("profile_fetch_failed");
	}

	return {
		accountId: profile.sub,
		email: profile.email,
		accessToken: tokens.access_token,
		refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
		expiresAt:
			typeof tokens.expires_in === "number"
				? new Date(Date.now() + tokens.expires_in * 1000)
				: null,
		scope:
			typeof tokens.scope === "string"
				? tokens.scope
				: [...IDENTITY_SCOPES, ...SYNC_SCOPES].join(" "),
	};
}

async function exchangeMicrosoft(
	code: string,
	redirectUri: string,
): Promise<ExchangedAccount> {
	const credentials = microsoftCredentials();
	if (!credentials) throw new Error("not_configured");

	const tokenResponse = await fetch(
		`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				code,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
			}),
		},
	);
	const tokens = (await tokenResponse.json()) as Record<string, unknown>;
	if (!tokenResponse.ok || typeof tokens.access_token !== "string") {
		throw new Error(typeof tokens.error === "string" ? tokens.error : "token_exchange_failed");
	}

	const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
		headers: { Authorization: `Bearer ${tokens.access_token}` },
	});
	const profile = (await profileResponse.json()) as Record<string, unknown>;
	const email =
		typeof profile.mail === "string"
			? profile.mail
			: typeof profile.userPrincipalName === "string"
				? profile.userPrincipalName
				: null;

	if (!profileResponse.ok || !email || typeof profile.id !== "string") {
		throw new Error("profile_fetch_failed");
	}

	return {
		accountId: profile.id,
		email,
		accessToken: tokens.access_token,
		refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
		expiresAt:
			typeof tokens.expires_in === "number"
				? new Date(Date.now() + tokens.expires_in * 1000)
				: null,
		scope:
			typeof tokens.scope === "string"
				? tokens.scope
				: MICROSOFT_SYNC_SCOPES.map((scope) => `${GRAPH_SCOPE_PREFIX}${scope}`).join(" "),
	};
}
