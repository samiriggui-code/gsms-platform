/**
 * Demo Project Configurations
 *
 * One demo project per country that has templates (cf. `templates/registry.ts`
 * `COUNTRY_REGISTRY`). Scénarios GSMS — sécurité privée / incendie / sûreté /
 * datacenter. Références réglementaires limitées à ce qui est déjà vérifié dans
 * `VERTICAL_DEFINITIONS` : pour les pays hors France, on ne cite que les normes
 * européennes/internationales (ISO, EN, RGPD, NIS2/CER) — pas de droit français
 * (CSI, CNAPS, arrêté ERP, SSIAP) hors de France, pour ne pas inventer de
 * conformité qui n'existe pas dans ce pays.
 */

export interface DemoProject {
  countryCode: string;
  companyName: string;
  companyNameEn: string;
  projectName: string;
  projectNameEn: string;
  description: string;
  descriptionEn: string;
  vertical: string;
  projectType: string;
  modules: string[];
  owner: string;
  version: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    countryCode: 'FR',
    companyName: 'Centre Commercial Les Terrasses SAS',
    companyNameEn: 'Centre Commercial Les Terrasses SAS',
    projectName: 'Levée des prescriptions — commission de sécurité (ERP 2e catégorie)',
    projectNameEn: 'Safety Commission Prescriptions Follow-up (ERP Category 2)',
    description:
      "Suivi des prescriptions émises par la commission de sécurité lors de la dernière visite périodique. Conformité au règlement de sécurité ERP (arrêté du 25 juin 1980 modifié), registre de sécurité, vérifications SSIAP, et exercices d'évacuation.",
    descriptionEn:
      'Follow-up of the safety commission prescriptions from the latest periodic inspection. Compliance with the ERP fire safety regulation (amended decree of 25 June 1980), safety register, SSIAP checks, and evacuation drills.',
    vertical: 'incendie_prevention',
    projectType: 'compliance',
    modules: ['document_control', 'deviation', 'capa', 'training', 'reporting'],
    owner: 'Jean-Marc Dubreuil, Directeur technique',
    version: '1.0',
  },
  {
    countryCode: 'BE',
    companyName: 'Sentinelle Sécurité Benelux SPRL',
    companyNameEn: 'Sentinelle Sécurité Benelux SPRL',
    projectName: 'Audit qualité des opérations de sécurité privée (ISO 18788)',
    projectNameEn: 'Private Security Operations Quality Audit (ISO 18788)',
    description:
      "Audit du système de management de la qualité de l'entreprise de sécurité privée, conforme à l'ISO 18788 (management des opérations de sécurité privée) et à l'ISO 9001. Couvre la gestion des réclamations clients et le plan de formation des agents.",
    descriptionEn:
      'Quality management system audit for the private security company, aligned with ISO 18788 (private security operations management) and ISO 9001. Covers client complaint handling and agent training plans.',
    vertical: 'securite_privee',
    projectType: 'quality_system',
    modules: ['document_control', 'training', 'complaint_handling', 'capa', 'reporting'],
    owner: 'Sophie Van Damme, Responsable Qualité',
    version: '1.0',
  },
  {
    countryCode: 'CH',
    companyName: 'Groupe Horizon Genève SA',
    companyNameEn: 'Groupe Horizon Genève SA',
    projectName: "Audit sûreté du siège — contrôle d'accès et détection intrusion",
    projectNameEn: 'Headquarters Security Audit — Access Control and Intrusion Detection',
    description:
      "Audit sûreté du siège social : système de détection intrusion (NF EN 50131), gestion des droits d'accès et cartographie du risque selon l'ISO 31000. Protection des données applicable au dispositif de contrôle d'accès à vérifier avec la conformité locale.",
    descriptionEn:
      'Headquarters security audit: intrusion detection system (EN 50131), access rights management, and risk mapping per ISO 31000. Data protection applicable to the access control system to be checked against local compliance.',
    vertical: 'surete_entreprise',
    projectType: 'compliance',
    modules: ['access_control', 'risk_management', 'document_control', 'reporting'],
    owner: 'Marc Fontaine, Responsable Sûreté',
    version: '1.0',
  },
  {
    countryCode: 'DE',
    companyName: 'Rheinland Data Center Services GmbH',
    companyNameEn: 'Rheinland Data Center Services GmbH',
    projectName: 'Audit convergence sécurité physique / cybersécurité — Datacenter Francfort',
    projectNameEn: 'Physical / Cyber Security Convergence Audit — Frankfurt Data Center',
    description:
      "Audit du datacenter conforme à l'EN 50600 (infrastructures de centres de données), à l'annexe A de l'ISO/IEC 27001 (contrôles physiques et environnementaux), et aux exigences de résilience NIS2/CER pour les infrastructures critiques.",
    descriptionEn:
      'Data center audit compliant with EN 50600 (data center facilities and infrastructures), ISO/IEC 27001 Annex A (physical and environmental controls), and NIS2/CER resilience requirements for critical infrastructure.',
    vertical: 'datacenter_infra',
    projectType: 'compliance',
    modules: ['access_control', 'risk_management', 'backup_recovery', 'document_control', 'reporting'],
    owner: 'Klaus Reimann, Head of Facility Security',
    version: '1.0',
  },
  {
    countryCode: 'ES',
    companyName: 'Grupo Ibérico de Distribución S.A.',
    companyNameEn: 'Grupo Ibérico de Distribución S.A.',
    projectName: 'Audit sûreté et vidéoprotection — plateforme logistique Madrid',
    projectNameEn: 'Security and Video Surveillance Audit — Madrid Logistics Platform',
    description:
      "Audit du dispositif de vidéoprotection et de détection intrusion (NF EN 50131) de la plateforme logistique, incluant la conformité RGPD du traitement des images et la cartographie des risques selon l'ISO 31000.",
    descriptionEn:
      'Audit of the video surveillance and intrusion detection system (EN 50131) at the logistics platform, including GDPR compliance of footage processing and risk mapping per ISO 31000.',
    vertical: 'surete_entreprise',
    projectType: 'compliance',
    modules: ['access_control', 'risk_management', 'document_control', 'complaint_handling'],
    owner: 'Carmen Ruiz López, Directora de Seguridad',
    version: '1.0',
  },
  {
    countryCode: 'IT',
    companyName: 'Vigilanza Adriatica S.r.l.',
    companyNameEn: 'Vigilanza Adriatica S.r.l.',
    projectName: "Audit organisationnel de l'entreprise de sécurité privée",
    projectNameEn: 'Private Security Company Organizational Audit',
    description:
      "Audit de l'organisation et de la formation des agents de sécurité, conforme à l'ISO 18788 et à l'ISO 9001. Couvre le registre de main courante, les procédures de ronde et la gestion des non-conformités.",
    descriptionEn:
      'Audit of the organization and training of security guards, compliant with ISO 18788 and ISO 9001. Covers the logbook, patrol procedures, and non-conformance management.',
    vertical: 'securite_privee',
    projectType: 'compliance',
    modules: ['document_control', 'training', 'capa', 'reporting'],
    owner: 'Giulia Bianchi, Responsabile Qualità',
    version: '1.0',
  },
  {
    countryCode: 'GB',
    companyName: 'Thames Data Infrastructure Ltd',
    companyNameEn: 'Thames Data Infrastructure Ltd',
    projectName: 'Physical security audit — Tier III data centre, London',
    projectNameEn: 'Physical security audit — Tier III data centre, London',
    description:
      'Physical security audit of the London data centre facility against EN 50600 (data centre infrastructure) and ISO/IEC 27001 Annex A physical and environmental controls, covering access control zoning and business continuity procedures.',
    descriptionEn:
      'Physical security audit of the London data centre facility against EN 50600 (data centre infrastructure) and ISO/IEC 27001 Annex A physical and environmental controls, covering access control zoning and business continuity procedures.',
    vertical: 'datacenter_infra',
    projectType: 'compliance',
    modules: ['access_control', 'backup_recovery', 'risk_management', 'document_control'],
    owner: 'Helen McPherson, Head of Physical Security',
    version: '1.0',
  },
  {
    countryCode: 'NL',
    companyName: 'Amstel Data Facilities B.V.',
    companyNameEn: 'Amstel Data Facilities B.V.',
    projectName: "Audit résilience et convergence sécurité — Datacenter Amsterdam",
    projectNameEn: 'Resilience and Security Convergence Audit — Amsterdam Data Center',
    description:
      "Audit de résilience du datacenter conforme à l'EN 50600 et à l'annexe A de l'ISO/IEC 27001, incluant l'évaluation des exigences de résilience NIS2/CER et la continuité des plans de sauvegarde.",
    descriptionEn:
      'Data center resilience audit compliant with EN 50600 and ISO/IEC 27001 Annex A, including assessment of NIS2/CER resilience requirements and backup plan continuity.',
    vertical: 'datacenter_infra',
    projectType: 'compliance',
    modules: ['access_control', 'risk_management', 'backup_recovery', 'reporting'],
    owner: 'Willem de Vries, Head of Infrastructure Security',
    version: '1.0',
  },
  {
    countryCode: 'PT',
    companyName: 'Segurança Atlântica Lda.',
    companyNameEn: 'Segurança Atlântica Lda.',
    projectName: 'Audit qualité — agence de sécurité privée',
    projectNameEn: 'Private Security Agency Quality Audit',
    description:
      "Audit qualité de l'agence de sécurité privée conforme à l'ISO 18788 et à l'ISO 9001, portant sur la formation des agents, le traitement des réclamations clients et la traçabilité documentaire.",
    descriptionEn:
      'Quality audit of the private security agency compliant with ISO 18788 and ISO 9001, covering agent training, client complaint handling, and document traceability.',
    vertical: 'securite_privee',
    projectType: 'quality_system',
    modules: ['document_control', 'training', 'complaint_handling', 'reporting'],
    owner: 'António Ferreira, Diretor de Qualidade',
    version: '1.0',
  },
];

/**
 * Look up the demo project for a given country code.
 * Returns undefined if no demo project exists for that country.
 */
export function getDemoProject(countryCode: string): DemoProject | undefined {
  return DEMO_PROJECTS.find((p) => p.countryCode === countryCode);
}

/**
 * Set of country codes that have a demo project available.
 * Used for quick membership checks in the UI.
 */
export const DEMO_COUNTRY_CODES = new Set(DEMO_PROJECTS.map((p) => p.countryCode));
