import { relayToCore } from "@/lib/oidc/relay";

export const dynamic = "force-dynamic";

/** Découverte OpenID Connect : le portail publie le fournisseur d'identité du Core. */
export function GET(request: Request) {
  return relayToCore(request, "discovery");
}
