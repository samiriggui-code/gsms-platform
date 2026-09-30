import { describe, expect, it } from 'vitest';
import { resolveSspControlRef, mergeReferentiel } from './control-ref-map.js';

describe('resolveSspControlRef', () => {
  it('maps FR_CNAPS to SSP-09', () => {
    const m = resolveSspControlRef({ complianceTags: ['FR_CNAPS'] });
    expect(m?.control_ref).toBe('SSP-09');
  });

  it('maps fire tags + extincteur text to SSP-06', () => {
    const m = resolveSspControlRef({
      complianceTags: ['FR_SSI'],
      text: 'Extincteurs périmés',
    });
    expect(m?.control_ref).toBe('SSP-06');
  });

  it('returns null when no signal', () => {
    expect(resolveSspControlRef({ text: 'xyz' })).toBeNull();
  });

  it('merges referentiel', () => {
    const ssp = resolveSspControlRef({ complianceTags: ['FR_CNAPS'] });
    expect(mergeReferentiel(['FR_CNAPS'], ssp)).toEqual(
      expect.arrayContaining(['FR_CNAPS', 'ssp-surete', 'SSP-09']),
    );
  });
});
