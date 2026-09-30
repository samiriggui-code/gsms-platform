import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { LLMProviderType, LLMPurpose } from '../../types';
import {
  ALL_PURPOSES,
  PRESETS,
  PURPOSE_LABELS,
  type ProviderFormData,
} from './providerPresets';

interface ProviderFormDialogProps {
  editingId: string | null;
  form: ProviderFormData;
  setForm: Dispatch<SetStateAction<ProviderFormData>>;
  activePreset: string | null;
  setActivePreset: Dispatch<SetStateAction<string | null>>;
  onSave: () => void;
  onClose: () => void;
  togglePurpose: (purpose: LLMPurpose) => void;
}

export function ProviderFormDialog({
  editingId,
  form,
  setForm,
  activePreset,
  setActivePreset,
  onSave,
  onClose,
  togglePurpose,
}: ProviderFormDialogProps) {
  const { t } = useTranslation();
  const currentPreset = activePreset ? PRESETS.find((p) => p.id === activePreset) ?? null : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      onClick={onClose}
    >
      <div
        className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">
            {editingId ? t('common.edit') : t('ai.addProvider')}
          </h3>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4 space-y-4">
          {/* Quick presets — only for new providers */}
          {!editingId && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Quick Setup
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        name: preset.name,
                        type: preset.type,
                        baseUrl: preset.baseUrl,
                        model: preset.defaultModel,
                        temperature: preset.temperature,
                        maxTokens: preset.maxTokens,
                      }));
                      setActivePreset(preset.id);
                    }}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-colors text-center ${
                      activePreset === preset.id
                        ? 'border-accent bg-accent-subtle text-accent'
                        : 'border-border bg-surface-tertiary text-text-secondary hover:border-accent/50'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              {activePreset && (
                <p className="text-[11px] text-text-tertiary mt-1.5">
                  {PRESETS.find((p) => p.id === activePreset)?.description}
                </p>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Claude Sonnet"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as LLMProviderType;
                setForm((f) => ({
                  ...f,
                  type,
                  baseUrl:
                    type === 'anthropic'
                      ? 'https://api.anthropic.com'
                      : f.baseUrl === 'https://api.anthropic.com'
                        ? ''
                        : f.baseUrl,
                }));
                setActivePreset(null);
              }}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai-compatible">OpenAI-compatible</option>
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
              placeholder={form.type === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors font-mono"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              API Key
              {currentPreset && !currentPreset.needsApiKey && (
                <span className="ml-2 text-[10px] text-text-tertiary font-normal">(not required for local)</span>
              )}
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              placeholder={currentPreset && !currentPreset.needsApiKey ? 'Not required' : 'sk-...'}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors font-mono"
            />
          </div>

          {/* Model — always free text; preset only suggests via datalist */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Model
            </label>
            <input
              type="text"
              list={currentPreset && currentPreset.models.length > 0 ? 'qatrial-model-suggestions' : undefined}
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              placeholder={
                currentPreset?.defaultModel
                  ?? (form.type === 'anthropic' ? 'claude-sonnet-4-20250514' : 'glm-5.3-flash')
              }
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors font-mono"
            />
            {currentPreset && currentPreset.models.length > 0 && (
              <>
                <datalist id="qatrial-model-suggestions">
                  {currentPreset.models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {currentPreset.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, model: m }))}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        form.model === m
                          ? 'border-accent bg-accent-subtle text-accent'
                          : 'border-border text-text-tertiary hover:border-accent/50 hover:text-text-secondary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Purposes (multi-select checkboxes) */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Purposes
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_PURPOSES.map((purpose) => (
                <label
                  key={purpose}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                    form.purpose.includes(purpose)
                      ? 'bg-accent-subtle text-accent border-accent/30'
                      : 'bg-surface-tertiary text-text-tertiary border-border hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.purpose.includes(purpose)}
                    onChange={() => togglePurpose(purpose)}
                    className="sr-only"
                  />
                  {PURPOSE_LABELS[purpose]}
                </label>
              ))}
            </div>
          </div>

          {/* Max tokens + Temperature row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxTokens: Number(e.target.value) }))
                }
                min={100}
                max={100000}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={form.temperature}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    temperature: Number(e.target.value),
                  }))
                }
                min={0}
                max={2}
                step={0.1}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Priority + Enabled row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Priority (lower = first)
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: Number(e.target.value) }))
                }
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-input-border text-accent focus:ring-accent/40"
                />
                <span className="text-sm text-text-primary">Enabled</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-text-secondary bg-surface-tertiary rounded-lg hover:bg-surface-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={!form.name.trim() || !form.model.trim()}
            className="px-4 py-1.5 text-sm text-text-inverse bg-accent rounded-lg hover:bg-accent-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
