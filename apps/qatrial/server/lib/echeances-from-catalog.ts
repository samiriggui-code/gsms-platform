/**
 * Suggest échéances from salvaged control catalogs (SSP / ISO / SOC2).
 * Does not write AuditFinding — consumers (AuditSchedule UI) pick a row
 * and set dueDate themselves.
 */

export type EcheanceSuggestion = {
  control_ref: string;
  name: string;
  framework: string;
  recurrence_days: number;
  suggested_due_date: string;
  reason: string;
};

const SSP_RECURRENCE: Record<string, { days: number; reason: string }> = {
  'SSP-01': { days: 365, reason: 'Revue annuelle politique sûreté' },
  'SSP-02': { days: 90, reason: 'Revue trimestrielle droits d’accès' },
  'SSP-03': { days: 180, reason: 'Test / maintenance intrusion semestriel' },
  'SSP-04': { days: 365, reason: 'Revue annuelle vidéoprotection / conservation' },
  'SSP-05': { days: 365, reason: 'Vérification annuelle détection incendie' },
  'SSP-06': { days: 365, reason: 'Vérification annuelle extincteurs / RIA' },
  'SSP-07': { days: 365, reason: 'Suivi annuel registre / commissions' },
  'SSP-08': { days: 180, reason: 'Revue semestrielle consignes PC / escalade' },
  'SSP-09': { days: 365, reason: 'Échéance cartes CNAPS / recyclages SSIAP' },
  'SSP-10': { days: 365, reason: 'Revue annuelle DUERP / exercices' },
  'SSP-11': { days: 180, reason: 'Contrôle semestriel salles critiques' },
  'SSP-12': { days: 365, reason: 'Revue annuelle convergence physique/cyber' },
};

function addDays(isoDate: Date, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type SspCatalog = {
  requirements?: Array<{ identifier: string; name: string }>;
};

type IdTitleCatalog = {
  controls?: Array<{ identifier: string; name: string }>;
};

export function buildEcheancesFromCatalogs(input: {
  ssp?: SspCatalog;
  iso?: IdTitleCatalog;
  soc2?: IdTitleCatalog;
  from?: Date;
  includeIsoSoc2?: boolean;
}): EcheanceSuggestion[] {
  const from = input.from ?? new Date();
  const out: EcheanceSuggestion[] = [];

  for (const req of input.ssp?.requirements ?? []) {
    const rec = SSP_RECURRENCE[req.identifier] ?? {
      days: 365,
      reason: 'Revue annuelle (défaut SSP)',
    };
    out.push({
      control_ref: req.identifier,
      name: req.name,
      framework: 'ssp-surete',
      recurrence_days: rec.days,
      suggested_due_date: addDays(from, rec.days),
      reason: rec.reason,
    });
  }

  if (input.includeIsoSoc2) {
    for (const c of (input.iso?.controls ?? []).slice(0, 30)) {
      out.push({
        control_ref: c.identifier,
        name: c.name,
        framework: 'iso27001-2022',
        recurrence_days: 365,
        suggested_due_date: addDays(from, 365),
        reason: 'Revue annuelle contrôle ISO (suggestion)',
      });
    }
    for (const c of (input.soc2?.controls ?? []).slice(0, 30)) {
      out.push({
        control_ref: c.identifier,
        name: c.name,
        framework: 'soc2-tsc',
        recurrence_days: 365,
        suggested_due_date: addDays(from, 365),
        reason: 'Revue annuelle critère SOC 2 (suggestion)',
      });
    }
  }

  return out;
}
