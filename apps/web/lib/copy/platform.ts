/**
 * Copie FR de la plateforme authentifiée (/app).
 * TODO i18n : migrer vers next-intl (FR par défaut, EN).
 */

export const MISSION_TYPES = [
  { slug: "audits", coreType: "audit", label: "Audits" },
  { slug: "commission-securite", coreType: "commission_securite", label: "Commission de sécurité" },
  { slug: "appels-offres", coreType: "appel_offres", label: "Appels d'offres" },
  { slug: "accompagnement", coreType: "accompagnement", label: "Accompagnement" },
  { slug: "conformite", coreType: "conformite", label: "Conformité" },
] as const;

export type MissionTypeSlug = (typeof MISSION_TYPES)[number]["slug"];

export function missionTypeBySlug(slug: string) {
  return MISSION_TYPES.find((item) => item.slug === slug);
}

export const CORE_STATE_COPY = {
  unavailableTitle: "Core indisponible",
  unavailableBody:
    "La plateforme n'arrive pas à joindre le Core GSMS. Aucune donnée n'est affichée tant que la connexion n'est pas rétablie — rien de ce que vous voyez ici n'est simulé.",
  notConfiguredTitle: "Core non configuré",
  notConfiguredBody: "La variable CORE_API_URL n'est pas définie sur le serveur web. Renseignez-la (voir .env.example) puis redémarrez.",
  forbiddenTitle: "Accès refusé",
  forbiddenBody: "Votre rôle ne permet pas d'accéder à cette ressource sur ce site.",
  notFoundTitle: "Ressource introuvable",
  notFoundBody: "Le Core ne connaît pas encore cette ressource (endpoint non implémenté ou élément supprimé).",
  errorTitle: "Erreur du Core",
  retry: "Réessayer",
  noWorkspaceTitle: "Aucun site sélectionné",
  noWorkspaceBody: "Choisissez un site dans le sélecteur en haut de page pour afficher ses données.",
} as const;
