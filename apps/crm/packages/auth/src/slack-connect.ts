import { db } from "@crm/db";
import {
	canManageConnections,
	WORKSPACE_ID,
	WORKSPACE_ROLES,
	workspaceRoleOf,
} from "./organization";

const CONNECT_MANAGER_ROLES = WORKSPACE_ROLES.filter((role) =>
	canManageConnections(role),
);

export type SlackConnectDecision =
	| { allowed: true }
	| { allowed: false; reason: string };

/**
 * One Slack workspace is shared by everyone here, so only an owner or an
 * admin may connect or reconnect it — except before the workspace has one
 * yet, when anyone already a member may.
 */
export async function canStartSlackConnect(userId: string): Promise<SlackConnectDecision> {
	const [role, managers] = await Promise.all([
		workspaceRoleOf(userId),
		db.member.count({
			where: {
				organizationId: WORKSPACE_ID,
				role: { in: [...CONNECT_MANAGER_ROLES] },
			},
		}),
	]);

	if (!role) {
		return {
			allowed: false,
			reason: "Only a member of this workspace can connect Slack.",
		};
	}

	if (managers === 0) return { allowed: true };

	if (!canManageConnections(role)) {
		return {
			allowed: false,
			reason:
				"Only an owner or an admin can connect Slack. One Slack workspace is shared by everyone here, so ask one of them to connect or reconnect it.",
		};
	}

	return { allowed: true };
}
