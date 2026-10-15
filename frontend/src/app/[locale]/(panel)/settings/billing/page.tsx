'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  CreditCard, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert,
  CalendarDays,
  UserPlus,
  Megaphone,
  Radio,
  Zap,
  Sparkles,
  CheckCircle2,
  X,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { SubscriptionPlanCard, PlanDetails } from '@/components/billing/SubscriptionPlanCard';
import { openPaddleCheckout } from '@/lib/paddle';

interface CurrencyOption {
  id: number;
  code: string;
  symbol: string;
  name: string;
  payment_gateway?: string;
  is_default: boolean;
}

interface CurrentSubscription {
  status: string;
  is_trial?: boolean;
  on_trial?: boolean;
  is_trial_expired?: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  razorpay_subscription_id?: string | null;
  razorpay_customer_id?: string | null;
  paystack_subscription_id?: string | null;
  paystack_customer_id?: string | null;
  flutterwave_subscription_id?: string | null;
  flutterwave_customer_id?: string | null;
  paypal_subscription_id?: string | null;
  paypal_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_customer_id?: string | null;
  active_gateway?: string | null;
  ai_operational_model?: 'byok' | 'master_fixed';
  plan: {
    id: number;
    name: string;
    description: string;
    max_team_members: number;
    max_campaigns: number;
    max_integrations: number;
    own_crm_access: boolean;
    max_channels: number;
    max_automations: number;
    flow_credits: number;
    monthly_ai_tokens?: number;
  } | null;
  flow_credits?: {
    max_credits: number;
    used_credits: number;
    remaining_credits: number;
    is_unlimited?: boolean;
  };
  price: {
    amount: number;
    currency: string;
    interval: string;
  } | null;
}

export default function BillingSettingsPage() {
  const t = useTranslations('Settings');
  const tBilling = useTranslations('Billing');
  const tPlanCard = useTranslations('PlanCard');
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [resolvedCurrency, setResolvedCurrency] = useState<CurrencyOption | null>(null);
  const [activeCurrencies, setActiveCurrencies] = useState<CurrencyOption[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [platformCurrencyCode, setPlatformCurrencyCode] = useState('USD');
  const [platformCurrencySymbol, setPlatformCurrencySymbol] = useState('$');
  const [aiOperationalModel, setAiOperationalModel] = useState<'byok' | 'master_fixed'>('byok');

  const maxSavingsPercent = useMemo(() => {
    let maxSaved = 0;
    for (const p of plans) {
      const m = p.prices?.find(pr => pr.interval === 'month');
      const y = p.prices?.find(pr => pr.interval === 'year');
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

  const syncBillingData = async (overrideCurrency?: string) => {
    setLoading(true);
    try {
      const activeCurrency = overrideCurrency || selectedCurrencyCode;
      const plansUrl = activeCurrency ? `/billing/plans?currency=${activeCurrency}` : '/billing/plans';

      const sessionId = searchParams.get('session_id')
        || searchParams.get('razorpay_subscription_id')
        || searchParams.get('razorpay_payment_id')
        || searchParams.get('paystack_reference')
        || searchParams.get('reference')
        || searchParams.get('trxref')
        || searchParams.get('transaction_id')
        || searchParams.get('tx_ref')
        || searchParams.get('flutterwave_reference')
        || searchParams.get('subscription_id')
        || searchParams.get('paypal_subscription_id')
        || searchParams.get('_ptxn')
        || searchParams.get('paddle_transaction_id')
        || searchParams.get('preapproval_id')
        || searchParams.get('preference_id')
        || searchParams.get('mercadopago_subscription_id')
        || searchParams.get('merchantSubscriptionId')
        || searchParams.get('merchant_subscription_id')
        || searchParams.get('merchantTransactionId')
        || searchParams.get('paymentId')
        || searchParams.get('payment_id')
        || searchParams.get('InvoiceId')
        || searchParams.get('invoice_id')
        || searchParams.get('recurring_id')
        || searchParams.get('myfatoorah_subscription_id')
        || searchParams.get('mf_recurring_id');

      const queryParams = new URLSearchParams();
      searchParams.forEach((val, key) => {
        if (val && val !== '{CHECKOUT_SESSION_ID}') {
          queryParams.set(key, val);
        }
      });
      if (activeCurrency) {
        queryParams.set('currency', activeCurrency);
      }

      const queryString = queryParams.toString();
      const subUrl = queryString ? `/billing/subscription?${queryString}` : '/billing/subscription';

      const [subRes, plansRes] = await Promise.all([
        fetchWithCsrf(subUrl),
        fetchWithCsrf(plansUrl),
      ]);

      if (subRes.ok && plansRes.ok) {
        const subData = await subRes.json();
        const plansData = await plansRes.json();
        setSub(subData);
        setPlans(plansData.plans || []);

        if (plansData?.resolved_currency) {
          setResolvedCurrency(plansData.resolved_currency);
          if (!overrideCurrency && !selectedCurrencyCode) {
            setSelectedCurrencyCode(plansData.resolved_currency.code);
          }
        } else if (subData?.resolved_currency) {
          setResolvedCurrency(subData.resolved_currency);
          if (!overrideCurrency && !selectedCurrencyCode) {
            setSelectedCurrencyCode(subData.resolved_currency.code);
          }
        }

        if (plansData?.active_currencies) {
          setActiveCurrencies(plansData.active_currencies);
        } else if (subData?.active_currencies) {
          setActiveCurrencies(subData.active_currencies);
        }
        
        if (subData?.ai_operational_model) {
          setAiOperationalModel(subData.ai_operational_model);
        } else if (plansData?.ai_operational_model) {
          setAiOperationalModel(plansData.ai_operational_model);
        }
        
        if (subData?.resolved_currency) {
          setPlatformCurrencyCode(subData.resolved_currency.code);
          setPlatformCurrencySymbol(subData.resolved_currency.symbol);
        } else if (subData?.platform_currency) {
          setPlatformCurrencyCode(subData.platform_currency.code);
          setPlatformCurrencySymbol(subData.platform_currency.symbol);
        } else if (plansData?.resolved_currency) {
          setPlatformCurrencyCode(plansData.resolved_currency.code);
          setPlatformCurrencySymbol(plansData.resolved_currency.symbol);
        } else if (plansData?.platform_currency) {
          setPlatformCurrencyCode(plansData.platform_currency.code);
          setPlatformCurrencySymbol(plansData.platform_currency.symbol);
        }

        // Match user's current billing interval if subscribed
        if (subData?.price?.interval) {
          setBillingInterval(subData.price.interval as 'month' | 'year');
        }

        // If we verified a session, trigger /auth/me to update cookies
        if (sessionId) {
          await fetchWithCsrf('/auth/me');
        }
      }
    } catch {
      toast.error(t('billingSyncError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (newCode: string) => {
    setSelectedCurrencyCode(newCode);
    syncBillingData(newCode);
  };

  useEffect(() => {
    syncBillingData();

    // Check url search parameters for callback toasts
    const isCallbackSuccess = searchParams.get('session_id') 
      || searchParams.get('razorpay_subscription_id') 
      || searchParams.get('razorpay_payment_id')
      || searchParams.get('paystack_reference')
      || searchParams.get('reference')
      || searchParams.get('trxref')
      || searchParams.get('transaction_id')
      || searchParams.get('tx_ref')
      || searchParams.get('_ptxn')
      || searchParams.get('paddle_transaction_id')
      || searchParams.get('preapproval_id')
      || searchParams.get('preference_id')
      || searchParams.get('mercadopago_subscription_id')
      || searchParams.get('merchantSubscriptionId')
      || searchParams.get('merchant_subscription_id')
      || searchParams.get('merchantTransactionId')
      || searchParams.get('paymentId')
      || searchParams.get('payment_id')
      || searchParams.get('InvoiceId')
      || searchParams.get('invoice_id')
      || searchParams.get('recurring_id')
      || searchParams.get('myfatoorah_subscription_id')
      || searchParams.get('mf_recurring_id')
      || (searchParams.get('status') === 'successful' || searchParams.get('status') === 'approved' || searchParams.get('status') === 'Paid');

    if (isCallbackSuccess) {
      toast.success(t('subscriptionComplete'), {
        description: t('subscriptionCompleteDesc'),
      });
    } else if (searchParams.get('checkout') === 'cancelled' || searchParams.get('status') === 'cancelled') {
      toast.warning(t('checkoutCancelled'), {
        description: t('checkoutCancelledDesc'),
      });
    }
  }, [searchParams]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).PaystackPop) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = (priceId?: string, planId?: number, priceDbId?: number, isTrial?: boolean) => {
    const effectivePriceId = priceId || (priceDbId ? `price_plan_${planId}_${priceDbId}` : (planId ? `price_plan_${planId}` : ''));
    setActionLoadingId(effectivePriceId || String(planId));
    startTransition(async () => {
      try {
        const response = await fetchWithCsrf('/billing/checkout', {
          method: 'POST',
          body: JSON.stringify({ 
            stripe_price_id: effectivePriceId,
            price_id: priceDbId,
            plan_id: planId,
            interval: billingInterval,
            currency: selectedCurrencyCode || resolvedCurrency?.code,
            mode: isTrial ? 'trial' : undefined,
            start_trial: isTrial ? true : undefined,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.immediate) {
            toast.success(t('subscriptionTierChanged'), {
              description: data.message,
            });
            syncBillingData();
          } else if (data.gateway === 'paystack') {
            const checkoutUrl = data.authorization_url || data.checkout_url;
            if (checkoutUrl) {
              window.location.href = checkoutUrl;
            } else {
              throw new Error(tBilling('paystackInitError'));
            }
          } else if (data.gateway === 'flutterwave') {
            const checkoutUrl = data.authorization_url || data.checkout_url;
            if (checkoutUrl) {
              window.location.href = checkoutUrl;
            } else {
              throw new Error(tBilling('flutterwaveInitError'));
            }
          } else if (data.gateway === 'paypal') {
            const checkoutUrl = data.checkout_url;
            if (checkoutUrl) {
              window.location.href = checkoutUrl;
            } else {
              throw new Error(tBilling('paypalInitError'));
            }
          } else if (data.gateway === 'mercadopago') {
            const checkoutUrl = data.checkout_url || data.url;
            if (checkoutUrl) {
              window.location.href = checkoutUrl;
            } else {
              throw new Error(tBilling('mercadoPagoInitError') || 'Failed to initialize Mercado Pago checkout.');
            }
          } else if (data.gateway === 'myfatoorah') {
            const checkoutUrl = data.checkout_url || data.PaymentURL || data.payment_url;
            if (checkoutUrl) {
              window.location.href = checkoutUrl;
            } else {
              throw new Error(tBilling('myfatoorahInitError') || 'Failed to initialize MyFatoorah recurring checkout.');
            }

          } else if (data.gateway === 'paddle') {
            const txId = data.transaction_id || (data.checkout_url ? new URL(data.checkout_url, window.location.origin).searchParams.get('_ptxn') : null);
            if (txId) {
              const opened = await openPaddleCheckout({
                transactionId: txId,
                planId,
                config: data.client_token ? {
                  client_token: data.client_token,
                  mode: data.mode || 'sandbox',
                  enabled: true,
                } : undefined,
                onSuccess: () => {
                  toast.success(tBilling('subscriptionActivated'));
                  syncBillingData();
                },
              });
              if (!opened && data.checkout_url) {
                window.location.href = data.checkout_url;
              }
            } else if (data.checkout_url) {
              window.location.href = data.checkout_url;
            } else {
              throw new Error(tBilling('paddleInitError'));
            }
          } else if (data.subscription_id && data.gateway === 'razorpay') {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
              throw new Error(tBilling('razorpaySdkLoadError'));
            }

            const options = {
              key: data.key_id,
              subscription_id: data.subscription_id,
              name: data.name || 'WhatsOmni',
              description: data.description || tBilling('recurringSubscription'),
              image: '/favicon.ico',
              prefill: data.customer || {},
              theme: data.theme || { color: '#000000' },
              handler: async function (res: any) {
                try {
                  setActionLoadingId(effectivePriceId || String(planId));
                  const verifyRes = await fetchWithCsrf('/billing/razorpay/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                      razorpay_payment_id: res.razorpay_payment_id,
                      razorpay_subscription_id: res.razorpay_subscription_id,
                      razorpay_signature: res.razorpay_signature,
                      plan_id: planId,
                    }),
                  });
                  const verifyData = await verifyRes.json();
                  if (verifyRes.ok) {
                    toast.success(tBilling('subscriptionActivated'));
                    syncBillingData();
                  } else {
                    toast.error(verifyData.message || tBilling('signatureVerificationFailed'));
                  }
                } catch {
                  toast.error(tBilling('paymentVerificationFailed'));
                } finally {
                  setActionLoadingId(null);
                }
              },
              modal: {
                ondismiss: function () {
                  setActionLoadingId(null);
                }
              }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          } else if (data.checkout_url) {
            window.location.href = data.checkout_url;
          }
        } else {
          throw new Error(data.message || tBilling('checkoutFlowError'));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : tBilling('checkoutFailed');
        toast.error(msg);
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const handlePortalRedirect = () => {
    setPortalLoading(true);
    startTransition(async () => {
      try {
        const response = await fetchWithCsrf('/billing/portal', {
          method: 'POST',
        });

        const data = await response.json();
        if (response.ok && data.portal_url) {
          window.location.href = data.portal_url;
        } else {
          throw new Error(data.message || tBilling('portalSessionRejected'));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : tBilling('failedToRedirect');
        toast.error(msg);
      } finally {
        setPortalLoading(false);
      }
    });
  };

  const handleConfirmCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const res = await fetchWithCsrf('/billing/cancel', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(tBilling('subscriptionCancelledSuccess'));
        setIsCancelModalOpen(false);
        syncBillingData();
      } else {
        toast.error(data.message || tBilling('failedToCancel'));
      }
    } catch {
      toast.error(tBilling('failedToCancel'));
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('billingLedgerSync')} />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-[#E8FDE8] text-emerald-800 border border-[#4AE54A]/20 rounded-full select-none">
            <span className="h-1.5 w-1.5 bg-[#4AE54A] rounded-full animate-pulse" />
            {t('activeSubscription')}
          </span>
        );
      case 'trial':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full select-none">
            <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full" />
            {t('freeTrial')}
          </span>
        );
      case 'suspended':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 rounded-full select-none">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t('suspended')}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-neutral-50 text-zinc-500 border border-neutral-200 rounded-full select-none">
            {status}
          </span>
        );
    }
  };

  const getTrialExpiryText = () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const dateStr = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return tBilling('trialExpires', { date: dateStr });
  };

  const getNextBillingText = () => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 1);
    const dateStr = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return tBilling('nextBilling', { date: dateStr });
  };

  const displayPlan = sub?.plan || {
    name: t('trialAccount'),
    description: t('defaultTrialNotice'),
    max_team_members: 5,
    max_campaigns: 5,
    max_channels: 2,
    max_automations: 3,
    flow_credits: 50,
    monthly_ai_tokens: 100000,
  };

  return (
    <div className="w-full animate-fade-in relative font-sans text-black select-none flex-1 overflow-y-auto">
      
      {/* Section 1: Active Plan Summary & Main Actions */}
      <div className="w-full px-8 pt-8 pb-6 border-b border-[#E8E8E6]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[9px] font-black tracking-widest text-[#6B6B6B] uppercase block">
              {tBilling('activePlan')}
            </span>
            
            <div className="flex items-center gap-3">
              <h3 className="font-black text-2xl tracking-tight text-zinc-955 uppercase">
                {displayPlan.name}
              </h3>
              {sub?.plan && (sub.paddle_subscription_id || sub.active_gateway === 'paddle' || resolvedCurrency?.payment_gateway === 'paddle') && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-white border border-[#E8E8E6] text-zinc-800 shadow-3xs">
                  <img src="/payments/paddle.png" alt="Paddle" className="h-3 w-auto object-contain" />
                  <span>Paddle</span>
                </span>
              )}

            </div>

            <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-xl font-medium">
              {sub?.plan 
                ? (sub.price?.interval === 'year'
                  ? t('renewsAnnually', { description: sub.plan.description || tBilling('defaultPlanCapabilities') })
                  : t('renewsMonthly', { description: sub.plan.description || tBilling('defaultPlanCapabilities') }))
                : t('defaultTrialNotice')
              }
            </p>
          </div>

          {/* Subscription Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* In-app Cancel Subscription Button for PayPal, Flutterwave, Paystack, Razorpay, Paddle, or Stripe */}
            {sub?.plan && (sub.paddle_subscription_id || sub.paypal_subscription_id || sub.flutterwave_subscription_id || sub.paystack_subscription_id || sub.razorpay_subscription_id || sub.stripe_subscription_id || sub.status === 'active') && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 bg-red-50/70 hover:bg-red-100/80 border border-red-200/90 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-3xs cursor-pointer active:scale-[0.98] select-none"
              >
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span>{tBilling('cancelSubscription')}</span>
              </button>
            )}

            {/* Invoicing / Portal Action Button for Stripe, Paystack, PayPal, or Paddle */}
            {(sub?.stripe_customer_id || sub?.paystack_subscription_id || sub?.paypal_subscription_id || sub?.paddle_customer_id || sub?.paddle_subscription_id) && (
              <button
                type="button"
                onClick={handlePortalRedirect}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-3 bg-zinc-950 text-white hover:bg-zinc-900 border border-zinc-955 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm shrink-0 cursor-pointer active:scale-[0.98] select-none"
              >
                {portalLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mx-auto text-white" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> 
                    <span>{t('manageBillingDashboard')}</span> 
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Price and Subscription Metadata Grid */}
      <div className="w-full px-8 py-6 border-b border-[#E8E8E6]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Price Detail */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
              {t('rateTier')}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-zinc-955">
                {sub?.price 
                  ? `${sub.price.currency.toUpperCase()} ${(sub.price.amount / 100).toFixed(0)}`
                  : `${platformCurrencyCode} 0`}
              </span>
              <span className="text-[10px] font-black uppercase text-zinc-455">
                / {sub?.price?.interval === 'year' ? t('yearly') : t('monthly')}
              </span>
            </div>
          </div>

          {/* Next Invoice Date */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-zinc-650" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                {tBilling('billingLedgerSchedule')}
              </span>
              <span className="text-xs font-black text-zinc-950">
                {sub?.plan ? getNextBillingText() : getTrialExpiryText()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Workspace Limits Overview */}
      <div className="w-full px-8 py-6 border-b border-[#E8E8E6]">
        <div className="space-y-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
            {tBilling('workspaceResourceAllotment')}
          </span>
          
          <div className={`grid gap-6 ${
            aiOperationalModel === 'master_fixed'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
          }`}>
            
            <div className="space-y-3 transition-all">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                  <UserPlus className="h-4 w-4 text-zinc-400" />
                  <span>{tBilling('teammates')}</span>
                </div>
                <span className="font-black text-zinc-955 text-sm">{displayPlan.max_team_members === -1 ? 'Unlimited' : displayPlan.max_team_members}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-3 transition-all">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                  <Megaphone className="h-4 w-4 text-zinc-400" />
                  <span>{tBilling('campaigns')}</span>
                </div>
                <span className="font-black text-zinc-955 text-sm">{displayPlan.max_campaigns === -1 ? 'Unlimited' : displayPlan.max_campaigns}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-3 transition-all">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                  <Radio className="h-4 w-4 text-zinc-400" />
                  <span>{tBilling('channels')}</span>
                </div>
                <span className="font-black text-zinc-955 text-sm">{displayPlan.max_channels === -1 ? 'Unlimited' : displayPlan.max_channels}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-3 transition-all">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                  <Zap className="h-4 w-4 text-zinc-400" />
                  <span>{tBilling('automations')}</span>
                </div>
                <span className="font-black text-zinc-955 text-sm">{displayPlan.max_automations === -1 ? 'Unlimited' : displayPlan.max_automations}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* AI Credits & Monthly AI Tokens - Only in Master Fixed mode */}
            {aiOperationalModel === 'master_fixed' && (
              <>
                <div className="space-y-3 transition-all">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                      <Sparkles className="h-4 w-4 text-zinc-400" />
                      <span>{tBilling('flowCredits')}</span>
                    </div>
                    <span className="font-black text-zinc-955 text-sm font-mono">
                      {sub?.flow_credits?.is_unlimited || displayPlan.flow_credits === -1
                        ? 'Unlimited'
                        : (sub?.flow_credits ? `${sub.flow_credits.remaining_credits} / ${sub.flow_credits.max_credits}` : (displayPlan.flow_credits || 50))}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-zinc-900 rounded-full transition-all" 
                      style={{ 
                        width: sub?.flow_credits && sub.flow_credits.max_credits > 0
                          ? `${Math.min(100, Math.max(0, Math.round((sub.flow_credits.remaining_credits / sub.flow_credits.max_credits) * 100)))}%` 
                          : '100%' 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-3 transition-all">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-zinc-600 font-semibold">
                      <Sparkles className="h-4 w-4 text-zinc-400" />
                      <span>{tBilling('aiTokens')}</span>
                    </div>
                    <span className="font-black text-zinc-955 text-sm font-mono">
                      {displayPlan.monthly_ai_tokens === -1
                        ? 'Unlimited'
                        : (displayPlan.monthly_ai_tokens ? (displayPlan.monthly_ai_tokens >= 1000000 ? `${(displayPlan.monthly_ai_tokens / 1000000).toFixed(1)}M` : `${Math.round(displayPlan.monthly_ai_tokens / 1000)}k`) : '100k') + '/mo'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Section 4: Subscription Pricing Grid Panel */}
      <div className="w-full px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
              {t('operationalSubscriptions')}
            </span>
            <p className="text-xs text-zinc-555 font-medium">{t('workspaceCapacityTiers')}</p>
          </div>
          
          {/* Controls: Billing Interval and Currency Selector */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {/* Custom Styled Toggle Switcher */}
            <div className="inline-flex p-1 bg-zinc-100 border border-zinc-200/80 rounded-full select-none">
              <button
                type="button"
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  billingInterval === 'month' 
                    ? 'bg-black text-white shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {t('monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('year')}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingInterval === 'year' 
                    ? 'bg-black text-white shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <span>{t('yearly')}</span>
                {maxSavingsPercent > 0 && (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#4AE54A] text-black">
                    {tPlanCard('saveDiscount', { percent: maxSavingsPercent })}
                  </span>
                )}
              </button>
            </div>

            {/* Currency Selector */}
            {activeCurrencies.length > 1 && (
              <div className="relative inline-flex items-center">
                <select
                  value={selectedCurrencyCode || resolvedCurrency?.code || ''}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  aria-label={tBilling('selectCurrency')}
                  className="appearance-none h-[34px] pl-3 pr-7 bg-white border border-[#E8E8E6] text-xs font-bold font-mono text-zinc-850 rounded-full shadow-3xs hover:border-zinc-400 focus:outline-none focus:border-black cursor-pointer transition-colors"
                >
                  {activeCurrencies.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Coins className="h-3 w-3" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`grid gap-6 w-full items-stretch ${
          plans.length === 1 
            ? 'grid-cols-1 max-w-md mx-auto' 
            : plans.length === 2 
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {plans.map((plan, index) => {
            const isPopular = index === 1 || plan.name.toLowerCase().includes('growth') || plan.name.toLowerCase().includes('pro');
            const isCurrent = sub?.plan?.id === plan.id;
            const currentPlanInList = plans.find(p => p.id === sub?.plan?.id);
            const currentPriceForInterval = currentPlanInList?.prices.find(p => p.interval === billingInterval) || sub?.price;
            const currentPlanAmount = currentPriceForInterval?.amount ?? (sub?.plan ? 0 : null);
            const hasActiveSubscription = Boolean(sub?.plan?.id) && sub?.status !== 'trial' && !sub?.is_trial;
            const activePrice = plan.prices.find(p => p.interval === billingInterval) || plan.prices[0];
            const effectivePriceId = activePrice?.stripe_price_id || (activePrice?.id ? `price_plan_${plan.id}_${activePrice.id}` : `price_plan_${plan.id}`);
            const isCardLoading = actionLoadingId === effectivePriceId || actionLoadingId === String(plan.id);

            return (
              <SubscriptionPlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                isCurrent={isCurrent}
                currentPlanAmount={currentPlanAmount}
                currentPlanId={sub?.plan?.id}
                hasActiveSubscription={hasActiveSubscription}
                isPopular={isPopular}
                isLoading={isCardLoading}
                aiOperationalModel={aiOperationalModel}
                onSelect={(priceId, planId, priceDbId, isTrial) => handleCheckout(priceId, planId, priceDbId, isTrial)}
              />
            );
          })}
        </div>
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      {isCancelModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade">
          <div className="fixed inset-0" onClick={() => !cancelLoading && setIsCancelModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {tBilling('cancelSubscriptionTitle')}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelLoading}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                {tBilling('cancelSubscriptionDesc')}
              </p>

              {displayPlan && (
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      {tBilling('currentPlanBadge')}
                    </span>
                    <span className="text-xs font-black text-zinc-900 uppercase">
                      {displayPlan.name}
                    </span>
                  </div>
                  {sub?.price && (
                    <span className="text-xs font-mono font-bold text-zinc-700">
                      {sub.price.currency.toUpperCase()} {(sub.price.amount / 100).toFixed(0)} / {sub.price.interval === 'year' ? t('yearly') : t('monthly')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelLoading}
                className="h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tBilling('keepSubscription')}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSubscription}
                disabled={cancelLoading}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {cancelLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{cancelLoading ? tBilling('cancellingSubscription') : tBilling('confirmCancelSubscription')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
