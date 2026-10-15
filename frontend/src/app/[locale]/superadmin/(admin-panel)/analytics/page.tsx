'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Building2, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  RefreshCw, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Percent, 
  Calendar, 
  Zap, 
  Globe, 
  Plus,
  Activity,
  ShieldCheck,
  Radio,
  ArrowUpRight,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Bot,
  Cpu,
  Layers,
  Flame,
  MessageSquare,
  FileText,
  Workflow,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  ResponsiveContainer,
  BarChart,
  AreaChart,
  Area,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface AnalyticsData {
  active_tenants: number;
  mrr: number;
  churn_rate: number;
  channel_adoption: Record<string, number>;
  total_users: number;
  paid_tenants: number;
  conversion_rate: number;
  total_channels: number;
  trend: Array<{ label: string; count: number }>;
  summary?: {
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
  recent_audits?: any[];
  currency?: {
    code: string;
    symbol: string;
  };
}

interface TenantItem {
  id: number;
  company_name: string;
  domain?: string;
  industry_category?: string;
  status: 'active' | 'suspended';
  plan_id: number | null;
  currency_id: number | null;
  created_at: string;
  plan?: {
    name: string;
  };
}

interface AiAnalyticsData {
  summary: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_requests: number;
    total_cost: number;
    avg_latency_ms: number;
    active_ai_tenants: number;
    success_rate: number;
  };
  trend: Array<{
    date: string;
    label: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cumulative_tokens: number;
    requests: number;
    cost: number;
  }>;
  feature_distribution: Array<{
    key: string;
    name: string;
    requests: number;
    total_tokens: number;
    cost: number;
    percentage: number;
  }>;
  model_distribution: Array<{
    name: string;
    value: number;
    requests: number;
    percentage: number;
    color: string;
  }>;
  provider_distribution: Array<{
    name: string;
    value: number;
    requests: number;
    color: string;
  }>;
  top_workspaces: Array<{
    tenant_id: number;
    company_name: string;
    industry_category: string;
    plan_name: string;
    requests: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
    percentage: number;
  }>;
  recent_logs: Array<{
    id: number;
    tenant_id: number;
    company_name: string;
    industry_category: string;
    feature: string;
    feature_label: string;
    provider: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    latency_ms: number;
    status: 'success' | 'failed';
    created_at: string;
  }>;
}

export default function SuperAdminAnalyticsPage() {
  const t = useTranslations('Superadmin');
  const [activeTab, setActiveTab] = useState<'platform' | 'ai'>('platform');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [aiData, setAiData] = useState<AiAnalyticsData | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preset, setPreset] = useState('30d');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [chartMode, setChartMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [aiChartMode, setAiChartMode] = useState<'cumulative' | 'daily'>('cumulative');

  // Date states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Pagination & Search for Tenant Registry Table
  const [currentPage, setCurrentPage] = useState(1);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const itemsPerPage = 10;

  // Pagination & Search for AI Telemetry Table
  const [aiCurrentPage, setAiCurrentPage] = useState(1);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const aiItemsPerPage = 10;

  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const [analyticsRes, aiAnalyticsRes, tenantsRes] = await Promise.all([
        fetchWithCsrf(`/admin/analytics?start_date=${startDate}&end_date=${endDate}`),
        fetchWithCsrf(`/admin/analytics/ai?start_date=${startDate}&end_date=${endDate}`),
        fetchWithCsrf('/admin/tenants')
      ]);

      if (analyticsRes.ok && tenantsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        const tenantsJson = await tenantsRes.json();
        setData(analyticsJson);
        if (analyticsJson.currency) {
          setCurrencySymbol(analyticsJson.currency.symbol || '$');
          setCurrencyCode(analyticsJson.currency.code || 'USD');
        }
        const tenantsArray = tenantsJson.tenants || tenantsJson.data || (Array.isArray(tenantsJson) ? tenantsJson : []);
        setTenants(tenantsArray);
      }

      if (aiAnalyticsRes.ok) {
        const aiJson = await aiAnalyticsRes.json();
        setAiData(aiJson);
      }

      if (showToast) toast.success(t('analytics.refreshSuccess'));
    } catch {
      toast.error(t('analytics.loadAnalyticsFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

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

  const handleExportCSV = () => {
    if (!data || tenants.length === 0) return;

    if (activeTab === 'ai' && aiData) {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += `Super Admin AI & Token Usage Telemetry Report (${startDate} to ${endDate})\n\n`;
      csvContent += `Total AI Tokens,${aiData.summary.total_tokens}\n`;
      csvContent += `Prompt Tokens,${aiData.summary.prompt_tokens}\n`;
      csvContent += `Completion Tokens,${aiData.summary.completion_tokens}\n`;
      csvContent += `Total Requests,${aiData.summary.total_requests}\n`;
      csvContent += `Estimated Inference Cost ($),${aiData.summary.total_cost}\n`;
      csvContent += `Avg Latency (ms),${aiData.summary.avg_latency_ms}\n`;
      csvContent += `Active AI Workspaces,${aiData.summary.active_ai_tenants}\n\n`;

      csvContent += 'Workspace,Feature,Model,Prompt Tokens,Completion Tokens,Total Tokens,Cost ($),Latency (ms),Status,Date\n';
      aiData.recent_logs.forEach(log => {
        csvContent += `"${log.company_name}","${log.feature_label}","${log.model}",${log.prompt_tokens},${log.completion_tokens},${log.total_tokens},${log.estimated_cost},${log.latency_ms},"${log.status}","${log.created_at}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `superadmin_ai_telemetry_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('AI telemetry exported successfully');
      return;
    }

    // Header labels
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Super Admin Platform Growth Report (${startDate} to ${endDate})\n\n`;
    
    // Core Platform KPIs
    csvContent += `Active Tenants,${data.active_tenants}\n`;
    csvContent += `MRR,${data.mrr}\n`;
    csvContent += `Churn Rate,${data.churn_rate}%\n`;
    csvContent += `Total Users,${data.total_users}\n`;
    csvContent += `Conversion Rate,${data.conversion_rate}%\n`;
    csvContent += `Active Connected Channels,${data.total_channels}\n\n`;

    // Registration Growth Trend
    csvContent += 'Date,New Registrations\n';
    data.trend.forEach(row => {
      csvContent += `"${row.label}",${row.count}\n`;
    });
    csvContent += '\n';

    // Channel Adoption
    csvContent += 'Channel Type,Connected Count\n';
    Object.entries(data.channel_adoption).forEach(([type, count]) => {
      csvContent += `"${type.toUpperCase()}",${count}\n`;
    });
    csvContent += '\n';

    // Tenant Registry
    csvContent += 'ID,Workspace Name,Plan,Status,Registration Date\n';
    tenants.forEach(t => {
      csvContent += `${t.id},"${t.company_name}","${t.plan?.name || 'Free Tier'}","${t.status}","${t.created_at}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `superadmin_analytics_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <SimpleLoader />
      </div>
    );
  }

  if (!data) return null;

  // Chart data calculation
  const totalChannelsCount = Object.values(data.channel_adoption).reduce((acc, curr) => acc + curr, 0);
  const pieColors: Record<string, string> = {
    whatsapp: '#3DD43D',
    telegram: '#229ED9',
    instagram: '#E1306C',
    facebook: '#1877F2',
    email: '#F5A623',
    webchat: '#8B5CF6'
  };

  const channelPieData = Object.entries(data.channel_adoption).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val,
    color: pieColors[key.toLowerCase()] || '#71717A'
  }));

  // Dual-mode trajectory data calculation
  let runningTotal = 0;
  const cumulativeTrendData = data.trend.map(item => {
    runningTotal += item.count;
    return {
      label: item.label,
      daily: item.count,
      cumulative: runningTotal,
    };
  });

  const trendSparkline = data.trend.length > 0 ? data.trend.map(item => ({ val: item.count })) : [{ val: 0 }];
  const totalRegistrations = data.trend.reduce((acc, curr) => acc + curr.count, 0);
  const peakRegistrations = Math.max(...data.trend.map(t => t.count), 0);
  const avgDailyRegistrations = (totalRegistrations / Math.max(1, data.trend.length)).toFixed(1);

  // Filtered & Paginated Tenants
  const filteredTenants = tenants.filter(t => {
    const q = tenantSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.company_name?.toLowerCase().includes(q) ||
      t.industry_category?.toLowerCase().includes(q) ||
      t.plan?.name?.toLowerCase().includes(q) ||
      String(t.id).includes(q) ||
      t.status?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / itemsPerPage));
  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtered & Paginated AI Logs
  const filteredAiLogs = (aiData?.recent_logs || []).filter(log => {
    const q = aiSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      log.company_name?.toLowerCase().includes(q) ||
      log.feature?.toLowerCase().includes(q) ||
      log.feature_label?.toLowerCase().includes(q) ||
      log.model?.toLowerCase().includes(q) ||
      log.provider?.toLowerCase().includes(q) ||
      log.status?.toLowerCase().includes(q)
    );
  });

  const aiTotalPages = Math.max(1, Math.ceil(filteredAiLogs.length / aiItemsPerPage));
  const paginatedAiLogs = filteredAiLogs.slice(
    (aiCurrentPage - 1) * aiItemsPerPage,
    aiCurrentPage * aiItemsPerPage
  );

  const periodOptions = [
    { value: '7d', label: t('analytics.periods.7d') },
    { value: '30d', label: t('analytics.periods.30d') },
    { value: 'month', label: t('analytics.periods.month') },
    { value: 'ytd', label: t('analytics.periods.ytd') },
  ];

  return (
    <div className="w-full p-8 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in space-y-6 flex-1 overflow-y-auto">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-[#E8E8E6]">
        
        {/* Left Side: Tab Bar Switcher */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('platform')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'platform'
                ? 'bg-white text-zinc-950 shadow-3xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-zinc-500" />
            <span>Platform Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-zinc-950 shadow-3xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            <span>AI & Token Telemetry</span>
          </button>
        </div>

        {/* Right Side: Filters, Export & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 border border-[#E8E8E6] bg-white rounded-[6px] px-2 h-9 shadow-3xs">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="text-xs font-semibold text-zinc-700 bg-transparent outline-none focus:ring-0 cursor-pointer border-none p-0"
            />
            <span className="text-zinc-300 text-xs">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="text-xs font-semibold text-zinc-700 bg-transparent outline-none focus:ring-0 cursor-pointer border-none p-0"
            />
          </div>

          <DropdownSelect
            value={preset}
            onChange={handlePresetChange}
            options={periodOptions}
            className="w-[130px] h-9"
          />

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-9 px-3.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all cursor-pointer shadow-3xs rounded-[6px]"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('analytics.exportReport')}</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] transition-colors cursor-pointer shadow-3xs h-9 w-9 flex items-center justify-center"
            title={t('analytics.refreshStats')}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PLATFORM OVERVIEW                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'platform' && (
        <div className="space-y-6">
          {/* TOP STAT CARDS GRID (PRIMARY KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Monthly Recurring Revenue */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('analytics.mrr')}
                  </span>
                  <Coins className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-1">
                  <span className="text-sm font-bold text-zinc-400 font-mono">{currencySymbol}</span>
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {data.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Sparkline Visual */}
                <div className="h-9 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendSparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="mrrSparkline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3DD43D" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#3DD43D" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#3DD43D" strokeWidth={1.75} fill="url(#mrrSparkline)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400 text-[11px] font-bold uppercase tracking-wider">ARR RUN-RATE</span>
                <span className="font-mono text-zinc-700 font-bold">
                  {currencySymbol}{(data.mrr * 12).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Card 2: Active Workspaces */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('analytics.activeTenants')}
                  </span>
                  <Building2 className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {data.active_tenants}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    / {tenants.length} total
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 mb-2">
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-zinc-900 h-full rounded-full transition-all"
                      style={{ width: `${tenants.length > 0 ? (data.active_tenants / tenants.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400 text-[11px] font-bold uppercase tracking-wider">CHURN RATE</span>
                <span className="font-mono text-zinc-700 font-bold">{data.churn_rate}%</span>
              </div>
            </div>

            {/* Card 3: Paid Plan Conversion */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('analytics.conversionRate')}
                  </span>
                  <Percent className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {data.conversion_rate}%
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    ({data.paid_tenants} paid)
                  </span>
                </div>

                <p className="text-xs text-zinc-500 font-medium mt-3 leading-relaxed">
                  Percentage of total registered workspaces converted into active paid tier subscriptions.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400 text-[11px] font-bold uppercase tracking-wider">TOTAL SEATS</span>
                <span className="font-mono text-zinc-700 font-bold">{data.total_users} Users</span>
              </div>
            </div>

            {/* Card 4: Active Communication Gateways */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    CONNECTED CHANNELS
                  </span>
                  <Radio className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {data.total_channels}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    gateways active
                  </span>
                </div>

                {/* Stacked Progress Bar of Top Channels */}
                <div className="mt-4 mb-2">
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    {channelPieData.map((slice, i) => (
                      <div 
                        key={i}
                        style={{ 
                          width: `${totalChannelsCount > 0 ? (slice.value / totalChannelsCount) * 100 : 0}%`,
                          backgroundColor: slice.color 
                        }}
                        className="h-full transition-all"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400 text-[11px] font-bold uppercase tracking-wider">DISPATCH UPTIME</span>
                <span className="font-mono text-emerald-600 font-bold">99.9%</span>
              </div>
            </div>

          </div>

          {/* MIDDLE ROW: REGISTRATION GROWTH CHART + CHANNEL ADOPTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Left 2 Cols: Redesigned Registration Growth Chart */}
            <div className="lg:col-span-2 rounded-[10px] border border-[#E8E8E6] bg-white p-6 shadow-3xs flex flex-col justify-between">
              
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 tracking-tight">
                      {t('analytics.registrationGrowth')}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-400">
                      ({data.trend.length} intervals)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Platform workspace adoption & onboarding velocity
                  </p>
                </div>

                {/* Dual-Mode Selector */}
                <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-[6px] border border-zinc-200/60 self-start sm:self-auto">
                  <button
                    onClick={() => setChartMode('cumulative')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                      chartMode === 'cumulative'
                        ? 'bg-white text-zinc-900 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Cumulative Growth
                  </button>
                  <button
                    onClick={() => setChartMode('daily')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                      chartMode === 'daily'
                        ? 'bg-white text-zinc-900 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Daily Activity
                  </button>
                </div>
              </div>

              {/* Integrated Telemetry Metrics Strip */}
              <div className="flex items-center gap-4 text-xs pt-2.5 pb-1 select-none font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Total Signups:</span>
                  <strong className="text-zinc-900 font-bold">{totalRegistrations}</strong>
                </div>
                <span className="text-zinc-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Daily Cadence:</span>
                  <strong className="text-zinc-900 font-bold">{avgDailyRegistrations} / day</strong>
                </div>
                <span className="text-zinc-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Peak 24h:</span>
                  <strong className="text-zinc-900 font-bold">{peakRegistrations} workspaces</strong>
                </div>
              </div>

              {/* Chart Canvas Area */}
              <div className="w-full flex-1 min-h-[260px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'cumulative' ? (
                    <AreaChart 
                      data={cumulativeTrendData} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
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
                        minTickGap={32}
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[150px]">
                                <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                  {d.label}
                                </p>
                                <div className="flex items-center justify-between gap-4 font-mono">
                                  <span className="text-zinc-400">Total Scale:</span>
                                  <span className="font-bold text-[#4AE54A] flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
                                    {d.cumulative} workspaces
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-zinc-400">
                                  <span>Day&apos;s New:</span>
                                  <span className="font-bold text-zinc-200">+{d.daily}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />

                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#18181B" 
                        strokeWidth={2.25}
                        fillOpacity={1} 
                        fill="url(#growthGradient)" 
                      />
                    </AreaChart>
                  ) : (
                    <BarChart 
                      data={cumulativeTrendData} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      
                      <XAxis 
                        dataKey="label" 
                        stroke="#A1A1AA" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#E4E4E7' }}
                        dy={8}
                        minTickGap={32}
                      />
                      
                      <YAxis 
                        stroke="#A1A1AA" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                      />

                      <Tooltip 
                        cursor={{ fill: '#F4F4F5' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[140px]">
                                <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                  {d.label}
                                </p>
                                <div className="flex items-center justify-between gap-4 font-mono">
                                  <span className="text-zinc-400">New Signups:</span>
                                  <span className="font-bold text-[#4AE54A] flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A]" />
                                    +{d.daily}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />

                      <Bar 
                        dataKey="daily" 
                        fill="#18181B" 
                        radius={[4, 4, 0, 0]}
                        barSize={10}
                      >
                        {cumulativeTrendData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.daily > 0 ? '#18181B' : '#E4E4E7'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

            </div>

            {/* Right 1 Col: Channel Adoption Breakdown */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-6 shadow-3xs flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <div>
                    <span className="text-sm font-bold text-zinc-900 tracking-tight">
                      {t('analytics.channelAdoption')}
                    </span>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Protocol & provider market share
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                    {totalChannelsCount} Total
                  </span>
                </div>

                {/* Donut Chart */}
                <div className="h-44 w-full relative mt-3 flex items-center justify-center">
                  {totalChannelsCount === 0 ? (
                    <div className="text-xs text-zinc-400 font-mono">No gateways connected</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelPieData}
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {channelPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              const pct = totalChannelsCount > 0 ? ((d.value / totalChannelsCount) * 100).toFixed(1) : 0;
                              return (
                                <div className="bg-zinc-900 text-white p-2.5 rounded-[6px] shadow-lg border border-zinc-800 text-xs font-mono">
                                  <span className="font-bold block" style={{ color: d.color }}>{d.name}</span>
                                  <span className="text-zinc-300">{d.value} gateways ({pct}%)</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Legend Grid */}
              <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                {channelPieData.slice(0, 4).map((item, idx) => {
                  const pct = totalChannelsCount > 0 ? ((item.value / totalChannelsCount) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-zinc-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="font-bold text-zinc-900">{item.value}</span>
                        <span className="text-zinc-400 text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* BOTTOM SECTION: REDESIGNED TENANT REGISTRY TELEMETRY */}
          <div className="rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden">
            
            {/* Table Action Bar */}
            <div className="p-5 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-zinc-900" />
                  <span className="text-sm font-bold text-zinc-900 tracking-tight">
                    {t('analytics.tenantRegistry')}
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                    {filteredTenants.length} Workspaces
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Live operational roster and provisioning telemetry
                </p>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tenantSearchQuery}
                    onChange={(e) => {
                      setTenantSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search workspace, plan..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-zinc-800 placeholder-zinc-400 outline-none focus:bg-white focus:border-zinc-400 transition-all shadow-3xs"
                  />
                </div>
              </div>
            </div>

            {/* Table Grid */}
            {filteredTenants.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-zinc-400">
                No matching workspaces found for &quot;{tenantSearchQuery}&quot;
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]/75 text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider select-none">
                      <th className="py-3 px-5 text-left">Workspace</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-left">Assigned Tier</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-zinc-700 font-medium">
                    {paginatedTenants.map((tenant) => {
                      const isActive = tenant.status === 'active';
                      const initial = (tenant.company_name || 'W').charAt(0).toUpperCase();

                      return (
                        <tr 
                          key={tenant.id}
                          className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                        >
                          {/* Workspace Name & Monogram */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-zinc-900 text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 shadow-3xs group-hover:scale-105 transition-transform">
                                {initial}
                              </div>
                              <div>
                                <span className="font-bold text-zinc-900 block leading-snug">
                                  {tenant.company_name}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-400">
                                  ID: #{tenant.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 font-mono text-zinc-500 text-xs">
                            {tenant.industry_category || 'General SaaS'}
                          </td>

                          {/* Plan */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-zinc-800 block">
                              {tenant.plan?.name || t('analytics.freeTier')}
                            </span>
                          </td>

                          {/* Operational Status (Clean Icon & Typography, Zero Chips!) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              {isActive ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              )}
                              <span className="font-bold text-xs text-zinc-800">
                                {isActive ? 'Active' : 'Suspended'}
                              </span>
                            </div>
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-5 text-right font-mono text-xs text-zinc-500">
                            {new Date(tenant.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {filteredTenants.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA]/60 text-xs select-none">
                <span className="text-xs font-mono font-medium text-zinc-400">
                  Showing <strong className="text-zinc-700">{(currentPage - 1) * itemsPerPage + 1}</strong>–<strong className="text-zinc-700">{Math.min(currentPage * itemsPerPage, filteredTenants.length)}</strong> of <strong className="text-zinc-700">{filteredTenants.length}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1 text-xs font-bold border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-3xs flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>
                  
                  <span className="px-2 font-mono text-xs font-bold text-zinc-600">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2.5 py-1 text-xs font-bold border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-3xs flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI & TOKEN TELEMETRY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && aiData && (
        <div className="space-y-6">
          
          {/* TOP STAT CARDS GRID (AI KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total AI Tokens Consumed */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TOTAL AI TOKENS
                  </span>
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {aiData.summary.total_tokens.toLocaleString()}
                  </span>
                </div>

                <div className="h-9 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aiData.trend.map(t => ({ val: t.total_tokens }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="tokenSparkline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3DD43D" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3DD43D" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#3DD43D" strokeWidth={1.75} fill="url(#tokenSparkline)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[11px] font-bold">PROMPT / COMP</span>
                <span className="text-zinc-700 font-bold">
                  {aiData.summary.prompt_tokens.toLocaleString()} / {aiData.summary.completion_tokens.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Card 2: Estimated Inference Cost */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTIMATED INFERENCE COST
                  </span>
                  <Coins className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-1">
                  <span className="text-sm font-bold text-zinc-400 font-mono">$</span>
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {aiData.summary.total_cost.toFixed(4)}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 font-medium mt-3 leading-relaxed">
                  Real-time cost computed against foundational provider token pricing models.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[11px] font-bold">AVG / 1K TOKENS</span>
                <span className="text-zinc-700 font-bold">
                  ${((aiData.summary.total_cost / Math.max(1, aiData.summary.total_tokens)) * 1000).toFixed(4)}
                </span>
              </div>
            </div>

            {/* Card 3: Invocations & Latency */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TOTAL AI INVOCATIONS
                  </span>
                  <Activity className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {aiData.summary.total_requests.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">calls</span>
                </div>

                <div className="mt-4 mb-2">
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${aiData.summary.success_rate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[11px] font-bold">AVG LATENCY</span>
                <span className="text-zinc-700 font-bold">{aiData.summary.avg_latency_ms} ms</span>
              </div>
            </div>

            {/* Card 4: Active AI Workspaces */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 flex flex-col justify-between shadow-3xs hover:shadow-card-hover transition-all space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    ACTIVE AI WORKSPACES
                  </span>
                  <Building2 className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-zinc-955 leading-none">
                    {aiData.summary.active_ai_tenants}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    / {tenants.length} tenants
                  </span>
                </div>

                <p className="text-xs text-zinc-500 font-medium mt-3 leading-relaxed">
                  Workspaces actively utilizing AI Chatbots, Agents, Copilot, or RAG systems.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 text-[11px] font-bold">ADOPTION RATE</span>
                <span className="text-zinc-700 font-bold">
                  {tenants.length > 0 ? Math.round((aiData.summary.active_ai_tenants / tenants.length) * 100) : 0}%
                </span>
              </div>
            </div>

          </div>

          {/* MIDDLE ROW: AI TOKEN TRAJECTORY + MODEL DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Left 2 Cols: AI Token Trajectory Chart */}
            <div className="lg:col-span-2 rounded-[10px] border border-[#E8E8E6] bg-white p-6 shadow-3xs flex flex-col justify-between">
              
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 tracking-tight">
                      AI Token Consumption Trajectory
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-400">
                      ({aiData.trend.length} days)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Prompt vs completion token inflow across all operational nodes
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-[6px] border border-zinc-200/60 self-start sm:self-auto">
                  <button
                    onClick={() => setAiChartMode('cumulative')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                      aiChartMode === 'cumulative'
                        ? 'bg-white text-zinc-900 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Cumulative Tokens
                  </button>
                  <button
                    onClick={() => setAiChartMode('daily')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                      aiChartMode === 'daily'
                        ? 'bg-white text-zinc-900 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Prompt vs Completion
                  </button>
                </div>
              </div>

              {/* Integrated Telemetry Metrics Strip */}
              <div className="flex items-center gap-4 text-xs pt-2.5 pb-1 select-none font-mono flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Total Volume:</span>
                  <strong className="text-zinc-900 font-bold">{aiData.summary.total_tokens.toLocaleString()}</strong>
                </div>
                <span className="text-zinc-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Daily Cadence:</span>
                  <strong className="text-zinc-900 font-bold">
                    {(aiData.summary.total_tokens / Math.max(1, aiData.trend.length)).toFixed(0)} tokens/day
                  </strong>
                </div>
                <span className="text-zinc-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-medium">Peak Day:</span>
                  <strong className="text-zinc-900 font-bold">
                    {Math.max(...aiData.trend.map(t => t.total_tokens), 0).toLocaleString()} tokens
                  </strong>
                </div>
              </div>

              {/* Chart Canvas Area */}
              <div className="w-full flex-1 min-h-[260px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {aiChartMode === 'cumulative' ? (
                    <AreaChart 
                      data={aiData.trend} 
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="aiGrowthGradient" x1="0" y1="0" x2="0" y2="1">
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
                        minTickGap={32}
                      />
                      
                      <YAxis 
                        stroke="#A1A1AA" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />
                      
                      <Tooltip 
                        cursor={{ stroke: '#18181B', strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[170px]">
                                <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                  {d.label}
                                </p>
                                <div className="flex items-center justify-between gap-4 font-mono">
                                  <span className="text-zinc-400">Cumulative:</span>
                                  <span className="font-bold text-[#4AE54A] flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
                                    {d.cumulative_tokens.toLocaleString()} tokens
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-zinc-400">
                                  <span>Day Total:</span>
                                  <span className="font-bold text-zinc-200">+{d.total_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-zinc-400">
                                  <span>Requests:</span>
                                  <span className="font-bold text-zinc-200">{d.requests} calls</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />

                      <Area 
                        type="monotone" 
                        dataKey="cumulative_tokens" 
                        stroke="#18181B" 
                        strokeWidth={2.25}
                        fillOpacity={1} 
                        fill="url(#aiGrowthGradient)" 
                      />
                    </AreaChart>
                  ) : (
                    <BarChart 
                      data={aiData.trend} 
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      
                      <XAxis 
                        dataKey="label" 
                        stroke="#A1A1AA" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#E4E4E7' }}
                        dy={8}
                        minTickGap={32}
                      />
                      
                      <YAxis 
                        stroke="#A1A1AA" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />

                      <Tooltip 
                        cursor={{ fill: '#F4F4F5' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-[8px] shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[170px]">
                                <p className="font-bold text-zinc-300 font-mono text-[11px] uppercase tracking-wider pb-1 border-b border-zinc-800">
                                  {d.label}
                                </p>
                                <div className="flex items-center justify-between gap-4 font-mono text-zinc-300">
                                  <span>Prompt:</span>
                                  <span className="font-bold text-zinc-100">{d.prompt_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono text-[#4AE54A]">
                                  <span>Completion:</span>
                                  <span className="font-bold">{d.completion_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono text-xs pt-1 border-t border-zinc-800 text-zinc-200">
                                  <span>Total Day:</span>
                                  <span className="font-bold">{d.total_tokens.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />

                      <Bar dataKey="prompt_tokens" stackId="a" fill="#18181B" radius={[0, 0, 0, 0]} barSize={12} />
                      <Bar dataKey="completion_tokens" stackId="a" fill="#3DD43D" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

            </div>

            {/* Right 1 Col: Model Distribution */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-6 shadow-3xs flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <div>
                    <span className="text-sm font-bold text-zinc-900 tracking-tight">
                      Foundation Models
                    </span>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Token volume by AI architecture
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                    {aiData.model_distribution.length} Models
                  </span>
                </div>

                {/* Donut Chart */}
                <div className="h-44 w-full relative mt-3 flex items-center justify-center">
                  {aiData.model_distribution.length === 0 ? (
                    <div className="text-xs text-zinc-400 font-mono">No AI models invoked yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aiData.model_distribution}
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {aiData.model_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 text-white p-2.5 rounded-[6px] shadow-lg border border-zinc-800 text-xs font-mono">
                                  <span className="font-bold block" style={{ color: d.color }}>{d.name}</span>
                                  <span className="text-zinc-300">{d.value.toLocaleString()} tokens ({d.percentage}%)</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Legend List */}
              <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                {aiData.model_distribution.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-zinc-700 truncate max-w-[130px]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="font-bold text-zinc-900">{item.value.toLocaleString()}</span>
                      <span className="text-zinc-400 text-[11px]">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* FEATURE CONSUMPTION MATRIX (Genuine Platform AI Features Only) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {aiData.feature_distribution.map((feat) => {
              const getFeatIcon = () => {
                switch (feat.key) {
                  case 'ai_chatbot': return <Bot className="h-3.5 w-3.5 text-zinc-600" />;
                  case 'flow_ai_prompt': return <Sparkles className="h-3.5 w-3.5 text-zinc-600" />;
                  case 'flow_ai_condition': return <Workflow className="h-3.5 w-3.5 text-zinc-600" />;
                  case 'prompt_to_flow': return <Cpu className="h-3.5 w-3.5 text-zinc-600" />;
                  case 'knowledge_base_rag': return <Database className="h-3.5 w-3.5 text-zinc-600" />;
                  default: return <Sparkles className="h-3.5 w-3.5 text-zinc-600" />;
                }
              };

              return (
                <div key={feat.key} className="rounded-[10px] border border-[#E8E8E6] bg-white p-4 shadow-3xs flex flex-col justify-between space-y-2.5 hover:border-zinc-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-6 w-6 rounded bg-zinc-100/80 border border-zinc-200/60 flex items-center justify-center shrink-0">
                          {getFeatIcon()}
                        </div>
                        <span className="text-xs font-bold text-zinc-900 truncate" title={feat.name}>{feat.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                        {feat.percentage}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-3">
                      <span className="text-base font-black font-mono text-zinc-900">
                        {feat.total_tokens.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                        {feat.requests} calls
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>Cost Attribution</span>
                    <span className="font-bold text-zinc-700 font-mono">${feat.cost.toFixed(4)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTTOM ROW: TOP WORKSPACES & REAL-TIME AI INVOCATIONS TELEMETRY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Left 1 Col: Top Consuming Workspaces */}
            <div className="rounded-[10px] border border-[#E8E8E6] bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-900" />
                    <span className="text-sm font-bold text-zinc-900 tracking-tight">
                      Top AI Workspaces
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    Leaderboard
                  </span>
                </div>

                {aiData.top_workspaces.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-zinc-400">
                    No workspaces recorded
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F0F0] mt-1">
                    {aiData.top_workspaces.slice(0, 6).map((ws, idx) => (
                      <div key={ws.tenant_id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-zinc-400 w-4">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-zinc-900 block truncate">
                              {ws.company_name}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {ws.plan_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-zinc-900 block">
                            {ws.total_tokens.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 font-medium">
                            ${ws.cost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#F0F0F0] text-center text-xs font-mono text-zinc-400">
                Ranked by cumulative token consumption
              </div>
            </div>

            {/* Right 2 Cols: Real-Time AI Invocations Telemetry Grid */}
            <div className="lg:col-span-2 rounded-[10px] border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
              
              <div>
                {/* Table Action Bar */}
                <div className="p-5 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Cpu className="h-4 w-4 text-zinc-900" />
                      <span className="text-sm font-bold text-zinc-900 tracking-tight">
                        Live AI Invocations Telemetry
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-[4px]">
                        {filteredAiLogs.length} Events
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Real-time stream of all prompt executions, tokens, and latencies
                    </p>
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-60">
                    <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={aiSearchQuery}
                      onChange={(e) => {
                        setAiSearchQuery(e.target.value);
                        setAiCurrentPage(1);
                      }}
                      placeholder="Search workspace, model..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-zinc-800 placeholder-zinc-400 outline-none focus:bg-white focus:border-zinc-400 transition-all shadow-3xs"
                    />
                  </div>
                </div>

                {/* Table Grid */}
                {filteredAiLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-zinc-400">
                    No AI execution logs matching &quot;{aiSearchQuery}&quot;
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]/75 text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider select-none">
                          <th className="py-3 px-5 text-left">Workspace</th>
                          <th className="py-3 px-4 text-left">Feature</th>
                          <th className="py-3 px-4 text-left">Model</th>
                          <th className="py-3 px-4 text-right">Tokens</th>
                          <th className="py-3 px-4 text-right">Latency</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0] text-zinc-700 font-medium">
                        {paginatedAiLogs.map((log) => {
                          const isSuccess = log.status === 'success';
                          const initial = (log.company_name || 'W').charAt(0).toUpperCase();

                          return (
                            <tr key={log.id} className="hover:bg-zinc-50/80 transition-colors">
                              {/* Workspace */}
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-[4px] bg-zinc-900 text-white font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                                    {initial}
                                  </div>
                                  <span className="font-bold text-zinc-900 block truncate max-w-[120px]">
                                    {log.company_name}
                                  </span>
                                </div>
                              </td>

                              {/* Feature */}
                              <td className="py-3.5 px-4 font-mono text-zinc-600 text-xs">
                                {log.feature_label}
                              </td>

                              {/* Model */}
                              <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-800">
                                {log.model}
                              </td>

                              {/* Tokens */}
                              <td className="py-3.5 px-4 text-right font-mono text-xs">
                                <strong className="text-zinc-900 block">{log.total_tokens.toLocaleString()}</strong>
                                <span className="text-zinc-400 text-[10px]">
                                  {log.prompt_tokens}p / {log.completion_tokens}c
                                </span>
                              </td>

                              {/* Latency */}
                              <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-600">
                                {log.latency_ms} ms
                              </td>

                              {/* Status (Icon & text, zero chips!) */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  {isSuccess ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="font-bold text-xs text-zinc-800">
                                    {isSuccess ? 'Success' : 'Failed'}
                                  </span>
                                </div>
                              </td>

                              {/* Time */}
                              <td className="py-3.5 px-5 text-right font-mono text-xs text-zinc-400">
                                {new Date(log.created_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination Footer */}
              {filteredAiLogs.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA]/60 text-xs select-none">
                  <span className="text-xs font-mono font-medium text-zinc-400">
                    Showing <strong className="text-zinc-700">{(aiCurrentPage - 1) * aiItemsPerPage + 1}</strong>–<strong className="text-zinc-700">{Math.min(aiCurrentPage * aiItemsPerPage, filteredAiLogs.length)}</strong> of <strong className="text-zinc-700">{filteredAiLogs.length}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={aiCurrentPage === 1}
                      onClick={() => setAiCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1 text-xs font-bold border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-3xs flex items-center gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </button>
                    
                    <span className="px-2 font-mono text-xs font-bold text-zinc-600">
                      {aiCurrentPage} / {aiTotalPages}
                    </span>

                    <button
                      disabled={aiCurrentPage === aiTotalPages}
                      onClick={() => setAiCurrentPage(prev => Math.min(aiTotalPages, prev + 1))}
                      className="px-2.5 py-1 text-xs font-bold border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-3xs flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
