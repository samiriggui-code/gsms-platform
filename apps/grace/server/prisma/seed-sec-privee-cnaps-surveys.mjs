// Seed surveys: sec-privee-cnaps
// Run AFTER seed-sec-privee-cnaps.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedAdditivePackSurveys } from './_seed-additive-pack-surveys.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

await seedAdditivePackSurveys({
  seedFile: join(__dirname, 'sec_privee_cnaps_surveys_seed.json'),
  packSlug: 'sec-privee-cnaps',
  label: 'sec-privee-cnaps',
  packSeedHint: 'seed-sec-privee-cnaps.mjs',
}).catch((err) => {
  console.error('[seed-sec-privee-cnaps-surveys] failed:', err);
  process.exit(1);
});
