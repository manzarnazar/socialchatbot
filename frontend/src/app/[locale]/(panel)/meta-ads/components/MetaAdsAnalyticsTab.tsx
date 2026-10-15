'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  Globe,
  MousePointer,
  Target,
  Workflow,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import {
  SummaryKPIs,
  Campaign,
  AdSet,
  MiniAreaSparkline,
  MiniBarSparkline,
  MiniGauge
} from '../metaAdsTypes';

// Custom Recharts Analytics Tooltip
export function CustomAnalyticsTooltip({ active, payload, label, currencySymbol = '$' }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950 text-white p-3 rounded-lg shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[190px] z-50 animate-fade-in font-mono">
        <div className="font-bold text-zinc-300 border-b border-zinc-850 pb-1.5 font-sans text-[11px] flex items-center justify-between">
          <span className="text-white font-bold">{data.label || label}</span>
          <span className="text-[9.5px] text-zinc-400 font-mono">{data.date}</span>
        </div>
        <div className="space-y-1 pt-0.5 text-[11px]">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-sans text-zinc-400">WhatsApp Chats:</span>
            <span className="font-bold font-mono">{(data.conversations || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-200">
            <span className="font-sans text-zinc-400">Ad Spend:</span>
            <span className="font-bold font-mono">{currencySymbol}{(Number(data.spend) || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-blue-400">
            <span className="font-sans text-zinc-400">Link Clicks:</span>
            <span className="font-bold font-mono">{(Number(data.clicks) || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-purple-400">
            <span className="font-sans text-zinc-400">Impressions:</span>
            <span className="font-bold font-mono">{(Number(data.impressions) || 0).toLocaleString()}</span>
          </div>
          {Number(data.conversations) > 0 && (
            <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-zinc-850 font-bold">
              <span className="font-sans text-[10px] text-zinc-400 font-normal">Cost / Conversation:</span>
              <span className="font-mono">{currencySymbol}{((Number(data.spend) || 0) / Number(data.conversations)).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// Custom Recharts Donut Tooltip
function CustomDonutTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950 text-white px-3 py-2 rounded-md shadow-xl border border-zinc-800 text-xs min-w-[150px] z-50 font-sans">
        <p className="font-bold text-zinc-200 text-[11.5px]">{data.name}</p>
        <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5 flex items-center justify-between">
          <span>{data.count} Ad Sets</span>
          <span className="text-zinc-400">({data.share}%)</span>
        </p>
      </div>
    );
  }
  return null;
}

export interface MetaAdsAnalyticsTabProps {
  summary: SummaryKPIs;
  analyticsData: {
    timeseries: any[];
    destination_breakdown?: any[];
  };
  spendTrend: number[];
  convTrend: number[];
  clicksTrend: number[];
  currencySymbol: string;
  timeRange: number;
  adSets: AdSet[];
  campaigns: Campaign[];
  analyticsMetric: 'convs_spend' | 'clicks_impressions' | 'cpr_efficiency';
  setAnalyticsMetric: (metric: 'convs_spend' | 'clicks_impressions' | 'cpr_efficiency') => void;
}

export default function MetaAdsAnalyticsTab({
  summary,
  analyticsData,
  spendTrend,
  convTrend,
  clicksTrend,
  currencySymbol,
  timeRange,
  adSets,
  campaigns,
  analyticsMetric,
  setAnalyticsMetric
}: MetaAdsAnalyticsTabProps) {
  const t = useTranslations('MetaAds');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. STATS KPI METRICS 3-COLUMN x 2-ROW GRID (WHATSONMI PAGE LAYOUT) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-[#E8E8E6] rounded-xl bg-white select-none shrink-0 overflow-hidden shadow-3xs">
        
        {/* Metric 1: Total Ad Spend (Row 1, Col 1) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b lg:border-b sm:border-r lg:border-r border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('totalSpend')}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight font-display">
              {currencySymbol}{summary.total_spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">Advantage+ budget</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Active</span>
            </span>
            <MiniAreaSparkline data={spendTrend} strokeColor="#008069" fillColor="rgba(0, 128, 105, 0.12)" />
          </div>
        </div>

        {/* Metric 2: WhatsApp Conversations (Row 1, Col 2) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b lg:border-b sm:border-r-0 lg:border-r border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('conversationsStarted')}</span>
              <MessageSquare className="h-3.5 w-3.5 text-[#008069]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#008069] tracking-tight font-display">
              {summary.total_conversations.toLocaleString()}
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">Direct CTWA Chats</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-zinc-500 font-medium">Inbound Leads</span>
            <MiniBarSparkline data={convTrend} color="#008069" />
          </div>
        </div>

        {/* Metric 3: Cost Per Conversation (CPR) (Row 1, Col 3) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b lg:border-b sm:border-r lg:border-r-0 border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('costPerConv')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight font-display">
              {currencySymbol}{(Number(summary.avg_cpr) || 0).toFixed(2)}
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">Cost / conversation</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-zinc-500 font-medium">Efficiency</span>
            <MiniGauge percentage={Number(summary.avg_cpr) > 0 ? Math.min(100, Math.round((10 / Number(summary.avg_cpr)) * 50)) : 80} />
          </div>
        </div>

        {/* Metric 4: Audience Reach (Row 2, Col 1) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b lg:border-b-0 sm:border-r-0 lg:border-r border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('totalReach')}</span>
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight font-display">
              {(Number(summary.total_reach) || 0).toLocaleString()}
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">{(Number(summary.total_impressions) || 0).toLocaleString()} views</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-zinc-500 font-medium">CTR: {(Number(summary.avg_ctr) || 0).toFixed(2)}%</span>
            <MiniBarSparkline data={clicksTrend} color="#0A0A0A" />
          </div>
        </div>

        {/* Metric 5: Link Clicks (Row 2, Col 2) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b-0 lg:border-b-0 sm:border-r lg:border-r border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('totalClicks')}</span>
              <MousePointer className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight font-display">
              {(Number(summary.total_clicks) || 0).toLocaleString()}
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">CPC: {currencySymbol}{(Number(summary.avg_cpc) || 0).toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-zinc-500 font-medium">Engagements</span>
            <MiniAreaSparkline data={clicksTrend} strokeColor="#0A0A0A" fillColor="rgba(10, 10, 10, 0.08)" />
          </div>
        </div>

        {/* Metric 6: Active Campaigns (Row 2, Col 3) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b-0 sm:border-b-0 lg:border-b-0 sm:border-r-0 lg:border-r-0 border-[#E8E8E6]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('activeCampaigns')}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight font-display">
              {summary.active_campaigns_count}
              <span className="text-xs font-semibold text-zinc-400 ml-1">/ {summary.total_campaigns_count}</span>
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">Running Ads</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-[10px] text-emerald-600 font-bold">100% Meta Sync</span>
            <Target className="h-3.5 w-3.5 text-[#008069]" />
          </div>
        </div>

      </div>

      {/* 2. RECHARTS DUAL-AXIS TELEMETRY TRAJECTORY CHART */}
      <div className="rounded-xl border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-950" />
              <h3 className="text-sm font-bold text-zinc-950 tracking-tight">
                {t('metaTelemetryTrajectory')}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {t('metaTelemetryDesc', { days: timeRange })}
            </p>
          </div>

          {/* Interactive Metric Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-[6px] border border-[#E8E8E6] self-start md:self-auto select-none">
            <button
              type="button"
              onClick={() => setAnalyticsMetric('convs_spend')}
              className={`px-3 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                analyticsMetric === 'convs_spend'
                  ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {t('chatsAndSpend')}
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsMetric('clicks_impressions')}
              className={`px-3 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                analyticsMetric === 'clicks_impressions'
                  ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {t('clicksAndReach')}
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsMetric('cpr_efficiency')}
              className={`px-3 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                analyticsMetric === 'cpr_efficiency'
                  ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {t('cprEfficiency')}
            </button>
          </div>
        </div>

        {/* Integrated Telemetry Metrics Strip */}
        <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/50 border-b border-[#F0F0F0] flex items-center gap-4 text-xs select-none font-mono flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium font-sans">{t('totalInboundChats')}:</span>
            <strong className="text-[#008069] font-bold">{summary.total_conversations.toLocaleString()}</strong>
          </div>
          <span className="text-zinc-200">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium font-sans">{t('totalSpend')}:</span>
            <strong className="text-zinc-950 font-bold">{currencySymbol}{(Number(summary.total_spend) || 0).toFixed(2)}</strong>
          </div>
          <span className="text-zinc-200">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium font-sans">{t('avgCostPerChat')}:</span>
            <strong className="text-zinc-900 font-bold">{currencySymbol}{(Number(summary.avg_cpr) || 0).toFixed(2)}</strong>
          </div>
          <span className="text-zinc-200">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium font-sans">CTR:</span>
            <strong className="text-zinc-900 font-bold">{(Number(summary.avg_ctr) || 0).toFixed(2)}%</strong>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="w-full h-72 pt-4 pb-2 px-2 sm:px-4">
          {analyticsData.timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="metaEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008069" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#008069" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="metaBlackGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="metaBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="metaPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="metaAmberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: '#E8E8E6' }}
                  tick={{ fontSize: 10, fill: '#71717A', fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'monospace' }}
                />
                <Tooltip content={<CustomAnalyticsTooltip currencySymbol={currencySymbol} />} />
                
                {analyticsMetric === 'convs_spend' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      name="Inbound Chats"
                      stroke="#008069"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#metaEmeraldGradient)"
                      activeDot={{ r: 5, stroke: '#008069', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      name="Ad Spend ($)"
                      stroke="#0A0A0A"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#metaBlackGradient)"
                      activeDot={{ r: 4, stroke: '#0A0A0A', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                  </>
                )}

                {analyticsMetric === 'clicks_impressions' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Link Clicks"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#metaBlueGradient)"
                      activeDot={{ r: 5, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressions"
                      name="Impressions"
                      stroke="#7C3AED"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#metaPurpleGradient)"
                    />
                  </>
                )}

                {analyticsMetric === 'cpr_efficiency' && (
                  <Area
                    type="monotone"
                    dataKey="spend"
                    name="Spend ($)"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#metaAmberGradient)"
                    activeDot={{ r: 5, stroke: '#D97706', strokeWidth: 2, fill: '#FFFFFF' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-400 text-xs font-medium">
              {t('noTelemetryRecorded')}
            </div>
          )}
        </div>
      </div>

      {/* 3. TWO-COLUMN ANALYTICAL INSIGHTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CARD A: REAL MULTI-STAGE CLICK-TO-WHATSAPP FUNNEL */}
        <div className="p-5 sm:p-6 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3.5">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-[#008069]" />
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                    {t('whatsappAttributionFunnel')}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    {t('funnelTelemetryDesc')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#008069] bg-[#E8FDE8] px-2 py-0.5 rounded border border-emerald-200">
                {t('realDataBadge')}
              </span>
            </div>

            {/* Funnel Step Progression */}
            <div className="space-y-4 pt-4">
              {[
                {
                  stage: t('adImpressionsReach'),
                  count: summary.total_impressions,
                  desc: t('adImpressionsDesc'),
                  rate: '100%',
                  badge: t('topOfFunnel'),
                  barPct: 100,
                  color: 'bg-zinc-950',
                },
                {
                  stage: t('highIntentClicks'),
                  count: summary.total_clicks,
                  desc: t('highIntentClicksDesc'),
                  rate: Number(summary.total_impressions) > 0 ? `${((Number(summary.total_clicks) / Number(summary.total_impressions)) * 100).toFixed(2)}%` : '0.00%',
                  badge: t('clickThroughCtr'),
                  barPct: Number(summary.total_impressions) > 0 ? Math.min(100, Math.max(5, (Number(summary.total_clicks) / Number(summary.total_impressions)) * 100)) : 0,
                  color: 'bg-blue-600',
                },
                {
                  stage: t('whatsappChatsStarted'),
                  count: summary.total_conversations,
                  desc: t('whatsappChatsDesc'),
                  rate: Number(summary.total_clicks) > 0 ? `${((Number(summary.total_conversations) / Number(summary.total_clicks)) * 100).toFixed(2)}%` : '0.00%',
                  badge: t('chatConversion'),
                  barPct: Number(summary.total_clicks) > 0 ? Math.min(100, Math.max(5, (Number(summary.total_conversations) / Number(summary.total_clicks)) * 100)) : 0,
                  color: 'bg-[#008069]',
                },
                {
                  stage: t('qualifiedCrmLeads'),
                  count: summary.total_leads,
                  desc: t('qualifiedCrmLeadsDesc'),
                  rate: Number(summary.total_conversations) > 0 ? `${((Number(summary.total_leads) / Number(summary.total_conversations)) * 100).toFixed(2)}%` : '0.00%',
                  badge: t('leadQualification'),
                  barPct: Number(summary.total_conversations) > 0 ? Math.min(100, Math.max(5, (Number(summary.total_leads) / Number(summary.total_conversations)) * 100)) : 0,
                  color: 'bg-emerald-600',
                },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-[#FAFAFA]/70 border border-[#F0F0F0]">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-zinc-950 block">{step.stage}</span>
                      <span className="text-[10.5px] text-zinc-400 font-medium">{step.desc}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-zinc-950 text-sm block">
                        {step.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                        {step.rate} ({step.badge})
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200/60 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all duration-500`}
                      style={{ width: `${step.barPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {summary.total_impressions === 0 && (
            <p className="text-[11px] text-zinc-400 italic text-center pt-2">
              {t('noCampaignsDesc')}
            </p>
          )}
        </div>

        {/* CARD B: REAL AD SET DESTINATIONS DISTRIBUTION (RECHARTS DONUT) */}
        <div className="p-5 sm:p-6 bg-white border border-[#E8E8E6] rounded-xl shadow-3xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-zinc-950" />
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                    {t('adSetDestinationDistribution')}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    {t('adSetDestinationDesc')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                {t('totalAdSets', { count: adSets.length })}
              </span>
            </div>

            {/* Donut Chart Canvas */}
            <div className="w-full h-48 flex items-center justify-center pt-2">
              {analyticsData.destination_breakdown && analyticsData.destination_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomDonutTooltip />} />
                    <Pie
                      data={analyticsData.destination_breakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {analyticsData.destination_breakdown.map((entry, index) => {
                        const colors = ['#008069', '#0A0A0A', '#2563EB', '#8B5CF6', '#F59E0B'];
                        return (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#FFFFFF" strokeWidth={2} />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-zinc-400 text-xs">No ad set destination data available.</div>
              )}
            </div>

            {/* Breakdown Legend Table */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              {(analyticsData.destination_breakdown && analyticsData.destination_breakdown.length > 0 ? analyticsData.destination_breakdown : [
                { key: 'WHATSAPP', name: 'WhatsApp Business Direct', count: adSets.length || 0, share: 100 }
              ]).map((item, idx) => {
                const colors = ['bg-[#008069]', 'bg-zinc-950', 'bg-blue-600', 'bg-purple-600', 'bg-amber-500'];
                return (
                  <div key={item.key || idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="font-bold text-zinc-900">{item.name}</span>
                    </div>
                    <div className="font-mono text-zinc-600 flex items-center gap-2">
                      <span className="font-bold text-zinc-950">{item.count} Ad Sets</span>
                      <span className="text-zinc-400">({item.share}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* 4. REAL CAMPAIGN PERFORMANCE LEADERBOARD */}
      <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs animate-row-fade">
        <div className="px-5 sm:px-6 py-4 border-b border-[#E8E8E6] flex items-center justify-between bg-zinc-50/40">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-950" />
            <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
              {t('campaignPerformanceLeaderboard')}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            {t('rankedBySpendVolume')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                <th className="px-6 py-3.5">{t('colName')}</th>
                <th className="px-6 py-3.5">{t('colObjective')}</th>
                <th className="px-6 py-3.5">{t('colSpend')}</th>
                <th className="px-6 py-3.5">{t('colConvs')}</th>
                <th className="px-6 py-3.5">{t('colCpr')}</th>
                <th className="px-6 py-3.5">{t('colClicks')}</th>
                <th className="px-6 py-3.5">{t('colCtr')}</th>
                <th className="px-6 py-3.5">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E6] font-medium text-zinc-800">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400 font-medium">
                    {t('noCampaignsTelemetry')}
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-950">{c.name}</p>
                      <span className="text-[10.5px] text-zinc-400 font-mono">
                        {c.meta_campaign_id ? `#${c.meta_campaign_id.slice(-6)}` : `ID #${c.id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
                        {c.objective}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-zinc-950">
                      {currencySymbol}{(Number(c.metrics?.spend) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#008069]">
                      {(Number(c.metrics?.conversations) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-zinc-950">
                      {currencySymbol}{(Number(c.metrics?.cpr) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-600">
                      {(Number(c.metrics?.clicks) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-600">
                      {Number(c.metrics?.impressions) > 0 ? ((Number(c.metrics?.clicks) / Number(c.metrics?.impressions)) * 100).toFixed(2) : '0.00'}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                        <span>{c.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
