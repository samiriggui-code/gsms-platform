import { describe, expect, it } from "bun:test";
import { gsmsSsoCredentials, isGsmsSsoConfigured } from "../src/env";
import {
	gsmsSignInDecision,
	gsmsWellKnownUrl,
	parseGsmsRole,
	resolveGsmsRole,
} from "../src/gsms-sso";

describe("gsmsSsoCredentials", () => {
	it("is off without an issuer or a secret", () => {
		expect(gsmsSsoCredentials({})).toBeUndefined();
		expect(
			gsmsSsoCredentials({ GSMS_SSO_ISSUER: "https://gsms.test" }),
		).toBeUndefined();
		expect(
			gsmsSsoCredentials({ GSMS_SSO_CLIENT_SECRET: "s3cret" }),
		).toBeUndefined();
		expect(
			isGsmsSsoConfigured({
				GSMS_SSO_ISSUER: " ",
				GSMS_SSO_CLIENT_SECRET: "x",
			}),
		).toBe(false);
	});

	it("defaults the client id to crm and trims the issuer", () => {
		expect(
			gsmsSsoCredentials({
				GSMS_SSO_ISSUER: "https://gsms.test/",
				GSMS_SSO_CLIENT_SECRET: "s3cret",
			}),
		).toEqual({
			issuer: "https://gsms.test",
			clientId: "crm",
			clientSecret: "s3cret",
		});
	});

	it("keeps an explicit client id", () => {
		expect(
			gsmsSsoCredentials({
				GSMS_SSO_ISSUER: "https://gsms.test",
				GSMS_SSO_CLIENT_ID: "crm-staging",
				GSMS_SSO_CLIENT_SECRET: "s3cret",
			})?.clientId,
		).toBe("crm-staging");
	});
});

describe("gsmsWellKnownUrl", () => {
	it("hangs the discovery document off the issuer", () => {
		expect(gsmsWellKnownUrl("https://gsms.test/")).toBe(
			"https://gsms.test/.well-known/openid-configuration",
		);
	});
});

describe("parseGsmsRole", () => {
	it("accepts the three CRM roles", () => {
		expect(parseGsmsRole("owner")).toBe("owner");
		expect(parseGsmsRole("admin")).toBe("admin");
		expect(parseGsmsRole(" Member ")).toBe("member");
	});

	it("refuses anything else", () => {
		expect(parseGsmsRole("viewer")).toBeNull();
		expect(parseGsmsRole("ADMIN_GRACE")).toBeNull();
		expect(parseGsmsRole("")).toBeNull();
		expect(parseGsmsRole(undefined)).toBeNull();
		expect(parseGsmsRole(["owner"])).toBeNull();
	});
});

describe("gsmsSignInDecision", () => {
	const claims = {
		sub: "core-42",
		email: "Alice@GSMS-Security.com ",
		name: "Alice Martin",
		gsms_role: "admin",
	};

	it("maps the id_token claims to a CRM identity", () => {
		expect(gsmsSignInDecision(claims)).toEqual({
			ok: true,
			identity: {
				sub: "core-42",
				email: "alice@gsms-security.com",
				name: "Alice Martin",
				role: "admin",
			},
		});
	});

	it("falls back to the email local part when there is no name", () => {
		const decision = gsmsSignInDecision({ ...claims, name: undefined });
		expect(decision.ok && decision.identity.name).toBe("alice");
	});

	it("refuses a profile without an email", () => {
		expect(gsmsSignInDecision({ ...claims, email: undefined })).toEqual({
			ok: false,
			reason: "invalid_profile",
		});
		expect(gsmsSignInDecision({ ...claims, email: "not-an-email" })).toEqual({
			ok: false,
			reason: "invalid_profile",
		});
		expect(gsmsSignInDecision(undefined)).toEqual({
			ok: false,
			reason: "invalid_profile",
		});
	});

	it("refuses a missing or unknown gsms_role", () => {
		expect(gsmsSignInDecision({ ...claims, gsms_role: undefined })).toEqual({
			ok: false,
			reason: "invalid_role",
		});
		expect(gsmsSignInDecision({ ...claims, gsms_role: "viewer" })).toEqual({
			ok: false,
			reason: "invalid_role",
		});
	});
});

describe("resolveGsmsRole", () => {
	it("applies the claimed role", () => {
		expect(
			resolveGsmsRole({ current: "member", claimed: "admin", ownerCount: 1 }),
		).toEqual({ role: "admin", keptLastOwner: false });
		expect(
			resolveGsmsRole({ current: null, claimed: "member", ownerCount: 0 }),
		).toEqual({ role: "member", keptLastOwner: false });
	});

	it("demotes an owner when another owner remains", () => {
		expect(
			resolveGsmsRole({ current: "owner", claimed: "member", ownerCount: 2 }),
		).toEqual({ role: "member", keptLastOwner: false });
	});

	it("keeps the last owner", () => {
		expect(
			resolveGsmsRole({ current: "owner", claimed: "admin", ownerCount: 1 }),
		).toEqual({ role: "owner", keptLastOwner: true });
	});
});
