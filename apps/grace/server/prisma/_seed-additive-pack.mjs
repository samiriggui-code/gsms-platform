// Shared additive TemplatePackage seed (GSMS).
// Used by pack-specific wrappers — does NOT touch banking or risk-engine.

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

/**
 * @param {{
 *   seedFile: string,
 *   cmSeedFile: string,
 *   package: {
 *     slug: string,
 *     name: string,
 *     industry: string,
 *     version: string,
 *     regionScope: string,
 *     description: string,
 *     complianceRefs: string[],
 *   },
 *   customFieldSchema: import('@prisma/client').Prisma.InputJsonValue,
 *   legacySlugs?: string[],
 * }} opts
 */
export async function seedAdditivePack(opts) {
  const prisma = new PrismaClient();
  try {
    const modules = JSON.parse(await readFile(opts.seedFile, 'utf-8'));
    console.log(`Loaded ${modules.length} modules from ${opts.seedFile}`);

    for (const legacySlug of opts.legacySlugs ?? []) {
      const legacy = await prisma.templatePackage.findUnique({ where: { slug: legacySlug } });
      if (legacy) {
        await prisma.templatePackage.delete({ where: { id: legacy.id } });
        console.log(`Removed legacy package slug ${legacySlug}`);
      }
    }

    const pkg = await prisma.templatePackage.upsert({
      where: { slug: opts.package.slug },
      update: {
        name: opts.package.name,
        industry: opts.package.industry,
        version: opts.package.version,
        regionScope: opts.package.regionScope,
        description: opts.package.description,
        complianceRefs: opts.package.complianceRefs,
        customFieldSchema: opts.customFieldSchema,
        isSystem: true,
        enabled: true,
      },
      create: {
        ...opts.package,
        customFieldSchema: opts.customFieldSchema,
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
    const cmSeed = JSON.parse(await readFile(opts.cmSeedFile, 'utf-8'));

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
      `\nSeeded '${opts.package.name}': ${modules.length} modules, ${totalAssets} assets, ` +
      `${totalThreats} threats, ${totalCorrelations} correlations, ` +
      `${totalCms} countermeasures, ${totalCmLinks} threat↔cm links`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
