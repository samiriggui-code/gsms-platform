import { relayToCore } from "@/lib/oidc/relay";

export const dynamic = "force-dynamic";

/** Profil du membre connecté (Bearer = access_token émis par /oidc/token). */
function handle(request: Request) {
  return relayToCore(request, "userinfo", ["authorization"]);
}

export { handle as GET, handle as POST };
