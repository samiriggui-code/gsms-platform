import { describe, expect, test } from "bun:test";
import { contactRequestBodySchema } from "../src/public/public.schemas";

describe("contactRequestBodySchema", () => {
	test("accepts a minimal contact message", () => {
		const parsed = contactRequestBodySchema.parse({
			externalId: "pub_contact_001",
			contact: {
				email: "prospect@acme.example",
				firstName: "Ada",
			},
			message: "Bonjour, je souhaite un devis pour un audit incendie.",
		});
		expect(parsed.externalId).toBe("pub_contact_001");
	});

	test("accepts optional companyName and subject", () => {
		const parsed = contactRequestBodySchema.parse({
			externalId: "pub_contact_002",
			contact: {
				email: "prospect@acme.example",
				firstName: "Ada",
				lastName: "Lovelace",
				phone: "+33600000000",
			},
			companyName: "Acme SA",
			subject: "Demande de devis",
			message: "Message complet.",
		});
		expect(parsed.companyName).toBe("Acme SA");
	});

	test("rejects a missing message", () => {
		const result = contactRequestBodySchema.safeParse({
			externalId: "x",
			contact: { email: "a@b.co", firstName: "A" },
		});
		expect(result.success).toBe(false);
	});

	test("rejects honeypot filled", () => {
		const result = contactRequestBodySchema.safeParse({
			externalId: "x",
			contact: { email: "a@b.co", firstName: "A" },
			message: "spam",
			honeypot: "bot",
		});
		expect(result.success).toBe(false);
	});
});
