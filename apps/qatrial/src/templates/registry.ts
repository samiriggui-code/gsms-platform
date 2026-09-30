/**
 * Master Template Registry
 *
 * Central registry of all verticals, countries, and modules available
 * in QAtrial. This file is the single source of truth for what
 * template combinations are supported.
 */

import type {
  VerticalDefinition,
  CountryRegistryEntry,
  ModuleDefinition,
} from './types';

// ---------------------------------------------------------------------------
// Vertical Definitions
// ---------------------------------------------------------------------------

/** Verticals métier GSMS — sécurité privée, incendie, sûreté, infrastructures critiques */
export const VERTICAL_DEFINITIONS: VerticalDefinition[] = [
  {
    id: 'securite_privee',
    name: 'verticals.securite_privee.name',
    focusKey: 'verticals.securite_privee.focus',
    icon: 'Shield',
    riskTaxonomy: 'fmea',
    safetyClassification: 'Site sensible / Site standard',
    primaryStandards: [
      'Code de la sécurité intérieure — Livre VI (activités privées de sécurité)',
      'Réglementation CNAPS (agrément, autorisation, carte professionnelle)',
      'Convention collective nationale Prévention et Sécurité',
      'ISO 18788 (management des opérations de sécurité privée)',
      'Norme NF Service — prestations de sécurité',
      'ISO 9001 (management de la qualité)',
    ],
  },
  {
    id: 'incendie_prevention',
    name: 'verticals.incendie_prevention.name',
    focusKey: 'verticals.incendie_prevention.focus',
    icon: 'Flame',
    riskTaxonomy: 'fmea',
    safetyClassification: 'ERP catégories 1-5 / IGH / Code du travail',
    primaryStandards: [
      'Règlement de sécurité ERP (arrêté du 25 juin 1980 modifié)',
      "Code de la construction et de l'habitation (ERP / IGH)",
      'Référentiels SSIAP (arrêté du 2 mai 2005 modifié)',
      'Code du travail — prévention incendie (partie R. 4227)',
      'Règles APSAD (R1 sprinkler, R4 extincteurs, R5 RIA, R6 surveillance, R13 extinction gaz)',
      'Commissions de sécurité et visites périodiques',
    ],
  },
  {
    id: 'surete_entreprise',
    name: 'verticals.surete_entreprise.name',
    focusKey: 'verticals.surete_entreprise.focus',
    icon: 'Building2',
    riskTaxonomy: 'fmea',
    primaryStandards: [
      'Code de la sécurité intérieure — vidéoprotection (L. 251 et suivants)',
      'Règle APSAD R81 (détection intrusion)',
      "NF EN 50131 (systèmes d'alarme intrusion)",
      "RGPD / CNIL (vidéoprotection, contrôle d'accès, biométrie)",
      'Directive CER (résilience des entités critiques)',
      'ISO 31000 (management du risque)',
    ],
  },
  {
    id: 'datacenter_infra',
    name: 'verticals.datacenter_infra.name',
    focusKey: 'verticals.datacenter_infra.focus',
    icon: 'Server',
    riskTaxonomy: 'fmea',
    safetyClassification: 'Infrastructure critique / Site standard',
    primaryStandards: [
      'EN 50600 (installations et infrastructures de centres de données)',
      'ISO/IEC 27001 — Annexe A (contrôles physiques et environnementaux)',
      'NIS2 / CER (résilience des infrastructures critiques)',
      'Règles APSAD R7 (détection incendie) et R13 (extinction automatique gaz)',
      'Recommandations ANSSI — sécurité physique',
      'Convergence sécurité physique / cybersécurité (PC sécurité, salles serveurs)',
    ],
  },
];

// ---------------------------------------------------------------------------
// Verticals disponibles
// ---------------------------------------------------------------------------

const LAUNCH_VERTICALS = [
  'securite_privee',
  'incendie_prevention',
  'surete_entreprise',
  'datacenter_infra',
];

const ALL_VERTICALS = [...LAUNCH_VERTICALS];

// ---------------------------------------------------------------------------
// Country Registry
// ---------------------------------------------------------------------------

/** Pays cibles — marché GSMS (France et Europe proche) */
export const COUNTRY_REGISTRY: CountryRegistryEntry[] = [
  {
    code: 'FR',
    nameKey: 'countries.fr',
    region: 'europe',
    defaultLanguage: 'fr-FR',
    flag: '🇫🇷',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'BE',
    nameKey: 'countries.be',
    region: 'europe',
    defaultLanguage: 'fr-BE',
    flag: '🇧🇪',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'CH',
    nameKey: 'countries.ch',
    region: 'europe',
    defaultLanguage: 'fr-CH',
    flag: '🇨🇭',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'DE',
    nameKey: 'countries.de',
    region: 'europe',
    defaultLanguage: 'de-DE',
    flag: '🇩🇪',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'ES',
    nameKey: 'countries.es',
    region: 'europe',
    defaultLanguage: 'es-ES',
    flag: '🇪🇸',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'IT',
    nameKey: 'countries.it',
    region: 'europe',
    defaultLanguage: 'it-IT',
    flag: '🇮🇹',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'GB',
    nameKey: 'countries.gb',
    region: 'europe',
    defaultLanguage: 'en-GB',
    flag: '🇬🇧',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'NL',
    nameKey: 'countries.nl',
    region: 'europe',
    defaultLanguage: 'nl-NL',
    flag: '🇳🇱',
    availableVerticals: ALL_VERTICALS,
  },
  {
    code: 'PT',
    nameKey: 'countries.pt',
    region: 'europe',
    defaultLanguage: 'pt-PT',
    flag: '🇵🇹',
    availableVerticals: ALL_VERTICALS,
  },
];

// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------

/** All 14 functional modules with baseline requirements and tests */
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // =========================================================================
  // 1. Audit Trail
  // =========================================================================
  {
    id: 'audit_trail',
    nameKey: 'modules.audit_trail.name',
    descKey: 'modules.audit_trail.desc',
    icon: 'ScrollText',
    requirements: [
      {
        templateId: 'mod-audit_trail:data-integrity:req-01',
        title: 'Comprehensive Event Logging',
        description:
          'The system shall create an immutable audit trail entry for every create, read (where required), update, and delete operation on compliance-critical records. Each entry shall capture the action type, affected record, old value, new value, user identity, and ISO 8601 timestamp with timezone.',
        category: 'Data Integrity',
        tags: ['audit-trail', 'event-logging', 'data-integrity'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-audit_trail:data-integrity:req-02',
        title: 'Before/After Value Capture',
        description:
          'For every data modification, the audit trail shall record both the previous (before) and new (after) values of each changed field, enabling full reconstruction of the record state at any point in time.',
        category: 'Data Integrity',
        tags: ['audit-trail', 'before-after', 'data-integrity'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-audit_trail:data-integrity:req-03',
        title: 'Timestamp Accuracy and Synchronization',
        description:
          'Audit trail timestamps shall be derived from a trusted, NTP-synchronized time source with accuracy of +/- 1 second. The system shall prevent manual alteration of system clocks by non-administrative users and log any clock adjustments.',
        category: 'Data Integrity',
        tags: ['audit-trail', 'timestamp', 'ntp'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-audit_trail:access-control:req-01',
        title: 'User Identification in Audit Records',
        description:
          'Every audit trail entry shall include the authenticated user identity (unique user ID and display name) of the person who performed the action. System-generated actions shall be attributed to a clearly identified system account.',
        category: 'Access Control',
        tags: ['audit-trail', 'user-identification', 'access-control'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-audit_trail:data-integrity:req-04',
        title: 'Audit Log Tamper Protection',
        description:
          'Audit trail records shall be stored in append-only storage that prevents modification, deletion, or backdating of entries. The system shall implement cryptographic integrity verification (e.g., hash chaining) to detect any unauthorized tampering.',
        category: 'Data Integrity',
        tags: ['audit-trail', 'tamper-protection', 'integrity'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-audit_trail:functional:tst-01',
        title: 'Verify Audit Log on CRUD Operations',
        description:
          'Create a compliance-critical record, update it, then delete it (or mark inactive). For each operation, verify that a corresponding audit trail entry is created containing: action type, record identifier, old and new values, authenticated user ID, and ISO 8601 timestamp.',
        category: 'Functional',
        tags: ['audit-trail', 'crud', 'functional-test'],
        linkedReqTags: ['audit-trail', 'event-logging', 'before-after'],
      },
      {
        templateId: 'mod-audit_trail:security:tst-01',
        title: 'Verify Tamper Protection Mechanism',
        description:
          'Attempt to directly modify an existing audit trail record at the database level. Verify that the cryptographic integrity check detects the modification and raises an alert. Confirm that no API endpoint allows deletion or modification of audit entries.',
        category: 'Security',
        tags: ['audit-trail', 'tamper-protection', 'security-test'],
        linkedReqTags: ['audit-trail', 'tamper-protection', 'integrity'],
      },
      {
        templateId: 'mod-audit_trail:functional:tst-02',
        title: 'Verify Timestamp Accuracy',
        description:
          'Perform an auditable action and capture the audit trail timestamp. Compare against an independent NTP-synchronized reference clock. Confirm the variance is within +/- 1 second. Verify that manual system clock changes are logged.',
        category: 'Functional',
        tags: ['audit-trail', 'timestamp', 'accuracy-test'],
        linkedReqTags: ['audit-trail', 'timestamp', 'ntp'],
      },
    ],
  },

  // =========================================================================
  // 2. Electronic Signatures
  // =========================================================================
  {
    id: 'e_signatures',
    nameKey: 'modules.e_signatures.name',
    descKey: 'modules.e_signatures.desc',
    icon: 'PenTool',
    requirements: [
      {
        templateId: 'mod-e_signatures:authentication:req-01',
        title: 'Unique User Identity for Signatures',
        description:
          'Each electronic signature shall be linked to a unique individual. The system shall ensure that no two users share the same credential combination and that credentials are not reused or reassigned.',
        category: 'Authentication',
        tags: ['e-signature', 'user-identity', 'authentication'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-e_signatures:data-integrity:req-01',
        title: 'Signature Manifestation',
        description:
          'Each signed electronic record shall display the printed name of the signer, the date and time of the signature, and the meaning (e.g., review, approval, responsibility) associated with the signature.',
        category: 'Data Integrity',
        tags: ['e-signature', 'manifestation', 'display'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-e_signatures:data-integrity:req-02',
        title: 'Signature Meaning Declaration',
        description:
          'The system shall require the signer to select or acknowledge the meaning of the signature (e.g., "Authored", "Reviewed", "Approved") at the time of signing, and this meaning shall be permanently bound to the signed record.',
        category: 'Data Integrity',
        tags: ['e-signature', 'meaning', 'binding'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-e_signatures:security:req-01',
        title: 'Non-Repudiation of Signatures',
        description:
          'Once an electronic signature is applied, the system shall make it computationally infeasible for the signer to deny having signed. The signature binding shall survive record export, archival, and migration.',
        category: 'Security',
        tags: ['e-signature', 'non-repudiation', 'security'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-e_signatures:authentication:req-02',
        title: 'Re-authentication for Signing',
        description:
          'The system shall require re-entry of credentials (password and, where applicable, second factor) at the point of signing. For consecutive signatures within a controlled session, at minimum the password component shall be re-entered.',
        category: 'Authentication',
        tags: ['e-signature', 're-authentication', 'session'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-e_signatures:functional:tst-01',
        title: 'Verify Signature Contains Required Fields',
        description:
          'Apply an electronic signature to a record. Verify the signed record displays: signer printed name, date/time of signature, and signature meaning. Verify all three elements are stored and cannot be separated from the record.',
        category: 'Functional',
        tags: ['e-signature', 'manifestation', 'functional-test'],
        linkedReqTags: ['e-signature', 'manifestation', 'meaning'],
      },
      {
        templateId: 'mod-e_signatures:security:tst-01',
        title: 'Verify Re-authentication on Signing',
        description:
          'Attempt to sign a record. Verify the system prompts for credential re-entry before the signature is accepted. Attempt to sign without re-authenticating and confirm the signature is rejected.',
        category: 'Security',
        tags: ['e-signature', 're-authentication', 'security-test'],
        linkedReqTags: ['e-signature', 're-authentication', 'authentication'],
      },
      {
        templateId: 'mod-e_signatures:security:tst-02',
        title: 'Verify Non-Repudiation After Export',
        description:
          'Sign a record, export it to PDF and archived format. Verify the signature metadata (signer, timestamp, meaning) is preserved in the exported document and cannot be stripped or altered.',
        category: 'Security',
        tags: ['e-signature', 'non-repudiation', 'export-test'],
        linkedReqTags: ['e-signature', 'non-repudiation', 'binding'],
      },
    ],
  },

  // =========================================================================
  // 3. CAPA (Corrective and Preventive Action)
  // =========================================================================
  {
    id: 'capa',
    nameKey: 'modules.capa.name',
    descKey: 'modules.capa.desc',
    icon: 'ShieldCheck',
    requirements: [
      {
        templateId: 'mod-capa:quality-management:req-01',
        title: 'Root Cause Analysis Documentation',
        description:
          'The CAPA system shall require documentation of a formal root cause analysis using recognized methodologies (e.g., 5-Why, Fishbone, Fault Tree) before corrective action planning can proceed. The root cause shall be linked to the originating deviation, complaint, or audit finding.',
        category: 'Quality Management',
        tags: ['capa', 'root-cause', 'investigation'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-capa:quality-management:req-02',
        title: 'Corrective Action Plan with Accountability',
        description:
          'Each CAPA shall have a documented corrective action plan that includes: specific actions to be taken, responsible persons, target completion dates, and required approvals. The plan shall address both immediate correction and systemic corrective action.',
        category: 'Quality Management',
        tags: ['capa', 'corrective-action', 'planning'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-capa:quality-management:req-03',
        title: 'Effectiveness Check Requirement',
        description:
          'The system shall enforce an effectiveness check for every CAPA at a configurable interval after implementation (default 90 days). The effectiveness check shall verify that the root cause has been eliminated and the nonconformance has not recurred.',
        category: 'Quality Management',
        tags: ['capa', 'effectiveness', 'verification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-capa:quality-management:req-04',
        title: 'CAPA Escalation and Trending',
        description:
          'The system shall support escalation of overdue CAPAs to management and provide trending analysis of CAPA categories, root causes, and recurrence rates to enable proactive quality improvement.',
        category: 'Quality Management',
        tags: ['capa', 'escalation', 'trending'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-capa:documentation:req-01',
        title: 'CAPA Documentation and Traceability',
        description:
          'Complete CAPA records shall be maintained including: originating event, investigation, root cause, action plan, implementation evidence, effectiveness check results, and closure approval. Full traceability from source event to closure shall be maintained.',
        category: 'Documentation',
        tags: ['capa', 'documentation', 'traceability'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-capa:functional:tst-01',
        title: 'Verify CAPA Workflow Execution',
        description:
          'Create a CAPA from a deviation. Complete root cause analysis, define corrective actions with owners and due dates, submit for approval, implement actions, and close. Verify all workflow states are enforced and transitions require appropriate authorization.',
        category: 'Functional',
        tags: ['capa', 'workflow', 'functional-test'],
        linkedReqTags: ['capa', 'root-cause', 'corrective-action'],
      },
      {
        templateId: 'mod-capa:functional:tst-02',
        title: 'Verify Effectiveness Check Trigger',
        description:
          'Implement and close a CAPA. Verify the system automatically generates an effectiveness check task at the configured interval. Verify the CAPA cannot be marked fully closed until the effectiveness check is completed and approved.',
        category: 'Functional',
        tags: ['capa', 'effectiveness', 'automation-test'],
        linkedReqTags: ['capa', 'effectiveness', 'verification'],
      },
      {
        templateId: 'mod-capa:functional:tst-03',
        title: 'Verify CAPA Escalation for Overdue Actions',
        description:
          'Create a CAPA with a target date in the past. Verify the system triggers escalation notifications to the configured management contacts. Verify overdue CAPAs appear in the management dashboard with appropriate visual indicators.',
        category: 'Functional',
        tags: ['capa', 'escalation', 'notification-test'],
        linkedReqTags: ['capa', 'escalation', 'trending'],
      },
    ],
  },

  // =========================================================================
  // 4. Document Control
  // =========================================================================
  {
    id: 'document_control',
    nameKey: 'modules.document_control.name',
    descKey: 'modules.document_control.desc',
    icon: 'FileText',
    requirements: [
      {
        templateId: 'mod-document_control:document-management:req-01',
        title: 'Document Versioning and Lifecycle',
        description:
          'The system shall enforce a formal document lifecycle (Draft -> Review -> Approved -> Effective -> Retired) with version control. Each version shall be uniquely numbered and the system shall prevent edits to approved/effective documents without initiating a new version.',
        category: 'Document Management',
        tags: ['document-control', 'versioning', 'lifecycle'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-document_control:document-management:req-02',
        title: 'Controlled Document Distribution',
        description:
          'The system shall ensure only the current effective version of a document is accessible to general users. Obsolete versions shall be clearly marked and access-restricted. Distribution acknowledgment shall be tracked.',
        category: 'Document Management',
        tags: ['document-control', 'distribution', 'access'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-document_control:document-management:req-03',
        title: 'Review and Approval Workflow',
        description:
          'Documents shall pass through a configurable review and approval workflow with electronic signatures. The system shall enforce that required reviewers and approvers have acted before a document can become effective.',
        category: 'Document Management',
        tags: ['document-control', 'review', 'approval'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-document_control:document-management:req-04',
        title: 'Periodic Review Scheduling',
        description:
          'The system shall track periodic review dates for all effective documents and generate notifications when reviews are due. Overdue reviews shall be escalated to document owners and quality management.',
        category: 'Document Management',
        tags: ['document-control', 'periodic-review', 'scheduling'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-document_control:functional:tst-01',
        title: 'Verify Document Lifecycle Transitions',
        description:
          'Create a document, move it through Draft -> Review -> Approved -> Effective. Verify each transition enforces the required actions (review, signature). Attempt to edit an effective document and verify a new version is required.',
        category: 'Functional',
        tags: ['document-control', 'lifecycle', 'functional-test'],
        linkedReqTags: ['document-control', 'versioning', 'lifecycle'],
      },
      {
        templateId: 'mod-document_control:security:tst-01',
        title: 'Verify Obsolete Version Restriction',
        description:
          'Create a document with multiple versions. Verify that general users can only access the current effective version. Verify obsolete versions are clearly marked and accessible only to users with appropriate permissions.',
        category: 'Security',
        tags: ['document-control', 'distribution', 'access-test'],
        linkedReqTags: ['document-control', 'distribution', 'access'],
      },
      {
        templateId: 'mod-document_control:functional:tst-02',
        title: 'Verify Periodic Review Notification',
        description:
          'Set a document periodic review date to a past date. Verify the system generates a review-due notification. Verify escalation occurs if the review is not completed within the configured grace period.',
        category: 'Functional',
        tags: ['document-control', 'periodic-review', 'notification-test'],
        linkedReqTags: ['document-control', 'periodic-review', 'scheduling'],
      },
    ],
  },

  // =========================================================================
  // 5. Training Management
  // =========================================================================
  {
    id: 'training',
    nameKey: 'modules.training.name',
    descKey: 'modules.training.desc',
    icon: 'GraduationCap',
    requirements: [
      {
        templateId: 'mod-training:training:req-01',
        title: 'Training Assignment and Tracking',
        description:
          'The system shall automatically assign training requirements based on role, department, and document changes. Training completion status, including date, trainer, and evidence, shall be recorded and tracked per individual.',
        category: 'Training',
        tags: ['training', 'assignment', 'tracking'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-training:training:req-02',
        title: 'Training Effectiveness Assessment',
        description:
          'The system shall support training effectiveness assessment through configurable quizzes, practical evaluations, or manager sign-off. Minimum passing scores shall be enforced where applicable.',
        category: 'Training',
        tags: ['training', 'effectiveness', 'assessment'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-training:training:req-03',
        title: 'Training Matrix and Gap Analysis',
        description:
          'The system shall maintain a training matrix mapping roles to required curricula and provide gap analysis reporting to identify personnel with incomplete or overdue training.',
        category: 'Training',
        tags: ['training', 'matrix', 'gap-analysis'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-training:training:req-04',
        title: 'Retraining on Document Revision',
        description:
          'When a controlled document is revised to a new effective version, the system shall automatically generate retraining assignments for all personnel previously trained on the document.',
        category: 'Training',
        tags: ['training', 'retraining', 'document-change'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-training:functional:tst-01',
        title: 'Verify Auto-Assignment on Document Change',
        description:
          'Revise a controlled document to a new version. Verify training assignments are automatically created for all previously trained personnel. Verify the assignment references the new document version.',
        category: 'Functional',
        tags: ['training', 'auto-assignment', 'functional-test'],
        linkedReqTags: ['training', 'retraining', 'document-change'],
      },
      {
        templateId: 'mod-training:functional:tst-02',
        title: 'Verify Training Effectiveness Quiz',
        description:
          'Complete a training assignment with a quiz. Submit answers below the passing threshold and verify the training is marked incomplete. Submit passing answers and verify completion is recorded.',
        category: 'Functional',
        tags: ['training', 'quiz', 'effectiveness-test'],
        linkedReqTags: ['training', 'effectiveness', 'assessment'],
      },
      {
        templateId: 'mod-training:functional:tst-03',
        title: 'Verify Training Gap Report',
        description:
          'Assign training curricula to a role. Add a user to that role without completing the training. Generate the training gap report and verify the user appears as having outstanding requirements.',
        category: 'Functional',
        tags: ['training', 'gap-analysis', 'reporting-test'],
        linkedReqTags: ['training', 'matrix', 'gap-analysis'],
      },
    ],
  },

  // =========================================================================
  // 6. Change Control
  // =========================================================================
  {
    id: 'change_control',
    nameKey: 'modules.change_control.name',
    descKey: 'modules.change_control.desc',
    icon: 'GitBranch',
    requirements: [
      {
        templateId: 'mod-change_control:change-management:req-01',
        title: 'Change Request Initiation and Classification',
        description:
          'All changes to compliance-critical systems, processes, or documents shall be initiated via a formal change request. Each request shall be classified by type (minor, major, critical) and assessed for regulatory impact before implementation.',
        category: 'Change Management',
        tags: ['change-control', 'initiation', 'classification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-change_control:change-management:req-02',
        title: 'Impact Assessment and Risk Evaluation',
        description:
          'Each change request shall undergo a documented impact assessment covering: product quality, patient safety, regulatory compliance, validated state, and related systems. Risk evaluation shall use the applicable risk taxonomy.',
        category: 'Change Management',
        tags: ['change-control', 'impact-assessment', 'risk'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-change_control:change-management:req-03',
        title: 'Change Implementation and Verification',
        description:
          'Changes shall only be implemented after all required approvals are obtained. Post-implementation verification shall confirm the change achieved its intended purpose without unintended consequences.',
        category: 'Change Management',
        tags: ['change-control', 'implementation', 'verification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-change_control:functional:tst-01',
        title: 'Verify Change Control Workflow',
        description:
          'Submit a change request, complete impact assessment, obtain approvals, implement the change, and perform post-implementation verification. Verify all stages enforce proper authorization and documentation.',
        category: 'Functional',
        tags: ['change-control', 'workflow', 'functional-test'],
        linkedReqTags: ['change-control', 'initiation', 'implementation'],
      },
      {
        templateId: 'mod-change_control:functional:tst-02',
        title: 'Verify Impact Assessment Completeness',
        description:
          'Attempt to advance a change request past the assessment stage with missing impact evaluation fields. Verify the system prevents progression until all required assessments are documented.',
        category: 'Functional',
        tags: ['change-control', 'impact-assessment', 'validation-test'],
        linkedReqTags: ['change-control', 'impact-assessment', 'risk'],
      },
    ],
  },

  // =========================================================================
  // 7. Deviation Management
  // =========================================================================
  {
    id: 'deviation',
    nameKey: 'modules.deviation.name',
    descKey: 'modules.deviation.desc',
    icon: 'AlertTriangle',
    requirements: [
      {
        templateId: 'mod-deviation:quality-management:req-01',
        title: 'Deviation Recording and Classification',
        description:
          'All deviations from approved procedures, specifications, or planned activities shall be recorded immediately upon detection. Each deviation shall be classified by severity (critical, major, minor) and category.',
        category: 'Quality Management',
        tags: ['deviation', 'recording', 'classification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-deviation:quality-management:req-02',
        title: 'Deviation Investigation and Closure',
        description:
          'Each deviation shall be investigated to determine root cause and impact on product quality. Investigation depth shall be commensurate with severity. Closure shall require documented justification and quality approval.',
        category: 'Quality Management',
        tags: ['deviation', 'investigation', 'closure'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-deviation:quality-management:req-03',
        title: 'CAPA Linkage for Recurring Deviations',
        description:
          'The system shall automatically flag recurring deviations (same category/root cause within a configurable window) and prompt for CAPA initiation. Trending data shall be available for management review.',
        category: 'Quality Management',
        tags: ['deviation', 'capa-link', 'trending'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-deviation:functional:tst-01',
        title: 'Verify Deviation Workflow',
        description:
          'Record a deviation, classify it, perform investigation, document root cause, and close with quality approval. Verify all workflow states are enforced and proper authorization is required at each step.',
        category: 'Functional',
        tags: ['deviation', 'workflow', 'functional-test'],
        linkedReqTags: ['deviation', 'recording', 'investigation'],
      },
      {
        templateId: 'mod-deviation:functional:tst-02',
        title: 'Verify Recurring Deviation Detection',
        description:
          'Create three deviations with the same category within the configured window. Verify the system flags the recurring pattern and prompts for CAPA initiation on the third occurrence.',
        category: 'Functional',
        tags: ['deviation', 'recurring', 'trending-test'],
        linkedReqTags: ['deviation', 'capa-link', 'trending'],
      },
    ],
  },

  // =========================================================================
  // 8. Risk Management
  // =========================================================================
  {
    id: 'risk_management',
    nameKey: 'modules.risk_management.name',
    descKey: 'modules.risk_management.desc',
    icon: 'Shield',
    requirements: [
      {
        templateId: 'mod-risk_management:risk-management:req-01',
        title: 'Risk Assessment Framework',
        description:
          'The system shall support formal risk assessment using configurable methodologies (FMEA, FTA, HAZOP, PHA). Risk shall be evaluated based on severity, probability of occurrence, and detectability to produce a Risk Priority Number (RPN) or equivalent.',
        category: 'Risk Management',
        tags: ['risk', 'assessment', 'methodology'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-risk_management:risk-management:req-02',
        title: 'Risk Control and Mitigation Tracking',
        description:
          'For each identified risk exceeding the acceptance threshold, the system shall require documented risk control measures, responsible owners, and implementation deadlines. Residual risk shall be evaluated after controls are applied.',
        category: 'Risk Management',
        tags: ['risk', 'control', 'mitigation'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-risk_management:risk-management:req-03',
        title: 'Risk Review and Communication',
        description:
          'The risk register shall be reviewed periodically and after significant changes. Risk assessment results and residual risks shall be communicated to relevant stakeholders and documented in management review.',
        category: 'Risk Management',
        tags: ['risk', 'review', 'communication'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-risk_management:functional:tst-01',
        title: 'Verify Risk Assessment Workflow',
        description:
          'Create a risk assessment, identify hazards, evaluate severity/probability/detectability, calculate RPN, define control measures, and evaluate residual risk. Verify all steps are enforced and calculations are correct.',
        category: 'Functional',
        tags: ['risk', 'assessment', 'functional-test'],
        linkedReqTags: ['risk', 'assessment', 'methodology'],
      },
      {
        templateId: 'mod-risk_management:functional:tst-02',
        title: 'Verify Risk Control Enforcement',
        description:
          'Identify a risk above the acceptance threshold. Attempt to accept it without defining control measures. Verify the system requires mitigation actions before the risk can be accepted.',
        category: 'Functional',
        tags: ['risk', 'control', 'enforcement-test'],
        linkedReqTags: ['risk', 'control', 'mitigation'],
      },
    ],
  },

  // =========================================================================
  // 9. Supplier Management
  // =========================================================================
  {
    id: 'supplier_management',
    nameKey: 'modules.supplier_management.name',
    descKey: 'modules.supplier_management.desc',
    icon: 'Building2',
    requirements: [
      {
        templateId: 'mod-supplier_management:supplier-quality:req-01',
        title: 'Supplier Qualification and Approval',
        description:
          'All suppliers of compliance-critical materials, components, or services shall be qualified through a documented assessment process including quality questionnaire, capability evaluation, and risk-based audit determination before approval.',
        category: 'Supplier Quality',
        tags: ['supplier', 'qualification', 'approval'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-supplier_management:supplier-quality:req-02',
        title: 'Supplier Performance Monitoring',
        description:
          'Approved suppliers shall be monitored through defined KPIs including: on-time delivery, quality rejection rate, CAPA responsiveness, and audit findings. Performance shall be reviewed at least annually.',
        category: 'Supplier Quality',
        tags: ['supplier', 'performance', 'monitoring'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-supplier_management:supplier-quality:req-03',
        title: 'Supplier Audit Program',
        description:
          'A risk-based supplier audit program shall be maintained. Audit frequency shall be determined by supplier criticality, performance history, and regulatory requirements. Audit findings shall be tracked to resolution.',
        category: 'Supplier Quality',
        tags: ['supplier', 'audit', 'program'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-supplier_management:functional:tst-01',
        title: 'Verify Supplier Qualification Workflow',
        description:
          'Initiate supplier qualification, complete the quality questionnaire, perform capability assessment, approve the supplier. Verify all steps are documented and the supplier status reflects the approval.',
        category: 'Functional',
        tags: ['supplier', 'qualification', 'functional-test'],
        linkedReqTags: ['supplier', 'qualification', 'approval'],
      },
      {
        templateId: 'mod-supplier_management:functional:tst-02',
        title: 'Verify Supplier Performance Dashboard',
        description:
          'Enter supplier delivery and quality data. Verify the performance KPI dashboard calculates metrics correctly. Verify suppliers falling below thresholds are flagged for review.',
        category: 'Functional',
        tags: ['supplier', 'performance', 'dashboard-test'],
        linkedReqTags: ['supplier', 'performance', 'monitoring'],
      },
    ],
  },

  // =========================================================================
  // 10. Complaint Handling
  // =========================================================================
  {
    id: 'complaint_handling',
    nameKey: 'modules.complaint_handling.name',
    descKey: 'modules.complaint_handling.desc',
    icon: 'MessageSquareWarning',
    requirements: [
      {
        templateId: 'mod-complaint_handling:complaint-management:req-01',
        title: 'Complaint Intake and Triage',
        description:
          'All product complaints shall be recorded with: date received, complainant information, product identification (lot/batch), complaint description, and initial severity assessment. Potentially reportable events shall be flagged within 24 hours.',
        category: 'Complaint Management',
        tags: ['complaint', 'intake', 'triage'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-complaint_handling:complaint-management:req-02',
        title: 'Complaint Investigation and Resolution',
        description:
          'Each complaint shall be investigated commensurate with its severity. Investigation shall determine root cause, affected lots, and whether the complaint indicates a systematic quality issue. Resolution and response to complainant shall be documented.',
        category: 'Complaint Management',
        tags: ['complaint', 'investigation', 'resolution'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-complaint_handling:regulatory:req-01',
        title: 'Regulatory Reporting Trigger',
        description:
          'The system shall identify complaints that meet regulatory reporting criteria (e.g., MDR, MedWatch, field safety corrective actions) and enforce reporting timelines. Reportable events shall be escalated to the responsible regulatory affairs person.',
        category: 'Regulatory',
        tags: ['complaint', 'reporting', 'regulatory'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-complaint_handling:functional:tst-01',
        title: 'Verify Complaint Intake and Triage',
        description:
          'Enter a complaint with all required fields. Verify initial severity assessment is captured. Simulate a potentially reportable event and verify it is flagged within the 24-hour window.',
        category: 'Functional',
        tags: ['complaint', 'intake', 'functional-test'],
        linkedReqTags: ['complaint', 'intake', 'triage'],
      },
      {
        templateId: 'mod-complaint_handling:functional:tst-02',
        title: 'Verify Regulatory Reporting Trigger',
        description:
          'Create a complaint that meets MDR reporting criteria. Verify the system identifies it as reportable and generates the appropriate notification to regulatory affairs within the configured timeline.',
        category: 'Functional',
        tags: ['complaint', 'reporting', 'trigger-test'],
        linkedReqTags: ['complaint', 'reporting', 'regulatory'],
      },
    ],
  },

  // =========================================================================
  // 12. Access Control
  // =========================================================================
  {
    id: 'access_control',
    nameKey: 'modules.access_control.name',
    descKey: 'modules.access_control.desc',
    icon: 'Lock',
    requirements: [
      {
        templateId: 'mod-access_control:access-control:req-01',
        title: 'Role-Based Access Control (RBAC)',
        description:
          'The system shall implement role-based access control where permissions are assigned to roles, and roles are assigned to users. Access shall follow the principle of least privilege. Role assignments shall be documented and approved.',
        category: 'Access Control',
        tags: ['access-control', 'rbac', 'authorization'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-access_control:access-control:req-02',
        title: 'Unique User Identification',
        description:
          'Each system user shall have a unique identifier that is not shared or reused. Shared or generic accounts shall not be permitted for compliance-critical activities. User identity shall be verified before account activation.',
        category: 'Access Control',
        tags: ['access-control', 'user-id', 'unique-identification'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-access_control:authentication:req-01',
        title: 'Multi-Factor Authentication (MFA)',
        description:
          'The system shall enforce multi-factor authentication for all users accessing compliance-critical data. MFA shall combine at least two factors: something the user knows (password), something the user has (token/device), or something the user is (biometric).',
        category: 'Authentication',
        tags: ['access-control', 'mfa', 'authentication'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-access_control:access-control:req-03',
        title: 'Access Review and Recertification',
        description:
          'User access rights shall be reviewed at least quarterly. Terminated or transferred employees shall have access revoked within 24 hours. Annual access recertification by management shall be documented.',
        category: 'Access Control',
        tags: ['access-control', 'review', 'recertification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-access_control:security:tst-01',
        title: 'Verify RBAC Enforcement',
        description:
          'Assign a user to a role with limited permissions. Attempt to access resources outside the role scope. Verify access is denied. Change the role and verify new permissions take effect.',
        category: 'Security',
        tags: ['access-control', 'rbac', 'enforcement-test'],
        linkedReqTags: ['access-control', 'rbac', 'authorization'],
      },
      {
        templateId: 'mod-access_control:security:tst-02',
        title: 'Verify MFA Authentication',
        description:
          'Enable MFA for a user account. Attempt to log in with password only and verify access is denied. Complete MFA challenge and verify access is granted. Verify MFA cannot be bypassed.',
        category: 'Security',
        tags: ['access-control', 'mfa', 'authentication-test'],
        linkedReqTags: ['access-control', 'mfa', 'authentication'],
      },
      {
        templateId: 'mod-access_control:security:tst-03',
        title: 'Verify Access Revocation',
        description:
          'Deactivate a user account. Verify the user can no longer log in or access any system resources. Verify active sessions are terminated. Verify the deactivation is recorded in the audit trail.',
        category: 'Security',
        tags: ['access-control', 'revocation', 'deactivation-test'],
        linkedReqTags: ['access-control', 'review', 'recertification'],
      },
    ],
  },

  // =========================================================================
  // 13. Data Backup and Recovery
  // =========================================================================
  {
    id: 'backup_recovery',
    nameKey: 'modules.backup_recovery.name',
    descKey: 'modules.backup_recovery.desc',
    icon: 'DatabaseBackup',
    requirements: [
      {
        templateId: 'mod-backup_recovery:business-continuity:req-01',
        title: 'Automated Backup Schedule',
        description:
          'The system shall perform automated backups per a defined schedule: full backups at least weekly, incremental backups at least daily. Backups shall include all compliance-critical data, configurations, and audit trails.',
        category: 'Business Continuity',
        tags: ['backup', 'schedule', 'automation'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-backup_recovery:business-continuity:req-02',
        title: 'Backup Integrity Verification',
        description:
          'Backup integrity shall be verified through automated checksums at the time of creation and periodic restore tests (at least quarterly). Failed backups shall generate immediate alerts to the operations team.',
        category: 'Business Continuity',
        tags: ['backup', 'integrity', 'verification'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-backup_recovery:business-continuity:req-03',
        title: 'Disaster Recovery Plan and RTO/RPO',
        description:
          'A documented disaster recovery plan shall define Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for each compliance-critical system. The plan shall be tested annually and results documented.',
        category: 'Business Continuity',
        tags: ['backup', 'disaster-recovery', 'rto-rpo'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-backup_recovery:operational:tst-01',
        title: 'Verify Backup Restore Procedure',
        description:
          'Perform a full backup of the system. Simulate data loss by restoring to a test environment. Verify all compliance-critical data, configurations, and audit trails are intact. Verify the restore completes within the documented RTO.',
        category: 'Operational',
        tags: ['backup', 'restore', 'operational-test'],
        linkedReqTags: ['backup', 'integrity', 'disaster-recovery'],
      },
      {
        templateId: 'mod-backup_recovery:operational:tst-02',
        title: 'Verify Backup Failure Alerting',
        description:
          'Simulate a backup failure (e.g., insufficient storage). Verify the system generates an immediate alert to the configured operations contacts. Verify the failure is logged in the system event log.',
        category: 'Operational',
        tags: ['backup', 'alerting', 'failure-test'],
        linkedReqTags: ['backup', 'integrity', 'verification'],
      },
    ],
  },

  // =========================================================================
  // 14. Data Migration
  // =========================================================================
  {
    id: 'data_migration',
    nameKey: 'modules.data_migration.name',
    descKey: 'modules.data_migration.desc',
    icon: 'ArrowRightLeft',
    requirements: [
      {
        templateId: 'mod-data_migration:data-migration:req-01',
        title: 'Migration Validation Protocol',
        description:
          'Data migration shall be executed per an approved protocol that defines: scope of data, mapping rules, transformation logic, acceptance criteria, and rollback procedure. The protocol shall be approved by data owner and quality.',
        category: 'Data Migration',
        tags: ['migration', 'protocol', 'validation'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-data_migration:data-migration:req-02',
        title: 'Data Integrity Verification Post-Migration',
        description:
          'After migration, data integrity shall be verified by comparing source and target record counts, checksums, and a statistically significant sample of individual records. Discrepancies shall be investigated and resolved before go-live.',
        category: 'Data Migration',
        tags: ['migration', 'integrity', 'verification'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-data_migration:data-migration:req-03',
        title: 'Audit Trail Continuity',
        description:
          'The migration process shall preserve the complete audit trail history from the source system. If audit trail format changes, a documented mapping shall ensure no historical data is lost or misrepresented.',
        category: 'Data Migration',
        tags: ['migration', 'audit-trail', 'continuity'],
        riskLevel: 'critical',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-data_migration:functional:tst-01',
        title: 'Verify Migration Data Integrity',
        description:
          'Execute a test migration. Compare source and target: total record counts, field-level checksums for a representative sample, and verify no data truncation or format corruption occurred.',
        category: 'Functional',
        tags: ['migration', 'integrity', 'comparison-test'],
        linkedReqTags: ['migration', 'integrity', 'verification'],
      },
      {
        templateId: 'mod-data_migration:functional:tst-02',
        title: 'Verify Audit Trail Preservation',
        description:
          'After migration, retrieve audit trail records from the target system. Verify they match the source system entries including: timestamps, user IDs, action types, and before/after values.',
        category: 'Functional',
        tags: ['migration', 'audit-trail', 'preservation-test'],
        linkedReqTags: ['migration', 'audit-trail', 'continuity'],
      },
    ],
  },

  // =========================================================================
  // 15. Reporting and Analytics
  // =========================================================================
  {
    id: 'reporting',
    nameKey: 'modules.reporting.name',
    descKey: 'modules.reporting.desc',
    icon: 'BarChart3',
    requirements: [
      {
        templateId: 'mod-reporting:reporting:req-01',
        title: 'Configurable Quality Metrics Dashboard',
        description:
          'The system shall provide a configurable dashboard displaying key quality metrics including: open CAPA count, overdue deviations, training compliance rate, pending change controls, and complaint trends. Data shall refresh at configurable intervals.',
        category: 'Reporting',
        tags: ['reporting', 'dashboard', 'metrics'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-reporting:reporting:req-02',
        title: 'Regulatory Submission Report Generation',
        description:
          'The system shall generate formatted reports suitable for regulatory submissions and inspections, including: validation summary, audit trail extracts, deviation summaries, and CAPA status reports. Reports shall be exportable in PDF and CSV formats.',
        category: 'Reporting',
        tags: ['reporting', 'regulatory', 'export'],
        riskLevel: 'high',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
      {
        templateId: 'mod-reporting:reporting:req-03',
        title: 'Trend Analysis and Statistical Process Control',
        description:
          'The system shall support trend analysis with configurable control limits and alert thresholds. Out-of-trend conditions shall generate notifications. Statistical tools (e.g., control charts, Pareto analysis) shall be available.',
        category: 'Reporting',
        tags: ['reporting', 'trending', 'spc'],
        riskLevel: 'medium',
        regulatoryRef: 'TBD — référentiel FR/UE à valider (socle générique ISO 9001)',
      },
    ],
    tests: [
      {
        templateId: 'mod-reporting:functional:tst-01',
        title: 'Verify Dashboard Data Accuracy',
        description:
          'Create known quantities of CAPAs, deviations, and training records. Verify the dashboard metrics match the expected counts. Modify data and verify the dashboard refreshes correctly.',
        category: 'Functional',
        tags: ['reporting', 'dashboard', 'accuracy-test'],
        linkedReqTags: ['reporting', 'dashboard', 'metrics'],
      },
      {
        templateId: 'mod-reporting:functional:tst-02',
        title: 'Verify Report Export Formats',
        description:
          'Generate a regulatory submission report. Export in PDF and CSV formats. Verify PDF formatting is correct and data is complete. Verify CSV contains all data fields and is properly delimited.',
        category: 'Functional',
        tags: ['reporting', 'export', 'format-test'],
        linkedReqTags: ['reporting', 'regulatory', 'export'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Look up a vertical definition by ID */
export function getVerticalById(id: string): VerticalDefinition | undefined {
  return VERTICAL_DEFINITIONS.find((v) => v.id === id);
}

/** Look up a country registry entry by ISO code */
export function getCountryByCode(code: string): CountryRegistryEntry | undefined {
  return COUNTRY_REGISTRY.find((c) => c.code === code.toUpperCase());
}

/** Look up a module definition by ID */
export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find((m) => m.id === id);
}

/** Get all countries in a region */
export function getCountriesByRegion(region: 'americas' | 'europe' | 'asia'): CountryRegistryEntry[] {
  return COUNTRY_REGISTRY.filter((c) => c.region === region);
}

/** Get all countries that support a given vertical */
export function getCountriesForVertical(verticalId: string): CountryRegistryEntry[] {
  return COUNTRY_REGISTRY.filter((c) => c.availableVerticals.includes(verticalId));
}
