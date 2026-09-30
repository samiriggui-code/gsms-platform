import type { AIRiskClassification } from '../../types';
import { complete } from '../client';

export interface RiskClassContext {
  requirement: {
    id: string;
    title: string;
    description: string;
    category?: string;
  };
  vertical?: string;
  country: string;
  riskTaxonomy: string;
  allRequirements: { id: string; title: string }[];
}

export function buildRiskClassificationPrompt(ctx: RiskClassContext): string {
  let severityScale = '';

  if (ctx.riskTaxonomy === 'fmea') {
    severityScale = `
Severity scale (FMEA — sûreté / sécurité physique):
1 = Négligeable (aucun impact sur la sécurité des personnes ou des biens)
2 = Mineur (écart mineur, sans conséquence sur la protection)
3 = Modéré (affaiblit une mesure de protection, correction nécessaire)
4 = Majeur (défaillance d'une mesure de sécurité critique)
5 = Critique (mise en danger directe des personnes, des biens ou de la continuité)`;
  } else {
    severityScale = `
Generic severity scale:
1 = Negligible
2 = Minor
3 = Moderate
4 = Major
5 = Critical`;
  }

  return `You are a risk management specialist using ${ctx.riskTaxonomy} methodology for ${ctx.vertical || 'general'} in ${ctx.country}.

## Risk Taxonomy: ${ctx.riskTaxonomy}
${severityScale}

Likelihood scale:
1 = Rare
2 = Unlikely
3 = Possible
4 = Likely
5 = Almost certain

## Requirement to Classify
ID: ${ctx.requirement.id}
Title: ${ctx.requirement.title}
Description: ${ctx.requirement.description}
${ctx.requirement.category ? `Category: ${ctx.requirement.category}` : ''}

## Project Context
Vertical: ${ctx.vertical || 'general'}
Country: ${ctx.country}
Other requirements in scope: ${ctx.allRequirements.length}

Respond ONLY with JSON:
{
  "severity": 1-5,
  "likelihood": 1-5,
  "reasoning": "2-3 sentence explanation",
  "safetyClass": "e.g. Site sensible / Site standard / Infrastructure critique",
  "confidence": 0.0-1.0,
  "mitigationSuggestion": "Recommended mitigation if risk is high"
}`;
}

/**
 * Strips markdown code block wrappers from a response string.
 */
function stripCodeBlock(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  return cleaned.trim();
}

export async function classifyRisk(
  ctx: RiskClassContext,
): Promise<AIRiskClassification> {
  const prompt = buildRiskClassificationPrompt(ctx);

  const response = await complete({
    prompt,
    purpose: 'risk_classification',
    maxTokens: 1000,
    temperature: 0.2,
  });

  const jsonText = stripCodeBlock(response.text);
  const parsed: {
    severity: number;
    likelihood: number;
    reasoning: string;
    safetyClass?: string;
    confidence: number;
    mitigationSuggestion?: string;
  } = JSON.parse(jsonText);

  const severity = Math.max(1, Math.min(5, Math.round(parsed.severity))) as 1 | 2 | 3 | 4 | 5;
  const likelihood = Math.max(1, Math.min(5, Math.round(parsed.likelihood))) as 1 | 2 | 3 | 4 | 5;

  return {
    requirementId: ctx.requirement.id,
    proposedSeverity: severity,
    proposedLikelihood: likelihood,
    reasoning: parsed.reasoning,
    safetyClass: parsed.safetyClass,
    confidence: Math.max(0, Math.min(1, parsed.confidence)),
    generatedBy: response.model,
    providerId: response.providerId,
  };
}
