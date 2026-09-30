import { createHash } from "node:crypto";
import { isMirrored } from "./images";
import { safeFetch } from "./safe-fetch";

export { isMirrored, isOptimizable } from "./images";

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

type ExtensionByMediaType = Record<string, string>;

const ALLOWED: ExtensionByMediaType = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"image/avif": "avif",
	"image/svg+xml": "svg",
	"image/x-icon": "ico",
	"image/vnd.microsoft.icon": "ico",
};

type S3Config = {
	endpoint: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	publicUrl: string;
	region: string;
};

function vercelBlobToken(): string | undefined {
	return process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

function s3Config(): S3Config | undefined {
	const endpoint = process.env.S3_ENDPOINT?.trim();
	const bucket = process.env.S3_BUCKET?.trim();
	const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
	const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
	const publicUrl = process.env.S3_PUBLIC_URL?.trim();

	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
		return undefined;
	}

	return {
		endpoint,
		bucket,
		accessKeyId,
		secretAccessKey,
		publicUrl,
		region: process.env.S3_REGION?.trim() || "auto",
	};
}

export function blobEnabled(): boolean {
	return Boolean(vercelBlobToken()) || Boolean(s3Config());
}

export async function mirror(
	sourceUrl: string,
	prefix: string,
): Promise<string | null> {
	if (!blobEnabled()) return null;
	if (isMirrored(sourceUrl)) return sourceUrl;

	try {
		const result = await safeFetch(sourceUrl, { timeoutMs: TIMEOUT_MS });
		if (!result?.response.ok) return null;

		const { response } = result;
		const type = response.headers.get("content-type")?.split(";")[0]?.trim();
		const extension = type ? ALLOWED[type.toLowerCase()] : undefined;
		if (!type || !extension) return null;

		const bytes = await readCapped(response);
		if (!bytes) return null;

		const digest = createHash("sha256")
			.update(bytes)
			.digest("hex")
			.slice(0, 12);

		const key = `${prefix}-${digest}.${extension}`;

		return vercelBlobToken()
			? await putVercelBlob(key, bytes, type)
			: await putS3Blob(key, bytes, type);
	} catch {
		return null;
	}
}

async function putVercelBlob(
	key: string,
	bytes: Buffer,
	type: string,
): Promise<string> {
	const { put } = await import("@vercel/blob");

	const blob = await put(key, bytes, {
		access: "public",
		contentType: type,
		addRandomSuffix: false,
		allowOverwrite: true,
	});

	return blob.url;
}

async function putS3Blob(
	key: string,
	bytes: Buffer,
	type: string,
): Promise<string | null> {
	const config = s3Config();
	if (!config) return null;

	const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

	const client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		forcePathStyle: true,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});

	await client.send(
		new PutObjectCommand({
			Bucket: config.bucket,
			Key: key,
			Body: bytes,
			ContentType: type,
		}),
	);

	return `${config.publicUrl}/${key}`;
}

async function readCapped(response: Response): Promise<Buffer | null> {
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > MAX_BYTES) {
		await response.body?.cancel();
		return null;
	}

	if (!response.body) return null;

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	try {
		while (size <= MAX_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			chunks.push(value);
		}
	} catch {
		return null;
	} finally {
		await reader.cancel().catch(() => {});
	}

	if (size === 0 || size > MAX_BYTES) return null;
	return Buffer.concat(chunks);
}
