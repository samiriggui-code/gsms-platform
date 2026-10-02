import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_SESSION_MAX_AGE, SESSION_COOKIE, WORKSPACE_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * POST /api/session/workspace {workspaceId} — mémorise le site courant.
 * Simple préférence d'affichage : le Core revérifie le membership à chaque appel.
 */
export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.json({ error: "Session absente." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { workspaceId?: unknown };
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  if (!/^[\w-]{1,128}$/.test(workspaceId)) {
    return NextResponse.json({ error: "Identifiant de site invalide." }, { status: 422 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WORKSPACE_COOKIE, workspaceId, sessionCookieOptions(DEFAULT_SESSION_MAX_AGE));
  return response;
}
