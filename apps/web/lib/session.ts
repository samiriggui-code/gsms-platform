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
