// Shared additive pack survey seed (GSMS).
// Used by pack-specific wrappers — attaches questions only to the named pack.

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

/**
 * @param {{ seedFile: string, packSlug: string, label: string, packSeedHint: string }} opts
 */
export async function seedAdditivePackSurveys(opts) {
  const prisma = new PrismaClient();

  /** @param {string} name */
  function legacyNames(name) {
    return [`FR — ${name}`, `fr-${name}`];
  }

  async function resolvePackTemplateIds() {
    const pkg = await prisma.templatePackage.findUnique({
      where: { slug: opts.packSlug },
      select: {
        id: true,
        modules: {
          select: {
            id: true,
            assetTemplates: { select: { id: true, slug: true } },
            threatTemplates: { select: { id: true, slug: true } },
            countermeasureTemplates: { select: { id: true, slug: true } },
          },
        },
      },
    });
    if (!pkg) {
      throw new Error(`Package '${opts.packSlug}' not found — run ${opts.packSeedHint} first`);
    }

    /** @type {Map<string, string>} */
    const assets = new Map();
    /** @type {Map<string, string>} */
    const threats = new Map();
    /** @type {Map<string, string>} */
    const cms = new Map();

    for (const m of pkg.modules) {
      for (const a of m.assetTemplates) assets.set(a.slug, a.id);
      for (const t of m.threatTemplates) threats.set(t.slug, t.id);
      for (const c of m.countermeasureTemplates) cms.set(c.slug, c.id);
    }

    return { assets, threats, cms };
  }

  /**
   * @param {{ prompt: string, type: string, evidenceType: string, category?: string|null, hint?: string|null, options?: unknown, severityMap?: unknown, weight: number }} q
   */
  async function upsertLibraryQuestion(q) {
    const existing = await prisma.surveyQuestion.findFirst({
      where: {
        isSystem: true,
        prompt: q.prompt,
        type: q.type,
        evidenceType: q.evidenceType,
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data: {
          category: q.category ?? null,
          hint: q.hint ?? null,
          options: q.options ?? undefined,
          severityMap: q.severityMap ?? undefined,
          defaultWeight: q.weight,
          isActive: true,
        },
      });
      return existing.id;
    }
    const created = await prisma.surveyQuestion.create({
      data: {
        isSystem: true,
        prompt: q.prompt,
        category: q.category ?? null,
        hint: q.hint ?? null,
        type: q.type,
        options: q.options ?? undefined,
        severityMap: q.severityMap ?? undefined,
        evidenceType: q.evidenceType,
        defaultWeight: q.weight,
        isActive: true,
      },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * @param {string} questionId
   * @param {{ assetSlugs?: string[], threatSlugs?: string[], cmSlugs?: string[] }} attach
   * @param {{ assets: Map<string,string>, threats: Map<string,string>, cms: Map<string,string> }} maps
   */
  async function attachToPack(questionId, attach, maps) {
    let n = 0;
    for (const slug of attach.assetSlugs ?? []) {
      const id = maps.assets.get(slug);
      if (!id) {
        console.warn(`  ! asset slug missing in pack: ${slug}`);
        continue;
      }
      await prisma.assetTemplateQuestion.upsert({
        where: { assetTemplateId_questionId: { assetTemplateId: id, questionId } },
        create: { assetTemplateId: id, questionId, sortOrder: n },
        update: {},
      });
      n += 1;
    }
    for (const slug of attach.threatSlugs ?? []) {
      const id = maps.threats.get(slug);
      if (!id) {
        console.warn(`  ! threat slug missing in pack: ${slug}`);
        continue;
      }
      await prisma.threatTemplateQuestion.upsert({
        where: { threatTemplateId_questionId: { threatTemplateId: id, questionId } },
        create: { threatTemplateId: id, questionId, sortOrder: n },
        update: {},
      });
      n += 1;
    }
    for (const slug of attach.cmSlugs ?? []) {
      const id = maps.cms.get(slug);
      if (!id) {
        console.warn(`  ! cm slug missing in pack: ${slug}`);
        continue;
      }
      await prisma.countermeasureTemplateQuestion.upsert({
        where: {
          countermeasureTemplateId_questionId: { countermeasureTemplateId: id, questionId },
        },
        create: { countermeasureTemplateId: id, questionId, sortOrder: n },
        update: {},
      });
      n += 1;
    }
    return n;
  }

  /**
   * @param {object} tpl
   * @param {Map<string, object>} questionById
   */
  async function upsertSurveyTemplate(tpl, questionById) {
    const questions = [];
    for (const qid of tpl.questionIds) {
      const q = questionById.get(qid);
      if (!q) {
        console.warn(`  ! template ${tpl.key}: unknown question id ${qid}`);
        continue;
      }
      questions.push({
        id: q.id,
        category: q.category,
        prompt: q.prompt,
        type: q.type,
        weight: q.weight,
        hint: q.hint,
        options: q.options,
        severityMap: q.severityMap,
      });
    }
    if (questions.length === 0) {
      throw new Error(`Template ${tpl.key} has no questions`);
    }

    const schema = { packKey: tpl.key, questions };

    let existing = await prisma.surveyTemplate.findFirst({
      where: { name: tpl.name },
    });

    for (const legacy of legacyNames(tpl.name)) {
      const old = await prisma.surveyTemplate.findFirst({ where: { name: legacy } });
      if (old && (!existing || old.id !== existing.id)) {
        await prisma.surveyTemplate.delete({ where: { id: old.id } });
        console.log(`  Removed legacy survey template "${legacy}"`);
      }
    }

    if (existing) {
      existing = await prisma.surveyTemplate.update({
        where: { id: existing.id },
        data: {
          description: tpl.description,
          surveyType: tpl.surveyType,
          applicableClusterTypes: tpl.applicableClusterTypes,
          applicableAssetTypes: tpl.applicableAssetTypes,
          requiresPhysical: tpl.requiresPhysical,
          isSystem: true,
          isActive: true,
          schema,
        },
      });
      return { id: existing.id, created: false, questionCount: questions.length };
    }

    const created = await prisma.surveyTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        surveyType: tpl.surveyType,
        applicableClusterTypes: tpl.applicableClusterTypes,
        applicableAssetTypes: tpl.applicableAssetTypes,
        requiresPhysical: tpl.requiresPhysical,
        isSystem: true,
        isActive: true,
        schema,
      },
    });
    return { id: created.id, created: true, questionCount: questions.length };
  }

  try {
    const seed = JSON.parse(await readFile(opts.seedFile, 'utf-8'));
    const maps = await resolvePackTemplateIds();

    /** @type {Map<string, object>} */
    const questionById = new Map();
    let attachTotal = 0;

    console.log(`Seeding ${seed.questions.length} FR survey questions for pack ${opts.packSlug}…`);
    for (const q of seed.questions) {
      const libId = await upsertLibraryQuestion(q);
      questionById.set(q.id, q);
      q._dbId = libId;
      const n = await attachToPack(libId, q.attach ?? {}, maps);
      attachTotal += n;
    }

    console.log(`Upserting ${seed.templates.length} SurveyTemplates…`);
    let tplCreated = 0;
    let tplUpdated = 0;
    for (const tpl of seed.templates) {
      const r = await upsertSurveyTemplate(tpl, questionById);
      if (r.created) tplCreated += 1;
      else tplUpdated += 1;
      console.log(`  ✓ ${tpl.name} (${r.questionCount} questions)`);
    }

    console.log(
      `Seeded ${opts.label} surveys: ${seed.questions.length} library questions, ` +
        `${attachTotal} pack attachments, ${tplCreated} templates created, ${tplUpdated} updated`,
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}
