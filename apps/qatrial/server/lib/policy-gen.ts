/**
 * Policy draft generation from catalog titles + optional Findings.
 * Output is always a brouillon à valider — never auto-published.
 */

export const POLICY_DRAFT_BANNER =
  '⚠️ BROUILLON À VALIDER — généré automatiquement. Ne pas publier ni diffuser sans relecture humaine.';

export type PolicyFindingInput = {
  control_ref?: string;
  title: string;
  status?: string;
  description?: string;
  remediation?: string;
};

export function buildPolicyPrompt(input: {
  policyTitle: string;
  siteOrClient?: string;
  findings?: PolicyFindingInput[];
  language?: 'fr' | 'en';
}): string {
  const lang = input.language ?? 'fr';
  const findingsBlock =
    input.findings && input.findings.length > 0
      ? input.findings
          .slice(0, 40)
          .map(
            (f, i) =>
              `${i + 1}. [${f.control_ref ?? 'n/a'}] ${f.title}` +
              (f.status ? ` (${f.status})` : '') +
              (f.description ? `\n   Constat: ${f.description}` : '') +
              (f.remediation ? `\n   Remédiation: ${f.remediation}` : ''),
          )
          .join('\n')
      : '(aucun finding fourni — rédiger une trame générique adaptée sécurité privée / incendie / sureté site FR)';

  if (lang === 'en') {
    return `You are a security/compliance technical writer for private security and site fire safety (France/EU context).
Write a DRAFT policy document titled: "${input.policyTitle}"
Site/client context: ${input.siteOrClient ?? 'not specified'}

Closed or relevant findings to reflect (do not invent regulatory citations beyond common FR practice):
${findingsBlock}

Structure in Markdown:
1. Purpose
2. Scope
3. Roles and responsibilities
4. Requirements / controls
5. Records and evidence
6. Review cadence

Start the document with exactly this first line:
${POLICY_DRAFT_BANNER}

Write in English. Mark uncertain parts with [À VALIDER]. Do not claim the policy is approved.`;
  }

  return `Tu es rédacteur technique sécurité / conformité pour la sécurité privée et la prévention incendie / sureté de site (contexte France / UE).
Rédige un BROUILLON de document de politique / consignes intitulé : "${input.policyTitle}"
Contexte site / client : ${input.siteOrClient ?? 'non précisé'}

Findings pertinents à prendre en compte (n'invente pas de citations réglementaires hors bonnes pratiques FR courantes) :
${findingsBlock}

Structure en Markdown :
1. Objet
2. Périmètre
3. Rôles et responsabilités
4. Exigences / contrôles
5. Preuves et enregistrements
6. Fréquence de revue

Commence le document par exactement cette première ligne :
${POLICY_DRAFT_BANNER}

Rédige en français. Marque les zones incertaines par [À VALIDER]. Ne prétends jamais que le document est approuvé ou publié.`;
}

export function ensureDraftBanner(text: string): string {
  const trimmed = text.trim();
  if (trimmed.includes('BROUILLON À VALIDER') || trimmed.includes('DRAFT')) {
    return trimmed;
  }
  return `${POLICY_DRAFT_BANNER}\n\n${trimmed}`;
}
