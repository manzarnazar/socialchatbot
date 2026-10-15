'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Plus, 
  RefreshCw, 
  Settings2, 
  Trash2, 
  Archive, 
  Inbox, 
  X, 
  ArrowLeft,
  Coins,
  Users,
  Send,
  Zap,
  Sparkles,
  Bot,
  Workflow, 
  Check, 
  Database, 
  ExternalLink,
  Building2,
  Store,
  ShoppingBag,
  ShoppingCart,
  Package,
  Receipt,
  Target,
  Layers,
  MessageSquare,
  Radio,
  Megaphone,
  ShieldCheck,
  Clock,
  Lock
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { toast } from 'sonner';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';

interface PlanPrice {
  currency_id: number;
  amount: number;
  billing_interval: string;
  currency?: {
    code: string;
    symbol: string;
    name?: string;
  };
}

interface Plan {
  id: number;
  name: string;
  description: string | null;
  stripe_product_id: string | null;
  trial_days: number;
  max_workspaces: number;
  max_team_members: number;
  max_campaigns: number;
  max_integrations: number;
  allowed_integrations?: string[] | null;
  own_crm_access: boolean;
  max_channels: number;
  allowed_channels?: Record<string, number | boolean> | null;
  max_automations: number;
  flow_credits: number;
  copilot_credits?: number;
  monthly_ai_tokens?: number;
  has_flow_templates?: boolean;
  max_ecommerce_stores?: number;
  max_ecommerce_products?: number;
  monthly_ecommerce_orders?: number;
  has_abandoned_cart_recovery?: boolean;
  has_whatsapp_checkout?: boolean;
  max_meta_ad_accounts?: number;
  max_meta_campaigns?: number;
  has_click_to_whatsapp_ads?: boolean;
  has_meta_lead_sync?: boolean;
  monthly_messages_limit?: number;
  sort_order: number;
  is_active: boolean;
  deleted_at?: string | null;
  prices: PlanPrice[];
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name?: string;
  is_active: boolean;
  is_default?: boolean;
}

const AVAILABLE_CHANNELS = [
  { 
    key: 'whatsapp', 
    name: 'WhatsApp Cloud API', 
    desc: 'Official Meta Cloud API messaging line', 
    logo: '/channels/whatsapp.webp', 
    defaultMax: 2 
  },
  { 
    key: 'whatsapp_baileys', 
    name: 'WhatsApp Baileys', 
    desc: 'Unofficial QR session connection line', 
    logo: '/channels/whatsapp.webp', 
    defaultMax: 1 
  },
  { 
    key: 'telegram', 
    name: 'Telegram Bot', 
    desc: 'Telegram Bot API bots integration', 
    logo: '/channels/telegram.webp', 
    defaultMax: 5 
  },
  { 
    key: 'instagram', 
    name: 'Instagram Direct', 
    desc: 'Instagram Business direct messaging', 
    logo: '/channels/instagram.svg', 
    defaultMax: 2 
  },
  { 
    key: 'messenger', 
    name: 'Facebook Messenger', 
    desc: 'Facebook Page Messenger channels', 
    logo: '/channels/messenger.webp', 
    defaultMax: 2 
  },
  { 
    key: 'sms', 
    name: 'SMS Gateways', 
    desc: 'Twilio, Telnyx & Plivo SMS numbers', 
    logo: '/channels/sms.svg', 
    defaultMax: 2 
  },
  { 
    key: 'email', 
    name: 'Email SMTP / Resend', 
    desc: 'SMTP, IMAP & Resend mail accounts', 
    logo: '/channels/email.svg', 
    defaultMax: 2 
  },
  { 
    key: 'tiktok', 
    name: 'TikTok', 
    desc: 'TikTok Direct Messaging & Content Publishing', 
    logo: '/channels/tiktok.webp', 
    defaultMax: 2 
  },
  { 
    key: 'linkedin', 
    name: 'LinkedIn', 
    desc: 'Official LinkedIn OAuth 2.0 & Content Publishing', 
    logo: '/channels/linkedin.png', 
    defaultMax: 2 
  },
];

const AVAILABLE_INTEGRATIONS = [
  { 
    key: 'google_sheets', 
    name: 'Google Sheets', 
    desc: 'Spreadsheet contacts import & live sync', 
    logo: '/google_sheets.webp',
  },
  { 
    key: 'google_calendar', 
    name: 'Google Calendar', 
    desc: 'Meeting bookings and automated calendar event sync', 
    logo: '/google_calendar.webp',
  },
  { 
    key: 'shopify', 
    name: 'Shopify Store', 
    desc: 'E-commerce orders & cart recovery sync', 
    logo: '/shopify.webp',
  },
  { 
    key: 'woocommerce', 
    name: 'WooCommerce', 
    desc: 'WordPress shop catalog & checkout sync', 
    logo: '/woocommerce.webp',
  },
  { 
    key: 'zoom', 
    name: 'Zoom Meetings', 
    desc: 'Automated video appointment links', 
    logo: '/zoom.webp',
  },
  { 
    key: 'teams', 
    name: 'Microsoft Teams', 
    desc: 'Team meeting links & scheduling sync', 
    logo: '/teams.webp',
  },
  { 
    key: 'hubspot', 
    name: 'HubSpot CRM', 
    desc: 'Bi-directional contacts & deals sync', 
    logo: '/hubspot.png',
  },
  { 
    key: 'salesforce', 
    name: 'Salesforce CRM', 
    desc: 'Enterprise lead & pipeline sync', 
    logo: '/salesforce.webp',
  },
  { 
    key: 'zoho', 
    name: 'Zoho CRM', 
    desc: 'Customer relationship data & lead sync', 
    logo: '/zoho_crm.png',
  },
  { 
    key: 'zapier', 
    name: 'Zapier Webhooks', 
    desc: 'Connect 5,000+ apps via webhooks', 
    logo: '/zapier.webp',
  },
  { 
    key: 'n8n', 
    name: 'n8n Automations', 
    desc: 'Self-hosted workflow automations', 
    logo: '/n8n.webp',
  },
];

// Helper to render channel logo
const renderChannelLogo = (key: string, className = "h-5 w-5") => {
  switch (key) {
    case 'whatsapp':
    case 'whatsapp_baileys':
      return <img src="/channels/whatsapp.webp" alt="WhatsApp" className={`${className} object-contain`} />;
    case 'telegram':
      return <img src="/channels/telegram.webp" alt="Telegram" className={`${className} object-contain`} />;
    case 'instagram':
      return <img src="/channels/instagram.svg" alt="Instagram" className={`${className} object-contain`} />;
    case 'messenger':
      return <img src="/channels/messenger.webp" alt="Messenger" className={`${className} object-contain`} />;
    case 'sms':
      return <img src="/channels/sms.svg" alt="SMS" className={`${className} object-contain`} />;
    case 'email':
      return <img src="/channels/email.svg" alt="Email" className={`${className} object-contain`} />;
    case 'tiktok':
      return <img src="/channels/tiktok.webp" alt="TikTok" className={`${className} object-contain`} />;
    case 'linkedin':
      return <img src="/channels/linkedin.png" alt="LinkedIn" className={`${className} object-contain`} />;
    default:
      return null;
  }
};

// Helper to render single integration logo
const renderIntegrationLogo = (key: string, className = "h-5 w-5") => {
  const found = AVAILABLE_INTEGRATIONS.find(i => i.key === key);
  if (!found) return null;
  return <img src={found.logo} alt={found.name} className={`${className} object-contain`} />;
};

// Helper to resolve effective allowed channels for a plan
const getPlanAllowedChannels = (allowedChannels?: Record<string, any> | null): string[] => {
  if (!allowedChannels || typeof allowedChannels !== 'object' || Object.keys(allowedChannels).length === 0) {
    return AVAILABLE_CHANNELS.map(c => c.key);
  }
  const enabledKeys = Object.keys(allowedChannels).filter(k => {
    const val = allowedChannels[k];
    return val !== false && val !== 0 && val !== undefined;
  });
  return enabledKeys.length > 0 ? enabledKeys : AVAILABLE_CHANNELS.map(c => c.key);
};

// Helper to resolve effective allowed individual integration keys for a plan
const getPlanAllowedIntegrations = (allowedIntegrations?: string[] | null): string[] => {
  if (!allowedIntegrations || !Array.isArray(allowedIntegrations) || allowedIntegrations.length === 0) {
    return AVAILABLE_INTEGRATIONS.map(i => i.key);
  }

  const expandedKeys = new Set<string>();
  allowedIntegrations.forEach(key => {
    if (key === 'ecommerce') {
      expandedKeys.add('shopify');
      expandedKeys.add('woocommerce');
    } else if (key === 'meetings') {
      expandedKeys.add('zoom');
      expandedKeys.add('teams');
    } else if (key === 'crm') {
      expandedKeys.add('hubspot');
      expandedKeys.add('salesforce');
      expandedKeys.add('zoho');
    } else if (key === 'webhooks') {
      expandedKeys.add('zapier');
      expandedKeys.add('n8n');
    } else {
      if (AVAILABLE_INTEGRATIONS.some(i => i.key === key)) {
        expandedKeys.add(key);
      }
    }
  });

  return Array.from(expandedKeys);
};

export default function PlansPage() {
  const t = useTranslations('Superadmin');
  const { setCustomHeader } = useHeaderStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'archived'>('active');
  const [mounted, setMounted] = useState(false);

  // Selected plan state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trialDays, setTrialDays] = useState(0);
  const [maxWorkspaces, setMaxWorkspaces] = useState(1);
  const [maxTeamMembers, setMaxTeamMembers] = useState(5);
  const [maxCampaigns, setMaxCampaigns] = useState(10);
  const [maxIntegrations, setMaxIntegrations] = useState(5);
  const [ownCrmAccess, setOwnCrmAccess] = useState(false);
  const [maxChannels, setMaxChannels] = useState(2);
  const [maxAutomations, setMaxAutomations] = useState(5);
  const [flowCredits, setFlowCredits] = useState(50);
  const [copilotCredits, setCopilotCredits] = useState(100);
  const [monthlyAiTokens, setMonthlyAiTokens] = useState(100000);
  const [sortOrder, setSortOrder] = useState(0);
  const [planPrices, setPlanPrices] = useState<Record<number, string>>({}); // currency_id -> monthly amount (string)
  const [planPricesYearly, setPlanPricesYearly] = useState<Record<number, string>>({}); // currency_id -> yearly amount (string)
  const [isActiveState, setIsActiveState] = useState(false);

  // Granular settings
  const [allowedChannels, setAllowedChannels] = useState<Record<string, { enabled: boolean; max: number }>>({});
  const [allowedIntegrations, setAllowedIntegrations] = useState<string[]>([]);
  const [hasFlowTemplates, setHasFlowTemplates] = useState<boolean>(true);

  // E-Commerce caps & features
  const [maxEcommerceStores, setMaxEcommerceStores] = useState(1);
  const [maxEcommerceProducts, setMaxEcommerceProducts] = useState(100);
  const [monthlyEcommerceOrders, setMonthlyEcommerceOrders] = useState(100);
  const [hasAbandonedCartRecovery, setHasAbandonedCartRecovery] = useState(false);
  const [hasWhatsAppCheckout, setHasWhatsAppCheckout] = useState(false);

  // Meta Ads caps & features
  const [maxMetaAdAccounts, setMaxMetaAdAccounts] = useState(1);
  const [maxMetaCampaigns, setMaxMetaCampaigns] = useState(2);
  const [hasClickToWhatsAppAds, setHasClickToWhatsAppAds] = useState(false);
  const [hasMetaLeadSync, setHasMetaLeadSync] = useState(false);

  // Message quota cap (-1 for unlimited)
  const [monthlyMessagesLimit, setMonthlyMessagesLimit] = useState<number>(-1);

  const [defaultCurrency, setDefaultCurrency] = useState('');
  const primaryCurrency = currencies.find(c => c.is_default) || currencies.find(c => c.code === defaultCurrency) || currencies[0] || null;

  // Status transitions
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete & Archive Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'archive' | 'unarchive' | 'delete' | 'deactivate'>('archive');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);

  const fetchPlansAndCurrencies = async () => {
    setLoading(true);
    try {
      const [plansRes, currenciesRes] = await Promise.all([
        fetchWithCsrf('/admin/plans'),
        fetchWithCsrf('/admin/currencies'),
      ]);

      if (plansRes.ok && currenciesRes.ok) {
        const plansData = await plansRes.json();
        const currenciesData = await currenciesRes.json();

        setPlans(plansData.plans || []);
        if (plansData.default_currency) {
          setDefaultCurrency(plansData.default_currency);
        }
        
        const activeCurrencies = (currenciesData.currencies || []).filter((c: Currency) => c.is_active);
        setCurrencies(activeCurrencies);
      }
    } catch {
      toast.error(t('plans.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchPlansAndCurrencies();
  }, []);

  // Sync Header elements
  useEffect(() => {
    if (view === 'list') {
      setCustomHeader(null);
    } else {
      const title = view === 'create' ? t('plans.createPlan') : t('plans.editPlan', { name: selectedPlan?.name || '' });

      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => {
                setView('list');
                setSelectedPlan(null);
              }}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setSelectedPlan(null);
              }}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('dashboard.cancel')}
            </button>
            {view === 'create' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCreateOrUpdatePlan(undefined, false)}
                  disabled={formLoading}
                  className="border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                >
                  {formLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-550" />}
                  <span>{t('plans.saveAsDraft')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateOrUpdatePlan(undefined, true)}
                  disabled={formLoading}
                  className="h-9 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {formLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span>{t('plans.publish')}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCreateOrUpdatePlan()}
                disabled={formLoading}
                className="h-9 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {formLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{t('dashboard.saveChanges')}</span>
              </button>
            )}
          </div>
        </header>
      );
    }

    return () => {
      setCustomHeader(null);
    };
  }, [
    view,
    formLoading,
    selectedPlan,
    name,
    description,
    trialDays,
    maxTeamMembers,
    maxCampaigns,
    maxIntegrations,
    ownCrmAccess,
    maxChannels,
    maxAutomations,
    flowCredits,
    monthlyAiTokens,
    sortOrder,
    planPrices,
    planPricesYearly,
    isActiveState,
    allowedChannels,
    allowedIntegrations,
    hasFlowTemplates,
    maxEcommerceStores,
    maxEcommerceProducts,
    monthlyEcommerceOrders,
    hasAbandonedCartRecovery,
    hasWhatsAppCheckout,
    monthlyMessagesLimit
  ]);

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setTrialDays(0);
    setMaxTeamMembers(5);
    setMaxCampaigns(10);
    setMaxIntegrations(5);
    setOwnCrmAccess(false);
    setMaxChannels(2);
    setMaxAutomations(5);
    setFlowCredits(50);
    setCopilotCredits(100);
    setMonthlyAiTokens(100000);
    setMonthlyMessagesLimit(-1);
    setSortOrder(0);
    setIsActiveState(false);

    // Initial granular channels
    const initialChannels: Record<string, { enabled: boolean; max: number }> = {};
    AVAILABLE_CHANNELS.forEach(ch => {
      initialChannels[ch.key] = { enabled: true, max: ch.defaultMax };
    });
    setAllowedChannels(initialChannels);

    // Initial individual integrations (all enabled by default)
    setAllowedIntegrations(AVAILABLE_INTEGRATIONS.map(i => i.key));

    // Initial flow templates access
    setHasFlowTemplates(true);

    // Initial E-Commerce caps
    setMaxEcommerceStores(1);
    setMaxEcommerceProducts(100);
    setMonthlyEcommerceOrders(100);
    setHasAbandonedCartRecovery(false);
    setHasWhatsAppCheckout(false);

    // Initial Meta Ads caps
    setMaxMetaAdAccounts(1);
    setMaxMetaCampaigns(2);
    setHasClickToWhatsAppAds(false);
    setHasMetaLeadSync(false);

    // Initial Message Quota Cap
    setMonthlyMessagesLimit(-1);

    const initialPrices: Record<number, string> = {};
    const initialPricesYearly: Record<number, string> = {};
    currencies.forEach(curr => {
      initialPrices[curr.id] = '';
      initialPricesYearly[curr.id] = '';
    });
    setPlanPrices(initialPrices);
    setPlanPricesYearly(initialPricesYearly);

    setView('create');
  };

  const handleOpenEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setTrialDays(plan.trial_days);
    setMaxWorkspaces(plan.max_workspaces ?? 1);
    setMaxTeamMembers(plan.max_team_members);
    setMaxCampaigns(plan.max_campaigns);
    setMaxIntegrations(plan.max_integrations);
    setOwnCrmAccess(plan.own_crm_access);
    setMaxChannels(plan.max_channels);
    setMaxAutomations(plan.max_automations);
    setFlowCredits(plan.flow_credits ?? 50);
    setCopilotCredits(plan.copilot_credits ?? 100);
    setMonthlyAiTokens(plan.monthly_ai_tokens ?? 100000);
    setSortOrder(plan.sort_order);
    setIsActiveState(plan.is_active);

    // Channels configuration
    const initialChannels: Record<string, { enabled: boolean; max: number }> = {};
    const existingAllowed = plan.allowed_channels;
    AVAILABLE_CHANNELS.forEach(ch => {
      if (existingAllowed && typeof existingAllowed === 'object') {
        const val = existingAllowed[ch.key];
        const isEnabled = val !== undefined && val !== false && val !== 0;
        const maxVal = typeof val === 'number' ? val : (typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : ch.defaultMax);
        initialChannels[ch.key] = { enabled: isEnabled, max: maxVal };
      } else {
        // Fallback for legacy plans
        initialChannels[ch.key] = { enabled: true, max: ch.defaultMax };
      }
    });
    setAllowedChannels(initialChannels);

    // Integrations configuration (expanding any legacy group keys to individual keys)
    if (plan.allowed_integrations && Array.isArray(plan.allowed_integrations)) {
      const rawList = plan.allowed_integrations;
      const expandedKeys = new Set<string>();
      
      rawList.forEach(key => {
        if (key === 'ecommerce') {
          expandedKeys.add('shopify');
          expandedKeys.add('woocommerce');
        } else if (key === 'meetings') {
          expandedKeys.add('zoom');
          expandedKeys.add('teams');
          expandedKeys.add('google_calendar');
        } else if (key === 'google') {
          expandedKeys.add('google_sheets');
          expandedKeys.add('google_calendar');
        } else if (key === 'crm') {
          expandedKeys.add('hubspot');
          expandedKeys.add('salesforce');
          expandedKeys.add('zoho');
        } else if (key === 'webhooks') {
          expandedKeys.add('zapier');
          expandedKeys.add('n8n');
        } else {
          expandedKeys.add(key);
        }
      });
      setAllowedIntegrations(Array.from(expandedKeys));
    } else {
      setAllowedIntegrations(AVAILABLE_INTEGRATIONS.map(i => i.key));
    }

    // Templates access
    setHasFlowTemplates(plan.has_flow_templates !== false);

    // E-Commerce caps & features
    setMaxEcommerceStores(plan.max_ecommerce_stores ?? 1);
    setMaxEcommerceProducts(plan.max_ecommerce_products ?? 100);
    setMonthlyEcommerceOrders(plan.monthly_ecommerce_orders ?? 100);
    setHasAbandonedCartRecovery(plan.has_abandoned_cart_recovery ?? false);
    setHasWhatsAppCheckout(plan.has_whatsapp_checkout ?? false);

    // Meta Ads caps & features
    setMaxMetaAdAccounts(plan.max_meta_ad_accounts ?? 1);
    setMaxMetaCampaigns(plan.max_meta_campaigns ?? 2);
    setHasClickToWhatsAppAds(plan.has_click_to_whatsapp_ads ?? false);
    setHasMetaLeadSync(plan.has_meta_lead_sync ?? false);

    // Message quota cap
    setMonthlyMessagesLimit(plan.monthly_messages_limit !== undefined && plan.monthly_messages_limit !== null ? plan.monthly_messages_limit : -1);

    const initialPrices: Record<number, string> = {};
    const initialPricesYearly: Record<number, string> = {};
    currencies.forEach(curr => {
      const monthlyMatch = plan.prices.find(p => p.currency_id === curr.id && p.billing_interval === 'month');
      const yearlyMatch = plan.prices.find(p => p.currency_id === curr.id && p.billing_interval === 'year');
      initialPrices[curr.id] = monthlyMatch ? String(monthlyMatch.amount / 100) : '0';
      initialPricesYearly[curr.id] = yearlyMatch ? String(yearlyMatch.amount / 100) : '0';
    });
    setPlanPrices(initialPrices);
    setPlanPricesYearly(initialPricesYearly);

    setView('edit');
  };

  const handleCreateOrUpdatePlan = async (e?: React.FormEvent, overrideActive?: boolean) => {
    if (e) e.preventDefault();
    setFormLoading(true);

    try {
      const pricesPayload: any[] = [];
      currencies.forEach(curr => {
        const monthlyVal = planPrices[curr.id] !== undefined && planPrices[curr.id] !== '' ? planPrices[curr.id] : '0';
        const yearlyVal = planPricesYearly[curr.id] !== undefined && planPricesYearly[curr.id] !== '' ? planPricesYearly[curr.id] : '0';
        const existingMonthly = selectedPlan?.prices?.find(p => p.currency_id === curr.id && p.billing_interval === 'month');
        const existingYearly = selectedPlan?.prices?.find(p => p.currency_id === curr.id && p.billing_interval === 'year');
        pricesPayload.push({
          currency_id: curr.id,
          amount: Math.round(Number(monthlyVal) * 100),
          billing_interval: 'month',
          paddle_price_id: (existingMonthly as any)?.paddle_price_id || undefined,
        });
        pricesPayload.push({
          currency_id: curr.id,
          amount: Math.round(Number(yearlyVal) * 100),
          billing_interval: 'year',
          paddle_price_id: (existingYearly as any)?.paddle_price_id || undefined,
        });
      });

      // Channels payload: map enabled channel keys to their numeric connection limit (-1 = unlimited)
      const channelsPayload: Record<string, number> = {};
      Object.entries(allowedChannels).forEach(([key, conf]) => {
        if (conf.enabled) {
          const num = Number(conf.max);
          channelsPayload[key] = num === -1 ? -1 : Math.max(1, num || 1);
        }
      });

      const body = {
        name,
        description: description || null,
        trial_days: trialDays,
        max_workspaces: maxWorkspaces,
        max_team_members: maxTeamMembers,
        max_campaigns: maxCampaigns,
        max_integrations: maxIntegrations,
        allowed_integrations: allowedIntegrations,
        own_crm_access: ownCrmAccess,
        max_channels: maxChannels,
        allowed_channels: channelsPayload,
        has_flow_templates: hasFlowTemplates,
        max_automations: maxAutomations,
        flow_credits: flowCredits,
        copilot_credits: copilotCredits,
        monthly_ai_tokens: monthlyAiTokens,
        max_ecommerce_stores: maxEcommerceStores,
        max_ecommerce_products: maxEcommerceProducts,
        monthly_ecommerce_orders: monthlyEcommerceOrders,
        has_abandoned_cart_recovery: hasAbandonedCartRecovery,
        has_whatsapp_checkout: hasWhatsAppCheckout,
        max_meta_ad_accounts: maxMetaAdAccounts,
        max_meta_campaigns: maxMetaCampaigns,
        has_click_to_whatsapp_ads: hasClickToWhatsAppAds,
        has_meta_lead_sync: hasMetaLeadSync,
        monthly_messages_limit: monthlyMessagesLimit,
        sort_order: sortOrder,
        is_active: overrideActive !== undefined ? overrideActive : isActiveState,
        prices: pricesPayload,
      };

      const url = view === 'create' ? '/admin/plans' : `/admin/plans/${selectedPlan?.id}`;
      const method = view === 'create' ? 'POST' : 'PUT';

      const response = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(view === 'create' ? t('plans.messages.createSuccess') : t('plans.messages.updateSuccess'));
        setView('list');
        setSelectedPlan(null);
        fetchPlansAndCurrencies();
      } else {
        throw new Error(data.message || 'Verification failed.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('plans.messages.createFailed');
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const executeToggleActive = async (plan: Plan) => {
    setActionLoadingId(plan.id);
    try {
      const response = await fetchWithCsrf(`/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          trial_days: plan.trial_days,
          max_team_members: plan.max_team_members,
          max_campaigns: plan.max_campaigns,
          max_integrations: plan.max_integrations,
          allowed_integrations: plan.allowed_integrations,
          own_crm_access: plan.own_crm_access,
          max_channels: plan.max_channels,
          allowed_channels: plan.allowed_channels,
          has_flow_templates: plan.has_flow_templates !== false,
          max_automations: plan.max_automations,
          flow_credits: plan.flow_credits ?? 50,
          copilot_credits: plan.copilot_credits ?? 100,
          monthly_ai_tokens: plan.monthly_ai_tokens ?? 100000,
          max_ecommerce_stores: plan.max_ecommerce_stores ?? 1,
          max_ecommerce_products: plan.max_ecommerce_products ?? 100,
          monthly_ecommerce_orders: plan.monthly_ecommerce_orders ?? 100,
          has_abandoned_cart_recovery: plan.has_abandoned_cart_recovery ?? false,
          has_whatsapp_checkout: plan.has_whatsapp_checkout ?? false,
          max_meta_ad_accounts: plan.max_meta_ad_accounts ?? 1,
          max_meta_campaigns: plan.max_meta_campaigns ?? 2,
          has_click_to_whatsapp_ads: plan.has_click_to_whatsapp_ads ?? false,
          has_meta_lead_sync: plan.has_meta_lead_sync ?? false,
          monthly_messages_limit: plan.monthly_messages_limit ?? -1,
          sort_order: plan.sort_order,
          paddle_product_id: (plan as any).paddle_product_id || undefined,
          prices: plan.prices.map(p => ({
            currency_id: p.currency_id,
            amount: p.amount,
            billing_interval: p.billing_interval,
            paddle_price_id: (p as any).paddle_price_id || undefined,
          }))
        }),
      });

      if (response.ok) {
        toast.success(t('plans.messages.updateSuccess'));
        fetchPlansAndCurrencies();
      } else {
        throw new Error();
      }
    } catch {
      toast.error(t('plans.messages.updateFailed'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActiveState = async (plan: Plan) => {
    if (plan.is_active) {
      setConfirmPlan(plan);
      setConfirmType('deactivate');
      setIsConfirmOpen(true);
      return;
    }
    await executeToggleActive(plan);
  };

  const handleConfirmAction = async () => {
    if (!confirmPlan) return;
    setActionLoadingId(confirmPlan.id);
    setIsConfirmOpen(false);

    try {
      if (confirmType === 'deactivate') {
        await executeToggleActive(confirmPlan);
      } else {
        let url = `/admin/plans/${confirmPlan.id}`;
        let method = 'DELETE'; // default for permanent delete

        if (confirmType === 'archive') {
          url = `/admin/plans/${confirmPlan.id}/archive`;
          method = 'POST';
        } else if (confirmType === 'unarchive') {
          url = `/admin/plans/${confirmPlan.id}/unarchive`;
          method = 'POST';
        }

        const response = await fetchWithCsrf(url, { method });
        if (response.ok) {
          toast.success(
            confirmType === 'archive' ? t('plans.messages.archiveSuccess') :
            confirmType === 'unarchive' ? t('plans.messages.unarchiveSuccess') :
            t('plans.messages.deleteSuccess')
          );
          fetchPlansAndCurrencies();
        } else {
          throw new Error();
        }
      }
    } catch {
      toast.error(
        confirmType === 'archive' ? t('plans.messages.archiveFailed') :
        confirmType === 'unarchive' ? t('plans.messages.unarchiveFailed') :
        confirmType === 'deactivate' ? t('plans.messages.updateFailed') :
        t('plans.messages.deleteFailed')
      );
    } finally {
      setActionLoadingId(null);
      setConfirmPlan(null);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    if (activeTab === 'archived') {
      return Boolean(plan.deleted_at);
    }
    if (plan.deleted_at) {
      return false;
    }
    return activeTab === 'active' ? plan.is_active : !plan.is_active;
  });

  if (!mounted || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <SimpleLoader />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
      
      {/* 1. LIST VIEW */}
      {view === 'list' && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 animate-fade-in flex-1 overflow-y-auto">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-[8px] border border-[#E8E8E6] select-none overflow-x-auto">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'active' 
                    ? 'bg-white text-zinc-955 shadow-3xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {t('plans.activePlans')}
              </button>
              <button
                onClick={() => setActiveTab('draft')}
                className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'draft' 
                    ? 'bg-white text-zinc-955 shadow-3xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {t('plans.draftPlans')}
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'archived' 
                    ? 'bg-white text-zinc-955 shadow-3xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {t('plans.archivedPlans')}
              </button>
            </div>

            <button
              onClick={handleOpenCreate}
              className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 active:scale-99"
            >
              <Plus className="h-4 w-4" />
              <span>{t('plans.createPlan')}</span>
            </button>
          </div>

          {/* Offerings Grid */}
          {filteredPlans.length === 0 ? (
            <div className="border border-[#E8E8E6] bg-white rounded-[10px] p-16 text-center space-y-3 shadow-3xs">
              <Inbox className="h-10 w-10 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-405 font-semibold">{t('plans.noPlansFound')}</p>
            </div>
          ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map((plan) => {
                const baseMonthly = plan.prices.find(p => p.currency_id === primaryCurrency?.id && p.billing_interval === 'month') || plan.prices.find(p => p.billing_interval === 'month');
                const baseYearly = plan.prices.find(p => p.currency_id === primaryCurrency?.id && p.billing_interval === 'year') || plan.prices.find(p => p.billing_interval === 'year');
                const currencySymbol = baseMonthly?.currency?.symbol || primaryCurrency?.symbol || '$';
                const currencyCode = baseMonthly?.currency?.code || primaryCurrency?.code || 'USD';

                const allowedChKeys = getPlanAllowedChannels(plan.allowed_channels);
                const allowedIntList = getPlanAllowedIntegrations(plan.allowed_integrations);

                const channelKeysToDisplay = allowedChKeys.length > 0 ? allowedChKeys : AVAILABLE_CHANNELS.map(c => c.key);
                const validChannels = channelKeysToDisplay.filter(k => AVAILABLE_CHANNELS.some(c => c.key === k));

                const validIntegrations = allowedIntList
                  .map(intKey => AVAILABLE_INTEGRATIONS.find(i => i.key === intKey))
                  .filter((intg): intg is (typeof AVAILABLE_INTEGRATIONS)[number] => Boolean(intg && intg.logo));

                const configuredCurrenciesCount = new Set(plan.prices.map(p => p.currency_id)).size;
                const extraCurrencies = Math.max(0, configuredCurrenciesCount - 1);

                return (
                  <div 
                    key={plan.id}
                    className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-3xs hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4 animate-fade-in"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header: Name, Trial & Sort Order */}
                      <div className="flex items-start justify-between gap-2 select-none">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-zinc-955 tracking-tight truncate">{plan.name}</h4>
                            {plan.trial_days > 0 ? (
                              <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 shrink-0">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{t('plans.trialBadge', { days: plan.trial_days })}</span>
                              </span>
                            ) : null}
                          </div>
                          {plan.description ? (
                            <p className="text-[11px] text-zinc-400 font-normal truncate mt-0.5" title={plan.description}>{plan.description}</p>
                          ) : (
                            <p className="text-[11px] text-zinc-350 font-normal italic mt-0.5">
                              {t('plans.standardSubscription')}
                            </p>
                          )}
                        </div>

                        <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded shrink-0">
                          #{plan.sort_order}
                        </span>
                      </div>

                      {/* Pricing Bar */}
                      <div className="flex items-baseline justify-between pb-3 border-b border-[#F0F0F0] select-none">
                        <div className="flex items-baseline gap-1">
                          {baseMonthly ? (
                            <>
                              <span className="text-2xl font-black text-zinc-955 font-mono tracking-tight">
                                {currencySymbol}{(baseMonthly.amount / 100).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('plans.perMonth')}</span>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400 font-semibold italic">{t('plans.custom')}</span>
                          )}
                          {baseYearly && (
                            <span className="text-[10px] text-zinc-500 font-mono font-semibold ml-2">
                              ({currencySymbol}{(baseYearly.amount / 100).toLocaleString()}{t('plans.perYear')})
                            </span>
                          )}
                        </div>

                        {extraCurrencies > 0 && (
                          <span className="text-[9px] font-mono font-bold text-zinc-500 bg-[#F5F5F5] border border-[#E8E8E6] px-1.5 py-0.5 rounded shrink-0">
                            {t('plans.extraCurrencies', { count: extraCurrencies })}
                          </span>
                        )}
                      </div>

                      {/* 1. Core Platform Limits (Clean 2x2 Grid) */}
                      <div className="grid grid-cols-2 gap-2 text-xs select-none">
                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-white border border-zinc-200/70 flex items-center justify-center shrink-0 shadow-3xs text-zinc-500">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block leading-tight">{t('plans.messagesText')}</span>
                            <span className="font-mono font-bold text-zinc-900 text-xs truncate block mt-0.5">
                              {plan.monthly_messages_limit === -1 || plan.monthly_messages_limit == null 
                                ? t('plans.unlimited') 
                                : `${plan.monthly_messages_limit.toLocaleString()}${t('plans.perMonth')}`}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-white border border-zinc-200/70 flex items-center justify-center shrink-0 shadow-3xs text-zinc-500">
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block leading-tight">{t('plans.seatsText')}</span>
                            <span className="font-mono font-bold text-zinc-900 text-xs truncate block mt-0.5">
                              {plan.max_team_members === -1 ? t('plans.unlimited') : `${plan.max_team_members} ${t('plans.seatsUnit')}`}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-white border border-zinc-200/70 flex items-center justify-center shrink-0 shadow-3xs text-zinc-500">
                            <Radio className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block leading-tight">{t('plans.channelsText')}</span>
                            <span className="font-mono font-bold text-zinc-900 text-xs truncate block mt-0.5">
                              {plan.max_channels === -1 ? t('plans.unlimited') : `${plan.max_channels} ${t('plans.connectedText')}`}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-white border border-zinc-200/70 flex items-center justify-center shrink-0 shadow-3xs text-zinc-500">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block leading-tight">{t('plans.workspacesText')}</span>
                            <span className="font-mono font-bold text-zinc-900 text-xs truncate block mt-0.5">
                              {plan.max_workspaces === -1 ? t('plans.unlimited') : `${plan.max_workspaces ?? 1} ${t('plans.workspacesUnit')}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Automations & AI Intelligence */}
                      <div className="bg-zinc-50/70 border border-[#E8E8E6] rounded-lg p-2.5 space-y-2 select-none">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-600 min-w-0">
                            <Zap className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="text-[11px] font-medium truncate">{t('plans.flowsAndBroadcasts')}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 shrink-0">
                            <span className="font-bold text-zinc-900">
                              {plan.max_automations === -1 ? '∞' : plan.max_automations}
                            </span>
                            <span className="text-zinc-400 text-[10px]">{t('plans.flowsUnit')}</span>
                            <span className="text-zinc-300">&middot;</span>
                            <span className="font-bold text-zinc-900">
                              {plan.max_campaigns === -1 ? '∞' : plan.max_campaigns}
                            </span>
                            <span className="text-zinc-400 text-[10px]">{t('plans.campsUnit')}</span>
                          </div>
                        </div>

                        <div className="border-t border-[#E8E8E6]/60" />

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-600 min-w-0">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="text-[11px] font-medium truncate">{t('plans.copilotAndAiTokens')}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                            <span className="font-bold text-zinc-900">
                              {plan.copilot_credits === -1 ? t('plans.unlimited') : `${plan.copilot_credits ?? 100}`}
                            </span>
                            <span className="text-zinc-400 text-[10px]">{t('plans.credMoUnit')}</span>
                            <span className="text-zinc-300">&middot;</span>
                            <span className="font-bold text-emerald-700">
                              {plan.monthly_ai_tokens 
                                ? (plan.monthly_ai_tokens >= 1000000 
                                    ? `${(plan.monthly_ai_tokens / 1000000).toFixed(1)}M` 
                                    : `${Math.round(plan.monthly_ai_tokens / 1000)}k`) 
                                : '100k'}
                            </span>
                            <span className="text-zinc-400 text-[10px]">{t('plans.tokMoUnit')}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Integrated Business Suites */}
                      <div className="space-y-1.5 select-none">
                        {/* CRM Pipeline */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-700">
                            <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="text-[11px] font-medium">{t('plans.crmSuite')}</span>
                          </div>
                          {plan.own_crm_access ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{t('plans.unlocked')}</span>
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1 shrink-0">
                              <Lock className="h-3 w-3 text-zinc-400" />
                              <span>{t('plans.locked')}</span>
                            </span>
                          )}
                        </div>

                        {/* E-Commerce Suite */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-700 min-w-0">
                            <ShoppingBag className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="text-[11px] font-medium truncate">{t('plans.ecommerceSuite')}</span>
                          </div>
                          {(plan.max_ecommerce_stores ?? 0) <= 0 ? (
                            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1 shrink-0">
                              <X className="h-3 w-3 text-zinc-400" />
                              <span>{t('plans.disabled')}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 shrink-0">
                              <span>{plan.max_ecommerce_stores === -1 ? '∞' : plan.max_ecommerce_stores} {t('plans.storesUnit')}</span>
                              <span className="text-zinc-300">&middot;</span>
                              <span>{plan.max_ecommerce_products === -1 ? '∞' : plan.max_ecommerce_products} {t('plans.itemsUnit')}</span>
                              <span className="text-zinc-300">&middot;</span>
                              <span>{plan.monthly_ecommerce_orders === -1 ? '∞' : plan.monthly_ecommerce_orders}{t('plans.ordMoUnit')}</span>
                              {plan.has_abandoned_cart_recovery && (
                                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 ml-0.5" title="Abandoned Cart Recovery Enabled">
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>{t('plans.recovery')}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Meta Ads Suite */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-700 min-w-0">
                            <Megaphone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="text-[11px] font-medium truncate">{t('plans.metaAdsSuite')}</span>
                          </div>
                          {(plan.max_meta_ad_accounts ?? 0) <= 0 ? (
                            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1 shrink-0">
                              <X className="h-3 w-3 text-zinc-400" />
                              <span>{t('plans.disabled')}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 shrink-0">
                              <span>{plan.max_meta_ad_accounts === -1 ? '∞' : plan.max_meta_ad_accounts} {t('plans.accountsUnit')}</span>
                              <span className="text-zinc-300">&middot;</span>
                              <span>{plan.max_meta_campaigns === -1 ? '∞' : plan.max_meta_campaigns} {t('plans.campsUnit')}</span>
                              {plan.has_click_to_whatsapp_ads && (
                                <span className="text-[10px] font-semibold text-sky-600 flex items-center gap-0.5 ml-0.5" title="Click-to-WhatsApp Ads Enabled">
                                  <Check className="h-2.5 w-2.5 text-sky-600" />
                                  <span>{t('plans.ctwa')}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Channels Allowed Cluster */}
                      <div className="space-y-1.5 pt-2 border-t border-[#F0F0F0] select-none">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {t('plans.channelsCount', { count: validChannels.length })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {validChannels.map((key) => {
                            const cap = plan.allowed_channels?.[key];
                            const channelObj = AVAILABLE_CHANNELS.find(c => c.key === key);
                            return (
                              <div
                                key={key}
                                className="h-6.5 w-6.5 flex items-center justify-center bg-zinc-50 border border-zinc-200/80 rounded-md p-1 shrink-0 shadow-3xs hover:border-black/30 transition-colors"
                                title={`${channelObj?.name || key} (Cap: ${cap ?? 'unlimited'})`}
                              >
                                {renderChannelLogo(key, "h-full w-full")}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Integrations Whitelist Cluster */}
                      <div className="space-y-1.5 pt-2 border-t border-[#F0F0F0] select-none">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {t('plans.integrationsCount', { count: validIntegrations.length })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {validIntegrations.length === 0 ? (
                            <span className="text-[10px] font-semibold text-zinc-400 italic">{t('plans.noExternalIntegrations')}</span>
                          ) : (
                            validIntegrations.map((intg) => {
                              return (
                                <div
                                  key={intg.key}
                                  className="h-6.5 w-6.5 flex items-center justify-center bg-zinc-50 border border-zinc-200/80 rounded-md p-1 shrink-0 shadow-3xs hover:border-black/30 transition-colors"
                                  title={intg.name}
                                >
                                  {renderIntegrationLogo(intg.key, "h-full w-full")}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar Footer */}
                    <div className="border-t border-[#F0F0F0] pt-3.5 flex items-center justify-between gap-2 select-none">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="flex items-center justify-center gap-1.5 h-8 px-3 border border-[#E8E8E6] text-zinc-700 hover:text-black bg-white rounded-[6px] text-xs font-bold transition-all shadow-3xs cursor-pointer"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        <span>{t('dashboard.manage')}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Active/Draft toggling */}
                        {activeTab !== 'archived' && (
                          <button
                            onClick={() => handleToggleActiveState(plan)}
                            disabled={actionLoadingId === plan.id}
                            className={`flex items-center justify-center h-8 px-3 rounded-[6px] text-xs font-bold transition-all border cursor-pointer ${
                              plan.is_active 
                                ? 'bg-zinc-50 border-[#E8E8E6] text-[#6B6B6B] hover:text-black' 
                                : 'bg-zinc-900 border-zinc-900 text-white hover:bg-black'
                            }`}
                          >
                            {actionLoadingId === plan.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : plan.is_active ? (
                              t('plans.deactivate')
                            ) : (
                              t('plans.activate')
                            )}
                          </button>
                        )}

                        {/* Archive/Unarchive buttons */}
                        {activeTab === 'archived' ? (
                          <>
                            <button
                              onClick={() => {
                                setConfirmPlan(plan);
                                setConfirmType('unarchive');
                                setIsConfirmOpen(true);
                              }}
                              className="flex items-center justify-center gap-1 h-8 px-3 bg-zinc-900 text-white hover:bg-black border border-zinc-900 text-xs font-bold rounded-[6px] transition-all cursor-pointer"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>{t('plans.unarchive')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setConfirmPlan(plan);
                                setConfirmType('delete');
                                setIsConfirmOpen(true);
                              }}
                              className="flex items-center justify-center h-8 w-8 text-zinc-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-[6px] transition-all cursor-pointer"
                              title={t('plans.deletePermanently')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmPlan(plan);
                              setConfirmType('archive');
                              setIsConfirmOpen(true);
                            }}
                            className="flex items-center justify-center h-8 w-8 text-zinc-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-[6px] transition-all cursor-pointer"
                            title={t('plans.archive')}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CREATE & EDIT VIEW (FULL-SCREEN FORM) */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={handleCreateOrUpdatePlan} className="plan-form w-full bg-white animate-fade-in select-none flex-1 overflow-y-auto">
          
          {/* Section 1: Core Configuration Details */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.planFeatures')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('plans.planFeaturesDesc')}</p>
            </div>
            <div className="col-span-2 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('plans.planName')}</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('plans.planNamePlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('plans.planDescription')}</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('plans.planDescPlaceholder')}
                  className="w-full min-h-[70px] py-2.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('plans.trialPeriod')}</label>
                  <div className="relative flex items-center">
                    <input 
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="w-full h-9 px-3 pr-12 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                      required
                      min={0}
                    />
                    <span className="absolute right-3 text-[10px] font-bold text-zinc-400 pointer-events-none">{t('plans.days')}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('plans.sortOrder')}</label>
                  <input 
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Quotas & Resource Limitations */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.quotaLimitations')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.quotaLimitationsDesc')}
              </p>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              
              {/* Max Workspaces */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.maxWorkspaces')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.maxWorkspacesDesc')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxWorkspaces}
                    onChange={(e) => setMaxWorkspaces(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.workspacesUnit')}</span>
                </div>
              </div>

              {/* Max Team Members */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.maxTeamMembers')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.maxSeatsDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxTeamMembers}
                    onChange={(e) => setMaxTeamMembers(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.seatsUnit')}</span>
                </div>
              </div>

              {/* Max Campaigns */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Send className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.maxCampaigns')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.maxCampaignsDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxCampaigns}
                    onChange={(e) => setMaxCampaigns(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.runsUnit')}</span>
                </div>
              </div>

              {/* Max Channels (Global) */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Zap className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.totalChannelLimit')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.totalChannelLimitDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxChannels}
                    onChange={(e) => setMaxChannels(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.linesUnit')}</span>
                </div>
              </div>

              {/* Max Automations */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Workflow className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.maxAutomations')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.maxAutomationsDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxAutomations}
                    onChange={(e) => setMaxAutomations(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.flowsUnit')}</span>
                </div>
              </div>

              {/* Flow Credits (AI Generations) */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.flowAiCredits')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.flowAiCreditsDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={flowCredits}
                    onChange={(e) => setFlowCredits(Number(e.target.value))}
                    className="w-20 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.perMonth')}</span>
                </div>
              </div>

              {/* Monthly AI Tokens */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.monthlyAiTokens')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.monthlyAiTokensDesc')} (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    step={10000}
                    value={monthlyAiTokens}
                    onChange={(e) => setMonthlyAiTokens(Number(e.target.value))}
                    className="w-24 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.tokMoUnit')}</span>
                </div>
              </div>

              {/* Copilot AI Credits */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.copilotCredits')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.copilotCreditsDesc')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    step={10}
                    value={copilotCredits}
                    onChange={(e) => setCopilotCredits(Number(e.target.value))}
                    className="w-24 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.credMoUnit')}</span>
                </div>
              </div>

              {/* Monthly Outbound Messages Cap */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.monthlyOutboundMessages')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.monthlyOutboundMessagesDesc')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    step={100}
                    value={monthlyMessagesLimit}
                    onChange={(e) => setMonthlyMessagesLimit(Number(e.target.value))}
                    className="w-24 h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[11px] font-semibold text-zinc-400">{t('plans.msgsMoUnit')}</span>
                </div>
              </div>

              {/* Native CRM Suite Access */}
              <div 
                onClick={() => setOwnCrmAccess(!ownCrmAccess)}
                className={`border rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-3xs ${
                  ownCrmAccess 
                    ? 'bg-white border-[#E8E8E6] ring-1 ring-black/5' 
                    : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 select-none shadow-3xs">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.ownCrmAccess')}</label>
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight block">{t('plans.crmSuiteDesc')}</span>
                  </div>
                </div>

                <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                  ownCrmAccess 
                    ? 'bg-black border-black text-white' 
                    : 'bg-white border-zinc-300'
                }`}>
                  {ownCrmAccess && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Allowed Messaging Channels & Connection Caps */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.channelsAndLimits')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.channelsAndLimitsDesc')}
              </p>
            </div>
            <div className="col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-3.5">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const channelState = allowedChannels[ch.key] || { enabled: true, max: ch.defaultMax };
                  const isEnabled = channelState.enabled;

                  return (
                    <div 
                      key={ch.key}
                      onClick={() => {
                        setAllowedChannels(prev => ({
                          ...prev,
                          [ch.key]: {
                            enabled: !isEnabled,
                            max: prev[ch.key]?.max || ch.defaultMax
                          }
                        }));
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isEnabled 
                          ? 'bg-white border-[#E8E8E6] shadow-3xs ring-1 ring-black/5' 
                          : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 flex items-center justify-center bg-zinc-50 border border-zinc-200/80 rounded-lg p-1.5 shrink-0 select-none shadow-3xs">
                            {renderChannelLogo(ch.key, "h-full w-full")}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900">{ch.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">{ch.desc}</p>
                          </div>
                        </div>

                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                          isEnabled 
                            ? 'bg-black border-black text-white' 
                            : 'bg-white border-zinc-300'
                        }`}>
                          {isEnabled && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Connection Cap Input (Keeps uniform card height across grid) */}
                      <div 
                        className={`pt-2.5 mt-2 border-t border-zinc-100 flex items-center justify-between transition-opacity ${
                          isEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none select-none'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          {t('plans.maxConnections')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number"
                            min={-1}
                            max={9999}
                            disabled={!isEnabled}
                            value={channelState.max}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAllowedChannels(prev => ({
                                ...prev,
                                [ch.key]: {
                                  enabled: prev[ch.key]?.enabled ?? true,
                                  max: val === -1 ? -1 : Math.max(1, val)
                                }
                              }));
                            }}
                            className="w-16 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black disabled:bg-zinc-100 disabled:text-zinc-400"
                            required
                          />
                          <span className="text-[10px] font-bold text-zinc-400">
                            {channelState.max === -1 ? '∞' : t('plans.connUnit')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Individual Allowed Integrations Whitelist */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.integrationsWhitelist')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.integrationsWhitelistDesc')}
              </p>
            </div>
            <div className="col-span-2 space-y-4">
              {/* Max Active Integrations Limit */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex items-center justify-between shadow-3xs transition-all hover:border-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-0.5">{t('plans.maxIntegrations') || 'Total Integrations Limit'}</label>
                    <span className="text-[10px] text-zinc-500 font-medium leading-tight block">Overall active integration connections allowed (-1 = Unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <input 
                    type="number"
                    min={-1}
                    value={maxIntegrations}
                    onChange={(e) => setMaxIntegrations(Number(e.target.value))}
                    className="w-20 h-7 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                  <span className="text-[10px] font-bold text-zinc-400">
                    {maxIntegrations === -1 ? '∞ Unlimited' : 'apps'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {AVAILABLE_INTEGRATIONS.map((intg) => {
                  const isSelected = allowedIntegrations.includes(intg.key);

                  return (
                    <div 
                      key={intg.key}
                      onClick={() => {
                        if (isSelected) {
                          setAllowedIntegrations(prev => prev.filter(k => k !== intg.key));
                        } else {
                          setAllowedIntegrations(prev => [...prev, intg.key]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-white border-[#E8E8E6] shadow-3xs ring-1 ring-black/5' 
                          : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex items-center justify-center bg-zinc-50 border border-zinc-200/80 rounded-lg p-1.5 shrink-0 select-none shadow-3xs">
                          {renderIntegrationLogo(intg.key, "h-full w-full")}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">{intg.name}</h4>
                          <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">{intg.desc}</p>
                        </div>
                      </div>

                      <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                        isSelected 
                          ? 'bg-black border-black text-white' 
                          : 'bg-white border-zinc-300'
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: Pre-built Flow Templates Access */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.flowTemplatesAccess')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.flowTemplatesAccessDesc')}
              </p>
            </div>
            <div className="col-span-2">
              <div 
                onClick={() => setHasFlowTemplates(!hasFlowTemplates)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  hasFlowTemplates 
                    ? 'bg-white border-[#E8E8E6] shadow-3xs ring-1 ring-black/5' 
                    : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-800 select-none shadow-3xs">
                    <Workflow className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{t('plans.prebuiltFlowTemplates')}</h4>
                    <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
                      {t('plans.prebuiltFlowTemplatesDesc')}
                    </p>
                  </div>
                </div>

                <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                  hasFlowTemplates 
                    ? 'bg-black border-black text-white' 
                    : 'bg-white border-zinc-300'
                }`}>
                  {hasFlowTemplates && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: E-Commerce Suite */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.ecommerceSuite')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.ecommerceSuiteDesc')}
              </p>
            </div>
            <div className="col-span-2 space-y-4">
              {/* Grid of 3 numeric quota inputs: Stores, Products, Monthly Orders */}
              <div className="grid grid-cols-3 gap-3.5">
                {/* Max Ecommerce Stores */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex flex-col justify-between shadow-3xs transition-all hover:border-zinc-400">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-900 block leading-tight">{t('plans.connectedStores')}</label>
                      <span className="text-[10px] text-zinc-500 font-medium">{t('plans.connectedStoresDesc')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('plans.unlimitedShort')}</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min={-1}
                        value={maxEcommerceStores}
                        onChange={(e) => setMaxEcommerceStores(Number(e.target.value))}
                        className="w-16 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black"
                        required
                      />
                      <span className="text-[10px] font-bold text-zinc-400">{t('plans.storesUnit')}</span>
                    </div>
                  </div>
                </div>

                {/* Max Ecommerce Products */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex flex-col justify-between shadow-3xs transition-all hover:border-zinc-400">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-900 block leading-tight">{t('plans.catalogProducts')}</label>
                      <span className="text-[10px] text-zinc-500 font-medium">{t('plans.catalogProductsDesc')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('plans.unlimitedShort')}</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min={-1}
                        step={50}
                        value={maxEcommerceProducts}
                        onChange={(e) => setMaxEcommerceProducts(Number(e.target.value))}
                        className="w-20 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black"
                        required
                      />
                      <span className="text-[10px] font-bold text-zinc-400">{t('plans.itemsUnit')}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Ecommerce Orders */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex flex-col justify-between shadow-3xs transition-all hover:border-zinc-400">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-900 block leading-tight">{t('plans.monthlyOrders')}</label>
                      <span className="text-[10px] text-zinc-500 font-medium">{t('plans.monthlyOrdersDesc')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('plans.unlimitedShort')}</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min={-1}
                        step={50}
                        value={monthlyEcommerceOrders}
                        onChange={(e) => setMonthlyEcommerceOrders(Number(e.target.value))}
                        className="w-20 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black"
                        required
                      />
                      <span className="text-[10px] font-bold text-zinc-400">{t('plans.ordMoUnit')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature toggles: Abandoned Cart Recovery & Native WhatsApp Checkout */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                {/* Abandoned Cart Recovery Toggle */}
                <div 
                  onClick={() => setHasAbandonedCartRecovery(!hasAbandonedCartRecovery)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-3xs ${
                    hasAbandonedCartRecovery 
                      ? 'bg-white border-[#E8E8E6] ring-1 ring-black/5' 
                      : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-800 shadow-3xs">
                      <ShoppingCart className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{t('plans.abandonedCartRecovery')}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-0.5">
                        {t('plans.abandonedCartRecoveryDesc')}
                      </p>
                    </div>
                  </div>

                  <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                    hasAbandonedCartRecovery 
                      ? 'bg-black border-black text-white' 
                      : 'bg-white border-zinc-300'
                  }`}>
                    {hasAbandonedCartRecovery && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Native WhatsApp Catalog Checkout Toggle */}
                <div 
                  onClick={() => setHasWhatsAppCheckout(!hasWhatsAppCheckout)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-3xs ${
                    hasWhatsAppCheckout 
                      ? 'bg-white border-[#E8E8E6] ring-1 ring-black/5' 
                      : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-800 shadow-3xs">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{t('plans.whatsappCheckout')}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-0.5">
                        {t('plans.whatsappCheckoutDesc')}
                      </p>
                    </div>
                  </div>

                  <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                    hasWhatsAppCheckout 
                      ? 'bg-black border-black text-white' 
                      : 'bg-white border-zinc-300'
                  }`}>
                    {hasWhatsAppCheckout && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Meta Ads Suite */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.metaAdsSuite')}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                {t('plans.metaAdsSuiteDesc')}
              </p>
            </div>
            <div className="col-span-2 space-y-4">
              {/* Grid of 2 numeric quota inputs: Ad Accounts, Active Campaigns */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Max Meta Ad Accounts */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex flex-col justify-between shadow-3xs transition-all hover:border-zinc-400">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-900 block leading-tight">{t('plans.connectedAdAccounts')}</label>
                      <span className="text-[10px] text-zinc-500 font-medium">{t('plans.connectedAdAccountsDesc')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('plans.unlimitedShort')}</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min={-1}
                        value={maxMetaAdAccounts}
                        onChange={(e) => setMaxMetaAdAccounts(Number(e.target.value))}
                        className="w-16 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black"
                        required
                      />
                      <span className="text-[10px] font-bold text-zinc-400">{t('plans.accountsUnit')}</span>
                    </div>
                  </div>
                </div>

                {/* Max Meta Campaigns */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl p-3.5 flex flex-col justify-between shadow-3xs transition-all hover:border-zinc-400">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-700 shadow-3xs">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-900 block leading-tight">{t('plans.activeCampaigns')}</label>
                      <span className="text-[10px] text-zinc-500 font-medium">{t('plans.activeCampaignsDesc')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('plans.unlimitedShort')}</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min={-1}
                        value={maxMetaCampaigns}
                        onChange={(e) => setMaxMetaCampaigns(Number(e.target.value))}
                        className="w-16 h-7 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-right text-xs font-mono font-bold focus:outline-none focus:border-black"
                        required
                      />
                      <span className="text-[10px] font-bold text-zinc-400">{t('plans.campsUnit')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature toggles: Click-to-WhatsApp Ads & Meta Lead Sync */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                {/* Click-to-WhatsApp Ads Toggle */}
                <div 
                  onClick={() => setHasClickToWhatsAppAds(!hasClickToWhatsAppAds)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-3xs ${
                    hasClickToWhatsAppAds 
                      ? 'bg-white border-[#E8E8E6] ring-1 ring-black/5' 
                      : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-800 shadow-3xs">
                      <MessageSquare className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{t('plans.clickToWhatsAppAds')}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-0.5">
                        {t('plans.clickToWhatsAppAdsDesc')}
                      </p>
                    </div>
                  </div>

                  <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                    hasClickToWhatsAppAds 
                      ? 'bg-black border-black text-white' 
                      : 'bg-white border-zinc-300'
                  }`}>
                    {hasClickToWhatsAppAds && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Meta Lead Sync Toggle */}
                <div 
                  onClick={() => setHasMetaLeadSync(!hasMetaLeadSync)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-3xs ${
                    hasMetaLeadSync 
                      ? 'bg-white border-[#E8E8E6] ring-1 ring-black/5' 
                      : 'bg-[#F9F9F8] border-[#EAEAEA] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center shrink-0 text-zinc-800 shadow-3xs">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{t('plans.metaLeadSync')}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-0.5">
                        {t('plans.metaLeadSyncDesc')}
                      </p>
                    </div>
                  </div>

                  <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                    hasMetaLeadSync 
                      ? 'bg-black border-black text-white' 
                      : 'bg-white border-zinc-300'
                  }`}>
                    {hasMetaLeadSync && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 8: Multi-Currency Pricing Settings */}
          <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
            <div className="col-span-1 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('plans.pricingSettings')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('plans.pricingSettingsDesc')}
                </p>
              </div>

              <div>
                <Link
                  href="/superadmin/currencies"
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E8E8E6] bg-white text-zinc-800 hover:text-black text-xs font-bold rounded-[6px] shadow-3xs hover:bg-zinc-50 transition-all active:scale-99"
                >
                  <Coins className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('plans.addManageCurrencies')}</span>
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </Link>
              </div>
            </div>
            <div className="col-span-2 space-y-4">
              {currencies.length === 0 ? (
                <div className="p-8 border border-[#E8E8E6] rounded-[8px] bg-white text-center space-y-3 shadow-3xs flex flex-col items-center justify-center">
                  <Coins className="h-8 w-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-500 font-semibold">{t('plans.noActiveCurrencies')}</p>
                  <Link
                    href="/superadmin/currencies"
                    className="inline-flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs hover:shadow-xs transition-all cursor-pointer active:scale-99"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('plans.addCurrency')}</span>
                  </Link>
                </div>
              ) : (
                currencies.map((curr) => {
                const isPrimary = curr.id === primaryCurrency?.id || curr.is_default;
                return (
                  <div 
                    key={curr.id}
                    className="p-4 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[8px] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-955">
                          {curr.code} ({curr.symbol})
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium">
                          {curr.name}
                        </span>
                      </div>
                      {isPrimary ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#4AE54A]/15 text-zinc-900 border border-[#4AE54A]/30 rounded">
                          {t('plans.primaryCurrency')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200 rounded">
                          {t('plans.activeCurrency')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Monthly Rate */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('plans.monthlyPrice')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs pointer-events-none">
                            {curr.symbol}
                          </span>
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={planPrices[curr.id] ?? ''}
                            onChange={(e) => setPlanPrices(prev => ({ ...prev, [curr.id]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full h-9 pl-7 pr-16 bg-white border border-[#E8E8E6] rounded-md text-xs font-mono font-semibold text-zinc-900 focus:outline-none focus:border-black transition-colors"
                            required
                          />
                          <span className="absolute right-3 text-[10px] font-bold text-zinc-400 pointer-events-none">{t('plans.perMonth')}</span>
                        </div>
                      </div>

                      {/* Annual Rate */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('plans.annualPrice')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs pointer-events-none">
                            {curr.symbol}
                          </span>
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={planPricesYearly[curr.id] ?? ''}
                            onChange={(e) => setPlanPricesYearly(prev => ({ ...prev, [curr.id]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full h-9 pl-7 pr-16 bg-white border border-[#E8E8E6] rounded-md text-xs font-mono font-semibold text-zinc-900 focus:outline-none focus:border-black transition-colors"
                            required
                          />
                          <span className="absolute right-3 text-[10px] font-bold text-zinc-400 pointer-events-none">{t('plans.perYear')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

        </form>
      )}

      {/* CONFIRMATION MODALS */}
      {isConfirmOpen && confirmPlan && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-3xs animate-fade-in p-4 select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-[12px] p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-955">
                {confirmType === 'delete' ? (
                  <Trash2 className="h-5 w-5 text-red-650" />
                ) : confirmType === 'deactivate' ? (
                  <RefreshCw className="h-5 w-5 text-zinc-550" />
                ) : (
                  <Archive className="h-5 w-5 text-zinc-550" />
                )}
                <h4 className="font-bold text-sm">
                  {confirmType === 'delete' ? t('plans.confirmDeleteTitle') :
                   confirmType === 'archive' ? t('plans.confirmArchiveTitle') :
                   confirmType === 'unarchive' ? t('plans.confirmUnarchiveTitle') :
                   t('plans.confirmDeactivateTitle')}
                </h4>
              </div>
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="text-zinc-400 hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
              {confirmType === 'delete' ? t('plans.confirmDeleteDesc', { name: confirmPlan.name }) :
               confirmType === 'archive' ? t('plans.confirmArchiveDesc', { name: confirmPlan.name }) :
               confirmType === 'unarchive' ? t('plans.confirmUnarchiveDesc', { name: confirmPlan.name }) :
               t('plans.confirmDeactivateDesc', { name: confirmPlan.name })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-8 px-3 border border-[#E8E8E6] bg-white text-zinc-650 hover:text-black text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoadingId === confirmPlan.id}
                className={`h-8 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs ${
                  confirmType === 'delete' 
                    ? 'bg-red-650 hover:bg-red-700 text-white' 
                    : confirmType === 'deactivate'
                    ? 'bg-zinc-850 hover:bg-black text-white'
                    : 'bg-zinc-955 hover:bg-zinc-900 text-white'
                }`}
              >
                {actionLoadingId === confirmPlan.id && <RefreshCw className="h-3 w-3 animate-spin text-white" />}
                <span>
                  {confirmType === 'delete' ? t('plans.deletePermanently') :
                   confirmType === 'archive' ? t('plans.archive') :
                   confirmType === 'unarchive' ? t('plans.unarchive') :
                   t('plans.deactivate')}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
