import {
	googleCredentials,
	IDENTITY_SCOPES,
	MICROSOFT_SYNC_SCOPES,
	microsoftCredentials,
	primaryWorkspaceDomain,
	SYNC_SCOPES,
} from "@crm/auth";
import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { encodeConnectState } from "../../oauth-state";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GRAPH_SCOPE_PREFIX = "https://graph.microsoft.com/";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const { provider } = await params;
	if (provider !== "google" && provider !== "microsoft") {
		return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
	}

	const session = await requireSession();
	const url = new URL(request.url);
	const callbackURL = url.searchParams.get("callbackURL") ?? "/";
	const errorCallbackURL = url.searchParams.get("errorCallbackURL") ?? callbackURL;

	const redirectUri = new URL(
		`/api/connections/${provider}/callback`,
		url.origin,
	).toString();

	const state = await encodeConnectState({
		userId: session.user.id,
		callbackURL,
		errorCallbackURL,
	});

	const failWith = (error: string) => {
		const target = new URL(errorCallbackURL, url.origin);
		target.searchParams.set("provider", provider);
		target.searchParams.set("error", error);
		return NextResponse.redirect(target);
	};

	if (provider === "google") {
		const credentials = googleCredentials();
		if (!credentials) return failWith("not_configured");

		const authorize = new URL(GOOGLE_AUTHORIZE_URL);
		authorize.searchParams.set("client_id", credentials.clientId);
		authorize.searchParams.set("redirect_uri", redirectUri);
		authorize.searchParams.set("response_type", "code");
		authorize.searchParams.set(
			"scope",
			[...IDENTITY_SCOPES, ...SYNC_SCOPES].join(" "),
		);
		authorize.searchParams.set("access_type", "offline");
		authorize.searchParams.set("prompt", "consent");
		authorize.searchParams.set("state", state);

		const hostedDomain = primaryWorkspaceDomain();
		if (hostedDomain) authorize.searchParams.set("hd", hostedDomain);

		return NextResponse.redirect(authorize);
	}

	const credentials = microsoftCredentials();
	if (!credentials) return failWith("not_configured");

	const authorize = new URL(
		`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/authorize`,
	);
	authorize.searchParams.set("client_id", credentials.clientId);
	authorize.searchParams.set("redirect_uri", redirectUri);
	authorize.searchParams.set("response_type", "code");
	authorize.searchParams.set("response_mode", "query");
	authorize.searchParams.set(
		"scope",
		[
			"openid",
			"email",
			"profile",
			"offline_access",
			...MICROSOFT_SYNC_SCOPES.map((scope) => `${GRAPH_SCOPE_PREFIX}${scope}`),
		].join(" "),
	);
	authorize.searchParams.set("prompt", "select_account");
	authorize.searchParams.set("state", state);

	return NextResponse.redirect(authorize);
}
