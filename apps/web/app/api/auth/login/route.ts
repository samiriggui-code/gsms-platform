import { NextResponse } from "next/server";
import { coreFetch } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import type { LoginResponse } from "@/lib/core/types";
import {
  DEFAULT_SESSION_MAX_AGE,
  SESSION_COOKIE,
  WORKSPACE_COOKIE,
  safeNextPath,
  sessionCookieOptions,
} from "@/lib/session";

/**
 * POST /api/auth/login — relaie vers Core POST /api/v1/auth/login
 * et pose le JWT dans un cookie httpOnly (jamais exposé au JavaScript).
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; next?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Saisissez votre e-mail et votre mot de passe." }, { status: 422 });
  }

  const result = await coreFetch<LoginResponse>(ENDPOINTS.auth.login(), {
    method: "POST",
    body: { email, password },
    token: null,
  });

  if (!result.ok) {
    if (result.kind === "unavailable" || result.kind === "not_configured") {
      return NextResponse.json(
        { error: "Connexion impossible : le Core GSMS est indisponible. Réessayez dans quelques minutes.", code: "core_unavailable" },
        { status: 503 },
      );
    }
    if (result.kind === "unauthorized" || result.kind === "invalid" || result.kind === "forbidden") {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    return NextResponse.json({ error: "Connexion impossible. Réessayez." }, { status: 502 });
  }

  const token = result.data?.access_token;
  if (!token) {
    return NextResponse.json({ error: "Réponse du Core inattendue (jeton absent)." }, { status: 502 });
  }

  const maxAge =
    typeof result.data.expires_in === "number" && result.data.expires_in > 0
      ? Math.floor(result.data.expires_in)
      : DEFAULT_SESSION_MAX_AGE;

  const response = NextResponse.json({ ok: true, next: safeNextPath(typeof body.next === "string" ? body.next : null) });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  if (result.data.workspace_id) {
    response.cookies.set(WORKSPACE_COOKIE, result.data.workspace_id, sessionCookieOptions(maxAge));
  }
  return response;
}
