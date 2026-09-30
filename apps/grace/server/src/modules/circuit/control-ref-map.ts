/**
 * Map Grace threat/gap signals → SSP control_ref (docs/circuit/controls/ssp-surete.json).
 * Synthetic grace-cm-* refs remain as fallback when no SSP match.
 */

export type SspMatch = {
  control_ref: string;
  referentiel: string[];
  ssp_name?: string;
};

const SSP = {
  'SSP-01': 'Gouvernance sûreté du site',
  'SSP-02': "Contrôle d'accès physique",
  'SSP-03': 'Détection intrusion',
  'SSP-04': 'Vidéoprotection conforme',
  'SSP-05': 'Détection incendie',
  'SSP-06': 'Moyens de lutte incendie',
  'SSP-07': 'Registre de sécurité et vérifications périodiques',
  'SSP-08': 'PC sécurité et supervision',
  'SSP-09': 'Habilitations des agents (CNAPS / SSIAP)',
  'SSP-10': 'Santé et sécurité au travail (SST)',
  'SSP-11': 'Salles serveurs et infrastructures critiques',
  'SSP-12': 'Convergence sécurité physique / cybersécurité',
} as const;

type SspId = keyof typeof SSP;

function hit(id: SspId): SspMatch {
  return {
    control_ref: id,
    referentiel: ['ssp-surete', id],
    ssp_name: SSP[id],
  };
}

/**
 * Prefer compliance tags, then free-text heuristics.
 */
export function resolveSspControlRef(input: {
  complianceTags?: string[] | null;
  text?: string | null;
  gapType?: string | null;
}): SspMatch | null {
  const tags = (input.complianceTags ?? []).map((t) => t.toUpperCase());
  const blob = `${input.text ?? ''} ${input.gapType ?? ''}`.toLowerCase();

  if (tags.includes('FR_CNAPS') || /cnaps|ssiap|habilitation|carte pro/.test(blob)) {
    return hit('SSP-09');
  }
  if (tags.some((t) => ['FR_SSI', 'FR_ERP', 'FR_IGH', 'FR_COMMISSION'].includes(t))) {
    if (/extinct|ria|désenfum|desenfum|lutte/.test(blob)) return hit('SSP-06');
    if (/détect|detect|ssi\b|alarme incendie/.test(blob)) return hit('SSP-05');
    if (/registre|commission|prescription/.test(blob)) return hit('SSP-07');
    if (/évacu|evacu|duerp|sst|secour/.test(blob)) return hit('SSP-10');
    return hit('SSP-05');
  }
  if (/vidéo|video|caméra|camera|cnil/.test(blob)) return hit('SSP-04');
  if (/intrusion|alarme|r81|50131/.test(blob)) return hit('SSP-03');
  if (/badge|contrôle d.accès|controle d.acces|accès physique|acces physique/.test(blob)) {
    return hit('SSP-02');
  }
  if (/pc sécurité|pc securite|main courante|télésurveillance|telesurveillance/.test(blob)) {
    return hit('SSP-08');
  }
  if (/salle serveur|datacenter|en 50600|local technique/.test(blob)) return hit('SSP-11');
  if (/iso\s*27001|soc\s*2|cyber/.test(blob)) return hit('SSP-12');
  if (/politique sûreté|politique surete|gouvernance/.test(blob)) return hit('SSP-01');

  return null;
}

export function mergeReferentiel(
  existing: string[] | undefined,
  ssp: SspMatch | null,
): string[] | undefined {
  if (!ssp) return existing?.length ? existing : undefined;
  const set = new Set([...(existing ?? []), ...ssp.referentiel]);
  return [...set];
}
