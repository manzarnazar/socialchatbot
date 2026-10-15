'use client';

import React, { useEffect, useState, useTransition, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  MessageSquare,
  Mail,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  User,
  Users,
  CheckCheck,
  Eye,
  Activity,
  Send,
  Sparkles,
  ExternalLink,
  Globe,
  Workflow,
  Edit3,
  Upload,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Smartphone,
  X,
  FileText,
  MousePointerClick,
  Pause,
  Play,
  StopCircle,
  ShieldCheck
} from 'lucide-react';
import { useHeaderStore } from '@/store/useHeaderStore';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
}

interface MessageTemplate {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface FlowItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
}

interface Campaign {
  id: number;
  tenant_id: number;
  name: string;
  channel_connection_id: number;
  audience_filter: {
    type: 'all' | 'lifecycle_stage' | 'tags' | 'contacts';
    value: string | null;
  };
  source_type: 'template' | 'compose' | 'custom' | 'agent' | 'flow';
  message_template_id: number | null;
  custom_subject?: string | null;
  custom_message?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  cta_button_text?: string | null;
  cta_button_url?: string | null;
  ai_agent_id?: number | null;
  flow_id?: number | null;
  schedule_type: 'immediate' | 'scheduled';
  scheduled_at: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'paused' | 'cancelled';
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  error_log: string | null;
  created_at: string;
  channel_connection?: ChannelConnection;
  message_template?: MessageTemplate;
  flow?: FlowItem;
}

interface CampaignDispatch {
  id: number;
  campaign_id: number;
  contact_id: number;
  message_id: number | null;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  error_message: string | null;
  created_at: string;
  contact?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
}
const getChannelLogo = (channelType: string) => {
  const normalized = channelType.toLowerCase();
  if (normalized.includes('whatsapp')) return '/channels/whatsapp.webp';
  if (normalized.includes('telegram')) return '/channels/telegram.webp';
  if (normalized.includes('messenger') || normalized.includes('facebook')) return '/channels/messenger.webp';
  if (normalized.includes('instagram')) return '/channels/instagram.svg';
  if (normalized.includes('twilio')) return '/channels/twilio.svg';
  if (normalized.includes('vonage')) return '/channels/vonage.webp';
  if (normalized.includes('plivo')) return '/channels/plivo.svg';
  return null;
};

export default function CampaignsPage() {
  const t = useTranslations('Campaigns');
  const tContacts = useTranslations('Contacts');
  const [mounted, setMounted] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Navigation / View State
  const [view, setView] = useState<'list' | 'create' | 'show'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Campaign Details State
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [dispatches, setDispatches] = useState<CampaignDispatch[]>([]);
  const [dispatchesPage, setDispatchesPage] = useState(1);
  const [dispatchesLastPage, setDispatchesLastPage] = useState(1);
  const [dispatchesTotal, setDispatchesTotal] = useState(0);

  // Form Field States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [channelConnectionId, setChannelConnectionId] = useState('');
  const [audienceType, setAudienceType] = useState<'all' | 'lifecycle_stage' | 'tags' | 'contacts'>('all');
  const [audienceValue, setAudienceValue] = useState('');
  const [sourceType, setSourceType] = useState<'template' | 'compose'>('template');
  const [messageTemplateId, setMessageTemplateId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [ctaButtonText, setCtaButtonText] = useState('');
  const [ctaButtonUrl, setCtaButtonUrl] = useState('');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledAt, setScheduledAt] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const variableDropdownRef = useRef<HTMLDivElement | null>(null);
  const [variableDropdownOpen, setVariableDropdownOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');

  // Contacts Selector States
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);

  // Dialog Portal Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Campaign Action Loading States (Pause, Resume, Cancel)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const { setCustomHeader } = useHeaderStore();

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (variableDropdownRef.current && !variableDropdownRef.current.contains(e.target as Node)) {
        setVariableDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, channelsRes, templatesRes, flowsRes] = await Promise.all([
        fetchWithCsrf('/campaigns'),
        fetchWithCsrf('/channels'),
        fetchWithCsrf('/templates'),
        fetchWithCsrf('/flows')
      ]);

      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (flowsRes.ok) setFlows(await flowsRes.json());
      if (channelsRes.ok) {
        const rawChannels = await channelsRes.json();
        const filtered = (rawChannels || []).filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const type = (c.channel_type || '').toLowerCase();
          return !name.includes('mock') && !name.includes('simulated') && type !== 'mock' && type !== 'tiktok' && type !== 'linkedin';
        });
        setChannels(filtered);
      }
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch {
      toast.error(t('details.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignDetails = async (id: number, page = 1) => {
    try {
      const res = await fetchWithCsrf(`/campaigns/${id}?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCampaign(data.campaign);
        setDispatches(data.dispatches.data);
        setDispatchesPage(data.dispatches.current_page);
        setDispatchesLastPage(data.dispatches.last_page);
        setDispatchesTotal(data.dispatches.total);
      } else {
        toast.error(t('details.failedToLoadStats'));
      }
    } catch {
      toast.error(t('details.networkErrorDetails'));
    }
  };

  const loadContactsList = async () => {
    try {
      const res = await fetchWithCsrf('/contacts');
      if (res.ok) {
        const data = await res.json();
        setAllContacts(data.contacts || []);
      }
    } catch {
      toast.error(t('details.failedToLoadContacts'));
    }
  };

  // Auto-refresh when viewing an active campaign that is broadcasting
  useEffect(() => {
    if (view !== 'show' || !activeCampaign || (activeCampaign.status !== 'sending' && activeCampaign.status !== 'scheduled')) {
      return;
    }
    const interval = setInterval(() => {
      loadCampaignDetails(activeCampaign.id, dispatchesPage);
    }, 3000);
    return () => clearInterval(interval);
  }, [view, activeCampaign?.id, activeCampaign?.status, dispatchesPage]);

  // Sync layout header overriding
  useEffect(() => {
    if (!mounted) return;

    if (view === 'list') {
      setCustomHeader(null);
    } else if (view === 'create') {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCloseCreateForm()}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {t('wizard.title')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCloseCreateForm()}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => handleSaveCampaign()}
              disabled={isPending}
              className="bg-[#0A0A0A] text-white hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>{t('wizard.save')}</span>
            </button>
          </div>
        </header>
      );
    } else if (view === 'show') {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {t('reportHeader', { name: activeCampaign?.name || t('loadingCampaign') })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeCampaign && loadCampaignDetails(activeCampaign.id, dispatchesPage)}
              className="flex items-center justify-center p-2 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
              title={t('refreshStats')}
            >
              <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
            </button>
            <button
              onClick={() => setView('list')}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('backToList')}
            </button>
          </div>
        </header>
      );
    }

    return () => setCustomHeader(null);
  }, [
    view,
    activeCampaign,
    isPending,
    mounted,
    channels,
    templates,
    dispatchesPage,
    name,
    channelConnectionId,
    audienceType,
    audienceValue,
    sourceType,
    messageTemplateId,
    customSubject,
    customMessage,
    mediaUrl,
    mediaType,
    mediaUploading,
    ctaButtonText,
    ctaButtonUrl,
    scheduleType,
    scheduledAt,
    selectedContactIds,
    currentStep
  ]);

  const activeChannel = channels.find(ch => ch.id.toString() === channelConnectionId);

  // Filter templates list by connection channel type compatibility
  const compatibleTemplates = templates.filter(t => {
    if (!activeChannel) return true;
    if (activeChannel.channel_type === 'email') return t.type === 'email';
    return t.type === 'whatsapp';
  });

  // Step Completion Trackers (Only marked complete if explicitly passed and valid)
  const isStep1Complete = completedSteps.includes(1) && Boolean(name.trim() && channelConnectionId);
  const isStep2Complete = completedSteps.includes(2) && Boolean(
    audienceType === 'all' ||
    (audienceType === 'contacts' && selectedContactIds.length > 0) ||
    ((audienceType === 'lifecycle_stage' || audienceType === 'tags') && audienceValue.trim())
  );
  const isStep3Complete = completedSteps.includes(3) && Boolean(
    (sourceType === 'template' && messageTemplateId) ||
    (sourceType === 'compose' && customMessage.trim() && (activeChannel?.channel_type !== 'email' || customSubject.trim()))
  );
  const isStep4Complete = completedSteps.includes(4) && Boolean(
    scheduleType === 'immediate' || (scheduleType === 'scheduled' && scheduledAt)
  );

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error(t('wizard.emptyName') || 'Please enter a campaign name.');
        return false;
      }
      if (!channelConnectionId) {
        toast.error(t('wizard.emptyChannel') || 'Please select a channel connection.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (audienceType === 'contacts' && selectedContactIds.length === 0) {
        toast.error(t('wizard.emptyContact') || 'Please select at least one contact.');
        return false;
      }
      if (audienceType !== 'all' && audienceType !== 'contacts' && !audienceValue.trim()) {
        toast.error(t('wizard.emptyLifecycle') || 'Please specify audience filter value.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (sourceType === 'template' && !messageTemplateId) {
        toast.error(t('wizard.emptyTemplate') || 'Please select a valid message template.');
        return false;
      }
      if (sourceType === 'compose' && !customMessage.trim()) {
        toast.error(t('wizard.emptyCustomMessage') || 'Please enter your message content.');
        return false;
      }
      if (activeChannel?.channel_type === 'email' && sourceType === 'compose' && !customSubject.trim()) {
        toast.error(t('wizard.emptySubjectEmail') || 'Email Subject is required for email campaigns.');
        return false;
      }
      return true;
    }
    return true;
  };

  const navigateToStep = (targetStep: number) => {
    if (targetStep === currentStep) return;
    
    // If going backward, always allow review
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // If moving forward, sequentially validate every preceding step
    for (let s = 1; s < targetStep; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
      setCompletedSteps(prev => Array.from(new Set([...prev, s])));
    }

    setCurrentStep(targetStep);
  };

  const handleStepAdvance = (step: number) => {
    navigateToStep(step + 1);
  };

  // Form management
  const handleOpenCreateForm = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setName('');
    setChannelConnectionId(channels[0]?.id.toString() || '');
    setAudienceType('all');
    setAudienceValue('');
    setSourceType('template');
    setCustomSubject('');
    setCustomMessage('');
    setMediaUrl('');
    setMediaType('image');
    setMediaUploading(false);
    setCtaButtonText('');
    setCtaButtonUrl('');
    setScheduleType('immediate');
    setScheduledAt('');

    // Pre-bind template based on resolved types
    const boundTemplates = templates.filter(t => t.status.toLowerCase() === 'approved' || t.type === 'email');
    setMessageTemplateId(boundTemplates[0]?.id.toString() || '');
    setSelectedContactIds([]);
    setContactSearch('');
    loadContactsList();

    setView('create');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchWithCsrf('/campaigns/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMediaUrl(data.url);
        setMediaType(data.media_type || 'image');
        toast.success(t('wizard.mediaUploadSuccess'));
      } else {
        const err = await res.json();
        toast.error(err.message || t('wizard.mediaUploadFailed'));
      }
    } catch {
      toast.error(t('wizard.mediaUploadNetworkError'));
    } finally {
      setMediaUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Dynamic extraction of actual custom attributes present on contacts (Safeguard)
  const availableCustomKeys = useMemo(() => {
    const keys = new Set<string>();
    const targetList = (audienceType === 'contacts' && selectedContactIds.length > 0)
      ? allContacts.filter(c => selectedContactIds.includes(c.id))
      : allContacts;

    targetList.forEach((c) => {
      if (c.custom_fields && typeof c.custom_fields === 'object' && !Array.isArray(c.custom_fields)) {
        Object.keys(c.custom_fields).forEach((k) => {
          const val = c.custom_fields[k];
          if (val !== undefined && val !== null && val !== '') {
            keys.add(k);
          }
        });
      }
    });
    return Array.from(keys);
  }, [allContacts, audienceType, selectedContactIds]);

  // Safeguard: Compute strictly verified and available contact variables
  const { quickVariables, contactVariableGroups, totalAvailableVariablesCount } = useMemo(() => {
    const targetList = (audienceType === 'contacts' && selectedContactIds.length > 0)
      ? allContacts.filter(c => selectedContactIds.includes(c.id))
      : allContacts;

    const hasContacts = targetList.length > 0;
    const hasFirstName = !hasContacts || targetList.some(c => !!c.first_name);
    const hasLastName = !hasContacts || targetList.some(c => !!c.last_name);
    const hasEmail = !hasContacts || targetList.some(c => !!c.email);
    const hasPhone = !hasContacts || targetList.some(c => !!c.phone);
    const hasLifecycle = !hasContacts || targetList.some(c => !!c.lifecycle_stage);
    const hasTags = !hasContacts || targetList.some(c => Array.isArray(c.tags) && c.tags.length > 0);

    const firstContactWithFirst = targetList.find(c => !!c.first_name);
    const firstContactWithLast = targetList.find(c => !!c.last_name);
    const firstContactWithEmail = targetList.find(c => !!c.email);
    const firstContactWithPhone = targetList.find(c => !!c.phone);
    const firstContactWithLifecycle = targetList.find(c => !!c.lifecycle_stage);
    const firstContactWithTags = targetList.find(c => Array.isArray(c.tags) && c.tags.length > 0);
    const primarySample = targetList[0] || null;

    // 1. Build Quick Variables List (safeguard: only present data)
    const quick: { label: string; tag: string }[] = [];
    if (hasFirstName) quick.push({ label: '+ First Name', tag: '{{ contact.first_name }}' });
    if (hasLastName) quick.push({ label: '+ Last Name', tag: '{{ contact.last_name }}' });
    if (hasFirstName || hasLastName) quick.push({ label: '+ Full Name', tag: '{{ contact.name }}' });

    if (activeChannel?.channel_type === 'email') {
      if (hasEmail) quick.push({ label: '+ Email', tag: '{{ contact.email }}' });
    } else {
      if (hasPhone) quick.push({ label: '+ Phone', tag: '{{ contact.phone }}' });
    }

    if (hasLifecycle) quick.push({ label: '+ Lifecycle', tag: '{{ contact.lifecycle_stage }}' });
    if (hasTags) quick.push({ label: '+ Tags', tag: '{{ contact.tags }}' });

    // Include up to 2 real custom attributes in quick bar if available
    availableCustomKeys.slice(0, 2).forEach((k) => {
      const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      quick.push({ label: `+ ${formatted}`, tag: `{{ contact.custom_fields.${k} }}` });
    });

    // 2. Build Popover Variable Groups (safeguard: only verified available data)
    const identityItems = [];
    if (hasFirstName) {
      identityItems.push({ label: 'First Name', tag: '{{ contact.first_name }}', example: firstContactWithFirst?.first_name || 'John' });
    }
    if (hasLastName) {
      identityItems.push({ label: 'Last Name', tag: '{{ contact.last_name }}', example: firstContactWithLast?.last_name || 'Doe' });
    }
    if (hasFirstName || hasLastName) {
      const sampleFullName = (primarySample?.first_name || primarySample?.last_name)
        ? `${primarySample.first_name || ''} ${primarySample.last_name || ''}`.trim()
        : 'John Doe';
      identityItems.push({ label: 'Full Name', tag: '{{ contact.name }}', example: sampleFullName });
    }
    identityItems.push({ label: 'Contact ID', tag: '{{ contact.id }}', example: primarySample?.id ? String(primarySample.id) : '1042' });
    identityItems.push({ 
      label: 'Join Date', 
      tag: '{{ contact.created_at }}', 
      example: primarySample?.created_at ? new Date(primarySample.created_at).toISOString().slice(0, 10) : '2026-08-27' 
    });

    const contactInfoItems = [];
    if (activeChannel?.channel_type === 'email' || hasEmail) {
      contactInfoItems.push({ label: 'Email Address', tag: '{{ contact.email }}', example: firstContactWithEmail?.email || 'john@example.com' });
    }
    if (activeChannel?.channel_type !== 'email' || hasPhone) {
      contactInfoItems.push({ label: 'Phone Number', tag: '{{ contact.phone }}', example: firstContactWithPhone?.phone || '+1 555-0199' });
    }

    const crmItems = [];
    if (hasLifecycle) {
      crmItems.push({ label: 'Lifecycle Stage', tag: '{{ contact.lifecycle_stage }}', example: firstContactWithLifecycle?.lifecycle_stage || 'Lead' });
    }
    if (hasTags) {
      crmItems.push({ 
        label: 'Assigned Tags', 
        tag: '{{ contact.tags }}', 
        example: (firstContactWithTags?.tags || ['VIP']).join(', ') 
      });
    }

    const groups: { group: string; items: { label: string; tag: string; example: string }[] }[] = [
      { group: 'Personal Identity', items: identityItems },
      ...(contactInfoItems.length > 0 ? [{ group: 'Contact Information', items: contactInfoItems }] : []),
      ...(crmItems.length > 0 ? [{ group: 'CRM & Pipeline', items: crmItems }] : []),
    ];

    // Safeguard: ONLY show custom attributes that actually exist in contacts
    if (availableCustomKeys.length > 0) {
      const customItems = availableCustomKeys.map((key) => {
        const sampleVal = targetList.find(c => c.custom_fields && c.custom_fields[key])?.custom_fields[key] || 'Sample';
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return {
          label: formattedKey,
          tag: `{{ contact.custom_fields.${key} }}`,
          example: String(sampleVal)
        };
      });
      groups.push({ group: 'Available Custom Attributes', items: customItems });
    }

    const totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);

    return {
      quickVariables: quick,
      contactVariableGroups: groups,
      totalAvailableVariablesCount: totalCount
    };
  }, [allContacts, audienceType, selectedContactIds, activeChannel, availableCustomKeys]);

  const handleApplyFormatting = (wrapper: string) => {
    if (messageTextareaRef.current) {
      const textarea = messageTextareaRef.current;
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const selected = customMessage.substring(start, end);
      const textToWrap = selected || 'text';
      const before = customMessage.substring(0, start);
      const after = customMessage.substring(end);
      const wrapped = `${wrapper}${textToWrap}${wrapper}`;
      setCustomMessage(before + wrapped + after);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, start + wrapper.length + textToWrap.length);
      }, 10);
    } else {
      setCustomMessage((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + wrapper + 'text' + wrapper + ' ');
    }
  };

  const handleInsertTag = (tag: string) => {
    if (messageTextareaRef.current) {
      const textarea = messageTextareaRef.current;
      const start = textarea.selectionStart ?? customMessage.length;
      const end = textarea.selectionEnd ?? customMessage.length;
      const before = customMessage.substring(0, start);
      const after = customMessage.substring(end);
      const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
      const needSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');
      const insertion = (needSpaceBefore ? ' ' : '') + tag + (needSpaceAfter ? ' ' : ' ');
      const newText = before + insertion + after;
      setCustomMessage(newText);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    } else {
      setCustomMessage((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag + ' ');
    }
  };

  const interpolateMessagePreview = (text: string) => {
    if (!text) return '';
    const targetList = (audienceType === 'contacts' && selectedContactIds.length > 0)
      ? allContacts.filter(c => selectedContactIds.includes(c.id))
      : allContacts;
    const sample = targetList[0] || null;

    let result = text;
    const sampleFirstName = sample?.first_name || 'John';
    const sampleLastName = sample?.last_name || 'Doe';
    const sampleFullName = (sample?.first_name || sample?.last_name)
      ? `${sample.first_name || ''} ${sample.last_name || ''}`.trim()
      : 'John Doe';
    const sampleEmail = sample?.email || 'john@example.com';
    const samplePhone = sample?.phone || '+1 555-0199';
    const sampleLifecycle = sample?.lifecycle_stage || 'Lead';
    const sampleTags = Array.isArray(sample?.tags) && sample.tags.length > 0
      ? sample.tags.join(', ')
      : 'VIP, Customer';
    const sampleId = sample?.id ? String(sample.id) : '1042';
    const sampleDate = sample?.created_at ? new Date(sample.created_at).toISOString().slice(0, 10) : '2026-08-27';

    result = result
      .replace(/\{\{\s*contact\.first_name\s*\}\}/g, sampleFirstName)
      .replace(/\{\{\s*contact\.last_name\s*\}\}/g, sampleLastName)
      .replace(/\{\{\s*contact\.name\s*\}\}/g, sampleFullName)
      .replace(/\{\{\s*contact\.email\s*\}\}/g, sampleEmail)
      .replace(/\{\{\s*contact\.phone\s*\}\}/g, samplePhone)
      .replace(/\{\{\s*contact\.lifecycle_stage\s*\}\}/g, sampleLifecycle)
      .replace(/\{\{\s*contact\.tags\s*\}\}/g, sampleTags)
      .replace(/\{\{\s*contact\.id\s*\}\}/g, sampleId)
      .replace(/\{\{\s*contact\.created_at\s*\}\}/g, sampleDate)
      .replace(/\{\{\s*1\s*\}\}/g, sampleFirstName);

    result = result.replace(/\{\{\s*contact\.custom_fields\.([a-zA-Z0-9_\-]+)\s*\}\}/g, (match, key) => {
      if (sample?.custom_fields && sample.custom_fields[key] !== undefined && sample.custom_fields[key] !== null) {
        return String(sample.custom_fields[key]);
      }
      return `[${key.replace(/_/g, ' ')}]`;
    });

    return result;
  };

  const handleCloseCreateForm = () => {
    setView('list');
  };

  const handleSaveCampaign = () => {
    if (!name.trim()) {
      toast.error(t('wizard.emptyName'));
      return;
    }
    if (!channelConnectionId) {
      toast.error(t('wizard.emptyChannel'));
      return;
    }
    if (audienceType === 'contacts' && selectedContactIds.length === 0) {
      toast.error(t('wizard.emptyContact'));
      return;
    }
    if (audienceType !== 'all' && audienceType !== 'contacts' && !audienceValue.trim()) {
      toast.error(t('wizard.emptyLifecycle'));
      return;
    }
    if (sourceType === 'template' && !messageTemplateId) {
      toast.error(t('wizard.emptyTemplate'));
      return;
    }
    if (sourceType === 'compose' && !customMessage.trim()) {
      toast.error(t('wizard.emptyCustomMessage') || 'Please enter your message content.');
      return;
    }
    if (activeChannel?.channel_type === 'email' && sourceType === 'compose' && !customSubject.trim()) {
      toast.error(t('wizard.emptySubjectEmail') || 'Email Subject is required for email campaigns.');
      return;
    }
    if (scheduleType === 'scheduled' && !scheduledAt) {
      toast.error(t('wizard.emptyDate'));
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name,
          channel_connection_id: parseInt(channelConnectionId),
          audience_filter: {
            type: audienceType,
            value: audienceType === 'contacts' ? selectedContactIds.join(',') : (audienceType === 'all' ? null : audienceValue)
          },
          source_type: sourceType,
          message_template_id: sourceType === 'template' ? parseInt(messageTemplateId) : null,
          custom_subject: sourceType === 'compose' ? (customSubject.trim() || null) : null,
          custom_message: sourceType === 'compose' ? customMessage.trim() : null,
          media_url: sourceType === 'compose' ? (mediaUrl.trim() || null) : null,
          media_type: sourceType === 'compose' && mediaUrl.trim() ? mediaType : null,
          cta_button_text: sourceType === 'compose' ? (ctaButtonText.trim() || null) : null,
          cta_button_url: sourceType === 'compose' ? (ctaButtonUrl.trim() || null) : null,
          schedule_type: scheduleType,
          scheduled_at: scheduleType === 'scheduled' ? scheduledAt : null,
        };

        const res = await fetchWithCsrf('/campaigns', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          toast.success(t('wizard.success'));
          setView('list');
          loadAllData();
        } else {
          const err = await res.json();
          toast.error(err.message || t('wizard.saveFailed'));
        }
      } catch {
        toast.error(t('wizard.networkError'));
      }
    });
  };

  // Delete handlers
  const handleOpenDelete = (id: number) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteCampaign = () => {
    if (!deleteTargetId) return;

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/campaigns/${deleteTargetId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success(t('wizard.deleteSuccess'));
          loadAllData();
          if (view === 'show' && activeCampaign?.id === deleteTargetId) {
            setView('list');
          }
        } else {
          toast.error(t('wizard.deleteFailed'));
        }
      } catch {
        toast.error(t('wizard.deleteNetworkError'));
      } finally {
        setDeleteConfirmOpen(false);
        setDeleteTargetId(null);
      }
    });
  };

  const handleOpenShow = (campaign: Campaign) => {
    setView('show');
    loadCampaignDetails(campaign.id, 1);
  };

  const handlePauseCampaign = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await fetchWithCsrf(`/campaigns/${id}/pause`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toastPauseSuccess'));
        loadAllData();
        if (activeCampaign && activeCampaign.id === id) {
          loadCampaignDetails(id, dispatchesPage);
        }
      } else {
        toast.error(data.error || t('toastPauseFailed'));
      }
    } catch {
      toast.error(t('toastPauseNetworkError'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeCampaign = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await fetchWithCsrf(`/campaigns/${id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toastResumeSuccess'));
        loadAllData();
        if (activeCampaign && activeCampaign.id === id) {
          loadCampaignDetails(id, dispatchesPage);
        }
      } else {
        toast.error(data.error || t('toastResumeFailed'));
      }
    } catch {
      toast.error(t('toastResumeNetworkError'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelCampaign = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await fetchWithCsrf(`/campaigns/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toastCancelSuccess'));
        loadAllData();
        if (activeCampaign && activeCampaign.id === id) {
          loadCampaignDetails(id, dispatchesPage);
        }
      } else {
        toast.error(data.error || t('toastCancelFailed'));
      }
    } catch {
      toast.error(t('toastCancelNetworkError'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col min-h-0 flex-1">
      
      {/* LOADING OVERLAY SPINNER */}
      {loading && (
        <div className="p-8">
          <SimpleLoader message={t('details.syncing')} />
        </div>
      )}

      {/* VIEW 1: CAMPAIGNS LEDGER DATATABLE */}
      {!loading && view === 'list' && (
        <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
          
          {/* STANDARD ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-[6px] text-xs font-medium placeholder-zinc-400 focus:outline-none focus:border-zinc-955 bg-white"
                />
              </div>
              <DropdownSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: '', label: t('allStatuses') },
                  { value: 'draft', label: t('draft') },
                  { value: 'scheduled', label: t('scheduled') },
                  { value: 'sending', label: t('sending') },
                  { value: 'paused', label: t('paused') || 'Paused' },
                  { value: 'completed', label: t('completed') },
                  { value: 'cancelled', label: t('cancelled') || 'Cancelled' },
                  { value: 'failed', label: t('failed') },
                ]}
                className="w-32"
              />
              <button 
                onClick={loadAllData}
                className="flex items-center justify-center p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Right Action Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateForm()}
                className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('deployCampaign')}</span>
              </button>
            </div>
          </div>

          {/* DATATABLE OR EMPTY STATE */}
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-fade-in shadow-3xs">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <Megaphone className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noCampaigns')}</h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {t('noCampaignsDesc')}
              </p>
              <button
                onClick={() => handleOpenCreateForm()}
                className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('deployCampaign')}</span>
              </button>
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                      <th className="px-6 py-3.5">{t('campaignName')}</th>
                      <th className="px-6 py-3.5">{t('wizard.channelLabel')}</th>
                      <th className="px-6 py-3.5">{t('targets')}</th>
                        <th className="px-6 py-3.5">{t('source')}</th>
                        <th className="px-6 py-3.5">{t('status')}</th>
                        <th className="px-6 py-3.5 text-center">{t('successRate')}</th>
                        <th className="px-6 py-3.5 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                      {filteredCampaigns.map((c, index) => {
                        const deliveryPercent = c.total_contacts > 0 ? Math.round(((c.delivered_count + c.read_count) / c.total_contacts) * 100) : 0;
                        return (
                          <tr 
                            key={c.id} 
                            className="hover:bg-[#FAFAFA]/40 transition-all font-semibold cursor-pointer animate-row-fade"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => handleOpenShow(c)}
                          >
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleOpenShow(c)}
                                className="text-xs font-black text-zinc-955 hover:underline flex flex-col items-start text-left cursor-pointer animate-fade-in"
                              >
                                <span>{c.name}</span>
                              </button>
                              <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5 capitalize">
                                {c.schedule_type === 'immediate' ? t('wizard.immediate') : t('wizard.scheduledAt')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const chType = c.channel_connection?.channel_type || '';
                                const logo = getChannelLogo(chType);
                                return (
                                  <div className="inline-flex items-center gap-1.5 font-bold text-zinc-850 select-none">
                                    {logo ? (
                                      <img src={logo} alt="" className="h-5 w-5 object-contain shrink-0" />
                                    ) : (
                                      <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center text-zinc-650 font-black text-[9px] uppercase shrink-0 border border-zinc-200">
                                        {chType.slice(0, 2)}
                                      </div>
                                    )}
                                    <span className="capitalize text-[11px] font-semibold">{c.channel_connection?.name || t('unknown')}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-zinc-50 border-zinc-200 text-zinc-650 select-none">
                                {c.audience_filter.type === 'all' && tContacts('title')}
                                {c.audience_filter.type === 'lifecycle_stage' && `${t('wizard.lifecycleLabel')}: ${tContacts(c.audience_filter.value || '')}`}
                                {c.audience_filter.type === 'tags' && `${tContacts('tags')}: ${c.audience_filter.value}`}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {c.source_type === 'template' ? (
                                c.message_template ? (
                                  <Link 
                                    href="/templates"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-black hover:underline select-none"
                                  >
                                    <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                    <span className="truncate max-w-[130px] font-semibold text-[11px]">
                                      {c.message_template.name}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">{t('template')}</span>
                                )
                              ) : (c.source_type === 'compose' || c.source_type === 'custom') ? (
                                <div className="inline-flex items-center gap-1.5 text-zinc-700 select-none">
                                  <Edit3 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                  <span className="truncate max-w-[130px] font-semibold text-[11px]" title={c.custom_message || 'Composed Message'}>
                                    {c.custom_subject || c.custom_message || t('compose')}
                                  </span>
                                </div>
                              ) : (
                                c.flow ? (
                                  <Link 
                                    href={`/flows/${c.flow.id}/edit`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 hover:underline select-none"
                                  >
                                    <Workflow className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    <span className="truncate max-w-[130px] font-bold text-[11px]">
                                      {c.flow.name}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">{t('automationFlow')}</span>
                                )
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const s = c.status.toLowerCase();
                                if (s === 'completed') {
                                  return (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-[#E8FDE8] border-accent-green/20 text-emerald-800">
                                      {t('completed')}
                                    </span>
                                  );
                                }
                                if (s === 'sending') {
                                  return (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-blue-50 border-blue-200/50 text-blue-800 animate-pulse">
                                      {t('sending')}
                                    </span>
                                  );
                                }
                                if (s === 'paused') {
                                  return (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-orange-50 border-orange-200/70 text-orange-800">
                                      {t('paused') || 'Paused'}
                                    </span>
                                  );
                                }
                                if (s === 'cancelled') {
                                  return (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-zinc-100 border-zinc-200 text-zinc-600">
                                      {t('cancelled') || 'Cancelled'}
                                    </span>
                                  );
                                }
                                if (s === 'scheduled') {
                                  return (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-250/50 text-amber-800">
                                      {t('scheduled')}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-rose-50 border-rose-200/50 text-rose-800">
                                    {s === 'draft' ? t('draft') : t('failed')}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-700">{deliveryPercent}%</span>
                                <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-black rounded-full" style={{ width: `${deliveryPercent}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {c.status === 'sending' && (
                                  <button
                                    disabled={actionLoadingId === c.id}
                                    onClick={() => handlePauseCampaign(c.id)}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                    title={t('pause') || 'Pause'}
                                  >
                                    <Pause className="h-4 w-4" />
                                  </button>
                                )}
                                {c.status === 'paused' && (
                                  <button
                                    disabled={actionLoadingId === c.id}
                                    onClick={() => handleResumeCampaign(c.id)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                    title={t('resume') || 'Resume'}
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                )}
                                {(c.status === 'sending' || c.status === 'paused') && (
                                  <button
                                    disabled={actionLoadingId === c.id}
                                    onClick={() => handleCancelCampaign(c.id)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                    title={t('cancelCampaign') || 'Cancel'}
                                  >
                                    <StopCircle className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenShow(c)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                  title={t('monitorDetails')}
                                >
                                  <Activity className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(c.id)}
                                  className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title={t('deleteCampaign')}
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
                
                {/* PAGINATION FOOTER */}
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-3.5 flex items-center justify-between text-xs text-[#6B6B6B] select-none font-semibold">
                  <span>{t('showingCampaigns', { count: filteredCampaigns.length })}</span>
                  <div className="flex items-center gap-2">
                    <button disabled className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-400 cursor-not-allowed text-[10px] font-bold uppercase select-none shadow-3xs">{t('prev')}</button>
                    <button disabled className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-400 cursor-not-allowed text-[10px] font-bold uppercase select-none shadow-3xs">{t('next')}</button>
                  </div>
                </div>
              </div>
          )}
        </div>
      )}

      {/* VIEW 2: CAMPAIGN CREATOR WIZARD WITH EXPANDING STEPPER SYSTEM */}
      {!loading && view === 'create' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSaveCampaign(); }} className="w-full bg-white animate-fade-in select-none">
          {/* TOP STEPPER PROGRESS BAR */}
          <div className="border-b border-[#E8E8E6] bg-[#FAFAFA] px-8 py-3.5 select-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              {[
                { step: 1, label: t('wizard.step1Title') || 'Campaign Identity', desc: t('wizard.step1Desc'), complete: isStep1Complete },
                { step: 2, label: t('wizard.step2Title') || 'Target Audience', desc: t('wizard.step2Desc'), complete: isStep2Complete },
                { step: 3, label: t('wizard.step3Title') || 'Message Studio', desc: t('wizard.step3Desc'), complete: isStep3Complete },
                { step: 4, label: t('wizard.step4Title') || 'Schedule & Launch', desc: t('wizard.step4Desc'), complete: isStep4Complete },
              ].map((item) => {
                const isActive = currentStep === item.step;
                const isPast = item.complete && !isActive;
                
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => navigateToStep(item.step)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer select-none ${
                      isPast
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs border border-emerald-500'
                        : isActive
                        ? 'bg-zinc-950 text-white shadow-xs ring-1 ring-zinc-800'
                        : 'bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-500'
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 transition-transform ${
                      isPast
                        ? 'bg-white/25 text-white shadow-inner'
                        : isActive
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                    }`}>
                      {isPast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : item.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isPast || isActive ? 'text-white' : 'text-zinc-800'}`}>
                        {item.label}
                      </p>
                      <p className={`text-[10px] font-medium truncate ${
                        isPast
                          ? 'text-emerald-100'
                          : isActive
                          ? 'text-zinc-300'
                          : 'text-zinc-400'
                      }`}>
                        {isPast ? t('completed') : isActive ? t('wizard.activeStep') : item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full divide-y divide-[#E8E8E6]">
            
            {/* STEP 1: CAMPAIGN IDENTITY & CHANNEL */}
            {currentStep === 1 ? (
              <div className="px-8 py-8 grid grid-cols-3 gap-8 bg-white animate-fade-in">
                <div className="col-span-1 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                    <span>{t('wizard.stepLabel', { step: '01' })}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.basicSettings')}</h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('wizard.basicSettingsDesc')}</p>
                </div>
                <div className="col-span-2 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.campaignNameLabel')}</label>
                    <input
                      type="text"
                      placeholder={t('wizard.campaignNamePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.channelLabel')}</label>
                    <DropdownSelect
                      value={channelConnectionId}
                      onChange={(val) => {
                        setChannelConnectionId(val);
                        setMessageTemplateId('');
                      }}
                      options={channels
                        .filter(ch => ch.status === 'connected')
                        .map(ch => ({
                          value: ch.id.toString(),
                          label: `${ch.name} (${ch.channel_type.toUpperCase()})`
                        }))
                      }
                    />
                    {activeChannel && (
                      <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all mt-2.5 ${
                        activeChannel.channel_type.toLowerCase().includes('baileys') || activeChannel.channel_type === 'whatsapp_baileys'
                          ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}>
                        {activeChannel.channel_type.toLowerCase().includes('baileys') || activeChannel.channel_type === 'whatsapp_baileys' ? (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                                <span>{t('antiBanActive') || 'Smart Anti-Ban Protection Active'}</span>
                                <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-tight">{t('wizard.activeStep')}</span>
                              </div>
                              <p className="text-[11px] text-emerald-800 leading-relaxed font-normal">
                                {t('antiBanDesc') || 'Dispatches use randomized jitter (4–8s) and automated cooldown safety windows to minimize channel ban risk.'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Activity className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <div className="font-bold text-zinc-900">{t('wizard.microStaggerTitle')}</div>
                              <p className="text-[11px] text-zinc-500 leading-relaxed font-normal">
                                {t('wizard.microStaggerDesc')}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 1 Action Bar */}
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleStepAdvance(1)}
                      className="flex items-center gap-1.5 px-4 h-9 bg-black hover:bg-zinc-800 text-white rounded-md text-xs font-bold transition-all cursor-pointer shadow-3xs"
                    >
                      <span>{t('wizard.continueToAudience') || 'Continue to Audience'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 1 Collapsed Tile */
              <div
                onClick={() => navigateToStep(1)}
                className={`px-8 py-4 flex items-center justify-between cursor-pointer transition-colors group select-none ${
                  isStep1Complete ? 'bg-white hover:bg-emerald-50/20' : 'bg-white hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-3xs transition-transform ${
                    isStep1Complete 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    {isStep1Complete ? <Check className="h-4 w-4 stroke-[2.5]" /> : '1'}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-tight group-hover:text-black">
                      {t('wizard.step1Title') || '1. Campaign Identity & Channel'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                      {name ? (
                        <span><strong className="text-zinc-800">{name}</strong> • {t('channelLabel')} <strong className="text-zinc-800">{activeChannel?.name || 'Channel'}</strong> ({activeChannel?.channel_type.toUpperCase()})</span>
                      ) : (
                        <span className="text-zinc-400 italic">{t('wizard.campaignNameNotConfigured')}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${isStep1Complete ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-zinc-400 group-hover:text-zinc-700'}`}>
                    {t('wizard.editStep') || 'Edit'}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isStep1Complete ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-black'}`} />
                </div>
              </div>
            )}

            {/* STEP 2: TARGET AUDIENCE */}
            {currentStep === 2 ? (
              <div className="px-8 py-8 grid grid-cols-3 gap-8 bg-white animate-fade-in">
                <div className="col-span-1 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                    <span>{t('wizard.stepLabel', { step: '02' })}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.audienceTarget')}</h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('wizard.audienceTargetDesc')}</p>
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left col-span-2">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('targets')}</label>
                      <DropdownSelect
                        value={audienceType}
                        onChange={(val: any) => {
                          setAudienceType(val);
                          setAudienceValue('');
                          setSelectedContactIds([]);
                        }}
                        options={[
                          { value: 'all', label: tContacts('title') },
                          { value: 'lifecycle_stage', label: t('wizard.filterLifecycle') },
                          { value: 'tags', label: t('wizard.filterTags') },
                          { value: 'contacts', label: t('wizard.audienceTarget') },
                        ]}
                      />
                    </div>
                    
                    {audienceType === 'lifecycle_stage' && (
                      <div className="space-y-1.5 text-left font-semibold text-zinc-700 col-span-2">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.lifecycleLabel')}</label>
                        <DropdownSelect
                          value={audienceValue}
                          onChange={(val) => setAudienceValue(val)}
                          options={[
                            { value: 'lead', label: tContacts('lead') },
                            { value: 'subscriber', label: tContacts('subscriber') },
                            { value: 'opportunity', label: tContacts('opportunity') },
                            { value: 'customer', label: tContacts('customer') },
                            { value: 'churned', label: tContacts('churned') },
                          ]}
                        />
                      </div>
                    )}

                    {audienceType === 'tags' && (
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.tagsLabel')}</label>
                        <input
                          type="text"
                          placeholder={t('tagsPlaceholder')}
                          value={audienceValue}
                          onChange={(e) => setAudienceValue(e.target.value)}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                        />
                      </div>
                    )}

                    {audienceType === 'contacts' && (
                      <div className="space-y-2 col-span-2 pt-2 animate-fade-in text-left">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            {t('wizard.audienceTarget')} ({selectedContactIds.length} {t('selected')})
                          </span>
                          {selectedContactIds.length > 0 && (
                            <button 
                              type="button" 
                              onClick={() => setSelectedContactIds([])}
                              className="text-[9.5px] text-zinc-400 hover:text-black font-bold uppercase cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                          )}
                        </div>
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder={tContacts('searchPlaceholder')}
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                          />
                        </div>
                        <div className="border border-zinc-200 rounded-[6px] max-h-48 overflow-y-auto divide-y divide-[#E8E8E6] bg-white shadow-3xs">
                          {(() => {
                            const filtered = allContacts.filter(c => {
                              const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
                              const search = contactSearch.toLowerCase();
                              return fullName.includes(search) || 
                                     (c.email && c.email.toLowerCase().includes(search)) || 
                                     (c.phone && c.phone.toLowerCase().includes(search));
                            });
                            
                            if (filtered.length === 0) {
                              return (
                                <div className="p-4 text-center text-[10px] text-zinc-450 font-bold uppercase select-none">
                                  {t('noDispatches')}
                                </div>
                              );
                            }

                            return filtered.map(c => {
                              const isChecked = selectedContactIds.includes(c.id);
                              return (
                                <div 
                                  key={c.id} 
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedContactIds(selectedContactIds.filter(id => id !== c.id));
                                    } else {
                                      setSelectedContactIds([...selectedContactIds, c.id]);
                                    }
                                  }}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#FAFAFA]/40 cursor-pointer select-none text-xs font-semibold text-zinc-700"
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="rounded border-zinc-300 text-zinc-955 focus:ring-zinc-955 cursor-pointer h-3.5 w-3.5 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-zinc-900 font-bold truncate">
                                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || tContacts('unnamedContact')}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 font-semibold truncate">
                                      {c.email || c.phone || '—'}
                                    </p>
                                  </div>
                                  <span className="text-[9.5px] uppercase tracking-wider bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 text-zinc-500 font-bold select-none shrink-0">
                                    {c.lifecycle_stage ? tContacts(c.lifecycle_stage) : tContacts('lead')}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 Action Bar */}
                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => navigateToStep(1)}
                      className="flex items-center gap-1 px-3 h-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-md text-xs font-semibold text-zinc-700 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{t('wizard.previousStep') || 'Back'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAdvance(2)}
                      className="flex items-center gap-1.5 px-4 h-9 bg-black hover:bg-zinc-800 text-white rounded-md text-xs font-bold transition-all cursor-pointer shadow-3xs"
                    >
                      <span>{t('wizard.continueToMessage') || 'Continue to Message Studio'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2 Collapsed Tile */
              <div
                onClick={() => navigateToStep(2)}
                className={`px-8 py-4 flex items-center justify-between cursor-pointer transition-colors group select-none ${
                  isStep2Complete ? 'bg-white hover:bg-emerald-50/20' : 'bg-white hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-3xs transition-transform ${
                    isStep2Complete 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    {isStep2Complete ? <Check className="h-4 w-4 stroke-[2.5]" /> : '2'}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-tight group-hover:text-black">
                      {t('wizard.step2Title') || '2. Target Audience'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                      {audienceType === 'all' ? (
                        <span>{t('wizard.targetAllContacts')} (<strong className="text-zinc-800">{allContacts.length}</strong> {t('wizard.total')})</span>
                      ) : audienceType === 'lifecycle_stage' ? (
                        <span>{t('wizard.lifecycleLabel')}: <strong className="text-zinc-800">{audienceValue ? tContacts(audienceValue) : t('wizard.notSpecified')}</strong></span>
                      ) : audienceType === 'tags' ? (
                        <span>{t('wizard.tagsLabel')}: <strong className="text-zinc-800">{audienceValue || t('wizard.notSpecified')}</strong></span>
                      ) : (
                        <span><strong className="text-zinc-800">{selectedContactIds.length}</strong> {t('wizard.contactsSelected')}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${isStep2Complete ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-zinc-400 group-hover:text-zinc-700'}`}>
                    {t('wizard.editStep') || 'Edit'}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isStep2Complete ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-black'}`} />
                </div>
              </div>
            )}

            {/* STEP 3: MESSAGE & CREATIVE STUDIO */}
            {currentStep === 3 ? (
              <div className="px-8 py-8 grid grid-cols-3 gap-8 bg-white animate-fade-in">
                <div className="col-span-1 space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
                      <span>{t('wizard.stepLabel', { step: '03' })}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.actionSource')}</h3>
                    <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('wizard.actionSourceDesc')}</p>
                  </div>

                  {/* Channel-Adaptive Live Preview below Title and Description */}
                  {sourceType === 'compose' && (
                    <div className="pt-3 space-y-2 animate-fade-in">
                      {/* Header Title */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                            {t('wizard.messagePreview') || 'Live Preview'}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
                          {activeChannel?.channel_type === 'whatsapp' || activeChannel?.channel_type === 'whatsapp_baileys'
                            ? 'WhatsApp'
                            : activeChannel?.channel_type === 'email'
                            ? 'Email'
                            : activeChannel?.channel_type === 'sms'
                            ? 'SMS'
                            : activeChannel?.channel_type === 'telegram'
                            ? 'Telegram'
                            : activeChannel?.name || 'Channel'}
                        </span>
                      </div>

                      {/* Preview Message Card / Bubble */}
                      {activeChannel?.channel_type === 'email' ? (
                        /* Email Card Mockup */
                        <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs text-zinc-800 animate-fade-in">
                          <div className="p-2.5 bg-zinc-50 border-b border-zinc-100 text-xs space-y-0.5">
                            <div className="flex items-center justify-between text-zinc-500 text-[9px]">
                              <span>{t('wizard.emailPreviewTo')} <strong>john@example.com</strong></span>
                              <span>10:42 AM</span>
                            </div>
                            <div className="font-bold text-zinc-900 text-[11px] truncate">
                              {t('wizard.emailPreviewSubject')} {customSubject || name || 'Exclusive Update'}
                            </div>
                          </div>

                          {mediaUrl && (
                            <img 
                              src={mediaUrl} 
                              alt="Email Banner Preview" 
                              className="w-full h-32 object-cover" 
                            />
                          )}

                          <div className="p-3 space-y-3">
                            <p className="text-xs whitespace-pre-wrap font-medium leading-relaxed text-zinc-700 break-words">
                              {customMessage
                                ? interpolateMessagePreview(customMessage)
                                : t('wizard.emailBodyPlaceholder')}
                            </p>

                            {ctaButtonText && (
                              <div className="pt-1 text-center">
                                <div className="inline-flex items-center justify-center px-3.5 py-1.5 bg-zinc-950 text-white rounded-[6px] text-[10.5px] font-bold shadow-xs truncate max-w-full">
                                  {ctaButtonText}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : activeChannel?.channel_type === 'telegram' ? (
                        /* Telegram Bubble Mockup */
                        <div className="w-full bg-[#EBF4FA] border border-[#CFE4F3] rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-2 text-zinc-900 animate-fade-in">
                          {mediaUrl && (
                            <div className="rounded-xl overflow-hidden border border-[#BBDDF2]/60">
                              <img 
                                src={mediaUrl} 
                                alt="Attachment Preview" 
                                className="w-full h-32 object-cover" 
                              />
                            </div>
                          )}

                          <p className="text-xs whitespace-pre-wrap font-medium leading-relaxed break-words">
                            {customMessage
                              ? interpolateMessagePreview(customMessage)
                              : t('wizard.telegramPreviewPlaceholder')}
                          </p>

                          {ctaButtonText && (
                            <div className="pt-1.5 border-t border-[#CFE4F3]">
                              <div className="w-full py-1.5 px-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10.5px] font-bold text-center flex items-center justify-center gap-1 shadow-3xs truncate">
                                <ExternalLink className="h-2.5 w-2.5 text-sky-100 shrink-0" />
                                <span className="truncate">{ctaButtonText}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-500 font-semibold pt-0.5">
                            <span>10:42 AM</span>
                            <CheckCheck className="h-3 w-3 text-sky-500" />
                          </div>
                        </div>
                      ) : activeChannel?.channel_type === 'sms' ? (
                        /* SMS Bubble Mockup */
                        <div className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-2 text-zinc-900 animate-fade-in">
                          {mediaUrl && (
                            <div className="rounded-xl overflow-hidden border border-zinc-300/80">
                              <img 
                                src={mediaUrl} 
                                alt="MMS Attachment Preview" 
                                className="w-full h-32 object-cover" 
                              />
                            </div>
                          )}

                          <p className="text-xs whitespace-pre-wrap font-medium leading-relaxed break-words">
                            {customMessage
                              ? interpolateMessagePreview(customMessage)
                              : t('wizard.smsPreviewPlaceholder')}
                          </p>

                          {ctaButtonText && (
                            <div className="pt-1 text-[10.5px] text-blue-600 font-semibold truncate underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{ctaButtonUrl || 'https://yourwebsite.com/offer'} ({ctaButtonText})</span>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400 font-semibold pt-0.5">
                            <span>{t('wizard.previewDelivered')} • 10:42 AM</span>
                          </div>
                        </div>
                      ) : (
                        /* WhatsApp / Standard Chat Bubble Mockup */
                        <div className="w-full bg-[#E7FED6] border border-[#D1F2B5] rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-2 text-zinc-900 animate-fade-in">
                          {mediaUrl && (
                            <div className="rounded-xl overflow-hidden border border-[#C6EBA7]/60">
                              <img 
                                src={mediaUrl} 
                                alt="Attachment Preview" 
                                className="w-full h-32 object-cover" 
                              />
                            </div>
                          )}

                          <p className="text-xs whitespace-pre-wrap font-medium leading-relaxed break-words">
                            {customMessage
                              ? interpolateMessagePreview(customMessage)
                              : t('wizard.chatPreviewPlaceholder')}
                          </p>

                          {ctaButtonText && (
                            <div className="pt-1.5 border-t border-[#C6EBA7]/80">
                              <div className="w-full py-1.5 px-2 bg-white hover:bg-zinc-50 border border-[#BDE79C] rounded-lg text-emerald-800 text-[10.5px] font-bold text-center flex items-center justify-center gap-1 shadow-3xs truncate">
                                <ExternalLink className="h-2.5 w-2.5 text-emerald-700 shrink-0" />
                                <span className="truncate">{ctaButtonText}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-500 font-semibold pt-0.5">
                            <span>10:42 AM</span>
                            <CheckCheck className="h-3 w-3 text-sky-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-2 space-y-5">
                  {/* Horizontal Selector Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setSourceType('template')}
                      className={`border p-3.5 rounded-xl cursor-pointer select-none transition-all flex flex-col items-start text-left relative ${
                        sourceType === 'template' 
                          ? 'border-black bg-zinc-50/50 shadow-xs' 
                          : 'border-[#E8E8E6] bg-white hover:bg-zinc-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <Mail className="h-4.5 w-4.5 text-zinc-700" />
                        {activeChannel?.channel_type === 'whatsapp' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {t('wizard.recommended')}
                          </span>
                        )}
                      </div>
                      <h4 className="text-[11px] font-bold text-black uppercase tracking-wider mb-0.5">{t('template')}</h4>
                      <p className="text-[9px] text-[#6B6B6B] leading-relaxed font-semibold">{t('wizard.actionTemplate')}</p>
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setSourceType('compose')}
                      className={`border p-3.5 rounded-xl cursor-pointer select-none transition-all flex flex-col items-start text-left ${
                        sourceType === 'compose' 
                          ? 'border-black bg-zinc-50/50 shadow-xs' 
                          : 'border-[#E8E8E6] bg-white hover:bg-zinc-50/30'
                      }`}
                    >
                      <Edit3 className="h-4.5 w-4.5 mb-1.5 text-zinc-700" />
                      <h4 className="text-[11px] font-bold text-black uppercase tracking-wider mb-0.5">{t('compose') || 'Compose Message'}</h4>
                      <p className="text-[9px] text-[#6B6B6B] leading-relaxed font-semibold">
                        {activeChannel?.channel_type === 'email' 
                          ? t('wizard.actionSourceComposeEmailDesc')
                          : activeChannel?.channel_type === 'sms'
                          ? t('wizard.actionSourceComposeSmsDesc')
                          : t('wizard.actionCompose') || 'Direct message composition with personalization variables'}
                      </p>
                    </button>
                  </div>

                  <div className="pt-2">
                    {sourceType === 'template' ? (
                      <div className="space-y-1.5 text-left font-semibold text-zinc-700">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.selectTemplate')}</label>
                        <DropdownSelect
                          value={messageTemplateId}
                          onChange={(val) => setMessageTemplateId(val)}
                          options={compatibleTemplates.map(t => ({
                            value: t.id.toString(),
                            label: `${t.name.toUpperCase()} (${t.type.toUpperCase()})`
                          }))}
                        />
                        {compatibleTemplates.length === 0 && (
                          <p className="text-[10px] text-zinc-400 font-semibold select-none">{t('noTemplates')}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5 text-left font-semibold text-zinc-700">
                        {/* Safety Guard: Meta WhatsApp 24-Hour Policy Notice */}
                        {activeChannel?.channel_type === 'whatsapp' && (
                          <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-md flex items-start gap-2.5 animate-fade-in">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-900 leading-relaxed">
                              <strong className="font-bold block text-[10.5px] uppercase tracking-wider text-amber-800 mb-0.5">
                                {t('wizard.meta24hNoticeTitle') || 'Meta 24-Hour Policy Notice'}
                              </strong>
                              {t('wizard.meta24hNoticeDesc') || 'Official WhatsApp Cloud API sends direct composed messages only to contacts with an active 24-hour interaction window. For bulk broadcast or re-engagement, pre-approved Message Templates ensure 100% delivery.'}
                            </div>
                          </div>
                        )}

                        {/* Email Subject Line (Mandatory Guard for Email) */}
                        {activeChannel?.channel_type === 'email' && (
                          <div className="space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                                {t('wizard.messageSubjectLabel') || 'Email Subject Line'} <span className="text-rose-500">*</span>
                              </label>
                              <span className="text-[9.5px] text-rose-500 font-bold uppercase tracking-wider">{t('wizard.requiredForEmail')}</span>
                            </div>
                            <input
                              type="text"
                              placeholder={t('wizard.messageSubjectPlaceholder') || 'e.g. Special Offer Just for You!'}
                              value={customSubject}
                              onChange={(e) => setCustomSubject(e.target.value)}
                              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder-zinc-400"
                            />
                          </div>
                        )}

                        {/* Unified Message Content Studio */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                              {t('wizard.messageBodyLabel') || 'Message Content'} <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                              {activeChannel?.channel_type === 'sms' ? (
                                (() => {
                                  const isUnicode = /[^\u0000-\u00ff]/.test(customMessage);
                                  const maxPerSegment = isUnicode ? 70 : 160;
                                  const charsCount = customMessage.length;
                                  const smsSegments = Math.max(1, Math.ceil(charsCount / maxPerSegment));
                                  return (
                                    <span className={smsSegments > 3 ? 'text-amber-600 font-bold' : 'text-zinc-500'}>
                                      {t('wizard.smsSegmentsCount', {
                                        chars: charsCount,
                                        segments: smsSegments,
                                        segmentLabel: smsSegments === 1 ? 'Segment' : 'Segments',
                                        unicode: isUnicode ? '(Unicode)' : ''
                                      })}
                                    </span>
                                  );
                                })()
                              ) : (
                                <>
                                  <span>{customMessage.trim().split(/\s+/).filter(Boolean).length} {t('wizard.words')}</span>
                                  <span>•</span>
                                  <span>{customMessage.length} {t('wizard.chars')}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* SMS Cost Guard Notice if > 3 segments */}
                          {activeChannel?.channel_type === 'sms' && customMessage.length > 480 && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-center gap-2 font-semibold animate-fade-in">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>{t('wizard.smsSegmentNotice')}</span>
                            </div>
                          )}

                          {/* Professional Integrated Editor Studio */}
                          <div className="border border-[#E8E8E6] rounded-md bg-white focus-within:border-black transition-colors shadow-3xs relative">
                            {/* Formatting & Personalization Toolbar */}
                            <div className="px-3 py-2 bg-[#FAFAFA] border-b border-[#E8E8E6] rounded-t-md flex items-center justify-between gap-2 flex-wrap select-none relative">
                              {/* Formatting Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleApplyFormatting('*')}
                                  className="p-1 hover:bg-zinc-200/80 rounded text-zinc-600 hover:text-black text-xs font-bold cursor-pointer transition-colors"
                                  title={t('wizard.boldTitle')}
                                >
                                  <Bold className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyFormatting('_')}
                                  className="p-1 hover:bg-zinc-200/80 rounded text-zinc-600 hover:text-black text-xs font-bold cursor-pointer transition-colors"
                                  title={t('wizard.italicTitle')}
                                >
                                  <Italic className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyFormatting('~')}
                                  className="p-1 hover:bg-zinc-200/80 rounded text-zinc-600 hover:text-black text-xs font-bold cursor-pointer transition-colors"
                                  title={t('wizard.strikethroughTitle')}
                                >
                                  <Strikethrough className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyFormatting('`')}
                                  className="p-1 hover:bg-zinc-200/80 rounded text-zinc-600 hover:text-black text-xs font-bold cursor-pointer transition-colors"
                                  title={t('wizard.codeTitle')}
                                >
                                  <Code className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Personalization Merge Tags - Only Available Data */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {quickVariables.map((v) => (
                                  <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => handleInsertTag(v.tag)}
                                    className="px-2 py-0.5 bg-white hover:bg-zinc-100 border border-[#E8E8E6] text-zinc-700 hover:text-black rounded text-[10px] font-semibold transition-colors cursor-pointer shadow-3xs"
                                  >
                                    {v.label}
                                  </button>
                                ))}

                                {/* Variable Hub Popover Menu */}
                                <div className="relative" ref={variableDropdownRef}>
                                  <button
                                    type="button"
                                    onClick={() => setVariableDropdownOpen(!variableDropdownOpen)}
                                    className={`px-2.5 py-0.5 border rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs ${
                                      variableDropdownOpen 
                                        ? 'bg-black text-white border-black' 
                                        : 'bg-white hover:bg-zinc-100 border-[#E8E8E6] text-zinc-800'
                                    }`}
                                  >
                                    <span>{t('wizard.allContactFields')}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                      variableDropdownOpen ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                                    }`}>
                                      {totalAvailableVariablesCount}
                                    </span>
                                    <ChevronDown className={`h-3 w-3 transition-transform ${variableDropdownOpen ? 'rotate-180' : ''}`} />
                                  </button>

                                  {variableDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-[#E8E8E6] rounded-xl shadow-2xl z-50 p-3.5 space-y-3 animate-fade-in text-left">
                                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                        <div>
                                          <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider block">
                                            {t('wizard.availableContactData', { count: totalAvailableVariablesCount })}
                                          </span>
                                          <span className="text-[9px] text-zinc-400 font-medium">
                                            {t('wizard.verifiedOnlyData')}
                                          </span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-semibold">
                                          {t('wizard.verifiedBadge')}
                                        </span>
                                      </div>

                                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                        {contactVariableGroups.map((grp) => (
                                          <div key={grp.group} className="space-y-1.5">
                                            <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block">
                                              {grp.group}
                                            </span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                              {grp.items.map((item) => (
                                                <button
                                                  key={item.tag}
                                                  type="button"
                                                  onClick={() => {
                                                    handleInsertTag(item.tag);
                                                    setVariableDropdownOpen(false);
                                                  }}
                                                  className="p-2 rounded-lg border border-[#E8E8E6] hover:border-zinc-400 hover:bg-zinc-50 text-left transition-all group cursor-pointer bg-white"
                                                >
                                                  <div className="text-[10.5px] font-bold text-zinc-800 group-hover:text-black truncate">
                                                    {item.label}
                                                  </div>
                                                  <div className="text-[9.5px] text-zinc-400 font-mono truncate mt-0.5">
                                                    {item.tag}
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Custom Field Key Dynamic Insert */}
                                      <div className="pt-2.5 border-t border-zinc-100 space-y-1.5">
                                        <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider block">
                                          {t('wizard.insertCustomFieldKey')}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            placeholder={t('wizard.customTagPlaceholder')}
                                            value={customKeyInput}
                                            onChange={(e) => setCustomKeyInput(e.target.value)}
                                            className="flex-1 h-7.5 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-[10.5px] focus:outline-none focus:border-black font-mono"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (customKeyInput.trim()) {
                                                handleInsertTag(`{{ contact.custom_fields.${customKeyInput.trim()} }}`);
                                                setCustomKeyInput('');
                                                setVariableDropdownOpen(false);
                                              }
                                            }}
                                            disabled={!customKeyInput.trim()}
                                            className="h-7.5 px-3 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white rounded-md text-[10.5px] font-bold cursor-pointer transition-colors shadow-3xs"
                                          >
                                            {t('wizard.insertBtn')}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Message Textarea */}
                            <textarea
                              rows={5}
                              ref={messageTextareaRef}
                              placeholder={
                                activeChannel?.channel_type === 'email'
                                  ? t('wizard.writeEmailPlaceholder')
                                  : activeChannel?.channel_type === 'sms'
                                  ? t('wizard.writeSmsPlaceholder')
                                  : t('wizard.messageBodyPlaceholder') || 'Write your campaign message here... Use variables to personalize for each recipient.'
                              }
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              className="w-full p-3.5 bg-white border-0 rounded-b-md text-xs font-medium focus:outline-none placeholder-zinc-400 leading-relaxed resize-y"
                            />
                          </div>
                        </div>

                        {/* Media / Asset Attachment Row */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                              {activeChannel?.channel_type === 'email' 
                                ? t('wizard.headerBannerAttachment')
                                : activeChannel?.channel_type === 'sms'
                                ? t('wizard.mmsMediaFile')
                                : t('wizard.attachMedia') || 'Media Attachment (Optional)'}
                            </label>
                            {mediaUrl && (
                              <button
                                type="button"
                                onClick={() => setMediaUrl('')}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                {t('wizard.removeMedia') || 'Remove File'}
                              </button>
                            )}
                          </div>

                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,video/mp4" 
                            onChange={handleFileUpload} 
                          />

                          {mediaUrl ? (
                            <div className="flex items-center gap-3 p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md">
                              <div className="h-10 w-14 rounded bg-zinc-200 overflow-hidden shrink-0 flex items-center justify-center border border-zinc-200">
                                {mediaType === 'image' ? (
                                  <img src={mediaUrl} alt="Attached" className="h-full w-full object-cover" />
                                ) : (
                                  <FileText className="h-4 w-4 text-zinc-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-zinc-800 truncate font-mono">{mediaUrl}</p>
                                <p className="text-[10px] text-zinc-400 uppercase font-semibold">{mediaType}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2.5 py-1 text-[11px] font-medium border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded text-zinc-700 cursor-pointer transition-colors"
                              >
                                {t('wizard.replaceMedia')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={mediaUploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="h-9 px-3 bg-white hover:bg-zinc-50 border border-[#E8E8E6] rounded-md text-xs font-medium text-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                              >
                                {mediaUploading ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                                    <span>{t('wizard.uploading')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5 text-zinc-500" />
                                    <span>{t('wizard.uploadMedia') || 'Upload File'}</span>
                                  </>
                                )}
                              </button>
                              <input
                                type="url"
                                placeholder={t('wizard.mediaUrlPlaceholder') || 'Or paste direct media URL (https://...)'}
                                value={mediaUrl}
                                onChange={(e) => {
                                  setMediaUrl(e.target.value);
                                  setMediaType('image');
                                }}
                                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder-zinc-400"
                              />
                            </div>
                          )}
                        </div>

                        {/* Interactive CTA Button Row */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                              {t('wizard.ctaButtonLabel') || 'Interactive CTA Button (Optional)'}
                            </label>
                            <span className="text-[9.5px] text-zinc-400 font-semibold">
                              {activeChannel?.channel_type === 'email' ? t('wizard.actionButtonInEmail') : t('wizard.linkInMessage')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder={t('wizard.ctaButtonTextPlaceholder')}
                              value={ctaButtonText}
                              onChange={(e) => setCtaButtonText(e.target.value)}
                              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder-zinc-400"
                            />
                            <input
                              type="url"
                              placeholder={t('wizard.ctaButtonUrlPlaceholder')}
                              value={ctaButtonUrl}
                              onChange={(e) => setCtaButtonUrl(e.target.value)}
                              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder-zinc-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3 Action Bar */}
                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => navigateToStep(2)}
                      className="flex items-center gap-1 px-3 h-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-md text-xs font-semibold text-zinc-700 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{t('wizard.previousStep') || 'Back'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAdvance(3)}
                      className="flex items-center gap-1.5 px-4 h-9 bg-black hover:bg-zinc-800 text-white rounded-md text-xs font-bold transition-all cursor-pointer shadow-3xs"
                    >
                      <span>{t('wizard.continueToSchedule') || 'Continue to Schedule'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 3 Collapsed Tile */
              <div
                onClick={() => navigateToStep(3)}
                className={`px-8 py-4 flex items-center justify-between cursor-pointer transition-colors group select-none ${
                  isStep3Complete ? 'bg-white hover:bg-emerald-50/20' : 'bg-white hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-3xs transition-transform ${
                    isStep3Complete 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    {isStep3Complete ? <Check className="h-4 w-4 stroke-[2.5]" /> : '3'}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-tight group-hover:text-black">
                      {t('wizard.step3Title') || '3. Message & Creative Studio'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                      {sourceType === 'template' ? (
                        <span>{t('wizard.templateSummary', { template: compatibleTemplates.find(t => t.id.toString() === messageTemplateId)?.name || t('wizard.noneSelected') })}</span>
                      ) : (
                        <span>{t('wizard.composedSummary', { words: customMessage ? customMessage.trim().split(/\s+/).filter(Boolean).length : 0 })}{mediaUrl ? ` ${t('wizard.attachmentCount')}` : ''}{ctaButtonText ? ` ${t('wizard.ctaButtonCount')}` : ''}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${isStep3Complete ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-zinc-400 group-hover:text-zinc-700'}`}>
                    {t('wizard.editStep') || 'Edit'}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isStep3Complete ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-black'}`} />
                </div>
              </div>
            )}

            {/* STEP 4: SCHEDULE & LAUNCH */}
            {currentStep === 4 ? (
              <div className="px-8 py-8 grid grid-cols-3 gap-8 bg-white animate-fade-in">
                <div className="col-span-1 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                    <span>{t('wizard.stepLabel', { step: '04' })}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.scheduleDispatch')}</h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('wizard.scheduleDispatchDesc')}</p>
                </div>
                <div className="col-span-2 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.scheduleTypeLabel')}</label>
                      <DropdownSelect
                        value={scheduleType}
                        onChange={(val: any) => setScheduleType(val)}
                        options={[
                          { value: 'immediate', label: t('wizard.immediate') },
                          { value: 'scheduled', label: t('wizard.scheduledAt') },
                        ]}
                      />
                    </div>

                    {scheduleType === 'scheduled' && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('wizard.scheduledAtLabel')}</label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {/* Pre-Flight Summary Matrix */}
                  <div className="border border-[#E8E8E6] rounded-lg p-4 bg-[#FAFAFA] space-y-3 shadow-3xs">
                    <div className="flex items-center justify-between border-b border-zinc-200/70 pb-2">
                      <span className="text-[10.5px] font-bold text-zinc-700 uppercase tracking-wider">
                        {t('wizard.preflightSummary')}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t('wizard.readyToDeploy')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium uppercase tracking-wider">{t('campaignName')}</span>
                        <span className="font-bold text-zinc-900">{name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium uppercase tracking-wider">{t('wizard.channelLabel')}</span>
                        <span className="font-bold text-zinc-900">{activeChannel?.name} ({activeChannel?.channel_type.toUpperCase()})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium uppercase tracking-wider">{t('wizard.audienceTarget')}</span>
                        <span className="font-bold text-zinc-900">
                          {audienceType === 'all' ? `${t('wizard.targetAllContacts')} (${allContacts.length})` : audienceType === 'contacts' ? `${selectedContactIds.length} ${t('wizard.contactsSelected')}` : `${audienceType.toUpperCase()}: ${audienceValue}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium uppercase tracking-wider">{t('wizard.executionSchedule')}</span>
                        <span className="font-bold text-zinc-900">
                          {scheduleType === 'immediate' ? (t('wizard.immediateLaunch') || 'Immediate Launch') : (scheduledAt || t('wizard.notSpecified'))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 Action Bar */}
                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => navigateToStep(3)}
                      className="flex items-center gap-1 px-3 h-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-md text-xs font-semibold text-zinc-700 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{t('wizard.previousStep') || 'Back'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign()}
                      disabled={isPending}
                      className="flex items-center gap-2 px-5 h-9 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white rounded-md text-xs font-bold transition-all cursor-pointer shadow-3xs"
                    >
                      {isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <Send className="h-3.5 w-3.5 text-white" />
                      )}
                      <span>{scheduleType === 'immediate' ? (t('wizard.save') || 'Deploy Campaign') : (t('wizard.scheduleCampaignBroadcast') || 'Schedule Campaign Broadcast')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 4 Collapsed Tile */
              <div
                onClick={() => navigateToStep(4)}
                className={`px-8 py-4 flex items-center justify-between cursor-pointer transition-colors group select-none ${
                  isStep4Complete ? 'bg-white hover:bg-emerald-50/20' : 'bg-white hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-3xs transition-transform ${
                    isStep4Complete 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    {isStep4Complete ? <Check className="h-4 w-4 stroke-[2.5]" /> : '4'}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-tight group-hover:text-black">
                      {t('wizard.step4Title') || '4. Schedule & Launch'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                      {scheduleType === 'immediate' ? (
                        <span>{t('wizard.immediateLaunchDesc')}</span>
                      ) : (
                        <span>{t('wizard.scheduledFor')} <strong className="text-zinc-800">{scheduledAt || t('wizard.notSpecified')}</strong></span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${isStep4Complete ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-zinc-400 group-hover:text-zinc-700'}`}>
                    {t('wizard.editStep') || 'Edit'}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isStep4Complete ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-black'}`} />
                </div>
              </div>
            )}

          </div>
        </form>
      )}

      {/* VIEW 3: CAMPAIGN DETAILS / REPORTING */}
      {!loading && view === 'show' && activeCampaign && (
        <div className="w-full select-none text-left animate-fade-in flex-1 overflow-y-auto bg-white">
          
          {/* TOP CAMPAIGN HEADER INFO (Connected End-to-End Divider) */}
          <div className="w-full px-8 py-6 border-b border-[#E8E8E6] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-[#0A0A0A]">
                  {activeCampaign.name}
                </h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  activeCampaign.status === 'completed'
                    ? 'bg-[#E8FDE8] text-emerald-800 border-emerald-200'
                    : activeCampaign.status === 'sending'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                    : activeCampaign.status === 'paused'
                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                    : activeCampaign.status === 'cancelled'
                    ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    : activeCampaign.status === 'failed'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}>
                  {activeCampaign.status === 'completed' ? t('completed') : activeCampaign.status === 'sending' ? t('sending') : activeCampaign.status === 'paused' ? t('paused') : activeCampaign.status === 'cancelled' ? t('cancelled') : activeCampaign.status === 'failed' ? t('failed') : activeCampaign.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#6B6B6B] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t('channelLabel')} <strong className="text-[#0A0A0A] font-bold">{activeCampaign.channel_connection?.name || '—'}</strong></span>
                </span>
                <span className="text-zinc-300">•</span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t('sourceLabel')} <strong className="text-[#0A0A0A] font-bold">{activeCampaign.source_type === 'compose' || activeCampaign.source_type === 'custom' ? (t('compose') || 'Composed Message') : activeCampaign.source_type === 'template' ? (t('template') || 'Message Template') : (t('automationFlow') || 'Flow Automation')}</strong></span>
                </span>
                <span className="text-zinc-300">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t('createdLabel')} {new Date(activeCampaign.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </div>

            {/* Real-time Broadcast Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeCampaign.status === 'sending' && (
                <button
                  type="button"
                  disabled={actionLoadingId === activeCampaign.id}
                  onClick={() => handlePauseCampaign(activeCampaign.id)}
                  className="flex items-center gap-1.5 px-3 h-8.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-[6px] text-xs font-bold transition-all cursor-pointer shadow-3xs disabled:opacity-50"
                  title={t('pause') || 'Pause campaign'}
                >
                  <Pause className="h-3.5 w-3.5 text-amber-700" />
                  <span>{t('pause') || 'Pause'}</span>
                </button>
              )}

              {activeCampaign.status === 'paused' && (
                <button
                  type="button"
                  disabled={actionLoadingId === activeCampaign.id}
                  onClick={() => handleResumeCampaign(activeCampaign.id)}
                  className="flex items-center gap-1.5 px-3 h-8.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-[6px] text-xs font-bold transition-all cursor-pointer shadow-3xs disabled:opacity-50"
                  title={t('resume') || 'Resume campaign'}
                >
                  <Play className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{t('resume') || 'Resume'}</span>
                </button>
              )}

              {(activeCampaign.status === 'sending' || activeCampaign.status === 'paused') && (
                <button
                  type="button"
                  disabled={actionLoadingId === activeCampaign.id}
                  onClick={() => handleCancelCampaign(activeCampaign.id)}
                  className="flex items-center gap-1.5 px-3 h-8.5 border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 rounded-[6px] text-xs font-bold transition-all cursor-pointer shadow-3xs disabled:opacity-50"
                  title={t('cancelCampaign') || 'Cancel remaining queue'}
                >
                  <StopCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t('cancelCampaign') || 'Cancel'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => loadCampaignDetails(activeCampaign.id, dispatchesPage)}
                className="flex items-center justify-center p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all"
                title={t('refreshStats')}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${activeCampaign.status === 'sending' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* CAMPAIGN EXECUTION PROGRESS BAR */}
          {activeCampaign.total_contacts > 0 && (
            <div className="w-full px-8 pt-5 pb-1 bg-white">
              <div className="p-4 border border-[#E8E8E6] rounded-[10px] bg-[#FAFAFA]/80 space-y-2.5 shadow-3xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">{t('campaignExecutionProgress')}</span>
                    {activeCampaign.status === 'sending' && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                        <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping inline-block" />
                        {t('liveDispatchingAntiBan')}
                      </span>
                    )}
                    {activeCampaign.status === 'paused' && (
                      <span className="text-[10.5px] font-semibold text-orange-800 bg-orange-100/80 px-2 py-0.5 rounded-full border border-orange-200">
                        {t('pausedQueueSafe')}
                      </span>
                    )}
                    {activeCampaign.status === 'completed' && (
                      <span className="text-[10.5px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t('allContactsProcessed')}
                      </span>
                    )}
                    {activeCampaign.status === 'cancelled' && (
                      <span className="text-[10.5px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                        {t('broadcastStopped')}
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-xs text-zinc-850">
                    {(activeCampaign.sent_count + activeCampaign.failed_count)} / {activeCampaign.total_contacts} (
                    {Math.round(((activeCampaign.sent_count + activeCampaign.failed_count) / Math.max(1, activeCampaign.total_contacts)) * 100)}%)
                  </div>
                </div>
                <div className="w-full h-2.5 bg-zinc-200/80 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((activeCampaign.delivered_count / Math.max(1, activeCampaign.total_contacts)) * 100))}%` }} 
                    title={`${t('delivered')}: ${activeCampaign.delivered_count}`}
                  />
                  <div 
                    className="bg-blue-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((Math.max(0, activeCampaign.sent_count - activeCampaign.delivered_count) / Math.max(1, activeCampaign.total_contacts)) * 100))}%` }} 
                    title={`${t('sent')}: ${activeCampaign.sent_count}`}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((activeCampaign.failed_count / Math.max(1, activeCampaign.total_contacts)) * 100))}%` }} 
                    title={`${t('failed')}: ${activeCampaign.failed_count}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS & TELEMETRY SECTION */}
          <div className="w-full px-8 py-8 space-y-6 flex flex-col min-h-0 flex-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* CARD 1: TARGETED */}
            <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 select-none">
                  <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{t('targeted')}</span>
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-[#0A0A0A]">
                    {activeCampaign.total_contacts}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-[#6B6B6B] font-semibold">
                <span>{t('wizard.audienceTarget')}</span>
                <span className="text-[#0A0A0A] font-bold">100%</span>
              </div>
            </div>

            {/* CARD 2: SENT */}
            <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 select-none">
                  <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{t('sent')}</span>
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                    <Send className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-[#0A0A0A]">
                    {activeCampaign.sent_count}
                  </span>
                </div>
              </div>
              <div>
                {(() => {
                  const sentPercent = activeCampaign.total_contacts > 0 ? Math.round((activeCampaign.sent_count / activeCampaign.total_contacts) * 100) : 0;
                  return (
                    <div className="mt-4 pt-3 border-t border-zinc-100">
                      <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] font-semibold mb-1.5">
                        <span>{t('dispatchRate')}</span>
                        <span className="text-[#0A0A0A] font-bold">{sentPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${sentPercent}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* CARD 3: DELIVERED */}
            {(() => {
              const deliveredPercent = activeCampaign.total_contacts > 0 ? Math.round((activeCampaign.delivered_count / activeCampaign.total_contacts) * 100) : 0;
              return (
                <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 select-none">
                      <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{t('delivered')}</span>
                      <div className="h-7 w-7 rounded-lg bg-[#E8FDE8] text-emerald-700 flex items-center justify-center">
                        <CheckCheck className="h-3.5 w-3.5 text-[#3DD43D]" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-4xl font-black tracking-tight text-[#0A0A0A]">
                        {deliveredPercent}
                      </span>
                      <sup className="text-lg font-black text-[#0A0A0A] align-super">%</sup>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] font-semibold mb-1.5">
                      <span>{activeCampaign.delivered_count} {t('delivered')}</span>
                      <span className="text-emerald-700 font-bold">{deliveredPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4AE54A] rounded-full" style={{ width: `${deliveredPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CARD 4: FAILED */}
            <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 select-none">
                  <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{t('failed')}</span>
                  <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-[#0A0A0A]">
                    {activeCampaign.failed_count}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] font-semibold mb-1.5">
                  <span>{t('errorCount')}</span>
                  <span className="text-rose-650 font-bold">{activeCampaign.failed_count > 0 ? activeCampaign.failed_count : 0}</span>
                </div>
                <div className="h-1.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF4444] rounded-full" style={{ width: activeCampaign.total_contacts > 0 ? `${Math.min(100, (activeCampaign.failed_count / activeCampaign.total_contacts) * 100)}%` : '0%' }} />
                </div>
              </div>
            </div>

          </div>

          {/* RECHARTS DATA VISUALIZATION SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* AREA CHART: DISPATCH FUNNEL METRICS */}
            <div className="lg:col-span-2 bg-white border border-[#E8E8E6] rounded-[12px] p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-6 select-none">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">{t('dispatchFunnel')}</h3>
                  <p className="text-xs text-[#6B6B6B] font-semibold mt-0.5">{t('dispatchFunnelDesc')}</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-[#6B6B6B]">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0A0A0A]" /> {t('funnelSent')}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#4AE54A]" /> {t('funnelDelivered')}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF4444]" /> {t('funnelErrors')}</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { stage: t('stageTargeted') || 'Targeted', Volume: activeCampaign.total_contacts, Delivered: 0, Errors: 0 },
                      { stage: t('stageSent') || 'Sent', Volume: activeCampaign.sent_count, Delivered: 0, Errors: 0 },
                      { stage: t('stageDelivered') || 'Delivered', Volume: activeCampaign.sent_count, Delivered: activeCampaign.delivered_count, Errors: activeCampaign.failed_count },
                      { stage: t('stageCompleted') || 'Completed', Volume: activeCampaign.sent_count, Delivered: activeCampaign.delivered_count, Errors: activeCampaign.failed_count },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4AE54A" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4AE54A" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0EE" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#6B6B6B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6B6B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600 }} 
                    />
                    <Area type="monotone" dataKey="Volume" stroke="#0A0A0A" strokeWidth={2} fillOpacity={1} fill="url(#volumeGrad)" />
                    <Area type="monotone" dataKey="Delivered" stroke="#4AE54A" strokeWidth={2.5} fillOpacity={1} fill="url(#deliveredGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RADIAL GAUGE CHART: DELIVERY SUCCESS RATE */}
            <div className="bg-white border border-[#E8E8E6] rounded-[12px] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 select-none">
                  <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">{t('successRatio')}</h3>
                  <span className="text-xs text-[#6B6B6B] font-bold uppercase">{activeCampaign.total_contacts} {tContacts('total')}</span>
                </div>
                <p className="text-xs text-[#6B6B6B] font-semibold">{t('deliveryVsExceptionRatio')}</p>
              </div>

              {(() => {
                const total = activeCampaign.total_contacts || 1;
                const deliveredPct = Math.round((activeCampaign.delivered_count / total) * 100);
                const failedPct = Math.round((activeCampaign.failed_count / total) * 100);
                const pendingPct = Math.max(0, 100 - (deliveredPct + failedPct));

                const pieData = [
                  { name: t('delivered'), value: activeCampaign.delivered_count || (activeCampaign.status === 'completed' && activeCampaign.failed_count === 0 ? 1 : 0), color: '#4AE54A' },
                  { name: t('failed'), value: activeCampaign.failed_count, color: '#FF4444' },
                  { name: t('queued') || 'Pending', value: Math.max(0, activeCampaign.total_contacts - (activeCampaign.delivered_count + activeCampaign.failed_count)), color: '#E8E8E6' },
                ];

                return (
                  <div className="my-4 flex flex-col items-center justify-center relative">
                    <div className="h-40 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-3xl font-black text-[#0A0A0A]">{deliveredPct}%</span>
                      <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">{t('delivered')}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-center text-xs font-semibold select-none">
                <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">{t('delivered')}</span>
                  <span className="text-emerald-950 font-black text-sm">{activeCampaign.delivered_count}</span>
                </div>
                <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-rose-800 font-bold uppercase block">{t('exceptions')}</span>
                  <span className="text-rose-950 font-black text-sm">{activeCampaign.failed_count}</span>
                </div>
              </div>
            </div>

          </div>

          {/* DISPATCH ERROR LOG REPORT IF FAILED */}
          {activeCampaign.error_log && (
            <div className="p-4 bg-rose-50 border border-rose-250/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">{t('activeMonitor')}</h4>
                <p className="text-xs text-rose-700 mt-1 font-semibold">{activeCampaign.error_log}</p>
              </div>
            </div>
          )}

          {/* COMPOSED MESSAGE CONTENT CARD (IF APPLICABLE) */}
          {(activeCampaign.source_type === 'compose' || activeCampaign.source_type === 'custom') && (activeCampaign.custom_message || activeCampaign.media_url) && (
            <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] space-y-4 select-none">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-zinc-700" />
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('customMessage') || 'Custom Composed Message'}</h3>
                </div>
                {activeCampaign.custom_subject && (
                  <span className="text-xs font-semibold text-zinc-500">
                    {tContacts('subject') || 'Subject'}: <strong className="text-zinc-800 font-bold">{activeCampaign.custom_subject}</strong>
                  </span>
                )}
              </div>

              {/* Attached Media */}
              {activeCampaign.media_url && (
                <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 max-w-sm">
                  <img 
                    src={activeCampaign.media_url} 
                    alt={t('attachment') || 'Media Attachment'} 
                    className="w-full h-44 object-cover" 
                  />
                </div>
              )}

              {/* Message Body */}
              {activeCampaign.custom_message && (
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-[8px]">
                  <p className="text-xs text-zinc-700 whitespace-pre-wrap font-medium leading-relaxed">
                    {activeCampaign.custom_message}
                  </p>
                </div>
              )}

              {/* CTA Button */}
              {activeCampaign.cta_button_text && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-semibold uppercase text-[10px]">{t('actionButton')}</span>
                  <a
                    href={activeCampaign.cta_button_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-[6px] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-black shadow-3xs"
                  >
                    <span>{activeCampaign.cta_button_text}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* DISPATCH AUDIT LOGS TABLE */}
          <div className="border border-[#E8E8E6] bg-white rounded-[10px] overflow-hidden shadow-[var(--shadow-card)]">
            <div className="p-4 border-b border-[#E8E8E6] bg-[#FAFAFA] flex items-center justify-between select-none">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('dispatches')}</h3>
              <span className="text-[9.5px] text-zinc-500 font-bold uppercase">{dispatchesTotal} {t('dispatches')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none bg-white">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-4">{tContacts('firstName')}</th>
                    <th className="px-6 py-4">{tContacts('phone')} / {tContacts('email')}</th>
                    <th className="px-6 py-4">{t('status')}</th>
                    <th className="px-6 py-4">{t('errorLogs')}</th>
                    <th className="px-6 py-4 text-right">{t('scheduleTime')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                  {dispatches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-semibold uppercase select-none">
                        {t('noDispatches')}
                      </td>
                    </tr>
                  ) : (
                    dispatches.map((d) => (
                      <tr key={d.id} className="hover:bg-[#FAFAFA]/40 transition-all font-semibold">
                        <td className="px-6 py-4 font-bold text-xs text-black">
                          {d.contact ? [d.contact.first_name, d.contact.last_name].filter(Boolean).join(' ') : tContacts('unnamedContact')}
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-500">
                          {d.contact?.phone || d.contact?.email || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const status = d.status.toLowerCase();
                            if (status === 'replied') {
                              return (
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-[#E8FDE8] border-accent-green/20 text-emerald-800">
                                  {t('replied')}
                                </span>
                              );
                            }
                            if (status === 'read') {
                              return (
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-150 text-emerald-700">
                                  {t('read')}
                                </span>
                              );
                            }
                            if (status === 'delivered' || status === 'sent') {
                              return (
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-blue-50 border-blue-150 text-blue-700">
                                  {t('delivered')}
                                </span>
                              );
                            }
                            if (status === 'queued') {
                              return (
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-zinc-50 border-zinc-200 text-zinc-650">
                                  {t('queued') || 'Queued'}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-rose-50 border-rose-200 text-rose-800">
                                {t('failed')}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-rose-650 max-w-xs truncate">
                          {d.error_message || '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] text-zinc-500 font-semibold uppercase">
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* AUDIT LOG PAGINATION FOOTER */}
            {dispatchesLastPage > 1 && (
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-4 flex items-center justify-between text-xs text-[#6B6B6B] select-none font-semibold">
                <span>{t('showingDispatchesPage', { current: dispatchesPage, total: dispatchesLastPage })}</span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={dispatchesPage === 1}
                    onClick={() => loadCampaignDetails(activeCampaign.id, dispatchesPage - 1)}
                    className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-[10px] font-bold uppercase select-none disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    {t('prev')}
                  </button>
                  <button 
                    disabled={dispatchesPage === dispatchesLastPage}
                    onClick={() => loadCampaignDetails(activeCampaign.id, dispatchesPage + 1)}
                    className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-[10px] font-bold uppercase select-none disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* PORTAL DIALOG: DELETE CONFIRMATION PORTAL */}
      {deleteConfirmOpen && createPortal(
        <div 
          onClick={() => setDeleteConfirmOpen(false)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('confirmDelete')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={t('closeDialog') || 'Close dialog'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteWarning')}
              </p>
            </div>

            {/* Footer Buttons Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={executeDeleteCampaign}
                className="bg-red-650 hover:bg-red-750 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer h-9 px-4 flex items-center justify-center disabled:opacity-50"
              >
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
