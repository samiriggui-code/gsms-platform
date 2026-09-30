/**
 * Vertical Sécurité incendie — templates communs
 *
 * Exigences et tests applicables à la prévention incendie ERP / IGH /
 * Code du travail. Références au niveau du texte cadre — la checklist
 * détaillée par type/catégorie d'établissement vit dans GRACE (packs
 * erp-precommission / igh-precommission), pas ici : QAtrial porte le
 * suivi CAPA des écarts, pas le référentiel terrain.
 */

import type { VerticalTemplateSet } from '../../types';

export const templateSet: VerticalTemplateSet = {
  verticalId: 'incendie_prevention',
  requirements: [
    {
      templateId: 'incendie:registre:req-01',
      title: 'Registre de sécurité à jour',
      description:
        "Chaque établissement doit tenir un registre de sécurité consignant les vérifications périodiques, travaux, formations et exercices. Le registre doit être présentable à la commission de sécurité et tenu sans interruption.",
      category: 'Documentation',
      tags: ['registre-securite', 'commission', 'tracabilite'],
      riskLevel: 'critical',
      regulatoryRef: "Règlement de sécurité ERP (arrêté du 25 juin 1980 modifié), art. R. 123-51 CCH",
    },
    {
      templateId: 'incendie:verification:req-01',
      title: 'Vérifications périodiques des moyens de secours',
      description:
        "Les moyens de lutte (extincteurs, RIA, colonnes sèches, désenfumage, SSI, éclairage de sécurité) doivent faire l'objet de vérifications périodiques par organisme ou technicien compétent, aux fréquences réglementaires, avec rapport archivé.",
      category: 'Vérifications',
      tags: ['extincteurs', 'ssi', 'desenfumage', 'verification-periodique'],
      riskLevel: 'critical',
      regulatoryRef: 'Règlement de sécurité ERP ; règles APSAD R4/R5/R13',
    },
    {
      templateId: 'incendie:capa:req-01',
      title: 'Levée des prescriptions de commission',
      description:
        "Chaque prescription émise par la commission de sécurité doit être enregistrée comme non-conformité, dotée d'un responsable et d'une échéance, et sa levée documentée avec preuve avant la visite suivante.",
      category: 'Quality Management',
      tags: ['prescription', 'commission', 'capa'],
      riskLevel: 'critical',
      regulatoryRef: 'Procès-verbaux de commission de sécurité (CCH)',
    },
    {
      templateId: 'incendie:personnel:req-01',
      title: 'Effectif et qualification SSIAP conformes',
      description:
        "L'effectif du service de sécurité incendie doit être conforme au classement de l'établissement, avec diplômes SSIAP en cours de validité (recyclages triennaux, remises à niveau). Un tableau de suivi des échéances doit exister.",
      category: 'Habilitations',
      tags: ['ssiap', 'effectif', 'recyclage'],
      riskLevel: 'high',
      regulatoryRef: 'Arrêté du 2 mai 2005 modifié (SSIAP)',
    },
    {
      templateId: 'incendie:exercice:req-01',
      title: "Exercices d'évacuation et consignes",
      description:
        "Des exercices d'évacuation doivent être organisés aux fréquences requises, tracés au registre avec observations et actions d'amélioration. Les consignes de sécurité doivent être affichées, à jour, et connues du personnel.",
      category: 'Exploitation',
      tags: ['evacuation', 'exercice', 'consignes'],
      riskLevel: 'high',
      regulatoryRef: 'Code du travail (R. 4227) ; règlement ERP selon type',
    },
  ],
  tests: [
    {
      templateId: 'incendie:functional:tst-01',
      title: 'Audit du registre de sécurité',
      description:
        "Contrôler le registre de sécurité sur les 12 derniers mois : présence des rapports de vérification périodique, exercices d'évacuation, formations, travaux. Identifier tout trou de traçabilité.",
      category: 'Functional',
      tags: ['registre-securite', 'audit', 'tracabilite'],
      linkedReqTags: ['registre-securite', 'commission', 'verification-periodique'],
    },
    {
      templateId: 'incendie:functional:tst-02',
      title: 'Suivi de levée des prescriptions',
      description:
        "Prendre le dernier PV de commission de sécurité. Vérifier que chaque prescription a une non-conformité ouverte dans le système, un responsable, une échéance, et pour celles levées, une preuve de réalisation archivée.",
      category: 'Functional',
      tags: ['prescription', 'capa', 'preuve'],
      linkedReqTags: ['prescription', 'commission', 'capa'],
    },
    {
      templateId: 'incendie:functional:tst-03',
      title: 'Contrôle des échéances SSIAP',
      description:
        "Extraire la liste du personnel SSIAP affecté. Vérifier la validité des diplômes et le respect des échéances de recyclage/remise à niveau, avec attestations archivées.",
      category: 'Functional',
      tags: ['ssiap', 'recyclage', 'echeance'],
      linkedReqTags: ['ssiap', 'effectif', 'recyclage'],
    },
  ],
};

export default templateSet;
