import { sessionFromApiKey } from "./api-key-session";
import { API_KEY_HEADER } from "./api-keys";
import { type Session, sessionFromCookieHeader } from "./next-auth-session";

export type SessionHeaders = {
	cookie?: string | string[];
	[header: string]: string | string[] | undefined;
};

function headerValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves the session for an incoming apps/api request: an `x-api-key`
 * header takes priority (mirrors better-auth's apiKey plugin transparently
 * accepting either), falling back to the NextAuth cookie.
 */
export async function sessionFromHeaders(headers: SessionHeaders): Promise<Session | null> {
	const apiKey = headerValue(headers[API_KEY_HEADER]);
	if (apiKey) return sessionFromApiKey(apiKey);

	return sessionFromCookieHeader(headerValue(headers.cookie));
}
