// One-shot: Physsec CSV → Grace pack JSON (site-surete).
// Does not touch risk-engine. Re-run to regenerate seed files.
//
//   node prisma/scripts/build-site-surete-from-physsec.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISMA = join(__dirname, '..');
const CSV_PATH = join(PRISMA, 'data', 'physsec-methodology-all.csv');

const MODULES = [
  {
    where: 'Alarms and Monitoring',
    slug: 'mod-alarmes',
    name: 'Alarmes & supervision',
    description: 'Détection intrusion, report d’alarme, journaux, anti-masque, supervision des événements.',
    icon: 'Bell',
    sortOrder: 10,
    familyId: 'DOM.SURETE.FAM.DETECTION',
    asset: {
      slug: 'surete-alarme-ids',
      name: 'Système d’alarme / IDS',
      assetType: 'SYSTEM',
      category: 'TANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Centrale, contacts, capteurs, report vers SMS/GTB.',
      tags: ['surete', 'alarme', 'ids'],
    },
    threat: {
      slug: 'surete-alarme-contournee',
      scenarioName: 'Alarme / supervision contournée ou muette',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-supervision-evenements',
      name: 'Supervision des événements d’alarme',
      description: 'Contacts, EOL, journaux, anti-masque et report d’événements testés et consignés.',
      shapeCategory: 'EQUIPMENT',
      ppsFunctions: ['DETECT'],
      domain: 'SURVEILLANCE',
    },
  },
  {
    where: 'Backup and Redundency',
    slug: 'mod-sauvegarde',
    name: 'Sauvegarde & redondance',
    description: 'UPS, sauvegardes config/vidéo, localisation et rétention.',
    icon: 'Database',
    sortOrder: 20,
    familyId: 'DOM.SURETE.FAM.PROCEDURES',
    asset: {
      slug: 'surete-sauvegardes',
      name: 'Sauvegardes sûreté (GTB / SMS / ACS / VMS)',
      assetType: 'INFORMATION',
      category: 'INTANGIBLE',
      defaultCriticality: 3,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Copies de configuration et d’enregistrements, hors site si possible.',
      tags: ['surete', 'backup'],
    },
    threat: {
      slug: 'surete-perte-traces',
      scenarioName: 'Perte de traces / indisponibilité des systèmes de sûreté',
      adversaryType: 'INSIDER',
      actionType: 'DISRUPTION',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-ups-backup',
      name: 'UPS + sauvegardes vérifiées',
      description: 'Alimentation secourue et sauvegardes testées des configs ACS/GTB/VMS.',
      shapeCategory: 'PROCEDURAL',
      ppsFunctions: ['RECOVER', 'DETECT'],
      domain: 'INFORMATION',
    },
  },
  {
    where: 'BMS/SMS Configuration and Implementation',
    slug: 'mod-bms',
    name: 'GTB / SMS',
    description: 'Horaires, fail-secure/fail-open, consignation incendie vs sûreté, ACS hors horaires.',
    icon: 'Cpu',
    sortOrder: 30,
    familyId: 'DOM.SURETE.FAM.DETECTION',
    asset: {
      slug: 'surete-gtb-sms',
      name: 'GTB / Security Management System',
      assetType: 'SYSTEM',
      category: 'TANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Supervision bâtiment / sûreté, horaires, modes dégradés.',
      tags: ['surete', 'bms', 'sms'],
    },
    threat: {
      slug: 'surete-gtb-fail-open',
      scenarioName: 'GTB/SMS laisse le site ouvert ou désarme l’alarme',
      adversaryType: 'INSIDER',
      actionType: 'SABOTAGE',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-horaires-acs',
      name: 'Horaires ACS / GTB revus',
      description: 'Verrouillage hors horaires, REX PIR inhibé la nuit, modes dégradés documentés.',
      shapeCategory: 'PROCEDURAL',
      ppsFunctions: ['DENY', 'DETECT'],
      domain: 'ACCESS',
    },
  },
  {
    where: 'Building or Facility Design and Implementation',
    slug: 'mod-conception',
    name: 'Conception & implantation',
    description: 'Zonage, REX accessibles de l’extérieur, plafonds, câblage, tailgating.',
    icon: 'Building',
    sortOrder: 40,
    familyId: 'DOM.SURETE.FAM.ZONES',
    asset: {
      slug: 'surete-zone-sensible',
      name: 'Zone sensible',
      assetType: 'ZONE',
      category: 'TANGIBLE',
      defaultCriticality: 5,
      defaultAssetRole: 'PROTECTED',
      description: 'Local ou périmètre à protéger (serveurs, stocks, direction).',
      tags: ['surete', 'zonage'],
    },
    threat: {
      slug: 'surete-contourne-conception',
      scenarioName: 'Contournement par conception (REX, faux-plafond, tailgating)',
      adversaryType: 'OPPORTUNIST',
      actionType: 'INTRUSION',
      capability: 'low',
    },
    cm: {
      slug: 'cm-surete-rex-protege',
      name: 'REX / zonage non contournables depuis l’extérieur',
      description: 'Boutons et capteurs REX hors portée externe, mantrap/tourniquet si besoin, câbles protégés.',
      shapeCategory: 'ARCHITECTURAL',
      ppsFunctions: ['DENY', 'DELAY'],
      domain: 'BUILDING',
    },
  },
  {
    where: 'CCTV Monitoring/Recording',
    slug: 'mod-cctv',
    name: 'Vidéoprotection',
    description: 'Couverture, enregistrement, rétention, accès aux images — croiser droit FR vidéoprotection.',
    icon: 'Camera',
    sortOrder: 50,
    familyId: 'DOM.SEC_PHYSIQUE.FAM.CCTV',
    asset: {
      slug: 'surete-vms-cctv',
      name: 'Système de vidéoprotection (VMS)',
      assetType: 'SYSTEM',
      category: 'TANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Caméras, enregistrement, accès opérateurs.',
      tags: ['surete', 'cctv', 'videoprotection'],
    },
    threat: {
      slug: 'surete-cctv-aveugle',
      scenarioName: 'Vidéoprotection aveugle ou sans traces exploitables',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'low',
    },
    cm: {
      slug: 'cm-surete-couverture-cctv',
      name: 'Couverture + conservation des images',
      description: 'Entrées, issues, zones sensibles filmées ; enregistrement et durée conformes à la politique / autorisation.',
      shapeCategory: 'EQUIPMENT',
      ppsFunctions: ['DETECT', 'DETER'],
      domain: 'SURVEILLANCE',
    },
  },
  {
    where: 'Documentation',
    slug: 'mod-docs',
    name: 'Documentation sûreté',
    description: 'Plans caméras, organigramme clés, inventaire équipements, schémas SMS.',
    icon: 'FileText',
    sortOrder: 60,
    familyId: 'DOM.SURETE.FAM.PROCEDURES',
    asset: {
      slug: 'surete-dossier-docs',
      name: 'Dossier documentaire sûreté',
      assetType: 'INFORMATION',
      category: 'INTANGIBLE',
      defaultCriticality: 3,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Plans, inventaires, procédures versionnées.',
      tags: ['surete', 'docs'],
    },
    threat: {
      slug: 'surete-docs-fausses',
      scenarioName: 'Documentation absente ou non conforme au terrain',
      adversaryType: 'INSIDER',
      actionType: 'FRAUD',
      capability: 'low',
    },
    cm: {
      slug: 'cm-surete-docs-a-jour',
      name: 'Documentation à jour vs terrain',
      description: 'Plans VMS/ACS/clés alignés sur l’existant, revue périodique.',
      shapeCategory: 'PROCEDURAL',
      ppsFunctions: ['DETECT'],
      domain: 'INFORMATION',
    },
  },
  {
    where: 'Doors',
    slug: 'mod-portes',
    name: 'Portes (sûreté)',
    description: 'Attaques sous/sur porte, béquille, crash-bar, jeu de vantail — hors checklist incendie ERP.',
    icon: 'DoorOpen',
    sortOrder: 70,
    familyId: 'DOM.SEC_PHYSIQUE.FAM.PORTES',
    asset: {
      slug: 'surete-porte-acces',
      name: 'Porte d’accès contrôlé',
      assetType: 'EQUIPMENT',
      category: 'TANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Vantail, gâche, béquille, crash-bar côté sûreté (pas issue de secours ERP).',
      tags: ['surete', 'porte', 'acs'],
    },
    threat: {
      slug: 'surete-porte-bypassee',
      scenarioName: 'Porte forcée ou contournée (outil, jeu, crash-bar)',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-porte-ajustee',
      name: 'Ajustement / quincaillerie anti-contournement',
      description: 'Jeu, plaque, gâche, protection crash-bar/béquille côté attaque.',
      shapeCategory: 'EQUIPMENT',
      ppsFunctions: ['DELAY', 'DENY'],
      domain: 'ACCESS',
    },
  },
  {
    where: 'Keys and Key Systems',
    slug: 'mod-cles',
    name: 'Clés & organigramme',
    description: 'Clés communes, clonage, master, gestion des clés.',
    icon: 'Key',
    sortOrder: 80,
    familyId: 'DOM.SEC_PHYSIQUE.FAM.SERRURES_CLES',
    asset: {
      slug: 'surete-organigramme-cles',
      name: 'Organigramme / parc de clés',
      assetType: 'INFORMATION',
      category: 'INTANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Inventaire, brevets, masters, copies.',
      tags: ['surete', 'cles'],
    },
    threat: {
      slug: 'surete-cle-clonee',
      scenarioName: 'Clé commune, clonée ou mal gérée',
      adversaryType: 'INSIDER',
      actionType: 'THEFT',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-gestion-cles',
      name: 'Gestion des clés (inventaire + restricted)',
      description: 'Pas de clé générique sur zones sensibles ; inventaire ; keyway restreint si exigé.',
      shapeCategory: 'PROCEDURAL',
      ppsFunctions: ['DENY', 'DETECT'],
      domain: 'ACCESS',
    },
  },
  {
    where: 'Locks',
    slug: 'mod-serrures',
    name: 'Serrures & coffres à clés',
    description: 'Coffres à clés, cadenas, codes PIN, Knox/rapid access.',
    icon: 'Lock',
    sortOrder: 90,
    familyId: 'DOM.SEC_PHYSIQUE.FAM.SERRURES_CLES',
    asset: {
      slug: 'surete-serrure-coffre',
      name: 'Serrure / coffre à clés',
      assetType: 'EQUIPMENT',
      category: 'TANGIBLE',
      defaultCriticality: 3,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Cylindres, coffres, cadenas, boîtiers pompiers.',
      tags: ['surete', 'serrure'],
    },
    threat: {
      slug: 'surete-serrure-faible',
      scenarioName: 'Serrure ou coffre à clés attaquable',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'medium',
    },
    cm: {
      slug: 'cm-surete-coffre-protege',
      name: 'Coffres à clés protégés et cylindres adaptés',
      description: 'Emplacement hors public, anti-arrachement, codes uniques, pas de cadenas amovible en périphérie.',
      shapeCategory: 'EQUIPMENT',
      ppsFunctions: ['DELAY', 'DENY'],
      domain: 'ACCESS',
    },
  },
  {
    where: 'RFID Access Control Systems',
    slug: 'mod-acs',
    name: 'Contrôle d’accès RFID',
    description: 'Badges, lecteurs, OSDP, anti-passback, clonage.',
    icon: 'CreditCard',
    sortOrder: 100,
    familyId: 'DOM.SEC_PHYSIQUE.FAM.ACS',
    asset: {
      slug: 'surete-acs-rfid',
      name: 'Contrôle d’accès RFID / PACS',
      assetType: 'SYSTEM',
      category: 'TANGIBLE',
      defaultCriticality: 5,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Lecteurs, contrôleurs, badges, protocoles.',
      tags: ['surete', 'acs', 'rfid'],
    },
    threat: {
      slug: 'surete-badge-clone',
      scenarioName: 'Badge cloné / protocole ACS dégradé',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'high',
    },
    cm: {
      slug: 'cm-surete-acs-chiffre',
      name: 'Badges chiffrés + anti-passback',
      description: 'Pas de clé par défaut, pas de badges séquentiels, tamper lecteur, anti-passback zones sensibles.',
      shapeCategory: 'EQUIPMENT',
      ppsFunctions: ['DENY', 'DETECT'],
      domain: 'ACCESS',
    },
  },
  {
    where: 'Security Training and Hygene',
    slug: 'mod-hygiene',
    name: 'Hygiène & formation sûreté',
    description: 'Destruction documents, badges vierges, portes non refermées, clés oubliées.',
    icon: 'Users',
    sortOrder: 110,
    familyId: 'DOM.SURETE.FAM.PERSONNEL',
    asset: {
      slug: 'surete-process-hygiene',
      name: 'Processus hygiène sûreté',
      assetType: 'PROCESS',
      category: 'INTANGIBLE',
      defaultCriticality: 3,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Consignes personnel, destruction, ronde.',
      tags: ['surete', 'hygiene', 'formation'],
    },
    threat: {
      slug: 'surete-hygiene-defaillante',
      scenarioName: 'Faille d’hygiène (clé, badge, document, porte ouverte)',
      adversaryType: 'OPPORTUNIST',
      actionType: 'THEFT',
      capability: 'low',
    },
    cm: {
      slug: 'cm-surete-consignes-personnel',
      name: 'Consignes + sensibilisation',
      description: 'Destruction sécurisée, badges stockés, portes refermées, alerte comportement suspect.',
      shapeCategory: 'HUMAN',
      ppsFunctions: ['DETER', 'DETECT'],
      domain: 'PERSONNEL',
    },
  },
  {
    where: 'Surveillance Detection and Response',
    slug: 'mod-reponse',
    name: 'Détection & réaction',
    description: 'Présence agents, délais, playbooks, supervision des alertes.',
    icon: 'Shield',
    sortOrder: 120,
    familyId: 'DOM.SURETE.FAM.REACTION',
    asset: {
      slug: 'surete-dispositif-reponse',
      name: 'Dispositif de réponse (agents / PC sécurité)',
      assetType: 'PROCESS',
      category: 'INTANGIBLE',
      defaultCriticality: 4,
      defaultAssetRole: 'PROTECTIVE',
      description: 'Chaîne d’alerte, effectifs, consignes d’intervention.',
      tags: ['surete', 'reponse', 'agents'],
    },
    threat: {
      slug: 'surete-reponse-absente',
      scenarioName: 'Alerte non traitée ou réaction hors délai',
      adversaryType: 'CRIMINAL',
      actionType: 'INTRUSION',
      capability: 'low',
    },
    cm: {
      slug: 'cm-surete-playbook-alerte',
      name: 'Playbooks + supervision 24/7',
      description: 'Alertes suivies, délais, vérification d’identité, effectif adapté.',
      shapeCategory: 'HUMAN',
      ppsFunctions: ['DETECT', 'DEFEAT'],
      domain: 'PERSONNEL',
    },
  },
];

const DEMO_QUESTION_IDS = [
  'ps-4-6',
  'ps-4-4',
  'ps-4-1',
  'ps-5-2',
  'ps-5-4',
  'ps-5-8',
  'ps-7-3',
  'ps-7-4',
  'ps-10-1',
  'ps-10-3',
  'ps-1-47',
  'ps-9-1',
  'ps-8-12',
  'ps-3-1',
  'ps-12-8',
  'ps-11-13',
];

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  const row = [];
  let field = '';
  let inQuotes = false;
  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row.splice(0, row.length));
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function clip(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function isParentStub(name) {
  return /\b(?:due to|for|on|from)\s*-?\s*$/i.test(name.trim());
}

function isErpOverlap(name) {
  const n = name.toLowerCase();
  return (
    n.includes('fire indicator') ||
    n.includes('fire mode on elevator') ||
    n.includes('break glass') ||
    n.includes('fire standard') ||
    n.includes('shunt during fire') ||
    n.includes('not connected to automatic doors')
  );
}

function slWeight(sl) {
  const u = String(sl ?? '').toUpperCase();
  if (u.includes('SL4')) return 5;
  if (u.includes('SL3')) return 5;
  if (u.includes('SL2')) return 4;
  if (u.includes('SL1')) return 3;
  return 3;
}

function evidenceType(modSlug, exploitation) {
  if (modSlug === 'mod-docs' || modSlug === 'mod-sauvegarde') return 'DOC_REVIEW';
  if (modSlug === 'mod-hygiene' || modSlug === 'mod-reponse') return 'HYBRID';
  const e = String(exploitation ?? '').toLowerCase();
  if (e.includes('not applicable')) return 'DOC_REVIEW';
  return 'PHYSICAL';
}

function frPrompt(issue) {
  return clip(`Le constat suivant est-il écarté ou maîtrisé : ${issue} ?`, 500);
}

function frHint(row, mod) {
  const parts = [
    `Physsec ${row.a}.${row.b}`,
    row.type,
    `preuve ${row.evidence || 'n/a'}`,
    `dégât test ${row.damage || 'n/a'}`,
    row.sl,
    'Inspiration terrain (Unlicense) — pas du droit FR.',
    mod.slug === 'mod-cctv'
      ? 'Croiser CSI / vidéoprotection (autorisation, finalités, durée).'
      : 'Croiser CSI si malveillance / ACS.',
    'Ne pas tester si le dégât prévu n’est pas accepté.',
  ];
  return clip(parts.filter(Boolean).join(' · '), 500);
}

function byWhere(where) {
  const key = String(where ?? '').trim();
  return MODULES.find((m) => m.where === key);
}

async function main() {
  const raw = await readFile(CSV_PATH, 'utf-8');
  const table = parseCsv(raw);
  const header = table[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const seen = new Set();
  const kept = [];
  const skipped = { parent: 0, erp: 0, unknown: 0, dup: 0 };

  for (const cols of table.slice(1)) {
    if (!cols.length || cols.every((c) => !String(c).trim())) continue;
    const name = String(cols[idx['Issue Name']] ?? '').trim();
    if (!name) continue;
    if (isParentStub(name)) {
      skipped.parent += 1;
      continue;
    }
    if (isErpOverlap(name)) {
      skipped.erp += 1;
      continue;
    }
    const where = String(cols[idx['Where the issue is found']] ?? '').trim();
    const mod = byWhere(where);
    if (!mod) {
      skipped.unknown += 1;
      console.warn(`Unknown where: ${where} (${name})`);
      continue;
    }
    const a = String(cols[idx['Index A']] ?? '').trim();
    const b = String(cols[idx['Index B']] ?? '').trim();
    const id = `ps-${a}-${b}`;
    const dupKey = name.toLowerCase();
    if (seen.has(dupKey)) {
      skipped.dup += 1;
      continue;
    }
    seen.add(dupKey);
    kept.push({
      id,
      a,
      b,
      name,
      where,
      type: String(cols[idx['Type of Issue']] ?? '').trim(),
      evidence: String(cols[idx['Evidence of Exploitation']] ?? '').trim(),
      damage: String(cols[idx['Potential damage incured during testing']] ?? '').trim(),
      sl: String(cols[idx['Security Level']] ?? '').trim(),
      mod,
    });
  }

  const modulesJson = MODULES.map((mod) => {
    const t = mod.threat;
    return {
      slug: mod.slug,
      name: mod.name,
      description: mod.description,
      icon: mod.icon,
      sortOrder: mod.sortOrder,
      assets: [
        {
          ...mod.asset,
          recommendedThreats: [
            {
              slug: t.slug,
              relevance: 'HIGH',
              rationale: `Famille Physsec « ${mod.where} » → ${mod.familyId}`,
            },
          ],
        },
      ],
      threats: [
        {
          slug: t.slug,
          scenarioName: t.scenarioName,
          adversaryType: t.adversaryType,
          actionType: t.actionType,
          adversaryProfile: {
            capability: t.capability,
            motivation: 'intrusion / vol / malveillance',
            resources: 'selon SL Physsec (SL1 opportuniste → SL4 outils spécialisés)',
            insiderKnowledge: t.adversaryType === 'INSIDER',
          },
          typicalActions: kept
            .filter((r) => r.mod.slug === mod.slug)
            .slice(0, 5)
            .map((r) => r.name),
          targetAssetTypes: [mod.asset.assetType],
          indicators: ['constat visite', 'essai non destructif', 'config / logs'],
          suggestedLikelihood: t.capability === 'low' ? 2 : t.capability === 'high' ? 3 : 2,
          csmpUnitReference: 'Unit 3',
        },
      ],
    };
  });

  const cmSeed = {
    countermeasure_templates: MODULES.map((mod) => ({
      moduleSlug: mod.slug,
      slug: mod.cm.slug,
      name: mod.cm.name,
      description: mod.cm.description,
      shapeCategory: mod.cm.shapeCategory,
      ppsFunctions: mod.cm.ppsFunctions,
      domain: mod.cm.domain,
      defaultEffectiveness: 'BASELINE',
      defaultTearStrategy: 'REDUCE',
      tags: ['surete', 'physsec', 'fr-site'],
      csmpUnitReference: 'Unit 6',
    })),
    threat_countermeasures: MODULES.map((mod) => ({
      threatSlug: mod.threat.slug,
      countermeasureSlug: mod.cm.slug,
      relevance: 'HIGH',
      rationale: `Traitement type pour ${mod.name}`,
    })),
  };

  const questions = kept.map((row) => ({
    id: row.id,
    category: `Sûreté · ${row.mod.name}`,
    prompt: frPrompt(row.name),
    type: 'yes_no_partial',
    weight: slWeight(row.sl),
    evidenceType: evidenceType(row.mod.slug, row.evidence),
    hint: frHint(row, row.mod),
    severityMap: { YES: 'ok', PARTIAL: 'warn', NO: 'bad' },
    attach: {
      assetSlugs: [row.mod.asset.slug],
      threatSlugs: [row.mod.threat.slug],
      cmSlugs: [row.mod.cm.slug],
    },
  }));

  const questionIds = new Set(questions.map((q) => q.id));
  const demoIds = DEMO_QUESTION_IDS.filter((id) => questionIds.has(id));
  if (demoIds.length < 10) {
    console.warn(`Demo survey only matched ${demoIds.length} curated ids — filling from kept`);
  }
  const fill = kept.map((r) => r.id).filter((id) => !demoIds.includes(id));
  while (demoIds.length < 12 && fill.length) demoIds.push(fill.shift());

  const templates = [
    {
      key: 'survey-site-surete',
      name: 'Sûreté de site',
      description:
        'Checklist agrégée P0 (Physsec filtré). Inspiration terrain — pas du droit FR. Pack site-surete.',
      surveyType: 'HYBRID',
      applicableClusterTypes: ['SPATIAL'],
      applicableAssetTypes: ['SITE', 'BUILDING', 'ZONE', 'EQUIPMENT', 'SYSTEM', 'PROCESS', 'INFORMATION'],
      requiresPhysical: true,
      questionIds: demoIds,
    },
  ];

  for (const mod of MODULES) {
    const ids = kept.filter((r) => r.mod.slug === mod.slug).map((r) => r.id);
    if (!ids.length) continue;
    const physical = !['mod-docs', 'mod-sauvegarde'].includes(mod.slug);
    templates.push({
      key: `survey-site-surete-${mod.slug.replace('mod-', '')}`,
      name: `Sûreté de site — ${mod.name}`,
      description: `${mod.description} Source Physsec « ${mod.where} » (${ids.length} points). Pas du droit FR.`,
      surveyType: physical ? 'PHYSICAL' : 'DOC_REVIEW',
      applicableClusterTypes: physical ? ['SPATIAL'] : ['SPATIAL', 'LOGICAL'],
      applicableAssetTypes: [mod.asset.assetType, 'SITE', 'BUILDING'],
      requiresPhysical: physical,
      questionIds: ids,
    });
  }

  const surveys = { templates, questions };

  await writeFile(join(PRISMA, 'site_surete_seed.json'), `${JSON.stringify(modulesJson, null, 2)}\n`, 'utf-8');
  await writeFile(join(PRISMA, 'site_surete_countermeasures_seed.json'), `${JSON.stringify(cmSeed, null, 2)}\n`, 'utf-8');
  await writeFile(join(PRISMA, 'site_surete_surveys_seed.json'), `${JSON.stringify(surveys, null, 2)}\n`, 'utf-8');

  const byMod = {};
  for (const r of kept) byMod[r.mod.slug] = (byMod[r.mod.slug] ?? 0) + 1;

  console.log(`Kept ${kept.length} issues`);
  console.log('Skipped', skipped);
  console.log('Per module', byMod);
  console.log(`Templates: ${templates.length} · demo questions: ${demoIds.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
