'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { fetchWithCsrf } from '@/lib/api';
import { 
  RefreshCw, 
  Check, 
  X, 
  Cpu,
  SlidersHorizontal,
  AlertTriangle,
  Trash2,
  Plus,
  KeyRound,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Activity,
  Zap,
  Bot,
  MessageSquare,
  FileText,
  HeartHandshake,
  Database,
  Send,
  Search,
  Key,
  Sliders,
  Workflow,
  ExternalLink,
  ShieldAlert,
  Gauge,
  Clock,
  Layers,
  Lock,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import CustomSelect from '@/components/ui/CustomSelect';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
  custom?: boolean;
}

interface ProviderConfig {
  enabled: boolean;
  models: ModelItem[];
}

interface MaskedKeyInfo {
  has_key: boolean;
  preview: string;
}

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface FeatureRoute {
  provider: string;
  model: string;
}

export interface AiSafeguardsConfig {
  rate_limit_per_minute_tenant: number;
  rate_limit_per_minute_contact: number;
  copilot_rate_limit_per_minute?: number;
  max_input_tokens: number;
  max_output_tokens: number;
  copilot_max_input_tokens?: number;
  copilot_max_output_tokens?: number;
  monthly_platform_safety_cap: number;
  on_limit_breached_action: 'block_fallback' | 'simulate_mock';
  fallback_message: string;
}

interface PlatformUsageStats {
  month_tokens_used: number;
  month_estimated_cost: number;
}

const defaultSafeguards: AiSafeguardsConfig = {
  rate_limit_per_minute_tenant: 30,
  rate_limit_per_minute_contact: 10,
  copilot_rate_limit_per_minute: 20,
  max_input_tokens: 2500,
  max_output_tokens: 500,
  copilot_max_input_tokens: 12000,
  copilot_max_output_tokens: 2048,
  monthly_platform_safety_cap: 10000000,
  on_limit_breached_action: 'block_fallback',
  fallback_message: 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
};

type OperationalModel = 'byok' | 'master_fixed';

export default function AiProvidersPage() {
  const t = useTranslations('Superadmin');

  // Core configuration states
  const [operationalModel, setOperationalModel] = useState<OperationalModel>('byok');
  const [aiConfig, setAiConfig] = useState<Record<string, ProviderConfig>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, MaskedKeyInfo>>({});
  const [featureRouting, setFeatureRouting] = useState<Record<string, FeatureRoute>>({});
  const [featuresList, setFeaturesList] = useState<FeatureItem[]>([]);
  const [safeguardsConfig, setSafeguardsConfig] = useState<AiSafeguardsConfig>(defaultSafeguards);
  const [platformStats, setPlatformStats] = useState<PlatformUsageStats>({ month_tokens_used: 0, month_estimated_cost: 0 });

  // Tab State for Master Fixed mode: 'providers' | 'routing' | 'safeguards'
  const [activeTab, setActiveTab] = useState<'providers' | 'routing' | 'safeguards'>('providers');
  const [hasUnsavedRoutingChanges, setHasUnsavedRoutingChanges] = useState<boolean>(false);
  const [hasUnsavedSafeguardsChanges, setHasUnsavedSafeguardsChanges] = useState<boolean>(false);

  // Key inputs state
  const [inputKeys, setInputKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // 1. Dedicated Configure Dialog (Initial setup when not configured)
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [configureProviderId, setConfigureProviderId] = useState<string | null>(null);
  const [configureApiKey, setConfigureApiKey] = useState('');
  const [configureShowKey, setConfigureShowKey] = useState(false);

  // 2. Dedicated Manage Dialog (When configured in Master modes)
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageProviderId, setManageProviderId] = useState<string | null>(null);
  const [manageApiKey, setManageApiKey] = useState('');
  const [manageShowKey, setManageShowKey] = useState(false);

  // 3. Dedicated Models Modal (For BYOK Mode)
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);
  const [modelsModalProviderId, setModelsModalProviderId] = useState<string | null>(null);
  const [newModelId, setNewModelModelId] = useState('');

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'provider' | 'model' | 'deleteModel' | 'disconnect'>('provider');
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');
  const [confirmActionType, setConfirmActionType] = useState<'enable' | 'disable'>('enable');

  // Operational model switch confirmation dialog state
  const [isOpModelConfirmOpen, setIsOpModelConfirmOpen] = useState(false);
  const [targetOpModel, setTargetOpModel] = useState<OperationalModel | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCsrf('/admin/ai-providers');
      if (response.ok) {
        const data = await response.json();
        setOperationalModel(data.operational_model || 'byok');
        setAiConfig(data.ai_providers_config || {});
        setMaskedKeys(data.ai_providers_keys || {});
        setFeatureRouting(data.ai_feature_routing || {});
        setFeaturesList(data.features_list || []);
        if (data.ai_safeguards_config) {
          setSafeguardsConfig(data.ai_safeguards_config);
        }
        if (data.platform_usage_stats) {
          setPlatformStats(data.platform_usage_stats);
        }
        setHasUnsavedRoutingChanges(false);
        setHasUnsavedSafeguardsChanges(false);
      }
    } catch {
      toast.error(t('ai.saveFailed') || 'Failed to load AI settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveAllSettings = async (
    updatedModel = operationalModel,
    updatedConfig = aiConfig,
    updatedKeys = inputKeys,
    updatedRouting = featureRouting,
    updatedSafeguards = safeguardsConfig
  ) => {
    setSaving(true);
    try {
      const response = await fetchWithCsrf('/admin/ai-providers', {
        method: 'PUT',
        body: JSON.stringify({
          operational_model: updatedModel,
          ai_providers_config: updatedConfig,
          ai_providers_keys: updatedKeys,
          ai_feature_routing: updatedRouting,
          ai_safeguards_config: updatedSafeguards,
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        toast.success(t('ai.saveSuccess') || data.message || 'AI configuration saved successfully.');
        setOperationalModel(data.operational_model || 'byok');
        setAiConfig(data.ai_providers_config || {});
        setMaskedKeys(data.ai_providers_keys || {});
        setFeatureRouting(data.ai_feature_routing || {});
        setFeaturesList(data.features_list || []);
        if (data.ai_safeguards_config) {
          setSafeguardsConfig(data.ai_safeguards_config);
        }
        if (data.platform_usage_stats) {
          setPlatformStats(data.platform_usage_stats);
        }
        setInputKeys({});
        setHasUnsavedRoutingChanges(false);
        setHasUnsavedSafeguardsChanges(false);
      } else {
        const errorMsg = data?.message || data?.error || (data?.errors ? Object.values(data.errors).flat().join(', ') : null);
        throw new Error(errorMsg || t('ai.saveFailed') || 'Failed to save AI configuration.');
      }
    } catch (err: any) {
      toast.error(err?.message || t('ai.saveFailed') || 'Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Prompt confirmation when switching operational model
  const handleOperationalModelCardClick = (model: OperationalModel) => {
    if (model === operationalModel) return;
    setTargetOpModel(model);
    setIsOpModelConfirmOpen(true);
  };

  const handleConfirmOpModelSwitch = async () => {
    if (!targetOpModel) return;
    const nextModel = targetOpModel;
    setIsOpModelConfirmOpen(false);
    setOperationalModel(nextModel);
    await handleSaveAllSettings(nextModel, aiConfig, inputKeys, featureRouting);
  };

  // Test Provider API Key Connection Live
  const handleTestKeyConnection = async (providerId: string, customKey?: string) => {
    setTestingProviderId(providerId);
    try {
      const isMasked = customKey && (customKey.includes('••••') || customKey === '••••••••••••••••••••••••');
      const payload: Record<string, any> = { provider: providerId };
      if (!isMasked && customKey && customKey.trim()) {
        payload.api_key = customKey.trim();
      }

      const response = await fetchWithCsrf('/admin/ai-providers/test-key', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message || t('ai.testConnectionSuccess') || 'Connection successful! Master API key is active and authorized.');
      } else {
        toast.error(data.message || t('ai.testConnectionFailed') || 'Connection test failed.');
      }
    } catch (err: any) {
      toast.error(err?.message || t('ai.testConnectionFailed') || 'Connection test failed.');
    } finally {
      setTestingProviderId(null);
    }
  };

  // Open Configure Modal (for Unconfigured Provider)
  const handleOpenConfigureDialog = (providerId: string) => {
    setConfigureProviderId(providerId);
    setConfigureApiKey('');
    setConfigureShowKey(false);
    setIsConfigureOpen(true);
  };

  // Save Configure Modal
  const handleSaveConfigureDialog = async () => {
    if (!configureProviderId) return;
    if (!configureApiKey.trim()) {
      toast.warning(t('ai.invalidApiKey') || 'Please provide a valid API Key.');
      return;
    }

    const updatedKeys = { ...inputKeys, [configureProviderId]: configureApiKey.trim() };
    const updatedConfig = { ...aiConfig };
    if (!updatedConfig[configureProviderId]) {
      updatedConfig[configureProviderId] = { enabled: true, models: [] };
    } else {
      updatedConfig[configureProviderId].enabled = true;
    }

    await handleSaveAllSettings(operationalModel, updatedConfig, updatedKeys, featureRouting);
    setIsConfigureOpen(false);
  };

  // Open Manage Modal (for Configured Provider)
  const handleOpenManageDialog = (providerId: string) => {
    setManageProviderId(providerId);
    setManageApiKey('••••••••••••••••••••••••');
    setManageShowKey(false);
    setNewModelModelId('');
    setIsManageOpen(true);
  };

  // Save Manage Modal
  const handleSaveManageDialog = async () => {
    if (!manageProviderId) return;

    const updatedKeys = { ...inputKeys };
    if (manageApiKey.trim() && manageApiKey !== '••••••••••••••••••••••••') {
      updatedKeys[manageProviderId] = manageApiKey.trim();
    }

    await handleSaveAllSettings(operationalModel, aiConfig, updatedKeys, featureRouting);
    setIsManageOpen(false);
  };

  // Disconnect Provider
  const handleDisconnectProviderClick = (providerId: string, providerName: string) => {
    setIsManageOpen(false);
    setConfirmType('disconnect');
    setConfirmTargetId(providerId);
    setConfirmTargetName(providerName);
    setIsConfirmOpen(true);
  };

  // Helper to check if a provider is fully usable (configured with API key & enabled in master modes)
  const isProviderUsable = (providerId: string) => {
    const isEnabled = !!aiConfig[providerId]?.enabled;
    if (operationalModel === 'byok') {
      return isEnabled;
    }
    const isConfigured = !!maskedKeys[providerId]?.has_key;
    return isConfigured && isEnabled;
  };

  // Feature routing change
  const handleFeatureRouteChange = (featureId: string, field: 'provider' | 'model', value: string) => {
    const updated = { ...featureRouting };
    const usableProviders = providersList.filter(p => isProviderUsable(p.id));
    const fallbackProvider = usableProviders[0]?.id || 'groq';
    const current = updated[featureId] || { provider: fallbackProvider, model: '' };

    if (field === 'provider') {
      const providerModels = (aiConfig[value]?.models || []).filter(m => m.enabled);
      const defaultModel = providerModels[0]?.id || '';
      updated[featureId] = { provider: value, model: defaultModel };
    } else {
      updated[featureId] = { ...current, model: value };
    }

    setFeatureRouting(updated);
    setHasUnsavedRoutingChanges(true);
  };

  // Save Feature Matrix ensuring only usable providers & models are persisted
  const handleSaveFeatureMatrix = async () => {
    const resolvedRouting: Record<string, FeatureRoute> = {};
    const usableProviders = providersList.filter(p => isProviderUsable(p.id));
    const fallbackProvider = usableProviders[0]?.id || '';

    featuresList.forEach(f => {
      const current = featureRouting[f.id];
      const prov = (current?.provider && isProviderUsable(current.provider)) ? current.provider : fallbackProvider;
      const provModels = prov ? (aiConfig[prov]?.models || []).filter(m => m.enabled) : [];
      const mod = (current?.model && provModels.some(m => m.id === current.model)) ? current.model : (provModels[0]?.id || '');

      resolvedRouting[f.id] = { provider: prov, model: mod };
    });

    setFeatureRouting(resolvedRouting);
    await handleSaveAllSettings(operationalModel, aiConfig, inputKeys, resolvedRouting);
    setHasUnsavedRoutingChanges(false);
  };

  // Provider Toggles
  const handleProviderToggleClick = (id: string, name: string) => {
    const isCurrentlyEnabled = !!aiConfig[id]?.enabled;
    setConfirmType('provider');
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmActionType(isCurrentlyEnabled ? 'disable' : 'enable');
    setIsConfirmOpen(true);
  };

  // Model Toggles (inline instant toggle)
  const handleModelToggleClick = (providerId: string, modelId: string) => {
    const updated = { ...aiConfig };
    const provider = updated[providerId];
    if (provider) {
      provider.models = provider.models.map(m => {
        if (m.id === modelId) {
          return { ...m, enabled: !m.enabled };
        }
        return m;
      });
      setAiConfig(updated);
      handleSaveAllSettings(operationalModel, updated, inputKeys, featureRouting);
    }
  };

  // Custom Model Delete
  const handleModelDeleteClick = (providerId: string, modelId: string, modelName: string) => {
    setIsManageOpen(false);
    setIsModelsModalOpen(false);
    setConfirmType('deleteModel');
    setModelsModalProviderId(providerId);
    setConfirmTargetId(modelId);
    setConfirmTargetName(modelName);
    setIsConfirmOpen(true);
  };

  // Confirmation actions
  const handleConfirmAction = () => {
    if (!confirmTargetId) return;

    if (confirmType === 'disconnect') {
      const updatedKeys = { ...inputKeys, [confirmTargetId]: '' };
      const updatedConfig = { ...aiConfig };
      if (updatedConfig[confirmTargetId]) {
        updatedConfig[confirmTargetId].enabled = false;
      }
      setAiConfig(updatedConfig);
      handleSaveAllSettings(operationalModel, updatedConfig, updatedKeys, featureRouting);
      setIsManageOpen(false);
      toast.success((t('ai.toastDisconnected') || '{target} disconnected successfully.').replace('{target}', confirmTargetName));
    } else if (confirmType === 'provider') {
      const updated = { ...aiConfig };
      if (!updated[confirmTargetId]) {
        updated[confirmTargetId] = { enabled: false, models: [] };
      }
      updated[confirmTargetId].enabled = confirmActionType === 'enable';
      setAiConfig(updated);
      handleSaveAllSettings(operationalModel, updated, inputKeys, featureRouting);
    } else if (confirmType === 'model' && modelsModalProviderId) {
      const updated = { ...aiConfig };
      const provider = updated[modelsModalProviderId];
      if (provider) {
        provider.models = provider.models.map(m => {
          if (m.id === confirmTargetId) {
            return { ...m, enabled: confirmActionType === 'enable' };
          }
          return m;
        });
      }
      setAiConfig(updated);
      handleSaveAllSettings(operationalModel, updated, inputKeys, featureRouting);
    } else if (confirmType === 'deleteModel' && modelsModalProviderId) {
      const updated = { ...aiConfig };
      const provider = updated[modelsModalProviderId];
      if (provider) {
        provider.models = provider.models.filter(m => m.id !== confirmTargetId);
        toast.success(t('ai.deleteModelSuccess') || 'Model removed.');
      }
      setAiConfig(updated);
      handleSaveAllSettings(operationalModel, updated, inputKeys, featureRouting);
    }

    setIsConfirmOpen(false);
  };

  // Manage Models Modal (BYOK Mode)
  const handleOpenModelsModal = (providerId: string) => {
    setModelsModalProviderId(providerId);
    setNewModelModelId('');
    setIsModelsModalOpen(true);
  };

  const handleAddCustomModelToProvider = (providerId: string) => {
    if (!providerId || !newModelId.trim()) return;

    const updated = { ...aiConfig };
    const provider = updated[providerId];
    
    if (provider) {
      if (provider.models.some(m => m.id.toLowerCase() === newModelId.trim().toLowerCase())) {
        toast.error(t('ai.modelExists') || 'Model already registered.');
        return;
      }

      const newModel: ModelItem = {
        id: newModelId.trim(),
        name: newModelId.trim(),
        enabled: true,
        custom: true
      };

      provider.models = [...provider.models, newModel];
      setAiConfig(updated);
      setNewModelModelId('');
      handleSaveAllSettings(operationalModel, updated, inputKeys, featureRouting, safeguardsConfig);
    }
  };

  const handleSaveSafeguards = async () => {
    await handleSaveAllSettings(
      operationalModel,
      aiConfig,
      inputKeys,
      featureRouting,
      safeguardsConfig
    );
  };

  if (loading) {
    return <SimpleLoader message={t('ai.loading') || 'Loading AI configuration...'} />;
  }

  const providersList = [
    { id: 'openai', label: 'OpenAI', desc: t('ai.openaiDesc') || 'Industry standard models like GPT-4o, GPT-4o-mini', logo: '/ai-providers/openai.svg', website: 'https://platform.openai.com/api-keys' },
    { id: 'anthropic', label: 'Anthropic Claude', desc: t('ai.anthropicDesc') || 'Advanced reasoning models like Claude 3.7 Sonnet & Haiku', logo: '/ai-providers/anthropic.png', website: 'https://console.anthropic.com/settings/keys' },
    { id: 'gemini', label: 'Google Gemini', desc: t('ai.geminiDesc') || 'Google multimodal models including Gemini 2.0 Flash & 1.5 Pro', logo: '/ai-providers/gemini.webp', website: 'https://aistudio.google.com/app/apikey' },
    { id: 'groq', label: 'Groq LPU', desc: t('ai.groqDesc') || 'Ultra-fast inference engine for open models like Llama 3.3 & Qwen', logo: '/ai-providers/groq.webp', website: 'https://console.groq.com/keys' },
    { id: 'deepseek', label: 'DeepSeek', desc: t('ai.deepseekDesc') || 'High-efficiency open models including DeepSeek Chat V3 & R1', logo: '/ai-providers/deepseek.png', website: 'https://platform.deepseek.com/api_keys' },
    { id: 'xai', label: 'xAI Grok', desc: t('ai.xaiDesc') || 'Elon Musk xAI Grok intelligence models', logo: '/ai-providers/xai.png', website: 'https://console.x.ai/' },
    { id: 'mistral', label: 'Mistral AI', desc: t('ai.mistralDesc') || 'European open models like Mistral Large 2 & Codestral', logo: '/ai-providers/mistral.png', website: 'https://console.mistral.ai/api-keys/' },
    { id: 'openrouter', label: 'OpenRouter', desc: t('ai.openrouterDesc') || 'Unified OpenRouter multihost routing gateway', logo: '/ai-providers/openrouter.webp', website: 'https://openrouter.ai/keys' },
  ];

  const activeConfigureProvInfo = providersList.find(p => p.id === configureProviderId);
  const activeManageProvInfo = providersList.find(p => p.id === manageProviderId);
  const activeModelsProvInfo = providersList.find(p => p.id === modelsModalProviderId);
  const confirmTargetProvInfo = providersList.find(p => p.id === (confirmType === 'provider' || confirmType === 'disconnect' ? confirmTargetId : modelsModalProviderId));

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Conversational AI': return t('ai.catConversational') || 'Conversational AI';
      case 'Visual Flows': return t('ai.catVisualFlows') || 'Visual Flows';
      case 'Knowledge Base': return t('ai.catKnowledgeBase') || 'Knowledge Base';
      default: return category;
    }
  };

  // Category Icon Map for Feature Routing
  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case 'copilot': return <Sparkles className="h-4 w-4 text-emerald-600" />;
      case 'ai_chatbot': return <Bot className="h-4 w-4 text-emerald-600" />;
      case 'flow_ai_prompt': return <Bot className="h-4 w-4 text-blue-600" />;
      case 'flow_ai_condition': return <SlidersHorizontal className="h-4 w-4 text-purple-600" />;
      case 'knowledge_base_rag': return <Search className="h-4 w-4 text-amber-600" />;
      default: return <Cpu className="h-4 w-4 text-zinc-600" />;
    }
  };

  const isByokMode = operationalModel === 'byok';
  const isMasterFixed = operationalModel === 'master_fixed';

  return (
    <div className="w-full bg-white select-none text-black animate-fade-in font-sans p-8 space-y-8 flex-1 overflow-y-auto">
      
      {/* 1. OPERATIONAL MODEL SELECTION */}
      <div className="space-y-3">
        <div className="select-none text-left">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            {t('ai.operationalArchitecture') || 'Operational Architecture'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Option 1: BYOK */}
          <div
            onClick={() => handleOperationalModelCardClick('byok')}
            className={`p-4.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
              operationalModel === 'byok'
                ? 'border-zinc-950 bg-white shadow-3xs'
                : 'border-[#E8E8E6] bg-white hover:border-zinc-300 hover:bg-neutral-50/40 shadow-3xs'
            }`}
          >
            <div className="space-y-2.5">
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    operationalModel === 'byok'
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 border border-zinc-200/80 text-zinc-700'
                  }`}>
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-950 tracking-tight block">
                      {t('ai.byokTitle') || 'BYOK (Bring Your Own Key)'}
                    </h3>
                    <span className="text-[10px] font-medium text-zinc-400">
                      {t('ai.byokSubtitle') || 'Decentralized Key Architecture'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-all ${
                    operationalModel === 'byok'
                      ? 'bg-zinc-950 text-white'
                      : 'border border-zinc-300 bg-white group-hover:border-zinc-400'
                  }`}>
                    {operationalModel === 'byok' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-zinc-500 font-normal leading-relaxed text-left">
                {t('ai.byokDesc') || 'Tenants provide and manage their own LLM API keys directly in workspace settings. Platform incurs zero central LLM cost with isolated tenant billing.'}
              </p>
            </div>

            {/* Feature Capability Tags */}
            <div className="mt-3.5 pt-2.5 border-t border-[#F0F0F0] flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.byokTagCost') || 'Zero Central Cost'}
              </span>
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.byokTagManaged') || 'Tenant Self-Managed'}
              </span>
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.byokTagBilling') || 'Direct Provider Billing'}
              </span>
            </div>
          </div>

          {/* Option 2: Master Fixed */}
          <div
            onClick={() => handleOperationalModelCardClick('master_fixed')}
            className={`p-4.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
              operationalModel === 'master_fixed'
                ? 'border-zinc-950 bg-white shadow-3xs'
                : 'border-[#E8E8E6] bg-white hover:border-zinc-300 hover:bg-neutral-50/40 shadow-3xs'
            }`}
          >
            <div className="space-y-2.5">
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    operationalModel === 'master_fixed'
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 border border-zinc-200/80 text-zinc-700'
                  }`}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-950 tracking-tight block">
                      {t('ai.masterFixedTitle') || 'Master Fixed (Centrally Routed)'}
                    </h3>
                    <span className="text-[10px] font-medium text-zinc-400">
                      {t('ai.masterFixedSubtitle') || 'Unified Superadmin Architecture'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-all ${
                    operationalModel === 'master_fixed'
                      ? 'bg-zinc-950 text-white'
                      : 'border border-zinc-300 bg-white group-hover:border-zinc-400'
                  }`}>
                    {operationalModel === 'master_fixed' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-zinc-500 font-normal leading-relaxed text-left">
                {t('ai.masterFixedDesc') || 'Superadmin provides centralized API keys and configures global model routing for Chatbot, Flow Prompts, and RAG with built-in token safeguards.'}
              </p>
            </div>

            {/* Feature Capability Tags */}
            <div className="mt-3.5 pt-2.5 border-t border-[#F0F0F0] flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.masterFixedTagTurnkey') || 'Turnkey AI Experience'}
              </span>
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.masterFixedTagMatrix') || 'Feature Routing Matrix'}
              </span>
              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-zinc-100/80 border border-zinc-200/50 text-zinc-600">
                {t('ai.masterFixedTagQuotas') || 'Central Quotas & Limits'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. TAB BAR & ACTIONS HEADER (Rendered in Master Fixed Mode) */}
      {isMasterFixed && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E6] pb-4">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'providers'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Key className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('ai.tabProviders') || 'AI Providers & Keys'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('routing')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'routing'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('ai.tabRouting') || 'AI Feature Routing'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('safeguards')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'safeguards'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('ai.tabSafeguards') || 'Safeguards & Limits'}</span>
            </button>
          </div>

          {/* Action Buttons for AI Settings & Safeguards */}
          {activeTab === 'routing' && (
            <div className="flex items-center gap-3">
              {hasUnsavedRoutingChanges && (
                <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveFeatureMatrix}
                disabled={saving}
                className="h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-3xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>{t('ai.saveRouting') || 'Save Routing Matrix'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'safeguards' && (
            <div className="flex items-center gap-3">
              {hasUnsavedSafeguardsChanges && (
                <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveSafeguards}
                disabled={saving}
                className="h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-3xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>{t('ai.saveSafeguards') || 'Save Safeguards & Limits'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. AI PROVIDERS TABLE */}
      {(!isMasterFixed || activeTab === 'providers') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between select-none">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
              {isByokMode ? (t('ai.providersHeaderByok') || 'AI Providers') : (t('ai.providersHeaderMaster') || 'Master AI Providers & API Key Vault')}
            </span>
          </div>

          <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-[var(--shadow-card)] divide-y divide-[#E8E8E6]">
            {providersList.map((prov) => {
              const keyInfo = maskedKeys[prov.id];
              const isConfigured = !isByokMode ? !!keyInfo?.has_key : true;
              const isEnabled = isConfigured && !!aiConfig[prov.id]?.enabled;
              const enabledModelsCount = aiConfig[prov.id]?.models?.filter(m => m.enabled).length || 0;

              return (
                <div 
                  key={prov.id} 
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#FAFAFA]/45 transition-colors ${
                    !isConfigured ? 'opacity-85' : ''
                  }`}
                >
                  {/* Logo / Provider Info */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="h-11 w-11 rounded-lg border border-[#E8E8E6] bg-white flex items-center justify-center shrink-0 p-2 select-none">
                      <Image 
                        src={prov.logo} 
                        alt={prov.label} 
                        width={28} 
                        height={28} 
                        className="object-contain max-h-7 w-auto select-none" 
                      />
                    </div>
                    
                    <div className="text-left">
                      <span className="text-xs font-bold text-zinc-955 block">{prov.label}</span>
                      <span className="text-[10px] text-zinc-450 font-semibold block mt-0.5">{prov.desc}</span>
                    </div>
                  </div>

                  {/* Actions: Consistent Outlined Button & Switch */}
                  <div className="flex items-center gap-3 select-none shrink-0">
                    {isByokMode ? (
                      /* BYOK Mode Actions: Outlined Models Button + Switch */
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenModelsModal(prov.id)}
                          className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        >
                          <SlidersHorizontal className="h-3 w-3 text-zinc-500" />
                          <span>{t('ai.btnModels') || 'Models'} ({enabledModelsCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProviderToggleClick(prov.id, prov.label)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                            isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                          }`}
                          aria-label={`Toggle ${prov.label}`}
                        >
                          <div 
                            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} 
                          />
                        </button>
                      </>
                    ) : isConfigured ? (
                      /* Master Mode (Configured): Outlined Manage Button + Active Switch */
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenManageDialog(prov.id)}
                          className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        >
                          <SlidersHorizontal className="h-3 w-3 text-zinc-500" />
                          <span>{t('ai.btnManage') || 'Manage'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProviderToggleClick(prov.id, prov.label)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                            isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                          }`}
                          aria-label={`Toggle ${prov.label}`}
                        >
                          <div 
                            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} 
                          />
                        </button>
                      </>
                    ) : (
                      /* Master Mode (Not Configured): Outlined Configure Button + Disabled Switch */
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenConfigureDialog(prov.id)}
                          className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        >
                          <KeyRound className="h-3 w-3 text-zinc-500" />
                          <span>{t('ai.btnConfigure') || 'Configure'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            toast.info((t('ai.toastConfigureFirst') || 'Please configure the API Key for {provider} first.').replace('{provider}', prov.label));
                            handleOpenConfigureDialog(prov.id);
                          }}
                          className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none bg-zinc-100 cursor-not-allowed opacity-50"
                          aria-label={`${prov.label} not configured`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full shadow-md transform translate-x-0" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. GRANULAR AI FEATURE ROUTING MATRIX (Rendered when Master Fixed & Tab = 'routing') */}
      {isMasterFixed && activeTab === 'routing' && (() => {
        const usableProviders = providersList.filter(p => isProviderUsable(p.id));

        return (
          <div className="space-y-4 animate-fade-in">
            {usableProviders.length === 0 ? (
              <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-4 select-none">
                <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-zinc-950">
                    {t('ai.noProvidersTitle') || 'No AI Providers Configured & Enabled'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                    {t('ai.noProvidersDesc') || 'Please configure the master API Key and enable at least one AI provider in the AI Providers & Keys tab before assigning feature routes.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className="mt-4 h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] shadow-3xs cursor-pointer"
                >
                  <span>{t('ai.btnConfigureMaster') || 'Configure Master Providers →'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-0.5 select-none text-left">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    {t('ai.routingTitle') || 'Centralized AI Intelligence Routing (Master Fixed)'}
                  </span>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    {t('ai.routingDesc') || 'Centrally assign configured and enabled platform AI providers and models across all workspace features.'}
                  </p>
                </div>

                {/* Single Unified Clean Master Table */}
                <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-[#E8E8E6] rounded-t-xl text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                        <th className="p-4 w-[40%]">{t('ai.thCapability') || 'Platform Capability'}</th>
                        <th className="p-4 w-[20%]">{t('ai.thCategory') || 'Category'}</th>
                        <th className="p-4 w-[20%]">{t('ai.thProvider') || 'Assigned AI Provider'}</th>
                        <th className="p-4 w-[20%]">{t('ai.thModel') || 'Assigned AI Model'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-750">
                      {featuresList.map((feature) => {
                        const currentRoute = featureRouting[feature.id];
                        
                        const assignedProvider = (currentRoute?.provider && isProviderUsable(currentRoute.provider))
                          ? currentRoute.provider
                          : usableProviders[0].id;
                        
                        const availableModels = (aiConfig[assignedProvider]?.models || []).filter(m => m.enabled === true);

                        const assignedModel = (currentRoute?.model && availableModels.some(m => m.id === currentRoute.model))
                          ? currentRoute.model
                          : (availableModels[0]?.id || '');

                        const getCategoryIcon = (category: string) => {
                          switch (category) {
                            case 'Conversational AI': return <Bot className="h-3.5 w-3.5 text-zinc-500" />;
                            case 'Visual Flows': return <Workflow className="h-3.5 w-3.5 text-zinc-500" />;
                            case 'Knowledge Base': return <Database className="h-3.5 w-3.5 text-zinc-500" />;
                            default: return <Sparkles className="h-3.5 w-3.5 text-zinc-500" />;
                          }
                        };

                        return (
                          <tr key={feature.id} className="hover:bg-neutral-50/40 transition-colors">
                            {/* Feature Info */}
                            <td className="p-4 align-middle">
                              <div className="space-y-0.5 text-left">
                                <span className="text-xs font-bold text-zinc-950 block">{feature.name}</span>
                                <p className="text-[11px] text-zinc-500 font-normal leading-relaxed max-w-sm">
                                  {feature.description}
                                </p>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-1.5 text-zinc-600 text-[11px] font-medium select-none">
                                {getCategoryIcon(feature.category)}
                                <span>{getCategoryLabel(feature.category)}</span>
                              </div>
                            </td>

                            {/* Provider Dropdown with Brand Logo */}
                            <td className="p-4 align-middle">
                              <div className="w-44 text-left">
                                <DropdownSelect
                                  value={assignedProvider}
                                  onChange={(val) => handleFeatureRouteChange(feature.id, 'provider', String(val))}
                                  options={usableProviders.map(p => ({
                                    value: p.id,
                                    label: p.label,
                                    icon: (
                                      <img 
                                        src={p.logo} 
                                        alt={p.label} 
                                        className="h-3.5 w-3.5 object-contain"
                                      />
                                    ),
                                  }))}
                                />
                              </div>
                            </td>

                            {/* Model Dropdown */}
                            <td className="p-4 align-middle">
                              <div className="w-52 text-left">
                                <DropdownSelect
                                  value={assignedModel}
                                  onChange={(val) => handleFeatureRouteChange(feature.id, 'model', String(val))}
                                  options={availableModels.map(m => ({
                                    value: m.id,
                                    label: m.name || m.id,
                                    icon: <Cpu className="h-3 w-3 text-zinc-400" />,
                                  }))}
                                  placeholder={availableModels.length === 0 ? (t('ai.noEnabledModels') || 'No enabled models') : (t('ai.selectModel') || 'Select Model')}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. SAFEGUARDS & LIMITS TAB VIEW */}
      {isMasterFixed && activeTab === 'safeguards' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          {/* Card 1: Rate Limiting (Speed & Loop Protection) */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('ai.rateLimitingTitle') || 'Rate Limiting (Burst Protection)'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              
              {/* Setting 1.1: Tenant Limit */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.maxRequestsTenant') || 'Workspace Limit (Per Tenant)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.maxRequestsTenantHelp') || 'Global rate limit per tenant across all channels and workflows (Default: 30/min).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={safeguardsConfig.rate_limit_per_minute_tenant}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, rate_limit_per_minute_tenant: parseInt(e.target.value) || 30 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-24 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">/min</span>
                </div>
              </div>

              {/* Setting 1.2: Contact Chat Limit */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.maxRequestsContact') || 'Customer Chat Throttle (Per Contact)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.maxRequestsContactHelp') || 'Individual customer chat throttle to stop infinite automated webhook reply loops (Default: 10/min).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={safeguardsConfig.rate_limit_per_minute_contact}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, rate_limit_per_minute_contact: parseInt(e.target.value) || 10 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-24 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">/min</span>
                </div>
              </div>

              {/* Setting 1.3: Copilot Workspace Rate Limit */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.copilotRateLimit') || 'Copilot Assistant Rate Limit (Per Workspace)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.copilotRateLimitHelp') || 'Dedicated rate throttle for Copilot operations and automated designer actions (Default: 20/min).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={safeguardsConfig.copilot_rate_limit_per_minute ?? 20}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, copilot_rate_limit_per_minute: parseInt(e.target.value) || 20 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-24 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">/min</span>
                </div>
              </div>

            </div>
          </div>

          {/* Card 2: Token Limits (Length & Cost Control) */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('ai.tokenClampingTitle') || 'Token Limits (Length & Cost Clamps)'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              
              {/* Setting 2.1: Input Prompt Clamping */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.maxInputTokens') || 'Max Input Prompt Context'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.maxInputTokensHelp') || 'Contexts exceeding this are safely truncated from older conversation turns (Default: 2,500 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="100"
                    max="16000"
                    step="100"
                    value={safeguardsConfig.max_input_tokens}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, max_input_tokens: parseInt(e.target.value) || 2500 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

              {/* Setting 2.2: Output Clamping */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.maxOutputTokens') || 'Max Generation Output (max_tokens)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.maxOutputTokensHelp') || 'Enforces concise answers and prevents runaway LLM generation costs (Default: 500 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="50"
                    max="4000"
                    step="50"
                    value={safeguardsConfig.max_output_tokens}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, max_output_tokens: parseInt(e.target.value) || 500 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

              {/* Setting 2.3: Copilot Context Clamping (Input) */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.copilotMaxInputTokens') || 'Copilot Max Context (Input Tokens)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.copilotMaxInputTokensHelp') || 'Maximum input window for workspace telemetry, flow diagrams, and conversation context (Default: 12,000 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="1000"
                    max="32000"
                    step="500"
                    value={safeguardsConfig.copilot_max_input_tokens ?? 12000}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, copilot_max_input_tokens: parseInt(e.target.value) || 12000 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

              {/* Setting 2.4: Copilot Max Output Generation */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.copilotMaxOutputTokens') || 'Copilot Max Generation (Output Tokens)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.copilotMaxOutputTokensHelp') || 'Upper limit for complex flow synthesis, CRM reports, and campaign generation (Default: 2,048 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="256"
                    max="8192"
                    step="256"
                    value={safeguardsConfig.copilot_max_output_tokens ?? 2048}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, copilot_max_output_tokens: parseInt(e.target.value) || 2048 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

            </div>
          </div>

          {/* Card 3: Platform Monthly Budget & Circuit Breaker */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('ai.circuitBreakerTitle') || 'Platform Monthly Budget & Emergency Circuit-Breaker'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              
              {/* Setting 3.1: Monthly Platform Safety Cap */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.platformSafetyCap') || 'Monthly Platform Safety Cap'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.platformSafetyCapHelp') || 'Global monthly token consumption threshold across all tenants (Default: 10,000,000 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="10000"
                    step="100000"
                    value={safeguardsConfig.monthly_platform_safety_cap}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, monthly_platform_safety_cap: parseInt(e.target.value) || 10000000 }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    className="w-36 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens/mo</span>
                </div>
              </div>

              {/* Setting 3.2: Breach Action */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('ai.breachAction') || 'When Limit is Reached'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('ai.breachActionHelp') || 'Determines response behavior when a tenant or contact reaches their limit.'}
                    </p>
                  </div>
                </div>
                <div className="w-72 text-left shrink-0 pl-11 sm:pl-0">
                  <DropdownSelect
                    value={safeguardsConfig.on_limit_breached_action}
                    onChange={(val) => {
                      setSafeguardsConfig(prev => ({ ...prev, on_limit_breached_action: String(val) as any }));
                      setHasUnsavedSafeguardsChanges(true);
                    }}
                    options={[
                      {
                        value: 'block_fallback',
                        label: t('ai.breachBlockFallback') || 'Block & Send Fallback Message',
                        icon: <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" />
                      },
                      {
                        value: 'simulate_mock',
                        label: t('ai.breachSimulateMock') || 'Simulate Mock Reply (Sandbox)',
                        icon: <Bot className="h-3.5 w-3.5 text-zinc-500" />
                      }
                    ]}
                  />
                </div>
              </div>

              {/* Setting 3.3: Throttled Fallback Message */}
              <div className="p-4 space-y-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 max-w-lg">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-zinc-700" />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <span className="text-xs font-bold text-zinc-950 block">
                        {t('ai.fallbackMessageLabel') || 'Throttled Fallback Message'}
                      </span>
                      <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                        {t('ai.fallbackMessageHelp') || 'Automatic reply delivered to customer channels when AI rate or monthly limit is reached.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold shrink-0 pt-1">
                    {safeguardsConfig.fallback_message.length} chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={safeguardsConfig.fallback_message}
                  onChange={(e) => {
                    setSafeguardsConfig(prev => ({ ...prev, fallback_message: e.target.value }));
                    setHasUnsavedSafeguardsChanges(true);
                  }}
                  className="w-full p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium text-black focus:outline-none focus:border-black transition-colors resize-none leading-relaxed"
                />
              </div>

            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveSafeguards}
              disabled={saving}
              className="h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-3xs cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>{t('ai.saving') || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>{t('ai.saveSafeguards') || 'Save Safeguards & Limits'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* 1. DEDICATED CONFIGURE DIALOG (Identical Design & Structure to Tenant Panel, No Form Nesting) */}
      {isConfigureOpen && activeConfigureProvInfo && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsConfigureOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsConfigureOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Image 
                    src={activeConfigureProvInfo.logo} 
                    alt={`${activeConfigureProvInfo.label} logo`} 
                    width={20}
                    height={20}
                    className="h-full w-full object-contain filter grayscale-[10%]" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {(t('ai.configureModalTitle') || 'Configure {provider}').replace('{provider}', activeConfigureProvInfo.label)}
                  </h3>
                  {activeConfigureProvInfo.website && (
                    <a 
                      href={activeConfigureProvInfo.website} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-zinc-500 hover:text-black hover:underline flex items-center gap-0.5 mt-0.5"
                    >
                      {t('ai.getApiCredentials') || 'Get API credentials key'} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigureOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
              {/* API Key Input */}
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('ai.masterApiKeyLabel') || 'Master API Key'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  <input 
                    type={configureShowKey ? "text" : "password"}
                    placeholder={(t('ai.apiKeyPlaceholder') || 'Enter your {provider} API key...').replace('{provider}', activeConfigureProvInfo.label)}
                    value={configureApiKey}
                    onChange={(e) => setConfigureApiKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveConfigureDialog(); }}
                    className="w-full h-9 pl-9 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  {configureApiKey && (
                    <button
                      type="button"
                      onClick={() => setConfigureShowKey(!configureShowKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                    >
                      {configureShowKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>

                <p className="text-[9px] text-[#A0A0A0]">
                  {t('ai.credentialsEncrypted') || 'Your credentials are encrypted and securely stored using AES-256-GCM.'}
                </p>
              </div>
            </div>

            {/* Footer action strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setIsConfigureOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('ai.btnCancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleTestKeyConnection(activeConfigureProvInfo.id, configureApiKey)}
                disabled={!configureApiKey.trim() || testingProviderId === activeConfigureProvInfo.id}
                className="border border-[#E8E8E6] bg-white text-zinc-800 hover:bg-zinc-50 h-9 px-3.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingProviderId === activeConfigureProvInfo.id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                ) : (
                  <Activity className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>{testingProviderId === activeConfigureProvInfo.id ? (t('ai.btnTestingKey') || 'Testing...') : (t('ai.btnTestKey') || 'Test Key')}</span>
              </button>
              <button 
                type="button"
                onClick={handleSaveConfigureDialog}
                disabled={saving}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (t('ai.btnConnecting') || 'Connecting...') : (t('ai.btnConnect') || 'Connect')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. DEDICATED MANAGE DIALOG (Identical Design & Structure to Tenant Panel, No Form Nesting) */}
      {isManageOpen && activeManageProvInfo && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsManageOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsManageOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Image 
                    src={activeManageProvInfo.logo} 
                    alt={`${activeManageProvInfo.label} logo`} 
                    width={20}
                    height={20}
                    className="h-full w-full object-contain filter grayscale-[10%]" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {(t('ai.manageModalTitle') || 'Manage {provider}').replace('{provider}', activeManageProvInfo.label)}
                  </h3>
                  {activeManageProvInfo.website && (
                    <a 
                      href={activeManageProvInfo.website} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-zinc-500 hover:text-black hover:underline flex items-center gap-0.5 mt-0.5"
                    >
                      {t('ai.getApiCredentials') || 'Get API credentials key'} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
              
              {/* API Key Input */}
              <div className="space-y-1.5 font-sans">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('ai.masterApiKeyLabel') || 'Master API Key'} <span className="text-emerald-600 font-bold ml-1">● {t('ai.statusConfigured') || 'Configured'}</span>
                  </label>
                  {maskedKeys[activeManageProvInfo.id]?.has_key && (
                    <span className="text-[9.5px] font-mono text-zinc-500">
                      {t('ai.storedKeyPrefix') || 'Stored:'} {maskedKeys[activeManageProvInfo.id].preview}
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  <input 
                    type={manageShowKey && manageApiKey !== '••••••••••••••••••••••••' ? "text" : "password"}
                    placeholder="••••••••••••••••••••••••"
                    value={manageApiKey}
                    onChange={(e) => setManageApiKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveManageDialog(); }}
                    className="w-full h-9 pl-9 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors font-mono"
                  />
                  {manageApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        if (manageApiKey === '••••••••••••••••••••••••') {
                          setManageApiKey('');
                          setManageShowKey(true);
                        } else {
                          setManageShowKey(!manageShowKey);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                    >
                      {manageShowKey && manageApiKey !== '••••••••••••••••••••••••' ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                <p className="text-[9px] text-[#A0A0A0]">
                  {t('ai.credentialsEncrypted') || 'Your credentials are encrypted and securely stored using AES-256-GCM.'}
                </p>
              </div>

              {/* Enabled Models List with Switches */}
              <div className="space-y-2 text-left font-sans animate-fade-in">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('ai.enabledModels') || 'Enabled Models'}
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto bg-zinc-50 border border-[#E8E8E6]/60 p-3 rounded-lg divide-y divide-zinc-200/50">
                  {(aiConfig[activeManageProvInfo.id]?.models || []).map((model) => {
                    const isEnabled = !!model.enabled;
                    return (
                      <div key={model.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="text-[11px] font-semibold text-zinc-800 truncate">{model.name || model.id}</span>
                          {model.custom && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {t('ai.badgeCustom') || 'Custom'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleModelToggleClick(activeManageProvInfo.id, model.id)}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          {model.custom && (
                            <button
                              type="button"
                              onClick={() => handleModelDeleteClick(activeManageProvInfo.id, model.id, model.name || model.id)}
                              className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                              title="Remove custom model"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Model (No nested form) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('ai.addCustomModel') || 'Add Custom Model Identifier'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('ai.addCustomPlaceholder') || 'e.g. ft:gpt-4o-mini:custom-id'}
                    value={newModelId}
                    onChange={(e) => setNewModelModelId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomModelToProvider(activeManageProvInfo.id);
                      }
                    }}
                    className="flex-1 h-8 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomModelToProvider(activeManageProvInfo.id)}
                    className="h-8 px-3 bg-[#0A0A0A] hover:bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{t('ai.btnAdd') || 'Add'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer action strip nested with off-white bg fill */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
              <div>
                <button
                  type="button"
                  onClick={() => handleDisconnectProviderClick(activeManageProvInfo.id, activeManageProvInfo.label)}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                >
                  <Trash2 className="h-4 w-4" /> {t('ai.btnDisconnectKey') || 'Disconnect Key'}
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTestKeyConnection(activeManageProvInfo.id, manageApiKey)}
                  disabled={testingProviderId === activeManageProvInfo.id}
                  className="border border-[#E8E8E6] bg-white text-zinc-800 hover:bg-zinc-50 h-9 px-3.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingProviderId === activeManageProvInfo.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>{testingProviderId === activeManageProvInfo.id ? (t('ai.btnTestingKey') || 'Testing...') : (t('ai.btnTestKey') || 'Test Key')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManageOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('ai.btnCancel') || 'Cancel'}
                </button>
                <button 
                  type="button"
                  onClick={handleSaveManageDialog}
                  disabled={saving}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (t('ai.saving') || 'Saving...') : (t('ai.btnSaveChanges') || 'Save Changes')}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 3. DEDICATED MANAGE MODELS MODAL (For BYOK Mode, No Form Nesting) */}
      {isModelsModalOpen && activeModelsProvInfo && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsModelsModalOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsModelsModalOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Image 
                    src={activeModelsProvInfo.logo} 
                    alt={activeModelsProvInfo.label} 
                    width={16} 
                    height={16} 
                    className="object-contain select-none" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {(t('ai.modelsModalTitle') || 'Manage {provider} Models').replace('{provider}', activeModelsProvInfo.label)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModelsModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
              
              {/* Add Custom Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('ai.addCustomModel') || 'Add Custom Model Identifier'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('ai.addCustomPlaceholder') || 'e.g. ft:gpt-4o-mini:custom-id'}
                    value={newModelId}
                    onChange={(e) => setNewModelModelId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomModelToProvider(activeModelsProvInfo.id);
                      }
                    }}
                    className="flex-1 h-8 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomModelToProvider(activeModelsProvInfo.id)}
                    className="h-8 px-3 bg-[#0A0A0A] hover:bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{t('ai.btnAdd') || 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Models List */}
              <div className="space-y-2 text-left font-sans animate-fade-in">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('ai.registeredModels') || 'Registered Models'}
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-zinc-50 border border-[#E8E8E6]/60 p-3 rounded-lg divide-y divide-zinc-200/50">
                  {(aiConfig[activeModelsProvInfo.id]?.models || []).map((model) => (
                    <div 
                      key={model.id} 
                      className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="text-[11px] font-semibold text-zinc-800 truncate">{model.name || model.id}</span>
                        {model.custom && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {t('ai.badgeCustom') || 'Custom'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Switch Control */}
                        <button
                          type="button"
                          onClick={() => handleModelToggleClick(activeModelsProvInfo.id, model.id)}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            model.enabled ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                          }`}
                          aria-label={`Toggle ${model.name || model.id}`}
                        >
                          <span 
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              model.enabled ? 'translate-x-3.5' : 'translate-x-0'
                            }`} 
                          />
                        </button>

                        {model.custom && (
                          <button
                            type="button"
                            onClick={() => handleModelDeleteClick(activeModelsProvInfo.id, model.id, model.name || model.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                            title="Remove custom model"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setIsModelsModalOpen(false)}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
              >
                {t('ai.btnDone') || 'Done'}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 4. UNIFIED CONFIRMATION ALERT DIALOG */}
      {isConfirmOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsConfirmOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded border p-1.5 flex items-center justify-center shrink-0 ${
                  confirmActionType === 'disable' || confirmType === 'deleteModel' || confirmType === 'disconnect'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-[#FAFAFA] border-[#E8E8E6]'
                }`}>
                  {confirmActionType === 'disable' || confirmType === 'deleteModel' || confirmType === 'disconnect' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                  ) : confirmTargetProvInfo?.logo ? (
                    <Image 
                      src={confirmTargetProvInfo.logo} 
                      alt={confirmTargetName} 
                      width={16} 
                      height={16} 
                      className="object-contain select-none" 
                    />
                  ) : (
                    <Cpu className="h-4 w-4 text-[#6B6B6B]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {confirmType === 'disconnect'
                      ? (t('ai.confirmDisconnectTitle') || 'Disconnect {target}').replace('{target}', confirmTargetName)
                      : confirmType === 'deleteModel' 
                      ? (t('ai.confirmDeleteModelTitle') || 'Delete Custom Model')
                      : confirmActionType === 'enable' 
                      ? (t('ai.confirmEnableTitle') || 'Enable {target}').replace('{target}', confirmTargetName)
                      : (t('ai.confirmDisableTitle') || 'Disable {target}').replace('{target}', confirmTargetName)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {confirmType === 'disconnect'
                  ? (t('ai.confirmDisconnectMsg') || 'Are you sure you want to disconnect {target}? Stored API credentials will be permanently removed from the master vault.').replace('{target}', confirmTargetName)
                  : confirmType === 'deleteModel'
                  ? (t('ai.confirmDeleteModelMsg') || 'Are you sure you want to remove "{target}"? Any features configured with this model will revert to default.').replace('{target}', confirmTargetName)
                  : (t('ai.confirmToggleMsg') || 'Are you sure you want to {action} {target} platform-wide?')
                      .replace('{action}', confirmActionType === 'enable' ? (t('ai.actionEnable') || 'enable') : (t('ai.actionDisable') || 'disable'))
                      .replace('{target}', confirmTargetName)}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('ai.btnCancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`h-9 px-4 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer ${
                  confirmActionType === 'enable' && confirmType !== 'deleteModel' && confirmType !== 'disconnect'
                    ? 'bg-zinc-955 hover:bg-zinc-900'
                    : 'bg-red-650 hover:bg-red-750'
                }`}
              >
                {confirmType === 'disconnect' 
                  ? (t('ai.btnDisconnect') || 'Disconnect') 
                  : confirmType === 'deleteModel' 
                  ? (t('ai.btnDelete') || 'Delete') 
                  : confirmActionType === 'enable' 
                  ? (t('ai.btnEnable') || 'Enable') 
                  : (t('ai.btnDisable') || 'Disable')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. OPERATIONAL MODEL SWITCH CONFIRMATION DIALOG */}
      {isOpModelConfirmOpen && targetOpModel && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsOpModelConfirmOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsOpModelConfirmOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0">
                  {targetOpModel === 'byok' ? (
                    <KeyRound className="h-4 w-4 text-[#6B6B6B]" />
                  ) : targetOpModel === 'master_fixed' ? (
                    <ShieldCheck className="h-4 w-4 text-[#6B6B6B]" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[#6B6B6B]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('ai.switchOpModelTitle') || 'Switch Operational Model'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpModelConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {targetOpModel === 'byok' && (
                  <>
                    {t('ai.switchByokMsg') || 'Are you sure you want to switch to BYOK (Bring Your Own Key)? Each tenant will be required to provide and manage their own API keys in their workspace settings. Platform master keys will no longer be used for tenant inference.'}
                  </>
                )}
                {targetOpModel === 'master_fixed' && (
                  <>
                    {t('ai.switchMasterFixedMsg') || 'Are you sure you want to switch to Master Fixed (Centrally Routed)? All AI features across tenant workspaces and AI agents will be centrally powered by platform master keys and routed via the Feature Routing Matrix. Provider and model details will be completely hidden from tenants.'}
                  </>
                )}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setIsOpModelConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('ai.btnCancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmOpModelSwitch}
                disabled={saving}
                className="h-9 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving && <RefreshCw className="h-3 w-3 animate-spin text-white" />}
                <span>{t('ai.btnSwitchModel') || 'Switch Model'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
