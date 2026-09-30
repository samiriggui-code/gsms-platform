import {
	canStartSlackConnect,
	SLACK_REQUESTED_SCOPES,
	SLACK_USER_SCOPES,
	slackCredentials,
} from "@crm/auth";
import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { encodeConnectState } from "../../oauth-state";

const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";

export async function GET(request: NextRequest) {
	const session = await requireSession();
	const url = new URL(request.url);
	const callbackURL = url.searchParams.get("callbackURL") ?? "/";
	const errorCallbackURL = url.searchParams.get("errorCallbackURL") ?? callbackURL;

	const failWith = (error: string) => {
		const target = new URL(errorCallbackURL, url.origin);
		target.searchParams.set("provider", "slack");
		target.searchParams.set("error", error);
		return NextResponse.redirect(target);
	};

	const credentials = slackCredentials();
	if (!credentials) return failWith("not_configured");

	const decision = await canStartSlackConnect(session.user.id);
	if (!decision.allowed) return failWith("not_authorized");

	const redirectUri = new URL("/api/connections/slack/callback", url.origin).toString();

	const state = await encodeConnectState({
		userId: session.user.id,
		callbackURL,
		errorCallbackURL,
	});

	const authorize = new URL(SLACK_AUTHORIZE_URL);
	authorize.searchParams.set("client_id", credentials.clientId);
	authorize.searchParams.set("redirect_uri", redirectUri);
	authorize.searchParams.set("scope", SLACK_REQUESTED_SCOPES.join(","));
	authorize.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
	authorize.searchParams.set("state", state);

	return NextResponse.redirect(authorize);
}
