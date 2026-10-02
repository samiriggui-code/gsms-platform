import { NextResponse, type NextRequest } from "next/server";
import { coreFetch } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { SESSION_COOKIE, WORKSPACE_COOKIE, safeNextPath } from "@/lib/session";

function clear(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}

/** POST /api/auth/logout — révoque côté Core (best effort) puis efface les cookies. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await coreFetch(ENDPOINTS.auth.logout(), { method: "POST", token, timeoutMs: 2000 });
  return clear(NextResponse.redirect(new URL("/login", request.url), 303));
}

/**
 * GET /api/auth/logout?next=… — utilisé quand le Core rejette un jeton expiré
 * (401) : on efface la session locale et on renvoie vers /login.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const url = new URL("/login", request.url);
  url.searchParams.set("next", next);
  url.searchParams.set("reason", "expired");
  return clear(NextResponse.redirect(url, 303));
}
