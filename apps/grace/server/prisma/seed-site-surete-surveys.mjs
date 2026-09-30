// Seed: site sûreté survey templates + FR question library attachments.
// Runs AFTER seed-site-surete.mjs (needs pack asset/threat/CM templates).
//
// Does NOT modify banking, ERP, Nordica AssetTypeSurveyDefault, or risk-engine.
//
// Run:
//   node prisma/seed-site-surete-surveys.mjs
// Idempotent: upserts SurveyTemplate by name; SurveyQuestion by prompt fingerprint;
// attaches M:N only to site-surete pack templates (by slug).

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(__dirname, 'site_surete_surveys_seed.json');
const PACK_SLUG = 'site-surete';

const prisma = new PrismaClient();

/** @param {string} name */
function legacyNames(name) {
  // Old naming with fr- prefix (if any early seed) → delete / skip
  return [`FR — ${name}`, `fr-${name}`];
}

async function resolvePackTemplateIds() {
  const pkg = await prisma.templatePackage.findUnique({
    where: { slug: PACK_SLUG },
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
    throw new Error(`Package '${PACK_SLUG}' not found — run seed-site-surete.mjs first`);
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

  // Clean accidental legacy names
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

async function main() {
  const seed = JSON.parse(await readFile(SEED_FILE, 'utf-8'));
  const maps = await resolvePackTemplateIds();

  /** @type {Map<string, object>} */
  const questionById = new Map();
  let attachTotal = 0;

  console.log(`Seeding ${seed.questions.length} FR survey questions for pack ${PACK_SLUG}…`);
  for (const q of seed.questions) {
    const libId = await upsertLibraryQuestion(q);
    questionById.set(q.id, q);
    // Store DB uuid on the object for template schema id stability across re-runs
    q._dbId = libId;
    // Use stable string id in template schema (q.id) — run page expects string ids
    const n = await attachToPack(libId, q.attach ?? {}, maps);
    attachTotal += n;
  }

  // Rewrite template question payloads: keep stable seed ids (not UUIDs) for answer keys
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
    `Seeded site-surete surveys: ${seed.questions.length} library questions, ` +
      `${attachTotal} pack attachments, ${tplCreated} templates created, ${tplUpdated} updated`,
  );
}

void main()
  .catch(async (err) => {
    console.error('[seed-site-surete-surveys] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
