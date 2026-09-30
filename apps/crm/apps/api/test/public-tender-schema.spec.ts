import { describe, expect, test } from "bun:test";
import { tenderRequestBodySchema } from "../src/public/public.schemas";

describe("tenderRequestBodySchema", () => {
	test("accepts a minimal AO request", () => {
		const parsed = tenderRequestBodySchema.parse({
			externalId: "pub_tender_001",
			companyName: "Acme SA",
			contact: {
				email: "buyer@acme.example",
				firstName: "Ada",
			},
			title: "CCTP cybersécurité",
		});
		expect(parsed.externalId).toBe("pub_tender_001");
	});

	test("rejects honeypot filled", () => {
		const result = tenderRequestBodySchema.safeParse({
			externalId: "x",
			companyName: "Acme",
			contact: { email: "a@b.co", firstName: "A" },
			title: "T",
			honeypot: "bot",
		});
		expect(result.success).toBe(false);
	});
});
