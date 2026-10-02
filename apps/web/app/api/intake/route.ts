import { NextResponse } from "next/server";
import { coreFetch } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

const TYPES = new Set(["audit", "ao", "contact"]);
const FIELDS = [
  "type", "cta", "offer", "etablissement", "firstName", "lastName", "email", "phone",
  "companyName", "title", "subject", "echeanceCommission", "referenceAo", "message",
] as const;
const MAX_LEN = 5000;

/**
 * POST /api/intake — formulaire public /demande.
 * Relaie vers Core POST /api/v1/intake (anonyme, idempotent).
 * Si le Core est injoignable : 503 avec un message explicite.
 */
export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Pot de miel anti-robots : on répond comme si tout allait bien.
  if (typeof raw.honeypot === "string" && raw.honeypot.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const payload: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = raw[field];
    if (typeof value === "string" && value.trim() !== "") payload[field] = value.trim().slice(0, MAX_LEN);
  }

  const type = payload.type ?? "audit";
  if (!TYPES.has(type)) return NextResponse.json({ error: "Type de demande inconnu." }, { status: 400 });
  payload.type = type;
  if (!payload.firstName) return NextResponse.json({ error: "Le prénom est requis." }, { status: 422 });
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 422 });
  }
  if (type !== "contact" && !payload.companyName) {
    return NextResponse.json({ error: "Indiquez votre organisation ou établissement." }, { status: 422 });
  }
  if (type === "contact" && !payload.message) {
    return NextResponse.json({ error: "Le message est requis." }, { status: 422 });
  }

  const idempotencyKey =
    typeof raw.requestId === "string" && /^[\w-]{8,64}$/.test(raw.requestId) ? raw.requestId : crypto.randomUUID();

  const result = await coreFetch<{ id?: string; status?: string }>(ENDPOINTS.public.intake(), {
    method: "POST",
    body: { ...payload, source: "web" },
    token: null,
    idempotencyKey,
  });

  if (!result.ok) {
    if (result.kind === "unavailable" || result.kind === "not_configured") {
      return NextResponse.json(
        {
          error:
            "Notre service de demandes est momentanément indisponible. Votre demande n'a pas été transmise : merci de réessayer dans quelques minutes.",
          code: "core_unavailable",
        },
        { status: 503 },
      );
    }
    if (result.kind === "invalid") {
      return NextResponse.json({ error: result.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Envoi impossible. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: result.data?.id ?? null }, { status: 202 });
}
