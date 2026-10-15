'use client';

import { useEffect, useState, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  Globe, 
  ChevronDown, 
  Sparkles, 
  Zap, 
  Bot, 
  Users, 
  Megaphone, 
  GitBranch, 
  ShieldCheck 
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

export interface PlanPriceDetails {
  id?: number;
  stripe_price_id: string;
  amount: number;
  interval: string;
  currency_code: string;
  currency_symbol: string;
  currency_id?: number;
}

export interface PlanDetails {
  id: number;
  name: string;
  description: string;
  trial_days?: number;
  max_workspaces?: number;
  max_team_members: number;
  max_campaigns: number;
  max_integrations: number;
  allowed_integrations?: string[] | Record<string, any>;
  own_crm_access: boolean;
  max_channels: number;
  allowed_channels?: string[] | Record<string, any>;
  max_automations: number;
  flow_credits?: number;
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
  prices: PlanPriceDetails[];
  all_prices?: PlanPriceDetails[];
}

export interface CurrencyOption {
  id: number;
  code: string;
  symbol: string;
  name: string;
  payment_gateway?: string;
  is_default: boolean;
}

const ALL_CHANNELS = [
  { id: 'whatsapp', src: '/channels/whatsapp.webp', name: 'WhatsApp' },
  { id: 'instagram', src: '/channels/instagram.svg', name: 'Instagram' },
  { id: 'messenger', src: '/channels/messenger.webp', name: 'Messenger' },
  { id: 'telegram', src: '/channels/telegram.webp', name: 'Telegram' },
  { id: 'sms', src: '/channels/sms.svg', name: 'SMS' },
  { id: 'email', src: '/channels/email.svg', name: 'Email' },
  { id: 'tiktok', src: '/channels/tiktok.webp', name: 'TikTok' },
  { id: 'linkedin', src: '/channels/linkedin.png', name: 'LinkedIn' }
];

const ALL_INTEGRATIONS = [
  { id: 'shopify', src: '/shopify.webp', name: 'Shopify' },
  { id: 'woocommerce', src: '/woocommerce.webp', name: 'WooCommerce' },
  { id: 'hubspot', src: '/hubspot.png', name: 'HubSpot' },
  { id: 'zoho', src: '/zoho_crm.png', name: 'Zoho' },
  { id: 'salesforce', src: '/salesforce.webp', name: 'Salesforce' },
  { id: 'zapier', src: '/zapier.webp', name: 'Zapier' },
  { id: 'n8n', src: '/n8n.webp', name: 'n8n' },
  { id: 'google_sheets', src: '/google_sheets.webp', name: 'Sheets' },
  { id: 'google_calendar', src: '/google_calendar.webp', name: 'Calendar' },
  { id: 'zoom', src: '/zoom.webp', name: 'Zoom' },
  { id: 'teams', src: '/teams.webp', name: 'Teams' }
];

export function PricingSection() {
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [resolvedCurrency, setResolvedCurrency] = useState<CurrencyOption | null>(null);
  const [activeCurrencies, setActiveCurrencies] = useState<CurrencyOption[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<boolean>(true);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const loadPlans = async (currencyCode?: string) => {
    try {
      const url = currencyCode 
        ? `/public/plans?currency=${currencyCode}` 
        : '/public/plans';

      const response = await fetchWithCsrf(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.plans) {
          setPlans(data.plans);
        }
        if (data.resolved_currency) {
          setResolvedCurrency(data.resolved_currency);
          if (!currencyCode) {
            setSelectedCurrencyCode(data.resolved_currency.code);
          }
        }
        if (data.active_currencies) {
          setActiveCurrencies(data.active_currencies);
        }
      }
    } catch (err) {
      console.error('Failed to load public plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrencyCode(code);
    setIsCurrencyDropdownOpen(false);
    startTransition(() => {
      loadPlans(code);
    });
  };

  // Compute maximum savings across all active plans for yearly billing
  const maxSavingsPercent = useMemo(() => {
    let maxSaved = 0;
    for (const p of plans) {
      const activePrices = p.prices || [];
      const m = activePrices.find(pr => pr.interval === 'month');
      const y = activePrices.find(pr => pr.interval === 'year');
      if (m && y && m.amount > 0) {
        const mAnnual = m.amount * 12;
        if (y.amount < mAnnual) {
          const saved = Math.round(((mAnnual - y.amount) / mAnnual) * 100);
          if (saved > maxSaved) maxSaved = saved;
        }
      }
    }
    return maxSaved;
  }, [plans]);

  const formatLimit = (val: number, label: string) => {
    if (val === -1 || val >= 99999) return `Unlimited ${label}`;
    return `${val.toLocaleString()} ${label}`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens || tokens === 0) return '0 AI Tokens';
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M Monthly AI Tokens`;
    }
    return `${Math.round(tokens / 1000)}k Monthly AI Tokens`;
  };

  // Helper to resolve channel logos for a plan
  const getPlanChannels = (plan: PlanDetails) => {
    if (!plan.max_channels || plan.max_channels === 0) return [];
    if (plan.allowed_channels) {
      let allowedKeys: string[] = [];
      if (Array.isArray(plan.allowed_channels)) {
        allowedKeys = plan.allowed_channels;
      } else if (typeof plan.allowed_channels === 'object') {
        allowedKeys = Object.keys(plan.allowed_channels).filter(k => {
          const val = (plan.allowed_channels as Record<string, any>)[k];
          return val !== false && val !== 0 && val !== '0' && val !== undefined && val !== null;
        });
      }
      if (allowedKeys.length > 0) {
        const seen = new Set<string>();
        const list: typeof ALL_CHANNELS = [];
        for (const chId of allowedKeys) {
          const found = ALL_CHANNELS.find(c => 
            c.id === chId || 
            (chId === 'whatsapp' && (c.id === 'whatsapp' || c.id === 'whatsapp_cloud'))
          );
          if (found) {
            const key = found.id.startsWith('whatsapp') ? 'whatsapp' : found.id;
            if (seen.has(key)) continue;
            seen.add(key);
            list.push(found);
          }
        }
        return list;
      }
    }
    return [];
  };

  // Helper to resolve integration logos for a plan
  const getPlanIntegrations = (plan: PlanDetails) => {
    if (!plan.max_integrations || plan.max_integrations === 0) return [];
    if (plan.allowed_integrations) {
      let allowedKeys: string[] = [];
      if (Array.isArray(plan.allowed_integrations)) {
        allowedKeys = plan.allowed_integrations;
      } else if (typeof plan.allowed_integrations === 'object') {
        allowedKeys = Object.keys(plan.allowed_integrations).filter(k => {
          const val = (plan.allowed_integrations as Record<string, any>)[k];
          return val !== false && val !== 0 && val !== '0' && val !== undefined && val !== null;
        });
      }
      if (allowedKeys.length > 0) {
        const expanded = new Set<string>();
        allowedKeys.forEach(k => {
          if (k === 'ecommerce') {
            expanded.add('shopify');
            expanded.add('woocommerce');
          } else if (k === 'meetings') {
            expanded.add('zoom');
            expanded.add('teams');
          } else if (k === 'crm') {
            expanded.add('hubspot');
            expanded.add('salesforce');
            expanded.add('zoho');
          } else if (k === 'webhooks') {
            expanded.add('zapier');
            expanded.add('n8n');
          } else {
            expanded.add(k);
          }
        });
        return ALL_INTEGRATIONS.filter(itg => expanded.has(itg.id));
      }
    }
    return [];
  };

  return (
    <section id="pricing" className="relative bg-white py-20 sm:py-24 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous, Soft Neon Green Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-4 mb-10 max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Simple Pricing. Start Free.
          </h2>
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed font-normal">
            Choose the right plan for your business. Transparent tiers, zero hidden fees, and localized multi-currency billing.
          </p>
        </motion.div>

        {/* Controls Bar: Billing Toggle & GeoIP Currency Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-14">
          
          {/* Monthly / Yearly Billing Switch */}
          <div className="flex items-center gap-3 bg-white border border-[#E8E8E6] p-1.5 px-3 rounded-full shadow-3xs">
            <button
              onClick={() => setBillingInterval('month')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                billingInterval === 'month'
                  ? 'bg-[#0A0A0A] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                billingInterval === 'year'
                  ? 'bg-[#0A0A0A] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              <span>Yearly Billing</span>
              {maxSavingsPercent > 0 && (
                <span className="text-[9px] font-black uppercase tracking-wider text-[#0A0A0A] bg-[#E8FDE8] border border-[#4AE54A]/40 px-1.5 py-0.5 rounded-full">
                  Save {maxSavingsPercent}%
                </span>
              )}
            </button>
          </div>

          {/* GeoIP Multi-Currency Selector */}
          {activeCurrencies.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsCurrencyDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 bg-white border border-[#E8E8E6] hover:border-zinc-400 py-2 px-3.5 rounded-full text-xs font-bold text-[#0A0A0A] shadow-3xs transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#4AE54A]" />
                <span>
                  {resolvedCurrency ? `${resolvedCurrency.code} (${resolvedCurrency.symbol})` : 'Currency'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isCurrencyDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 w-48 bg-white border border-[#E8E8E6] rounded-xl shadow-xl py-1.5 z-50 text-left overflow-hidden"
                  >
                    <div className="px-3 py-1 text-[9px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                      Select Currency
                    </div>
                    {activeCurrencies.map((curr) => {
                      const isSelected = selectedCurrencyCode === curr.code;
                      return (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencyChange(curr.code)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-[#E8FDE8] text-[#0A0A0A] font-bold' 
                              : 'text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{curr.symbol}</span>
                            <span>{curr.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">{curr.code}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-[1140px] mx-auto text-left">
          {plans.map((plan, index) => {
            const activePrices = plan.prices || [];
            const activePrice = activePrices.find(p => p.interval === billingInterval) || activePrices[0];
            const isFree = plan.name.toLowerCase().includes('free') || 
              (activePrice ? activePrice.amount === 0 : false);

            const priceVal = activePrice ? (activePrice.amount / 100).toLocaleString() : '0';
            const currencySymbol = activePrice?.currency_symbol || resolvedCurrency?.symbol || '$';

            // Annual savings for this specific plan
            const monthlyPrice = activePrices.find(p => p.interval === 'month');
            const yearlyPrice = activePrices.find(p => p.interval === 'year');
            const planSavings = (() => {
              if (billingInterval !== 'year' || isFree || !monthlyPrice || !yearlyPrice || monthlyPrice.amount <= 0) {
                return 0;
              }
              const annualFromMonthly = monthlyPrice.amount * 12;
              if (yearlyPrice.amount >= annualFromMonthly) return 0;
              return Math.round(((annualFromMonthly - yearlyPrice.amount) / annualFromMonthly) * 100);
            })();

            const isPopular = plan.name.toLowerCase().includes('professional') || 
              (plan.name.toLowerCase().includes('starter') && !plans.some(p => p.name.toLowerCase().includes('professional')));

            const planChannels = getPlanChannels(plan);
            const planIntegrations = getPlanIntegrations(plan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-white transition-all duration-300 ${
                  isPopular 
                    ? 'border-2 border-[#0A0A0A] shadow-xl ring-1 ring-[#0A0A0A] scale-[1.02]' 
                    : 'border border-[#E8E8E6] shadow-3xs hover:border-zinc-300'
                }`}
              >
                {/* Visual Most Popular Badge */}
                {isPopular && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 text-[9px] font-black uppercase bg-[#0A0A0A] text-white px-3 py-0.5 rounded-full shadow-md">
                    ★ Most Popular
                  </span>
                )}

                <div className="space-y-6">
                  
                  {/* Plan Name & Short Description */}
                  <div>
                    <h3 className="text-xl font-black text-[#0A0A0A] tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-[#6B6B6B] font-normal mt-1.5 leading-relaxed min-h-[34px] line-clamp-2">
                      {plan.description}
                    </p>
                  </div>

                  {/* Plan Price Area */}
                  <div className="pt-2 border-t border-zinc-100 flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline">
                      {isFree ? (
                        <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0A0A0A] font-mono">
                          {currencySymbol}0
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-800 mr-0.5 tracking-tight font-mono">
                            {currencySymbol}
                          </span>
                          <span className="text-4xl sm:text-5xl font-black text-[#0A0A0A] tracking-tight font-mono">
                            {priceVal}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-500 ml-1.5">
                            {billingInterval === 'year' ? '/ year' : '/ month'}
                          </span>
                        </>
                      )}
                    </div>

                    {planSavings > 0 && (
                      <span className="text-[10px] font-extrabold text-[#0A0A0A] bg-[#E8FDE8] border border-[#4AE54A]/40 px-2 py-0.5 rounded">
                        Save {planSavings}%
                      </span>
                    )}
                  </div>

                  {/* Free Trial Note */}
                  {plan.trial_days && plan.trial_days > 0 ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0A0A0A] bg-[#FAF9F6] border border-[#E8E8E6] px-2.5 py-1 rounded-md">
                      <Sparkles className="w-3 h-3 text-[#4AE54A]" />
                      <span>{plan.trial_days}-Day Free Trial Included</span>
                    </div>
                  ) : null}

                  {/* Plan Limits & Capabilities */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Included Capabilities
                    </p>

                    <ul className="space-y-2.5 text-xs font-medium">
                      {/* Teammate Seats */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {formatLimit(plan.max_team_members, plan.max_team_members === 1 ? 'Teammate Seat' : 'Teammate Seats')}
                          </strong>
                        </span>
                      </li>

                      {/* Channels */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {formatLimit(plan.max_channels, 'Channel Gateways')}
                          </strong>
                        </span>
                      </li>

                      {/* Broadcast Campaigns */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {formatLimit(plan.max_campaigns, 'Broadcast Campaigns')}
                          </strong> / mo
                        </span>
                      </li>

                      {/* Automation Flows */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {formatLimit(plan.max_automations, 'Flow Automations')}
                          </strong>
                        </span>
                      </li>

                      {/* Monthly Messages Cap */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {plan.monthly_messages_limit === -1 || plan.monthly_messages_limit === null || plan.monthly_messages_limit === undefined
                              ? 'Unlimited'
                              : plan.monthly_messages_limit.toLocaleString()}
                          </strong> Messages / mo
                        </span>
                      </li>

                      {/* AI Tokens / Credits */}
                      <li className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-zinc-700">
                          <strong className="text-[#0A0A0A] font-bold">
                            {formatTokens(plan.monthly_ai_tokens)}
                          </strong>
                        </span>
                      </li>

                      {/* Built-in CRM Pipelines */}
                      <li className="flex items-center gap-2.5">
                        {plan.own_crm_access ? (
                          <>
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            <span className="text-zinc-700">
                              <strong className="text-[#0A0A0A] font-bold">Full CRM Pipeline access</strong>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                            <span className="text-zinc-400 line-through">
                              Full CRM Pipeline access
                            </span>
                          </>
                        )}
                      </li>

                      {/* Flow Templates */}
                      <li className="flex items-center gap-2.5">
                        {plan.has_flow_templates ? (
                          <>
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            <span className="text-zinc-700">
                              <strong className="text-[#0A0A0A] font-bold">Prebuilt Flow Templates</strong>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                            <span className="text-zinc-400 line-through">
                              Prebuilt Flow Templates
                            </span>
                          </>
                        )}
                      </li>

                      {/* E-Commerce Stores */}
                      {plan.max_ecommerce_stores !== undefined && (
                        <li className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-zinc-700">
                            <strong className="text-[#0A0A0A] font-bold">
                              {formatLimit(plan.max_ecommerce_stores ?? 1, (plan.max_ecommerce_stores ?? 1) === 1 ? 'E-Commerce Store' : 'E-Commerce Stores')}
                            </strong>
                          </span>
                        </li>
                      )}

                      {/* E-Commerce Products */}
                      {plan.max_ecommerce_products !== undefined && (
                        <li className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-zinc-700">
                            <strong className="text-[#0A0A0A] font-bold">
                              {formatLimit(plan.max_ecommerce_products ?? 100, 'Catalog Products')}
                            </strong>
                          </span>
                        </li>
                      )}

                      {/* Monthly E-Commerce Orders */}
                      {plan.monthly_ecommerce_orders !== undefined && (
                        <li className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-zinc-700">
                            <strong className="text-[#0A0A0A] font-bold">
                              {formatLimit(plan.monthly_ecommerce_orders ?? 100, 'Orders')}
                            </strong> / mo
                          </span>
                        </li>
                      )}

                      {/* Abandoned Cart Recovery */}
                      {plan.has_abandoned_cart_recovery !== undefined && (
                        <li className="flex items-center gap-2.5">
                          {plan.has_abandoned_cart_recovery ? (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span className="text-zinc-700">
                                <strong className="text-[#0A0A0A] font-bold">Cart Recovery Reminders</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                                <X className="w-2.5 h-2.5 stroke-[2.5]" />
                              </span>
                              <span className="text-zinc-400 line-through">
                                Cart Recovery Reminders
                              </span>
                            </>
                          )}
                        </li>
                      )}

                      {/* WhatsApp Native Checkout */}
                      {plan.has_whatsapp_checkout !== undefined && (
                        <li className="flex items-center gap-2.5">
                          {plan.has_whatsapp_checkout ? (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span className="text-zinc-700">
                                <strong className="text-[#0A0A0A] font-bold">WhatsApp Native Checkout</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                                <X className="w-2.5 h-2.5 stroke-[2.5]" />
                              </span>
                              <span className="text-zinc-400 line-through">
                                WhatsApp Native Checkout
                              </span>
                            </>
                          )}
                        </li>
                      )}

                      {/* Meta Ad Accounts */}
                      {plan.max_meta_ad_accounts !== undefined && (
                        <li className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-zinc-700">
                            <strong className="text-[#0A0A0A] font-bold">
                              {formatLimit(plan.max_meta_ad_accounts ?? 1, (plan.max_meta_ad_accounts ?? 1) === 1 ? 'Meta Ad Account' : 'Meta Ad Accounts')}
                            </strong>
                          </span>
                        </li>
                      )}

                      {/* Meta Active Campaigns */}
                      {plan.max_meta_campaigns !== undefined && (
                        <li className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-zinc-700">
                            <strong className="text-[#0A0A0A] font-bold">
                              {formatLimit(plan.max_meta_campaigns ?? 2, 'Active Meta Campaigns')}
                            </strong>
                          </span>
                        </li>
                      )}

                      {/* Click-to-WhatsApp Ads */}
                      {plan.has_click_to_whatsapp_ads !== undefined && (
                        <li className="flex items-center gap-2.5">
                          {plan.has_click_to_whatsapp_ads ? (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span className="text-zinc-700">
                                <strong className="text-[#0A0A0A] font-bold">Click-to-WhatsApp Ads & Flows</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                                <X className="w-2.5 h-2.5 stroke-[2.5]" />
                              </span>
                              <span className="text-zinc-400 line-through">
                                Click-to-WhatsApp Ads & Flows
                              </span>
                            </>
                          )}
                        </li>
                      )}

                      {/* Meta Lead Sync */}
                      {plan.has_meta_lead_sync !== undefined && (
                        <li className="flex items-center gap-2.5">
                          {plan.has_meta_lead_sync ? (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span className="text-zinc-700">
                                <strong className="text-[#0A0A0A] font-bold">Meta Lead Forms CRM Sync</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400 shrink-0">
                                <X className="w-2.5 h-2.5 stroke-[2.5]" />
                              </span>
                              <span className="text-zinc-400 line-through">
                                Meta Lead Forms CRM Sync
                              </span>
                            </>
                          )}
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Supported Channels Logo Strip */}
                  {planChannels.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Supported Channels ({planChannels.length})
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {planChannels.map((ch) => (
                          <img 
                            key={ch.id}
                            src={ch.src} 
                            alt={ch.name}
                            title={ch.name}
                            className="h-4 w-4 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supported Integrations Logo Strip */}
                  {planIntegrations.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Supported Integrations ({planIntegrations.length})
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {planIntegrations.map((itg) => (
                          <img 
                            key={itg.id}
                            src={itg.src} 
                            alt={itg.name}
                            title={itg.name}
                            className="h-4 w-4 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Pricing Card CTA Button */}
                <div className="pt-8">
                  <a
                    href={`/register?plan=${plan.id}&interval=${billingInterval}&currency=${selectedCurrencyCode}`}
                    className={`w-full py-3 rounded-xl font-black text-center text-xs transition-all uppercase tracking-wider block shadow-2xs cursor-pointer ${
                      isPopular 
                        ? 'bg-[#0A0A0A] text-white hover:bg-zinc-900' 
                        : 'bg-[#FAF9F6] text-[#0A0A0A] border border-[#E8E8E6] hover:bg-[#F4F4F2]'
                    }`}
                  >
                    {isFree ? 'Start Free' : (plan.trial_days ? `Start ${plan.trial_days}-Day Trial` : 'Get Started')}
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Small Print disclaimer */}
        <p className="text-[11px] text-[#6B6B6B] font-medium mt-12 max-w-lg mx-auto leading-relaxed">
          All plans include unified omnichannel inbox, AI agents, and campaign broadcasts. Upgrade or change your currency anytime from billing settings.
        </p>

      </div>
    </section>
  );
}
