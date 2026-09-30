export const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export const COMPANY_IMAGE_FIELDS = [
	"logoUrl",
	"logoDarkUrl",
	"iconUrl",
	"iconDarkUrl",
] as const;

export type CompanyImageField = (typeof COMPANY_IMAGE_FIELDS)[number];

const OPTIMIZABLE = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

/** Substrings that mark a URL as already mirrored into our own storage — Vercel Blob's host suffix, plus a self-hosted S3/MinIO public base when configured. */
export function mirroredFragments(): string[] {
	const selfHostedBase = process.env.S3_PUBLIC_URL?.trim();
	return selfHostedBase ? [BLOB_HOST_SUFFIX, selfHostedBase] : [BLOB_HOST_SUFFIX];
}

export function isMirrored(url: string | null | undefined): boolean {
	if (!url) return false;

	try {
		const parsed = new URL(url);
		if (parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return true;

		const selfHostedBase = process.env.S3_PUBLIC_URL?.trim();
		return Boolean(selfHostedBase) && url.startsWith(selfHostedBase as string);
	} catch {
		return false;
	}
}

export function isOptimizable(url: string | null | undefined): boolean {
	if (!isMirrored(url) || !url) return false;

	try {
		const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
		return extension !== undefined && OPTIMIZABLE.has(extension);
	} catch {
		return false;
	}
}
