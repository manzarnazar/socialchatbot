/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { 
  Bot, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw, 
  Sparkles, 
  Play, 
  Terminal, 
  Clock, 
  ShieldAlert, 
  Activity, 
  Database,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Radio,
  Sliders,
  Send,
  Zap,
  ShoppingBag,
  Package,
  Truck,
  ShoppingCart,
  Tag,
  Link2,
  ShieldCheck,
  CheckCircle2,
  Store,
  Layers
} from 'lucide-react';
import { useHeaderStore } from '@/store/useHeaderStore';

interface KnowledgeBaseItem {
  id: number;
  name: string;
  description?: string;
  total_chunks?: number;
}

interface ChannelItem {
  id: number;
  channel_type: string;
  name: string;
  phone_number?: string;
  is_connected: boolean;
}

interface EcommerceConnectionItem {
  id: string | number;
  platform: string;
  store_url: string;
  status: string;
  products_count?: number;
  orders_count?: number;
}

interface ChatbotItem {
  id: number;
  name: string;
  avatar?: string | null;
  description?: string | null;
  system_prompt: string;
  temperature: number;
  ai_provider_config_id?: number | null;
  provider?: string | null;
  model?: string | null;
  provider_name?: string;
  knowledge_base_id?: number | null;
  ecommerce_connection_id?: number | null;
  ecommerce_settings?: {
    enabled?: boolean;
    enable_catalog_search?: boolean;
    enable_stock_check?: boolean;
    enable_order_tracking?: boolean;
    enable_cart_recovery?: boolean;
    enable_discount_generation?: boolean;
    enable_instant_checkout?: boolean;
    order_verification_mode?: 'phone_or_email' | 'strict';
    max_discount_percent?: number;
    discount_code_prefix?: string;
  } | null;
  status: 'active' | 'inactive';
  business_hours?: Record<string, { is_open: boolean; open: string; close: string }> | null;
  fallback_message?: string | null;
  handoff_rules?: Record<string, any> | null;
  channels?: ChannelItem[];
  knowledge_base?: KnowledgeBaseItem | null;
  ecommerce_connection?: EcommerceConnectionItem | null;
  created_at: string;
}

interface ChatbotLogItem {
  id: number;
  ai_chatbot_id: number;
  conversation_id?: number | null;
  channel_type: string;
  inbound_text: string;
  outbound_text: string;
  rag_sources?: any;
  tool_calls?: any;
  tokens_used: number;
  latency_ms: number;
  status: string;
  error_details?: string | null;
  created_at: string;
}

const getChannelIcon = (type: string) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('whatsapp') || normalized.includes('baileys')) return '/channels/whatsapp.webp';
  if (normalized.includes('telegram')) return '/channels/telegram.webp';
  if (normalized.includes('messenger') || normalized.includes('facebook')) return '/channels/messenger.webp';
  if (normalized.includes('instagram')) return '/channels/instagram.svg';
  if (normalized.includes('tiktok')) return '/channels/tiktok.webp';
  if (normalized.includes('linkedin')) return '/channels/linkedin.svg';
  if (normalized.includes('twilio') || normalized.includes('vonage') || normalized.includes('plivo') || normalized.includes('sms')) return '/channels/sms.svg';
  if (normalized.includes('email') || normalized.includes('smtp') || normalized.includes('resend')) return '/channels/email.svg';
  return '/channels/whatsapp.webp';
};

export default function AiChatbotPage() {
  const t = useTranslations('Chatbot');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [chatbots, setChatbots] = useState<ChatbotItem[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [ecommerceConnections, setEcommerceConnections] = useState<EcommerceConnectionItem[]>([]);
  const [providerData, setProviderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // List view search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form View state: 'list' | 'create' | 'edit'
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingChatbot, setEditingChatbot] = useState<ChatbotItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [selectedProviderConfigId, setSelectedProviderConfigId] = useState<string>('');
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState<Record<string, { is_open: boolean; open: string; close: string }>>({
    monday: { is_open: true, open: '09:00', close: '18:00' },
    tuesday: { is_open: true, open: '09:00', close: '18:00' },
    wednesday: { is_open: true, open: '09:00', close: '18:00' },
    thursday: { is_open: true, open: '09:00', close: '18:00' },
    friday: { is_open: true, open: '09:00', close: '18:00' },
    saturday: { is_open: false, open: '09:00', close: '18:00' },
    sunday: { is_open: false, open: '09:00', close: '18:00' },
  });

  // E-Commerce Intelligence Form States
  const [ecommerceEnabled, setEcommerceEnabled] = useState<boolean>(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [enableCatalogSearch, setEnableCatalogSearch] = useState<boolean>(true);
  const [enableStockCheck, setEnableStockCheck] = useState<boolean>(true);
  const [enableOrderTracking, setEnableOrderTracking] = useState<boolean>(true);
  const [enableCartRecovery, setEnableCartRecovery] = useState<boolean>(true);
  const [enableDiscountGeneration, setEnableDiscountGeneration] = useState<boolean>(true);
  const [enableInstantCheckout, setEnableInstantCheckout] = useState<boolean>(true);
  const [orderVerificationMode, setOrderVerificationMode] = useState<'phone_or_email' | 'strict'>('phone_or_email');
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(15);
  const [discountCodePrefix, setDiscountCodePrefix] = useState<string>('CHATAI');

  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteChatbotId, setDeleteChatbotId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle confirmation
  const [statusToggleChatbot, setStatusToggleChatbot] = useState<ChatbotItem | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Logs modal
  const [activeLogChatbot, setActiveLogChatbot] = useState<ChatbotItem | null>(null);
  const [logs, setLogs] = useState<ChatbotLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Sandbox Test Modal
  const [sandboxChatbot, setSandboxChatbot] = useState<ChatbotItem | null>(null);
  const [sandboxQuery, setSandboxQuery] = useState('');
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const { setCustomHeader } = useHeaderStore();

  useEffect(() => {
    setMounted(true);
    loadAllData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteChatbotId(null);
        setStatusToggleChatbot(null);
        setSandboxChatbot(null);
        setActiveLogChatbot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (view === 'list') {
      setCustomHeader(null);
    } else {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setView('list')}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowRight className="h-4.5 w-4.5 stroke-[2.5] rotate-180" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {view === 'create' ? t('createChatbot') : t('editChatbot')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('form.chatbot-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={saving}
              className="bg-black text-white hover:bg-neutral-800 h-8 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>{view === 'edit' ? t('updateChatbot') : t('deployChatbot')}</span>
            </button>
          </div>
        </header>
      );
    }
    return () => {
      setCustomHeader(null);
    };
  }, [view, saving, setCustomHeader, t, tCommon]);

  // Quick Prompt Library Templates
  const promptTemplates = [
    {
      label: t('templateSupportLabel'),
      prompt: t('templateSupportPrompt'),
    },
    {
      label: t('templateEcommerceLabel') || '🛍️ E-Commerce Sales & Store Support',
      prompt: t('templateEcommercePrompt') || 'You are our automated E-Commerce Sales & Support Assistant. You have direct, live access to our store catalog, real-time stock counts, order shipments, and cart recovery. Help shoppers find products within their budget, check live inventory, look up tracking numbers for orders, recover abandoned carts, and generate discount promo codes upon request.',
    },
    {
      label: t('templateSalesLabel'),
      prompt: t('templateSalesPrompt'),
    },
    {
      label: t('templateBookingLabel'),
      prompt: t('templateBookingPrompt'),
    },
    {
      label: t('templateFaqLabel'),
      prompt: t('templateFaqPrompt'),
    },
  ];

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [chatbotsRes, kbRes, channelsRes, providerRes, storesRes] = await Promise.all([
        fetchWithCsrf('/chatbot'),
        fetchWithCsrf('/knowledge-bases'),
        fetchWithCsrf('/channels'),
        fetchWithCsrf('/chatbot/provider-configs'),
        fetchWithCsrf('/ecommerce/stores')
      ]);

      if (chatbotsRes.ok) {
        const data = await chatbotsRes.json();
        setChatbots(data || []);
      }
      if (kbRes.ok) {
        const data = await kbRes.json();
        setKnowledgeBases(data.data || data || []);
      }
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        const rawList = Array.isArray(data) ? data : (data.connections || data.data || []);
        const filtered = rawList.filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const type = (c.channel_type || '').toLowerCase();
          return !name.includes('mock') && !name.includes('simulated') && type !== 'mock';
        });
        setChannels(filtered);
      }
      if (providerRes.ok) {
        const data = await providerRes.json();
        setProviderData(data);
      }
      if (storesRes.ok) {
        const sdata = await storesRes.json();
        const conns = sdata.connections || sdata.data || [];
        setEcommerceConnections(conns);
      }
    } catch (err: any) {
      toast.error(t('toastLoadParamsFailed') + (err.message ? ': ' + err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setEditingChatbot(null);
    setName('');
    setDescription('');
    setSystemPrompt(t('defaultSystemPrompt'));
    setTemperature(0.7);
    setSelectedProvider(providerData?.platform_default?.provider_name || 'groq');
    setSelectedModel(providerData?.platform_default?.model || 'llama-3.3-70b-versatile');
    setSelectedProviderConfigId('');
    setSelectedKbId(knowledgeBases.length > 0 ? String(knowledgeBases[0].id) : '');
    setSelectedChannelIds([]);
    setFormStatus('active');
    setFallbackMessage(t('defaultFallbackMessage'));
    setBusinessHoursEnabled(false);

    // E-Commerce Defaults
    setEcommerceEnabled(true);
    setSelectedStoreId('');
    setEnableCatalogSearch(true);
    setEnableStockCheck(true);
    setEnableOrderTracking(true);
    setEnableCartRecovery(true);
    setEnableDiscountGeneration(true);
    setEnableInstantCheckout(true);
    setOrderVerificationMode('phone_or_email');
    setMaxDiscountPercent(15);
    setDiscountCodePrefix('CHATAI');

    setView('create');
  };

  const handleOpenEditForm = (bot: ChatbotItem) => {
    setEditingChatbot(bot);
    setName(bot.name);
    setDescription(bot.description || '');
    setSystemPrompt(bot.system_prompt);
    setTemperature(bot.temperature || 0.7);
    setSelectedProvider(bot.provider || 'groq');
    setSelectedModel(bot.model || 'llama-3.3-70b-versatile');
    setSelectedProviderConfigId(bot.ai_provider_config_id ? String(bot.ai_provider_config_id) : '');
    setSelectedKbId(bot.knowledge_base_id ? String(bot.knowledge_base_id) : '');
    setSelectedChannelIds(bot.channels?.map(c => Number(c.id)) || []);
    setFormStatus(bot.status);
    setFallbackMessage(bot.fallback_message || '');
    setBusinessHoursEnabled(Boolean(bot.business_hours));
    if (bot.business_hours) {
      setBusinessHours(bot.business_hours);
    }

    // Populate E-Commerce Settings
    const ecom = bot.ecommerce_settings;
    setEcommerceEnabled(ecom?.enabled ?? true);
    setSelectedStoreId(bot.ecommerce_connection_id ? String(bot.ecommerce_connection_id) : '');
    setEnableCatalogSearch(ecom?.enable_catalog_search ?? true);
    setEnableStockCheck(ecom?.enable_stock_check ?? true);
    setEnableOrderTracking(ecom?.enable_order_tracking ?? true);
    setEnableCartRecovery(ecom?.enable_cart_recovery ?? true);
    setEnableDiscountGeneration(ecom?.enable_discount_generation ?? true);
    setEnableInstantCheckout(ecom?.enable_instant_checkout ?? true);
    setOrderVerificationMode(ecom?.order_verification_mode ?? 'phone_or_email');
    setMaxDiscountPercent(ecom?.max_discount_percent ?? 15);
    setDiscountCodePrefix(ecom?.discount_code_prefix || 'CHATAI');

    setView('edit');
  };

  const handleSaveChatbot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('toastNameRequired'));
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error(t('toastPromptRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        system_prompt: systemPrompt.trim(),
        temperature: Number(temperature),
        ai_provider_config_id: selectedProviderConfigId ? Number(selectedProviderConfigId) : null,
        provider: selectedProvider,
        model: selectedModel,
        knowledge_base_id: selectedKbId ? Number(selectedKbId) : null,
        ecommerce_connection_id: selectedStoreId ? Number(selectedStoreId) : null,
        ecommerce_settings: {
          enabled: ecommerceEnabled,
          enable_catalog_search: enableCatalogSearch,
          enable_stock_check: enableStockCheck,
          enable_order_tracking: enableOrderTracking,
          enable_cart_recovery: enableCartRecovery,
          enable_discount_generation: enableDiscountGeneration,
          enable_instant_checkout: enableInstantCheckout,
          order_verification_mode: orderVerificationMode,
          max_discount_percent: Number(maxDiscountPercent) || 15,
          discount_code_prefix: discountCodePrefix.trim() || 'CHATAI',
        },
        status: formStatus,
        channel_ids: selectedChannelIds,
        fallback_message: fallbackMessage.trim() || null,
        business_hours: businessHoursEnabled ? businessHours : null,
      };

      const url = editingChatbot ? `/chatbot/${editingChatbot.id}` : '/chatbot';
      const method = editingChatbot ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('toastSaveFailed'));
      }

      toast.success(editingChatbot ? t('toastChatbotUpdated') : t('toastChatbotCreated'));
      setView('list');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || t('toastSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChatbot = async () => {
    if (!deleteChatbotId) return;
    setDeleting(true);
    try {
      const res = await fetchWithCsrf(`/chatbot/${deleteChatbotId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('toastDeleteFailed'));
      }
      toast.success(t('toastChatbotDeleted'));
      setDeleteChatbotId(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || t('toastDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusToggleChatbot) return;
    setTogglingStatus(true);
    const newStatus = statusToggleChatbot.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetchWithCsrf(`/chatbot/${statusToggleChatbot.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('toastToggleStatusFailed'));
      }
      toast.success(t('toastStatusChanged', { status: newStatus }));
      setStatusToggleChatbot(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || t('toastToggleStatusFailed'));
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleOpenLogs = async (bot: ChatbotItem) => {
    setActiveLogChatbot(bot);
    setLoadingLogs(true);
    try {
      const res = await fetchWithCsrf(`/chatbot/${bot.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || data || []);
      }
    } catch (err: any) {
      toast.error(t('toastLoadLogsFailed'));
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRunSandboxTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxChatbot || !sandboxQuery.trim()) return;
    setSandboxLoading(true);
    setSandboxResponse(null);
    try {
      const res = await fetchWithCsrf(`/chatbot/${sandboxChatbot.id}/test`, {
        method: 'POST',
        body: JSON.stringify({ query: sandboxQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || t('toastTestQueryFailed'));
      }
      setSandboxResponse(data);
    } catch (err: any) {
      toast.error(err.message || t('toastTestQueryFailed'));
      setSandboxResponse({ error: err.message });
    } finally {
      setSandboxLoading(false);
    }
  };

  const toggleChannelSelection = (id: number) => {
    const numId = Number(id);
    setSelectedChannelIds(prev => {
      const numericPrev = prev.map(Number);
      return numericPrev.includes(numId)
        ? numericPrev.filter(cId => cId !== numId)
        : [...numericPrev, numId];
    });
  };

  // Filtered chatbots for list view
  const filteredChatbots = chatbots.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (b.model && b.model.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Dynamic model options based on selected provider
  const availableModels = providerData?.models_by_provider?.[selectedProvider] || [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
  ];

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col min-h-0 flex-1">
      
      {/* 1. DIRECTORY LIST VIEW */}
      {view === 'list' && (
        <div className="w-full p-8 space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
          
          {/* Action Bar (Search & Filters) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
            
            {/* Left Search Filters */}
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-[6px] text-xs font-medium placeholder-zinc-400 focus:outline-none focus:border-black bg-[#F5F5F5] transition-colors"
                />
              </div>

              <DropdownSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: t('allStatus') },
                  { value: 'active', label: t('activeOnly') },
                  { value: 'inactive', label: t('inactiveOnly') },
                ]}
                className="w-32"
              />

              <button 
                onClick={loadAllData}
                className="flex items-center justify-center p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
                title={t('refreshChatbots')}
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Right Action Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('createChatbot')}</span>
              </button>
            </div>
          </div>

          {/* Table Directory Content */}
          {loading ? (
            <div className="py-12">
              <SimpleLoader fullScreen={false} borderless={true} message={t('loadingChatbots')} />
            </div>
          ) : filteredChatbots.length === 0 ? (
            <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white shadow-3xs animate-fade-in flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                <Bot className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">{t('noChatbotsTitle')}</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
                {t('noChatbotsDesc')}
              </p>
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] text-white rounded-[6px] text-xs font-bold shadow-sm hover:bg-zinc-900 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('createFirstChatbot')}</span>
              </button>
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                      <th className="px-6 py-3.5">{t('colChatbotProfile')}</th>
                      <th className="px-6 py-3.5">{t('colKnowledgeBase')}</th>
                      <th className="px-6 py-3.5">{t('colConnectedChannels')}</th>
                      <th className="px-6 py-3.5">{t('colStatus')}</th>
                      <th className="px-6 py-3.5 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E6] text-zinc-700 font-medium">
                    {filteredChatbots.map((bot) => (
                      <tr key={bot.id} className="hover:bg-[#FAFAFA] transition-colors">
                        
                        {/* Name & Persona */}
                        <td className="px-6 py-4 max-w-[240px]">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-9 w-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                              <Bot className="h-4.5 w-4.5 text-zinc-800" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-zinc-955 font-bold text-xs truncate max-w-[150px]">{bot.name}</span>
                                {bot.ecommerce_settings?.enabled && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/80 text-amber-800 text-[9px] font-bold">
                                    <ShoppingBag className="h-2.5 w-2.5 text-amber-600" />
                                    {bot.ecommerce_connection ? (bot.ecommerce_connection.store_url || bot.ecommerce_connection.platform) : 'E-Com'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 font-normal truncate block max-w-[180px]">
                                {bot.description || t('defaultDescription')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Knowledge Base */}
                        <td className="px-6 py-4">
                            {bot.knowledge_base ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-primary/10 border border-primary/25 text-primary text-[10px] font-bold">
                                <Database className="h-3 w-3 text-primary" />
                                {bot.knowledge_base.name}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px] font-medium italic">{t('noKnowledgeBasePromptOnly')}</span>
                            )}
                          </td>

                          {/* Connected Channels */}
                          <td className="px-6 py-4">
                            {(!bot.channels || bot.channels.length === 0) ? (
                              <span className="text-zinc-400 text-[11px] italic">{t('noChannelsLinked')}</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                                {bot.channels.map(ch => (
                                  <span
                                    key={ch.id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#F5F5F5] border border-[#E8E8E6] text-zinc-800 text-[11px] font-semibold"
                                    title={ch.name || ch.channel_type}
                                  >
                                    <img
                                      src={getChannelIcon(ch.channel_type)}
                                      alt={ch.channel_type}
                                      className="h-3.5 w-3.5 object-contain shrink-0"
                                    />
                                    <span className="max-w-[120px] truncate">{ch.name || ch.channel_type}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Status Toggle Switch */}
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => setStatusToggleChatbot(bot)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                bot.status === 'active' ? 'bg-primary' : 'bg-zinc-200'
                              }`}
                              title={bot.status === 'active' ? t('deactivateChatbot') : t('activateChatbot')}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  bot.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSandboxChatbot(bot);
                                  setSandboxQuery('');
                                  setSandboxResponse(null);
                                }}
                                title={t('testInSandbox')}
                                className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-colors cursor-pointer"
                              >
                                <Terminal className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenLogs(bot)}
                                title={t('viewActivityLogs')}
                                className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-colors cursor-pointer"
                              >
                                <Activity className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditForm(bot)}
                                title={t('editChatbot')}
                                className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteChatbotId(bot.id)}
                                title={t('deleteChatbot')}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          )}
        </div>
      )}

      {/* 2. CREATE & EDIT STUDIO (FULL-WIDTH SECTIONS WITH 32px CONTENT PADDING) */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={handleSaveChatbot} className="chatbot-form w-full bg-white animate-fade-in select-none flex-1 overflow-y-auto">
          <div className="w-full">
            
            {/* Section 1: Basic Information */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('basicSettings')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('basicSettingsDesc')}
                </p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('chatbotName')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('chatbotNamePlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('descriptionOptional')}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('initialStatus')}</label>
                  <DropdownSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    options={[
                      { value: 'active', label: t('statusActiveLive') },
                      { value: 'inactive', label: t('statusInactivePaused') },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Persona & Instructions */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('personaInstructions')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('personaInstructionsDesc')}
                </p>
                
                {/* Prebuilt Templates Quick Chips */}
                <div className="mt-4 pt-4 border-t border-[#E8E8E6] space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">{t('quickPromptTemplates')}</span>
                  <div className="flex flex-col gap-1.5">
                    {promptTemplates.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSystemPrompt(item.prompt)}
                        className="text-left text-[11px] text-zinc-600 hover:text-black hover:bg-zinc-100 px-2 py-1 rounded-[5px] border border-zinc-200/60 font-medium transition-colors cursor-pointer truncate"
                      >
                        ⚡ {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-4">
                
                {/* System Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('systemPromptLabel')}</label>
                    <span className="text-[10px] text-zinc-400 font-mono">{t('charsCount', { count: systemPrompt.length })}</span>
                  </div>
                  <textarea
                    rows={7}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={t('systemPromptPlaceholder')}
                    className="w-full p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-y leading-relaxed"
                    required
                  />
                </div>

                {/* Temperature Slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{t('creativityTemperature', { temp: temperature })}</label>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {temperature <= 0.3 ? t('tempDeterministic') : temperature <= 0.7 ? t('tempBalanced') : t('tempCreative')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Section 3: Knowledge Base (RAG Context) */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('knowledgeBaseRag')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('knowledgeBaseRagDesc')}
                </p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('attachedKnowledgeBase')}</label>
                  <DropdownSelect
                    value={selectedKbId}
                    onChange={(val) => setSelectedKbId(val)}
                    placeholder={t('noKbPromptOnlyPlaceholder')}
                    options={[
                      { value: '', label: t('noneDirectPromptOnly') },
                      ...knowledgeBases.map(kb => ({
                        value: String(kb.id),
                        label: `${kb.name} (${t('chunksCount', { count: kb.total_chunks || 0 })})`,
                      }))
                    ]}
                  />
                </div>

                {selectedKbId && (
                  <div className="p-3.5 bg-primary/10 border border-primary/25 rounded-lg flex items-center gap-3">
                    <Database className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-[11px] text-zinc-800 font-medium">
                      {t('kbExplanation')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3.5: E-Commerce & Store Intelligence */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">{t('ecommerceIntelligence') || 'E-Commerce & Store Intelligence'}</h3>
                </div>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('ecommerceIntelligenceDesc') || 'Equip this AI Chatbot with real-time access to your store products, live inventory counts, order shipment tracking, and automated cart recovery.'}
                </p>
                {ecommerceConnections.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-900 text-[11px] font-bold">
                      <Store className="h-3.5 w-3.5 text-amber-600" />
                      <span>{ecommerceConnections.length} Connected Store{ecommerceConnections.length > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      Live catalog syncing active.
                    </span>
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-5">
                {/* Master Switch */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg select-none">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block">{t('enableEcommerce') || 'Enable E-Commerce Automation'}</label>
                    <span className="text-[11px] text-zinc-400">{t('enableEcommerceDesc') || 'Allow this ChatBot to invoke live store tools for product recommendations, inventory checks, order status, and checkout links.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEcommerceEnabled(!ecommerceEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      ecommerceEnabled ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        ecommerceEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {ecommerceEnabled && (
                  <>
                    {/* Store Selector */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('targetStore') || 'Target Store Connection'}</label>
                      <DropdownSelect
                        value={selectedStoreId}
                        onChange={(val) => setSelectedStoreId(val)}
                        options={[
                          { value: '', label: t('allStores') || 'All Connected Stores (Shopify & WooCommerce)' },
                          ...ecommerceConnections.map(c => ({
                            value: String(c.id),
                            label: `${c.platform.toUpperCase()} (${c.store_url || 'Connected Store'})`,
                          }))
                        ]}
                      />
                    </div>

                    {/* Capability Switchboard Matrix */}
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('ecommerceCapabilities') || 'AI Store Capabilities & Tools'}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        
                        {/* 1. Catalog Search */}
                        <div 
                          onClick={() => setEnableCatalogSearch(!enableCatalogSearch)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableCatalogSearch ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <ShoppingBag className={`h-4 w-4 mt-0.5 shrink-0 ${enableCatalogSearch ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capCatalogSearch') || 'Product Catalog & Search'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capCatalogSearchDesc') || 'Search products, prices, and specs in real time.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableCatalogSearch ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableCatalogSearch && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                        {/* 2. Stock Check */}
                        <div 
                          onClick={() => setEnableStockCheck(!enableStockCheck)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableStockCheck ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Package className={`h-4 w-4 mt-0.5 shrink-0 ${enableStockCheck ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capStockCheck') || 'Live Stock & Inventory'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capStockCheckDesc') || 'Check real-time stock and low-inventory warnings.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableStockCheck ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableStockCheck && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                        {/* 3. Order Tracking */}
                        <div 
                          onClick={() => setEnableOrderTracking(!enableOrderTracking)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableOrderTracking ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Truck className={`h-4 w-4 mt-0.5 shrink-0 ${enableOrderTracking ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capOrderTracking') || 'Order Tracking & Shipment'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capOrderTrackingDesc') || 'Look up orders and live courier tracking links.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableOrderTracking ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableOrderTracking && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                        {/* 4. Cart Recovery */}
                        <div 
                          onClick={() => setEnableCartRecovery(!enableCartRecovery)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableCartRecovery ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <ShoppingCart className={`h-4 w-4 mt-0.5 shrink-0 ${enableCartRecovery ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capCartRecovery') || 'Cart Recovery Assistant'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capCartRecoveryDesc') || 'Detect unpurchased carts and offer recovery links.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableCartRecovery ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableCartRecovery && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                        {/* 5. Discounts */}
                        <div 
                          onClick={() => setEnableDiscountGeneration(!enableDiscountGeneration)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableDiscountGeneration ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Tag className={`h-4 w-4 mt-0.5 shrink-0 ${enableDiscountGeneration ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capDiscounts') || 'Dynamic Promo Coupons'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capDiscountsDesc') || 'Issue discount promo codes within configured caps.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableDiscountGeneration ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableDiscountGeneration && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                        {/* 6. Checkout Links */}
                        <div 
                          onClick={() => setEnableInstantCheckout(!enableInstantCheckout)}
                          className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition-all ${
                            enableInstantCheckout ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' : 'bg-[#FAFAFA] border-[#E8E8E6] opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Link2 className={`h-4 w-4 mt-0.5 shrink-0 ${enableInstantCheckout ? 'text-black' : 'text-zinc-400'}`} />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block">{t('capCheckoutLinks') || '1-Click Direct Checkout Links'}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{t('capCheckoutLinksDesc') || 'Send instant purchase links with pre-applied discounts.'}</span>
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            enableInstantCheckout ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {enableInstantCheckout && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Guardrails Section */}
                    <div className="p-4 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{t('guardrailsTitle') || 'Safety Guardrails & Policies'}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('maxDiscountPercent') || 'Max Allowed Discount %'}</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={maxDiscountPercent}
                            onChange={(e) => setMaxDiscountPercent(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                            className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs font-medium focus:outline-none focus:border-black"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('discountCodePrefix') || 'Coupon Code Prefix'}</label>
                          <input
                            type="text"
                            value={discountCodePrefix}
                            onChange={(e) => setDiscountCodePrefix(e.target.value.toUpperCase())}
                            className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs font-medium focus:outline-none focus:border-black font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Channel Binding */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('channelBinding')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('channelBindingDesc')}
                </p>
              </div>
              <div className="col-span-2 space-y-4">
                {channels.length === 0 ? (
                  <div className="p-4 border border-dashed border-zinc-200 rounded-lg text-center">
                    <p className="text-xs text-zinc-400 font-medium">{t('noActiveChannels')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {channels.map((ch) => {
                      const isSelected = selectedChannelIds.map(Number).includes(Number(ch.id));
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleChannelSelection(ch.id)}
                          className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-zinc-50 border-black ring-1 ring-black shadow-xs' 
                              : 'bg-[#FAFAFA] border-[#E8E8E6] hover:border-zinc-350'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0 p-1.5 shadow-3xs">
                              <img src={getChannelIcon(ch.channel_type)} alt={ch.channel_type} className="h-5 w-5 object-contain" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-900 block truncate">{ch.name || ch.channel_type}</span>
                              <span className="text-[10px] text-zinc-400 font-mono uppercase">{ch.channel_type}</span>
                            </div>
                          </div>
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                            isSelected ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Safeguards & Business Hours */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('businessHoursSafeguards')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('businessHoursSafeguardsDesc')}
                </p>
              </div>
              <div className="col-span-2 space-y-5">
                
                {/* Toggle Enable */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg select-none">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block">{t('enableBusinessHoursGating')}</label>
                    <span className="text-[11px] text-zinc-400">{t('businessHoursGatingDesc')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBusinessHoursEnabled(!businessHoursEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      businessHoursEnabled ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        businessHoursEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Fallback Message Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('fallbackMessageLabel')}</label>
                  <textarea
                    rows={2}
                    value={fallbackMessage}
                    onChange={(e) => setFallbackMessage(e.target.value)}
                    placeholder={t('fallbackMessagePlaceholder')}
                    className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                  />
                </div>

                {/* Days Schedule Matrix if enabled */}
                {businessHoursEnabled && (
                  <div className="border border-[#E8E8E6] rounded-lg overflow-hidden bg-white divide-y divide-[#E8E8E6] select-none">
                    {Object.entries(businessHours).map(([day, config]) => (
                      <div key={day} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 w-36">
                          <button
                            type="button"
                            onClick={() => setBusinessHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day], is_open: !prev[day].is_open }
                            }))}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              config.is_open ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                config.is_open ? 'translate-x-3.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="font-bold text-zinc-800 capitalize">{t(day as any) || day}</span>
                        </div>
                        {config.is_open ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={config.open}
                              onChange={(e) => setBusinessHours(prev => ({
                                ...prev,
                                [day]: { ...prev[day], open: e.target.value }
                              }))}
                              className="px-2 py-1 bg-[#F5F5F5] border border-[#E8E8E6] rounded text-xs font-mono font-medium focus:outline-none focus:border-black"
                            />
                            <span className="text-zinc-400 text-[10px]">{t('timeTo')}</span>
                            <input
                              type="time"
                              value={config.close}
                              onChange={(e) => setBusinessHours(prev => ({
                                ...prev,
                                [day]: { ...prev[day], close: e.target.value }
                              }))}
                              className="px-2 py-1 bg-[#F5F5F5] border border-[#E8E8E6] rounded text-xs font-mono font-medium focus:outline-none focus:border-black"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">{t('closed')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

          </div>
        </form>
      )}      {/* 3. SANDBOX PLAYGROUND TEST MODAL */}
      {sandboxChatbot && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setSandboxChatbot(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-2xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Terminal className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('sandboxSimulatorTitle', { name: sandboxChatbot.name })}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSandboxChatbot(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
              {/* Quick E-Commerce & Knowledge Test Prompts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                <span className="text-[10px] text-zinc-400 font-bold uppercase shrink-0">{t('quickTest')}</span>
                {[
                  { icon: '🛍️', text: t('testPromptCatalog') },
                  { icon: '📦', text: t('testPromptStock') },
                  { icon: '🚚', text: t('testPromptOrder') },
                  { icon: '🎟️', text: t('testPromptDiscount') },
                  { icon: '💳', text: t('testPromptCheckout') }
                ].map((pill, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSandboxQuery(pill.text)}
                    className="shrink-0 text-[10px] px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md font-medium transition-colors cursor-pointer border border-zinc-200/60 flex items-center gap-1"
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.text}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleRunSandboxTest} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">{t('inboundTestQuery')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sandboxQuery}
                      onChange={(e) => setSandboxQuery(e.target.value)}
                      placeholder={t('sandboxQueryPlaceholder')}
                      className="flex-1 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      disabled={sandboxLoading || !sandboxQuery.trim()}
                      className="flex items-center gap-1.5 px-4 h-9 bg-black text-white hover:bg-neutral-800 rounded-md text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {sandboxLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span>{t('sendQuery')}</span>
                    </button>
                  </div>
                </div>
              </form>

              {sandboxResponse && (
                <div className="space-y-3 pt-2">
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200 pb-1.5">
                      <span>{t('aiModelResponse')}</span>
                      <span>{t('latency', { ms: sandboxResponse.latency_ms })}</span>
                    </div>
                    <p className="text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap">
                      {sandboxResponse.reply || sandboxResponse.error}
                    </p>
                  </div>

                  {/* Real-time Executed Tool Calls */}
                  {sandboxResponse.tool_calls && sandboxResponse.tool_calls.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-600" />
                        {t('executedTools', { count: sandboxResponse.tool_calls.length }) || `Executed Real-Time Tools (${sandboxResponse.tool_calls.length}):`}
                      </span>
                      <div className="space-y-2">
                        {sandboxResponse.tool_calls.map((tc: any, idx: number) => (
                          <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center justify-between font-mono font-bold text-amber-950">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                ⚡ Tool Invoked: <span className="underline">{tc.name}</span>
                              </span>
                            </div>
                            {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                              <div className="text-[11px] text-zinc-600 font-mono bg-white/80 p-2 rounded border border-amber-200/40">
                                <span className="font-semibold text-zinc-500 block text-[10px] uppercase">{t('toolArguments') || 'Arguments:'}</span>
                                <pre className="text-[10px] text-zinc-700 whitespace-pre-wrap">{JSON.stringify(tc.arguments, null, 2)}</pre>
                              </div>
                            )}
                            {tc.result && (
                              <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50/70 p-2 rounded border border-emerald-200/50">
                                <span className="font-semibold text-emerald-600 block text-[10px] uppercase">{t('toolOutput') || 'Live Output:'}</span>
                                <pre className="text-[10px] text-emerald-900 whitespace-pre-wrap">{typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : String(tc.result)}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sandboxResponse.matched_sources && sandboxResponse.matched_sources.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {t('matchedKbSources', { count: sandboxResponse.matched_sources.length })}
                      </span>
                      <div className="space-y-1">
                        {sandboxResponse.matched_sources.map((src: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-white border border-[#E8E8E6] rounded text-[11px] text-zinc-600 font-mono">
                            <span className="font-bold text-zinc-900 block">{src.source}</span>
                            <span className="text-zinc-500 text-[10px]">{src.snippet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none">
              <span className="text-xs font-semibold text-[#6B6B6B]">{t('modelLabel', { model: sandboxChatbot.model || 'Default' })}</span>
              <button
                type="button"
                onClick={() => setSandboxChatbot(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. ACTIVITY LOGS MODAL */}
      {activeLogChatbot && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setActiveLogChatbot(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-2xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('executionLogsTitle', { name: activeLogChatbot.name })}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveLogChatbot(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
              {loadingLogs ? (
                <div className="py-12 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400 font-medium">
                  {t('noLogsRecorded')}
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <img src={getChannelIcon(log.channel_type)} alt={log.channel_type} className="h-3.5 w-3.5 object-contain shrink-0" />
                          <span className="capitalize">{log.channel_type}</span>
                        </span>
                        <span>{new Date(log.created_at).toLocaleString(locale)} • {log.latency_ms}ms • {t('tokens', { count: log.tokens_used })}</span>
                      </div>
                      <div className="space-y-1 pt-1">
                        <div className="text-[11px] text-zinc-700">
                          <strong className="text-zinc-500">{t('inbound')} </strong> {log.inbound_text}
                        </div>
                        <div className="text-[11px] text-zinc-900 bg-primary/10 p-2.5 rounded border border-primary/25">
                          <strong>{t('reply')} </strong> {log.outbound_text || log.error_details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none">
              <span className="text-xs font-semibold text-[#6B6B6B]">{t('totalRecordedTurns', { count: logs.length })}</span>
              <button
                type="button"
                onClick={() => setActiveLogChatbot(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. DELETE CONFIRMATION ALERT DIALOG */}
      {deleteChatbotId && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteChatbotId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('deleteConfirm')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteChatbotId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="pt-4 space-y-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteWarning')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteChatbotId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteChatbot}
                disabled={deleting}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 gap-1.5"
              >
                {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{t('deleteConfirmBtn')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. STATUS TOGGLE CONFIRMATION ALERT DIALOG */}
      {statusToggleChatbot && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setStatusToggleChatbot(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {statusToggleChatbot.status === 'active' ? t('deactivateChatbotTitle') : t('activateChatbotTitle')}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusToggleChatbot(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="pt-4 space-y-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {statusToggleChatbot.status === 'active' ? t('deactivateDesc') : t('activateDesc')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setStatusToggleChatbot(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className="bg-black text-white hover:bg-neutral-800 h-9 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {togglingStatus && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{statusToggleChatbot.status === 'active' ? t('deactivateConfirm') : t('activateConfirm')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
