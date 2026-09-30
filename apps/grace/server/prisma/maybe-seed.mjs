// Idempotent seed wrapper that runs at container startup.
//
// Order (FK + dependency-aware):
//   1. seed-survey-questions.mjs — always (idempotent global question library).
//      Must run BEFORE seed.ts because the Nordica demo survey scopes
//      reference these system questions by prompt.
//   2. seed.ts (Nordica demo org + users) — only when DB has no users.
//      Critical for the sandbox reset cycle: after a templated DROP/CREATE
//      the API restarts, but the freshly-templated DB already has its seeded
//      users, so this pass is a no-op (we MUST NOT re-run seed.ts on restart).
//   3. seed-banking-finance.mjs (Banking & Finance template package) —
//      always runs. The script is idempotent (upserts), so re-runs are safe
//      and prod relies on this for template-library content.
//   4. seed-erp-precommission.mjs (GSMS ERP pré-commission pack) —
//      always runs, additive, does not modify banking.
//   5. seed-erp-precommission-surveys.mjs (FR survey templates + AAA attachments) —
//      after pack so asset/threat/CM templates exist for question links.
//   6. seed-site-surete.mjs (GSMS sûreté pack, Physsec-inspired) —
//      always runs, additive, does not modify banking or ERP.
//   7. seed-site-surete-surveys.mjs — after site-surete pack.
//   8. seed-igh-precommission.mjs (GSMS IGH pré-commission pack) —
//      always runs, additive, does not modify banking, ERP, or site-surete.
//   9. seed-igh-precommission-surveys.mjs — after igh-precommission pack.
//  10. seed-sec-privee-cnaps.mjs — CNAPS org pack (CSI livre VI).
//  11. seed-sec-privee-cnaps-surveys.mjs — after CNAPS pack.
//  12. seed-entreprise-risques.mjs — gouvernance (ISO principes, aval SimpleRisk).
//  13. seed-entreprise-risques-surveys.mjs — after entreprise-risques pack.
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function runScript(scriptPath, runner) {
  if (!existsSync(scriptPath)) {
    console.log(`[maybe-seed] ${scriptPath} not found — skipping`);
    return 0;
  }
  const args = runner === 'tsx' ? ['tsx', scriptPath] : [scriptPath];
  const cmd = runner === 'tsx' ? 'npx' : 'node';
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

const prisma = new PrismaClient();

try {
  const userCount = await prisma.user.count();
  await prisma.$disconnect();

  // Step 1 — global question library FIRST so seed.ts can reference questions
  // by prompt when creating instance survey scopes.
  console.log('[maybe-seed] running seed-survey-questions.mjs (idempotent upsert)');
  const sqCode = runScript(join(__dirname, 'seed-survey-questions.mjs'), 'node');
  if (sqCode !== 0) {
    console.error(`[maybe-seed] seed-survey-questions.mjs exited with status ${sqCode}`);
    process.exit(sqCode);
  }

  // Step 2 — demo seed (Nordica) only on empty DB.
  if (userCount === 0) {
    console.log('[maybe-seed] empty DB — running seed.ts');
    const code = runScript(join(__dirname, 'seed.ts'), 'tsx');
    if (code !== 0) {
      console.error(`[maybe-seed] seed.ts exited with status ${code}`);
      process.exit(code);
    }
  } else {
    console.log(`[maybe-seed] ${userCount} users already exist — skipping seed.ts`);
  }

  // Step 3 — Banking & Finance template package (global, idempotent).
  console.log('[maybe-seed] running seed-banking-finance.mjs (idempotent upsert)');
  const code = runScript(join(__dirname, 'seed-banking-finance.mjs'), 'node');
  if (code !== 0) {
    console.error(`[maybe-seed] seed-banking-finance.mjs exited with status ${code}`);
    process.exit(code);
  }

  // Step 4 — ERP pré-commission pack (GSMS additive, idempotent).
  console.log('[maybe-seed] running seed-erp-precommission.mjs (idempotent upsert)');
  const frCode = runScript(join(__dirname, 'seed-erp-precommission.mjs'), 'node');
  if (frCode !== 0) {
    console.error(`[maybe-seed] seed-erp-precommission.mjs exited with status ${frCode}`);
    process.exit(frCode);
  }

  // Step 5 — ERP précom survey templates + FR question attachments.
  console.log('[maybe-seed] running seed-erp-precommission-surveys.mjs (idempotent upsert)');
  const surveyCode = runScript(join(__dirname, 'seed-erp-precommission-surveys.mjs'), 'node');
  if (surveyCode !== 0) {
    console.error(`[maybe-seed] seed-erp-precommission-surveys.mjs exited with status ${surveyCode}`);
    process.exit(surveyCode);
  }

  // Step 6 — site sûreté pack (GSMS additive, Physsec-inspired).
  console.log('[maybe-seed] running seed-site-surete.mjs (idempotent upsert)');
  const sureteCode = runScript(join(__dirname, 'seed-site-surete.mjs'), 'node');
  if (sureteCode !== 0) {
    console.error(`[maybe-seed] seed-site-surete.mjs exited with status ${sureteCode}`);
    process.exit(sureteCode);
  }

  // Step 7 — site sûreté surveys + question attachments.
  console.log('[maybe-seed] running seed-site-surete-surveys.mjs (idempotent upsert)');
  const sureteSurveyCode = runScript(join(__dirname, 'seed-site-surete-surveys.mjs'), 'node');
  if (sureteSurveyCode !== 0) {
    console.error(`[maybe-seed] seed-site-surete-surveys.mjs exited with status ${sureteSurveyCode}`);
    process.exit(sureteSurveyCode);
  }

  // Step 8 — IGH pré-commission pack (GSMS additive, idempotent).
  console.log('[maybe-seed] running seed-igh-precommission.mjs (idempotent upsert)');
  const ighCode = runScript(join(__dirname, 'seed-igh-precommission.mjs'), 'node');
  if (ighCode !== 0) {
    console.error(`[maybe-seed] seed-igh-precommission.mjs exited with status ${ighCode}`);
    process.exit(ighCode);
  }

  // Step 9 — IGH précom survey templates + FR question attachments.
  console.log('[maybe-seed] running seed-igh-precommission-surveys.mjs (idempotent upsert)');
  const ighSurveyCode = runScript(join(__dirname, 'seed-igh-precommission-surveys.mjs'), 'node');
  if (ighSurveyCode !== 0) {
    console.error(`[maybe-seed] seed-igh-precommission-surveys.mjs exited with status ${ighSurveyCode}`);
    process.exit(ighSurveyCode);
  }

  // Step 10 — sécurité privée CNAPS pack.
  console.log('[maybe-seed] running seed-sec-privee-cnaps.mjs (idempotent upsert)');
  const cnapsCode = runScript(join(__dirname, 'seed-sec-privee-cnaps.mjs'), 'node');
  if (cnapsCode !== 0) {
    console.error(`[maybe-seed] seed-sec-privee-cnaps.mjs exited with status ${cnapsCode}`);
    process.exit(cnapsCode);
  }

  // Step 11 — CNAPS surveys.
  console.log('[maybe-seed] running seed-sec-privee-cnaps-surveys.mjs (idempotent upsert)');
  const cnapsSurveyCode = runScript(join(__dirname, 'seed-sec-privee-cnaps-surveys.mjs'), 'node');
  if (cnapsSurveyCode !== 0) {
    console.error(`[maybe-seed] seed-sec-privee-cnaps-surveys.mjs exited with status ${cnapsSurveyCode}`);
    process.exit(cnapsSurveyCode);
  }

  // Step 12 — entreprise risques / continuité pack.
  console.log('[maybe-seed] running seed-entreprise-risques.mjs (idempotent upsert)');
  const entCode = runScript(join(__dirname, 'seed-entreprise-risques.mjs'), 'node');
  if (entCode !== 0) {
    console.error(`[maybe-seed] seed-entreprise-risques.mjs exited with status ${entCode}`);
    process.exit(entCode);
  }

  // Step 13 — entreprise risques surveys.
  console.log('[maybe-seed] running seed-entreprise-risques-surveys.mjs (idempotent upsert)');
  const entSurveyCode = runScript(join(__dirname, 'seed-entreprise-risques-surveys.mjs'), 'node');
  if (entSurveyCode !== 0) {
    console.error(`[maybe-seed] seed-entreprise-risques-surveys.mjs exited with status ${entSurveyCode}`);
    process.exit(entSurveyCode);
  }

  console.log('[maybe-seed] all seeds complete');
} catch (err) {
  console.error('[maybe-seed] error:', err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
}
