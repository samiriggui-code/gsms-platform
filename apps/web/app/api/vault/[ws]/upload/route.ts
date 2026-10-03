import { NextResponse, type NextRequest } from "next/server";
import { coreBaseUrl } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { SESSION_COOKIE } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Dépôt dans le coffre-fort : relaie le formulaire multipart au Core, qui chiffre le fichier avec la clé de
 * la prestation, le range dans le dossier choisi et lance l'analyse (Docling puis Digest).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ ws: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });
  const { ws } = await params;
  if (!UUID.test(ws)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const base = coreBaseUrl();
  if (!base) return NextResponse.json({ error: "Core non configuré." }, { status: 503 });

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  const form = new FormData();
  form.append("file", file, file.name);
  const folder = incoming?.get("folder_id");
  if (typeof folder === "string" && UUID.test(folder)) form.append("folder_id", folder);
  form.append("analyze", "true");

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${ENDPOINTS.vault.upload(ws)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-GSMS-Workspace-Id": ws },
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
