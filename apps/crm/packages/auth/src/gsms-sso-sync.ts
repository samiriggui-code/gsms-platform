import { db } from "@crm/db";
import { type GsmsIdentity, resolveGsmsRole } from "./gsms-sso";
import {
	ensureWorkspaceMembership,
	toWorkspaceRole,
	WORKSPACE_ID,
	type WorkspaceRole,
} from "./organization";

export type GsmsSyncResult = {
	userId: string;
	workspaceId: string;
	role: WorkspaceRole;
};

export async function syncGsmsUser(
	identity: GsmsIdentity,
): Promise<GsmsSyncResult | undefined> {
	const email = identity.email.trim().toLowerCase();

	const user = await db.user.upsert({
		where: { email },
		create: {
			id: crypto.randomUUID(),
			email,
			name: identity.name,
			emailVerified: true,
		},
		update: {
			name: identity.name,
			emailVerified: true,
		},
		select: { id: true },
	});

	// Adhésion antérieure à cette connexion ? Sur un CRM vide, ensureWorkspaceMembership nomme « owner » le
	// premier compte venu : ce n'est pas une décision du Core, le rôle demandé par le Core s'applique alors.
	const hadMembership =
		(await db.member.count({
			where: { organizationId: WORKSPACE_ID, userId: user.id },
		})) > 0;

	const workspaceId = await ensureWorkspaceMembership(user.id);
	if (!workspaceId) return undefined;

	const role = await db.$transaction(async (tx) => {
		const member = await tx.member.findUnique({
			where: {
				organizationId_userId: {
					organizationId: WORKSPACE_ID,
					userId: user.id,
				},
			},
			select: { role: true },
		});

		const current =
			member && hadMembership ? toWorkspaceRole(member.role) : null;
		const ownerCount =
			current === "owner" && identity.role !== "owner"
				? await tx.member.count({
						where: { organizationId: WORKSPACE_ID, role: "owner" },
					})
				: 0;

		const resolution = resolveGsmsRole({
			current,
			claimed: identity.role,
			ownerCount,
		});

		if (resolution.keptLastOwner) {
			console.warn(
				`[auth] GSMS SSO: ${email} reste owner — le Core demande « ${identity.role} », mais c'est le dernier owner du CRM.`,
			);
		}

		if (member?.role !== resolution.role) {
			await tx.member.update({
				where: {
					organizationId_userId: {
						organizationId: WORKSPACE_ID,
						userId: user.id,
					},
				},
				data: { role: resolution.role },
			});
		}

		return resolution.role;
	});

	return { userId: user.id, workspaceId, role };
}
