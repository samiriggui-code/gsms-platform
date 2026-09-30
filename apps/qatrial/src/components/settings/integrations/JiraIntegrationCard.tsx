import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check, XCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../../lib/apiClient';
import type { JiraStatus } from './types';

interface JiraIntegrationCardProps {
  status: JiraStatus;
  loading: boolean;
  onStatusChange: () => void;
}

export function JiraIntegrationCard({ status, loading, onStatusChange }: JiraIntegrationCardProps) {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await apiFetch('/integrations/jira/connect', {
        method: 'POST',
        body: JSON.stringify({
          baseUrl,
          email,
          apiToken,
          projectKey,
        }),
      });
      onStatusChange();
      setBaseUrl('');
      setEmail('');
      setApiToken('');
      setProjectKey('');
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await apiFetch('/integrations/jira/sync', { method: 'POST' });
      onStatusChange();
    } catch (err) {
      console.error('Jira sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{t('integrations.jira')}</span>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />
          ) : status.connected ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-md">
              <Check className="w-3 h-3" />
              {t('integrations.connected')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
              <XCircle className="w-3 h-3" />
              {t('integrations.disconnected')}
            </span>
          )}
        </div>
        {status.connected && (
          <button
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-accent bg-accent-subtle rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {t('integrations.syncNow')}
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        {status.connected ? (
          <div className="space-y-1 text-sm text-text-secondary">
            <p>Project: <span className="font-medium text-text-primary">{status.projectKey}</span></p>
            <p>URL: <span className="text-text-tertiary">{status.baseUrl}</span></p>
            {status.lastSyncAt && (
              <p>{t('integrations.lastSync', { date: new Date(status.lastSyncAt).toLocaleString() })}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.baseUrl')}</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://your-org.atlassian.net"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.projectKey')}</label>
                <input
                  type="text"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="PROJ"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.apiToken')}</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Jira API Token"
              />
            </div>
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              onClick={connect}
              disabled={connecting || !baseUrl || !email || !apiToken || !projectKey}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-gradient-start to-gradient-end rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('integrations.connect')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
