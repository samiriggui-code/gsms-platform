/**
 * Client Core typé — SERVEUR UNIQUEMENT (Server Components, route handlers).
 *
 * Règle d'architecture (§6, invariant 1) : le navigateur ne parle qu'au Core,
 * et seulement à travers apps/web. CORE_API_URL n'est jamais exposée au client
 * (pas de préfixe NEXT_PUBLIC_). Aucune donnée fictive : si le Core ne répond
 * pas, l'appelant reçoit un résultat { ok: false, kind: "unavailable" } et
 * l'UI affiche explicitement « Core indisponible ».
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/session";
import { ENDPOINTS } from "./endpoints";
import type { Me } from "./types";

export type CoreErrorKind =
  | "not_configured"
  | "unavailable"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "error";

export type CoreFailure = {
  ok: false;
  status: number;
  kind: CoreErrorKind;
  message: string;
  /** Endpoint appelé (chemin relatif), utile pour l'affichage technique. */
  endpoint: string;
};

export type CoreResult<T> = { ok: true; status: number; data: T; endpoint: string } | CoreFailure;

export type CoreRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Jeton explicite ; sinon lu dans le cookie de session. `null` = appel anonyme. */
  token?: string | null;
  workspaceId?: string | null;
  missionId?: string | null;
  /** Contexte métier complet (préféré) — pose tous les headers X-GSMS-*. */
  gsmsHeaders?: Record<string, string> | null;
  clientId?: string | null;
  siteId?: string | null;
  engagementId?: string | null;
  tenantId?: string | null;
  idempotencyKey?: string;
  correlationId?: string;
  timeoutMs?: number;
};

const API_PREFIX = "/api/v1";

export function coreBaseUrl(): string | null {
  const raw = process.env.CORE_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function timeoutMs(override?: number) {
  if (override) return override;
  const fromEnv = Number(process.env.CORE_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5000;
}

function kindForStatus(status: number): CoreErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 409 || status === 422) return "invalid";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return "error";
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === "string") return first.msg;
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

/** Lit le jeton de session (cookie httpOnly) côté serveur. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function coreFetch<T>(path: string, req: CoreRequest = {}): Promise<CoreResult<T>> {
  const endpoint = `${API_PREFIX}${path}`;
  // Lire la session d'abord : rend la route dynamique même si le Core n'est pas configuré.
  const token = req.token === undefined ? await getSessionToken() : req.token;
  const base = coreBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 503,
      kind: "not_configured",
      message: "CORE_API_URL n'est pas configurée sur le serveur web.",
      endpoint,
    };
  }

  const url = new URL(`${base}${endpoint}`);
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = new Headers({ Accept: "application/json" });
  headers.set("X-GSMS-Correlation-Id", req.correlationId ?? crypto.randomUUID());
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Headers métier : contexte Core résolu en priorité, sinon ids unitaires.
  if (req.gsmsHeaders) {
    for (const [key, value] of Object.entries(req.gsmsHeaders)) {
      if (value) headers.set(key, value);
    }
  }
  if (req.workspaceId) headers.set("X-GSMS-Workspace-Id", req.workspaceId);
  if (req.missionId) headers.set("X-GSMS-Mission-Id", req.missionId);
  if (req.engagementId) {
    headers.set("X-GSMS-Engagement-Id", req.engagementId);
    if (!headers.has("X-GSMS-Mission-Id")) headers.set("X-GSMS-Mission-Id", req.engagementId);
  }
  if (req.clientId) headers.set("X-GSMS-Client-Id", req.clientId);
  if (req.siteId) headers.set("X-GSMS-Site-Id", req.siteId);
  if (req.tenantId) headers.set("X-GSMS-Tenant-Id", req.tenantId);
  if (req.idempotencyKey) headers.set("Idempotency-Key", req.idempotencyKey);
  if (req.body !== undefined) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method ?? "GET",
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs(req.timeoutMs)),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      status: 503,
      kind: "unavailable",
      message: timedOut ? "Le Core n'a pas répondu à temps." : "Le Core est injoignable.",
      endpoint,
    };
  }

  let body: unknown = null;
  if (res.status !== 204) {
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  }

  if (!res.ok) {
    const kind = kindForStatus(res.status);
    return {
      ok: false,
      status: res.status,
      kind,
      message: messageFromBody(body, kind === "unavailable" ? "Le Core est indisponible." : `Erreur Core (${res.status}).`),
      endpoint,
    };
  }

  return { ok: true, status: res.status, data: body as T, endpoint };
}

/** Profil courant (dédupliqué par requête via React cache). */
export const getMe = cache(async (): Promise<CoreResult<Me>> => coreFetch<Me>(ENDPOINTS.auth.me()));

/**
 * Workspace (site / engagement) courant : cookie gsms_ws, sinon claim JWT du profil.
 * Ne retombe JAMAIS sur workspaces[0] — un choix implicite masque le multi-site / multi-prestation.
 * Si aucun workspace n'est sélectionné, `workspaceId` est null et l'UI doit forcer le switcher.
 */
export const getWorkspaceContext = cache(
  async (): Promise<{ workspaceId: string | null; failure: CoreFailure | null }> => {
    const store = await cookies();
    const fromCookie = store.get(WORKSPACE_COOKIE)?.value;
    if (fromCookie) return { workspaceId: fromCookie, failure: null };
    const me = await getMe();
    if (!me.ok) return { workspaceId: null, failure: me };
    return { workspaceId: me.data.workspace_id ?? null, failure: null };
  },
);

export async function getCurrentWorkspaceId(): Promise<string | null> {
  return (await getWorkspaceContext()).workspaceId;
}

/** Normalise une réponse liste du Core : tableau brut ou { items: [...] }. */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}
