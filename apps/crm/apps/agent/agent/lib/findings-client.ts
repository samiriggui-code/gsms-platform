/**
 * HTTP client for Grace / QAtrial findings exports (circuit contract).
 * Env (optional): GRACE_API_URL, GRACE_API_TOKEN, QATRIAL_API_URL, QATRIAL_API_TOKEN.
 */

export type FindingSource = "grace" | "qatrial" | "module-cyber" | "tenderai";

export type CircuitFinding = {
	version: string;
	id: string;
	source: FindingSource;
	category: string;
	status: string;
	severity?: string;
	client_id: string;
	site_id?: string;
	control_ref: string;
	title: string;
	description?: string;
	created_at: string;
	metadata?: Record<string, unknown>;
};

type Envelope = {
	source: string;
	generatedAt: string;
	count: number;
	findings: CircuitFinding[];
};

function trim(v: string | undefined): string | undefined {
	const t = v?.trim();
	return t ? t : undefined;
}

async function fetchEnvelope(
	baseUrl: string | undefined,
	token: string | undefined,
	path: string,
	search: Record<string, string | undefined>,
): Promise<Envelope | null> {
	if (!baseUrl) return null;
	const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
	for (const [k, v] of Object.entries(search)) {
		if (v) url.searchParams.set(k, v);
	}
	const headers: Record<string, string> = { Accept: "application/json" };
	if (token) headers.Authorization = `Bearer ${token}`;
	const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
	if (!res.ok) {
		throw new Error(`${url.origin}${url.pathname} → HTTP ${res.status}`);
	}
	return (await res.json()) as Envelope;
}

export type QueryFindingsInput = {
	sources?: FindingSource[];
	status?: string;
	category?: string;
	clientId?: string;
	limit?: number;
	includeCyber?: boolean;
};

export async function queryFindings(input: QueryFindingsInput = {}): Promise<{
	generatedAt: string;
	count: number;
	findings: CircuitFinding[];
	errors: string[];
	configured: { grace: boolean; qatrial: boolean };
}> {
	const graceUrl = trim(process.env.GRACE_API_URL);
	const graceToken = trim(process.env.GRACE_API_TOKEN);
	const qatrialUrl = trim(process.env.QATRIAL_API_URL);
	const qatrialToken = trim(process.env.QATRIAL_API_TOKEN);

	const want = new Set(
		input.sources?.length
			? input.sources
			: (["grace", "qatrial", "module-cyber"] as FindingSource[]),
	);
	const limit = input.limit ?? 200;
	const errors: string[] = [];
	const findings: CircuitFinding[] = [];

	const fetchGrace =
		want.has("grace") || (input.includeCyber !== false && want.has("module-cyber"));
	if (fetchGrace && graceUrl) {
		try {
			const env = await fetchEnvelope(graceUrl, graceToken, "api/findings", {
				status: input.status,
				category: input.category,
				includeCyber:
					want.has("module-cyber") || input.includeCyber !== false
						? "1"
						: "0",
				limit: String(limit),
			});
			if (env) {
				for (const f of env.findings) {
					if (!want.has(f.source)) continue;
					if (input.clientId && f.client_id !== input.clientId) continue;
					findings.push(f);
				}
			}
		} catch (err) {
			errors.push(err instanceof Error ? err.message : String(err));
		}
	} else if (fetchGrace && !graceUrl) {
		errors.push("GRACE_API_URL not set");
	}

	if (want.has("qatrial") && qatrialUrl) {
		try {
			const env = await fetchEnvelope(qatrialUrl, qatrialToken, "api/findings", {
				status: input.status,
				category: input.category,
				limit: String(limit),
			});
			if (env) {
				for (const f of env.findings) {
					if (input.clientId && f.client_id !== input.clientId) continue;
					findings.push(f);
				}
			}
		} catch (err) {
			errors.push(err instanceof Error ? err.message : String(err));
		}
	} else if (want.has("qatrial") && !qatrialUrl) {
		errors.push("QATRIAL_API_URL not set");
	}

	return {
		generatedAt: new Date().toISOString(),
		count: findings.length,
		findings: findings.slice(0, limit),
		errors,
		configured: { grace: Boolean(graceUrl), qatrial: Boolean(qatrialUrl) },
	};
}
