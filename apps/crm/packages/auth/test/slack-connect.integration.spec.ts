import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { workspaceSlug } from "@crm/db/workspace";
import { canStartSlackConnect } from "../src/slack-connect";
import { DEFAULT_WORKSPACE_NAME, WORKSPACE_ID, type WorkspaceRole } from "../src/organization";

const suffix = process.env.TEST_RUN_ID ?? "slack-connect-spec";
const EMAIL_SUFFIX = `.slack-connect.${suffix}@example.test`;

const idOf = (label: string) => `slack-connect-${suffix}-${label}`;

const seat = async (label: string, role: WorkspaceRole | null): Promise<string> => {
	const now = new Date();

	const user = await db.user.create({
		data: {
			id: idOf(label),
			name: label,
			email: `${label}${EMAIL_SUFFIX}`,
			createdAt: now,
			updatedAt: now,
		},
		select: { id: true },
	});

	if (role) {
		await db.member.create({
			data: {
				id: idOf(`${label}-member`),
				organizationId: WORKSPACE_ID,
				userId: user.id,
				role,
				createdAt: now,
			},
		});
	}

	return user.id;
};

const clear = async () => {
	await db.member.deleteMany({ where: { organizationId: WORKSPACE_ID } });
	await db.organization.deleteMany({ where: { id: WORKSPACE_ID } });
	await db.user.deleteMany({ where: { email: { endsWith: EMAIL_SUFFIX } } });
};

beforeEach(async () => {
	await clear();

	await db.organization.create({
		data: {
			id: WORKSPACE_ID,
			name: DEFAULT_WORKSPACE_NAME,
			slug: workspaceSlug(DEFAULT_WORKSPACE_NAME),
			createdAt: new Date(),
		},
	});
});

afterAll(clear);

describe("canStartSlackConnect", () => {
	it("turns away a stranger with no role in the workspace", async () => {
		await seat("owner", "owner");
		const strangerId = await seat("stranger", null);

		const decision = await canStartSlackConnect(strangerId);

		expect(decision.allowed).toBe(false);
		if (!decision.allowed) expect(decision.reason).toContain("member of this workspace");
	});

	it("turns away a plain member once the workspace has an owner or admin", async () => {
		await seat("owner", "owner");
		const memberId = await seat("rep", "member");

		const decision = await canStartSlackConnect(memberId);

		expect(decision.allowed).toBe(false);
		if (!decision.allowed) expect(decision.reason).toContain("Only an owner or an admin");
	});

	it("lets an admin connect", async () => {
		const adminId = await seat("lead", "admin");

		expect(await canStartSlackConnect(adminId)).toEqual({ allowed: true });
	});

	it("lets an owner connect", async () => {
		const ownerId = await seat("founder", "owner");

		expect(await canStartSlackConnect(ownerId)).toEqual({ allowed: true });
	});

	it("lets a member connect when the workspace has no owner and no admin yet", async () => {
		const repId = await seat("rep", "member");
		await seat("other", "member");

		expect(await canStartSlackConnect(repId)).toEqual({ allowed: true });
	});
});
