import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { useLLMStore } from '../../store/useLLMStore';
import { getProjectId } from '../../lib/projectUtils';
import { useProjectStore } from '../../store/useProjectStore';

type PolicyTitle = { id: string; name: string };

type GenResult = {
  draftMarkdown: string;
  policyTitle: string;
  model: string;
  document?: { id: string; title: string; status: string } | null;
};

export function PolicyGenerator({ onSaved }: { onSaved?: () => void }) {
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);
  const providers = useLLMStore((s) => s.providers);
  const getProviderForPurpose = useLLMStore((s) => s.getProviderForPurpose);
  const enabledProvider = getProviderForPurpose('all') ?? providers[0];

  const [titles, setTitles] = useState<PolicyTitle[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [siteOrClient, setSiteOrClient] = useState('');
  const [includeFindings, setIncludeFindings] = useState(true);
  const [saveDraft, setSaveDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ titles: PolicyTitle[] }>('/catalogs/policy-template-titles');
        if (!cancelled) setTitles(data.titles || []);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    if (!templateId && !titles.length) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let findings: Array<{ control_ref?: string; title: string; status?: string; description?: string }> =
        [];
      if (includeFindings && projectId) {
        try {
          const env = await apiFetch<{
            findings: Array<{
              control_ref: string;
              title: string;
              status: string;
              description?: string;
              remediation?: string;
            }>;
          }>(`/findings?projectId=${encodeURIComponent(projectId)}&limit=40`);
          findings = (env.findings || [])
            .filter((f) => f.status === 'conforme' || f.status === 'non_conforme' || f.status === 'en_cours')
            .map((f) => ({
              control_ref: f.control_ref,
              title: f.title,
              status: f.status,
              description: f.description,
              remediation: f.remediation,
            }));
        } catch {
          /* findings optional */
        }
      }

      const selected = titles.find((t) => t.id === templateId);
      const data = await apiFetch<GenResult>('/ai/policy/generate', {
        method: 'POST',
        body: JSON.stringify({
          policyTemplateId: templateId || undefined,
          policyTitle: selected?.name,
          siteOrClient: siteOrClient || undefined,
          findings,
          language: 'fr',
          saveDraft: saveDraft && Boolean(projectId),
          projectId: projectId || undefined,
          provider: enabledProvider
            ? {
                type: enabledProvider.type,
                baseUrl: enabledProvider.baseUrl,
                apiKey: enabledProvider.apiKey || 'ollama',
                model: enabledProvider.model,
                name: enabledProvider.name,
                id: enabledProvider.id,
              }
            : undefined,
        }),
      });
      setResult(data);
      if (data.document) onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Générer une politique (brouillon)</h3>
      </div>
      <p className="text-xs text-text-secondary">
        Sortie toujours marquée « brouillon à valider » — jamais publiée automatiquement. Préfère Ollama
        (Réglages → IA).
      </p>
      <select
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
      >
        <option value="">Choisir un modèle de politique…</option>
        {titles.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary"
        placeholder="Site / client (optionnel)"
        value={siteOrClient}
        onChange={(e) => setSiteOrClient(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={includeFindings} onChange={(e) => setIncludeFindings(e.target.checked)} />
        Inclure les findings du projet
      </label>
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={saveDraft} onChange={(e) => setSaveDraft(e.target.checked)} />
        Enregistrer comme document draft (type policy)
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!templateId || loading}
        onClick={generate}
        className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? 'Génération…' : 'Générer le brouillon'}
      </button>
      {result && (
        <div className="space-y-2">
          <p className="text-xs text-text-secondary">
            Modèle {result.model}
            {result.document ? ` · sauvé ${result.document.title} (${result.document.status})` : ''}
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs bg-surface border border-border rounded-lg p-3 text-text-primary">
            {result.draftMarkdown}
          </pre>
        </div>
      )}
    </div>
  );
}
