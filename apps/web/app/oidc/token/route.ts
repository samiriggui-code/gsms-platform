import { relayToCore } from "@/lib/oidc/relay";

export const dynamic = "force-dynamic";

/** Échange du code contre les jetons (appel serveur à serveur de l'application). */
export function POST(request: Request) {
  return relayToCore(request, "token", ["authorization"]);
}
