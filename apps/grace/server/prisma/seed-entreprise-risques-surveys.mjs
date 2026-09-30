// Seed surveys: entreprise-risques
// Run AFTER seed-entreprise-risques.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedAdditivePackSurveys } from './_seed-additive-pack-surveys.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

await seedAdditivePackSurveys({
  seedFile: join(__dirname, 'entreprise_risques_surveys_seed.json'),
  packSlug: 'entreprise-risques',
  label: 'entreprise-risques',
  packSeedHint: 'seed-entreprise-risques.mjs',
}).catch((err) => {
  console.error('[seed-entreprise-risques-surveys] failed:', err);
  process.exit(1);
});
