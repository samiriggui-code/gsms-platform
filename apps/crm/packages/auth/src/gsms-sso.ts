import { z } from "zod";
import { WORKSPACE_ROLES, type WorkspaceRole } from "./organization";

export const GSMS_PROVIDER_ID = "gsms";
export const GSMS_ROLE_CLAIM = "gsms_role";

export function gsmsWellKnownUrl(issuer: string): string {
	return `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`;
}

export function parseGsmsRole(value: unknown): WorkspaceRole | null {
	if (typeof value !== "string") return null;
	const role = value.trim().toLowerCase();
	return (WORKSPACE_ROLES as readonly string[]).includes(role)
		? (role as WorkspaceRole)
		: null;
}

const gsmsProfileSchema = z.object({
	sub: z.string().trim().min(1),
	email: z.string().trim().toLowerCase().pipe(z.email()),
	name: z.string().trim().optional().catch(undefined),
	[GSMS_ROLE_CLAIM]: z.unknown().optional(),
});

export type GsmsIdentity = {
	sub: string;
	email: string;
	name: string;
	role: WorkspaceRole;
};

export type GsmsSignInDecision =
	| { ok: true; identity: GsmsIdentity }
	| { ok: false; reason: "invalid_profile" | "invalid_role" };

export function gsmsSignInDecision(profile: unknown): GsmsSignInDecision {
	const parsed = gsmsProfileSchema.safeParse(profile);
	if (!parsed.success) return { ok: false, reason: "invalid_profile" };

	const role = parseGsmsRole(parsed.data[GSMS_ROLE_CLAIM]);
	if (!role) return { ok: false, reason: "invalid_role" };

	const { sub, email } = parsed.data;
	const name = parsed.data.name || email.split("@")[0] || email;

	return { ok: true, identity: { sub, email, name, role } };
}

export type GsmsRoleResolution = {
	role: WorkspaceRole;
	keptLastOwner: boolean;
};

export function resolveGsmsRole(input: {
	current: WorkspaceRole | null;
	claimed: WorkspaceRole;
	ownerCount: number;
}): GsmsRoleResolution {
	const { current, claimed, ownerCount } = input;

	if (current === "owner" && claimed !== "owner" && ownerCount <= 1) {
		return { role: "owner", keptLastOwner: true };
	}

	return { role: claimed, keptLastOwner: false };
}
