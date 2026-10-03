import { NextResponse, type NextRequest } from "next/server";
import { coreBaseUrl } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { SESSION_COOKIE } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Téléchargement d'une pièce du coffre-fort : le Core déchiffre et journalise l'accès ; le flux est relayé
 * tel quel (aucune copie côté web). Le navigateur n'apprend ni CORE_API_URL ni le jeton.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ws: string; id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });
  const { ws, id } = await params;
  if (!UUID.test(ws) || !UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const base = coreBaseUrl();
  if (!base) return NextResponse.json({ error: "Core non configuré." }, { status: 503 });

  const url = new URL(`${base}/api/v1${ENDPOINTS.vault.content(ws, id)}`);
  const version = request.nextUrl.searchParams.get("version_id");
  if (version && UUID.test(version)) url.searchParams.set("version_id", version);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "X-GSMS-Workspace-Id": ws },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Le Core est injoignable." }, { status: 503 });
  }
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Pièce indisponible." }, { status: res.status === 404 ? 404 : res.status || 502 });
  }
  const download = request.nextUrl.searchParams.get("download") === "1";
  const disposition = res.headers.get("content-disposition") ?? "inline";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": download ? disposition.replace(/^inline/, "attachment") : disposition,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
