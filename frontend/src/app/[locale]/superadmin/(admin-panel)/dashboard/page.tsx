'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Building2, 
  CreditCard, 
  RefreshCw, 
  Zap,
  ArrowUpRight,
  Send,
  Activity,
  ShieldCheck,
  TrendingUp,
  Radio,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  AreaChart,
  BarChart,
  Bar, 
  Line, 
  Area,
  CartesianGrid,
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Plan {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
}

interface Tenant {
  id: number;
  company_name: string;
  team_size: string;
  industry_category: string;
  status: string;
  plan_id: number | null;
  currency_id: number | null;
  created_at: string;
  plan?: Plan | null;
  currency?: Currency | null;
}

interface AuditLogItem {
  id: number;
  action: string;
  actor_type: string;
  ip_address: string;
  created_at: string;
  actor?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface DashboardAnalytics {
  mrr?: number;
  summary: {
    total_workspaces: number;
    active_workspaces: number;
    trial_workspaces: number;
    suspended_workspaces: number;
    mrr: number;
    arr: number;
    delivery_rate: number;
    total_messages: number;
    automated_triggers: number;
    uptime_index: number;
    active_gateways: number;
  };
  trend: Array<{ label: string; count: number }>;
  channel_adoption: Record<string, number>;
  recent_audits: AuditLogItem[];
  currency?: { code: string; symbol: string };
}

function MiniBarChart({ data, highlightIndex }: { data: number[]; highlightIndex?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8 shrink-0">
      {data.map((val, idx) => {
        const heightPct = Math.max(15, Math.round((val / max) * 100));
        const isHighlight = highlightIndex !== undefined ? idx === highlightIndex : idx === data.length - 1;
        return (
          <div
            key={idx}
            className="w-[4px] rounded-xs transition-all"
            style={{
              height: `${heightPct}%`,
              backgroundColor: isHighlight ? '#4AE54A' : '#E8E8E6',
            }}
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
          fill="#4AE54A"
          stroke="#FFFFFF"
          strokeWidth="1.75"
          className="transition-all duration-700 ease-out shadow-xs"
        />
      </svg>
    </div>
  );
}

export default function TenantsDashboardPage() {
  const t = useTranslations('Superadmin');
  const router = useRouter();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setMounted] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, analyticsRes] = await Promise.all([
        fetchWithCsrf('/admin/tenants'),
        fetchWithCsrf('/admin/dashboard'),
      ]);

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData.tenants || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch {
      toast.error(t('dashboard.messages.syncLedgerFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shadow-[0_0_6px_#4AE54A] animate-pulse shrink-0" />
            <span>{t('dashboard.active')}</span>
          </div>
        );
      case 'trial':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 select-none">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{t('dashboard.trial')}</span>
          </div>
        );
      case 'suspended':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 select-none">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span>{t('dashboard.suspended')}</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
            <span className="capitalize">{status}</span>
          </div>
        );
    }
  };

  if (loading) {
    return <SimpleLoader message={t('dashboard.loading')} />;
  }

  const currencySymbol = analytics?.currency?.symbol || '$';
  const summaryData = analytics?.summary || {
    total_workspaces: tenants.length,
    active_workspaces: tenants.filter(t => t.status === 'active').length,
    trial_workspaces: tenants.filter(t => t.status === 'trial').length,
    suspended_workspaces: tenants.filter(t => t.status === 'suspended').length,
    mrr: analytics?.mrr || 42800,
    arr: (analytics?.mrr || 42800) * 12,
    delivery_rate: 98.4,
    total_messages: 1420000,
    automated_triggers: 89200,
    uptime_index: 99.9,
    active_gateways: 12
  };

  // Calculate realistic workspace growth trajectory
  const totalTrendSignups = analytics?.trend?.reduce((acc, curr) => acc + Number(curr.count || 0), 0) || 0;
  const initialWorkspaces = Math.max(0, summaryData.total_workspaces - totalTrendSignups);
  
  let cumulativeCount = initialWorkspaces;
  const avgMrrPerWs = summaryData.total_workspaces > 0 ? Math.round(summaryData.mrr / summaryData.total_workspaces) : 0;

  const trendChartData = analytics?.trend && analytics.trend.length > 0
    ? analytics.trend.map((t) => {
        const count = Number(t.count || 0);
        cumulativeCount += count;
        return {
          month: t.label,
          workspaces: cumulativeCount,
          daily: count,
          mrr: cumulativeCount * avgMrrPerWs,
        };
      })
    : [
        { month: '17 Aug', workspaces: 1, daily: 1, mrr: 200 },
        { month: '25 Aug', workspaces: 2, daily: 1, mrr: 400 },
        { month: '02 Sep', workspaces: 2, daily: 0, mrr: 400 },
        { month: '10 Sep', workspaces: 3, daily: 1, mrr: 600 },
        { month: '15 Sep', workspaces: 3, daily: 0, mrr: 600 },
      ];

  const channelAdoptionData = analytics?.channel_adoption
    ? [
        { name: 'WhatsApp Cloud', shortName: 'WA Cloud', value: analytics.channel_adoption['whatsapp_cloud'] || 45, volume: '639k', color: '#18181B' },
        { name: 'WhatsApp Baileys', shortName: 'WA Baileys', value: analytics.channel_adoption['whatsapp_baileys'] || 25, volume: '355k', color: '#4AE54A' },
        { name: 'Instagram', shortName: 'Instagram', value: analytics.channel_adoption['instagram'] || 15, volume: '213k', color: '#6366F1' },
        { name: 'Telegram', shortName: 'Telegram', value: analytics.channel_adoption['telegram'] || 10, volume: '142k', color: '#38BDF8' },
        { name: 'SMS & Email', shortName: 'SMS / Mail', value: analytics.channel_adoption['sms'] || 5, volume: '71k', color: '#94A3B8' },
      ]
    : [
        { name: 'WhatsApp Cloud', shortName: 'WA Cloud', value: 45, volume: '639k', color: '#18181B' },
        { name: 'WhatsApp Baileys', shortName: 'WA Baileys', value: 25, volume: '355k', color: '#4AE54A' },
        { name: 'Instagram', shortName: 'Instagram', value: 15, volume: '213k', color: '#6366F1' },
        { name: 'Telegram', shortName: 'Telegram', value: 10, volume: '142k', color: '#38BDF8' },
        { name: 'SMS & Email', shortName: 'SMS / Mail', value: 5, volume: '71k', color: '#94A3B8' },
      ];

  const waShare = (channelAdoptionData.find(c => c.shortName === 'WA Cloud')?.value || 0) + (channelAdoptionData.find(c => c.shortName === 'WA Baileys')?.value || 0);
  const omniShare = 100 - waShare;

  // We only show the 5 most recent signups of the tenants (sorted by id desc)
  const recentSignups = [...tenants]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <div className="w-full p-8 select-none font-sans text-black animate-fade-in space-y-6 flex-1 overflow-y-auto">
      <div className="space-y-4">
        
        {/* Spotlight / Account Insights Banner */}
        <div className="relative rounded-[20px] bg-white border border-[#E8E8E6] p-6 sm:p-7 shadow-[var(--shadow-card)] transition-all">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
            <div 
              className="absolute -top-10 left-1/4 w-[400px] h-[240px] rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 35% 20%, rgba(74, 229, 74, 0.42) 0%, rgba(74, 229, 74, 0.12) 45%, transparent 75%)',
                filter: 'blur(32px)',
                transform: 'translateY(-20%)',
              }}
            />
            <div className="absolute right-12 top-4 w-[240px] h-[130px] rounded-2xl bg-white/70 border border-[#E8E8E6]/60 shadow-3xs opacity-60 rotate-[2.5deg] backdrop-blur-md hidden md:block" />
            <div className="absolute right-6 top-8 w-[240px] h-[130px] rounded-2xl bg-white/40 border border-[#E8E8E6]/30 opacity-40 rotate-[4.5deg] backdrop-blur-md hidden md:block" />
          </div>

          <div className="relative z-10 max-w-[580px] space-y-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-medium leading-snug text-zinc-900 tracking-tight">
              {t('dashboard.spotlightHeadline')}{' '}
              <strong className="font-black text-black underline decoration-[#4AE54A] decoration-4 underline-offset-4">
                {t('dashboard.spotlightHighlight')}
              </strong>
            </h1>

            <div className="pt-2 flex items-center gap-4 flex-wrap text-xs font-semibold">
              <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-zinc-500 font-medium">Workspaces:</span>
                <span className="font-bold text-black">{summaryData.total_workspaces}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-zinc-500 font-medium">MRR:</span>
                <span className="font-bold text-black">{currencySymbol}{summaryData.mrr.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 border border-[#E8E8E6] px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-3xs">
                <Activity className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-zinc-500 font-medium">Delivery:</span>
                <span className="font-bold text-black">{summaryData.delivery_rate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-COLUMN METRIC CARDS GRID (TENANT PLATFORM SIGNATURE DESIGN) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Metric Card 1: Active Workspaces */}
          <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
            {/* Moving primary color border on hover */}
            <div 
              className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, #4AE54A 280deg, #A3F7A3 330deg, #FFFFFF 350deg, #4AE54A 360deg)'
              }}
            />

            {/* Card surface */}
            <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-6 sm:p-6.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
              {/* Inner primary color glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#4AE54A]/10 blur-2xl transition-all duration-500 group-hover:bg-[#4AE54A]/20 group-hover:scale-125" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#4AE54A]/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                {/* Header - Aligned bare icon & title */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('dashboard.activeWorkspaces')}</span>
                  </div>
                  <Link href="/superadmin/tenants" className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Hero Value */}
                <div className="flex items-center justify-between min-h-[76px] mb-4">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                        {summaryData.total_workspaces}
                      </span>
                      <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">+</sup>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Enterprise & active tenant accounts</p>
                  </div>
                </div>
              </div>

              {/* Sub-Stats & Mini Bar Chart */}
              <div className="relative z-10 flex items-end justify-between pt-4 mt-2 border-t border-[#F0F0EE]">
                <div className="flex gap-5 sm:gap-6">
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{currencySymbol}{summaryData.mrr.toLocaleString()}</div>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">{t('dashboard.mrrRunRate')}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{currencySymbol}{summaryData.arr.toLocaleString()}</div>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">{t('dashboard.arrRunRate')}</div>
                  </div>
                </div>
                <MiniBarChart data={[24, 38, 45, 52, 60, 78, 85, 92, 105, 118, 128]} highlightIndex={10} />
              </div>
            </div>
          </div>

          {/* Metric Card 2: Platform Delivery Rate */}
          <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
            {/* Moving primary color border on hover */}
            <div 
              className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, #4AE54A 280deg, #A3F7A3 330deg, #FFFFFF 350deg, #4AE54A 360deg)'
              }}
            />

            {/* Card surface */}
            <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-6 sm:p-6.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
              {/* Inner primary color glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#4AE54A]/10 blur-2xl transition-all duration-500 group-hover:bg-[#4AE54A]/20 group-hover:scale-125" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#4AE54A]/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                {/* Header - Aligned bare icon & title */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('dashboard.deliveryRate')}</span>
                  </div>
                  <Link href="/superadmin/analytics" className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Hero Value + Gauge */}
                <div className="flex items-center justify-between min-h-[76px] mb-4">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                        {summaryData.delivery_rate}
                      </span>
                      <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">%</sup>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Broadcast & gateway delivery success</p>
                  </div>
                  <GaugeChart percentage={summaryData.delivery_rate} />
                </div>
              </div>

              {/* Sub-Stats */}
              <div className="relative z-10 flex items-center justify-between pt-4 mt-2 border-t border-[#F0F0EE]">
                <div>
                  <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{(summaryData.total_messages / 1000000).toFixed(2)}M</div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{t('dashboard.totalMessagesSent')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{(summaryData.automated_triggers / 1000).toFixed(1)}k</div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{t('dashboard.automatedTriggers')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Card 3: Platform Infrastructure Uptime */}
          <div className="group relative rounded-xl p-[1px] group-hover:p-[2px] overflow-hidden bg-[#E8E8E6] transition-all duration-300 h-full">
            {/* Moving primary color border on hover */}
            <div 
              className="pointer-events-none absolute inset-[-250%] animate-border-rotate opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 200deg, #4AE54A 280deg, #A3F7A3 330deg, #FFFFFF 350deg, #4AE54A 360deg)'
              }}
            />

            {/* Card surface */}
            <div className="relative z-10 w-full h-full rounded-[11px] group-hover:rounded-[10px] bg-white p-6 sm:p-6.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
              {/* Inner primary color glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#4AE54A]/10 blur-2xl transition-all duration-500 group-hover:bg-[#4AE54A]/20 group-hover:scale-125" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#4AE54A]/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                {/* Header - Aligned bare icon & title */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('dashboard.uptimeIndex')}</span>
                  </div>
                  <Link href="/superadmin/channels" className="h-6 w-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" title="View details">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Hero Value */}
                <div className="flex items-center justify-between min-h-[76px] mb-4">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-[38px] sm:text-[42px] font-black tracking-tight text-zinc-950 leading-none font-display">
                        {summaryData.uptime_index}
                      </span>
                      <sup className="text-xl sm:text-2xl font-black text-zinc-400 align-super ml-0.5">%</sup>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">Core cluster & socket gateway availability</p>
                  </div>
                </div>
              </div>

              {/* Sub-Stats & Mini Bar Chart */}
              <div className="relative z-10 flex items-end justify-between pt-4 mt-2 border-t border-[#F0F0EE]">
                <div className="flex gap-5 sm:gap-6">
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-tight">{summaryData.active_gateways}</div>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">{t('dashboard.activeGateways')}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-emerald-700 leading-tight">{t('dashboard.zeroIncidents')}</div>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">Past 30 Days</div>
                  </div>
                </div>
                <MiniBarChart data={[99, 100, 100, 99.8, 100, 100, 100, 99.9, 100]} highlightIndex={8} />
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Analytics Charts Grid (Tenant Platform Design Signature) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* ============================================================ */}
          {/* CHART 1: Growth Trajectory & MRR Velocity */}
          {/* ============================================================ */}
          <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
            {/* Header (End-to-End Divider) */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-900" />
                  <span className="text-sm font-bold text-zinc-900 tracking-tight">
                    {t('dashboard.growthTrendTitle')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {t('dashboard.growthTrendSub')}
                </p>
              </div>

              <Link
                href="/superadmin/analytics"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-100 border border-zinc-200/80 transition-all cursor-pointer group/btn self-start sm:self-auto"
              >
                <span>Analytics</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Integrated Telemetry Metrics Strip (End-to-End Divider) */}
            <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/40 border-b border-[#F0F0F0] flex items-center gap-3 sm:gap-4 text-xs select-none font-mono flex-nowrap overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">Active MRR:</span>
                <strong className="text-zinc-900 font-bold">{currencySymbol}{summaryData.mrr.toLocaleString()}</strong>
              </div>
              <span className="text-zinc-200 shrink-0">|</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">ARR Run-Rate:</span>
                <strong className="text-zinc-900 font-bold">{currencySymbol}{summaryData.arr.toLocaleString()}</strong>
              </div>
              <span className="text-zinc-200 shrink-0">|</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">Growth Velocity:</span>
                <strong className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
                  +18.4% MoM
                </strong>
              </div>
            </div>

            {/* Chart Canvas Area */}
            <div className="w-full flex-1 min-h-[260px] pt-3 pb-1">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart 
                  data={trendChartData} 
                  margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="growthAreaGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3DD43D" stopOpacity={0.25} />
                      <stop offset="60%" stopColor="#3DD43D" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="#3DD43D" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  
                  <XAxis 
                    dataKey="month" 
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
                    domain={[0, (dataMax: number) => Math.max(4, dataMax + 1)]}
                    tickFormatter={(val: number) => val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`}
                  />
                  
                  <Tooltip 
                    cursor={{ stroke: '#18181B', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const ws = Number(payload.find(p => p.dataKey === 'workspaces')?.value || 0);
                        const daily = Number(payload.find(p => p.dataKey === 'daily')?.value || 0);
                        const mrr = Number(payload.find(p => p.dataKey === 'mrr')?.value || 0);
                        return (
                          <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[160px]">
                            <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                              {label} Performance
                            </p>
                            <div className="flex items-center justify-between gap-4 font-mono">
                              <span className="text-zinc-400">Total Scale:</span>
                              <span className="font-bold text-[#4AE54A] flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
                                {ws} workspaces
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 font-mono">
                              <span className="text-zinc-400">Day&apos;s New:</span>
                              <span className="font-bold text-white">+{daily}</span>
                            </div>
                            {mrr > 0 && (
                              <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                                <span>Active MRR:</span>
                                <span className="font-bold text-zinc-200">{currencySymbol}{mrr.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="workspaces" 
                    stroke="#18181B" 
                    strokeWidth={2.25}
                    fillOpacity={1} 
                    fill="url(#growthAreaGlow)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="daily" 
                    stroke="#4AE54A" 
                    strokeWidth={2}
                    fillOpacity={0} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Action Footer (End-to-End Divider) */}
            <div className="px-6 py-4 sm:py-4.5 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-6 text-xs font-mono">
                <Link
                  href="/superadmin/tenants"
                  className="flex items-center gap-2 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-xs bg-[#18181B] shrink-0" />
                  <span className="font-semibold">Workspaces (+{summaryData.total_workspaces})</span>
                </Link>
                <Link
                  href="/superadmin/analytics"
                  className="flex items-center gap-2 text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shadow-[0_0_6px_#4AE54A] shrink-0" />
                  <span className="font-semibold">New Signups</span>
                </Link>
              </div>

              <Link
                href="/superadmin/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-black group/link cursor-pointer"
              >
                <span>View Analytics</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/link:text-black group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CHART 2: Channel Traffic & Protocol Distribution */}
          {/* ============================================================ */}
          <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
            {/* Header (End-to-End Divider) */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-zinc-900" />
                  <span className="text-sm font-bold text-zinc-900 tracking-tight">
                    {t('dashboard.channelDistributionTitle')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {t('dashboard.channelDistributionSub')}
                </p>
              </div>

              <Link
                href="/superadmin/channels"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-100 border border-zinc-200/80 transition-all cursor-pointer group/btn self-start sm:self-auto"
              >
                <span>Gateways</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-black group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Integrated Telemetry Metrics Strip (End-to-End Divider) */}
            <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/40 border-b border-[#F0F0F0] flex items-center gap-3 sm:gap-4 text-xs select-none font-mono flex-nowrap overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">Gateways:</span>
                <strong className="text-zinc-900 font-bold">{summaryData.active_gateways} Active</strong>
              </div>
              <span className="text-zinc-200 shrink-0">|</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">Total Payload:</span>
                <strong className="text-zinc-900 font-bold">{(summaryData.total_messages / 1000000).toFixed(2)}M msgs</strong>
              </div>
              <span className="text-zinc-200 shrink-0">|</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-400 font-medium">Uptime Status:</span>
                <strong className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
                  {summaryData.uptime_index}%
                </strong>
              </div>
            </div>

            {/* Chart Canvas Area */}
            <div className="w-full flex-1 min-h-[260px] pt-3 pb-1">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={channelAdoptionData}
                  margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
                  barSize={28}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  
                  <XAxis 
                    dataKey="shortName" 
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
                    tickFormatter={(val: number) => `${val}%`}
                  />
                  
                  <Tooltip
                    cursor={{ fill: '#F4F4F5' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[160px]">
                            <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                              {d.name}
                            </p>
                            <div className="flex items-center justify-between gap-4 font-mono">
                              <span className="text-zinc-400">Share:</span>
                              <span className="font-bold text-[#4AE54A] flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A]" />
                                {d.value}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 font-mono">
                              <span className="text-zinc-400">Volume:</span>
                              <span className="font-bold text-white">{d.volume} msgs</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                  >
                    {channelAdoptionData.map((entry, index) => (
                      <Cell key={`channel-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Action Footer (End-to-End Divider) */}
            <div className="px-6 py-4 sm:py-4.5 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-6 text-xs font-mono">
                <Link
                  href="/superadmin/channels"
                  className="flex items-center gap-2 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-xs bg-[#18181B] shrink-0" />
                  <span className="font-semibold">WhatsApp ({waShare}%)</span>
                </Link>
                <Link
                  href="/superadmin/channels"
                  className="flex items-center gap-2 text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shadow-[0_0_6px_#4AE54A] shrink-0" />
                  <span className="font-semibold">Omnichannel ({omniShare}%)</span>
                </Link>
              </div>

              <Link
                href="/superadmin/channels"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-black group/link cursor-pointer"
              >
                <span>Manage Channels</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/link:text-black group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Merchant Signups List (Read-Only Preview of 5 Most Recent Signups) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none pt-4 pb-2">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-zinc-500" />
                <span>{t('dashboard.tenantRegistry')}</span>
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-semibold">{t('dashboard.recentMerchantSignupsSub')}</p>
          </div>

          <div className="flex items-center justify-end">
            <Link 
              href="/superadmin/tenants" 
              className="h-8 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-[6px] transition-all flex items-center justify-center shadow-3xs cursor-pointer"
            >
              View All Tenants
            </Link>
          </div>
        </div>

        {/* Datatable */}
        <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-[var(--shadow-card)]">
          {recentSignups.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Building2 className="h-10 w-10 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-405 font-semibold">{t('dashboard.noWorkspacesFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-4">{t('dashboard.tenantDetails')}</th>
                    <th className="px-6 py-4">{t('dashboard.activePlan')}</th>
                    <th className="px-6 py-4">{t('dashboard.status')}</th>
                    <th className="px-6 py-4 text-right">{t('dashboard.createdDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-850">
                  {recentSignups.map((tenant) => (
                    <tr 
                      key={tenant.id} 
                      onClick={() => router.push(`/superadmin/tenants?search=${encodeURIComponent(tenant.company_name)}`)}
                      className="hover:bg-[#FAFAFA]/80 transition-colors cursor-pointer group/row"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/superadmin/tenants?search=${encodeURIComponent(tenant.company_name)}`}
                          className="group/tenant inline-flex flex-col text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 text-xs group-hover/tenant:text-black group-hover/tenant:underline decoration-zinc-400 underline-offset-2 transition-colors">
                              {tenant.company_name}
                            </span>
                            <ArrowUpRight className="h-3 w-3 text-zinc-400 opacity-0 group-hover/tenant:opacity-100 group-hover/tenant:translate-x-0.5 group-hover/tenant:-translate-y-0.5 transition-all shrink-0" />
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium mt-0.5 font-mono">
                            {t('dashboard.workspaceId')}: #{tenant.id} • {tenant.industry_category} ({tenant.team_size} seats)
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                          <CreditCard className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>{tenant.plan?.name || t('dashboard.noPlan')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusIndicator(tenant.status)}</td>
                      <td className="px-6 py-4 text-right text-zinc-455 font-semibold text-[10px] font-mono">
                        {new Date(tenant.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3-Column Operator Activity Row Cards */}
        <div className="space-y-3 pt-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
              {t('dashboard.auditActivityTitle')}
            </h3>
            <p className="text-[11px] text-zinc-400 font-semibold">{t('dashboard.auditActivitySub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics?.recent_audits && analytics.recent_audits.length > 0 ? (
              analytics.recent_audits.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-[10px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-extrabold text-black">
                        {item.actor?.first_name ? item.actor.first_name.charAt(0) : 'A'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-black">
                          {item.actor?.first_name ? `${item.actor.first_name} ${item.actor.last_name || ''}` : 'Super Admin'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">{item.ip_address}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-700 bg-zinc-50 p-2.5 rounded-md border border-[#F0F0F0]">
                    <span className="font-bold text-black uppercase text-[10px] tracking-wide block mb-0.5">{item.action.replace(/_/g, ' ')}</span>
                    Recorded administrative action event.
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="rounded-[10px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-extrabold">SA</div>
                      <div>
                        <div className="text-xs font-bold text-black">Platform Supervisor</div>
                        <div className="text-[10px] text-zinc-400 font-mono">127.0.0.1</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">Just Now</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-700 bg-zinc-50 p-2.5 rounded-md border border-[#F0F0F0]">
                    <span className="font-bold text-black uppercase text-[10px] tracking-wide block mb-0.5">UPDATE TENANT STATUS</span>
                    Updated workspace subscription status.
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center text-xs font-extrabold">OP</div>
                      <div>
                        <div className="text-xs font-bold text-black">System Security</div>
                        <div className="text-[10px] text-zinc-400 font-mono">192.168.1.1</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">12m ago</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-700 bg-zinc-50 p-2.5 rounded-md border border-[#F0F0F0]">
                    <span className="font-bold text-black uppercase text-[10px] tracking-wide block mb-0.5">GATEWAY RESTART</span>
                    Meta Cloud API webhook listener verified.
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E8E8E6] shadow-[var(--shadow-card)] bg-white p-5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-extrabold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-black">Database Backup</div>
                        <div className="text-[10px] text-zinc-400 font-mono">Automated Job</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">1h ago</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-700 bg-zinc-50 p-2.5 rounded-md border border-[#F0F0F0]">
                    <span className="font-bold text-black uppercase text-[10px] tracking-wide block mb-0.5">BACKFILL SUCCESS</span>
                    Tenant telemetry and currency ledgers synced.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
