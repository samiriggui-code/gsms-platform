import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/env";

type IntakeType = "audit" | "ao" | "contact";

export async function POST(request: Request) {
	const key = process.env.GSMS_PUBLIC_API_KEY;
	if (!key) {
		return NextResponse.json(
			{
				error:
					"Intake public non configuré (GSMS_PUBLIC_API_KEY manquant côté app).",
			},
			{ status: 503 },
		);
	}

	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
	}

	const type = body.type as IntakeType;
	if (type !== "audit" && type !== "ao" && type !== "contact") {
		return NextResponse.json(
			{ error: "Type de demande invalide" },
			{ status: 400 },
		);
	}

	const honeypot = String(body.honeypot ?? "");
	if (honeypot.length > 0) {
		return NextResponse.json({ ok: true });
	}

	const firstName = String(body.firstName ?? "").trim();
	const lastName = String(body.lastName ?? "").trim();
	const email = String(body.email ?? "").trim();
	const phone = String(body.phone ?? "").trim() || undefined;
	const companyName = String(body.companyName ?? "").trim();
	const title = String(body.title ?? "").trim();
	const subject = String(body.subject ?? "").trim();
	const message = String(body.message ?? "").trim();
	const externalId = `web-${type}-${randomUUID()}`;

	const MISSION_TYPES: Record<IntakeType, string> = {
		audit: "audit",
		ao: "appel-offres",
		contact: "contact",
	};

	const facts: Array<[string, string]> = [
		["mission_type", MISSION_TYPES[type]],
		["etablissement_type", String(body.etablissement ?? "").trim()],
		["echeance_commission", String(body.echeanceCommission ?? "").trim()],
		["reference_ao", String(body.referenceAo ?? "").trim()],
		["cta_origine", String(body.cta ?? "").trim()],
		["offre_consultee", String(body.offer ?? "").trim()],
	];

	const factBlock = facts
		.filter(([, value]) => value.length > 0)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");

	const description = [message, factBlock ? `[GSMS_INTAKE]\n${factBlock}` : ""]
		.filter(Boolean)
		.join("\n\n");

	let path: string;
	let payload: Record<string, unknown>;

	if (type === "contact") {
		path = "/api/public/contact";
		payload = {
			externalId,
			companyName: companyName || undefined,
			subject: subject || undefined,
			message: description || "Contact depuis la vitrine GSMS",
			contact: { email, firstName, lastName: lastName || undefined, phone },
			honeypot: "",
		};
	} else if (type === "ao") {
		path = "/api/public/tender-request";
		payload = {
			externalId,
			companyName,
			title: title || "Demande accompagnement AO",
			description: description || undefined,
			contact: { email, firstName, lastName: lastName || undefined, phone },
			honeypot: "",
		};
	} else {
		path = "/api/public/audit-request";
		payload = {
			externalId,
			companyName,
			title: title || "Demande d'audit de sécurité",
			description: description || undefined,
			contact: { email, firstName, lastName: lastName || undefined, phone },
			honeypot: "",
		};
	}

	const upstream = await fetch(`${API_URL}${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-gsms-public-key": key,
		},
		body: JSON.stringify(payload),
	});

	if (!upstream.ok) {
		const text = await upstream.text().catch(() => "");
		return NextResponse.json(
			{
				error:
					upstream.status === 401
						? "Clé d'intake refusée par l'API."
						: `API intake ${upstream.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
			},
			{ status: 502 },
		);
	}

	const data = await upstream.json().catch(() => ({}));
	return NextResponse.json({ ok: true, data });
}
