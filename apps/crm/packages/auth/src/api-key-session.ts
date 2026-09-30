import { createHash, randomBytes } from "node:crypto";
import { db } from "@crm/db";
import { API_KEY_PREFIX } from "./api-keys";
import type { Session } from "./next-auth-session";
import { WORKSPACE_ID, workspaceRoleOf } from "./organization";

const RAW_KEY_BYTES = 24;
const START_LENGTH = API_KEY_PREFIX.length + 8;

function hashApiKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): {
	raw: string;
	hash: string;
	start: string;
} {
	const raw = `${API_KEY_PREFIX}${randomBytes(RAW_KEY_BYTES).toString("base64url")}`;

	return { raw, hash: hashApiKey(raw), start: raw.slice(0, START_LENGTH) };
}

/** Resolves an `x-api-key` header value to a session, the same way a cookie resolves to one. */
export async function sessionFromApiKey(rawKey: string): Promise<Session | null> {
	const key = await db.apikey.findUnique({
		where: { keyHash: hashApiKey(rawKey) },
		select: {
			id: true,
			enabled: true,
			expiresAt: true,
			referenceId: true,
			user: { select: { id: true, email: true, name: true, image: true } },
		},
	});

	if (!key || key.enabled === false) return null;
	if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;

	void db.apikey
		.update({ where: { id: key.id }, data: { lastRequest: new Date() } })
		.catch(() => {});

	const role = await workspaceRoleOf(key.referenceId);

	return {
		user: {
			id: key.user.id,
			email: key.user.email,
			name: key.user.name,
			image: key.user.image,
			workspaceId: role ? WORKSPACE_ID : null,
			role,
		},
		expiresAt: key.expiresAt?.toISOString() ?? null,
	};
}
