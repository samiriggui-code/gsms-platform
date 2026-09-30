// Seed script: ERP pré-commission template package (GSMS additive).
// Pattern mirrored from seed-banking-finance.mjs — does NOT modify banking.
//
// Run:
//   node prisma/seed-erp-precommission.mjs
// Idempotent: upserts package, modules, assets, threats, CMs, correlations.

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(__dirname, 'erp_precommission_seed.json');
const CM_SEED_FILE = join(__dirname, 'erp_precommission_countermeasures_seed.json');

/** @type {import('@prisma/client').Prisma.InputJsonValue} */
const CUSTOM_FIELD_SCHEMA = [
  {
    key: 'country',
    label: 'Pays',
    type: 'select',
    options: ['FR'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Juridiction du site. Pack erp-precommission = FR.',
    sortOrder: 5,
  },
  {
    key: 'site_kind',
    label: 'Type de site',
    type: 'select',
    options: ['ERP', 'IGH', 'AUTRE'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Pour ce pack, sélectionner ERP.',
    sortOrder: 10,
  },
  {
    key: 'erp_type',
    label: 'Type ERP',
    type: 'select',
    options: ['J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'PA', 'CTS', 'SG', 'PS', 'GA', 'OA', 'EF', 'REF', 'Autre'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Types GN 1 (RS 25/06/1980) — LEGIARTI000045143487. Charge les DP du type.',
    sortOrder: 20,
  },
  {
    key: 'erp_category',
    label: 'Catégorie ERP',
    type: 'select',
    options: ['1', '2', '3', '4', '5'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'CCH R143-19 : 1re >1500 · 2e 701–1500 · 3e 301–700 · 4e ≤300 · 5e. LEGIARTI000043818977.',
    sortOrder: 30,
  },  {
    key: 'commission_phase',
    label: 'Phase commission',
    type: 'select',
    options: ['pre_commission', 'periodique', 'apres_prescription', 'ouverture'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'pre_commission = avant 1ère commission · periodique · apres_prescription · ouverture.',
    sortOrder: 40,
  },
  {
    key: 'occupancy',
    label: 'Effectif / capacité',
    type: 'number',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Effectif maximal simultané ou capacité déclarée.',
    sortOrder: 50,
  },
  {
    key: 'has_ssi',
    label: 'SSI présent',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Active le focus module SSI / essais.',
    sortOrder: 60,
  },
  {
    key: 'ssiap_required',
    label: 'Service SSIAP requis',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Indicateur d’applicabilité famille service sécurité incendie (MS 45–52 · arrêté SSIAP 2/05/2005). Active mod-ssiap.',
    sortOrder: 65,
  },
  {
    key: 'activity',
    label: 'Activité principale',
    type: 'text',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Libellé d’activité pour affinage.',
    sortOrder: 70,
  },
  {
    key: 'building_features',
    label: 'Particularités bâtiment',
    type: 'text',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Ex. atriums, niveaux, désenfumage, locaux à sommeil…',
    sortOrder: 80,
  },
];

const PACKAGE = {
  slug: 'erp-precommission',
  name: 'Pré-commission ERP',
  industry: 'Établissements recevant du public',
  version: '0.2.0',
  regionScope: 'FR',
  description:
    'Pack GSMS additif pour audit de pré-commission / préparation commission de sécurité ' +
    'des établissements recevant du public (ERP). Modules : classement, dégagements, ' +
    'évacuation, moyens, SSI, registre, dossier, essais, DP type R/N, SSIAP. ' +
    'Réf. cartographie : AUD.PRECOMMISSION.ERP. Ne remplace pas banking-finance. ' +
    'Ne modifie pas le risk engine — contenu via templates uniquement. ' +
    'IMPORTANT : checklist scoped Légifrance — pas une évaluation article-atomique ' +
    '(voir docs/cartography/SOURCES-STATUS-ERP-PRECOM.md).',
  complianceRefs: [
    'ERP.RS',
    'ERP.DG',
    'ERP.DP',
    'CCH',
    'COMMISSION',
    'SSI',
    'SSIAP',
    'AUD.PRECOMMISSION.ERP',
  ],
};

const prisma = new PrismaClient();

async function main() {
  const modules = JSON.parse(await readFile(SEED_FILE, 'utf-8'));
  console.log(`Loaded ${modules.length} modules from ${SEED_FILE}`);

  // Drop legacy slug if present (rename fr-erp-precommission → erp-precommission).
  const legacy = await prisma.templatePackage.findUnique({ where: { slug: 'fr-erp-precommission' } });
  if (legacy) {
    await prisma.templatePackage.delete({ where: { id: legacy.id } });
    console.log('Removed legacy package slug fr-erp-precommission');
  }

  const pkg = await prisma.templatePackage.upsert({
    where: { slug: PACKAGE.slug },
    update: {
      name: PACKAGE.name,
      industry: PACKAGE.industry,
      version: PACKAGE.version,
      regionScope: PACKAGE.regionScope,
      description: PACKAGE.description,
      complianceRefs: PACKAGE.complianceRefs,
      customFieldSchema: CUSTOM_FIELD_SCHEMA,
      isSystem: true,
      enabled: true,
    },
    create: {
      ...PACKAGE,
      customFieldSchema: CUSTOM_FIELD_SCHEMA,
      isSystem: true,
      enabled: true,
    },
  });

  let totalAssets = 0;
  let totalThreats = 0;

  /** @type {Map<string, string>} */
  const assetIdByModuleAndSlug = new Map();

  for (const mod of modules) {
    const m = await prisma.templateModule.upsert({
      where: { packageId_slug: { packageId: pkg.id, slug: mod.slug } },
      update: {
        name: mod.name,
        description: mod.description ?? null,
        icon: mod.icon ?? null,
        sortOrder: mod.sortOrder ?? 0,
      },
      create: {
        packageId: pkg.id,
        slug: mod.slug,
        name: mod.name,
        description: mod.description ?? null,
        icon: mod.icon ?? null,
        sortOrder: mod.sortOrder ?? 0,
      },
    });

    for (const asset of mod.assets ?? []) {
      const defaultAssetRole = asset.defaultAssetRole ?? null;
      const saved = await prisma.assetTemplate.upsert({
        where: { moduleId_slug: { moduleId: m.id, slug: asset.slug } },
        update: {
          name: asset.name,
          assetType: asset.assetType,
          category: asset.category,
          description: asset.description ?? null,
          defaultCriticality: asset.defaultCriticality ?? 3,
          defaultAssetRole,
          parentSlug: asset.parentSlug ?? null,
          tags: asset.tags ?? [],
          attributes: asset.metadata ?? {},
        },
        create: {
          moduleId: m.id,
          slug: asset.slug,
          name: asset.name,
          assetType: asset.assetType,
          category: asset.category,
          description: asset.description ?? null,
          defaultCriticality: asset.defaultCriticality ?? 3,
          defaultAssetRole,
          parentSlug: asset.parentSlug ?? null,
          tags: asset.tags ?? [],
          attributes: asset.metadata ?? {},
        },
      });
      assetIdByModuleAndSlug.set(`${mod.slug}::${asset.slug}`, saved.id);
      totalAssets++;
    }

    for (const threat of mod.threats ?? []) {
      await prisma.threatTemplate.upsert({
        where: { moduleId_slug: { moduleId: m.id, slug: threat.slug } },
        update: {
          scenarioName: threat.scenarioName,
          adversaryType: threat.adversaryType,
          actionType: threat.actionType,
          adversaryProfile: threat.adversaryProfile ?? {},
          typicalActions: threat.typicalActions ?? [],
          targetAssetTypes: threat.targetAssetTypes ?? [],
          indicators: threat.indicators ?? [],
          suggestedLikelihood: threat.suggestedLikelihood ?? null,
          csmpUnitReference: threat.csmpUnitReference ?? null,
        },
        create: {
          moduleId: m.id,
          slug: threat.slug,
          scenarioName: threat.scenarioName,
          adversaryType: threat.adversaryType,
          actionType: threat.actionType,
          adversaryProfile: threat.adversaryProfile ?? {},
          typicalActions: threat.typicalActions ?? [],
          targetAssetTypes: threat.targetAssetTypes ?? [],
          indicators: threat.indicators ?? [],
          suggestedLikelihood: threat.suggestedLikelihood ?? null,
          csmpUnitReference: threat.csmpUnitReference ?? null,
        },
      });
      totalThreats++;
    }

    console.log(`  ✓ ${mod.name} (${(mod.assets ?? []).length} assets, ${(mod.threats ?? []).length} threats)`);
  }

  // Package-wide threat lookup — allows recommendedThreats across modules (P0 pack is small).
  const threatIdBySlug = new Map();
  for (const t of await prisma.threatTemplate.findMany({
    where: { module: { packageId: pkg.id } },
    select: { id: true, slug: true },
  })) threatIdBySlug.set(t.slug, t.id);

  let totalCorrelations = 0;
  for (const mod of modules) {
    for (const asset of mod.assets ?? []) {
      const assetId = assetIdByModuleAndSlug.get(`${mod.slug}::${asset.slug}`);
      if (!assetId) continue;
      await prisma.assetTemplateThreat.deleteMany({ where: { assetTemplateId: assetId } });
      for (const rec of asset.recommendedThreats ?? []) {
        const threatId = threatIdBySlug.get(rec.slug);
        if (!threatId) {
          console.warn(`  WARN ${mod.slug}/${asset.slug}: unknown threat ${rec.slug} — skipped`);
          continue;
        }
        const relevance = ['HIGH', 'MEDIUM', 'LOW'].includes(rec.relevance) ? rec.relevance : 'MEDIUM';
        await prisma.assetTemplateThreat.create({
          data: {
            assetTemplateId: assetId,
            threatTemplateId: threatId,
            relevance,
            rationale: rec.rationale ?? null,
          },
        });
        totalCorrelations++;
      }
    }
  }

  // ── Countermeasure templates + threat junction ──────────
  let totalCms = 0;
  let totalCmLinks = 0;
  const cmSeed = JSON.parse(await readFile(CM_SEED_FILE, 'utf-8'));

  const moduleIdBySlug = new Map();
  for (const m of await prisma.templateModule.findMany({
    where: { packageId: pkg.id },
    select: { id: true, slug: true },
  })) moduleIdBySlug.set(m.slug, m.id);

  const cmIdBySlug = new Map();
  for (const cm of cmSeed.countermeasure_templates ?? []) {
    const moduleId = moduleIdBySlug.get(cm.moduleSlug);
    if (!moduleId) {
      console.warn(`  WARN countermeasure ${cm.slug}: unknown module ${cm.moduleSlug} — skipped`);
      continue;
    }
    const saved = await prisma.countermeasureTemplate.upsert({
      where: { moduleId_slug: { moduleId, slug: cm.slug } },
      update: {
        name: cm.name,
        description: cm.description ?? null,
        shapeCategory: cm.shapeCategory,
        ppsFunctions: cm.ppsFunctions ?? [],
        domain: cm.domain,
        defaultTearStrategy: cm.defaultTearStrategy ?? null,
        defaultEffectiveness: cm.defaultEffectiveness ?? null,
        typicalCostEstimate: cm.typicalCostEstimate ?? null,
        typicalAnnualCost: cm.typicalAnnualCost ?? null,
        tags: cm.tags ?? [],
        csmpUnitReference: cm.csmpUnitReference ?? null,
      },
      create: {
        moduleId,
        slug: cm.slug,
        name: cm.name,
        description: cm.description ?? null,
        shapeCategory: cm.shapeCategory,
        ppsFunctions: cm.ppsFunctions ?? [],
        domain: cm.domain,
        defaultTearStrategy: cm.defaultTearStrategy ?? null,
        defaultEffectiveness: cm.defaultEffectiveness ?? null,
        typicalCostEstimate: cm.typicalCostEstimate ?? null,
        typicalAnnualCost: cm.typicalAnnualCost ?? null,
        tags: cm.tags ?? [],
        csmpUnitReference: cm.csmpUnitReference ?? null,
      },
    });
    cmIdBySlug.set(cm.slug, saved.id);
    totalCms++;
  }

  await prisma.threatTemplateCountermeasure.deleteMany({
    where: {
      countermeasureTemplate: { module: { packageId: pkg.id } },
    },
  });

  for (const link of cmSeed.threat_countermeasures ?? []) {
    const threatId = threatIdBySlug.get(link.threatSlug);
    const cmId = cmIdBySlug.get(link.countermeasureSlug);
    if (!threatId) {
      console.warn(`  WARN link: unknown threat ${link.threatSlug} — skipped`);
      continue;
    }
    if (!cmId) {
      console.warn(`  WARN link: unknown countermeasure ${link.countermeasureSlug} — skipped`);
      continue;
    }
    const relevance = ['HIGH', 'MEDIUM', 'LOW'].includes(link.relevance) ? link.relevance : 'MEDIUM';
    await prisma.threatTemplateCountermeasure.create({
      data: {
        threatTemplateId: threatId,
        countermeasureTemplateId: cmId,
        relevance,
        rationale: link.rationale ?? null,
      },
    });
    totalCmLinks++;
  }

  console.log(
    `\nSeeded '${PACKAGE.name}': ${modules.length} modules, ${totalAssets} assets, ` +
    `${totalThreats} threats, ${totalCorrelations} correlations, ` +
    `${totalCms} countermeasures, ${totalCmLinks} threat↔cm links`,
  );
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
