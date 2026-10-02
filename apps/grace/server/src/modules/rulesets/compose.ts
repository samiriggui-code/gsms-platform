/**
 * Applicability composer — Phase 6 RuleSets (WHAT), outside risk-engine.
 * Loads declarative JSON from shared/rulesets and filters by SiteContext.
 * Does NOT evaluate regulatory PASS/FAIL or touch IRV/TEAR.
 */

import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function resolveRulesetFile(fileName: string): Promise<string> {
  const candidates = [
    // Typical: cwd = apps/grace/server
    join(process.cwd(), '../../../shared/rulesets', fileName),
    // cwd = monorepo root
    join(process.cwd(), 'shared/rulesets', fileName),
    // Relative to this module (src)
    join(__dirname, '../../../../../../shared/rulesets', fileName),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Ruleset file not found: ${fileName} (tried ${candidates.join(' | ')})`);
}

export type SiteContext = Record<string, unknown>;

export interface ApplicabilityComposition {
  auditType: string;
  packageSlug: string;
  status: 'ok' | 'incomplete_context' | 'not_applicable';
  maturity: string;
  disclaimer: string;
  missingKeys: string[];
  moduleSlugs: string[];
  surveyKeys: string[];
  surveyNames: Array<{ key: string; name: string }>;
  familyIds: string[];
  notes: string[];
  sourceHints: string[];
  officialArticleRefs: string[];
  appliedRuleIds: string[];
  context: SiteContext;
}

interface RulesetFile {
  id: string;
  version: string;
  auditType: string;
  packageSlug: string;
  maturity: string;
  disclaimer: string;
  requiredContext: string[];
  gates: Record<string, string>;
  always: {
    moduleSlugs: string[];
    surveyKeys: string[];
    familyIds: string[];
    sourceHints: string[];
    officialArticleRefs: string[];
  };
  conditionals: Array<{
    id: string;
    when: Record<string, unknown>;
    boostSurveyKeys?: string[];
    boostModuleSlugs?: string[];
    notes?: string[];
    sourceHints?: string[];
    officialArticleRefs?: string[];
    maturity?: string;
  }>;
  surveyCatalog: Record<string, string>;
}

const cache = new Map<string, RulesetFile>();

async function loadRuleset(auditType: string): Promise<RulesetFile | null> {
  const file =
    auditType === 'AUD.PRECOMMISSION.ERP'
      ? 'AUD.PRECOMMISSION.ERP.applicability.json'
      : null;
  if (!file) return null;
  if (cache.has(file)) return cache.get(file)!;
  const path = await resolveRulesetFile(file);
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw) as RulesetFile;
  cache.set(file, parsed);
  return parsed;
}

function matchesWhen(ctx: SiteContext, when: Record<string, unknown>): boolean {
  for (const [k, expected] of Object.entries(when)) {
    if (k === 'commission_phase_in' && Array.isArray(expected)) {
      if (!expected.includes(ctx.commission_phase)) return false;
      continue;
    }
    if (k === 'erp_type_set') {
      if (expected === true && (ctx.erp_type === undefined || ctx.erp_type === null || ctx.erp_type === '')) {
        return false;
      }
      continue;
    }
    if (k === 'erp_type_in' && Array.isArray(expected)) {
      if (!expected.includes(ctx.erp_type)) return false;
      continue;
    }
    if (k === 'erp_type_not_in' && Array.isArray(expected)) {
      if (expected.includes(ctx.erp_type)) return false;
      continue;
    }
    if (ctx[k] !== expected) return false;
  }
  return true;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

/**
 * Extract SiteContext from Assessment.metadata.customFields[packageSlug].
 */
export function extractSiteContext(
  metadata: unknown,
  packageSlug = 'erp-precommission',
): SiteContext {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const md = metadata as Record<string, unknown>;
  const cf = md.customFields;
  if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return {};
  const bag = (cf as Record<string, unknown>)[packageSlug];
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return {};
  return { ...(bag as SiteContext) };
}

export async function composeApplicability(
  auditType: string,
  ctx: SiteContext,
): Promise<ApplicabilityComposition> {
  const ruleset = await loadRuleset(auditType);
  if (!ruleset) {
    return {
      auditType,
      packageSlug: '',
      status: 'not_applicable',
      maturity: 'none',
      disclaimer: `Aucun ruleset pour auditType=${auditType}.`,
      missingKeys: [],
      moduleSlugs: [],
      surveyKeys: [],
      surveyNames: [],
      familyIds: [],
      notes: [],
      sourceHints: [],
      officialArticleRefs: [],
      appliedRuleIds: [],
      context: ctx,
    };
  }

  const missingKeys = ruleset.requiredContext.filter((k) => {
    const v = ctx[k];
    return v === undefined || v === null || v === '';
  });

  for (const [k, expected] of Object.entries(ruleset.gates)) {
    if (ctx[k] !== expected) {
      return {
        auditType: ruleset.auditType,
        packageSlug: ruleset.packageSlug,
        status: 'not_applicable',
        maturity: ruleset.maturity,
        disclaimer: ruleset.disclaimer,
        missingKeys,
        moduleSlugs: [],
        surveyKeys: [],
        surveyNames: [],
        familyIds: [],
        notes: [
          `Contexte incompatible : ${k}=${String(ctx[k] ?? '∅')} (attendu ${expected}).`,
        ],
        sourceHints: ruleset.always.sourceHints,
        officialArticleRefs: [],
        appliedRuleIds: [],
        context: ctx,
      };
    }
  }

  if (missingKeys.length > 0) {
    return {
      auditType: ruleset.auditType,
      packageSlug: ruleset.packageSlug,
      status: 'incomplete_context',
      maturity: ruleset.maturity,
      disclaimer: ruleset.disclaimer,
      missingKeys,
      moduleSlugs: [],
      surveyKeys: [],
      surveyNames: [],
      familyIds: [],
      notes: [`Renseigner le Scope : ${missingKeys.join(', ')}`],
      sourceHints: ruleset.always.sourceHints,
      officialArticleRefs: [],
      appliedRuleIds: [],
      context: ctx,
    };
  }

  let moduleSlugs = [...ruleset.always.moduleSlugs];
  let surveyKeys = [...ruleset.always.surveyKeys];
  const familyIds = [...ruleset.always.familyIds];
  const notes: string[] = [];
  const sourceHints = [...ruleset.always.sourceHints];
  const officialArticleRefs = [...ruleset.always.officialArticleRefs];
  const appliedRuleIds = ['RULE.PRECOM.ALWAYS.P0'];

  for (const rule of ruleset.conditionals) {
    if (!matchesWhen(ctx, rule.when)) continue;
    appliedRuleIds.push(rule.id);
    if (rule.boostModuleSlugs?.length) moduleSlugs.push(...rule.boostModuleSlugs);
    if (rule.boostSurveyKeys?.length) {
      // Boost = move to front
      surveyKeys = [...rule.boostSurveyKeys, ...surveyKeys];
    }
    if (rule.notes?.length) notes.push(...rule.notes);
    if (rule.sourceHints?.length) sourceHints.push(...rule.sourceHints);
    if (rule.officialArticleRefs?.length) officialArticleRefs.push(...rule.officialArticleRefs);
  }

  moduleSlugs = uniq(moduleSlugs);
  surveyKeys = uniq(surveyKeys);

  return {
    auditType: ruleset.auditType,
    packageSlug: ruleset.packageSlug,
    status: 'ok',
    maturity: ruleset.maturity,
    disclaimer: ruleset.disclaimer,
    missingKeys: [],
    moduleSlugs,
    surveyKeys,
    surveyNames: surveyKeys.map((key) => ({
      key,
      name: ruleset.surveyCatalog[key] ?? key,
    })),
    familyIds: uniq(familyIds),
    notes,
    sourceHints: uniq(sourceHints),
    officialArticleRefs: uniq(officialArticleRefs),
    appliedRuleIds,
    context: ctx,
  };
}
