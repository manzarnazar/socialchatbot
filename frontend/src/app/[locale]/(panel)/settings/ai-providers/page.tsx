'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Key, 
  ExternalLink, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Sliders, 
  Check, 
  RefreshCw, 
  Bot, 
  Workflow, 
  Database, 
  Sparkles, 
  Cpu,
  Activity,
  CheckCircle2,
  AlertCircle,
  Coins,
  Clock,
  ArrowUpRight,
  BarChart2,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  FileText,
  X,
  Zap,
  Share2,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const logoMap: Record<string, string> = {
  openai: 'openai.svg',
  anthropic: 'anthropic.png',
  gemini: 'gemini.webp',
  deepseek: 'deepseek.png',
  groq: 'groq.webp',
  xai: 'xai.png',
  mistral: 'mistral.png',
  openrouter: 'openrouter.webp',
};

interface AIProviderDetails {
  name: string;
  description: string;
  website: string;
  models: string[];
  is_configured: boolean;
  is_active: boolean;
  enabled_models: string[];
  default_model: string | null;
}

interface AvailableProviderForRouting {
  slug: string;
  name: string;
  enabled_models: string[];
  default_model: string | null;
}

interface AIFeatureItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UsageSummary {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_requests: number;
  total_cost: number;
  avg_latency_ms: number;
  success_rate: number;
  distinct_models: number;
}

interface TrendDay {
  date: string;
  label: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cumulative_tokens: number;
  requests: number;
  cost: number;
}

interface FeatureConsumption {
  key: string;
  name: string;
  description: string;
  requests: number;
  total_tokens: number;
  cost: number;
  percentage: number;
}

interface ModelBreakdown {
  name: string;
  value: number;
  requests: number;
  percentage: number;
  color: string;
}

interface UsageLog {
  id: number;
  feature: string;
  feature_label: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  latency_ms: number;
  status: string;
  created_at: string;
}

interface TenantSafeguardsConfig {
  rate_limit_per_minute_contact: number;
  max_input_tokens: number;
  max_output_tokens: number;
  on_limit_breached_action: 'block_fallback' | 'simulate_mock';
  fallback_message: string;
}

const CustomChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: TrendDay }>; label?: string }) => {
  if (!active || !payload || !payload.length) return null;
  const dayData = payload[0]?.payload;
  if (!dayData) return null;

  return (
    <div className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl p-3.5 shadow-2xl text-xs text-white min-w-[220px] pointer-events-none space-y-2.5 z-50">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span>{dayData.date || label}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
          {dayData.requests || 0} reqs
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Prompt Tokens
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {(dayData.prompt_tokens || 0).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            Completion Tokens
          </span>
          <span className="font-mono font-bold text-indigo-400">
            {(dayData.completion_tokens || 0).toLocaleString()}
          </span>
        </div>

        <div className="border-t border-zinc-800/80 pt-2 flex items-center justify-between font-bold">
          <span className="text-zinc-400 text-[11px]">Total Volume</span>
          <span className="font-mono text-zinc-100 text-sm">
            {(dayData.total_tokens || 0).toLocaleString()}
          </span>
        </div>

        {dayData.cost !== undefined && Number(dayData.cost) > 0 && (
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            <span>Estimated Cost</span>
            <span className="font-mono text-amber-300 font-semibold">
              ${Number(dayData.cost).toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function AIProvidersSettingsPage() {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');

  // Active Tab: 'providers' | 'settings' | 'safeguards' | 'telemetry'
  const [activeTab, setActiveTab] = useState<'providers' | 'settings' | 'safeguards' | 'telemetry'>('providers');

  const [operationalModel, setOperationalModel] = useState<string>('byok');
  const [providers, setProviders] = useState<Record<string, AIProviderDetails>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Form State for selected provider in "AI Providers" tab
  const [apiKey, setApiKey] = useState('');
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);

  // State for "AI Settings" centralized routing tab
  const [features, setFeatures] = useState<AIFeatureItem[]>([]);
  const [routing, setRouting] = useState<Record<string, { provider: string; model: string }>>({});
  const [availableProvidersForRouting, setAvailableProvidersForRouting] = useState<AvailableProviderForRouting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // State for "Safeguards & Limits" tab
  const [safeguardsConfig, setSafeguardsConfig] = useState<TenantSafeguardsConfig>({
    rate_limit_per_minute_contact: 10,
    max_input_tokens: 2500,
    max_output_tokens: 500,
    on_limit_breached_action: 'block_fallback',
    fallback_message: 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
  });
  const [savingSafeguards, setSavingSafeguards] = useState<boolean>(false);
  const [hasUnsavedSafeguards, setHasUnsavedSafeguards] = useState<boolean>(false);

  // State for "AI & Token Telemetry" tab
  const [usageLoading, setUsageLoading] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<string>('30');
  const [aiChartMode, setAiChartMode] = useState<'stacked' | 'area' | 'cumulative'>('stacked');
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [featureDistribution, setFeatureDistribution] = useState<FeatureConsumption[]>([]);
  const [modelDistribution, setModelDistribution] = useState<ModelBreakdown[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCsrf('/settings/ai-providers');
      if (response.ok) {
        const data = await response.json();
        const model = data.operational_model || 'byok';
        setOperationalModel(model);
        setProviders(data.providers || {});
        if (model === 'master_fixed') {
          setActiveTab(prev => (prev === 'providers' ? 'settings' : prev));
        }
      }
    } catch {
      toast.error(t('toasts.syncAiFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetchWithCsrf('/settings/ai-providers/settings');
      if (response.ok) {
        const data = await response.json();
        const model = data.operational_model || 'byok';
        setOperationalModel(model);
        setFeatures(data.features || []);
        setRouting(data.routing || {});
        setAvailableProvidersForRouting(data.available_providers || []);
        if (model === 'master_fixed') {
          setActiveTab(prev => (prev === 'providers' ? 'settings' : prev));
        }
        if (data.safeguards) {
          setSafeguardsConfig({
            rate_limit_per_minute_contact: Number(data.safeguards.rate_limit_per_minute_contact) || 10,
            max_input_tokens: Number(data.safeguards.max_input_tokens) || 2500,
            max_output_tokens: Number(data.safeguards.max_output_tokens) || 500,
            on_limit_breached_action: data.safeguards.on_limit_breached_action || 'block_fallback',
            fallback_message: data.safeguards.fallback_message || 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
          });
          setHasUnsavedSafeguards(false);
        }
        setHasUnsavedChanges(false);
      }
    } catch {
      toast.error(t('toasts.syncAiFailed'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAiUsage = async () => {
    setUsageLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - parseInt(dateRange, 10));
      const startDate = startDateObj.toISOString().split('T')[0];

      const response = await fetchWithCsrf(`/settings/ai-providers/usage?start_date=${startDate}&end_date=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary || null);
        setTrend(data.trend || []);
        setFeatureDistribution(data.feature_distribution || []);
        setModelDistribution(data.model_distribution || []);
        setUsageLogs(data.recent_logs || []);
        setCurrentPage(1);
      }
    } catch {
      toast.error('Failed to sync AI usage telemetry.');
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProviders();
    fetchAiSettings();
    fetchAiUsage();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'settings') {
        setActiveTab('settings');
      } else if (tabParam === 'safeguards' || tabParam === 'limits') {
        setActiveTab('safeguards');
      } else if (tabParam === 'telemetry' || tabParam === 'usage') {
        setActiveTab('telemetry');
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSlug(null);
        setConfirmDeleteSlug(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeTab === 'telemetry') {
      fetchAiUsage();
    }
  }, [dateRange, activeTab]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedSlug(null);
      setConfirmDeleteSlug(null);
    }
  };

  const handleSelectProvider = (slug: string, details: AIProviderDetails) => {
    setSelectedSlug(slug);
    setApiKey(details.is_configured ? '••••••••••••••••••••••••' : '');
    const available = details.models || [];
    const savedEnabled = Array.isArray(details.enabled_models) && details.enabled_models.length > 0
      ? details.enabled_models.filter(m => available.includes(m))
      : available;
    const finalEnabled = savedEnabled.length > 0 ? savedEnabled : available;
    setEnabledModels(finalEnabled);

    const validDefault = (details.default_model && finalEnabled.includes(details.default_model))
      ? details.default_model
      : (finalEnabled[0] || '');
    setDefaultModel(validDefault);
    setShowKey(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug) return;

    setFormLoading(true);
    try {
      if (apiKey && apiKey !== '••••••••••••••••••••••••') {
        const testResponse = await fetchWithCsrf('/settings/ai-providers/validate', {
          method: 'POST',
          body: JSON.stringify({
            provider: selectedSlug,
            api_key: apiKey,
          }),
        });

        const testData = await testResponse.json();
        if (!testResponse.ok || !testData.success) {
          throw new Error(testData.message || 'API credentials verification check failed.');
        }
      }

      const response = await fetchWithCsrf('/settings/ai-providers', {
        method: 'POST',
        body: JSON.stringify({
          provider_name: selectedSlug,
          api_key: apiKey === '••••••••••••••••••••••••' ? null : apiKey,
          enabled_models: enabledModels,
          default_model: defaultModel,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('toasts.aiConfigSaved', { provider: providers[selectedSlug].name }));
        setApiKey('');
        setSelectedSlug(null);
        await fetchProviders();
        await fetchAiSettings();
      } else {
        throw new Error(data.message || 'Failed to save configuration.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      toast.error(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfig = async (slug: string) => {
    try {
      const response = await fetchWithCsrf(`/settings/ai-providers/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('toasts.aiDisconnected'));
        setSelectedSlug(null);
        await fetchProviders();
        await fetchAiSettings();
      }
    } catch {
      toast.error(t('toasts.disconnectAiFailed'));
    }
  };

  const handleToggleActive = async (slug: string, currentDetails: AIProviderDetails) => {
    try {
      const response = await fetchWithCsrf('/settings/ai-providers', {
        method: 'POST',
        body: JSON.stringify({
          provider_name: slug,
          enabled_models: currentDetails.enabled_models.length > 0 ? currentDetails.enabled_models : currentDetails.models,
          default_model: currentDetails.default_model || currentDetails.models[0] || null,
          is_active: !currentDetails.is_active,
        }),
      });

      if (response.ok) {
        toast.success(t('toasts.aiStatusUpdated', { provider: providers[slug].name, status: !currentDetails.is_active ? 'enabled' : 'disabled' }));
        await fetchProviders();
        await fetchAiSettings();
      } else {
        const data = await response.json();
        toast.error(data.message || t('toasts.updateAiStatusFailed'));
      }
    } catch {
      toast.error(t('toasts.updateAiStatusFailed'));
    }
  };

  // Centralized AI Settings Routing Handlers
  const handleFeatureProviderChange = (featureId: string, newProviderSlug: string) => {
    const targetProv = availableProvidersForRouting.find(p => p.slug === newProviderSlug);
    const defaultMod = targetProv ? (targetProv.default_model || targetProv.enabled_models[0] || '') : '';

    setRouting(prev => ({
      ...prev,
      [featureId]: {
        provider: newProviderSlug,
        model: defaultMod,
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleFeatureModelChange = (featureId: string, newModel: string) => {
    setRouting(prev => ({
      ...prev,
      [featureId]: {
        ...(prev[featureId] || { provider: availableProvidersForRouting[0]?.slug || 'openai' }),
        model: newModel,
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveAllRoutingSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetchWithCsrf('/settings/ai-providers/settings', {
        method: 'POST',
        body: JSON.stringify({ routing }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message || 'AI Settings updated successfully.');
        setRouting(data.routing || routing);
        setHasUnsavedChanges(false);
      } else {
        throw new Error(data.message || 'Failed to update AI settings.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update AI settings.';
      toast.error(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSafeguards = async () => {
    setSavingSafeguards(true);
    try {
      const response = await fetchWithCsrf('/settings/ai-providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safeguards: safeguardsConfig,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        toast.success(t('safeguardsSavedSuccess') || 'AI Safeguards & Limits saved successfully.');
        if (data.safeguards) {
          setSafeguardsConfig({
            rate_limit_per_minute_contact: Number(data.safeguards.rate_limit_per_minute_contact) || 10,
            max_input_tokens: Number(data.safeguards.max_input_tokens) || 2500,
            max_output_tokens: Number(data.safeguards.max_output_tokens) || 500,
            on_limit_breached_action: data.safeguards.on_limit_breached_action || 'block_fallback',
            fallback_message: data.safeguards.fallback_message || 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
          });
        }
        setHasUnsavedSafeguards(false);
      } else {
        throw new Error(data.message || 'Failed to update AI safeguards.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error saving AI safeguards.';
      toast.error(msg);
    } finally {
      setSavingSafeguards(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!logsSearch.trim()) return usageLogs;
    const q = logsSearch.toLowerCase();
    return usageLogs.filter(log => 
      log.feature_label.toLowerCase().includes(q) ||
      log.provider.toLowerCase().includes(q) ||
      log.model.toLowerCase().includes(q) ||
      log.status.toLowerCase().includes(q)
    );
  }, [usageLogs, logsSearch]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const totalTrendTokens = useMemo(() => {
    return trend.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
  }, [trend]);

  const totalTrendPrompt = useMemo(() => {
    return trend.reduce((acc, curr) => acc + (curr.prompt_tokens || 0), 0);
  }, [trend]);

  const totalTrendComp = useMemo(() => {
    return trend.reduce((acc, curr) => acc + (curr.completion_tokens || 0), 0);
  }, [trend]);

  const peakDay = useMemo(() => {
    if (!trend.length) return null;
    return trend.reduce((max, curr) => (curr.total_tokens > (max?.total_tokens || 0) ? curr : max), trend[0]);
  }, [trend]);

  const dailyAvgTokens = useMemo(() => {
    if (!trend.length) return 0;
    return Math.round(totalTrendTokens / trend.length);
  }, [totalTrendTokens, trend.length]);

  if (loading) {
    return <SimpleLoader message={t('syncingAiProviders')} />;
  }

  const configuredProviders = Object.entries(providers).filter(([, details]) => details.is_configured);
  const unconfiguredProviders = Object.entries(providers).filter(([, details]) => !details.is_configured);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Autonomous Operations': return <Sparkles className="h-3.5 w-3.5 text-emerald-600" />;
      case 'Conversational AI': return <Bot className="h-3.5 w-3.5 text-zinc-500" />;
      case 'Visual Flows': return <Workflow className="h-3.5 w-3.5 text-zinc-500" />;
      case 'Knowledge Base': return <Database className="h-3.5 w-3.5 text-zinc-500" />;
      default: return <Sparkles className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case 'copilot': return <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'ai_chatbot': return <Bot className="h-4 w-4 text-blue-600 shrink-0" />;
      case 'flow_ai_prompt': return <Workflow className="h-4 w-4 text-indigo-600 shrink-0" />;
      case 'flow_ai_condition': return <Sliders className="h-4 w-4 text-purple-600 shrink-0" />;
      case 'knowledge_base_rag': return <Database className="h-4 w-4 text-teal-600 shrink-0" />;
      default: return <Cpu className="h-4 w-4 text-zinc-600 shrink-0" />;
    }
  };

  const maxDailyTokens = Math.max(...trend.map(t => t.total_tokens), 100);

  return (
    <div className="w-full p-8 space-y-8 animate-fade-in text-zinc-750 selection:bg-zinc-100 flex-1 overflow-y-auto font-sans">

      {/* TOP TAB BAR & ACTIONS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E6] pb-4">
        {/* Segmented Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar">
          {operationalModel === 'byok' && (
            <button
              type="button"
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'providers'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Key className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('aiProvidersTab') || 'AI Providers'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
              activeTab === 'settings'
                ? 'bg-white text-zinc-950 shadow-3xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>{t('aiSettingsTab') || 'AI Settings'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('safeguards')}
            className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
              activeTab === 'safeguards'
                ? 'bg-white text-zinc-950 shadow-3xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>{t('aiSafeguardsTab') || 'Safeguards & Limits'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
              activeTab === 'telemetry'
                ? 'bg-white text-zinc-950 shadow-3xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>AI & Token Telemetry</span>
          </button>
        </div>

        {/* Action Buttons depending on active tab */}
        {activeTab === 'settings' && operationalModel === 'master_fixed' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold select-none shadow-3xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Centrally Managed (Master Fixed)</span>
          </div>
        )}

        {activeTab === 'settings' && operationalModel === 'byok' && availableProvidersForRouting.length > 0 && (
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAllRoutingSettings}
              disabled={savingSettings}
              className="h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-3xs cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Save AI Settings</span>
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'safeguards' && (
          <div className="flex items-center gap-3">
            {hasUnsavedSafeguards && (
              <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveSafeguards}
              disabled={savingSafeguards}
              className="h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-3xs cursor-pointer disabled:opacity-50"
            >
              {savingSafeguards ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>{t('saveSafeguardsBtn') || 'Save Safeguards & Limits'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-[#E8E8E6] rounded-lg p-0.5 text-xs shadow-3xs">
              {['7', '30', '90'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 rounded-[5px] text-xs font-semibold transition-all cursor-pointer ${
                    dateRange === range
                      ? 'bg-zinc-950 text-white shadow-3xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {range}D
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={fetchAiUsage}
              disabled={usageLoading}
              className="h-8 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${usageLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI PROVIDERS MANAGEMENT (ONLY IN BYOK MODE)                        */}
      {/* ========================================================================= */}
      {operationalModel === 'byok' && activeTab === 'providers' && (
        <div className="space-y-8 animate-fade-in">
          {/* 1. Configured/Enabled Providers Table Section */}
          {configuredProviders.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-0.5 select-none text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t('activeIntegrations')}</span>
                <p className="text-[11px] text-zinc-500 font-medium">{t('activeIntegrationsDesc')}</p>
              </div>
              
              <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/70 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                      <th className="p-4">{t('aiProvider')}</th>
                      <th className="p-4">{t('selectModel')}</th>
                      <th className="p-4">{t('activeStatus')}</th>
                      <th className="p-4 text-right">{tCommon('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-750">
                    {configuredProviders.map(([slug, details]) => {
                      const logoFile = logoMap[slug] || 'openai.svg';
                      return (
                        <tr key={slug} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1 shrink-0 select-none">
                              <img 
                                src={`/ai-providers/${logoFile}`} 
                                alt={`${details.name} logo`} 
                                className="h-full w-full object-contain filter grayscale-[10%]" 
                              />
                            </div>
                            <div>
                              <span className="text-zinc-950 font-bold block">{details.name}</span>
                              <span className="text-[10px] text-zinc-400 font-normal">
                                {details.enabled_models.length} model{details.enabled_models.length !== 1 ? 's' : ''} enabled
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-[11px] font-semibold text-zinc-900 font-mono">
                              {details.default_model || '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(slug, details)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  details.is_active ? 'bg-zinc-950' : 'bg-zinc-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                    details.is_active ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                details.is_active ? 'text-zinc-950' : 'text-zinc-400'
                              }`}>
                                {details.is_active ? t('enabled') : t('disabled')}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleSelectProvider(slug, details)}
                              className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                            >
                              {t('manage')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteSlug(slug)}
                              className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-750 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                            >
                              {t('disconnect')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-4 my-6 select-none animate-overlay-fade">
              <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
                <Key className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">{t('bringAgentsToLife')}</h3>
                <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed font-semibold">
                  {t('bringAgentsToLifeDesc')}
                </p>
              </div>
            </div>
          )}

          {/* 2. Available/Add AI Providers Grid */}
          <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
            <div className="space-y-0.5 select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t('availableProviders')}</span>
              <p className="text-[11px] text-zinc-500 font-medium">{t('availableProvidersDesc')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {unconfiguredProviders.map(([slug, details]) => {
                const logoFile = logoMap[slug] || 'openai.svg';
                return (
                  <div 
                    key={slug} 
                    className="border border-[#E8E8E6]/70 rounded-xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs hover:border-zinc-300 transition-all duration-200"
                  >
                    <div>
                      {/* Top Row: Logo */}
                      <div className="flex items-start mb-4 select-none">
                        <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-1.5 shrink-0">
                          <img 
                            src={`/ai-providers/${logoFile}`} 
                            alt={`${details.name} logo`} 
                            className="h-full w-full object-contain filter grayscale-[10%]" 
                          />
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs text-black uppercase tracking-wider">{details.name}</h4>
                        <p className="text-[11px] text-[#6B6B6B] leading-relaxed min-h-[44px] line-clamp-3">
                          {details.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="border-t border-[#F0F0F0] pt-3.5 mt-4">
                      <button
                        onClick={() => handleSelectProvider(slug, details)}
                        className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                      >
                        {t('configureKey')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI SETTINGS (SINGLE UNIFIED CENTRALIZED ROUTING TABLE)              */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          {settingsLoading ? (
            <SimpleLoader message="Loading centralized AI configurations..." />
          ) : availableProvidersForRouting.length === 0 ? (
            <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-4 select-none">
              <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-zinc-950">No Active AI Providers</h3>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  To assign AI models to platform features, please configure and activate at least one AI Provider (e.g. OpenAI, Anthropic, Gemini, Groq) in the AI Providers tab.
                </p>
              </div>
              {operationalModel === 'byok' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className="mt-4 h-8.5 px-4 bg-[#0A0A0A] hover:bg-zinc-800 text-white text-xs font-semibold rounded-[6px] shadow-3xs cursor-pointer"
                >
                  <span>Configure AI Providers →</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Architecture Context Banner */}
              {operationalModel === 'master_fixed' ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3 shadow-3xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950">Master Fixed Architecture (Centrally Managed)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase tracking-wide">
                        Platform Admin Managed
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/90 leading-relaxed font-medium">
                      All AI provider credentials, models, and feature routing (including the Copilot Workspace Assistant) are centrally provisioned and managed by your platform administrator. The assigned providers and models below power your workspace operations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5 select-none text-left">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Centralized AI Intelligence Routing (BYOK Mode)</span>
                  <p className="text-[11px] text-zinc-500 font-medium">Assign your enabled AI providers and generative models across platform capabilities, including the Copilot Workspace Assistant.</p>
                </div>
              )}

              {/* Single Unified Clean Master Table */}
              <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/70 border-b border-[#E8E8E6] rounded-t-xl text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                      <th className="p-4 w-[38%]">Platform Capability</th>
                      <th className="p-4 w-[18%]">Category</th>
                      <th className="p-4 w-[22%]">AI Provider</th>
                      <th className="p-4 w-[22%]">Generative Model</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-750">
                    {features.map((feature) => {
                      const currentRoute = routing[feature.id] || {
                        provider: availableProvidersForRouting[0]?.slug || 'openai',
                        model: availableProvidersForRouting[0]?.default_model || '',
                      };

                      const selectedProviderData = availableProvidersForRouting.find(p => p.slug === currentRoute.provider) || availableProvidersForRouting[0];
                      const availableModelsForSelectedProvider = selectedProviderData ? selectedProviderData.enabled_models : [];

                      return (
                        <tr key={feature.id} className="hover:bg-neutral-50/40 transition-colors">
                          {/* Capability Name & Description */}
                          <td className="p-4 align-middle">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-neutral-100 border border-[#E8E8E6] text-zinc-700 shrink-0 mt-0.5">
                                {getFeatureIcon(feature.id)}
                              </div>
                              <div className="space-y-0.5 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-950 block">{feature.name}</span>
                                  {feature.id === 'copilot' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                                      Copilot Engine
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 font-normal leading-relaxed max-w-sm">
                                  {feature.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-1.5 text-zinc-600 text-[11px] font-medium select-none">
                              {getCategoryIcon(feature.category)}
                              <span>{feature.category}</span>
                            </div>
                          </td>

                          {/* AI Provider Selector / Display */}
                          <td className="p-4 align-middle">
                            {operationalModel === 'master_fixed' ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E8E6] bg-neutral-50/70 text-xs font-semibold text-zinc-900 w-fit">
                                <img 
                                  src={`/ai-providers/${logoMap[currentRoute.provider] || 'openai.svg'}`} 
                                  alt={currentRoute.provider} 
                                  className="h-3.5 w-3.5 object-contain"
                                />
                                <span className="capitalize">{currentRoute.provider}</span>
                                <Lock className="h-3 w-3 text-zinc-400 ml-1" />
                              </div>
                            ) : (
                              <div className="w-44 text-left">
                                <DropdownSelect
                                  value={currentRoute.provider}
                                  onChange={(val) => handleFeatureProviderChange(feature.id, val)}
                                  options={availableProvidersForRouting.map(p => ({
                                    value: p.slug,
                                    label: p.name,
                                    icon: (
                                      <img 
                                        src={`/ai-providers/${logoMap[p.slug] || 'openai.svg'}`} 
                                        alt={p.name} 
                                        className="h-3.5 w-3.5 object-contain"
                                      />
                                    ),
                                  }))}
                                />
                              </div>
                            )}
                          </td>

                          {/* Generative Model Selector / Display */}
                          <td className="p-4 align-middle">
                            {operationalModel === 'master_fixed' ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E8E6] bg-neutral-50/70 text-xs font-mono font-medium text-zinc-800 w-fit">
                                <Cpu className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                <span>{currentRoute.model || 'Default Model'}</span>
                              </div>
                            ) : (
                              <div className="w-52 text-left">
                                <DropdownSelect
                                  value={currentRoute.model}
                                  onChange={(val) => handleFeatureModelChange(feature.id, val)}
                                  options={availableModelsForSelectedProvider.map(m => ({
                                    value: m,
                                    label: m,
                                    icon: <Cpu className="h-3 w-3 text-zinc-400" />,
                                  }))}
                                />
                              </div>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI SAFEGUARDS & LIMITS (CUSTOMER CHAT THROTTLE & TOKEN CLAMPING)   */}
      {/* ========================================================================= */}
      {activeTab === 'safeguards' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          {/* Section 1: Customer Rate Limiting & Burst Protection */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('rateLimitingTitle') || 'Customer Chat Throttle (Burst Protection)'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('maxRequestsContact') || 'Customer Chat Throttle (Per Contact)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('maxRequestsContactHelp') || 'Individual customer rate throttle to prevent runaway loops and automated bot spam (Default: 10/min).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={safeguardsConfig.rate_limit_per_minute_contact}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, rate_limit_per_minute_contact: Math.max(1, parseInt(e.target.value, 10) || 1) }));
                      setHasUnsavedSafeguards(true);
                    }}
                    className="w-24 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">/min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Token Limits (Length & Cost Clamps) */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('tokenClampingTitle') || 'Token Limits (Length & Cost Clamps)'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              
              {/* Row 2.1: Input Prompt Context */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('maxInputTokens') || 'Max Input Context Tokens'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('maxInputTokensHelp') || 'Contexts exceeding this threshold are safely truncated from earlier conversation turns (Default: 2,500 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="100"
                    max="128000"
                    step="100"
                    value={safeguardsConfig.max_input_tokens}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, max_input_tokens: Math.max(100, parseInt(e.target.value, 10) || 100) }));
                      setHasUnsavedSafeguards(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

              {/* Row 2.2: Output Generation Tokens */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('maxOutputTokens') || 'Max Generation Output (max_tokens)'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('maxOutputTokensHelp') || 'Enforces concise answers and limits raw LLM cost per reply (Default: 500 tokens).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 pl-11 sm:pl-0">
                  <input
                    type="number"
                    min="50"
                    max="4096"
                    step="50"
                    value={safeguardsConfig.max_output_tokens}
                    onChange={(e) => {
                      setSafeguardsConfig(prev => ({ ...prev, max_output_tokens: Math.max(50, parseInt(e.target.value, 10) || 50) }));
                      setHasUnsavedSafeguards(true);
                    }}
                    className="w-28 h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">tokens</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Throttle Breach Action & Fallback Message */}
          <div className="space-y-2">
            <div className="select-none text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('breachAction') || 'Throttle Breach Handling'}
              </span>
            </div>

            <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs divide-y divide-[#F0F0F0] overflow-hidden">
              
              {/* Row 3.1: Breach Action */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-start gap-3 max-w-lg">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="h-4 w-4 text-zinc-700" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-zinc-950 block">
                      {t('breachAction') || 'When Limit is Reached'}
                    </span>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                      {t('breachActionHelp') || 'Determines response behavior when a contact reaches their limit.'}
                    </p>
                  </div>
                </div>
                <div className="w-56 text-left shrink-0 pl-11 sm:pl-0">
                  <DropdownSelect
                    value={safeguardsConfig.on_limit_breached_action}
                    onChange={(val) => {
                      setSafeguardsConfig(prev => ({ ...prev, on_limit_breached_action: val as 'block_fallback' | 'simulate_mock' }));
                      setHasUnsavedSafeguards(true);
                    }}
                    options={[
                      {
                        value: 'block_fallback',
                        label: t('breachBlockFallback') || 'Block & Send Fallback Message',
                        icon: <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />,
                      },
                      {
                        value: 'simulate_mock',
                        label: t('breachSimulateMock') || 'Simulate Mock Reply (Sandbox)',
                        icon: <Bot className="h-3.5 w-3.5 text-zinc-500" />,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Row 3.2: Fallback Message Textarea */}
              <div className="p-4 space-y-2 hover:bg-neutral-50/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-950">
                      {t('fallbackMessageLabel') || 'Throttled Fallback Message'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      ({safeguardsConfig.fallback_message.length} chars)
                    </span>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={safeguardsConfig.fallback_message}
                  onChange={(e) => {
                    setSafeguardsConfig(prev => ({ ...prev, fallback_message: e.target.value }));
                    setHasUnsavedSafeguards(true);
                  }}
                  placeholder={t('fallbackMessagePlaceholder') || 'Enter fallback message to deliver when limits are reached...'}
                  className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-normal text-zinc-900 focus:outline-none focus:border-black focus:bg-white transition-colors"
                />
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI & TOKEN TELEMETRY (REAL-TIME TRACKING & USAGE ANALYTICS)         */}
      {/* ========================================================================= */}
      {activeTab === 'telemetry' && (
        <div className="space-y-8 animate-fade-in text-left">
          {usageLoading && !summary ? (
            <SimpleLoader message="Loading AI usage telemetry..." />
          ) : (
            <>
              {/* 1. HERO KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Tokens */}
                <div className="p-5 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total AI Tokens</span>
                    <div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700">
                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-zinc-950 font-mono tracking-tight">
                      {(summary?.total_tokens || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                      <span>Prompt: <strong className="text-zinc-800">{(summary?.prompt_tokens || 0).toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Comp: <strong className="text-zinc-800">{(summary?.completion_tokens || 0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Estimated Cost */}
                <div className="p-5 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimated Cost</span>
                    <div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-zinc-950 font-mono tracking-tight">
                      ${(summary?.total_cost || 0).toFixed(4)}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 font-medium">
                      Standard inference token matrix pricing
                    </p>
                  </div>
                </div>

                {/* AI Invocations */}
                <div className="p-5 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">AI Invocations</span>
                    <div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700">
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-zinc-950 font-mono tracking-tight">
                      {(summary?.total_requests || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                      <span>Avg Latency: <strong className="text-zinc-800">{summary?.avg_latency_ms || 0}ms</strong></span>
                      <span>•</span>
                      <span>Success: <strong className="text-emerald-700">{summary?.success_rate || 100}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* Active Capabilities */}
                <div className="p-5 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Models</span>
                    <div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700">
                      <Cpu className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-zinc-950 font-mono tracking-tight">
                      {summary?.distinct_models || 0}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 font-medium">
                      Foundation models utilized in timeframe
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. CHARTS & CONSUMPTION BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left: Token Trajectory Daily Timeline (2 Cols) */}
                <div className="lg:col-span-2 p-6 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs flex flex-col justify-between space-y-4">
                  {/* Header & Mode Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Daily Token Trajectory</h4>
                        {trend.length > 0 && (
                          <span className="font-mono text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {trend.length} days
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium">Prompt vs completion token inflow across all operational nodes</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* View Mode Selector */}
                      <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-[#E8E8E6] self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setAiChartMode('stacked')}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-[5px] transition-all cursor-pointer ${
                            aiChartMode === 'stacked'
                              ? 'bg-white text-zinc-950 shadow-3xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          Stacked Bars
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiChartMode('area')}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-[5px] transition-all cursor-pointer ${
                            aiChartMode === 'area'
                              ? 'bg-white text-zinc-950 shadow-3xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          Area Flow
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiChartMode('cumulative')}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-[5px] transition-all cursor-pointer ${
                            aiChartMode === 'cumulative'
                              ? 'bg-white text-zinc-950 shadow-3xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          Cumulative
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics Strip */}
                  <div className="flex items-center gap-4 text-xs py-1 select-none font-mono flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Window Volume:</span>
                      <strong className="text-zinc-900 font-bold">{totalTrendTokens.toLocaleString()}</strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Daily Cadence:</span>
                      <strong className="text-zinc-900 font-bold">{dailyAvgTokens.toLocaleString()} / day</strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Peak Day:</span>
                      <strong className="text-zinc-900 font-bold">
                        {peakDay ? `${(peakDay.total_tokens || 0).toLocaleString()} (${peakDay.label})` : '0'}
                      </strong>
                    </div>
                    {totalTrendTokens > 0 && (
                      <>
                        <span className="text-zinc-200">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-400 font-medium">Ratio:</span>
                          <span className="text-emerald-600 font-semibold">{Math.round((totalTrendPrompt / totalTrendTokens) * 100)}% Prompt</span>
                          <span className="text-zinc-300">/</span>
                          <span className="text-indigo-600 font-semibold">{Math.round((totalTrendComp / totalTrendTokens) * 100)}% Comp</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Chart Canvas Area */}
                  <div className="w-full flex-1 min-h-[300px] h-[330px] pt-2">
                    {trend.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs font-medium space-y-2">
                        <Activity className="h-8 w-8 text-zinc-300 stroke-1" />
                        <span>No usage telemetry recorded in selected period.</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {aiChartMode === 'stacked' ? (
                          <BarChart data={trend} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                            <defs>
                              <linearGradient id="promptBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                              </linearGradient>
                              <linearGradient id="compBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.85} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                            <XAxis 
                              dataKey="label" 
                              tickLine={false} 
                              axisLine={{ stroke: '#E8E8E6' }} 
                              tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'monospace' }}
                              interval="preserveStartEnd"
                              minTickGap={20}
                            />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: '#A1A1AA', fontFamily: 'monospace' }}
                              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                              width={42}
                            />
                            <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="prompt_tokens" name="Prompt Tokens" stackId="tokens" fill="url(#promptBarGrad)" radius={[0, 0, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="completion_tokens" name="Completion Tokens" stackId="tokens" fill="url(#compBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                          </BarChart>
                        ) : aiChartMode === 'area' ? (
                          <AreaChart data={trend} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                            <defs>
                              <linearGradient id="promptAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                            <XAxis 
                              dataKey="label" 
                              tickLine={false} 
                              axisLine={{ stroke: '#E8E8E6' }} 
                              tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'monospace' }}
                              interval="preserveStartEnd"
                              minTickGap={20}
                            />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: '#A1A1AA', fontFamily: 'monospace' }}
                              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                              width={42}
                            />
                            <RechartsTooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="prompt_tokens" 
                              name="Prompt Tokens" 
                              stackId="1"
                              stroke="#10B981" 
                              strokeWidth={2} 
                              fill="url(#promptAreaGrad)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="completion_tokens" 
                              name="Completion Tokens" 
                              stackId="1"
                              stroke="#6366F1" 
                              strokeWidth={2} 
                              fill="url(#compAreaGrad)" 
                            />
                          </AreaChart>
                        ) : (
                          <AreaChart data={trend} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                            <defs>
                              <linearGradient id="cumAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                                <stop offset="60%" stopColor="#10B981" stopOpacity={0.08} />
                                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                            <XAxis 
                              dataKey="label" 
                              tickLine={false} 
                              axisLine={{ stroke: '#E8E8E6' }} 
                              tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'monospace' }}
                              interval="preserveStartEnd"
                              minTickGap={20}
                            />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: '#A1A1AA', fontFamily: 'monospace' }}
                              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                              width={42}
                            />
                            <RechartsTooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="cumulative_tokens" 
                              name="Cumulative Tokens" 
                              stroke="#10B981" 
                              strokeWidth={2.5} 
                              fill="url(#cumAreaGrad)" 
                              dot={false}
                              activeDot={{ r: 5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Bottom Legend Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0] text-[11px] text-zinc-500 font-medium">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Prompt Tokens (Input)
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-700">
                        <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                        Completion Tokens (Output)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">Timezone: UTC</span>
                  </div>
                </div>

                {/* Right: Model Breakdown (1 Col) */}
                <div className="p-6 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs flex flex-col justify-between space-y-4">
                  <div className="space-y-0.5 pb-3 border-b border-[#F0F0F0]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Model Distribution</h4>
                      <span className="font-mono text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {modelDistribution.length} models
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium">Token share by generative foundation model</p>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[350px] pr-1">
                    {modelDistribution.length === 0 ? (
                      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-zinc-400 text-xs font-medium space-y-2">
                        <Cpu className="h-8 w-8 text-zinc-300 stroke-1" />
                        <span>No models recorded yet.</span>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-1">
                        {modelDistribution.map((model, idx) => (
                          <div key={idx} className="space-y-1.5 p-2.5 rounded-lg bg-zinc-50/70 border border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-zinc-900 truncate max-w-[170px] font-mono text-[11px] font-bold" title={model.name}>
                                {model.name}
                              </span>
                              <span className="text-zinc-900 font-mono text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                                {model.percentage}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-200/80 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(model.percentage, 100)}%`, backgroundColor: model.color || '#10B981' }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
                              <span>{model.value.toLocaleString()} tokens</span>
                              <span>{model.requests} reqs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#F0F0F0] text-[10px] text-zinc-400 font-medium flex items-center justify-between">
                    <span>Ranked by cumulative token load</span>
                    <span className="font-mono">{summary?.distinct_models || 0} active</span>
                  </div>
                </div>
              </div>

              {/* 3. FEATURE CONSUMPTION MATRIX */}
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Feature Consumption Matrix</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Breakdown of AI token burn and costs across platform features</p>
                </div>

                <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                        <th className="p-4">Feature Capability</th>
                        <th className="p-4">Invocations</th>
                        <th className="p-4">Total Tokens</th>
                        <th className="p-4">Token Share</th>
                        <th className="p-4 text-right">Estimated Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-750">
                      {featureDistribution.map((item) => (
                        <tr key={item.key} className="hover:bg-neutral-50/40 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-zinc-950 block">{item.name}</span>
                            <span className="text-[11px] text-zinc-500 font-normal leading-relaxed">{item.description}</span>
                          </td>
                          <td className="p-4 text-zinc-800 font-mono">
                            {item.requests.toLocaleString()}
                          </td>
                          <td className="p-4 text-zinc-800 font-mono">
                            {item.total_tokens.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-zinc-600 font-mono">{item.percentage}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-zinc-950 font-bold">
                            ${item.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. LIVE INVOCATIONS TELEMETRY LOGS GRID */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Live AI Invocations Telemetry</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">Real-time execution log of generative LLM calls and token counts</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filter invocations..."
                      value={logsSearch}
                      onChange={(e) => {
                        setLogsSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-8 pl-8 pr-3 bg-white border border-[#E8E8E6] rounded-lg text-xs focus:outline-none focus:border-black font-medium transition-colors shadow-3xs"
                    />
                  </div>
                </div>

                <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Capability</th>
                        <th className="p-4">Provider & Model</th>
                        <th className="p-4">Tokens (Prompt / Comp)</th>
                        <th className="p-4">Latency</th>
                        <th className="p-4">Cost</th>
                        <th className="p-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-750">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-400 font-medium text-xs">
                            No execution telemetry logs found.
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => {
                          const logoFile = logoMap[log.provider.toLowerCase()] || 'openai.svg';
                          const isSuccess = log.status === 'success';

                          return (
                            <tr key={log.id} className="hover:bg-neutral-50/40 transition-colors">
                              {/* Timestamp */}
                              <td className="p-4 text-zinc-500 text-[11px] font-mono whitespace-nowrap">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                              </td>

                              {/* Capability */}
                              <td className="p-4 font-bold text-zinc-950">
                                {log.feature_label}
                              </td>

                              {/* Provider & Model */}
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded bg-zinc-50 border border-zinc-150 p-0.5 flex items-center justify-center shrink-0">
                                    <img 
                                      src={`/ai-providers/${logoFile}`} 
                                      alt={log.provider} 
                                      className="h-full w-full object-contain filter grayscale-[10%]" 
                                    />
                                  </div>
                                  <span className="font-mono text-[11px] text-zinc-800 truncate max-w-[140px]">{log.model}</span>
                                </div>
                              </td>

                              {/* Tokens */}
                              <td className="p-4 font-mono text-[11px] text-zinc-800">
                                <strong>{log.total_tokens.toLocaleString()}</strong> ({log.prompt_tokens.toLocaleString()} / {log.completion_tokens.toLocaleString()})
                              </td>

                              {/* Latency */}
                              <td className="p-4 text-[11px] font-mono text-zinc-600">
                                {log.latency_ms}ms
                              </td>

                              {/* Cost */}
                              <td className="p-4 text-[11px] font-mono text-zinc-900 font-bold">
                                ${log.estimated_cost.toFixed(5)}
                              </td>

                              {/* Status with Lucide Icons */}
                              <td className="p-4 text-right">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  isSuccess ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                  {isSuccess ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Success</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Failed</span>
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Footer (10 items per page limit) */}
                  {filteredLogs.length > pageSize && (
                    <div className="p-4 bg-neutral-50/70 border-t border-[#E8E8E6] flex items-center justify-between text-xs text-zinc-500 font-medium select-none">
                      <span>Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-md border border-[#E8E8E6] bg-white hover:bg-zinc-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-zinc-700" />
                        </button>
                        <span className="px-2 font-semibold text-zinc-800">Page {currentPage} of {totalPages}</span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-md border border-[#E8E8E6] bg-white hover:bg-zinc-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* EDIT CONFIG DIALOG MODAL */}
      {mounted && selectedSlug && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <form 
            onSubmit={handleSaveConfig}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <img 
                    src={`/ai-providers/${logoMap[selectedSlug] || 'openai.svg'}`} 
                    alt={`${providers[selectedSlug].name} logo`} 
                    className="h-full w-full object-contain filter grayscale-[10%]" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('configureProviderTitle', { provider: providers[selectedSlug].name })}
                  </h3>
                  <a 
                    href={providers[selectedSlug].website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-black hover:underline flex items-center gap-0.5 mt-0.5"
                  >
                    {t('getApiCredentialsKey')} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedSlug(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 pt-4">
              {/* API Key Input */}
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('apiKeyLabel')} {providers[selectedSlug].is_configured && t('configuredLabel')}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  <input 
                    type={showKey && apiKey !== '••••••••••••••••••••••••' ? "text" : "password"}
                    placeholder={providers[selectedSlug].is_configured ? '••••••••••••••••••••••••' : t('apiKeyPlaceholder')}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full h-9 pl-9 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        if (apiKey === '••••••••••••••••••••••••') {
                          toast.info(t('toasts.securityApiKeyNotice'));
                        } else {
                          setShowKey(!showKey);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                    >
                      {showKey && apiKey !== '••••••••••••••••••••••••' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-[#A0A0A0]">
                  {t('keyEncryptionNote')}
                </p>
              </div>

              {/* Enabled Models List with Switches (Shown in Manage mode) */}
              {providers[selectedSlug].is_configured && (providers[selectedSlug].models || []).length > 0 && (
                <div className="space-y-2 text-left font-sans animate-fade-in">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('enabledModels')}
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto bg-zinc-50 border border-[#E8E8E6]/60 p-3 rounded-lg divide-y divide-zinc-200/50">
                    {(providers[selectedSlug].models || []).map((model) => {
                      const isEnabled = enabledModels.includes(model);
                      return (
                        <div key={model} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                          <span className="text-[11px] font-semibold text-zinc-800">{model}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEnabled) {
                                if (enabledModels.length <= 1) {
                                  toast.warning(t('toasts.atLeastOneModel'));
                                  return;
                                }
                                const nextEnabled = enabledModels.filter(m => m !== model);
                                setEnabledModels(nextEnabled);
                                if (defaultModel === model || !nextEnabled.includes(defaultModel)) {
                                  setDefaultModel(nextEnabled[0] || '');
                                }
                              } else {
                                const nextEnabled = [...enabledModels, model];
                                setEnabledModels(nextEnabled);
                                if (!defaultModel || !nextEnabled.includes(defaultModel)) {
                                  setDefaultModel(nextEnabled[0] || '');
                                }
                              }
                            }}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Default Model Selector (Shown in Manage mode) */}
              {providers[selectedSlug].is_configured && enabledModels.length > 0 && (
                <div className="space-y-1.5 text-left font-sans animate-fade-in">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('defaultModel')}
                  </label>
                  <DropdownSelect
                    options={enabledModels.map(m => ({ value: m, label: m }))}
                    value={enabledModels.includes(defaultModel) ? defaultModel : (enabledModels[0] || '')}
                    onChange={(val) => setDefaultModel(val)}
                    placeholder={t('selectDefaultModel')}
                  />
                </div>
              )}
            </div>

            {/* Footer action strip nested with off-white bg fill */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
              <div>
                {providers[selectedSlug].is_configured && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteSlug(selectedSlug);
                      setSelectedSlug(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="h-4 w-4" /> {t('disconnectKey')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlug(null)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? t('connecting') : t('connect')}
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* CUSTOM CONFIRM DELETE DIALOG MODAL */}
      {confirmDeleteSlug && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('disconnectProviderTitle')}</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConfirmDeleteSlug(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('disconnectProviderConfirmText', { provider: providers[confirmDeleteSlug]?.name })}
              </p>
            </div>

            {/* Footer buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDeleteSlug(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteConfig(confirmDeleteSlug);
                  setConfirmDeleteSlug(null);
                }}
                className="bg-red-650 hover:bg-red-750 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer h-9 px-4 flex items-center justify-center"
              >
                {t('disconnect')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
