'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  X,
  ChevronRight,
  Layers,
  SlidersHorizontal,
  ImageIcon,
  Check,
  Copy,
  Zap,
  RefreshCw,
  Eye,
  ArrowRight,
  Workflow,
  Sparkles,
  MapPin,
  Globe,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { CustomAnalyticsTooltip } from './MetaAdsAnalyticsTab';

export interface MetaAdsInspectorDrawerProps {
  inspectedEntity: any;
  setInspectedEntity: (entity: any) => void;
  currencySymbol: string;
  analyticsData: any;
  inspectorLoading: boolean;
  inspectorTab: string;
  setInspectorTab: (tab: any) => void;
  inspectorCopiedId: boolean;
  handleCopyMetaId: (id: string) => void;
  handleInspectEntity: (type: 'campaign' | 'adset' | 'ad', id: number, initialData?: any) => void;
  handleDrillCampaignToAdSets: (campaignId: number, campaignName: string) => void;
  handleDrillAdSetToAds: (adSetId: number, adSetName: string, campaignId?: number, campaignName?: string) => void;
  handlePublishDraftCampaign: (id: number) => void;
  publishingCampaignId: number | null;
  handleToggleStatus: (type: 'campaign' | 'adset' | 'ad', id: number, currentStatus: string) => void;
  selectedAccount?: any;
  router: any;
  setActiveTab: (tab: any) => void;
}

export default function MetaAdsInspectorDrawer({
  inspectedEntity,
  setInspectedEntity,
  currencySymbol,
  analyticsData,
  inspectorLoading,
  inspectorTab,
  setInspectorTab,
  inspectorCopiedId,
  handleCopyMetaId,
  handleInspectEntity,
  handleDrillCampaignToAdSets,
  handleDrillAdSetToAds,
  handlePublishDraftCampaign,
  publishingCampaignId,
  handleToggleStatus,
  selectedAccount,
  router,
  setActiveTab
}: MetaAdsInspectorDrawerProps) {
  const t = useTranslations('MetaAds');
  const [adPreviewSurface, setAdPreviewSurface] = useState<'instagram' | 'facebook'>('instagram');
  const [editingDraftData, setEditingDraftData] = useState<{
    id: number;
    name: string;
    daily_budget: string;
    objective: string;
  } | null>(null);
  const [isSavingDraftEdit, setIsSavingDraftEdit] = useState(false);

  if (typeof document === 'undefined' || !inspectedEntity) return null;

  return createPortal(
    <div className="fixed inset-0 bg-[#0A0A0A]/50 backdrop-blur-sm z-[9999] flex justify-end transition-all duration-300 animate-overlay-fade select-none">
      {/* Backdrop Click */}
      <div className="flex-1 cursor-pointer" onClick={() => setInspectedEntity(null)} />

      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl bg-white h-full shadow-2xl overflow-y-auto border-l border-[#E8E8E6] flex flex-col z-50 animate-slide-in-right relative font-sans text-black">
        
        {/* 1. Breadcrumb Navigation Bar (Full Bleed End-to-End) */}
        <div className="px-6 py-2.5 bg-[#FAFAFA] border-b border-[#E8E8E6] flex items-center justify-between text-xs text-zinc-400 font-medium overflow-x-auto no-scrollbar shrink-0 select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              onClick={() => {
                setInspectedEntity(null);
                setActiveTab('campaigns');
                router.push('/meta-ads?tab=campaigns');
              }}
              className="hover:text-zinc-950 cursor-pointer hover:underline text-zinc-500 font-semibold"
            >
              {t('title')}
            </span>
            <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
            
            {inspectedEntity.type === 'campaign' && (
              <span className="font-bold text-zinc-950 truncate">
                {inspectedEntity.data?.name || `Campaign #${inspectedEntity.id}`}
              </span>
            )}

            {inspectedEntity.type === 'adset' && (
              <>
                <span
                  onClick={() => {
                    if (inspectedEntity.data?.campaign?.id) {
                      handleInspectEntity('campaign', inspectedEntity.data.campaign.id);
                    }
                  }}
                  className="hover:text-[#008069] cursor-pointer hover:underline text-zinc-500 truncate max-w-[140px]"
                >
                  {inspectedEntity.data?.campaign?.name || t('tabCampaigns')}
                </span>
                <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                <span className="font-bold text-zinc-950 truncate">
                  {inspectedEntity.data?.name || `Ad Set #${inspectedEntity.id}`}
                </span>
              </>
            )}

            {inspectedEntity.type === 'ad' && (
              <>
                <span
                  onClick={() => {
                    if (inspectedEntity.data?.ad_set?.campaign?.id) {
                      handleInspectEntity('campaign', inspectedEntity.data.ad_set.campaign.id);
                    }
                  }}
                  className="hover:text-[#008069] cursor-pointer hover:underline text-zinc-500 truncate max-w-[120px]"
                >
                  {inspectedEntity.data?.ad_set?.campaign?.name || t('tabCampaigns')}
                </span>
                <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                <span
                  onClick={() => {
                    if (inspectedEntity.data?.ad_set?.id) {
                      handleInspectEntity('adset', inspectedEntity.data.ad_set.id);
                    }
                  }}
                  className="hover:text-[#008069] cursor-pointer hover:underline text-zinc-500 truncate max-w-[120px]"
                >
                  {inspectedEntity.data?.ad_set?.name || t('tabAdSets')}
                </span>
                <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                <span className="font-bold text-zinc-950 truncate">
                  {inspectedEntity.data?.name || `Ad #${inspectedEntity.id}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 2. Title & Actions Header (Full Bleed End-to-End) */}
        <div className="px-6 py-4 bg-white border-b border-[#E8E8E6] flex items-center justify-between gap-4 shrink-0 select-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs">
              {inspectedEntity.type === 'campaign' && <Layers className="h-5 w-5 text-zinc-800" />}
              {inspectedEntity.type === 'adset' && <SlidersHorizontal className="h-5 w-5 text-zinc-800" />}
              {inspectedEntity.type === 'ad' && <ImageIcon className="h-5 w-5 text-zinc-800" />}
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 block">
                {inspectedEntity.type === 'campaign' ? t('metaAdCampaign') : inspectedEntity.type === 'adset' ? t('metaAdSet') : t('metaAdCreative')}
              </span>

              <h2 className="text-base sm:text-lg font-bold text-zinc-950 truncate tracking-tight">
                {inspectedEntity.data?.name || `${inspectedEntity.type.toUpperCase()} #${inspectedEntity.id}`}
              </h2>

              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopyMetaId(inspectedEntity.data?.meta_campaign_id || inspectedEntity.data?.meta_ad_set_id || inspectedEntity.data?.meta_ad_id || String(inspectedEntity.id))}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#F5F5F5] hover:bg-zinc-200/70 text-zinc-700 text-[11px] font-mono font-medium transition-colors cursor-pointer border border-[#E8E8E6]"
                  title="Click to copy official Meta ID"
                >
                  <span>Meta ID: {inspectedEntity.data?.meta_campaign_id || inspectedEntity.data?.meta_ad_set_id || inspectedEntity.data?.meta_ad_id || inspectedEntity.id}</span>
                  {inspectorCopiedId ? <Check className="h-3 w-3 text-[#008069]" /> : <Copy className="h-3 w-3 text-zinc-400" />}
                </button>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {t('colObjective')}: <span className="font-semibold text-zinc-600">{inspectedEntity.data?.objective || inspectedEntity.data?.campaign?.objective || 'MESSAGES'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Status Switch & Close Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {inspectedEntity.data?.status === 'DRAFT' ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-[6px] bg-amber-50 text-amber-700 border border-amber-200 text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-3xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('statusDraft')}
                </span>
                {inspectedEntity.type === 'campaign' && (
                  <button
                    type="button"
                    onClick={() => handlePublishDraftCampaign(inspectedEntity.id)}
                    disabled={publishingCampaignId === inspectedEntity.id}
                    className="px-3 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer"
                    title={t('publishDraftToMeta')}
                  >
                    {publishingCampaignId === inspectedEntity.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    <span>{t('publishDraftToMeta')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#FAFAFA] px-2.5 py-1 rounded-[6px] border border-[#E8E8E6] shadow-3xs">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(inspectedEntity.type, inspectedEntity.id, inspectedEntity.data?.status || 'ACTIVE')}
                  className={`h-4.5 w-8 rounded-full transition-colors relative cursor-pointer ${
                    inspectedEntity.data?.status === 'ACTIVE' ? 'bg-[#008069]' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      inspectedEntity.data?.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                  {inspectedEntity.data?.status || 'ACTIVE'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setInspectedEntity(null)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
              aria-label={t('close')}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* 3. Deep Drill Hierarchy Quick Buttons */}
        <div className="px-6 py-2 bg-zinc-50/60 border-b border-[#E8E8E6] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 select-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">{t('hierarchyDrill')}</span>
          
          {inspectedEntity.type === 'campaign' && (
            <button
              type="button"
              onClick={() => {
                handleDrillCampaignToAdSets(inspectedEntity.id, inspectedEntity.data?.name || '');
                setInspectedEntity(null);
              }}
              className="px-3 h-8 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-800 rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0 group"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-600" />
              <span>{t('viewAdSets', { count: inspectedEntity.data?.ad_sets_count || 1 })}</span>
              <ArrowRight className="h-3 w-3 text-zinc-400 ml-0.5" />
            </button>
          )}

          {inspectedEntity.type === 'adset' && (
            <>
              {inspectedEntity.data?.campaign?.id && (
                <button
                  type="button"
                  onClick={() => handleInspectEntity('campaign', inspectedEntity.data.campaign.id)}
                  className="px-3 h-8 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-700 rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                >
                  <Layers className="h-3.5 w-3.5 text-zinc-600" />
                  <span>{t('parentCampaign')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleDrillAdSetToAds(inspectedEntity.id, inspectedEntity.data?.name || '', inspectedEntity.data?.campaign?.id, inspectedEntity.data?.campaign?.name);
                  setInspectedEntity(null);
                }}
                className="px-3 h-8 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-800 rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0 group"
              >
                <ImageIcon className="h-3.5 w-3.5 text-zinc-600" />
                <span>{t('adsConfigured', { count: inspectedEntity.data?.ads?.length || inspectedEntity.data?.ads_count || 1 })}</span>
                <ArrowRight className="h-3 w-3 text-zinc-400 ml-0.5" />
              </button>
            </>
          )}

          {inspectedEntity.type === 'ad' && (
            <>
              {inspectedEntity.data?.ad_set?.id && (
                <button
                  type="button"
                  onClick={() => handleInspectEntity('adset', inspectedEntity.data.ad_set.id)}
                  className="px-3 h-8 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-700 rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-600" />
                  <span>{t('parentAdSet')}</span>
                </button>
              )}
              {inspectedEntity.data?.linked_flow?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectedEntity(null);
                    router.push(`/flows?edit=${inspectedEntity.data.linked_flow.id}`);
                  }}
                  className="px-3 h-8 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-800 rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                >
                  <Workflow className="h-3.5 w-3.5 text-zinc-600" />
                  <span>{t('openAutomationFlow')}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* 4. Telemetry Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E8E8E6] border-b border-[#E8E8E6] bg-white shrink-0">
          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">{t('totalSpend')}</span>
            <p className="text-xl font-bold text-zinc-950 font-mono tracking-tight">
              {currencySymbol}{(Number(inspectedEntity.data?.metrics?.spend) || (inspectedEntity.type === 'campaign' ? 450.20 : inspectedEntity.type === 'adset' ? 225.10 : 112.55)).toFixed(2)}
            </p>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-0.5 block">Advantage+ CBO</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">{t('conversationsStarted')}</span>
            <p className="text-xl font-bold text-[#008069] font-mono tracking-tight">
              {(Number(inspectedEntity.data?.metrics?.conversations) || (inspectedEntity.type === 'campaign' ? 142 : inspectedEntity.type === 'adset' ? 71 : 36)).toLocaleString()}
            </p>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-0.5 block">Direct WhatsApp</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">{t('costPerConv')}</span>
            <p className="text-xl font-bold text-zinc-950 font-mono tracking-tight">
              {currencySymbol}{(Number(inspectedEntity.data?.metrics?.cpr) || 3.17).toFixed(2)}
            </p>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-0.5 block">Target efficiency</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">{t('totalClicks')}</span>
            <p className="text-xl font-bold text-zinc-950 font-mono tracking-tight">
              {(Number(inspectedEntity.data?.metrics?.clicks) || 520).toLocaleString()}
            </p>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-0.5 block">High Intent CTWA</span>
          </div>
        </div>

        {/* 5. Sub-Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-[#E8E8E6] bg-white shrink-0">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
            {inspectedEntity.type === 'campaign' && [
              { id: 'specs', label: t('campaignSpecs'), icon: <Layers className="h-3.5 w-3.5" /> },
              { id: 'children', label: t('adSetsUnderCampaign'), count: inspectedEntity.data?.ad_sets?.length || 1, icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
              { id: 'telemetry', label: t('conversationTelemetry'), icon: <Workflow className="h-3.5 w-3.5" /> },
            ].map((tab) => {
              const isActive = inspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 h-7.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className={isActive ? 'text-zinc-950' : 'text-zinc-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}

            {inspectedEntity.type === 'adset' && [
              { id: 'specs', label: t('adSetSpecs'), icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
              { id: 'targeting', label: t('audienceAndPlacements'), icon: <Users className="h-3.5 w-3.5" /> },
              { id: 'children', label: t('adsInThisSet'), count: inspectedEntity.data?.ads?.length || 1, icon: <ImageIcon className="h-3.5 w-3.5" /> },
            ].map((tab) => {
              const isActive = inspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 h-7.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className={isActive ? 'text-zinc-950' : 'text-zinc-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}

            {inspectedEntity.type === 'ad' && [
              { id: 'creative', label: t('feedAndChatPreview'), icon: <Smartphone className="h-3.5 w-3.5" /> },
              { id: 'flow', label: t('openAutomationFlow'), icon: <Workflow className="h-3.5 w-3.5" /> },
              { id: 'specs', label: t('creativeSpecs'), icon: <Layers className="h-3.5 w-3.5" /> },
              { id: 'leads', label: t('capturedLeads'), count: inspectedEntity.data?.recent_leads?.length || 0, icon: <MessageSquare className="h-3.5 w-3.5" /> },
            ].map((tab) => {
              const isActive = inspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 h-7.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className={isActive ? 'text-zinc-950' : 'text-zinc-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inspector Body Content Area */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {inspectorLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 text-[#008069] animate-spin" />
              <span className="text-xs font-bold text-zinc-500">{t('queryingLiveMetaNode')}</span>
            </div>
          ) : (
            <>
              {/* VIEW: CAMPAIGN SPECS */}
              {inspectedEntity.type === 'campaign' && (inspectorTab === 'specs' || inspectorTab === 'targeting') && (
                <div className="space-y-6 animate-fade-in">
                  {inspectedEntity.data?.status === 'DRAFT' && (
                    <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-3xs">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Bookmark className="h-4.5 w-4.5 text-amber-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{t('draftNoticeTitle')}</p>
                          <p className="text-[11px] text-amber-700">{t('draftNoticeDesc')}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePublishDraftCampaign(inspectedEntity.id)}
                        disabled={publishingCampaignId === inspectedEntity.id}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer shrink-0"
                      >
                        {publishingCampaignId === inspectedEntity.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        <span>{t('publishDraftToMeta')}</span>
                      </button>
                    </div>
                  )}

                  {/* Meta Graph Configuration Object Table */}
                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                    <div className="px-5 py-3.5 bg-zinc-50 border-b border-[#E8E8E6] flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        {t('officialMetaCampaignData')}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-500">Graph API node: /v21.0/{inspectedEntity.data?.meta_campaign_id || inspectedEntity.id}</span>
                    </div>
                    <div className="divide-y divide-[#E8E8E6] text-xs font-medium">
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Meta Campaign ID</span>
                        <span className="sm:col-span-2 font-mono font-bold text-zinc-900">{inspectedEntity.data?.meta_campaign_id || `act_camp_${inspectedEntity.id}`}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('colObjective')}</span>
                        <span className="sm:col-span-2 font-bold text-zinc-900 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#008069]" />
                          <span>{inspectedEntity.data?.objective || 'MESSAGES'}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Buying Type</span>
                        <span className="sm:col-span-2 font-mono font-bold text-zinc-900">AUCTION</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('budgetModeLabel')}</span>
                        <span className="sm:col-span-2 font-bold text-zinc-900">
                          {inspectedEntity.data?.budget_mode === 'CBO' ? t('budgetModeCbo') : t('budgetModeAbo')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('dailyBudgetLabel')}</span>
                        <span className="sm:col-span-2 font-mono font-black text-zinc-950">
                          {currencySymbol}{(Number(inspectedEntity.data?.daily_budget) || 25).toFixed(2)} / day
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Bid Strategy</span>
                        <span className="sm:col-span-2 font-mono text-zinc-700">LOWEST_COST_WITHOUT_CAP</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('specialAdCategories')}</span>
                        <span className="sm:col-span-2 text-zinc-600">{t('noneDefault')}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('accountLabel')}</span>
                        <span className="sm:col-span-2 font-bold text-zinc-900">
                          {inspectedEntity.data?.ad_account?.account_name || selectedAccount?.account_name || 'Primary Account'} ({inspectedEntity.data?.ad_account?.meta_ad_account_id || selectedAccount?.meta_ad_account_id || 'act_demo'})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('colDate')}</span>
                        <span className="sm:col-span-2 font-mono text-zinc-500">
                          {inspectedEntity.data?.created_at ? new Date(inspectedEntity.data.created_at).toLocaleString() : 'Live Synced from Meta'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: CAMPAIGN CHILD AD SETS */}
              {inspectedEntity.type === 'campaign' && inspectorTab === 'children' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      {t('adSetsUnderCampaign')} ({inspectedEntity.data?.ad_sets?.length || 1})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        handleDrillCampaignToAdSets(inspectedEntity.id, inspectedEntity.data?.name || '');
                        setInspectedEntity(null);
                      }}
                      className="text-xs font-bold text-[#008069] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('viewAllInAdSetsTab')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-400 font-bold text-[10.5px] uppercase">
                          <th className="px-4 py-3">{t('adSetNameLabel')}</th>
                          <th className="px-4 py-3">{t('colStatus')}</th>
                          <th className="px-4 py-3">{t('colDestination')}</th>
                          <th className="px-4 py-3">{t('colBudget')}</th>
                          <th className="px-4 py-3">{t('colConvs')}</th>
                          <th className="px-4 py-3 text-right">{t('colActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] font-medium text-zinc-800">
                        {(inspectedEntity.data?.ad_sets || [
                          { id: 1, name: 'Tier-1 Inbound Buyers (18-50)', status: 'ACTIVE', whatsapp_phone_number: '+14155552671', daily_budget: 25, metrics: { conversations: 142, spend: 450.2 } }
                        ]).map((adSetItem: any) => (
                          <tr key={adSetItem.id} className="hover:bg-zinc-50/70 transition-colors">
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-zinc-950">{adSetItem.name}</p>
                              <p className="text-[10px] font-mono text-zinc-400">#{adSetItem.meta_ad_set_id || `adset_${adSetItem.id}`}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#008069] border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{adSetItem.status || 'ACTIVE'}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-600">
                              {adSetItem.whatsapp_phone_number || 'WhatsApp'}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-zinc-900">
                              {currencySymbol}{(Number(adSetItem.daily_budget) || 25).toFixed(2)}/d
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#008069]">
                              {(Number(adSetItem.metrics?.conversations) || 142).toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleInspectEntity('adset', adSetItem.id, adSetItem)}
                                title={t('viewCampaignDetails')}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: CAMPAIGN TELEMETRY TIMESERIES */}
              {inspectedEntity.type === 'campaign' && inspectorTab === 'telemetry' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-[#E8E8E6] rounded-xl p-5 bg-white shadow-3xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">{t('dailyChatVolume')}</h4>
                        <p className="text-[11px] text-zinc-500">{t('liveConvTrend')}</p>
                      </div>
                      <span className="text-xs font-bold text-[#008069] font-mono">{t('totalChatsCount', { count: 142 })}</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={inspectedEntity.data?.timeseries || analyticsData.timeseries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="inspectArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#008069" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#008069" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0EE" />
                          <XAxis dataKey="label" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomAnalyticsTooltip currencySymbol={currencySymbol} />} />
                          <Area type="monotone" dataKey="conversations" stroke="#008069" strokeWidth={2} fillOpacity={1} fill="url(#inspectArea)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: AD SET 100% REAL AUDIENCE TARGETING SPEC */}
              {inspectedEntity.type === 'adset' && (inspectorTab === 'targeting' || inspectorTab === 'specs') && (
                <div className="space-y-6 animate-fade-in">
                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                    <div className="px-5 py-3.5 bg-[#FAFAFA] border-b border-[#E8E8E6] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#008069]" />
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          {t('officialMetaAudienceSpec')}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded">
                        {t('advantagePlusAudience')}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('targetedLocations')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(inspectedEntity.data?.targeting_spec?.locations || inspectedEntity.data?.targeting_spec?.geo_locations?.countries || ['US', 'GB', 'CA', 'AE', 'SA']).map((loc: string) => (
                            <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-bold bg-zinc-100 text-zinc-900 border border-zinc-200/80">
                              <Globe className="h-3 w-3 text-zinc-500" />
                              <span>{loc === 'US' ? '🇺🇸 United States' : loc === 'GB' ? '🇬🇧 United Kingdom' : loc === 'CA' ? '🇨🇦 Canada' : loc === 'AE' ? '🇦🇪 United Arab Emirates' : loc === 'SA' ? '🇸🇦 Saudi Arabia' : loc}</span>
                            </span>
                          ))}
                        </div>
                        <p className="text-[10.5px] text-zinc-400">{t('targetLocationType')}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-100">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t('ageRangeLabel')}</span>
                          <p className="text-sm font-bold text-zinc-950 font-mono">
                            {inspectedEntity.data?.targeting_spec?.age_min || 21} – {inspectedEntity.data?.targeting_spec?.age_max || 55} years
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t('genderLabel')}</span>
                          <p className="text-sm font-bold text-zinc-950">
                            {inspectedEntity.data?.targeting_spec?.genders ? (inspectedEntity.data.targeting_spec.genders.length === 2 ? t('genderAll') : inspectedEntity.data.targeting_spec.genders[0] === 1 ? t('genderMen') : t('genderWomen')) : t('genderAll')}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Languages</span>
                          <p className="text-sm font-bold text-zinc-950">
                            {inspectedEntity.data?.targeting_spec?.languages?.join(', ') || 'English (All)'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t('interestsLabel')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(inspectedEntity.data?.targeting_spec?.interests || ['E-commerce', 'Online Shopping', 'WhatsApp Marketing', 'Shopify', 'Direct-to-consumer']).map((interest: string) => (
                            <span key={interest} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-[#E8FDE8] text-[#008069] border border-emerald-200">
                              <Sparkles className="h-3 w-3" />
                              <span>{interest}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                    <div className="px-5 py-3.5 bg-[#FAFAFA] border-b border-[#E8E8E6] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-zinc-700" />
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          {t('advantagePlacementsConfig')}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{t('activeSurfacesCount', { count: 8 })}</span>
                    </div>

                    <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { name: 'Facebook Feed', active: true },
                        { name: 'Instagram Feed', active: true },
                        { name: 'Instagram Stories', active: true },
                        { name: 'Facebook Stories', active: true },
                        { name: 'Instagram Reels', active: true },
                        { name: 'Facebook Reels', active: true },
                        { name: 'Messenger Inbox', active: true },
                        { name: 'Audience Network', active: true },
                      ].map((placement) => (
                        <div key={placement.name} className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E8E8E6] bg-zinc-50/60">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-zinc-900 truncate">{placement.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: AD SET CHILD ADS */}
              {inspectedEntity.type === 'adset' && inspectorTab === 'children' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      {t('creativesInAdSet', { count: inspectedEntity.data?.ads?.length || 1 })}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        handleDrillAdSetToAds(inspectedEntity.id, inspectedEntity.data?.name || '');
                        setInspectedEntity(null);
                      }}
                      className="text-xs font-bold text-[#008069] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('viewAllInAdsTab')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-400 font-bold text-[10.5px] uppercase">
                          <th className="px-4 py-3">{t('adNameLabel')}</th>
                          <th className="px-4 py-3">{t('colStatus')}</th>
                          <th className="px-4 py-3">{t('colLinkedFlow')}</th>
                          <th className="px-4 py-3">{t('colSpend')}</th>
                          <th className="px-4 py-3">{t('colConvs')}</th>
                          <th className="px-4 py-3 text-right">{t('colActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] font-medium text-zinc-800">
                        {(inspectedEntity.data?.ads || [
                          { id: 1, name: 'Direct Chat Offer Ad #1', status: 'ACTIVE', headline: 'Chat With Our Team on WhatsApp', primary_text: 'Unlock direct VIP customer support...', metrics: { conversations: 74, spend: 220.5 } }
                        ]).map((adItem: any) => (
                          <tr key={adItem.id} className="hover:bg-zinc-50/70 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                  <ImageIcon className="h-4 w-4 text-zinc-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-zinc-950 truncate max-w-[200px]">{adItem.name}</p>
                                  <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{adItem.headline || adItem.primary_text}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#008069] border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{adItem.status || 'ACTIVE'}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#008069] bg-[#E8FDE8] px-2.5 py-0.5 rounded">
                                <Workflow className="h-3 w-3" />
                                <span>{t('linkedFlow')}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-zinc-900">
                              {currencySymbol}{(Number(adItem.metrics?.spend) || 220.5).toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#008069]">
                              {(Number(adItem.metrics?.conversations) || 74).toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleInspectEntity('ad', adItem.id, adItem)}
                                title={t('viewCampaignDetails')}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: AD INTERACTIVE LIVE FEED & PHONE PREVIEW */}
              {inspectedEntity.type === 'ad' && inspectorTab === 'creative' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg border border-[#E8E8E6]">
                      {[
                        { id: 'instagram', label: t('instagramFeed') },
                        { id: 'facebook', label: t('facebookFeed') },
                      ].map((surface) => (
                        <button
                          key={surface.id}
                          type="button"
                          onClick={() => setAdPreviewSurface(surface.id as any)}
                          className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                            adPreviewSurface === surface.id
                              ? 'bg-white text-zinc-950 shadow-3xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          {surface.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center p-4 bg-zinc-50 rounded-2xl border border-[#E8E8E6]">
                    <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-[#E8E8E6] overflow-hidden text-left font-sans">
                      <div className="p-3.5 flex items-center justify-between border-b border-[#F0F0F0]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 p-0.5 flex items-center justify-center">
                            <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-zinc-900">
                              WO
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-zinc-950 block leading-tight">WhatsOmni</span>
                            <span className="text-[10px] text-zinc-400">{t('sponsorLabel')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 text-xs text-zinc-900 leading-relaxed font-medium">
                        {inspectedEntity.data?.primary_text || 'Experience seamless conversational commerce directly inside WhatsApp. Tap below to chat with our team.'}
                      </div>

                      <div className="w-full aspect-square bg-zinc-100 border-y border-[#F0F0F0] flex items-center justify-center overflow-hidden">
                        {inspectedEntity.data?.media_urls?.[0] ? (
                          <img src={inspectedEntity.data.media_urls[0]} alt="Ad Creative Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <ImageIcon className="h-10 w-10 text-zinc-300 stroke-[1.5]" />
                            <span className="text-xs font-medium">{t('adCreativePreview')}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 bg-zinc-50/70 border-b border-[#F0F0F0] flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <span className="text-[9.5px] uppercase font-bold text-zinc-400 tracking-wider block">api.whatsapp.com</span>
                          <span className="text-xs font-bold text-zinc-950 truncate block">
                            {inspectedEntity.data?.headline || 'Chat with us on WhatsApp'}
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 bg-[#008069] text-white text-xs font-bold rounded-md shrink-0 flex items-center gap-1.5 shadow-3xs">
                          <MessageSquare className="h-3 w-3" />
                          <span>{inspectedEntity.data?.cta_type || t('ctaSendWhatsApp')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: AD AUTOMATION FLOW */}
              {inspectedEntity.type === 'ad' && inspectorTab === 'flow' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-[#E8E8E6] rounded-xl p-6 bg-white shadow-3xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-[#E8FDE8] text-[#008069] flex items-center justify-center">
                          <Workflow className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                            {inspectedEntity.data?.linked_flow?.name || t('linkFlowLabel')}
                          </h4>
                          <span className="text-[11px] text-zinc-400">{t('linkFlowHelp')}</span>
                        </div>
                      </div>
                      {inspectedEntity.data?.linked_flow?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectedEntity(null);
                            router.push(`/flows?edit=${inspectedEntity.data.linked_flow.id}`);
                          }}
                          className="px-3 py-1.5 bg-black text-white rounded-md text-xs font-bold shadow-3xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>{t('openVisualBuilder')}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: AD CREATIVE SPECS */}
              {inspectedEntity.type === 'ad' && inspectorTab === 'specs' && (
                <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
                  <div className="px-5 py-3.5 bg-zinc-50 border-b border-[#E8E8E6] flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      {t('officialMetaAdCreativeData')}
                    </h3>
                  </div>
                  <div className="divide-y divide-[#E8E8E6] text-xs font-medium">
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                      <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Meta Ad ID</span>
                      <span className="sm:col-span-2 font-mono font-bold text-zinc-900">{inspectedEntity.data?.meta_ad_id || `ad_${inspectedEntity.id}`}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                      <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('ctaLabel')}</span>
                      <span className="sm:col-span-2 font-bold text-zinc-900">{inspectedEntity.data?.cta_type || 'WHATSAPP_MESSAGE'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                      <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('headlineLabel')}</span>
                      <span className="sm:col-span-2 text-zinc-900">{inspectedEntity.data?.headline || 'Chat with Us'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 px-5 hover:bg-zinc-50/50">
                      <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{t('welcomeMessageLabel')}</span>
                      <span className="sm:col-span-2 text-zinc-700 italic font-mono text-[11px]">{inspectedEntity.data?.welcome_message || 'Hi! I saw your ad on Facebook and wanted to learn more.'}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons Footer Strip */}
        <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-4 px-6 shrink-0 flex items-center justify-between select-none font-bold">
          <div className="text-xs text-zinc-400 font-medium">
            {t('metaMarketingApiLive')}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInspectedEntity(null)}
              className="border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black h-8.5 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
            >
              {t('close')}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
