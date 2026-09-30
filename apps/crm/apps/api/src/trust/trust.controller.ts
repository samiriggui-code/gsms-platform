import {
	Controller,
	Get,
	Logger,
	Query,
} from "@nestjs/common";
import {
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
type Finding = {
	id: string;
	source: string;
	status: string;
	category: string;
	control_ref: string;
	title: string;
	client_id: string;
	severity?: string;
};

@ApiTags("Trust")
@Controller("api/trust")
export class TrustController {
	private readonly logger = new Logger(TrustController.name);

	@Get("findings")
	@ApiOperation({
		summary: "Aggregate circuit findings (Grace + QAtrial) for Trust Center",
	})
	@ApiOkResponse({ description: "Findings envelope" })
	async findings(
		@Query("status") status?: string,
		@Query("limit") limitRaw?: string,
	) {
		const limit = Math.min(Number(limitRaw) || 200, 500);
		const graceUrl = process.env.GRACE_API_URL?.trim();
		const graceToken = process.env.GRACE_API_TOKEN?.trim();
		const qatrialUrl = process.env.QATRIAL_API_URL?.trim();
		const qatrialToken = process.env.QATRIAL_API_TOKEN?.trim();

		const findings: Finding[] = [];
		const errors: string[] = [];

		if (!graceUrl && !qatrialUrl) {
			return {
				generatedAt: new Date().toISOString(),
				count: 0,
				open_count: 0,
				conforme_count: 0,
				configured: false,
				errors: [
					"Aucun backend findings : définir GRACE_API_URL et/ou QATRIAL_API_URL sur l’API CRM (ex. Grace local http://localhost:3011).",
				],
				findings: [],
			};
		}

		const pull = async (
			base: string,
			token: string | undefined,
			path: string,
			extra: Record<string, string>,
		) => {
			const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
			if (status) url.searchParams.set("status", status);
			url.searchParams.set("limit", String(limit));
			for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
			const headers: Record<string, string> = { Accept: "application/json" };
			if (token) headers.Authorization = `Bearer ${token}`;
			const res = await fetch(url, {
				headers,
				signal: AbortSignal.timeout(15_000),
			});
			if (!res.ok) throw new Error(`${url.href} → ${res.status}`);
			const body = (await res.json()) as { findings?: Finding[] };
			return body.findings ?? [];
		};

		if (graceUrl) {
			try {
				findings.push(
					...(await pull(graceUrl, graceToken, "api/findings", {
						includeCyber: "1",
					})),
				);
			} catch (err) {
				this.logger.warn(err);
				errors.push(err instanceof Error ? err.message : String(err));
			}
		}
		if (qatrialUrl) {
			try {
				findings.push(
					...(await pull(qatrialUrl, qatrialToken, "api/findings", {})),
				);
			} catch (err) {
				this.logger.warn(err);
				errors.push(err instanceof Error ? err.message : String(err));
			}
		}

		const open = findings.filter(
			(f) =>
				f.status === "non_conforme" ||
				f.status === "en_cours" ||
				f.status === "a_verifier",
		);

		return {
			generatedAt: new Date().toISOString(),
			count: findings.length,
			open_count: open.length,
			conforme_count: findings.filter((f) => f.status === "conforme").length,
			configured: true,
			errors: errors.length ? errors : undefined,
			findings: findings.slice(0, limit),
		};
	}
}
