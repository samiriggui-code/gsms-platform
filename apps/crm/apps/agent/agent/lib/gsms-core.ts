import { createHmac } from "node:crypto";
import { db } from "@crm/db";
import { z } from "zod";
import { DISPATCH } from "./dispatch-config";

export const GSMS_WORKSPACE_FIELD_KEY = "prestation_gsms";

export type GsmsCoreRecord = {
	kind: "company" | "contact" | "deal";
	id: string;
};

export type GsmsCoreEvent = { type: string; record: GsmsCoreRecord };

type CoreConfig = { url: string; secret: string };

const workspaceLink = z.object({
	id: z.string().min(1),
	name: z.string().nullable(),
	url: z.string().url(),
	created: z.boolean(),
});

const coreAnswer = z.object({
	ok: z.boolean(),
	workspace: workspaceLink.nullable(),
});

export type GsmsWorkspaceLink = z.infer<typeof workspaceLink>;

type FieldScalar = string | number | boolean | null;

type ValueRow = {
	text: string | null;
	number: { toNumber(): number } | null;
	date: Date | null;
	bool: boolean | null;
	option: { label: string } | null;
	field: { key: string; type: string };
};

export function gsmsCoreConfig(
	source: Record<string, string | undefined> = process.env,
): CoreConfig | null {
	const url = source.GSMS_CORE_URL?.trim().replace(/\/+$/, "");
	const secret = source.GSMS_CORE_WEBHOOK_SECRET?.trim();
	return url && secret ? { url, secret } : null;
}

export function signBody(secret: string, body: string): string {
	return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function fieldMap(rows: ValueRow[]): Record<string, FieldScalar> {
	const out: Record<string, FieldScalar> = {};
	for (const row of rows) {
		const { key, type } = row.field;
		if (type === "SELECT") out[key] = row.option?.label ?? null;
		else if (type === "NUMBER")
			out[key] = row.number ? row.number.toNumber() : null;
		else if (type === "DATE")
			out[key] = row.date ? row.date.toISOString() : null;
		else if (type === "CHECKBOX") out[key] = row.bool;
		else out[key] = row.text;
	}
	return out;
}

const VALUE_SELECT = {
	select: {
		text: true,
		number: true,
		date: true,
		bool: true,
		option: { select: { label: true } },
		field: { select: { key: true, type: true } },
	},
} as const;

async function companySnapshot(id: string) {
	const company = await db.company.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			domain: true,
			website: true,
			industry: true,
			city: true,
			country: true,
			phone: true,
			email: true,
			fieldValues: VALUE_SELECT,
		},
	});
	if (!company) return null;
	const { fieldValues, ...rest } = company;
	return { ...rest, fields: fieldMap(fieldValues) };
}

async function contactSnapshot(id: string) {
	const contact = await db.contact.findUnique({
		where: { id },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			phone: true,
			title: true,
			companyId: true,
		},
	});
	if (!contact) return null;
	const { companyId, ...rest } = contact;
	return {
		...rest,
		company: companyId ? await companySnapshot(companyId) : null,
	};
}

async function dealSnapshot(id: string) {
	const deal = await db.deal.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			description: true,
			stage: true,
			amount: true,
			currency: true,
			expectedCloseDate: true,
			companyId: true,
			fieldValues: VALUE_SELECT,
		},
	});
	if (!deal) return null;
	const { fieldValues, companyId, amount, ...rest } = deal;
	return {
		...rest,
		amount: amount ? amount.toNumber() : null,
		fields: fieldMap(fieldValues),
		company: await companySnapshot(companyId),
	};
}

export function snapshot(record: GsmsCoreRecord) {
	if (record.kind === "company") return companySnapshot(record.id);
	if (record.kind === "contact") return contactSnapshot(record.id);
	return dealSnapshot(record.id);
}

class CoreRefused extends Error {}

async function post(config: CoreConfig, body: string) {
	const { attempts, timeoutMs, backoffMs } = DISPATCH.gsmsCore;
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			const response = await fetch(
				`${config.url}/api/integrations/crm/events`,
				{
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-gsms-signature": signBody(config.secret, body),
					},
					body,
					signal: AbortSignal.timeout(timeoutMs),
				},
			);
			if (response.ok) return coreAnswer.parse(await response.json());
			if (response.status < 500) {
				throw new CoreRefused(
					`GSMS Core refused the event (${response.status}): ${(await response.text()).slice(0, 300)}`,
				);
			}
			lastError = new Error(`GSMS Core unavailable (${response.status})`);
		} catch (error) {
			if (error instanceof CoreRefused) throw error;
			lastError = error;
		}
		await new Promise((resolve) =>
			setTimeout(resolve, backoffMs * 3 ** attempt),
		);
	}
	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function linkDeal(
	dealId: string,
	workspace: GsmsWorkspaceLink,
): Promise<void> {
	const field = await db.fieldDefinition.findFirst({
		where: { entity: "DEAL", key: GSMS_WORKSPACE_FIELD_KEY, archivedAt: null },
		select: { id: true },
	});
	if (field) {
		await db.fieldValue.upsert({
			where: { fieldId_dealId: { fieldId: field.id, dealId } },
			create: { fieldId: field.id, dealId, text: workspace.url },
			update: { text: workspace.url },
		});
	}
	if (!workspace.created) return;
	const deal = await db.deal.findUnique({
		where: { id: dealId },
		select: { companyId: true, ownerId: true },
	});
	if (!deal) return;
	await db.activity.create({
		data: {
			type: "NOTE",
			subject: "Prestation ouverte dans GSMS",
			body: `L'affaire est gagnée : la prestation « ${workspace.name ?? "GSMS"} » est ouverte dans le portail GSMS (espace client, documents, suivi).\n${workspace.url}`,
			occurredAt: new Date(),
			dealId,
			companyId: deal.companyId,
			createdById: deal.ownerId,
			meta: { source: "gsms-core", workspaceId: workspace.id },
		},
	});
}

export type ForwardOutcome =
	| { outcome: "skipped"; reason: string }
	| { outcome: "sent"; workspace: GsmsWorkspaceLink | null }
	| { outcome: "failed"; reason: string };

export async function forwardToGsmsCore(
	event: GsmsCoreEvent,
	config: CoreConfig | null = gsmsCoreConfig(),
): Promise<ForwardOutcome> {
	if (!config)
		return { outcome: "skipped", reason: "GSMS Core is not configured." };
	try {
		const data = await snapshot(event.record);
		if (!data) return { outcome: "skipped", reason: "The record is gone." };
		const answer = await post(
			config,
			JSON.stringify({
				type: event.type,
				occurred_at: new Date().toISOString(),
				data,
			}),
		);
		if (event.record.kind === "deal" && answer.workspace) {
			await linkDeal(event.record.id, answer.workspace);
		}
		return { outcome: "sent", workspace: answer.workspace };
	} catch (error) {
		return {
			outcome: "failed",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

export function describeForward(outcome: ForwardOutcome): string {
	if (outcome.outcome === "skipped") return `GSMS Core: ${outcome.reason}`;
	if (outcome.outcome === "failed")
		return `GSMS Core: not synced (${outcome.reason}).`;
	return outcome.workspace?.created
		? `GSMS Core: engagement opened (${outcome.workspace.url}).`
		: "GSMS Core: synced.";
}
