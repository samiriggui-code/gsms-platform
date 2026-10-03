import { NextResponse, type NextRequest } from "next/server";
import { coreFetch } from "@/lib/core/client";
import { SESSION_COOKIE, publicAbsoluteUrl } from "@/lib/session";

export const dynamic = "force-dynamic";

const PARAMS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
  "nonce",
  "code_challenge",
  "code_challenge_method",
  "prompt",
] as const;

/**
 * Page d'autorisation OIDC : « Se connecter avec GSMS » depuis GRACE, QAtrial ou le CRM arrive ici.
 * Sans session sur le portail → connexion, puis retour ici. Avec session → le Core vérifie la demande et les
 * droits du membre sur l'application, et l'on renvoie le navigateur vers l'application avec le code.
 */
export async function GET(request: NextRequest) {
  const self = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const login = publicAbsoluteUrl(request, "/login");
    login.searchParams.set("next", self);
    return NextResponse.redirect(login, 303);
  }

  const body: Record<string, string> = {};
  for (const name of PARAMS) {
    const value = request.nextUrl.searchParams.get(name);
    if (value) body[name] = value;
  }
  const result = await coreFetch<{ redirect_to: string }>("/oidc/authorize", { method: "POST", token, body });
  if (result.ok) return NextResponse.redirect(result.data.redirect_to, 303);

  if (result.kind === "unauthorized") {
    // Session du portail expirée : on la ferme et on revient ici après reconnexion.
    const logout = publicAbsoluteUrl(request, "/api/auth/logout");
    logout.searchParams.set("next", self);
    return NextResponse.redirect(logout, 303);
  }
  const error = publicAbsoluteUrl(request, "/oidc/erreur");
  error.searchParams.set(
    "message",
    result.kind === "unavailable" || result.kind === "not_configured"
      ? "Le Core GSMS est indisponible. Réessayez dans quelques minutes."
      : result.message,
  );
  return NextResponse.redirect(error, 303);
}
