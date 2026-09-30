/**
 * Config BFF — sources métier (P0 = CRM prestations).
 * Pas de secret hardcodé ; tout passe par l’env.
 */
export type PrestationsSource = "crm" | "mock";

export function prestationsSource(): PrestationsSource {
  const raw = (process.env.BFF_PRESTATIONS_SOURCE ?? "").trim().toLowerCase();
  if (raw === "mock") return "mock";
  if (raw === "crm") return "crm";
  // Défaut : CRM si clé présente, sinon mock lab
  return process.env.CRM_API_KEY?.trim() ? "crm" : "mock";
}

/** Docs / échanges / finance encore mock — false = listes vides (P0 honnête). */
export function legacyMockEnabled(): boolean {
  const raw = (process.env.BFF_LEGACY_MOCK ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  // Si prestations CRM → pas de faux docs/finance orphelins
  return prestationsSource() === "mock";
}

export function crmConfig() {
  const baseUrl = (process.env.CRM_API_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
  const apiKey = process.env.CRM_API_KEY?.trim() ?? "";
  return { baseUrl, apiKey, enabled: Boolean(apiKey) };
}
