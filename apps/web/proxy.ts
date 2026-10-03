import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, publicAbsoluteUrl } from "@/lib/session";

/**
 * Protection de /app/* (Next.js 16 : « proxy », ex-« middleware »).
 * Vérifie seulement la présence du cookie de session ; la validité du JWT
 * est contrôlée par le Core à chaque appel (401 → déconnexion propre).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const url = publicAbsoluteUrl(request, "/login");
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
