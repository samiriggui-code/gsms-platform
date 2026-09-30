/**
 * Vertical Sûreté d'entreprise — templates communs
 *
 * Exigences et tests applicables à la protection des sites : intrusion,
 * contrôle d'accès, vidéoprotection. Le référentiel terrain détaillé vit
 * dans GRACE (pack site-surete) ; QAtrial porte le suivi qualité/CAPA.
 */

import type { VerticalTemplateSet } from '../../types';

export const templateSet: VerticalTemplateSet = {
  verticalId: 'surete_entreprise',
  requirements: [
    {
      templateId: 'surete:acces:req-01',
      title: "Gestion des droits d'accès physiques",
      description:
        "Les droits d'accès (badges, clés, codes) doivent être attribués nominativement selon le besoin d'en connaître, revus périodiquement, et révoqués sans délai au départ d'un collaborateur ou prestataire. Un registre des attributions doit être tenu.",
      category: 'Access Control',
      tags: ['controle-acces', 'badges', 'revue-droits'],
      riskLevel: 'critical',
      regulatoryRef: 'Politique sûreté site ; ISO/IEC 27001 Annexe A (contrôles physiques)',
    },
    {
      templateId: 'surete:intrusion:req-01',
      title: "Système de détection intrusion opérationnel",
      description:
        "Le système d'alarme intrusion doit être maintenu, testé périodiquement, et raccordé le cas échéant à une station de télésurveillance certifiée. Les défauts et mises hors service doivent être tracés et traités.",
      category: 'Exploitation',
      tags: ['intrusion', 'alarme', 'telesurveillance'],
      riskLevel: 'high',
      regulatoryRef: 'Règle APSAD R81 ; NF EN 50131',
    },
    {
      templateId: 'surete:video:req-01',
      title: 'Conformité de la vidéoprotection',
      description:
        "Le dispositif de vidéoprotection doit disposer des autorisations requises (voie publique / lieux ouverts au public), respecter les durées de conservation, l'information des personnes et les droits d'accès aux images (RGPD/CNIL).",
      category: 'Regulatory',
      tags: ['videoprotection', 'cnil', 'rgpd'],
      riskLevel: 'high',
      regulatoryRef: 'Code de la sécurité intérieure (L. 251 et s.) ; RGPD / doctrine CNIL',
    },
    {
      templateId: 'surete:incident:req-01',
      title: 'Gestion des incidents sûreté',
      description:
        "Tout incident sûreté (intrusion, vol, dégradation, comportement suspect) doit être enregistré, qualifié par gravité, investigué, et donner lieu à des actions correctives dont l'efficacité est vérifiée.",
      category: 'Quality Management',
      tags: ['incident', 'surete', 'capa'],
      riskLevel: 'high',
      regulatoryRef: 'Politique sûreté site ; ISO 31000',
    },
  ],
  tests: [
    {
      templateId: 'surete:functional:tst-01',
      title: "Revue des droits d'accès",
      description:
        "Extraire la liste des badges actifs. La rapprocher de l'effectif présent (salariés + prestataires). Identifier les badges orphelins ou non révoqués après départ, et vérifier le délai de révocation constaté.",
      category: 'Functional',
      tags: ['controle-acces', 'revue-droits', 'badges'],
      linkedReqTags: ['controle-acces', 'badges', 'revue-droits'],
    },
    {
      templateId: 'surete:functional:tst-02',
      title: "Test périodique de la chaîne d'alarme",
      description:
        "Déclencher un test d'alarme intrusion planifié. Vérifier la remontée en télésurveillance, le respect de la consigne d'intervention, et la traçabilité du test dans la main courante.",
      category: 'Functional',
      tags: ['intrusion', 'alarme', 'test'],
      linkedReqTags: ['intrusion', 'alarme', 'telesurveillance'],
    },
    {
      templateId: 'surete:functional:tst-03',
      title: 'Audit conformité vidéoprotection',
      description:
        "Vérifier : autorisation préfectorale en cours de validité le cas échéant, panneaux d'information en place, durée de conservation paramétrée conforme, procédure de gestion des demandes d'accès aux images.",
      category: 'Functional',
      tags: ['videoprotection', 'cnil', 'audit'],
      linkedReqTags: ['videoprotection', 'cnil', 'rgpd'],
    },
  ],
};

export default templateSet;
