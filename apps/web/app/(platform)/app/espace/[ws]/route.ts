import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_SESSION_MAX_AGE, WORKSPACE_COOKIE, publicAbsoluteUrl, sessionCookieOptions } from "@/lib/session";

/**
 * Lien direct vers l'espace d'une prestation (ex. depuis le CRM) : choisit ce workspace puis ouvre le portail.
 * Le Core revérifie les droits à chaque appel ; ce n'est qu'une préférence d'affichage.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const response = NextResponse.redirect(publicAbsoluteUrl(request, "/app"), 303);
  if (/^[\w-]{1,128}$/.test(ws)) {
    response.cookies.set(WORKSPACE_COOKIE, ws, sessionCookieOptions(DEFAULT_SESSION_MAX_AGE));
  }
  return response;
}
