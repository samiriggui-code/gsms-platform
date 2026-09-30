import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../lib/apiClient';
import { JiraIntegrationCard } from './integrations/JiraIntegrationCard';
import { GithubIntegrationCard } from './integrations/GithubIntegrationCard';
import { SapIntegrationCard } from './integrations/SapIntegrationCard';
import { LimsIntegrationCard } from './integrations/LimsIntegrationCard';
import type { JiraStatus, GithubStatus, SapStatus, LimsStatus } from './integrations/types';

export function IntegrationSettings() {
  const { t } = useTranslation();

  const [jiraStatus, setJiraStatus] = useState<JiraStatus>({ connected: false });
  const [jiraLoading, setJiraLoading] = useState(true);

  const [githubStatus, setGithubStatus] = useState<GithubStatus>({ connected: false });
  const [githubLoading, setGithubLoading] = useState(true);

  const [sapStatus, setSapStatus] = useState<SapStatus>({ connected: false });
  const [sapLoading, setSapLoading] = useState(true);

  const [limsStatus, setLimsStatus] = useState<LimsStatus>({ connected: false });
  const [limsLoading, setLimsLoading] = useState(true);

  const loadJiraStatus = useCallback(async () => {
    try {
      const data = await apiFetch<JiraStatus>('/integrations/jira/status');
      setJiraStatus(data);
    } catch {
      setJiraStatus({ connected: false });
    } finally {
      setJiraLoading(false);
    }
  }, []);

  const loadGithubStatus = useCallback(async () => {
    try {
      const data = await apiFetch<GithubStatus>('/integrations/github/status');
      setGithubStatus(data);
    } catch {
      setGithubStatus({ connected: false });
    } finally {
      setGithubLoading(false);
    }
  }, []);

  const loadSapStatus = useCallback(async () => {
    try {
      const data = await apiFetch<SapStatus>('/integrations/sap/status');
      setSapStatus(data);
    } catch {
      setSapStatus({ connected: false });
    } finally {
      setSapLoading(false);
    }
  }, []);

  const loadLimsStatus = useCallback(async () => {
    try {
      const data = await apiFetch<LimsStatus>('/integrations/lims/status');
      setLimsStatus(data);
    } catch {
      setLimsStatus({ connected: false });
    } finally {
      setLimsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJiraStatus();
    loadGithubStatus();
    loadSapStatus();
    loadLimsStatus();
  }, [loadJiraStatus, loadGithubStatus, loadSapStatus, loadLimsStatus]);

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-text-primary">{t('integrations.title')}</h3>

      <JiraIntegrationCard
        status={jiraStatus}
        loading={jiraLoading}
        onStatusChange={loadJiraStatus}
      />
      <GithubIntegrationCard
        status={githubStatus}
        loading={githubLoading}
        onStatusChange={loadGithubStatus}
      />
      <SapIntegrationCard
        status={sapStatus}
        loading={sapLoading}
        onStatusChange={loadSapStatus}
      />
      <LimsIntegrationCard
        status={limsStatus}
        loading={limsLoading}
        onStatusChange={loadLimsStatus}
      />
    </div>
  );
}
