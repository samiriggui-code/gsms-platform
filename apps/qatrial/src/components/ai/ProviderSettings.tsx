'use no memo';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useLLMStore } from '../../store/useLLMStore';
import type { LLMProvider, LLMPurpose } from '../../types';
import { ProviderFormDialog } from './ProviderFormDialog';
import {
  ALL_PURPOSES,
  PURPOSE_LABELS,
  PRESETS,
  emptyForm,
  type ProviderFormData,
} from './providerPresets';
import { Card } from '../hifi';

export function ProviderSettings() {
  const { t } = useTranslation();
  const providers = useLLMStore((s) => s.providers);
  const usage = useLLMStore((s) => s.usage);
  const addProvider = useLLMStore((s) => s.addProvider);
  const updateProvider = useLLMStore((s) => s.updateProvider);
  const removeProvider = useLLMStore((s) => s.removeProvider);
  const testConnection = useLLMStore((s) => s.testConnection);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderFormData>(emptyForm);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; latencyMs: number; error?: string }>
  >({});
  const [testing, setTesting] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setActivePreset(null);
    setModalOpen(true);
  }

  function openEdit(provider: LLMProvider) {
    setEditingId(provider.id);
    setForm({ ...provider });
    // Try to match to a preset for model dropdown
    const match = PRESETS.find((p) => p.baseUrl === provider.baseUrl);
    setActivePreset(match?.id ?? null);
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.model.trim()) return;

    if (editingId) {
      const { id: _unusedId, ...data } = form;
      void _unusedId;
      updateProvider(editingId, data);
    } else {
      const id =
        form.id.trim() ||
        form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
          '-' +
          Date.now().toString(36);
      addProvider({ ...form, id });
    }
    setModalOpen(false);
  }

  async function handleTest(id: string) {
    setTesting(id);
    const result = await testConnection(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
    setTesting(null);
  }

  function togglePurpose(purpose: LLMPurpose) {
    setForm((prev) => ({
      ...prev,
      purpose: prev.purpose.includes(purpose)
        ? prev.purpose.filter((p) => p !== purpose)
        : [...prev.purpose, purpose],
    }));
  }

  // Build purpose routing summary
  const purposeRouting: Record<string, string> = {};
  for (const purpose of ALL_PURPOSES) {
    const matching = providers
      .filter((p) => p.enabled && (p.purpose.includes(purpose) || p.purpose.includes('all')))
      .sort((a, b) => a.priority - b.priority);
    purposeRouting[purpose] = matching[0]?.name ?? '---';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('ai.providerSettings')}
        </h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-text-inverse bg-accent rounded-lg hover:bg-accent-hover transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('ai.addProvider')}
        </button>
      </div>

      {/* Provider list */}
      {providers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-secondary">{t('ai.noProvider')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => {
            const result = testResults[provider.id];
            const providerUsage = usage[provider.id];
            return (
              <Card
                key={provider.id}
                className="p-4 flex items-center gap-4"
              >
                {/* Status indicator */}
                <div className="shrink-0">
                  {result ? (
                    result.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger" />
                    )
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary truncate">
                      {provider.name}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-accent-subtle text-accent font-medium">
                      {provider.type}
                    </span>
                    {!provider.enabled && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-surface-tertiary text-text-tertiary">
                        disabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span className="font-mono">{provider.model}</span>
                    <span>
                      {provider.purpose.map((p) => PURPOSE_LABELS[p]).join(', ')}
                    </span>
                    {result?.ok && (
                      <span>{t('ai.avgLatency', { ms: result.latencyMs })}</span>
                    )}
                    {result && !result.ok && (
                      <span className="text-danger">{t('ai.unreachable')}</span>
                    )}
                  </div>
                </div>

                {/* Usage */}
                {providerUsage && (
                  <div className="text-xs text-text-tertiary text-right shrink-0">
                    <div>
                      {providerUsage.inputTokens.toLocaleString()} {t('ai.inputTokens')}
                    </div>
                    <div>
                      {providerUsage.outputTokens.toLocaleString()} {t('ai.outputTokens')}
                    </div>
                    <div>{providerUsage.calls} calls</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={testing === provider.id}
                    className="p-1.5 text-text-tertiary hover:text-accent rounded-lg hover:bg-accent-subtle transition-colors"
                  >
                    {testing === provider.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(provider)}
                    className="p-1.5 text-text-tertiary hover:text-accent rounded-lg hover:bg-accent-subtle transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeProvider(provider.id)}
                    className="p-1.5 text-text-tertiary hover:text-danger rounded-lg hover:bg-danger-subtle transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Purpose routing summary */}
      {providers.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-surface-tertiary border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              {t('ai.purposeRouting')}
            </h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {ALL_PURPOSES.map((purpose) => (
                <tr key={purpose} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-2 text-text-secondary font-medium">
                    {PURPOSE_LABELS[purpose]}
                  </td>
                  <td className="px-4 py-2 text-text-primary">
                    {purposeRouting[purpose]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Token usage summary */}
      {providers.length > 0 && Object.keys(usage).length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-surface-tertiary border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              {t('ai.tokenUsage')}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-semibold text-text-tertiary uppercase">
                  Provider
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-text-tertiary uppercase">
                  {t('ai.inputTokens')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-text-tertiary uppercase">
                  {t('ai.outputTokens')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-text-tertiary uppercase">
                  Calls
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(usage).map(([providerId, u]) => {
                const providerName =
                  providers.find((p) => p.id === providerId)?.name ?? providerId;
                return (
                  <tr key={providerId} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-2 text-text-primary">{providerName}</td>
                    <td className="px-4 py-2 text-text-secondary text-right font-mono">
                      {u.inputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-text-secondary text-right font-mono">
                      {u.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-text-secondary text-right font-mono">
                      {u.calls}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <ProviderFormDialog
          editingId={editingId}
          form={form}
          setForm={setForm}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          togglePurpose={togglePurpose}
        />
      )}
    </div>
  );
}
