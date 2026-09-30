import { z } from "zod";

export const tenderRequestBodySchema = z.object({
	externalId: z.string().min(1).max(128),
	companyName: z.string().min(1).max(200),
	companyDomain: z.string().min(1).max(200).optional(),
	contact: z.object({
		email: z.string().email().max(320),
		firstName: z.string().min(1).max(100),
		lastName: z.string().max(100).optional(),
		phone: z.string().max(40).optional(),
	}),
	title: z.string().min(1).max(300),
	description: z.string().max(8_000).optional(),
	attachments: z
		.array(
			z.object({
				name: z.string().min(1).max(255),
				contentType: z.string().max(120).optional(),
				sizeBytes: z.number().int().nonnegative().optional(),
			}),
		)
		.max(20)
		.optional(),
	expectedCloseDate: z.string().datetime().optional(),
	honeypot: z.string().max(0).optional(),
});

export type TenderRequestBody = z.infer<typeof tenderRequestBodySchema>;

export const auditRequestBodySchema = z.object({
	externalId: z.string().min(1).max(128),
	companyName: z.string().min(1).max(200),
	companyDomain: z.string().min(1).max(200).optional(),
	contact: z.object({
		email: z.string().email().max(320),
		firstName: z.string().min(1).max(100),
		lastName: z.string().max(100).optional(),
		phone: z.string().max(40).optional(),
	}),
	title: z.string().min(1).max(300),
	auditType: z.string().max(120).optional(),
	description: z.string().max(8_000).optional(),
	honeypot: z.string().max(0).optional(),
});

export type AuditRequestBody = z.infer<typeof auditRequestBodySchema>;

export const contactRequestBodySchema = z.object({
	externalId: z.string().min(1).max(128),
	contact: z.object({
		email: z.string().email().max(320),
		firstName: z.string().min(1).max(100),
		lastName: z.string().max(100).optional(),
		phone: z.string().max(40).optional(),
	}),
	companyName: z.string().max(200).optional(),
	subject: z.string().max(300).optional(),
	message: z.string().min(1).max(8_000),
	honeypot: z.string().max(0).optional(),
});

export type ContactRequestBody = z.infer<typeof contactRequestBodySchema>;
