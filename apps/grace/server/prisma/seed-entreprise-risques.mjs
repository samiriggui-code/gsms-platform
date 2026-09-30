// Seed: audit entreprise risques & continuité (GSMS additive).
// ISO 31000 / 22301 = principes — pas certification. Registre = SimpleRisk. Formation = School.
// Does NOT modify banking, ERP, IGH, site-surete, CNAPS, risk-engine.
//
// Run: node prisma/seed-entreprise-risques.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedAdditivePack } from './_seed-additive-pack.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('@prisma/client').Prisma.InputJsonValue} */
const CUSTOM_FIELD_SCHEMA = [
  {
    key: 'country',
    label: 'Pays',
    type: 'select',
    options: ['FR'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Pack entreprise-risques = FR (+ cadre EU CER/NIS2 en flags seulement).',
    sortOrder: 5,
  },
  {
    key: 'org_size',
    label: 'Taille organisation',
    type: 'select',
    options: ['TPE', 'PME', 'ETI', 'GE'],
    required: false,
    appliesTo: 'assessment',
    helpText: 'Ordre de grandeur — pas un critère légal dans ce pack.',
    sortOrder: 10,
  },
  {
    key: 'has_security_provider',
    label: 'Prestataire de sécurité privée',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Si oui : croiser pack sec-privee-cnaps pour le détail titres.',
    sortOrder: 20,
  },
  {
    key: 'has_pca',
    label: 'PCA / plan de crise existant',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Focus module continuité.',
    sortOrder: 30,
  },
  {
    key: 'cer_nis2_status',
    label: 'Statut CER / NIS2',
    type: 'select',
    options: ['non_evalue', 'non_applicable', 'applicable_essential', 'applicable_important'],
    required: false,
    appliesTo: 'assessment',
    helpText: 'Flag seulement — ce pack n’évalue pas les obligations CER/NIS2.',
    sortOrder: 40,
  },
  {
    key: 'simplerisk_linked',
    label: 'Registre SimpleRisk (ou équivalent) en place',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Le détail des risques ne vit pas dans Grace.',
    sortOrder: 50,
  },
];

await seedAdditivePack({
  seedFile: join(__dirname, 'entreprise_risques_seed.json'),
  cmSeedFile: join(__dirname, 'entreprise_risques_countermeasures_seed.json'),
  customFieldSchema: CUSTOM_FIELD_SCHEMA,
  package: {
    slug: 'entreprise-risques',
    name: 'Audit entreprise — risques & continuité',
    industry: 'Organisation / gouvernance',
    version: '0.1.0',
    regionScope: 'FR',
    description:
      'Pack GSMS additif pour audit de gouvernance risque / continuité (organisation). ' +
      'ISO 31000 & 22301 = inspiration principes, pas certification. ' +
      'Registre de risques = SimpleRisk (aval). Formations = GSMS School. ' +
      'Cartographie : AUD.ENTREPRISE.RISQUES. Ne remplace pas les packs terrain ' +
      '(site-surete, erp, igh, cnaps). Ne modifie pas le risk engine. ' +
      'Checklist opérationnelle (SOURCES-STATUS-ENTREPRISE-RISQUES).',
    complianceRefs: [
      'ISO31000',
      'ISO22301',
      'CT',
      'AUD.ENTREPRISE.RISQUES',
    ],
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
