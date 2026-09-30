import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, Shield } from 'lucide-react';
import { ImportExportBar } from '../shared/ImportExportBar';
import { ImportWizard } from '../import/ImportWizard';
import { ExportPanel } from '../import/ExportPanel';
import { WorkspaceManager } from '../auth/WorkspaceManager';
import { MigrateDataButton } from '../auth/MigrateDataButton';
import { ShareAuditLink } from '../audit/ShareAuditLink';
import { ShareSupplierLink } from '../suppliers/ShareSupplierLink';
import { useAuth } from '../../hooks/useAuth';
import { useAppMode } from '../../hooks/useAppMode';
import { useApiProjects } from '../../hooks/useApiProjects';
import { apiFetch } from '../../lib/apiClient';
import { Card } from '../hifi';

const ProviderSettings = lazy(() =>
  import('../ai/ProviderSettings').then((m) => ({ default: m.ProviderSettings })),
);
const WebhookSettings = lazy(() =>
  import('./WebhookSettings').then((m) => ({ default: m.WebhookSettings })),
);
const IntegrationSettings = lazy(() =>
  import('./IntegrationSettings').then((m) => ({ default: m.IntegrationSettings })),
);
const AuditTrailViewer = lazy(() =>
  import('../audit/AuditTrailViewer').then((m) => ({ default: m.AuditTrailViewer })),
);

function PanelSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

function SsoPanel() {
  const { t } = useTranslation();
  const [ssoConfig, setSsoConfig] = useState<{
    enabled: boolean;
    type: string;
    providerName: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ enabled: boolean; type: string; providerName: string | null }>('/auth/sso/config')
      .then(setSsoConfig)
      .catch(() => setSsoConfig({ enabled: false, type: 'oidc', providerName: null }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelSpinner />;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">{t('settings.sso')}</h3>
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-lg ${
              ssoConfig?.enabled
                ? 'bg-green-500/10 text-green-600'
                : 'bg-surface-secondary text-text-tertiary'
            }`}
          >
            <Shield className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {ssoConfig?.enabled ? t('sso.enabled') : t('sso.disabled')}
            </p>
            {ssoConfig?.enabled && ssoConfig.providerName && (
              <p className="text-xs text-text-tertiary">
                {t('sso.provider', { name: ssoConfig.providerName })} ({ssoConfig.type.toUpperCase()})
              </p>
            )}
            {!ssoConfig?.enabled && (
              <p className="mt-1 text-xs text-text-tertiary">{t('sso.envHint')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsGeneralPage() {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden">
      <div>
        <h3 className="text-[14px] font-semibold tracking-tight text-text-primary">
          {t('settings.nav.general')}
        </h3>
        <p className="mt-0.5 text-[12px] text-text-tertiary">
          {t('settings.nav.generalHint', {
            defaultValue: 'Préférences générales. Profil et avatar : page Profil.',
          })}
        </p>
      </div>

      <Card className="space-y-2 p-3.5 text-[12.5px] text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">Profil / avatar</span> — onglet{' '}
          <span className="font-medium">Profil</span> dans la nav Paramètres (ou menu avatar
          header).
        </p>
        <p>
          <span className="font-medium text-text-primary">Langue & thème</span> — drapeaux et
          soleil/lune dans le header.
        </p>
      </Card>
    </div>
  );
}

export function SettingsSignaturesPage() {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden">
      <div>
        <h3 className="text-[14px] font-semibold tracking-tight text-text-primary">
          {t('settings.nav.signatures', { defaultValue: 'Signature électronique' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-text-tertiary">
          Comment ça marche dans QAtrial (Part 11 / Annex 11 — intention).
        </p>
      </div>

      <Card className="space-y-2.5 p-3.5 text-[12.5px] leading-relaxed text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">1. Acte métier</span> — depuis une
          exigence / test, le panneau d’approbation ouvre la modale de signature.
        </p>
        <p>
          <span className="font-medium text-text-primary">2. Identité</span> — re-saisie du
          mot de passe (+ signification : approved / rejected / reviewed) + motif.
        </p>
        <p>
          <span className="font-medium text-text-primary">3. Enregistrement</span> — ligne
          immuable <code className="rounded bg-n-100 px-1 font-mono text-[11px]">Signature</code>{' '}
          en base, entrée piste d’audit, webhook <code className="rounded bg-n-100 px-1 font-mono text-[11px]">signature.created</code>.
        </p>
        <p>
          <span className="font-medium text-text-primary">4. Lecture</span> — visible dans la
          piste d’audit et le mode auditeur (lien partagé).
        </p>
        <p className="text-[11.5px] text-text-tertiary">
          Pas de certificat X.509 ni d’horodatage externe pour l’instant — signature « password
          meaning » côté serveur (<code className="font-mono">POST /api/signatures</code>).
        </p>
      </Card>
    </div>
  );
}

export function SettingsAiPage() {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <ProviderSettings />
    </Suspense>
  );
}

export function SettingsWebhooksPage() {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <WebhookSettings />
    </Suspense>
  );
}

export function SettingsIntegrationsPage() {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <IntegrationSettings />
    </Suspense>
  );
}

export function SettingsSsoPage() {
  return <SsoPanel />;
}

export function SettingsTeamPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { mode } = useAppMode();
  const isServerMode = mode === 'server';
  const { activeProject } = useApiProjects(isServerMode);
  const [showTeam, setShowTeam] = useState(true);

  if (!isAuthenticated) {
    return <p className="text-sm text-text-tertiary">{t('settings.teamServerOnly')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MigrateDataButton projectId={activeProject?.id} />
        <ShareAuditLink />
        <ShareSupplierLink />
      </div>
      <WorkspaceManager open={showTeam} onClose={() => setShowTeam(false)} />
      {!showTeam && (
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          onClick={() => setShowTeam(true)}
        >
          {t('auth.team')}
        </button>
      )}
    </div>
  );
}

export function SettingsImportExportPage() {
  const { t } = useTranslation();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">{t('settings.nav.importExport')}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <ImportExportBar />
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
        >
          <FileSpreadsheet className="size-4" />
          {t('import.title')}
        </button>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
        >
          <Download className="size-4" />
          {t('import.exportCsv')}
        </button>
      </div>
      <ImportWizard open={showImport} onClose={() => setShowImport(false)} />
      <ExportPanel open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

export function SettingsAuditTrailPage() {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden">
      <h3 className="text-[14px] font-semibold tracking-tight text-text-primary">
        {t('audit.title')}
      </h3>
      <Suspense fallback={<PanelSpinner />}>
        <AuditTrailViewer />
      </Suspense>
    </div>
  );
}
