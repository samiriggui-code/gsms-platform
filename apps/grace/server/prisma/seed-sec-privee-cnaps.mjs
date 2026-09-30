// Seed: sécurité privée CNAPS (GSMS additive).
// Pattern: _seed-additive-pack.mjs — does NOT modify banking, ERP, IGH, site-surete, risk-engine.
// Formation continue → GSMS School (pas un LMS Grace).
//
// Run: node prisma/seed-sec-privee-cnaps.mjs

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
    helpText: 'Pack sec-privee-cnaps = FR (CSI livre VI / CNAPS).',
    sortOrder: 5,
  },
  {
    key: 'org_kind',
    label: 'Type d’organisation',
    type: 'select',
    options: ['entreprise_secu', 'donneur_ordre', 'mixte'],
    required: true,
    appliesTo: 'assessment',
    helpText: 'entreprise_secu = prestataire · donneur_ordre = client qui contractualise · mixte = les deux.',
    sortOrder: 10,
  },
  {
    key: 'activity_focus',
    label: 'Activité principale',
    type: 'select',
    options: [
      'surveillance_gardiennage',
      'protection_physique',
      'surete_aeroportuaire',
      'transport_fonds',
      'cynophile',
      'autre',
    ],
    required: true,
    appliesTo: 'assessment',
    helpText: 'Aligner sur les activités CSI L611 réellement autorisées — checklist, pas un avis juridique.',
    sortOrder: 20,
  },
  {
    key: 'agent_count',
    label: 'Effectif agents (approx.)',
    type: 'number',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Ordre de grandeur pour dimensionner le contrôle cartes / formation.',
    sortOrder: 30,
  },
  {
    key: 'has_subcontractors',
    label: 'Sous-traitance sécurité',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Active le focus module sous-traitance.',
    sortOrder: 40,
  },
  {
    key: 'school_tracking',
    label: 'Formations tracées dans GSMS School',
    type: 'boolean',
    required: false,
    appliesTo: 'assessment',
    helpText: 'Si non : prévoir export / pièces papier — pas de LMS dans Grace.',
    sortOrder: 50,
  },
];

await seedAdditivePack({
  seedFile: join(__dirname, 'sec_privee_cnaps_seed.json'),
  cmSeedFile: join(__dirname, 'sec_privee_cnaps_countermeasures_seed.json'),
  customFieldSchema: CUSTOM_FIELD_SCHEMA,
  package: {
    slug: 'sec-privee-cnaps',
    name: 'Sécurité privée — CNAPS',
    industry: 'Sécurité privée',
    version: '0.1.0',
    regionScope: 'FR',
    description:
      'Pack GSMS additif pour audit d’organisation de sécurité privée (agrément, cartes pro, ' +
      'contrats, formation continue, tenue, sous-traitance). CSI livre VI / CNAPS. ' +
      'Cartographie : AUD.ENTREPRISE.SEC_PRIVEE. Formation → GSMS School. ' +
      'Ne remplace pas site-surete (Physsec), erp/igh, banking. Ne modifie pas le risk engine. ' +
      'Checklist opérationnelle — pas article-atomique (SOURCES-STATUS-SEC-PRIVEE-CNAPS).',
    complianceRefs: [
      'CNAPS',
      'CSI',
      'SEC_PRIVEE',
      'AUD.ENTREPRISE.SEC_PRIVEE',
    ],
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
