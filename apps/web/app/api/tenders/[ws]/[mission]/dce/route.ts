import { NextResponse, type NextRequest } from "next/server";
import { coreBaseUrl } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { SESSION_COOKIE } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Dépôt du DCE d'un dossier AO : relaie les fichiers (ou le ZIP) au Core, qui les chiffre, les range dans
 * « Dossier de consultation » et lance leur analyse (Docling puis Digest).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ ws: string; mission: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });
  const { ws, mission } = await params;
  if (!UUID.test(ws) || !UUID.test(mission)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const base = coreBaseUrl();
  if (!base) return NextResponse.json({ error: "Core non configuré." }, { status: 503 });

  const incoming = await request.formData().catch(() => null);
  const files = (incoming?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  const form = new FormData();
  for (const file of files) form.append("files", file, file.name);

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${ENDPOINTS.tenders.dce(ws, mission)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-GSMS-Workspace-Id": ws, "X-GSMS-Mission-Id": mission },
      body: form,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Le Core est injoignable." }, { status: 503 });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : `Dépôt refusé (${res.status}).`;
    return NextResponse.json({ error: detail }, { status: res.status });
  }
  return NextResponse.json(body, { status: 201 });
}
