import { relayToCore } from "@/lib/oidc/relay";

export const dynamic = "force-dynamic";

/** Clés publiques de signature des jetons (RS256). */
export function GET(request: Request) {
  return relayToCore(request, "jwks");
}
