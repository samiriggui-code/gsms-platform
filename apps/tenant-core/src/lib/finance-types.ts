/** Contenu structuré de la plaquette — prêt à recevoir Grace/QAtrial plus tard. */
export type PlaquetteFinding = {
  title: string;
  detail: string;
};

export type PlaquetteBrief = {
  /** Intro métier (périmètre) */
  context: string;
  /** Points d’analyse / cadrage (demo local ; plus tard handoff Grace/QAtrial) */
  findings: PlaquetteFinding[];
  /** Livrables inclus */
  deliverables: string[];
  /** Conditions commerciales */
  conditions: string[];
  /** Mention source — transparent pour le client */
  sourceNote: string;
};

export type FinanceLine = {
  label: string;
  detail: string;
  amountEur: number;
};

export type FinanceItem = {
  id: string;
  label: string;
  kind: "DEVIS" | "FACTURE";
  status: "A_SIGNER" | "SIGNE" | "A_PAYER" | "PAYE";
  amountEur: number;
  prestationId: string | null;
  workspaceId: string;
  updatedAt: string;
  reference: string;
  issuedAt: string;
  validUntil: string | null;
  signedAt: string | null;
  lines: FinanceLine[];
  paymentNote: string | null;
  plaquette: PlaquetteBrief;
};
