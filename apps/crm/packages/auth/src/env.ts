import "@crm/env/load";

const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_MICROSOFT_TENANT = "common";

const optional = (key: string): string | undefined => {
	const value = process.env[key];
	return value && value.length > 0 ? value : undefined;
};

const pair = (
	idKey: string,
	secretKey: string,
): { clientId: string; clientSecret: string } | undefined => {
	const clientId = optional(idKey);
	const clientSecret = optional(secretKey);

	if (!clientId || !clientSecret) {
		if (clientId || clientSecret) {
			throw new Error(`${idKey} and ${secretKey} must be set together.`);
		}
		return undefined;
	}

	return { clientId, clientSecret };
};

export const googleCredentials = ():
	| { clientId: string; clientSecret: string }
	| undefined => pair("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");

export const microsoftCredentials = ():
	| { clientId: string; clientSecret: string; tenantId: string }
	| undefined => {
	const credentials = pair("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET");
	if (!credentials) return undefined;

	return {
		...credentials,
		tenantId: optional("MICROSOFT_TENANT_ID") ?? DEFAULT_MICROSOFT_TENANT,
	};
};

export const slackCredentials = ():
	| { clientId: string; clientSecret: string }
	| undefined => pair("SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET");

const GSMS_DEFAULT_CLIENT_ID = "crm";

type EnvSource = Record<string, string | undefined>;

const fromSource = (source: EnvSource, key: string): string | undefined => {
	const value = source[key]?.trim();
	return value ? value : undefined;
};

export const gsmsSsoCredentials = (
	source: EnvSource = process.env,
): { issuer: string; clientId: string; clientSecret: string } | undefined => {
	const issuer = fromSource(source, "GSMS_SSO_ISSUER")?.replace(/\/+$/, "");
	const clientSecret = fromSource(source, "GSMS_SSO_CLIENT_SECRET");

	if (!issuer || !clientSecret) return undefined;

	return {
		issuer,
		clientId: fromSource(source, "GSMS_SSO_CLIENT_ID") ?? GSMS_DEFAULT_CLIENT_ID,
		clientSecret,
	};
};

export function isGsmsSsoConfigured(source: EnvSource = process.env): boolean {
	return gsmsSsoCredentials(source) !== undefined;
}

const apiUrl =
	optional("API_URL") ?? optional("BETTER_AUTH_URL") ?? DEFAULT_API_URL;

const appUrls = (optional("APP_URL") ?? DEFAULT_APP_URL)
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const appUrl = appUrls[0] ?? DEFAULT_APP_URL;

export const env = {
	apiUrl,
	appUrl,
	google: googleCredentials(),
	microsoft: microsoftCredentials(),
	slack: slackCredentials(),
	cookieDomain: optional("AUTH_COOKIE_DOMAIN"),
	trustedOrigins: [...new Set([...appUrls, apiUrl])],
	isProduction: process.env.NODE_ENV === "production",
	nextAuthSecret: optional("NEXTAUTH_SECRET"),
} as const;

export function isGoogleConfigured(): boolean {
	return env.google !== undefined;
}

export function isMicrosoftConfigured(): boolean {
	return env.microsoft !== undefined;
}

export function isSlackConfigured(): boolean {
	return env.slack !== undefined;
}

export { apiUrl, appUrl };
