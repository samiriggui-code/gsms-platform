import {
	ensureWorkspaceMembership,
	SECURE_SESSION_COOKIE_NAME,
	SESSION_COOKIE_NAME,
	workspaceRoleOf,
} from "@crm/auth";
import { db } from "@crm/db";
import { encode } from "next-auth/jwt";

const SESSION_DAYS = 7;

if (process.env.NODE_ENV === "production") {
	throw new Error(
		"dev-session is a development helper and mints real sessions.",
	);
}

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
	throw new Error("NEXTAUTH_SECRET is not set — run this from apps/api.");
}

const email = process.argv[2] ?? "dev@localhost";
const name = email.split("@")[0] ?? "Developer";

const user = await db.user.upsert({
	where: { email },
	create: {
		id: `dev-${Buffer.from(email).toString("hex").slice(0, 20)}`,
		email,
		name,
		emailVerified: true,
		updatedAt: new Date(),
	},
	update: {},
});

const workspaceId = await ensureWorkspaceMembership(user.id);
const role = workspaceId ? await workspaceRoleOf(user.id) : null;
const maxAge = SESSION_DAYS * 24 * 60 * 60;

const token = await encode({
	secret,
	maxAge,
	token: {
		id: user.id,
		email: user.email,
		name: user.name,
		image: user.image ?? null,
		workspaceId: workspaceId ?? null,
		role,
	},
});

const cookieName = process.env.NEXTAUTH_URL?.startsWith("https://")
	? SECURE_SESSION_COOKIE_NAME
	: SESSION_COOKIE_NAME;

console.log(`${cookieName}=${encodeURIComponent(token)}`);

await db.$disconnect();
