import { decode } from "next-auth/jwt";
import { env } from "./env";

export const SESSION_COOKIE_NAME = "next-auth.session-token";
export const SECURE_SESSION_COOKIE_NAME = "__Secure-next-auth.session-token";

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	image: string | null;
	workspaceId: string | null;
	role: string | null;
};

export type Session = { user: SessionUser; expiresAt: string | null };

/** Reads the NextAuth session cookie out of a raw `Cookie` request header. */
export function readSessionToken(cookieHeader: string | undefined | null): string | null {
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(";")) {
		const separator = part.indexOf("=");
		if (separator === -1) continue;

		const name = part.slice(0, separator).trim();
		if (name !== SESSION_COOKIE_NAME && name !== SECURE_SESSION_COOKIE_NAME) continue;

		const value = part.slice(separator + 1).trim();
		if (!value) continue;

		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}

	return null;
}

/** Decodes a NextAuth JWT session token, mirroring apps/app's `jwt`/`session` callbacks. */
export async function decodeSessionToken(token: string): Promise<Session | null> {
	if (!env.nextAuthSecret) return null;

	try {
		const payload = await decode({ token, secret: env.nextAuthSecret });
		if (!payload || typeof payload.id !== "string" || typeof payload.email !== "string") {
			return null;
		}

		return {
			user: {
				id: payload.id,
				email: payload.email,
				name: typeof payload.name === "string" ? payload.name : "",
				image: typeof payload.image === "string" ? payload.image : null,
				workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : null,
				role: typeof payload.role === "string" ? payload.role : null,
			},
			expiresAt:
				typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null,
		};
	} catch {
		return null;
	}
}

/** Resolves the session directly from a `Cookie` header — the one entry point apps/api needs. */
export async function sessionFromCookieHeader(
	cookieHeader: string | undefined | null,
): Promise<Session | null> {
	const token = readSessionToken(cookieHeader);
	if (!token) return null;

	return decodeSessionToken(token);
}
