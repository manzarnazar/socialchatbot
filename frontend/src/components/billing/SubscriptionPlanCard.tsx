'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
  Check, 
  X,
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';

export interface PlanPriceDetails {
  id?: number;
  stripe_price_id: string;
  paddle_price_id?: string;
  amount: number;
  interval: string;
  currency_code: string;
  currency_symbol: string;
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
}

interface SubscriptionPlanCardProps {
  plan: PlanDetails;
  billingInterval: 'month' | 'year';
  isCurrent?: boolean;
  currentPlanAmount?: number | null;
  currentPlanId?: number | null;
  hasActiveSubscription?: boolean;
  isPopular?: boolean;
  isLoading?: boolean;
  aiOperationalModel?: 'byok' | 'master_fixed';
  onSelect: (stripePriceId?: string, planId?: number, priceDbId?: number, isTrial?: boolean) => void;
}

const ALL_CHANNELS = [
  { id: 'whatsapp', src: '/channels/whatsapp.webp', name: 'WhatsApp' },
  { id: 'whatsapp_cloud', src: '/channels/whatsapp.webp', name: 'WhatsApp Cloud' },
  { id: 'whatsapp_baileys', src: '/channels/whatsapp.webp', name: 'WhatsApp QR' },
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

export function SubscriptionPlanCard({
  plan,
  billingInterval,
  isCurrent = false,
  currentPlanAmount = null,
  currentPlanId = null,
  hasActiveSubscription = false,
  isPopular = false,
  isLoading = false,
  aiOperationalModel = 'byok',
  onSelect,
}: SubscriptionPlanCardProps) {
  const t = useTranslations('PlanCard');

  const isFree = plan.name.toLowerCase().includes('free') || 
    plan.prices.every(p => p.amount === 0) || 
    plan.prices.length === 0;

  const activePrice = plan.prices.find(p => p.interval === billingInterval) || plan.prices[0];
  const priceVal = activePrice ? (activePrice.amount / 100).toFixed(0) : '0';
  const currencySymbol = activePrice?.currency_symbol || '$';

  // Compute dynamic annual savings percentage compared to 12 x monthly price
  const monthlyPrice = plan.prices.find(p => p.interval === 'month');
  const yearlyPrice = plan.prices.find(p => p.interval === 'year');
  const savingsPercent = (() => {
    if (billingInterval !== 'year' || isFree || !monthlyPrice || !yearlyPrice || monthlyPrice.amount <= 0) {
      return 0;
    }
    const annualFromMonthly = monthlyPrice.amount * 12;
    if (yearlyPrice.amount >= annualFromMonthly) return 0;
    return Math.round(((annualFromMonthly - yearlyPrice.amount) / annualFromMonthly) * 100);
  })();

  // Compute upgrade vs downgrade
  const isDowngrade = Boolean(
    hasActiveSubscription && 
    !isCurrent && 
    currentPlanAmount !== null && 
    currentPlanAmount !== undefined && 
    activePrice && 
    activePrice.amount < currentPlanAmount
  );

  const isUpgrade = Boolean(
    hasActiveSubscription && 
    !isCurrent && 
    currentPlanAmount !== null && 
    currentPlanAmount !== undefined && 
    activePrice && 
    activePrice.amount > currentPlanAmount
  );

  const formatLimit = (val: number, label: string) => {
    if (val === -1 || val >= 99999) return `${t('unlimited')} ${label}`;
    return `${val.toLocaleString()} ${label}`;
  };

  // Filter channels strictly from database definition
  const resolvedChannels = React.useMemo(() => {
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
            (chId === 'whatsapp' && (c.id === 'whatsapp' || c.id === 'whatsapp_cloud')) ||
            (chId === 'whatsapp_cloud' && (c.id === 'whatsapp' || c.id === 'whatsapp_cloud'))
          );

          if (found) {
            const familyKey = found.id.startsWith('whatsapp') ? 'whatsapp' : found.id;
            if (seen.has(familyKey)) continue;
            seen.add(familyKey);
            list.push(found);
          }
        }
        return list;
      }
    }

    return [];
  }, [plan.allowed_channels, plan.max_channels]);

  // Filter integrations strictly from database definition
  const resolvedIntegrations = React.useMemo(() => {
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
  }, [plan.allowed_integrations, plan.max_integrations]);

  return (
    <div 
      className={`bg-white rounded-xl p-6 flex flex-col justify-between transition-all duration-200 select-none ${
        isCurrent
          ? 'border-2 border-[#4AE54A] shadow-xs'
          : 'border border-[#E8E8E6] shadow-3xs hover:border-zinc-300'
      }`}
    >
      {/* Top Header Row */}
      <div>
        <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
          {plan.name}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-zinc-500 font-normal mt-1.5 leading-relaxed line-clamp-2 min-h-[32px]">
          {plan.description || t('defaultPlanDesc')}
        </p>

        {/* Highly Visible Pricing Area */}
        <div className="mt-5 pt-3 border-t border-zinc-100 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline">
            {isFree ? (
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-950 font-mono">{currencySymbol}0</span>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-800 mr-0.5 tracking-tight font-mono">
                  {currencySymbol}
                </span>
                <span className="text-4xl sm:text-5xl font-black text-zinc-950 tracking-tight font-mono">
                  {Number(priceVal).toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-500 ml-1.5">
                  {billingInterval === 'year' ? t('perYear') : t('perMonth')}
                </span>
              </>
            )}
          </div>

          {savingsPercent > 0 && (
            <span className="text-[10px] font-extrabold text-emerald-800 bg-[#E8FDE8] border border-[#4AE54A]/30 px-2 py-0.5 rounded-[4px]">
              {t('saveDiscount', { percent: savingsPercent })}
            </span>
          )}
        </div>

        {/* Trial Note */}
        {plan.trial_days && plan.trial_days > 0 ? (
          <p className="text-[11px] text-zinc-500 font-medium mt-2">
            {t('includesTrial', { days: plan.trial_days })}
          </p>
        ) : null}

        {/* Features & Quotas List */}
        <div className="mt-6 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t('includedCapabilities')}
          </p>

          <ul className="space-y-2.5 text-xs font-medium">
            {/* Workspaces */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {formatLimit(plan.max_workspaces ?? 1, (plan.max_workspaces ?? 1) === 1 ? t('workspace') : t('workspaces'))}
                </strong>
              </span>
            </li>

            {/* Team Members */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {formatLimit(plan.max_team_members, t('teammateSeats'))}
                </strong>
              </span>
            </li>

            {/* Channels */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {formatLimit(plan.max_channels, t('channelGateways'))}
                </strong>
              </span>
            </li>

            {/* Broadcast Campaigns */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {formatLimit(plan.max_campaigns, t('broadcastCampaigns'))}
                </strong> {t('perMonth')}
              </span>
            </li>

            {/* Automation Flows */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {formatLimit(plan.max_automations, t('automationFlows'))}
                </strong>
              </span>
            </li>

            {/* Outbound Messages Cap */}
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-zinc-700">
                <strong className="text-zinc-950 font-bold">
                  {plan.monthly_messages_limit === -1 || plan.monthly_messages_limit === null || plan.monthly_messages_limit === undefined
                    ? t('unlimited')
                    : plan.monthly_messages_limit.toLocaleString()}
                </strong> {t('monthlyMessages')}
              </span>
            </li>

            {/* AI Credits & Monthly AI Tokens (Only in Master Fixed Mode) */}
            {aiOperationalModel === 'master_fixed' && (
              <>
                {/* AI Credits */}
                <li className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span className="text-zinc-700">
                    <strong className="text-zinc-950 font-bold">
                      {plan.flow_credits === -1 ? t('unlimited') : (plan.flow_credits ?? 0).toLocaleString()}
                    </strong> {t('aiCredits')}
                  </span>
                </li>

                {/* Monthly AI Tokens */}
                <li className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span className="text-zinc-700">
                    <strong className="text-zinc-950 font-bold">
                      {plan.monthly_ai_tokens ? (plan.monthly_ai_tokens >= 1000000 ? `${(plan.monthly_ai_tokens / 1000000).toFixed(plan.monthly_ai_tokens % 1000000 === 0 ? 0 : 1)}M` : `${Math.round(plan.monthly_ai_tokens / 1000)}k`) : '0'}
                    </strong> {t('monthlyAiTokens')}
                  </span>
                </li>
              </>
            )}

            {/* CRM & Pipeline */}
            <li className="flex items-center gap-2.5">
              {plan.own_crm_access ? (
                <>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 text-zinc-900 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span className="text-zinc-700">
                    <strong className="text-zinc-950 font-bold">{t('fullCrmPipelines')}</strong>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                    <X className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span className="text-zinc-400 line-through">
                    {t('fullCrmPipelines')}
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
                    <strong className="text-zinc-950 font-bold">{t('prebuiltFlowTemplates')}</strong>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                    <X className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span className="text-zinc-400 line-through">
                    {t('prebuiltFlowTemplates')}
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
                  <strong className="text-zinc-950 font-bold">
                    {formatLimit(plan.max_ecommerce_stores ?? 1, (plan.max_ecommerce_stores ?? 1) === 1 ? t('ecommerceStore') : t('ecommerceStores'))}
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
                  <strong className="text-zinc-950 font-bold">
                    {formatLimit(plan.max_ecommerce_products ?? 100, t('catalogProducts'))}
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
                  <strong className="text-zinc-950 font-bold">
                    {formatLimit(plan.monthly_ecommerce_orders ?? 100, t('ordersCount'))}
                  </strong> {t('perMonth')}
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
                      <strong className="text-zinc-950 font-bold">{t('cartRecoveryReminders')}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                    <span className="text-zinc-400 line-through">
                      {t('cartRecoveryReminders')}
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
                      <strong className="text-zinc-950 font-bold">{t('whatsappNativeCheckout')}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                    <span className="text-zinc-400 line-through">
                      {t('whatsappNativeCheckout')}
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
                  <strong className="text-zinc-950 font-bold">
                    {formatLimit(plan.max_meta_ad_accounts ?? 1, (plan.max_meta_ad_accounts ?? 1) === 1 ? t('metaAdAccount') : t('metaAdAccounts'))}
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
                  <strong className="text-zinc-950 font-bold">
                    {formatLimit(plan.max_meta_campaigns ?? 2, t('activeMetaCampaigns'))}
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
                      <strong className="text-zinc-950 font-bold">{t('clickToWhatsAppAds')}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                    <span className="text-zinc-400 line-through">
                      {t('clickToWhatsAppAds')}
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
                      <strong className="text-zinc-950 font-bold">{t('metaLeadSync')}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-50 border border-zinc-200/80 text-zinc-400 shrink-0">
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                    <span className="text-zinc-400 line-through">
                      {t('metaLeadSync')}
                    </span>
                  </>
                )}
              </li>
            )}
          </ul>
        </div>

        {/* Direct Channels & Integrations Logos strictly from database definition */}
        <div className="mt-6 pt-4 border-t border-zinc-100 space-y-3">
          {resolvedChannels.length > 0 && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                {t('supportedChannels')} ({resolvedChannels.length})
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {resolvedChannels.map((ch) => (
                  <img 
                    key={ch.id}
                    src={ch.src} 
                    alt={ch.name}
                    title={ch.name}
                    className="h-4.5 w-4.5 object-contain hover:scale-110 transition-transform cursor-pointer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ))}
              </div>
            </div>
          )}

          {resolvedIntegrations.length > 0 && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                {t('supportedIntegrations')} ({resolvedIntegrations.length})
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {resolvedIntegrations.map((itg) => (
                  <img 
                    key={itg.id}
                    src={itg.src} 
                    alt={itg.name}
                    title={itg.name}
                    className="h-4.5 w-4.5 object-contain hover:scale-110 transition-transform cursor-pointer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-2">
        {(() => {
          const isTrialAction = !hasActiveSubscription && !isCurrent && Boolean(plan.trial_days && plan.trial_days > 0);
          return (
            <button
              type="button"
              disabled={isLoading || isCurrent}
              onClick={() => onSelect(activePrice?.stripe_price_id, plan.id, activePrice?.id, isTrialAction)}
              className={`w-full h-9 rounded-[6px] text-xs font-bold transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                isCurrent
                  ? 'bg-zinc-100 text-zinc-400 border border-[#E8E8E6] cursor-default'
                  : isTrialAction || isPopular || !isFree
                    ? 'bg-zinc-955 hover:bg-zinc-900 text-white active:scale-99'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900 border border-[#E8E8E6] active:scale-99'
              }`}
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-current" />
              ) : isCurrent ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{t('currentPlan')}</span>
                </>
              ) : isTrialAction ? (
                <>
                  <span>{t('startFreeTrial', { days: plan.trial_days || 14 })}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : isDowngrade ? (
                <>
                  <span>{t('downgradeTo', { name: plan.name })}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : isUpgrade ? (
                <>
                  <span>{t('upgradeTo', { name: plan.name })}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : isFree ? (
                <>
                  <span>{t('getStarted')}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>{t('selectPlan', { name: plan.name })}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

