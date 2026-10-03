import { relayRaw } from "@/lib/oidc/relay";

export const dynamic = "force-dynamic";

/**
 * Événements du CRM vers le Core (sociétés, contacts, affaires). Appel serveur à serveur, signé
 * `X-GSMS-Signature` (HMAC du corps, secret `crm`) : le portail relaie tel quel, le Core vérifie.
 */
export function POST(request: Request) {
  return relayRaw(request, "/integrations/crm/events", ["x-gsms-signature"]);
}
