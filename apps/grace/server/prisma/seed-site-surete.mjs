// Seed script: site sûreté template package (GSMS additive).
// Pattern mirrored from seed-erp-precommission.mjs — does NOT modify banking or ERP.
// Physsec CSV = inspiration; droit = CSI / vidéoprotection. Not French law.
//
// Run:
//   node prisma/seed-site-surete.mjs
// Idempotent: upserts package, modules, assets, threats, CMs, correlations.

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(__dirname, 'site_surete_seed.json');
const CM_SEED_FILE = join(__dirname, 'site_surete_countermeasures_seed.json');

/** @type {import('@prisma/client').Prisma.InputJsonValue} */
const CUSTOM_FIELD_SCHEMA = [
  {
    key: 'country',
    label: 'Pays',
    type: 'select',
    options: ['FR'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Juridiction. Pack site-surete = FR (CSI / vidéoprotection).',
    sortOrder: 5,
  },
  {
    key: 'site_kind',
    label: 'Type de site',
    type: 'select',
    options: ['SITE', 'ERP', 'IGH', 'AUTRE'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'ERP/IGH = sûreté en complément du pack pré-commission, pas un remplacement.',
    sortOrder: 10,
  },
  {
    key: 'has_acs',
    label: 'Contrôle d’accès (ACS) présent',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Active le focus modules ACS / RFID.',
    sortOrder: 20,
  },
  {
    key: 'has_cctv',
    label: 'Vidéoprotection présente',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Croiser autorisation / finalités / durée (CSI vidéoprotection).',
    sortOrder: 30,
  },
  {
    key: 'has_bms',
    label: 'GTB / SMS présent',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Focus horaires, fail-secure, consignation.',
    sortOrder: 40,
  },
  {
    key: 'sensitive_zones',
    label: 'Zones sensibles',
    type: 'text',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Locaux / périmètres à protéger (serveurs, stocks, direction).',
    sortOrder: 50,
  },
  {
    key: 'adversary_sl_target',
    label: 'Niveau d’adversaire visé (Physsec SL)',
    type: 'select',
    options: ['SL1', 'SL2', 'SL3', 'SL4'],
    required: false,
    appliesTo: 'assessment',
    helpText: 'Profil terrain (SL1 opportuniste → SL4 outils spécialisés). Pas un score IRV.',
    sortOrder: 60,
  },
  {
    key: 'test_damage_ok',
    label: 'Essais pouvant marquer le matériel autorisés',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Si non : ne pas reproduire les tests Physsec à dégât cosmétique / opérationnel.',
    sortOrder: 70,
  },
];

const PACKAGE = {
  slug: 'site-surete',
  name: 'Sûreté de site',
  industry: 'Sûreté / sécurité physique',
  version: '0.1.0',
  regionScope: 'FR',
  description:
    'Pack GSMS additif pour audit sûreté / sécurité physique de site. ' +
    'Checklists inspirées de Physsec Methodology (public domain) — pas du droit français. ' +
    'Référentiels à croiser : CSI, vidéoprotection. Cartographie : AUD.SITE.SURETE. ' +
    'Ne remplace pas erp-precommission ni banking-finance. Ne modifie pas le risk engine.',
  complianceRefs: [
    'CSI',
    'VIDEOPROTECTION',
    'AUD.SITE.SURETE',
    'SRC.METH.PHYSSEC',
  ],
};

const prisma = new PrismaClient();

async function main() {
  const modules = JSON.parse(await readFile(SEED_FILE, 'utf-8'));
  console.log(`Loaded ${modules.length} modules from ${SEED_FILE}`);

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
