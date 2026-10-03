/**
 * Prestations GSMS → domaines documentaires DocuLens.
 * Aligné sur la vitrine : audit, commission de sécurité, AO sociétés de sécurité.
 * (Pas de formation — c’est gsms-school.)
 */

export type PrestationId =
  | 'commission_securite'
  | 'audit_surete'
  | 'appel_offres'
  | 'autres'
  | 'non_classe';

export interface PrestationMeta {
  id: PrestationId;
  label: string;
  shortLabel: string;
  description: string;
  /** Codes label_name documentaires rattachés (hors domaine). */
  docTypes: string[];
}

export const PRESTATIONS: PrestationMeta[] = [
  {
    id: 'commission_securite',
    label: 'Commission de sécurité',
    shortLabel: 'Commission',
    description:
      'Registres, notices, PV, plans d’évacuation et rapports de vérification incendie / SSI.',
    docTypes: [
      'registre_securite',
      'notice_securite',
      'pv_commission_precedente',
      'plan_evacuation',
      'plan_intervention',
      'rapport_verification_electrique',
      'rapport_verification_ssi',
      'rapport_verification_desenfumage',
      'rapport_verification_extincteurs',
      'contrat_maintenance_ssi',
      'consignes_securite',
    ],
  },
  {
    id: 'audit_surete',
    label: 'Audit de sûreté',
    shortLabel: 'Audit sûreté',
    description: 'Procédures, contrats de gardiennage, cartes CNAPS et plans de site.',
    docTypes: [
      'procedure_surete',
      'contrat_gardiennage',
      'carte_professionnelle_cnaps',
      'plan_site',
    ],
  },
  {
    id: 'appel_offres',
    label: 'Appels d’offres',
    shortLabel: 'AO',
    description: 'DCE, RC, CCTP, CCAP, AE, BPU, DC1/DC2, mémoire technique et attestations.',
    docTypes: [
      'rc',
      'cctp',
      'ccap',
      'ae',
      'bpu',
      'dc1',
      'dc2',
      'attestations',
      'dce',
      'memoire_technique',
    ],
  },
  {
    id: 'autres',
    label: 'Autres pièces',
    shortLabel: 'Autres',
    description: 'Rapports d’audit, PV de réunion, courriers et pièces hors typologie stricte.',
    docTypes: ['rapport_audit', 'pv_reunion', 'courrier', 'autre', 'autres'],
  },
];

const DOC_TYPE_TO_PRESTATION = new Map<string, PrestationId>();
for (const prestation of PRESTATIONS) {
  for (const code of prestation.docTypes) {
    DOC_TYPE_TO_PRESTATION.set(code, prestation.id);
  }
  DOC_TYPE_TO_PRESTATION.set(prestation.id, prestation.id);
}

export const DOMAIN_DISPLAY: Record<string, string> = {
  commission_securite: 'Commission de sécurité',
  audit_surete: 'Audit de sûreté',
  appel_offres: 'Appels d’offres',
  autres: 'Autres pièces',
};

/** Libellés FR des codes documentaires (alignés sur fr_labels.py). */
export const DOC_TYPE_DISPLAY: Record<string, string> = {
  registre_securite: 'Registre de sécurité',
  notice_securite: 'Notice de sécurité',
  pv_commission_precedente: 'PV de commission précédent',
  plan_evacuation: "Plan d'évacuation",
  plan_intervention: "Plan d'intervention",
  rapport_verification_electrique: 'Rapport de vérification électrique',
  rapport_verification_ssi: 'Rapport de vérification SSI',
  rapport_verification_desenfumage: 'Rapport de vérification désenfumage',
  rapport_verification_extincteurs: 'Rapport de vérification extincteurs',
  contrat_maintenance_ssi: 'Contrat de maintenance SSI',
  consignes_securite: 'Consignes de sécurité',
  procedure_surete: 'Procédure de sûreté',
  contrat_gardiennage: 'Contrat de gardiennage',
  carte_professionnelle_cnaps: 'Carte professionnelle CNAPS',
  plan_site: 'Plan de site',
  rc: 'Règlement de la consultation (RC)',
  cctp: 'CCTP',
  ccap: 'CCAP',
  ae: "Acte d'engagement (AE)",
  bpu: 'BPU / DPGF',
  dc1: 'DC1',
  dc2: 'DC2',
  attestations: 'Attestations',
  dce: 'Dossier de consultation (DCE)',
  memoire_technique: 'Mémoire technique',
  rapport_audit: "Rapport d'audit",
  pv_reunion: 'Procès-verbal de réunion',
  courrier: 'Courrier / mise en demeure',
  autre: 'Autre pièce',
};

export function prestationForDocType(docType?: string | null): PrestationId {
  if (!docType) return 'non_classe';
  return DOC_TYPE_TO_PRESTATION.get(docType.toLowerCase()) ?? 'non_classe';
}

export function prestationMeta(id: PrestationId): PrestationMeta {
  if (id === 'non_classe') {
    return {
      id: 'non_classe',
      label: 'Non classés',
      shortLabel: 'Non classés',
      description: 'Documents sans typologie reconnue ou en attente de classification.',
      docTypes: [],
    };
  }
  return PRESTATIONS.find((item) => item.id === id) ?? PRESTATIONS[PRESTATIONS.length - 1];
}

export function isPrestationId(value: string | null | undefined): value is PrestationId {
  if (!value) return false;
  return value === 'non_classe' || PRESTATIONS.some((item) => item.id === value);
}

export function displayLabelName(code: string, description?: string | null): string {
  if (description && description.trim() && !description.startsWith('Domaine ')) {
    return description.trim();
  }
  const key = code.toLowerCase();
  return DOMAIN_DISPLAY[key] ?? DOC_TYPE_DISPLAY[key] ?? code.replace(/_/g, ' ');
}

export function groupDocumentsByPrestation<T extends { doc_type?: string | null }>(
  documents: T[],
): Array<{ prestation: PrestationMeta; documents: T[] }> {
  const buckets = new Map<PrestationId, T[]>();
  for (const doc of documents) {
    const id = prestationForDocType(doc.doc_type);
    const list = buckets.get(id) ?? [];
    list.push(doc);
    buckets.set(id, list);
  }
  const ordered: PrestationId[] = [
    ...PRESTATIONS.map((p) => p.id),
    'non_classe',
  ];
  return ordered
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({
      prestation: prestationMeta(id),
      documents: buckets.get(id) ?? [],
    }));
}
