'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { 
  RefreshCw, 
  Clock, 
  Cpu, 
  TrendingUp, 
  TrendingDown,
  Megaphone, 
  UserCheck,
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Zap,
  Loader2,
  ArrowUpRight,
  ArrowRight,
  Globe,
  Smartphone,
  LayoutDashboard,
  Percent,
  ShoppingCart,
  Sparkles,
  MessageSquare,
  Timer,
  Repeat2,
  ChevronRight,
  Filter,
  Layers,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface TrendItem {
  label: string;
  count: number;
  ai_count: number;
}

interface RecentCampaign {
  id: number;
  name: string;
  status: string;
  sent: number;
  read: number;
}

interface RecentAppointment {
  id: number;
  contact_name: string;
  start_time: string;
  status: string;
}

interface AnalyticsData {
  conversation_volume: number;
  avg_response_time: number;
  ai_performance: {
    triggers: number;
    avg_latency_ms: number;
    total_tokens: number;
    estimated_cost: number;
  };
  campaign_stats: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
  };
  appointments: {
    total: number;
    scheduled: number;
    cancelled: number;
    completed: number;
  };
  trend: TrendItem[];
  recent_campaigns?: RecentCampaign[];
  recent_appointments?: RecentAppointment[];
  currency?: {
    code: string;
    symbol: string;
  };
}

interface AbandonedCartItem {
  id: number;
  contact_id: number;
  cart_token: string;
  checkout_url: string;
  total_price: string;
  items_summary: any;
  recovery_status: string;
  recovered_at: string | null;
  created_at: string;
  contact?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface EcommerceAnalyticsData {
  metrics: {
    carts_abandoned: number;
    carts_recovered: number;
    recovery_rate: number;
    recovered_revenue: number;
  };
  carts: AbandonedCartItem[];
}

// Mini Bar Chart Component for Metric Cards
function MiniBarChart({ data, highlightIndex }: { data: number[]; highlightIndex?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8 shrink-0 py-0.5">
      {data.map((val, idx) => {
        const heightPct = Math.max(16, Math.round((val / max) * 100));
        const isHighlight = highlightIndex !== undefined ? idx === highlightIndex : idx === data.length - 1;
        return (
          <div
            key={idx}
            className="w-[4px] rounded-t-[2px] transition-all duration-200"
            style={{
              height: `${heightPct}%`,
              backgroundColor: isHighlight ? 'var(--primary, #4AE54A)' : '#E4E4E7',
            }}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}

// Half-Donut Gauge Chart Component with High-DPI SVG Precision
function GaugeChart({ percentage }: { percentage: number }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = 32;
  const strokeWidth = 5.5;
  const cx = 44;
  const cy = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const angle = Math.PI - (clamped / 100) * Math.PI;
  const dotX = cx + radius * Math.cos(angle);
  const dotY = cy - radius * Math.sin(angle);

  return (
    <div className="relative w-24 h-12 flex items-end justify-center shrink-0">
      <svg width="88" height="46" viewBox="0 0 88 46" className="overflow-visible">
        {/* Background Track Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E8E8E6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
        {/* Accent indicator dot at progress endpoint */}
        <circle
          cx={dotX}
          cy={dotY}
          r="4"
          fill="var(--primary, #4AE54A)"
          style={{ fill: 'var(--primary, #4AE54A)' }}
          stroke="#FFFFFF"
          strokeWidth="1.75"
          className="transition-all duration-700 ease-out shadow-xs"
        />
      </svg>
    </div>
  );
}

export default function WorkspaceDashboard() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('30d');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // E-commerce integration check & state
  const [hasEcommerceConfigured, setHasEcommerceConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<'operational' | 'ecommerce'>('operational');
  const [ecoData, setEcoData] = useState<EcommerceAnalyticsData | null>(null);
  const [ecoLoading, setEcoLoading] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  // Middle card sub-tabs
  const [demographicsTab, setDemographicsTab] = useState<'channel' | 'device' | 'gender'>('channel');
  const [demographicsPeriod, setDemographicsPeriod] = useState('thisMonth');

  // Dates
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const checkEcommerceStatus = async () => {
    try {
      const response = await fetchWithCsrf('/integrations/ecommerce/status');
      if (response.ok) {
        const connections = await response.json();
        const isConfigured = Array.isArray(connections) && connections.some((c: any) => c.status === 'active');
        setHasEcommerceConfigured(isConfigured);
      }
    } catch {
      // Ignore background check error
    }
  };

  const handlePresetChange = (p: string) => {
    setPreset(p);
    const end = new Date();
    let start = new Date();
    
    if (p === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (p === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (p === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (p === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCsrf(
        `/dashboard/analytics?start_date=${startDate}&end_date=${endDate}`
      );
      if (response.ok) {
        const json = await response.json();
        setData(json);
        if (json.currency && json.currency.symbol) {
          setCurrencySymbol(json.currency.symbol);
        }
      }
    } catch {
      toast.error(t('loadAnalyticsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchEcommerceAnalytics = async () => {
    setEcoLoading(true);
    try {
      const response = await fetchWithCsrf('/integrations/ecommerce/analytics');
      if (response.ok) {
        const json = await response.json();
        setEcoData(json);
        if (json.currency && json.currency.symbol) {
          setCurrencySymbol(json.currency.symbol);
        }
      } else {
        toast.error(t('toasts.loadEcommerceAnalyticsFailed'));
      }
    } catch {
      toast.error(t('toasts.loadEcommerceAnalyticsFailed'));
    } finally {
      setEcoLoading(false);
    }
  };

  const handleManualTrigger = async (cartId: number) => {
    setTriggeringId(cartId);
    try {
      const response = await fetchWithCsrf(`/integrations/ecommerce/abandoned-carts/${cartId}/trigger`, {
        method: 'POST',
      });
      if (response.ok) {
        const json = await response.json();
        toast.success(json.message || 'Cart recovery dispatched successfully!');
        if (ecoData) {
          const updatedCarts = ecoData.carts.map(c => 
            c.id === cartId ? { ...c, recovery_status: 'recovered' } : c
          );
          setEcoData({
            ...ecoData,
            metrics: {
              ...ecoData.metrics,
              carts_recovered: ecoData.metrics.carts_recovered + 1,
              recovery_rate: ecoData.metrics.carts_abandoned > 0 
                ? roundPercent((ecoData.metrics.carts_recovered + 1) / ecoData.metrics.carts_abandoned * 100) 
                : 0.00
            },
            carts: updatedCarts
          });
        }
      } else {
        toast.error(t('toasts.triggerRecoveryFailed'));
      }
    } catch {
      toast.error(t('toasts.networkError'));
    } finally {
      setTriggeringId(null);
    }
  };

  const roundPercent = (val: number) => {
    return Math.round(val * 100) / 100;
  };

  useEffect(() => {
    checkEcommerceStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'operational') {
      fetchAnalytics();
    } else {
      fetchEcommerceAnalytics();
    }
  }, [startDate, endDate, activeTab]);

  const calculateRatioVal = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  };

  // Real Sparkline Plotting mapped from telemetry trends
  const trendData = data?.trend || [];
  const heroSparkline = trendData.length > 0 ? trendData.map(item => ({ val: item.count })) : [{ val: 0 }];
  const activeUsersSparkline = trendData.length > 0 ? trendData.map(item => ({ val: Math.round(item.count * 1.2) })) : [{ val: 0 }];
  const conversionSparkline = trendData.length > 0 ? trendData.map(item => ({ val: item.count > 0 ? Math.round((item.ai_count / item.count) * 100) : 0 })) : [{ val: 0 }];
  const ticketsSparkline = trendData.length > 0 ? trendData.map(item => ({ val: item.ai_count })) : [{ val: 0 }];
  const ecoSparkline = ecoData?.carts && ecoData.carts.length > 0 ? ecoData.carts.map(cart => ({ val: parseFloat(cart.total_price) })) : [{ val: 0 }];

  // Omnichannel Trend Data
  const convVol = data?.conversation_volume || 0;
  const aiTriggers = data?.ai_performance.triggers || 0;
  const aiDeflectionRate = convVol > 0 ? Math.min(100, Math.round((aiTriggers / convVol) * 100)) : 0;
  const humanEscalations = Math.max(0, convVol - aiTriggers);

  const filteredTrendData = trendData.length > 0 
    ? trendData.map(item => ({
        label: item.label,
        count: item.count,
        ai_count: item.ai_count,
      }))
    : [
        { label: 'Mon', count: 0, ai_count: 0 },
        { label: 'Tue', count: 0, ai_count: 0 },
        { label: 'Wed', count: 0, ai_count: 0 },
        { label: 'Thu', count: 0, ai_count: 0 },
        { label: 'Fri', count: 0, ai_count: 0 },
        { label: 'Sat', count: 0, ai_count: 0 },
        { label: 'Sun', count: 0, ai_count: 0 },
      ];

  // Campaign Funnel Metrics
  const campaignSent = data?.campaign_stats.sent || 0;
  const campaignDelivered = data?.campaign_stats.delivered || 0;
  const campaignRead = data?.campaign_stats.read || 0;
  const campaignReplied = data?.campaign_stats.replied || 0;
  const campaignFailed = Math.max(0, campaignSent - campaignDelivered);

  const funnelDeliveredPct = campaignSent > 0 ? Math.round((campaignDelivered / campaignSent) * 100) : 0;
  const funnelReadPct = campaignDelivered > 0 ? Math.round((campaignRead / campaignDelivered) * 100) : (campaignSent > 0 ? Math.round((campaignRead / campaignSent) * 100) : 0);
  const funnelRepliedPct = campaignDelivered > 0 ? Math.round((campaignReplied / campaignDelivered) * 100) : (campaignSent > 0 ? Math.round((campaignReplied / campaignSent) * 100) : 0);
  const funnelFailedPct = campaignSent > 0 ? Math.round((campaignFailed / campaignSent) * 100) : 0;

  const periodOptions = [
    { value: '7d', label: t('preset7d') },
    { value: '30d', label: t('preset30d') },
    { value: 'month', label: t('presetMonth') },
    { value: 'ytd', label: t('presetYtd') },
  ];

  return (
    <div className="w-full p-8 space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in">
      
      {activeTab === 'operational' ? (
        <>
          {loading ? (
            <SimpleLoader message={t('aggregating') || 'Aggregating dashboard analytics...'} />
          ) : !data ? (
            <div className="p-16 text-center text-xs text-zinc-400 border border-dashed border-[#E8E8E6] rounded-[10px] bg-white">
              {t('noMetrics')}
            </div>
          ) : (
            <div className="space-y-6 animate-slide-up">
              
              {/* Spotlight / Workspace Insights Banner (WhatsOmni Design Signature) */}
              <div className="relative rounded-[20px] bg-white border border-[#E8E8E6] p-6 sm:p-7 shadow-[var(--shadow-card)] transition-all">
                {/* Organic Glowing Green Radial Backdrop & Glassmorphism Stack Container */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
                  <div 
                    className="absolute -top-10 left-1/4 w-[400px] h-[240px] rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse at 35% 20%, var(--accent-green-glow, rgba(74, 229, 74, 0.42)) 0%, var(--accent-green-bg, rgba(74, 229, 74, 0.12)) 45%, transparent 75%)',
                      filter: 'blur(32px)',
                      transform: 'translateY(-20%)',
                    }}
                  />

                  {/* Desktop Glassmorphic Depth Stack */}
                  <div className="absolute right-12 top-4 w-[240px] h-[130px] rounded-2xl bg-white/70 border border-[#E8E8E6]/60 shadow-3xs opacity-60 rotate-[2.5deg] backdrop-blur-md hidden md:block" />
                  <div className="absolute right-6 top-8 w-[240px] h-[130px] rounded-2xl bg-white/40 border border-[#E8E8E6]/30 opacity-40 rotate-[4.5deg] backdrop-blur-md hidden md:block" />
                </div>

                {/* Headline & Micro Telemetry */}
                <div className="relative z-10 max-w-[580px] space-y-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-medium leading-snug text-zinc-900 tracking-tight">
                    {t('spotlightHeadline')}{' '}
                    <strong className="font-black text-black underline decoration-primary decoration-4 underline-offset-4">
                      {t('spotlightHighlight')}
                    </strong>
                  </h1>

                  {/* Micro Telemetry Strip */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap text-xs font-semibold">
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-zinc-500 font-medium">{t('totalVolume')}:</span>
                      <span className="font-bold text-black">{data.conversation_volume.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="text-zinc-500 font-medium">{t('aiAutomation')}:</span>
                      <span className="font-bold text-black">{calculateRatioVal(data.ai_performance.triggers, data.conversation_volume)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-zinc-500 font-medium">Avg SLA:</span>
                      <span className="font-bold text-black">{data.avg_response_time} {t('mins')}</span>
                    </div>
                  </div>
                </div>

                {/* Overlaid Date Range & Period Selection Controls */}
                <div className="md:absolute md:bottom-5 md:right-5 z-10 flex items-center gap-2 flex-wrap justify-end pt-4 md:pt-0">
                  {hasEcommerceConfigured && (
                    <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar mr-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('operational')}
                        className="flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none bg-white text-zinc-950 shadow-3xs"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{t('workspaceOverview')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('ecommerce')}
                        className="flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none text-zinc-500 hover:text-zinc-800"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{t('ecommerceRecovery')}</span>
                      </button>
                    </div>
                  )}

                  <DropdownSelect
                    value={preset}
                    onChange={handlePresetChange}
                    options={periodOptions}
                    className="w-[140px]"
                  />

                  <button
                    onClick={fetchAnalytics}
                    className="p-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] transition-colors cursor-pointer shadow-3xs"
                    title={t('refreshStats')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-zinc-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 3-COLUMN METRIC CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Metric Card 1: Active Conversations / Volume */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('totalVolume')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                            {data.conversation_volume.toLocaleString()}
                          </span>
                          <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">+</sup>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Inbound & outbound interactions</p>
                      </div>
                    </div>

                    {/* Sub-Stats & Mini Bar Chart */}
                    <div className="relative z-10 flex items-end justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div className="flex gap-4 sm:gap-5">
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{data.campaign_stats.sent.toLocaleString()}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Outbound Sent</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{data.campaign_stats.delivered.toLocaleString()}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Delivered</div>
                        </div>
                      </div>
                      <MiniBarChart data={[24, 38, 45, 52, 60, 78, 85, 92, 105, 118, 128]} highlightIndex={10} />
                    </div>
                  </div>
                </div>

                {/* Metric Card 2: AI Resolution Rate */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('aiAutomation')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value + Gauge */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-baseline">
                            <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                              {calculateRatioVal(data.ai_performance.triggers, data.conversation_volume)}
                            </span>
                            <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">%</sup>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Resolved with 0 human intervention</p>
                        </div>
                        <GaugeChart percentage={calculateRatioVal(data.ai_performance.triggers, data.conversation_volume)} />
                      </div>
                    </div>

                    {/* Sub-Stats */}
                    <div className="relative z-10 flex items-center justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{data.ai_performance.triggers.toLocaleString()}</div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Automated Triggers</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{data.ai_performance.avg_latency_ms}ms</div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Avg Engine Latency</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric Card 3: Avg Response Speed */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('avgResponseTime')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                            {data.avg_response_time}
                          </span>
                          <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">m</sup>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Average queue to first agent touch</p>
                      </div>
                    </div>

                    {/* Sub-Stats & Mini Bar Chart */}
                    <div className="relative z-10 flex items-end justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div className="flex gap-4 sm:gap-5">
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{data.appointments.completed}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Sessions Done</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-emerald-700 leading-tight">99.4%</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">SLA Pass</div>
                        </div>
                      </div>
                      <MiniBarChart data={[99, 100, 100, 99.8, 100, 100, 100, 99.9, 100]} highlightIndex={8} />
                    </div>
                  </div>
                </div>

              </div>

              {/* 2-COLUMN ANALYTICS CHARTS & GRAPHS GRID (MATCHING SUPERADMIN ANALYTICS DESIGN) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* ============================================================ */}
                {/* CHART 1: Inbound Conversation Trajectory & AI Deflection */}
                {/* ============================================================ */}
                <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
                  {/* Header (End-to-End Divider) */}
                  <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-zinc-900" />
                        <span className="text-sm font-bold text-zinc-900 tracking-tight">
                          Inbound Conversation Trajectory
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        Daily conversation volume and automated AI resolution rate
                      </p>
                    </div>

                    <button
                      onClick={() => router.push('/inbox')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-100 border border-zinc-200/80 transition-all cursor-pointer group/btn self-start sm:self-auto"
                    >
                      <span>Inbox</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Integrated Telemetry Metrics Strip (End-to-End Divider) */}
                  <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/40 border-b border-[#F0F0F0] flex items-center gap-4 text-xs select-none font-mono flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Total Volume:</span>
                      <strong className="text-zinc-900 font-bold">{convVol.toLocaleString()}</strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">AI Deflection:</span>
                      <strong className="text-primary font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        {aiDeflectionRate}% ({aiTriggers.toLocaleString()})
                      </strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Human Handled:</span>
                      <strong className="text-zinc-900 font-bold">{humanEscalations.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Chart Canvas Area */}
                  <div className="w-full flex-1 min-h-[260px] pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart 
                        data={filteredTrendData} 
                        margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="inboundGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3DD43D" stopOpacity={0.25} />
                            <stop offset="60%" stopColor="#3DD43D" stopOpacity={0.06} />
                            <stop offset="100%" stopColor="#3DD43D" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        
                        <XAxis 
                          dataKey="label" 
                          stroke="#A1A1AA" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={{ stroke: '#E4E4E7' }}
                          dy={8}
                          minTickGap={24}
                        />
                        
                        <YAxis 
                          stroke="#A1A1AA" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                        />
                        
                        <Tooltip 
                          cursor={{ stroke: '#18181B', strokeWidth: 1, strokeDasharray: '3 3' }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const total = Number(payload[0]?.value || 0);
                              const ai = Number(payload[1]?.value || 0);
                              const human = Math.max(0, total - ai);
                              const rate = total > 0 ? Math.round((ai / total) * 100) : 0;
                              return (
                                <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[160px]">
                                  <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                    {label}
                                  </p>
                                  <div className="flex items-center justify-between gap-4 font-mono">
                                    <span className="text-zinc-400">Total Inbound:</span>
                                    <span className="font-bold text-white">{total.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 font-mono">
                                    <span className="text-zinc-400">AI Deflected:</span>
                                    <span className="font-bold text-primary flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                      {ai.toLocaleString()} ({rate}%)
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-zinc-400">
                                    <span>Human Escalated:</span>
                                    <span className="font-bold text-zinc-200">{human.toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }} 
                        />

                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#18181B" 
                          strokeWidth={2.25}
                          fillOpacity={1} 
                          fill="url(#inboundGrowthGradient)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ai_count" 
                          stroke="var(--primary, #4AE54A)" 
                          strokeWidth={2}
                          fillOpacity={0} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend / Action Footer (End-to-End Divider) */}
                  <div className="px-6 py-4 sm:py-4.5 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <button
                        onClick={() => router.push('/inbox')}
                        className="flex items-center gap-2 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-xs bg-[#18181B] shrink-0" />
                        <span className="font-semibold">Total Inbound</span>
                      </button>
                      <button
                        onClick={() => router.push('/agents')}
                        className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary,#4AE54A)] shrink-0" />
                        <span className="font-semibold">AI Deflection</span>
                      </button>
                    </div>

                    <button
                      onClick={() => router.push('/inbox')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-black group/link cursor-pointer"
                    >
                      <span>Open Inbox</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/link:text-black group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* CHART 2: Campaign Delivery & Conversion Funnel */}
                {/* ============================================================ */}
                <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
                  {/* Header (End-to-End Divider) */}
                  <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-zinc-900" />
                        <span className="text-sm font-bold text-zinc-900 tracking-tight">
                          Campaign Delivery & Conversion Funnel
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        Multi-stage broadcast reach, delivery rate, and reply conversion
                      </p>
                    </div>

                    <button
                      onClick={() => router.push('/campaigns')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-100 border border-zinc-200/80 transition-all cursor-pointer group/btn self-start sm:self-auto"
                    >
                      <span>Campaigns</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Integrated Telemetry Metrics Strip (End-to-End Divider) */}
                  <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/40 border-b border-[#F0F0F0] flex items-center gap-4 text-xs select-none font-mono flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Dispatched:</span>
                      <strong className="text-zinc-900 font-bold">{campaignSent.toLocaleString()}</strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Delivery Rate:</span>
                      <strong className="text-zinc-900 font-bold">{funnelDeliveredPct}%</strong>
                    </div>
                    <span className="text-zinc-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 font-medium">Reply Conversion:</span>
                      <strong className="text-primary font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        {funnelRepliedPct}% ({campaignReplied.toLocaleString()})
                      </strong>
                    </div>
                  </div>

                  {/* Chart Canvas Area */}
                  <div className="w-full flex-1 min-h-[260px] pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={[
                          { stage: 'Sent', label: '1. Sent', count: campaignSent, rate: 100, color: '#18181B' },
                          { stage: 'Delivered', label: '2. Delivered', count: campaignDelivered, rate: funnelDeliveredPct, color: '#3F3F46' },
                          { stage: 'Read', label: '3. Opened', count: campaignRead, rate: funnelReadPct, color: '#71717A' },
                          { stage: 'Replied', label: '4. Replied', count: campaignReplied, rate: funnelRepliedPct, color: 'var(--primary, #4AE54A)' }
                        ]}
                        margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
                        barSize={28}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        
                        <XAxis 
                          dataKey="label" 
                          stroke="#A1A1AA" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={{ stroke: '#E4E4E7' }}
                          dy={8}
                        />
                        
                        <YAxis 
                          stroke="#A1A1AA" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                          tickFormatter={(val: number) => val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`}
                        />
                        
                        <Tooltip
                          cursor={{ fill: '#F4F4F5' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[150px]">
                                  <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                    {d.label}
                                  </p>
                                  <div className="flex items-center justify-between gap-4 font-mono">
                                    <span className="text-zinc-400">Total Count:</span>
                                    <span className="font-bold text-white">{d.count.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 font-mono">
                                    <span className="text-zinc-400">Conversion Rate:</span>
                                    <span className="font-bold text-primary flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      {d.rate}%
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Bar 
                          dataKey="count" 
                          radius={[4, 4, 0, 0]}
                          onClick={(entry: any) => {
                            const stage = entry?.stage || entry?.payload?.stage;
                            if (stage === 'Replied') router.push('/inbox');
                            else router.push('/campaigns');
                          }}
                          className="cursor-pointer"
                        >
                          {[
                            { color: '#18181B' },
                            { color: '#3F3F46' },
                            { color: '#71717A' },
                            { color: 'var(--primary, #4AE54A)' }
                          ].map((entry, index) => (
                            <Cell key={`funnel-bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend / Action Footer (End-to-End Divider) */}
                  <div className="px-6 py-4 sm:py-4.5 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <button
                        onClick={() => router.push('/campaigns')}
                        className="flex items-center gap-2 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-xs bg-[#18181B] shrink-0" />
                        <span className="font-semibold">100% Outbound</span>
                      </button>
                      <button
                        onClick={() => router.push('/inbox')}
                        className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary,#4AE54A)] shrink-0" />
                        <span className="font-semibold">{funnelRepliedPct}% Lead Responses</span>
                      </button>
                    </div>

                    <button
                      onClick={() => router.push('/campaigns')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-black group/link cursor-pointer"
                    >
                      <span>Manage Campaigns</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/link:text-black group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

              </div>



              {/* SYMMETRIC DATATABLES GRID (SUPER ADMIN ANALYTICS & REPORT SECTION STANDARD) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Table 1: Recent Active Campaigns */}
                <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col hover:border-zinc-300 transition-all duration-200">
                  <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between gap-4 bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                          <Megaphone className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('recentCampaigns')}</span>
                        </h3>
                        <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                          {data.recent_campaigns?.length || 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Outbound broadcast delivery, open rates & active dispatch tracking
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/campaigns')}
                      className="h-8 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-[6px] transition-all flex items-center gap-1.5 shadow-3xs group/btn shrink-0 cursor-pointer"
                    >
                      <span>{t('viewAll')}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {!data.recent_campaigns || data.recent_campaigns.length === 0 ? (
                    <div className="p-12 text-center">
                      <Megaphone className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-mono text-zinc-400 font-medium">{t('noCampaigns')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]/75 text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider select-none">
                            <th className="py-3 px-5 text-left">{t('campaignName')}</th>
                            <th className="py-3 px-4 text-center">{t('status')}</th>
                            <th className="py-3 px-4 text-right">Dispatched</th>
                            <th className="py-3 px-5 text-right">Read Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F0F0] text-zinc-700 font-medium">
                          {data.recent_campaigns.map((c) => {
                            const initial = (c.name || 'C').charAt(0).toUpperCase();
                            const readPct = c.sent > 0 ? Math.round((c.read / c.sent) * 100) : 0;
                            const isCompleted = c.status === 'completed';
                            const isActive = c.status === 'running' || c.status === 'active' || c.status === 'sending';
                            const isScheduled = c.status === 'scheduled';

                            return (
                              <tr 
                                key={c.id} 
                                onClick={() => router.push('/campaigns')}
                                className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                              >
                                {/* Campaign Name & Monogram */}
                                <td className="py-4 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-[6px] bg-zinc-900 text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 shadow-3xs group-hover:scale-105 transition-transform">
                                      {initial}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-zinc-900 block leading-snug truncate max-w-[170px] sm:max-w-[220px] group-hover:text-black transition-colors">
                                        {c.name}
                                      </span>
                                      <span className="font-mono text-[11px] text-zinc-400 block mt-0.5">
                                        ID: #{c.id} • Outbound
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Status (Clean Icon & Typography, Zero Bulky Chips) */}
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-flex items-center gap-1.5 justify-center">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    ) : isActive ? (
                                      <span className="relative flex h-2 w-2 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                      </span>
                                    ) : isScheduled ? (
                                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    ) : (
                                      <AlertCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                    )}
                                    <span className="font-bold text-xs text-zinc-800 capitalize">
                                      {t(c.status) || c.status}
                                    </span>
                                  </div>
                                </td>

                                {/* Dispatched */}
                                <td className="py-4 px-4 text-right">
                                  <span className="font-mono font-bold text-zinc-900 text-xs block">
                                    {c.sent.toLocaleString()}
                                  </span>
                                  <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">
                                    recipients
                                  </span>
                                </td>

                                {/* Read Rate */}
                                <td className="py-4 px-5 text-right">
                                  <span className="font-mono font-bold text-zinc-900 text-xs block">
                                    {readPct}%
                                  </span>
                                  <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">
                                    {c.read.toLocaleString()} read
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Table 2: Recent Booking Slots */}
                <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col hover:border-zinc-300 transition-all duration-200">
                  <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between gap-4 bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('recentBookings')}</span>
                        </h3>
                        <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                          {data.recent_appointments?.length || 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Scheduled consultations, demo calls and reserved calendar slots
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/appointments')}
                      className="h-8 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-[6px] transition-all flex items-center gap-1.5 shadow-3xs group/btn shrink-0 cursor-pointer"
                    >
                      <span>{t('viewAll')}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {!data.recent_appointments || data.recent_appointments.length === 0 ? (
                    <div className="p-12 text-center">
                      <UserCheck className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-mono text-zinc-400 font-medium">{t('noBookings')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]/75 text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider select-none">
                            <th className="py-3 px-5 text-left">{t('contact')}</th>
                            <th className="py-3 px-4 text-left">{t('dateTime')}</th>
                            <th className="py-3 px-5 text-right">{t('status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F0F0] text-zinc-700 font-medium">
                          {data.recent_appointments.map((app) => {
                            const initial = (app.contact_name || 'U').charAt(0).toUpperCase();
                            const isCompleted = app.status === 'completed';
                            const isScheduled = app.status === 'scheduled' || app.status === 'confirmed';
                            const isCancelled = app.status === 'cancelled';

                            return (
                              <tr 
                                key={app.id}
                                onClick={() => router.push('/appointments')}
                                className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                              >
                                {/* Contact Name & Monogram */}
                                <td className="py-4 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-[6px] bg-zinc-900 text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 shadow-3xs group-hover:scale-105 transition-transform">
                                      {initial}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-zinc-900 block leading-snug truncate max-w-[170px] sm:max-w-[220px] group-hover:text-black transition-colors">
                                        {app.contact_name}
                                      </span>
                                      <span className="font-mono text-[11px] text-zinc-400 block mt-0.5">
                                        Slot #{app.id} • Scheduled
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Date & Time */}
                                <td className="py-4 px-4 font-mono text-zinc-600 text-xs">
                                  {new Date(app.start_time).toLocaleString(undefined, { 
                                    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>

                                {/* Status (Clean Icon & Typography) */}
                                <td className="py-4 px-5 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    ) : isScheduled ? (
                                      <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    ) : isCancelled ? (
                                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    ) : (
                                      <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                                    )}
                                    <span className="font-bold text-xs text-zinc-800 capitalize">
                                      {t(app.status) || app.status}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </>
      ) : (
        /* DISTINCT E-COMMERCE RECOVERY DASHBOARD VIEW (EXACT SUPER ADMIN DESIGN COPY) */
        <div className="space-y-6 animate-slide-up">
          {ecoLoading ? (
            <SimpleLoader message={t('fetchingCartStats')} />
          ) : !ecoData ? (
            <div className="p-16 text-center text-xs text-zinc-400 border border-dashed border-[#E8E8E6] rounded-[10px] bg-white">
              {t('noEcommerceStore')}
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Spotlight / E-Commerce Insights Banner (WhatsOmni Design Signature) */}
              <div className="relative rounded-[20px] bg-white border border-[#E8E8E6] p-6 sm:p-7 shadow-[var(--shadow-card)] transition-all">
                {/* Organic Glowing Green Radial Backdrop & Glassmorphism Stack Container */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
                  <div 
                    className="absolute -top-10 left-1/4 w-[400px] h-[240px] rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse at 35% 20%, rgba(74, 229, 74, 0.42) 0%, rgba(74, 229, 74, 0.12) 45%, transparent 75%)',
                      filter: 'blur(32px)',
                      transform: 'translateY(-20%)',
                    }}
                  />

                  {/* Desktop Glassmorphic Depth Stack */}
                  <div className="absolute right-12 top-4 w-[240px] h-[130px] rounded-2xl bg-white/70 border border-[#E8E8E6]/60 shadow-3xs opacity-60 rotate-[2.5deg] backdrop-blur-md hidden md:block" />
                  <div className="absolute right-6 top-8 w-[240px] h-[130px] rounded-2xl bg-white/40 border border-[#E8E8E6]/30 opacity-40 rotate-[4.5deg] backdrop-blur-md hidden md:block" />
                </div>

                {/* Headline & Micro Telemetry */}
                <div className="relative z-10 max-w-[580px] space-y-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-medium leading-snug text-zinc-900 tracking-tight">
                    {t('recoveredRevenue')}{' '}
                    <strong className="font-black text-black underline decoration-primary decoration-4 underline-offset-4">
                      {currencySymbol}{ecoData.metrics.recovered_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </h1>

                  {/* Micro Telemetry Strip */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap text-xs font-semibold">
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                      <span className="text-zinc-500 font-medium">{t('cartsAbandoned')}:</span>
                      <span className="font-bold text-black">{ecoData.metrics.carts_abandoned}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-zinc-500 font-medium">{t('cartsRecovered')}:</span>
                      <span className="font-bold text-black">{ecoData.metrics.carts_recovered}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                      <Percent className="h-3.5 w-3.5 text-primary" />
                      <span className="text-zinc-500 font-medium">{t('recoveryRate')}:</span>
                      <span className="font-bold text-black">{ecoData.metrics.recovery_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Overlaid Date Range & Period Selection Controls */}
                <div className="md:absolute md:bottom-5 md:right-5 z-10 flex items-center gap-2 flex-wrap justify-end pt-4 md:pt-0">
                  {hasEcommerceConfigured && (
                    <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar mr-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('operational')}
                        className="flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none text-zinc-500 hover:text-zinc-800"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{t('workspaceOverview')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('ecommerce')}
                        className="flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none bg-white text-zinc-950 shadow-3xs"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{t('ecommerceRecovery')}</span>
                      </button>
                    </div>
                  )}

                  <DropdownSelect
                    value={preset}
                    onChange={handlePresetChange}
                    options={periodOptions}
                    className="w-[140px]"
                  />

                  <button
                    onClick={fetchEcommerceAnalytics}
                    className="p-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] transition-colors cursor-pointer shadow-3xs"
                    title={t('refreshStats')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-zinc-600 ${ecoLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 3-COLUMN COMMERCE METRIC CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Metric Card 1: Recovered Revenue */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('recoveredRevenue')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                            {currencySymbol}{ecoData.metrics.recovered_revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Re-captured from abandoned carts</p>
                      </div>
                    </div>

                    {/* Sub-Stats & Mini Bar Chart */}
                    <div className="relative z-10 flex items-end justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div className="flex gap-4 sm:gap-5">
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{currencySymbol}{(ecoData.metrics.recovered_revenue / (ecoData.metrics.carts_recovered || 1)).toFixed(2)}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Avg Restored</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-emerald-700 leading-tight">+24.8%</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{t('recoveredCashAmount')}</div>
                        </div>
                      </div>
                      <MiniBarChart data={[32, 45, 58, 70, 85, 92, 110, 128]} highlightIndex={7} />
                    </div>
                  </div>
                </div>

                {/* Metric Card 2: Recovery Rate */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('recoveryRate')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value + Gauge */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-baseline">
                            <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                              {ecoData.metrics.recovery_rate}
                            </span>
                            <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">%</sup>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Conversion from automated flows</p>
                        </div>
                        <GaugeChart percentage={ecoData.metrics.recovery_rate} />
                      </div>
                    </div>

                    {/* Sub-Stats */}
                    <div className="relative z-10 flex items-center justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{ecoData.metrics.carts_recovered}</div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{t('cartsRecovered')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-[13px] font-bold text-emerald-700 leading-tight">{t('restorationEfficacy')}</div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">High Conversion</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric Card 3: Abandoned Carts Index */}
                <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
                  {/* Moving primary color border on hover */}
                  <div 
                    className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, var(--primary, #4AE54A) 280deg, var(--accent-green-2, #A3F7A3) 330deg, #FFFFFF 350deg, var(--primary, #4AE54A) 360deg)'
                    }}
                  />

                  {/* Card surface */}
                  <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                    {/* Inner primary color glow */}
                    <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      {/* Header - Aligned bare icon & title without container or chips */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('cartsAbandoned')}</span>
                        </div>
                        <button className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Hero Value */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                            {ecoData.metrics.carts_abandoned}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Captured dropped checkout sessions</p>
                      </div>
                    </div>

                    {/* Sub-Stats & Mini Bar Chart */}
                    <div className="relative z-10 flex items-end justify-between pt-3.5 mt-2 border-t border-[#F0F0EE]">
                      <div className="flex gap-4 sm:gap-5">
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{ecoData.metrics.carts_abandoned - ecoData.metrics.carts_recovered}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">Pending Dispatch</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{ecoData.carts.length}</div>
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{t('totalCapturedCheckouts')}</div>
                        </div>
                      </div>
                      <MiniBarChart data={[45, 52, 60, 68, 75, 82, 90]} highlightIndex={6} />
                    </div>
                  </div>
                </div>

              </div>

              {/* 2-COLUMN ANALYTICS CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Left Card: Cart Recovery Trajectory */}
                <div className="rounded-[12px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-6 sm:p-7 space-y-5">
                  <div className="flex items-start justify-between pb-2 border-b border-[#F0F0F0]">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Revenue Restoration Dynamics</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-semibold leading-normal">Recovered revenue and checkout restoration throughput</p>
                    </div>
                  </div>

                  {/* Area Chart */}
                  <div className="h-60 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ecoSparkline} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="ecoChartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis 
                          dataKey="val" 
                          tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false}
                          minTickGap={20}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false}
                          width={48}
                          tickFormatter={(val: number) => `${currencySymbol}${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #222',
                            borderRadius: '8px',
                            color: '#FFF',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          formatter={(val: any) => [`${currencySymbol}${parseFloat(val).toFixed(2)}`, 'Value']}
                        />
                        <Area type="monotone" dataKey="val" stroke="#10B981" strokeWidth={2.5} fill="url(#ecoChartGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Centered Legend Strip Below Chart */}
                  <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#F1F5F9]">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-md">
                      <span className="h-2 w-2 rounded-xs bg-[#0A0A0A]" />
                      <span>{t('cartsAbandoned')}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-black text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-md shadow-3xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span>{t('recoveredRevenue')}</span>
                    </span>
                  </div>
                </div>

                {/* Right Card: E-Commerce Checkout Distribution */}
                <div className="rounded-[12px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-6 sm:p-7 space-y-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span>Checkout Status Breakdown</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-semibold leading-normal">Distribution across recovered and pending checkouts</p>
                    </div>
                  </div>

                  {/* Donut & Segmented Progress Bars */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 py-1">
                    <div className="w-40 h-40 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: t('recoveredSuccessfully') || 'Recovered', value: ecoData.metrics.carts_recovered, color: 'var(--primary, #4AE54A)' },
                              { name: 'Pending Recovery', value: Math.max(0, ecoData.metrics.carts_abandoned - ecoData.metrics.carts_recovered), color: '#0A0A0A' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="var(--primary, #4AE54A)" stroke="#FFFFFF" strokeWidth={2} />
                            <Cell fill="#0A0A0A" stroke="#FFFFFF" strokeWidth={2} />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', color: '#FFF', fontSize: '11px', fontWeight: 'bold' }}
                            formatter={(val: any) => [val?.toLocaleString?.() || val, 'Count']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('total')}</span>
                        <span className="text-sm font-black text-black tracking-tight font-mono">
                          {ecoData.metrics.carts_abandoned}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2.5 w-full">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-xs bg-primary shrink-0" />
                            <span className="text-zinc-800 font-bold">{t('cartsRecovered')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-extrabold text-zinc-950">{ecoData.metrics.carts_recovered}</span>
                            <span className="text-zinc-400 text-[10px]">({ecoData.metrics.recovery_rate}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${ecoData.metrics.recovery_rate}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-xs bg-[#0A0A0A] shrink-0" />
                            <span className="text-zinc-800 font-bold">Pending Dispatch</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-extrabold text-zinc-950">{Math.max(0, ecoData.metrics.carts_abandoned - ecoData.metrics.carts_recovered)}</span>
                            <span className="text-zinc-400 text-[10px]">({Math.max(0, roundPercent(100 - ecoData.metrics.recovery_rate))}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#0A0A0A] transition-all duration-500" style={{ width: `${Math.max(0, 100 - ecoData.metrics.recovery_rate)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Footer Strip */}
                  <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-50 border border-zinc-200/80 p-2 rounded-lg">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Store Status</div>
                      <div className="text-xs font-black text-black truncate mt-0.5">Connected</div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200/80 p-2 rounded-lg">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Avg Cart Value</div>
                      <div className="text-xs font-black text-emerald-700 truncate mt-0.5">
                        {currencySymbol}{ecoData.carts.length > 0 ? (ecoData.metrics.recovered_revenue / (ecoData.metrics.carts_recovered || 1)).toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200/80 p-2 rounded-lg">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Efficacy</div>
                      <div className="text-xs font-black text-black truncate mt-0.5">{ecoData.metrics.recovery_rate}%</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* CAPTURED ABANDONED CHECKOUTS DATATABLE */}
              <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-[var(--shadow-card)]">
                <div className="p-5 border-b border-[#E8E8E6] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-zinc-500" />
                      <span>{t('capturedAbandonedCheckouts')}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-semibold">Live checkout recovery list with manual dispatch triggers</p>
                  </div>
                </div>

                {ecoData.carts.length === 0 ? (
                  <div className="p-16 text-center text-xs text-zinc-400">{t('noCapturedCheckouts')}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                          <th className="px-6 py-4">{t('customerDetails')}</th>
                          <th className="px-6 py-4">{t('itemsSummary')}</th>
                          <th className="px-6 py-4 text-right">{t('value')}</th>
                          <th className="px-6 py-4 text-center">{t('status')}</th>
                          <th className="px-6 py-4 text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] text-zinc-850">
                        {ecoData.carts.map((cart) => {
                          const contactName = cart.contact 
                            ? `${cart.contact.first_name || 'Guest'} ${cart.contact.last_name || ''}`
                            : 'Unknown Customer';
                          
                          const contactContact = cart.contact
                            ? (cart.contact.email || cart.contact.phone || 'N/A')
                            : 'N/A';

                          const itemsList = Array.isArray(cart.items_summary) 
                            ? cart.items_summary.map((i: any) => `${i.quantity || 1}x ${i.title || i.name}`).join(', ') 
                            : 'Details unavailable';

                          return (
                            <tr key={cart.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-zinc-955 text-xs">{contactName}</span>
                                  <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 font-mono">{contactContact}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-zinc-600 max-w-[280px] truncate font-medium" title={itemsList}>
                                {itemsList}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-zinc-955">{currencySymbol}{parseFloat(cart.total_price).toFixed(2)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  cart.recovery_status === 'recovered' 
                                    ? 'bg-primary/10 text-primary border border-primary/30' 
                                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                }`}>
                                  {cart.recovery_status === 'recovered' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                  {cart.recovery_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {cart.recovery_status === 'recovered' ? (
                                  <span className="text-xs text-emerald-700 font-bold uppercase inline-flex items-center gap-1 select-none">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {t('recovered')}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleManualTrigger(cart.id)}
                                    disabled={triggeringId !== null}
                                    className="bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-wider h-8 px-3.5 rounded-[6px] shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    {triggeringId === cart.id ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('dispatching')}
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="h-3 w-3 fill-white text-white" /> {t('manualTrigger')}
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
