import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check, XCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/apiClient';
import type { SapStatus } from './types';

interface SapIntegrationCardProps {
  status: SapStatus;
  loading: boolean;
  onStatusChange: () => void;
}

export function SapIntegrationCard({ status, loading, onStatusChange }: SapIntegrationCardProps) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState('');
  const [client, setClient] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [system, setSystem] = useState('PRD');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await apiFetch('/integrations/sap/connect', {
        method: 'POST',
        body: JSON.stringify({
          baseUrl,
          client,
          username,
          password,
          system,
        }),
      });
      onStatusChange();
      setBaseUrl('');
      setClient('');
      setUsername('');
      setPassword('');
      setSystem('PRD');
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{t('integrations.sapQm')}</span>
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
      </div>
      <div className="px-4 py-3">
        {status.connected ? (
          <div className="space-y-1 text-sm text-text-secondary">
            <p>{t('integrations.sapBaseUrl')}: <span className="font-medium text-text-primary">{status.baseUrl}</span></p>
            <p>{t('integrations.sapClient')}: <span className="font-medium text-text-primary">{status.client}</span></p>
            <p>{t('integrations.sapSystem')}: <span className="font-medium text-text-primary">{status.system}</span></p>
            {status.lastSyncAt && (
              <p>{t('integrations.lastSync', { date: new Date(status.lastSyncAt).toLocaleString() })}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.sapBaseUrl')}</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://sap-server.company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.sapClient')}</label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.sapSystem')}</label>
                <select
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="PRD">PRD (Production)</option>
                  <option value="QAS">QAS (Quality)</option>
                  <option value="DEV">DEV (Development)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.sapUsername')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="SAP_USER"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{t('integrations.sapPassword')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="********"
                />
              </div>
            </div>
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              onClick={connect}
              disabled={connecting || !baseUrl || !client || !username || !password}
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
