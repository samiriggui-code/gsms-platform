import { NextResponse, type NextRequest } from "next/server";
import { coreFetch } from "@/lib/core/client";
import { SESSION_COOKIE, WORKSPACE_COOKIE, publicAbsoluteUrl } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Déconnexion demandée par une application : ferme la session du portail, puis retour (adresse déclarée). */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("post_logout_redirect_uri");
  const result = await coreFetch<{ redirect_to: string }>("/oidc/end-session", {
    method: "POST",
    token: null,
    body: { post_logout_redirect_uri: requested },
  });
  const target = result.ok ? result.data.redirect_to : publicAbsoluteUrl(request, "/login").toString();
  const response = NextResponse.redirect(target, 303);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}
