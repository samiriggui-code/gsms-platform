import type { LLMProviderType, LLMPurpose } from '../../types';

export const ALL_PURPOSES: LLMPurpose[] = [
  'all',
  'test_generation',
  'gap_analysis',
  'risk_classification',
  'report_narrative',
  'requirement_decomp',
  'capa',
];

export const PURPOSE_LABELS: Record<LLMPurpose, string> = {
  all: 'All',
  test_generation: 'Test Generation',
  gap_analysis: 'Gap Analysis',
  risk_classification: 'Risk Classification',
  report_narrative: 'Report Narrative',
  requirement_decomp: 'Requirement Decomp',
  capa: 'CAPA',
};

export interface ProviderFormData {
  id: string;
  name: string;
  type: LLMProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  purpose: LLMPurpose[];
  maxTokens: number;
  temperature: number;
  priority: number;
  enabled: boolean;
}

export interface ProviderPreset {
  id: string;
  name: string;
  type: LLMProviderType;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  needsApiKey: boolean;
  description: string;
}

export const PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250506'],
    defaultModel: 'claude-sonnet-4-20250514',
    temperature: 0.2,
    maxTokens: 4096,
    needsApiKey: true,
    description: 'Claude models — best for regulatory precision and structured output',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultModel: 'gpt-4.1',
    temperature: 0.2,
    maxTokens: 4096,
    needsApiKey: true,
    description: 'GPT models — fast, widely supported',
  },
  {
    id: 'zai',
    name: 'Z.ai (GLM)',
    type: 'openai-compatible',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    models: [
      'glm-5.3-flash',
      'glm-5.3',
      'glm-5.2',
      'glm-5.1',
      'glm-5-turbo',
      'glm-5',
      'glm-4.7',
      'glm-4.6',
      'glm-4.5-air',
      'glm-4.5',
    ],
    defaultModel: 'glm-5.3-flash',
    temperature: 0.2,
    maxTokens: 4096,
    needsApiKey: true,
    description: 'Z.ai GLM models — Coding Plan endpoint (same lineup as Comp CRM)',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-4', 'anthropic/claude-haiku-4',
      'openai/gpt-4.1', 'openai/gpt-4o',
      'google/gemini-2.5-pro', 'google/gemini-2.5-flash',
      'meta-llama/llama-4-maverick',
      'deepseek/deepseek-r1',
      'qwen/qwen3-235b-a22b',
    ],
    defaultModel: 'anthropic/claude-sonnet-4',
    temperature: 0.2,
    maxTokens: 4096,
    needsApiKey: true,
    description: 'Unified API for 200+ models — pay per token, no subscriptions',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1:8b', 'llama3.1:70b', 'qwen2.5:14b', 'mistral:7b', 'gemma2:9b', 'deepseek-r1:14b'],
    defaultModel: 'llama3.1:8b',
    temperature: 0.3,
    maxTokens: 2048,
    needsApiKey: false,
    description: 'Run models locally — no API key needed, data stays on your machine',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    models: ['local-model'],
    defaultModel: 'local-model',
    temperature: 0.3,
    maxTokens: 2048,
    needsApiKey: false,
    description: 'LM Studio local server — use whatever model you have loaded',
  },
];

export const emptyForm: ProviderFormData = {
  id: '',
  name: '',
  type: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: '',
  purpose: ['all'],
  maxTokens: 4096,
  temperature: 0.2,
  priority: 1,
  enabled: true,
};
