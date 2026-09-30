import createNextIntlPlugin from "next-intl/plugin";
import { loadRootEnv } from "@crm/env";
import type { NextConfig } from "next";

loadRootEnv();

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const apiUrl =
	process.env.API_URL ??
	process.env.NEXT_PUBLIC_API_URL ??
	"http://localhost:3001";

const allowedDevOrigins = (process.env.APP_URL ?? "")
	.split(",")
	.flatMap((origin) => {
		try {
			return [new URL(origin.trim()).hostname];
		} catch {
			return [];
		}
	});

const selfHostedBlobPattern = (() => {
	const publicUrl = process.env.S3_PUBLIC_URL?.trim();
	if (!publicUrl) return [];

	try {
		const { protocol, hostname } = new URL(publicUrl);
		return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname }];
	} catch {
		return [];
	}
})();

const nextConfig: NextConfig = {
	allowedDevOrigins,

	env: {
		NEXT_PUBLIC_API_URL: apiUrl,
	},

	transpilePackages: ["@crm/auth", "@crm/db", "@crm/telemetry", "@crm/ui"],

	serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "**.blob.vercel-storage.com" },
			...selfHostedBlobPattern,
		],
	},

	cacheComponents: true,
	partialPrefetching: true,
};

export default withNextIntl(nextConfig);
