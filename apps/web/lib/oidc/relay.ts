import { NextResponse } from "next/server";
import { coreBaseUrl } from "@/lib/core/client";

/**
 * Relais brut vers les points d'accès OIDC du Core (jeton, clés, profil). Ils sont appelés par les serveurs de
 * GRACE, QAtrial et du CRM, pas par le navigateur : corps, en-têtes d'authentification et codes d'erreur OAuth
 * passent tels quels. Voir docs/architecture/IDENTITE-SSO.md.
 */
export async function relayToCore(request: Request, corePath: string, forward: string[] = []) {
  const base = coreBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "temporarily_unavailable", error_description: "Core non configuré" }, { status: 503 });
  }
  const headers = new Headers();
  for (const name of ["content-type", ...forward]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const res = await fetch(`${base}/api/v1/oidc/${corePath}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const out = new Headers({ "content-type": res.headers.get("content-type") ?? "application/json" });
    for (const name of ["cache-control", "pragma", "www-authenticate"]) {
      const value = res.headers.get(name);
      if (value) out.set(name, value);
    }
    return new NextResponse(await res.arrayBuffer(), { status: res.status, headers: out });
  } catch {
    return NextResponse.json({ error: "temporarily_unavailable", error_description: "Core injoignable" }, { status: 503 });
  }
}
