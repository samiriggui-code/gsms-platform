import type { IrvBand, RiskPriority, VulnerabilityRating, TearStrategy, ActionStatus, AssessmentStatus, ReviewStatus } from './csmp-types';
import type { RiskLevel } from '../components/hifi/RiskBadge';
import { translate, useI18nStore } from '../i18n';

export const IRV_TO_LEVEL: Record<IrvBand, RiskLevel> = {
  NEGLIGIBLE: 'Negligible',
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  EXTREME: 'Extreme',
};

export const PRIORITY_TO_LEVEL: Record<RiskPriority, RiskLevel> = {
  LOW: 'Low',
  MEDIUM: 'Moderate',
  HIGH: 'High',
  HIGHEST: 'Extreme',
};

/** @deprecated Prefer t(`enum.vulnerabilityRating.${r}`) — kept for non-React call sites during migration. */
export const VULN_LABEL: Record<VulnerabilityRating, string> = {
  STRONG: 'Strong',
  BASELINE: 'Baseline',
  BARELY_ADEQUATE: 'Barely adequate',
  INADEQUATE: 'Inadequate',
};

/** @deprecated Prefer t(`enum.tear.${s}`) */
export const TEAR_LABEL: Record<TearStrategy, string> = {
  TRANSFER: 'Transfer',
  ELIMINATE: 'Eliminate',
  ACCEPT: 'Accept',
  REDUCE: 'Reduce',
};

/** @deprecated Prefer help.assessments.tearBlurb / assessment keys */
export const TEAR_BLURB: Record<TearStrategy, string> = {
  TRANSFER: 'Shift the risk to a third party (insurance, outsourcing, shared liability).',
  ELIMINATE: 'Remove the asset, activity, or exposure so the threat no longer applies.',
  ACCEPT: 'Tolerate the residual risk; document ALARP rationale for leadership.',
  REDUCE: 'Apply controls to lower likelihood, impact, or vulnerability — drive the action plan.',
};

export const ACTION_STATUS_VARIANT: Record<ActionStatus, 'ok' | 'warn' | 'bad' | 'info' | 'default'> = {
  PENDING: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'ok',
  OVERDUE: 'bad',
  CANCELLED: 'default',
};

export const REVIEW_STATUS_VARIANT: Record<ReviewStatus, 'ok' | 'warn' | 'bad' | 'info' | 'default'> = {
  PENDING: 'default',
  IN_REVIEW: 'info',
  APPROVED: 'ok',
  REJECTED: 'bad',
  REVISION_REQUESTED: 'warn',
};

export function statusLabel(s: AssessmentStatus): string {
  const locale = useI18nStore.getState().locale;
  return translate(locale, `enum.assessmentStatus.${s}`);
}

export function reviewStatusLabel(s: ReviewStatus): string {
  const locale = useI18nStore.getState().locale;
  return translate(locale, `enum.reviewStatus.${s}`);
}

export function vulnLabel(r: VulnerabilityRating): string {
  const locale = useI18nStore.getState().locale;
  return translate(locale, `enum.vulnerabilityRating.${r}`);
}

export function tearLabel(s: TearStrategy): string {
  const locale = useI18nStore.getState().locale;
  return translate(locale, `enum.tear.${s}`);
}

export const STEP_LABELS: readonly string[] = [
  'Scope',
  'Threats',
  'Likelihood',
  'Impact',
  'IRV',
  'Vulnerability',
  'Treatment',
];

export const STEP_KICKERS: readonly string[] = [
  'Identify & scope',
  "3 A's · DBT",
  '1–5 scale',
  '5 dimensions',
  'IRV · Matrix 1',
  'Controls',
  'TEAR · priority',
];
