import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import {
	describeForward,
	fieldMap,
	gsmsCoreConfig,
	signBody,
} from "../agent/lib/gsms-core";

describe("the GSMS Core bridge", () => {
	it("stays off until both the portal and the secret are set", () => {
		expect(gsmsCoreConfig({})).toBeNull();
		expect(
			gsmsCoreConfig({ GSMS_CORE_URL: "https://gsms.example" }),
		).toBeNull();
		expect(
			gsmsCoreConfig({
				GSMS_CORE_URL: "https://gsms.example/",
				GSMS_CORE_WEBHOOK_SECRET: " s3cret ",
			}),
		).toEqual({ url: "https://gsms.example", secret: "s3cret" });
	});

	it("signs the raw body the way the Core verifies it", () => {
		const body = '{"type":"deal.closed"}';
		const expected = createHmac("sha256", "s3cret").update(body).digest("hex");
		expect(signBody("s3cret", body)).toBe(`sha256=${expected}`);
	});

	it("sends option labels, numbers and dates the Core can read", () => {
		const field = (key: string, type: string) => ({ key, type });
		const empty = {
			text: null,
			number: null,
			date: null,
			bool: null,
			option: null,
		};
		expect(
			fieldMap([
				{
					...empty,
					field: field("type_de_mission", "SELECT"),
					option: { label: "appel-offres" },
				},
				{
					...empty,
					field: field("effectif_accueilli", "NUMBER"),
					number: { toNumber: () => 850 },
				},
				{
					...empty,
					field: field("ch_ance_commission", "DATE"),
					date: new Date("2027-03-16T00:00:00Z"),
				},
				{ ...empty, field: field("siret", "TEXT"), text: "12345678900012" },
			]),
		).toEqual({
			type_de_mission: "appel-offres",
			effectif_accueilli: 850,
			ch_ance_commission: "2027-03-16T00:00:00.000Z",
			siret: "12345678900012",
		});
	});

	it("says what happened on the task line", () => {
		expect(
			describeForward({
				outcome: "skipped",
				reason: "GSMS Core is not configured.",
			}),
		).toContain("not configured");
		expect(
			describeForward({
				outcome: "sent",
				workspace: {
					id: "w",
					name: "AO",
					url: "https://gsms.example/app/espace/w",
					created: true,
				},
			}),
		).toContain("engagement opened");
		expect(describeForward({ outcome: "failed", reason: "timeout" })).toContain(
			"not synced",
		);
	});
});
