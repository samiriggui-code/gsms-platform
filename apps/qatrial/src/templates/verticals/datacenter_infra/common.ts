/**
 * Vertical Datacenters & infrastructures critiques — templates communs
 *
 * Le cas type GSMS : un site où sécurité physique (incendie, intrusion,
 * contrôle d'accès, PC sécurité) et cybersécurité (ISO 27001, SOC 2)
 * coexistent. Ce vertical porte le volet physique ; le volet cyber vit
 * dans Comp AI — la jonction se fait par control_ref partagé (contrat
 * finding.schema.json).
 */

import type { VerticalTemplateSet } from '../../types';

export const templateSet: VerticalTemplateSet = {
  verticalId: 'datacenter_infra',
  requirements: [
    {
      templateId: 'dc:zonage:req-01',
      title: 'Zonage et contrôle d\'accès gradué',
      description:
        "Le site doit être découpé en zones de sécurité graduées (périmètre, bâtiment, salles serveurs, baies) avec contrôle d'accès adapté à chaque niveau, traçabilité des passages et sas ou anti-passback pour les zones critiques.",
      category: 'Access Control',
      tags: ['zonage', 'controle-acces', 'salle-serveurs'],
      riskLevel: 'critical',
      regulatoryRef: 'EN 50600-2-5 ; ISO/IEC 27001 Annexe A (contrôles physiques)',
    },
    {
      templateId: 'dc:incendie:req-01',
      title: 'Détection et extinction automatique en salles critiques',
      description:
        "Les salles serveurs et locaux techniques critiques doivent être équipés d'une détection incendie précoce et, selon l'analyse de risque, d'une extinction automatique adaptée (gaz inerte), maintenues et vérifiées périodiquement.",
      category: 'Vérifications',
      tags: ['detection-incendie', 'extinction-gaz', 'salle-serveurs'],
      riskLevel: 'critical',
      regulatoryRef: 'Règles APSAD R7 / R13 ; EN 50600-2-5',
    },
    {
      templateId: 'dc:pc-securite:req-01',
      title: 'PC sécurité et supervision continue',
      description:
        "Un poste central de sécurité doit assurer la supervision des alarmes (incendie, intrusion, technique) selon le régime d'exploitation du site, avec consignes à jour, main courante et procédures d'escalade testées.",
      category: 'Exploitation',
      tags: ['pc-securite', 'supervision', 'consignes'],
      riskLevel: 'high',
      regulatoryRef: 'Politique sûreté site ; EN 50600',
    },
    {
      templateId: 'dc:convergence:req-01',
      title: 'Convergence sécurité physique / cybersécurité',
      description:
        "Les contrôles physiques exigés par les référentiels cyber (ISO 27001 Annexe A, SOC 2) doivent être rapprochés des contrôles physiques réellement en place, avec un identifiant de contrôle commun (control_ref) permettant de réutiliser une preuve des deux côtés sans double audit.",
      category: 'Regulatory',
      tags: ['convergence', 'iso27001', 'control-ref'],
      riskLevel: 'high',
      regulatoryRef: 'ISO/IEC 27001 Annexe A ; SOC 2 ; contrat finding.schema.json (GSMS)',
    },
  ],
  tests: [
    {
      templateId: 'dc:functional:tst-01',
      title: 'Test du zonage et anti-passback',
      description:
        "Tenter un accès en zone critique avec un badge non habilité, puis un passage successif sans badgeage de sortie. Vérifier le refus, l'alarme éventuelle et la traçabilité des deux événements.",
      category: 'Functional',
      tags: ['zonage', 'controle-acces', 'test'],
      linkedReqTags: ['zonage', 'controle-acces', 'salle-serveurs'],
    },
    {
      templateId: 'dc:functional:tst-02',
      title: 'Vérification chaîne détection/extinction',
      description:
        "Contrôler les rapports de vérification périodique de la détection et de l'extinction automatique des salles critiques. Vérifier le traitement de tout défaut consigné et l'information du PC sécurité.",
      category: 'Functional',
      tags: ['detection-incendie', 'extinction-gaz', 'verification'],
      linkedReqTags: ['detection-incendie', 'extinction-gaz', 'salle-serveurs'],
    },
    {
      templateId: 'dc:functional:tst-03',
      title: 'Rapprochement contrôles physiques / exigences cyber',
      description:
        "Prendre les exigences physiques du référentiel cyber applicable (ISO 27001 Annexe A ou SOC 2). Vérifier que chacune est rapprochée d'un contrôle physique en place via un control_ref commun, et que la preuve est réutilisable des deux côtés.",
      category: 'Functional',
      tags: ['convergence', 'control-ref', 'preuve'],
      linkedReqTags: ['convergence', 'iso27001', 'control-ref'],
    },
  ],
};

export default templateSet;
