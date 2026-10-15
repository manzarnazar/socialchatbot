/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  GitBranch,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Play,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Radio,
  Sliders,
  Calendar,
  ShoppingCart,
  LifeBuoy,
  Target,
  Send,
  Workflow,
  Lock
} from 'lucide-react';
import { PlanLockModal } from '@/components/billing/PlanLockModal';

interface ChannelItem {
  id: number;
  channel_type: string;
  name: string;
  phone_number?: string;
  is_connected: boolean;
}

interface FlowVersionItem {
  id: number;
  flow_id: number;
  version_number: number;
  is_published: boolean;
  definition?: {
    nodes?: any[];
    edges?: any[];
  };
  created_at: string;
}

interface FlowItem {
  id: number;
  name: string;
  description?: string | null;
  trigger_type: string;
  trigger_keywords?: string[] | null;
  channel_type?: string;
  is_active: boolean;
  current_published_version_id?: number | null;
  published_version?: FlowVersionItem | null;
  channels?: ChannelItem[];
  executions_count?: number;
  completed_executions_count?: number;
  versions_count?: number;
  created_at: string;
  updated_at: string;
}

interface FlowTemplateItem {
  id: string | number;
  slug?: string;
  name: string;
  category: string;
  description: string;
  trigger_type: string;
  nodes_count: number;
}

const getChannelIcon = (type: string) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('whatsapp') || normalized.includes('baileys')) return '/channels/whatsapp.webp';
  if (normalized.includes('telegram')) return '/channels/telegram.webp';
  if (normalized.includes('messenger') || normalized.includes('facebook')) return '/channels/messenger.webp';
  if (normalized.includes('instagram')) return '/channels/instagram.svg';
  if (normalized.includes('twilio') || normalized.includes('vonage') || normalized.includes('plivo') || normalized.includes('sms')) return '/channels/sms.svg';
  if (normalized.includes('email') || normalized.includes('smtp') || normalized.includes('resend')) return '/channels/email.svg';
  return '/channels/whatsapp.webp';
};

const getTriggerBadge = (type: string, t: any) => {
  switch (type) {
    case 'inbound_message':
      return { label: t('node_inbound_message_title') || 'Inbound Message', color: 'text-blue-600', icon: MessageSquare };
    case 'keyword':
      return { label: t('inboundMsgTrigger') || 'Keyword Match', color: 'text-emerald-600', icon: Target };
    case 'ecommerceCheckoutAbandoned':
      return { label: t('node_ecommerceCheckoutAbandoned_title') || 'Abandoned Cart', color: 'text-amber-600', icon: ShoppingCart };
    case 'contact_created':
      return { label: t('node_contact_created_title') || 'Contact Created', color: 'text-purple-600', icon: Layers };
    case 'deal_updated':
      return { label: t('node_deal_updated_title') || 'Deal Stage Updated', color: 'text-indigo-600', icon: Activity };
    case 'webhook_trigger':
    case 'webhook':
      return { label: t('node_webhook_trigger_title') || 'API Webhook', color: 'text-cyan-600', icon: Radio };
    default:
      return { label: t('node_inbound_message_title') || 'Inbound Message', color: 'text-zinc-600', icon: Zap };
  }
};

export default function AutomationFlowsPage() {
  const t = useTranslations('Flows');
  const tCommon = useTranslations('Common');
  const tPlanLock = useTranslations('PlanLock');
  const locale = useLocale();
  const router = useRouter();

  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [templates, setTemplates] = useState<FlowTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Plan context & Lock States
  const [userPlan, setUserPlan] = useState<any>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockedFlowInfo, setLockedFlowInfo] = useState<{ title: string; desc: string; name: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deleteConfirmFlow, setDeleteConfirmFlow] = useState<FlowItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form fields
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [meRes, flowsRes, channelsRes, templatesRes] = await Promise.all([
        fetchWithCsrf('/auth/me'),
        fetchWithCsrf('/flows'),
        fetchWithCsrf('/channels'),
        fetchWithCsrf('/flows/templates')
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUserPlan(meData.user?.tenant?.plan || null);
      }

      if (flowsRes.ok) {
        const data = await flowsRes.json();
        setFlows(data || []);
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
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data || []);
      }
    } catch (err: any) {
      toast.error((t('details.loadFailed') || 'Failed to load flows') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (flow: FlowItem) => {
    if (!flow.current_published_version_id && !flow.is_active) {
      toast.error(t('details.toggleFailed') || 'Cannot activate flow without a published version. Open the Canvas Studio and click "Publish to Live".');
      return;
    }

    try {
      const res = await fetchWithCsrf(`/flows/${flow.id}/toggle-active`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t('details.updateFailed') || 'Failed to update flow status.');
      }
      const updated = await res.json();
      setFlows((prev) => prev.map((f) => (f.id === flow.id ? { ...f, is_active: updated.is_active } : f)));
      toast.success(t('details.toggleSuccess') || (updated.is_active ? `Flow "${flow.name}" is now Active` : `Flow "${flow.name}" deactivated`));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle Create Flow
  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error(t('details.validationName') || 'Please provide a flow name.');
      return;
    }

    if (userPlan && userPlan.max_automations > 0 && flows.length >= userPlan.max_automations) {
      setLockedFlowInfo({
        title: tPlanLock('lockedFeature'),
        desc: tPlanLock('flowLimitReached', { max: userPlan.max_automations }),
        name: tPlanLock('automationFlows')
      });
      setLockModalOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchWithCsrf('/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          channel_ids: selectedChannelIds,
          channel_type: 'omnichannel'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t('details.createFailed') || 'Failed to create flow.');
      }

      const created = await res.json();
      setFlows((prev) => [created, ...prev]);
      setShowCreateModal(false);
      toast.success(t('details.createSuccess') || `Flow "${created.name}" created successfully!`);
      router.push(`/flows/${created.id}/edit`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create From Template
  const handleCreateFromTemplate = async (templateId: string | number) => {
    if (userPlan?.has_flow_templates === false) {
      setLockedFlowInfo({
        title: tPlanLock('lockedFeature'),
        desc: tPlanLock('blueprintLockedDesc'),
        name: tPlanLock('flowTemplates')
      });
      setLockModalOpen(true);
      return;
    }

    if (userPlan && userPlan.max_automations > 0 && flows.length >= userPlan.max_automations) {
      setLockedFlowInfo({
        title: tPlanLock('lockedFeature'),
        desc: tPlanLock('flowLimitReached', { max: userPlan.max_automations }),
        name: tPlanLock('automationFlows')
      });
      setLockModalOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchWithCsrf('/flows/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          channel_ids: selectedChannelIds
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to instantiate template.');
      }

      const created = await res.json();
      setFlows((prev) => [created, ...prev]);
      setShowTemplateModal(false);
      toast.success(t('details.createSuccess') || `Template deployed as "${created.name}"!`);
      router.push(`/flows/${created.id}/edit`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Duplicate Flow
  const handleDuplicateFlow = async (flowId: number) => {
    setActionLoading(true);
    try {
      const res = await fetchWithCsrf(`/flows/${flowId}/duplicate`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to duplicate flow.');
      }
      const duplicated = await res.json();
      setFlows((prev) => [duplicated, ...prev]);
      toast.success(t('details.createSuccess') || `Flow duplicated as "${duplicated.name}"`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Flow
  const handleDeleteFlow = async () => {
    if (!deleteConfirmFlow) return;
    setActionLoading(true);
    try {
      const res = await fetchWithCsrf(`/flows/${deleteConfirmFlow.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t('details.deleteFailed') || 'Failed to delete flow.');
      }
      setFlows((prev) => prev.filter((f) => f.id !== deleteConfirmFlow.id));
      toast.success(t('details.deleteSuccess') || `Flow "${deleteConfirmFlow.name}" deleted.`);
      setDeleteConfirmFlow(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter flows
  const filteredFlows = flows.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.trigger_keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTrigger = triggerFilter === 'all' || f.trigger_type === triggerFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && f.is_active) ||
      (statusFilter === 'inactive' && !f.is_active);

    return matchesSearch && matchesTrigger && matchesStatus;
  });

  const triggerOptions = [
    { value: 'all', label: t('allTriggers') || 'All Triggers' },
    { value: 'inbound_message', label: t('node_inbound_message_title') || 'Inbound Message' },
    { value: 'keyword', label: t('inboundMsgTrigger') || 'Keyword Match' },
    { value: 'ecommerceCheckoutAbandoned', label: t('node_ecommerceCheckoutAbandoned_title') || 'Abandoned Cart' },
    { value: 'contact_created', label: t('node_contact_created_title') || 'Contact Created' },
    { value: 'deal_updated', label: t('node_deal_updated_title') || 'Deal Stage Updated' },
    { value: 'webhook_trigger', label: t('node_webhook_trigger_title') || 'API Webhook' },
  ];

  const statusOptions = [
    { value: 'all', label: t('allStatus') || 'All Status' },
    { value: 'active', label: t('activeOnly') || 'Active Only' },
    { value: 'inactive', label: t('inactiveOnly') || 'Inactive Only' },
  ];

  return (
    <div className="w-full p-8 space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto">
      {/* Search and Action Header Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
        {/* Left Search / Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search flows by name, keywords...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
            />
          </div>

          <DropdownSelect
            options={triggerOptions}
            value={triggerFilter}
            onChange={(val) => setTriggerFilter(val)}
            placeholder={t('allTriggers') || 'All Triggers'}
            className="w-auto min-w-[145px]"
          />

          <DropdownSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            placeholder={t('allStatus') || 'All Status'}
            className="w-auto min-w-[130px]"
          />

          <button
            onClick={loadData}
            title={t('refreshFlows') || 'Refresh Flows'}
            className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#4AE54A]" />
            <span>{t('templates')}</span>
          </button>
          <button
            onClick={() => {
              if (userPlan && userPlan.max_automations > 0 && flows.length >= userPlan.max_automations) {
                setLockedFlowInfo({
                  title: tPlanLock('lockedFeature'),
                  desc: tPlanLock('flowLimitReached', { max: userPlan.max_automations }),
                  name: tPlanLock('automationFlows')
                });
                setLockModalOpen(true);
                return;
              }
              setNewName('');
              setNewDescription('');
              setSelectedChannelIds([]);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('createFlow')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Table Area */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader message={t('loadingFlows') || 'Loading Automation Flows...'} />
        </div>
      ) : filteredFlows.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-row-fade shadow-3xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">
            {searchQuery || triggerFilter !== 'all' || statusFilter !== 'all'
              ? t('noMatchingFlows')
              : t('noFlowsCreated')}
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">
            {searchQuery || triggerFilter !== 'all' || statusFilter !== 'all'
              ? t('adjustSearchCriteria')
              : t('noFlowsDesc')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#4AE54A]" />
              <span>{t('browseTemplates')}</span>
            </button>
            <button
              onClick={() => {
                setNewName('');
                setNewDescription('');
                setSelectedChannelIds([]);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('createFlow')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Data Table (Section 24.10 Standard) */
        <div className="space-y-4">
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5 w-60 max-w-[240px]">{t('tableFlowName')}</th>
                    <th className="px-6 py-3.5">{t('tableTriggerType')}</th>
                    <th className="px-6 py-3.5">{t('tableChannels')}</th>
                    <th className="px-6 py-3.5">{t('tableExecutions')}</th>
                    <th className="px-6 py-3.5">{t('flowStatus')}</th>
                    <th className="px-6 py-3.5 text-right">{tCommon('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {filteredFlows.map((flow) => {
                    const triggerInfo = getTriggerBadge(flow.trigger_type, t);
                    const TriggerIcon = triggerInfo.icon;
                    const hasPublished = Boolean(flow.current_published_version_id);
                    const totalRuns = flow.executions_count || 0;
                    const completedRuns = flow.completed_executions_count || 0;
                    const completionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

                    return (
                      <tr
                        key={flow.id}
                        className="hover:bg-[#FAFAFA]/70 transition-colors"
                      >
                        {/* Flow Name & Description (Truncated with Ellipsis) */}
                        <td className="px-6 py-4 w-60 max-w-[240px]">
                          <div className="flex flex-col text-left overflow-hidden">
                            <Link
                              href={`/flows/${flow.id}/edit`}
                              title={flow.name}
                              className="font-bold text-zinc-955 text-xs hover:underline inline-flex items-center gap-1.5 group cursor-pointer truncate max-w-full"
                            >
                              <span className="truncate">{flow.name}</span>
                              <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                            {flow.description && (
                              <span title={flow.description} className="text-[10px] text-zinc-400 font-semibold mt-0.5 truncate block max-w-full">
                                {flow.description}
                              </span>
                            )}
                            {flow.trigger_keywords && flow.trigger_keywords.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 truncate max-w-full text-zinc-500">
                                <span className="text-[9px] text-zinc-400 font-bold uppercase shrink-0">KW:</span>
                                <span className="text-[9px] font-mono font-semibold text-zinc-600 truncate">
                                  {flow.trigger_keywords.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Trigger Type (Colored icon & colored text only, no chip layout) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1.5 font-bold text-xs ${triggerInfo.color}`}>
                            <TriggerIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{triggerInfo.label}</span>
                          </div>
                        </td>

                        {/* Channels (Icon only) */}
                        <td className="px-6 py-4">
                          {flow.channels && flow.channels.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {flow.channels.map((ch) => (
                                <img
                                  key={ch.id}
                                  src={getChannelIcon(ch.channel_type)}
                                  alt={ch.name || ch.channel_type}
                                  title={ch.name || ch.channel_type}
                                  className="h-4.5 w-4.5 object-contain shrink-0"
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">
                              {t('allChannels')}
                            </span>
                          )}
                        </td>

                        {/* Executions Stats */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-955 text-xs font-mono">
                              {totalRuns > 0 ? t('runCount', { count: totalRuns }) : t('noRunsYet')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                              {totalRuns > 0 ? t('completedPercent', { percent: completionRate }) : t('noRunsYet')}
                            </span>
                          </div>
                        </td>

                        {/* Status (Active / Inactive / Draft with Switch) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={flow.is_active}
                              onClick={() => handleToggleActive(flow)}
                              title={flow.is_active 
                                ? (t.has('deactivateFlowTitle') ? t('deactivateFlowTitle') : 'Deactivate flow') 
                                : (t.has('activateFlowTitle') ? t('activateFlowTitle') : 'Activate flow')}
                              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 ${
                                flow.is_active ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                              }`}
                            >
                              <span
                                className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                                  flow.is_active ? 'translate-x-3.5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              flow.is_active 
                                ? 'text-emerald-700 font-extrabold' 
                                : hasPublished 
                                  ? 'text-zinc-500' 
                                  : 'text-amber-600'
                            }`}>
                              {flow.is_active ? t('activeStatus') : (hasPublished ? t('inactiveStatus') : t('draftStatus'))}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/flows/${flow.id}/edit`}
                              className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 transition-all"
                              title={t('editFlow')}
                            >
                              <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                              <span>{t('editFlow')}</span>
                            </Link>
                            <button
                              onClick={() => handleDuplicateFlow(flow.id)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              title={t('duplicateFlow')}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmFlow(flow)}
                              className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                              title={t('deleteFlow')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between text-xs text-zinc-500 select-none px-1">
            <span>
              {t('showingFlows', { count: filteredFlows.length, total: flows.length })}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              {t('connectedChannels', { count: channels.length })}
            </span>
          </div>
        </div>
      )}

      {/* CREATE FLOW MODAL */}
      {mounted &&
        showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
          >
            <div
              className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section (Connected End-to-End Divider) */}
              <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                    <Workflow className="h-4 w-4 text-[#4AE54A]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                      {t('createFlowModalTitle')}
                    </h2>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {t('createFlowModalSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label={tCommon('close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateFlow} className="space-y-4 pt-4">
                {/* Flow Name */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('flowNamePlaceholder') || 'e.g. Sales Pipeline Qualifier'}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowDescription')}
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder') || 'Brief description of what this workflow accomplishes...'}
                    className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                  />
                </div>

                {/* Channel Attachments */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                    {t('attachedChannels')}
                  </label>
                  {channels.length === 0 ? (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md text-xs text-zinc-500 text-center">
                      {t('noChannelsConnected')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {channels.map((ch) => {
                        const isSelected = selectedChannelIds.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedChannelIds(selectedChannelIds.filter((id) => id !== ch.id));
                              } else {
                                setSelectedChannelIds([...selectedChannelIds, ch.id]);
                              }
                            }}
                            className={`flex items-center gap-2 p-2 rounded-md border text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'border-zinc-950 bg-zinc-50 font-bold text-zinc-950'
                                : 'border-[#E8E8E6] bg-white text-zinc-600 hover:border-zinc-300'
                            }`}
                          >
                            <span className="h-4 w-4 rounded border flex items-center justify-center text-[10px] shrink-0 bg-white">
                              {isSelected && <Check className="h-3 w-3 text-black" />}
                            </span>
                            <span className="truncate">{ch.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Action Strip */}
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !newName.trim()}
                    className="bg-black text-white hover:bg-neutral-800 h-9 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{t('createAndOpenCanvas')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* TEMPLATE LIBRARY MODAL (Section 24.3 Dialog Standard) */}
      {mounted &&
        showTemplateModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTemplateModal(false);
            }}
          >
            <div
              className="bg-white border border-[#E8E8E6] rounded-xl max-w-4xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section (Connected End-to-End Divider) */}
              <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-[#4AE54A]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                      {t('templateLibraryTitle')}
                    </h2>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {t('templateLibrarySubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label={tCommon('close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Templates Grid or Empty State */}
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 overflow-y-auto pr-1 flex-1">
                  {templates.map((tpl) => {
                    const isLocked = userPlan?.has_flow_templates === false;
                    return (
                      <div
                        key={tpl.id}
                        className={`border rounded-xl p-4 bg-white transition-all shadow-3xs flex flex-col justify-between group ${
                          isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6] hover:border-zinc-950'
                        }`}
                      >
                        <div>
                          {/* Category */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                              {tpl.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-xs font-black text-zinc-950 mb-1 group-hover:text-black">
                            {tpl.name}
                          </h3>

                          {/* Description */}
                          <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                            {tpl.description}
                          </p>
                        </div>

                        {/* Footer & CTA */}
                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-semibold">
                            {tPlanLock('interactiveSteps', { count: tpl.nodes_count })}
                          </span>
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLockedFlowInfo({
                                  title: tPlanLock('lockedFeature'),
                                  desc: tPlanLock('blueprintLockedDesc'),
                                  name: tpl.name
                                });
                                setLockModalOpen(true);
                              }}
                              className="bg-zinc-955 hover:bg-black text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Lock className="h-3 w-3" />
                              <span>{tPlanLock('upgradeToUnlock')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleCreateFromTemplate(tpl.id)}
                              className="bg-zinc-950 hover:bg-zinc-900 text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3 fill-current" />
                              )}
                              <span>{t('useTemplate')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : userPlan?.has_flow_templates === false ? (
                <div className="py-12 px-6 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 border border-[#E8E8E6] flex items-center justify-center text-zinc-500">
                    <Lock className="h-5 w-5 text-zinc-950" />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h3 className="text-sm font-bold text-zinc-950">{tPlanLock('lockedFeature')}</h3>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                      {tPlanLock('blueprintLockedDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setLockedFlowInfo({
                        title: tPlanLock('lockedFeature'),
                        desc: tPlanLock('blueprintLockedDesc'),
                        name: t('templateLibraryTitle')
                      });
                      setLockModalOpen(true);
                    }}
                    className="h-8.5 px-4 bg-zinc-955 hover:bg-black text-white text-xs font-semibold rounded-[6px] shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{tPlanLock('upgradeToUnlock')}</span>
                  </button>
                </div>
              ) : (
                <div className="py-12 px-6 text-center space-y-3 flex-1 flex flex-col items-center justify-center text-zinc-400">
                  <Sparkles className="h-8 w-8 text-zinc-300" />
                  <p className="text-xs font-medium">{t('noTemplatesAvailable')}</p>
                </div>
              )}

              {/* Footer Action Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none shrink-0">
                <span className="text-[11px] text-zinc-500">
                  {t('selectTemplateDesc')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('close')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRMATION MODAL (Section 24.3 Dialog Standard) */}
      {mounted &&
        deleteConfirmFlow &&
        createPortal(
          <div
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteConfirmFlow(null);
            }}
          >
            <div
              className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section (Connected End-to-End Divider) */}
              <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-black uppercase tracking-wider">
                      {t('deleteFlowModalTitle')}
                    </h2>
                    <p className="text-[10px] text-zinc-500">
                      {t('deleteFlowModalSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmFlow(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label={tCommon('close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 pt-4 text-xs text-zinc-600 leading-relaxed">
                {t('deleteFlowModalBody', { name: deleteConfirmFlow.name })}
              </div>

              {/* Footer Action Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmFlow(null)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeleteFlow}
                  className="bg-red-600 hover:bg-red-750 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span>{t('deleteFlowBtn')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Plan Lock Modal */}
      <PlanLockModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        title={lockedFlowInfo?.title}
        description={lockedFlowInfo?.desc}
        featureName={lockedFlowInfo?.name}
        planName={userPlan?.name}
      />

    </div>
  );
}
