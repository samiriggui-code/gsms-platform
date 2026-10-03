import { NextResponse, type NextRequest } from "next/server";
import { coreFetch, type CoreRequest } from "@/lib/core/client";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Passerelle authentifiée navigateur → Core pour les vues interactives
 * (futur TanStack Query côté client). Le navigateur n'apprend jamais
 * CORE_API_URL ni le jeton : on relaie avec le cookie httpOnly.
 * Seuls les préfixes listés sont autorisés.
 */
const ALLOWED_PREFIXES = ["auth/me", "workspaces/", "vault/tree", "admin/", "communications"];

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });

  const { path } = await params;
  if (path.some((segment) => segment === "." || segment === ".." || segment === "")) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }
  const joined = path.map(encodeURIComponent).join("/");
  if (!ALLOWED_PREFIXES.some((prefix) => joined === prefix || joined.startsWith(prefix))) {
    return NextResponse.json({ error: "Endpoint non autorisé." }, { status: 404 });
  }

  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown;
  if (request.method !== "GET" && request.method !== "DELETE") {
    body = await request.json().catch(() => undefined);
  }

  const result = await coreFetch<unknown>(`/${joined}`, {
    method: request.method as CoreRequest["method"],
    token,
    query,
    body,
    workspaceId: request.headers.get("x-gsms-workspace-id"),
    missionId: request.headers.get("x-gsms-mission-id"),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, kind: result.kind },
      { status: result.kind === "not_configured" ? 503 : result.status },
    );
  }
  return NextResponse.json(result.data, { status: result.status === 204 ? 200 : result.status });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
