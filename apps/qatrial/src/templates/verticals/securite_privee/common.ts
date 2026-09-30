/**
 * Vertical Sécurité privée — templates communs
 *
 * Exigences et tests applicables aux prestations de surveillance humaine
 * et de gardiennage (CSI Livre VI, CNAPS), quel que soit le pays ou le
 * type de projet. Références réglementaires au niveau du texte cadre —
 * la vérification article par article reste à la charge de l'auditeur.
 */

import type { VerticalTemplateSet } from '../../types';

export const templateSet: VerticalTemplateSet = {
  verticalId: 'securite_privee',
  requirements: [
    {
      templateId: 'secpriv:habilitation:req-01',
      title: 'Cartes professionnelles CNAPS valides',
      description:
        "Chaque agent de sécurité affecté à une prestation doit détenir une carte professionnelle CNAPS en cours de validité, correspondant à l'activité exercée. Un suivi des dates d'expiration doit être en place avec alerte avant échéance.",
      category: 'Habilitations',
      tags: ['cnaps', 'carte-professionnelle', 'habilitation-agent'],
      riskLevel: 'critical',
      regulatoryRef: 'Code de la sécurité intérieure — Livre VI',
    },
    {
      templateId: 'secpriv:habilitation:req-02',
      title: "Autorisation d'exercice de l'entreprise",
      description:
        "L'entreprise de sécurité privée doit détenir une autorisation d'exercice CNAPS valide pour chaque établissement, ainsi que l'agrément dirigeant. Ces documents doivent être disponibles et présentables lors de tout contrôle.",
      category: 'Habilitations',
      tags: ['cnaps', 'autorisation-exercice', 'agrement'],
      riskLevel: 'critical',
      regulatoryRef: 'Code de la sécurité intérieure — Livre VI, Titre Ier',
    },
    {
      templateId: 'secpriv:exploitation:req-01',
      title: 'Main courante et traçabilité des événements',
      description:
        'Chaque site sous surveillance doit tenir une main courante (papier ou électronique) horodatée et infalsifiable, consignant prises de poste, rondes, événements et incidents. Les entrées doivent être attribuables à un agent identifié.',
      category: 'Exploitation',
      tags: ['main-courante', 'tracabilite', 'rondes'],
      riskLevel: 'high',
      regulatoryRef: 'Obligations contractuelles et conventionnelles de la profession',
    },
    {
      templateId: 'secpriv:exploitation:req-02',
      title: 'Respect des fréquences de ronde contractuelles',
      description:
        "Les rondes doivent être effectuées selon la fréquence et les parcours définis contractuellement, avec preuve de passage (pointeau, badge, application). Tout écart doit être consigné et donner lieu à une action corrective.",
      category: 'Exploitation',
      tags: ['rondes', 'frequence', 'preuve-passage'],
      riskLevel: 'high',
      regulatoryRef: 'Cahier des charges client / contrat de prestation',
    },
    {
      templateId: 'secpriv:formation:req-01',
      title: 'Maintien et actualisation des compétences (MAC)',
      description:
        "Les agents doivent suivre les formations de maintien et d'actualisation des compétences requises pour le renouvellement de leur carte professionnelle. Un plan de formation individuel doit tracer les échéances et les attestations.",
      category: 'Formation',
      tags: ['formation', 'mac', 'renouvellement'],
      riskLevel: 'high',
      regulatoryRef: 'Réglementation CNAPS — formation continue',
    },
    {
      templateId: 'secpriv:social:req-01',
      title: 'Conformité sociale des affectations',
      description:
        "Les plannings d'affectation doivent respecter la convention collective Prévention et Sécurité : durées maximales de travail, repos, vacations, majorations. Les écarts détectés doivent être tracés en non-conformité.",
      category: 'Social',
      tags: ['planning', 'convention-collective', 'temps-travail'],
      riskLevel: 'medium',
      regulatoryRef: 'Convention collective nationale Prévention et Sécurité ; Code du travail',
    },
  ],
  tests: [
    {
      templateId: 'secpriv:functional:tst-01',
      title: 'Contrôle validité cartes professionnelles',
      description:
        "Sélectionner un échantillon d'agents affectés sur site. Vérifier pour chacun la validité de la carte professionnelle CNAPS (numéro, activité, date d'expiration) et la présence de l'alerte d'échéance dans le suivi.",
      category: 'Functional',
      tags: ['cnaps', 'carte-professionnelle', 'controle'],
      linkedReqTags: ['cnaps', 'carte-professionnelle', 'habilitation-agent'],
    },
    {
      templateId: 'secpriv:functional:tst-02',
      title: 'Vérification main courante et rondes',
      description:
        "Sur une période donnée, comparer les rondes contractuelles aux preuves de passage enregistrées. Vérifier que chaque écart a généré une entrée en main courante et, si récurrent, une action corrective (CAPA).",
      category: 'Functional',
      tags: ['rondes', 'main-courante', 'ecart'],
      linkedReqTags: ['rondes', 'frequence', 'tracabilite'],
    },
    {
      templateId: 'secpriv:functional:tst-03',
      title: 'Audit des échéances de formation MAC',
      description:
        "Extraire la liste des agents dont la carte expire dans les 12 mois. Vérifier qu'un MAC est planifié ou réalisé pour chacun, avec attestation archivée.",
      category: 'Functional',
      tags: ['formation', 'mac', 'echeance'],
      linkedReqTags: ['formation', 'mac', 'renouvellement'],
    },
  ],
};

export default templateSet;
