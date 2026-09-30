import { WORKSPACE_ID } from "@crm/db/workspace";
import {
	ActivityType,
	EnrichmentStatus,
	Prisma,
	RecordSource,
	type Db,
} from "@crm/db";
import { lockIdempotencyKey } from "@crm/db/idempotency";
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { normalizeDomain } from "../companies/domain";
import { ActivityStampService } from "../crm/activity-stamp.service";
import { normalizeEmail } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import { GSMS_PUBLIC_SOURCE_SYSTEM } from "./public.constants";
import type {
	AuditRequestBody,
	ContactRequestBody,
	TenderRequestBody,
} from "./public.schemas";

export type TenderRequestResult = {
	ok: true;
	created: boolean;
	dealId: string;
	companyId: string;
	contactId: string;
	externalId: string;
};

export type ContactRequestResult = {
	ok: true;
	created: boolean;
	contactId: string;
	activityId: string;
	externalId: string;
};

type DealLookup = {
	id: string;
	companyId: string;
	contactId: string | null;
};

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 60;

/**
 * Public AO intake. New columns (`sourceSystem` / `externalId` / Deal.source)
 * are stamped via SQL until `prisma generate` is re-run locally (bun/prisma
 * lockfile issue on this machine). Migration must be applied first.
 */
@Injectable()
export class PublicIntakeService {
	private readonly logger = new Logger(PublicIntakeService.name);
	private readonly hits = new Map<string, number[]>();

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly agent: AgentTriggerService,
		private readonly stamp: ActivityStampService,
	) {}

	assertRateLimit(bucket: string): void {
		const now = Date.now();
		const prev = this.hits.get(bucket) ?? [];
		const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
		if (recent.length >= RATE_MAX) {
			throw new HttpException(
				"Rate limit exceeded",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
		recent.push(now);
		this.hits.set(bucket, recent);
	}

	async tenderRequest(
		body: TenderRequestBody,
		rateBucket: string,
	): Promise<TenderRequestResult> {
		if (body.honeypot) {
			throw new BadRequestException("Rejected");
		}

		this.assertRateLimit(rateBucket);

		const email = normalizeEmail(body.contact.email);
		if (!email) {
			throw new BadRequestException("Invalid email");
		}

		const existing = await this.findDealByExternal(body.externalId);
		if (existing) {
			return {
				ok: true,
				created: false,
				dealId: existing.id,
				companyId: existing.companyId,
				contactId: existing.contactId ?? "",
				externalId: body.externalId,
			};
		}

		const ownerId = await this.resolveOwnerId();
		const domain =
			normalizeDomain(body.companyDomain) ??
			normalizeDomain(email.split("@")[1] ?? "");

		const now = new Date();
		const attachmentSummary =
			body.attachments?.length && body.attachments.length > 0
				? `\n\nPièces (meta):\n${body.attachments
						.map(
							(a) =>
								`- ${a.name}${a.contentType ? ` [${a.contentType}]` : ""}${
									a.sizeBytes != null ? ` ${a.sizeBytes}o` : ""
								}`,
						)
						.join("\n")}`
				: "";

		const isAudit = body.title.trim().startsWith("[AUDIT]");
		const description = [
			isAudit
				? "[AUDIT] Demande vitrine GSMS Public"
				: "[AO] Demande vitrine GSMS Public",
			body.description?.trim() || null,
			attachmentSummary || null,
		]
			.filter(Boolean)
			.join("\n\n");

		const dealTitle = body.title.trim().startsWith("[AO]") ||
			body.title.trim().startsWith("[AUDIT]")
			? body.title.trim()
			: `[AO] ${body.title.trim()}`;

		const outcome = await this.agent.withCrmEvents(async (tx, emit) => {
			await lockIdempotencyKey(
				tx,
				`public-tender:${GSMS_PUBLIC_SOURCE_SYSTEM}:${body.externalId}`,
			);

			const raced = await this.findDealByExternal(body.externalId, tx);
			if (raced) {
				return {
					created: false as const,
					dealId: raced.id,
					companyId: raced.companyId,
					contactId: raced.contactId ?? "",
				};
			}

			let companyCreated = false;
			let company = domain
				? await tx.company.findFirst({
						where: { domain, archivedAt: null },
						select: { id: true },
					})
				: null;

			if (!company) {
				company = await tx.company.create({
					data: {
						name: body.companyName.trim(),
						domain,
						website: domain ? `https://${domain}` : null,
						enrichmentStatus: EnrichmentStatus.PENDING,
						ownerId,
						source: RecordSource.MANUAL,
						lastActivityAt: now,
					},
					select: { id: true },
				});
				companyCreated = true;
				await this.stampCompanySource(tx, company.id, `co_${body.externalId}`);
				await emit({
					type: "company.created",
					record: { kind: "company", id: company.id },
					occurredAt: now,
					data: {
						name: body.companyName.trim(),
						domain,
					},
				});
			}

			let contactCreated = false;
			let contact = await tx.contact.findFirst({
				where: { email, archivedAt: null },
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					companyId: true,
				},
			});

			if (!contact) {
				contact = await tx.contact.create({
					data: {
						firstName: body.contact.firstName.trim(),
						lastName: body.contact.lastName?.trim() || null,
						email,
						phone: body.contact.phone?.trim() || null,
						companyId: company.id,
						ownerId,
						source: RecordSource.MANUAL,
						lastActivityAt: now,
					},
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						companyId: true,
					},
				});
				contactCreated = true;
				await this.stampContactSource(tx, contact.id, `ct_${body.externalId}`);
				await emit({
					type: "contact.created",
					record: { kind: "contact", id: contact.id },
					occurredAt: now,
					data: {
						firstName: contact.firstName,
						lastName: contact.lastName,
						email: contact.email,
						companyId: contact.companyId,
						source: "FORM",
					},
				});
			} else {				const linked = await tx.contact.findFirst({
					where: { id: contact.id, companyId: company.id },
					select: { id: true },
				});
				if (!linked) {
					await tx.contact.update({
						where: { id: contact.id },
						data: { companyId: company.id, lastActivityAt: now },
					});
				}
			}

			const deal = await tx.deal.create({
				data: {
					name: dealTitle,
					description,
					companyId: company.id,
					ownerId,
					stage: "DEMO_BOOKED",
					stageChangedAt: now,
					expectedCloseDate: body.expectedCloseDate
						? new Date(body.expectedCloseDate)
						: null,
					lastActivityAt: now,
					contacts: {
						create: { contactId: contact.id, role: "primary" },
					},
				},
				select: { id: true },
			});

			await this.stampDealSource(tx, deal.id, body.externalId);

			await emit({
				type: "deal.created",
				record: { kind: "deal", id: deal.id },
				occurredAt: now,
				data: { companyId: company.id, stage: "DEMO_BOOKED" },
			});

			await tx.activity.create({
				data: {
					type: ActivityType.NOTE,
					subject: isAudit
						? "Demande audit (vitrine)"
						: "Demande AO (vitrine)",
					body: description,
					companyId: company.id,
					contactId: contact.id,
					dealId: deal.id,
					occurredAt: now,
					createdById: ownerId,
					meta: {
						automated: true,
						source: "gsms-public",
						channel: isAudit ? "audit-request" : "tender-request",
					},
				},
			});

			return {
				created: true as const,
				dealId: deal.id,
				companyId: company.id,
				contactId: contact.id,
				companyCreated,
				contactCreated,
			};
		});

		if (outcome.created) {
			if ("companyCreated" in outcome && outcome.companyCreated) {
				await this.agent.companyCreated(
					outcome.companyId,
					"Created from GSMS Public tender-request",
				);
			}
			if ("contactCreated" in outcome && outcome.contactCreated) {
				await this.agent.contactCreated(
					outcome.contactId,
					"Created from GSMS Public tender-request",
				);
			}
			await this.stamp.touch(
				{
					companyId: outcome.companyId,
					contactId: outcome.contactId,
					dealId: outcome.dealId,
				},
				new Date(),
			);
			this.logger.log({
				message: "Public tender-request filed",
				dealId: outcome.dealId,
				externalId: body.externalId,
			});
		}

		return {
			ok: true,
			created: outcome.created,
			dealId: outcome.dealId,
			companyId: outcome.companyId,
			contactId: outcome.contactId,
			externalId: body.externalId,
		};
	}

	async auditRequest(
		body: AuditRequestBody,
		rateBucket: string,
	): Promise<TenderRequestResult> {
		const title = body.title.trim().startsWith("[AUDIT]")
			? body.title.trim()
			: `[AUDIT] ${body.title.trim()}`;
		const description = [
			body.auditType?.trim() ? `Type audit: ${body.auditType.trim()}` : null,
			body.description?.trim() || null,
		]
			.filter(Boolean)
			.join("\n\n");

		return this.tenderRequest(
			{
				externalId: body.externalId,
				companyName: body.companyName,
				companyDomain: body.companyDomain,
				contact: body.contact,
				title,
				description: description || undefined,
				honeypot: body.honeypot,
			},
			rateBucket,
		);
	}

	async contactRequest(
		body: ContactRequestBody,
		rateBucket: string,
	): Promise<ContactRequestResult> {
		if (body.honeypot) {
			throw new BadRequestException("Rejected");
		}

		this.assertRateLimit(rateBucket);

		const email = normalizeEmail(body.contact.email);
		if (!email) {
			throw new BadRequestException("Invalid email");
		}

		const existing = await this.findContactActivityByExternal(body.externalId);
		if (existing) {
			return {
				ok: true,
				created: false,
				contactId: existing.contactId ?? "",
				activityId: existing.id,
				externalId: body.externalId,
			};
		}

		const ownerId = await this.resolveOwnerId();
		const now = new Date();
		const activityBody = [
			body.companyName?.trim() ? `Société: ${body.companyName.trim()}` : null,
			body.message.trim(),
		]
			.filter(Boolean)
			.join("\n\n");

		const outcome = await this.agent.withCrmEvents(async (tx, emit) => {
			await lockIdempotencyKey(
				tx,
				`public-contact:${GSMS_PUBLIC_SOURCE_SYSTEM}:${body.externalId}`,
			);

			const raced = await this.findContactActivityByExternal(
				body.externalId,
				tx,
			);
			if (raced) {
				return {
					created: false as const,
					contactId: raced.contactId ?? "",
					activityId: raced.id,
				};
			}

			let contactCreated = false;
			let contact = await tx.contact.findFirst({
				where: { email, archivedAt: null },
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					companyId: true,
				},
			});

			if (!contact) {
				contact = await tx.contact.create({
					data: {
						firstName: body.contact.firstName.trim(),
						lastName: body.contact.lastName?.trim() || null,
						email,
						phone: body.contact.phone?.trim() || null,
						ownerId,
						source: RecordSource.MANUAL,
						lastActivityAt: now,
					},
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						companyId: true,
					},
				});
				contactCreated = true;
				await this.stampContactSource(tx, contact.id, `ct_${body.externalId}`);
				await emit({
					type: "contact.created",
					record: { kind: "contact", id: contact.id },
					occurredAt: now,
					data: {
						firstName: contact.firstName,
						lastName: contact.lastName,
						email: contact.email,
						companyId: contact.companyId,
						source: "FORM",
					},
				});
			}

			const activity = await tx.activity.create({
				data: {
					type: ActivityType.NOTE,
					subject: body.subject?.trim() || "Message contact (vitrine)",
					body: activityBody,
					contactId: contact.id,
					companyId: contact.companyId,
					occurredAt: now,
					createdById: ownerId,
					meta: {
						automated: true,
						source: "gsms-public",
						channel: "contact",
						externalId: body.externalId,
					},
				},
				select: { id: true },
			});

			return {
				created: true as const,
				contactId: contact.id,
				activityId: activity.id,
				contactCreated,
			};
		});

		if (outcome.created) {
			if ("contactCreated" in outcome && outcome.contactCreated) {
				await this.agent.contactCreated(
					outcome.contactId,
					"Created from GSMS Public contact form",
				);
			}
			await this.stamp.touch({ contactId: outcome.contactId }, new Date());
			this.logger.log({
				message: "Public contact form filed",
				activityId: outcome.activityId,
				externalId: body.externalId,
			});
		}

		return {
			ok: true,
			created: outcome.created,
			contactId: outcome.contactId,
			activityId: outcome.activityId,
			externalId: body.externalId,
		};
	}

	private async findContactActivityByExternal(
		externalId: string,
		tx: Db | Prisma.TransactionClient = this.db,
	): Promise<{ id: string; contactId: string | null } | null> {
		const activity = await tx.activity.findFirst({
			where: {
				meta: {
					path: ["externalId"],
					equals: externalId,
				},
				AND: [{ meta: { path: ["channel"], equals: "contact" } }],
			},
			select: { id: true, contactId: true },
		});
		return activity;
	}

	private async findDealByExternal(
		externalId: string,
		tx: Db | Prisma.TransactionClient = this.db,
	): Promise<DealLookup | null> {
		const rows = await tx.$queryRaw<DealLookup[]>`
			SELECT d.id, d."companyId", dc."contactId"
			FROM deal d
			LEFT JOIN "dealContact" dc ON dc."dealId" = d.id
			WHERE d."sourceSystem" = ${GSMS_PUBLIC_SOURCE_SYSTEM}
			  AND d."externalId" = ${externalId}
			  AND d."archivedAt" IS NULL
			LIMIT 1
		`;
		return rows[0] ?? null;
	}

	private async stampCompanySource(
		tx: Prisma.TransactionClient,
		id: string,
		externalId: string,
	): Promise<void> {
		await tx.$executeRaw`
			UPDATE company
			SET source = 'FORM'::"RecordSource",
			    "sourceSystem" = ${GSMS_PUBLIC_SOURCE_SYSTEM},
			    "externalId" = ${externalId}
			WHERE id = ${id}
		`;
	}

	private async stampContactSource(
		tx: Prisma.TransactionClient,
		id: string,
		externalId: string,
	): Promise<void> {
		await tx.$executeRaw`
			UPDATE contact
			SET source = 'FORM'::"RecordSource",
			    "sourceSystem" = ${GSMS_PUBLIC_SOURCE_SYSTEM},
			    "externalId" = ${externalId}
			WHERE id = ${id}
		`;
	}

	private async stampDealSource(
		tx: Prisma.TransactionClient,
		dealId: string,
		externalId: string,
	): Promise<void> {
		await tx.$executeRaw`
			UPDATE deal
			SET source = 'FORM'::"RecordSource",
			    "sourceSystem" = ${GSMS_PUBLIC_SOURCE_SYSTEM},
			    "externalId" = ${externalId}
			WHERE id = ${dealId}
		`;
	}

	private async resolveOwnerId(): Promise<string> {
		const owner = await this.db.member.findFirst({
			where: { organizationId: WORKSPACE_ID, role: "owner" },
			select: { userId: true },
			orderBy: { createdAt: "asc" },
		});
		if (owner) return owner.userId;

		const any = await this.db.member.findFirst({
			where: { organizationId: WORKSPACE_ID },
			select: { userId: true },
			orderBy: { createdAt: "asc" },
		});
		if (!any) {
			throw new ServiceUnavailableException(
				"No workspace member to own public deals — create a CRM user first",
			);
		}
		return any.userId;
	}
}
