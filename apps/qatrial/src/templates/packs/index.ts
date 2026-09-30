/**
 * Compliance Starter Packs
 *
 * Pre-configured bundles of country + vertical + modules + project type
 * that provide a one-click setup for common GSMS audit frameworks.
 */

export interface CompliancePack {
  id: string;
  name: string;           // i18n key
  description: string;    // i18n key
  icon: string;           // lucide icon name
  country: string;
  vertical: string;
  projectType: string;
  modules: string[];
  tags: string[];          // for filtering
}

export const COMPLIANCE_PACKS: CompliancePack[] = [
  {
    id: 'audit_precommission_erp',
    name: 'packs.auditPrecommissionErp',
    description: 'packs.auditPrecommissionErpDesc',
    icon: 'Flame',
    country: 'FR',
    vertical: 'incendie_prevention',
    projectType: 'compliance',
    modules: [
      'audit_trail',
      'capa',
      'deviation',
      'document_control',
      'training',
      'reporting',
    ],
    tags: ['erp', 'igh', 'ssiap', 'commission-securite'],
  },
  {
    id: 'audit_securite_privee',
    name: 'packs.auditSecuritePrivee',
    description: 'packs.auditSecuritePriveeDesc',
    icon: 'Shield',
    country: 'FR',
    vertical: 'securite_privee',
    projectType: 'compliance',
    modules: [
      'audit_trail',
      'capa',
      'document_control',
      'training',
      'complaint_handling',
      'reporting',
    ],
    tags: ['cnaps', 'securite-privee', 'audit-entreprise'],
  },
  {
    id: 'audit_surete_entreprise',
    name: 'packs.auditSureteEntreprise',
    description: 'packs.auditSureteEntrepriseDesc',
    icon: 'Building2',
    country: 'FR',
    vertical: 'surete_entreprise',
    projectType: 'compliance',
    modules: [
      'audit_trail',
      'risk_management',
      'access_control',
      'document_control',
      'reporting',
    ],
    tags: ['surete', 'videoprotection', 'controle-acces'],
  },
  {
    id: 'audit_datacenter',
    name: 'packs.auditDatacenter',
    description: 'packs.auditDatacenterDesc',
    icon: 'Server',
    country: 'FR',
    vertical: 'datacenter_infra',
    projectType: 'compliance',
    modules: [
      'audit_trail',
      'access_control',
      'risk_management',
      'backup_recovery',
      'document_control',
      'reporting',
    ],
    tags: ['datacenter', 'iso27001', 'convergence'],
  },
];
