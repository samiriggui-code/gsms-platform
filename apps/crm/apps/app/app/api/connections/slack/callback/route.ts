import {
	queueSlackInventorySync,
	rememberSlackInstall,
	replaceSlackConnection,
	SLACK_PROVIDER_ID,
	slackCredentials,
} from "@crm/auth";
import { db } from "@crm/db";
import { schemas } from "@crm/validation";
import { type NextRequest, NextResponse } from "next/server";
import { decodeConnectState } from "../../oauth-state";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const providerError = url.searchParams.get("error");
	const state = await decodeConnectState(url.searchParams.get("state"));

	if (!state) {
		return NextResponse.redirect(new URL("/sign-in", url.origin));
	}

	const failWith = (error: string) => {
		const target = new URL(state.errorCallbackURL, url.origin);
		target.searchParams.set("provider", "slack");
		target.searchParams.set("error", error);
		return NextResponse.redirect(target);
	};

	if (providerError || !code) {
		return failWith(providerError ?? "missing_code");
	}

	const credentials = slackCredentials();
	if (!credentials) return failWith("not_configured");

	const redirectUri = new URL("/api/connections/slack/callback", url.origin).toString();

	const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			code,
			redirect_uri: redirectUri,
		}),
	});
	const grant = schemas.slack.oauthAccess.parse(await tokenResponse.json());

	if (!tokenResponse.ok || !grant.ok || !grant.access_token || !grant.authed_user) {
		return failWith(
			grant.error === "access_denied" ? "access_denied" : "oauth_code_verification_failed",
		);
	}

	await rememberSlackInstall(grant);

	const installerId = grant.authed_user.id;

	const userResponse = await fetch(
		`https://slack.com/api/users.info?user=${encodeURIComponent(installerId)}`,
		{ headers: { Authorization: `Bearer ${grant.access_token}` } },
	);
	const profile = schemas.slack.userInfo.parse(await userResponse.json());
	const email = profile.user.profile.email;

	if (!userResponse.ok || !profile.ok || !email) {
		return failWith("user_info_is_missing");
	}

	const user = await db.user.findUnique({
		where: { id: state.userId },
		select: { email: true },
	});
	if (!user) return failWith("session_expired");

	if (email.toLowerCase() !== user.email.toLowerCase()) {
		return failWith("email_doesn't_match");
	}

	const existing = await db.account.findFirst({
		where: { userId: state.userId, providerId: SLACK_PROVIDER_ID, accountId: installerId },
		select: { id: true },
	});

	const data = {
		accessToken: grant.access_token,
		scope: grant.scope ?? null,
	};

	const account = existing
		? await db.account.update({ where: { id: existing.id }, data })
		: await db.account.create({
				data: {
					id: crypto.randomUUID(),
					userId: state.userId,
					providerId: SLACK_PROVIDER_ID,
					accountId: installerId,
					...data,
				},
			});

	await replaceSlackConnection(account);
	await queueSlackInventorySync();

	return NextResponse.redirect(new URL(state.callbackURL, url.origin));
}
