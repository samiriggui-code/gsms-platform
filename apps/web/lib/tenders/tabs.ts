import { ENDPOINTS } from "@/lib/core/endpoints";

/**
 * Onglets d'un dossier AO (/app/tenders/{workspaceId}) — un workspace AO dédié porte un seul dossier.
 * `endpoint` pointe vers la ressource Core correspondante (voir lib/core/endpoints.ts).
 */
export type TenderTabSlug =
  | "synthese"
  | "pieces"
  | "analyse"
  | "exigences"
  | "conformite"
  | "go-no-go"
  | "risques"
  | "questions"
  | "reponse-technique"
  | "reponse-financiere"
  | "documents"
  | "echeances"
  | "historique"
  | "agents";

export type TenderTab = {
  slug: TenderTabSlug;
  label: string;
  description: string;
  source: string;
  endpoint: (workspaceId: string, missionId: string) => string;
};

const T = ENDPOINTS.tenders;

export const TENDER_TABS: TenderTab[] = [
  { slug: "synthese", label: "Synthèse", source: "Core", endpoint: T.summary, description: "Mission AO, acheteur, lots, montant, statut et prochaines échéances." },
  { slug: "pieces", label: "DCE / Pièces", source: "Core Documents", endpoint: T.pieces, description: "Dépôt du DCE et pièces reconnues par le Core (RC, CCTP, CCAP, AE, BPU, DPGF, DQE, annexes) : attendues et reçues." },
  { slug: "analyse", label: "Analyse", source: "Digest du DCE (règles déterministes)", endpoint: T.analysis, description: "Lecture du DCE par thème (horaires, qualifications, reprise du personnel…) et critères d'attribution avec leur pondération." },
  { slug: "exigences", label: "Exigences", source: "Digest du DCE → Core", endpoint: T.compliance, description: "Chaque exigence du DCE, classée par thème, avec la pièce et la page d'où elle vient. Les nouvelles analyses complètent la liste sans effacer vos réponses." },
  { slug: "conformite", label: "Conformité", source: "Core (décision humaine)", endpoint: T.compliance, description: "Matrice de conformité : réponse prévue, preuve, document cible, responsable et statut de chaque exigence." },
  { slug: "go-no-go", label: "Go / No-Go", source: "Core", endpoint: T.goNoGo, description: "Matrice de faisabilité (capacité humaine, réglementaire, technique, financière, documentaire, délai, certifications, moyens, risques, dépendances, informations manquantes) : prêt, à surveiller ou bloqué, avec justification et sources. La décision reste humaine." },
  { slug: "risques", label: "Risques", source: "Digest du DCE", endpoint: T.risks, description: "Critères éliminatoires, pénalités, résiliation, astreintes relevés dans le DCE, avec leur source." },
  { slug: "questions", label: "Questions", source: "Core", endpoint: T.questions, description: "Questions à l'acheteur et date limite de questions." },
  { slug: "reponse-technique", label: "Réponse technique", source: "Moteur AO", endpoint: T.technicalResponse, description: "Sections du mémoire technique, versionnées comme documents." },
  { slug: "reponse-financiere", label: "Réponse financière", source: "Moteur AO", endpoint: T.financialResponse, description: "Devis fournisseurs, nomenclature, calcul de prix et proposition financière." },
  { slug: "documents", label: "Documents", source: "Core (coffre-fort chiffré)", endpoint: T.documents, description: "Pièces reçues et documents produits : version, empreinte SHA-256, dossier de rangement, analyse." },
  { slug: "echeances", label: "Échéances", source: "Core", endpoint: T.deadlines, description: "Date de remise saisie et dates trouvées dans le DCE (questions, visite, remise), avec leur source." },
  { slug: "historique", label: "Historique", source: "Core (journal d'audit chaîné)", endpoint: T.history, description: "Qui a fait quoi sur le dossier : dépôts, consultations, décisions, validations." },
  { slug: "agents", label: "Agents", source: "Moteur AO et assistant", endpoint: T.agents, description: "État du moteur appel d'offres pour ce dossier (pièces reçues, ce qu'il peut préparer), puis tâches proposées par l'assistant, à valider." },
];

export function tenderTab(slug: string): TenderTab | undefined {
  return TENDER_TABS.find((tab) => tab.slug === slug);
}

export function tenderHref(workspaceId: string, slug: TenderTabSlug = "synthese") {
  const base = `/app/tenders/${encodeURIComponent(workspaceId)}`;
  return slug === "synthese" ? base : `${base}/${slug}`;
}
