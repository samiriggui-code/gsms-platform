/**
 * Cookies de session de apps/web.
 * - gsms_session : JWT émis par le Core (httpOnly, jamais lisible côté client).
 * - gsms_ws      : workspace (site) courant choisi dans le sélecteur.
 * Partagé entre middleware (edge), route handlers et Server Components.
 */
export const SESSION_COOKIE = "gsms_session";
export const WORKSPACE_COOKIE = "gsms_ws";

/** Durée par défaut si le Core ne renvoie pas expires_in (8 h). */
export const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 8;

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** N'accepte que des chemins internes (évite les redirections ouvertes). */
export function safeNextPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

/**
 * Base URL navigateur pour les redirects (VPS derrière Traefik).
 * Next bindé sur HOSTNAME=0.0.0.0 → request.url vaut 0.0.0.0:3000 ;
 * on privilégie APP_URL, puis Host / X-Forwarded-*.
 */
export function publicAbsoluteUrl(request: { nextUrl: URL; headers: Headers }, path: string): URL {
  const configured = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    return new URL(path, configured.endsWith("/") ? configured : `${configured}/`);
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : request.nextUrl.protocol === "https:"
        ? "https"
        : "http";

  const rawHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    "";

  let host = rawHost;
  if (!host || host.startsWith("0.0.0.0") || host.startsWith("[::]") || host === "::") {
    const fallbackHost = request.nextUrl.host;
    host =
      !fallbackHost || fallbackHost.startsWith("0.0.0.0") || fallbackHost.startsWith("[::]")
        ? "localhost"
        : fallbackHost;
  }

  return new URL(path, `${proto}://${host}`);
}
