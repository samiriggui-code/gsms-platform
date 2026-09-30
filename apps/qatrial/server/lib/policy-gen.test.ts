import { describe, expect, it } from 'vitest';
import { buildPolicyPrompt, ensureDraftBanner, POLICY_DRAFT_BANNER } from './policy-gen.js';

describe('policy-gen', () => {
  it('includes draft banner instruction and findings', () => {
    const prompt = buildPolicyPrompt({
      policyTitle: 'Contrôle d’accès',
      siteOrClient: 'Site Lyon',
      findings: [{ control_ref: 'SSP-02', title: 'Badges non nominatifs', status: 'non_conforme' }],
    });
    expect(prompt).toContain('BROUILLON À VALIDER');
    expect(prompt).toContain('SSP-02');
    expect(prompt).toContain('Contrôle d’accès');
  });

  it('prefixes banner when missing', () => {
    expect(ensureDraftBanner('Hello')).toContain(POLICY_DRAFT_BANNER);
  });
});
