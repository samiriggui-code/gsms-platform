import type { Guide, GuideTFn } from './types';
import { buildWelcomeGuide } from './welcome';
import { buildDashboardGuide } from './dashboard';
import { buildAssetsGuide } from './assets';
import { buildClustersGuide } from './clusters';
import { buildRelationshipsGuide } from './relationships';
import { buildSiteMapGuide } from './site-map';
import { buildAssessmentsGuide } from './assessments';
import { buildSurveysGuide } from './surveys';
import { buildCountermeasuresGuide } from './countermeasures';
import { buildTemplatesGuide } from './templates';
import { buildReviewGuide } from './review';

export type { GuideTFn } from './types';

const BUILDERS: Record<string, (t: GuideTFn) => Guide> = {
  welcome: buildWelcomeGuide,
  dashboard: buildDashboardGuide,
  assets: buildAssetsGuide,
  clusters: buildClustersGuide,
  relationships: buildRelationshipsGuide,
  'site-map': buildSiteMapGuide,
  assessments: buildAssessmentsGuide,
  surveys: buildSurveysGuide,
  countermeasures: buildCountermeasuresGuide,
  templates: buildTemplatesGuide,
  review: buildReviewGuide,
};

export const GUIDE_IDS = Object.keys(BUILDERS);

export function hasGuide(id: string): boolean {
  return id in BUILDERS;
}

export function getGuide(id: string, t: GuideTFn): Guide | null {
  const builder = BUILDERS[id];
  return builder ? builder(t) : null;
}
