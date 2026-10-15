/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  Target,
  Plus,
  Search,
  Trash2,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Layers,
  Globe,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Workflow,
  Building2,
  MousePointer,
  Eye,
  Pencil,
  Zap,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  SlidersHorizontal,
  Heart,
  Bookmark,
  Info,
  ShieldCheck,
  Image as ImageIcon,
  CheckCheck,
  Send,
  BarChart3,
  Sliders,
  Upload,
  Link as LinkIcon,
  Loader2,
  Video,
  Copy,
  ExternalLink,
  Filter,
  Activity,
  Maximize2,
  Calendar,
  MapPin,
  UserCheck,
  Radio,
  Tv,
  Share2,
  Unlink,
  UploadCloud
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  AdAccount,
  Campaign,
  AdSet,
  Ad,
  SummaryKPIs,
  FlowOption,
  ChannelOption,
  MiniBarSparkline,
  MiniAreaSparkline,
  MiniGauge
} from './metaAdsTypes';

const MetaAdsAnalyticsTab = dynamic(
  () => import('./components/MetaAdsAnalyticsTab'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <SimpleLoader />
      </div>
    )
  }
);

const MetaAdsInspectorDrawer = dynamic(
  () => import('./components/MetaAdsInspectorDrawer'),
  { ssr: false }
);

export default function MetaAdsPage() {
  const t = useTranslations('MetaAds');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // State Management
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads' | 'accounts' | 'analytics' | 'leads'>(() => {
    if (tabParam && ['campaigns', 'adsets', 'ads', 'accounts', 'analytics', 'leads'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'campaigns';
  });

  // Keep activeTab in sync with URL searchParams from Sidebar clicks
  useEffect(() => {
    if (tabParam && ['campaigns', 'adsets', 'ads', 'accounts', 'analytics', 'leads'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else if (!tabParam) {
      setActiveTab('campaigns');
    }
  }, [tabParam]);

  // Filters & Account
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [summary, setSummary] = useState<SummaryKPIs>({
    total_spend: 0,
    total_reach: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_conversations: 0,
    total_leads: 0,
    total_purchases: 0,
    avg_ctr: 0,
    avg_cpc: 0,
    avg_cpm: 0,
    avg_cpr: 0,
    active_campaigns_count: 0,
    total_campaigns_count: 0,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const [whatsappChannels, setWhatsappChannels] = useState<ChannelOption[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{
    timeseries: Array<{
      date: string;
      label: string;
      spend: number;
      conversations: number;
      clicks: number;
      impressions: number;
      reach: number;
      leads: number;
    }>;
    campaigns: Array<{
      id: number;
      name: string;
      status: string;
      objective: string;
      spend: number;
      conversations: number;
      clicks: number;
      impressions: number;
      leads: number;
      cpr: number;
      ctr: number;
    }>;
    destination_breakdown: Array<{
      key: string;
      name: string;
      count: number;
      share: number;
    }>;
    funnel: Array<{
      stage: string;
      count: number;
      label: string;
      conversion_rate: number;
      rate_label: string;
    }>;
    summary: {
      spend: number;
      conversations: number;
      clicks: number;
      impressions: number;
      reach: number;
      leads: number;
      cpr: number;
      ctr: number;
      cpc: number;
    };
  }>({
    timeseries: [],
    campaigns: [],
    destination_breakdown: [],
    funnel: [],
    summary: { spend: 0, conversations: 0, clicks: 0, impressions: 0, reach: 0, leads: 0, cpr: 0, ctr: 0, cpc: 0 }
  });

  const [analyticsMetric, setAnalyticsMetric] = useState<'convs_spend' | 'clicks_impressions' | 'cpr_efficiency'>('convs_spend');

  const { setCustomHeader } = useHeaderStore();
  const [view, setView] = useState<'list' | 'create'>('list');

  // Drill-Down Filter State (Campaign -> Ad Set -> Ads)
  const [filterCampaignId, setFilterCampaignId] = useState<number | null>(null);
  const [filterCampaignName, setFilterCampaignName] = useState<string>('');
  const [filterAdSetId, setFilterAdSetId] = useState<number | null>(null);
  const [filterAdSetName, setFilterAdSetName] = useState<string>('');

  // Official Meta Inspector Drawer States
  const [inspectedEntity, setInspectedEntity] = useState<{
    type: 'campaign' | 'adset' | 'ad';
    id: number;
    data?: any;
  } | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorCopiedId, setInspectorCopiedId] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'specs' | 'targeting' | 'creative' | 'children' | 'leads' | 'telemetry' | 'flow'>('specs');
  const [inspectorPreviewPlatform, setInspectorPreviewPlatform] = useState<'instagram' | 'facebook' | 'whatsapp'>('instagram');
  const [inspectorCtaClicked, setInspectorCtaClicked] = useState(false);

  // Modal States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: number; name: string; type: 'campaign' | 'account' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Wizard Navigation States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false);
  const [publishingCampaignId, setPublishingCampaignId] = useState<number | null>(null);
  const [editingDraftData, setEditingDraftData] = useState<{ id: number; name: string; daily_budget: string; objective: string } | null>(null);
  const [isSavingDraftEdit, setIsSavingDraftEdit] = useState(false);
  const [editingDraftModalCampaign, setEditingDraftModalCampaign] = useState<Campaign | null>(null);
  const [draftForm, setDraftForm] = useState<{
    name: string;
    objective: string;
    daily_budget: string;
    budget_mode: 'CBO' | 'ABO';
  }>({
    name: '',
    objective: 'MESSAGES',
    daily_budget: '25',
    budget_mode: 'ABO',
  });
  const [isSavingDraftModal, setIsSavingDraftModal] = useState(false);
  const [wizardPreviewPlatform, setWizardPreviewPlatform] = useState<'instagram' | 'facebook' | 'stories' | 'whatsapp'>('instagram');

  // Wizard Data: Step 1 Campaign
  const [formCampaignName, setFormCampaignName] = useState('WhatsApp Lead Acquisition Promo');
  const [formObjective, setFormObjective] = useState('MESSAGES');
  const [formSpecialCategory, setFormSpecialCategory] = useState(false);
  const [formSpecialCategoryType, setFormSpecialCategoryType] = useState('NONE');
  const [formBudgetMode, setFormBudgetMode] = useState<'CBO' | 'ABO'>('CBO');
  const [formDailyBudget, setFormDailyBudget] = useState('25.00');

  // Wizard Step 2: Ad Set & Targeting
  const [formAdSetName, setFormAdSetName] = useState('Tier-1 Inbound Buyers (18-50)');
  const [formDestination, setFormDestination] = useState('WHATSAPP');
  const [formSelectedPhone, setFormSelectedPhone] = useState('');
  const [formLocations, setFormLocations] = useState('US, GB, CA, AE, SA');
  const [formAgeMin, setFormAgeMin] = useState(21);
  const [formAgeMax, setFormAgeMax] = useState(55);
  const [formGender, setFormGender] = useState('ALL');
  const [formInterests, setFormInterests] = useState(['E-commerce', 'Online Shopping', 'WhatsApp Marketing']);
  const [interestInput, setInterestInput] = useState('');
  const [formPlacementType, setFormPlacementType] = useState<'ADVANTAGE' | 'MANUAL'>('ADVANTAGE');

  // Wizard Step 3: Creative & Automation Flow
  const [formAdName, setFormAdName] = useState('Direct Chat Offer Ad #1');
  const [formPrimaryText, setFormPrimaryText] = useState('Unlock direct VIP customer support and claim your exclusive 20% discount on WhatsApp now!');
  const [formHeadline, setFormHeadline] = useState('Chat With Our Team on WhatsApp');
  const [formDescription, setFormDescription] = useState('Instant automated replies & special offers');
  const [formCtaType, setFormCtaType] = useState('WHATSAPP_MESSAGE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [creativeMediaTab, setCreativeMediaTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const [formWelcomeMessage, setFormWelcomeMessage] = useState('Hi! I saw your ad on Instagram and would like to learn more.');
  const [formLinkedFlowId, setFormLinkedFlowId] = useState<string>('');

  // Connect Account Form
  const [connectAccountId, setConnectAccountId] = useState('');
  const [connectAccountName, setConnectAccountName] = useState('');
  const [connectToken, setConnectToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Dashboard Data
  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('ad_account_id', selectedAccountId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('tab', activeTab);
      params.append('days', timeRange.toString());

      if (activeTab === 'adsets' && filterCampaignId) {
        params.append('campaign_id', filterCampaignId.toString());
      }
      if (activeTab === 'ads') {
        if (filterAdSetId) {
          params.append('ad_set_id', filterAdSetId.toString());
        } else if (filterCampaignId) {
          params.append('campaign_id', filterCampaignId.toString());
        }
      }

      const res = await fetchWithCsrf(`/meta-ads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary || summary);
        setAccounts(json.accounts || []);
        if (json.active_account && !selectedAccountId) {
          setSelectedAccountId(String(json.active_account.id));
        }
        setFlows(json.flows || []);
        setWhatsappChannels(json.whatsapp_channels || []);
        if (json.whatsapp_channels?.length > 0 && !formSelectedPhone) {
          setFormSelectedPhone(json.whatsapp_channels[0].phone_number || '');
        }

        if (activeTab === 'campaigns') {
          setCampaigns(json.data?.data || json.data || []);
        } else if (activeTab === 'adsets') {
          setAdSets(json.data?.data || json.data || []);
        } else if (activeTab === 'ads') {
          setAds(json.data?.data || json.data || []);
        } else if (activeTab === 'accounts') {
          setAccounts(json.data?.data || json.data || json.accounts || []);
        }
      }
    } catch {
      toast.error(t('toastLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load Analytics Data
  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('ad_account_id', selectedAccountId);
      params.append('days', timeRange.toString());

      const res = await fetchWithCsrf(`/meta-ads/analytics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch {
      console.error('Failed to load analytics');
    }
  };

  // Load Leads Data
  const loadLeads = async () => {
    try {
      const res = await fetchWithCsrf('/meta-ads/leads');
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || json || []);
      }
    } catch {
      console.error('Failed to load leads');
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
      if (activeTab === 'analytics') {
        loadAnalytics();
      } else if (activeTab === 'leads') {
        loadLeads();
      }
    }
  }, [mounted, activeTab, selectedAccountId, statusFilter, timeRange, filterCampaignId, filterAdSetId]);

  // Drill Navigation Handlers
  const handleDrillCampaignToAdSets = (campaignId: number, campaignName: string) => {
    setFilterCampaignId(campaignId);
    setFilterCampaignName(campaignName);
    setFilterAdSetId(null);
    setFilterAdSetName('');
    setActiveTab('adsets');
    router.push('/meta-ads?tab=adsets');
  };

  const handleDrillAdSetToAds = (adSetId: number, adSetName: string, campaignId?: number, campaignName?: string) => {
    setFilterAdSetId(adSetId);
    setFilterAdSetName(adSetName);
    if (campaignId && campaignName) {
      setFilterCampaignId(campaignId);
      setFilterCampaignName(campaignName);
    }
    setActiveTab('ads');
    router.push('/meta-ads?tab=ads');
  };

  const clearDrillFilters = () => {
    setFilterCampaignId(null);
    setFilterCampaignName('');
    setFilterAdSetId(null);
    setFilterAdSetName('');
  };

  // Official Meta Inspector Handler (Fetches 100% Real Graph Object Data)
  const handleInspectEntity = async (type: 'campaign' | 'adset' | 'ad', id: number, initialData?: any) => {
    setInspectedEntity({ type, id, data: initialData || null });
    setInspectorLoading(true);
    setInspectorCtaClicked(false);
    setInspectorTab(type === 'ad' ? 'creative' : type === 'adset' ? 'targeting' : 'specs');
    try {
      let endpoint = '';
      if (type === 'campaign') endpoint = `/meta-ads/campaigns/${id}`;
      else if (type === 'adset') endpoint = `/meta-ads/ad-sets/${id}`;
      else if (type === 'ad') endpoint = `/meta-ads/ads/${id}`;

      const res = await fetchWithCsrf(endpoint);
      if (res.ok) {
        const json = await res.json();
        const entityData = json.campaign || json.ad_set || json.ad || json;
        setInspectedEntity({ type, id, data: entityData });
      }
    } catch (err) {
      console.error('Failed to load official Meta details:', err);
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleCopyMetaId = (textToCopy: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setInspectorCopiedId(true);
      toast.success('Meta Object ID copied to clipboard');
      setTimeout(() => setInspectorCopiedId(false), 2000);
    }
  };

  // Sync Telemetry from Meta
  const handleSyncMeta = async () => {
    setSyncing(true);
    try {
      const res = await fetchWithCsrf('/meta-ads/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        toast.success(t('syncSuccess'));
        loadData();
        if (activeTab === 'analytics') loadAnalytics();
      } else {
        toast.error(json.message || t('toastLoadFailed'));
      }
    } catch {
      toast.error(t('toastLoadFailed'));
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Entity Status (Campaign, AdSet, Ad)
  const handleToggleStatus = async (type: 'campaign' | 'adset' | 'ad', id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      let endpoint = `/meta-ads/campaigns/${id}`;
      if (type === 'adset') endpoint = `/meta-ads/ad-sets/${id}`;
      if (type === 'ad') endpoint = `/meta-ads/ads/${id}`;

      const res = await fetchWithCsrf(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        toast.success(t('campaignUpdatedSuccess'));
        if (type === 'campaign') {
          setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
        } else if (type === 'adset') {
          setAdSets(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
        } else if (type === 'ad') {
          setAds(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
        }
      } else {
        toast.error(t('toastErrorStatus'));
      }
    } catch {
      toast.error(t('toastErrorStatus'));
    }
  };

  // Set Default Ad Account
  const handleSetDefaultAccount = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/meta-ads/accounts/${id}/default`, {
        method: 'PATCH'
      });
      if (res.ok) {
        toast.success('Default Meta Ad Account updated.');
        setSelectedAccountId(String(id));
        loadData();
      } else {
        toast.error('Failed to update default account.');
      }
    } catch {
      toast.error('Failed to update default account.');
    }
  };

  // Delete Campaign or Disconnect Account
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmItem.type === 'campaign') {
        const res = await fetchWithCsrf(`/meta-ads/campaigns/${deleteConfirmItem.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          toast.success(t('campaignDeletedSuccess') || 'Campaign archived.');
          setCampaigns(prev => prev.filter(c => c.id !== deleteConfirmItem.id));
          setDeleteConfirmItem(null);
          loadData();
        } else {
          toast.error(t('toastErrorStatus'));
        }
      } else if (deleteConfirmItem.type === 'account') {
        const res = await fetchWithCsrf(`/meta-ads/accounts/${deleteConfirmItem.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          toast.success('Meta Ad Account unlinked successfully.');
          setDeleteConfirmItem(null);
          loadData();
        } else {
          toast.error('Failed to unlink Ad Account.');
        }
      }
    } catch {
      toast.error(t('toastErrorStatus'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Connect Ad Account
  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = connectAccountId.trim();
    const cleanName = connectAccountName.trim();
    if (!cleanId || !cleanName) {
      toast.error(t('toastFillAllFields'));
      return;
    }
    setIsConnecting(true);
    try {
      const res = await fetchWithCsrf('/meta-ads/accounts', {
        method: 'POST',
        body: JSON.stringify({
          meta_ad_account_id: cleanId,
          account_name: cleanName,
          access_token: connectToken.trim() || null,
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(t('accountConnectedSuccess'));
        setShowConnectModal(false);
        setConnectAccountId('');
        setConnectAccountName('');
        setConnectToken('');
        if (json.account?.id) {
          setSelectedAccountId(String(json.account.id));
        }
        loadData();
      } else {
        toast.error(json.message || t('toastErrorConnecting'));
      }
    } catch {
      toast.error(t('toastErrorConnecting'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Step Completion Trackers
  const isStep1Complete = completedSteps.includes(1) && Boolean(selectedAccountId && formCampaignName.trim() && parseFloat(formDailyBudget || '0') > 0);
  const isStep2Complete = completedSteps.includes(2) && Boolean(formLocations.trim());
  const isStep3Complete = completedSteps.includes(3) && Boolean(formHeadline.trim() && formPrimaryText.trim() && formImageUrl.trim());

  // Step Validation Helper
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!selectedAccountId) {
        toast.error('Please select a Meta Ad Account.');
        return false;
      }
      if (!formCampaignName.trim()) {
        toast.error(t('campaignNamePlaceholder') || 'Please enter a campaign name.');
        return false;
      }
      if (!formDailyBudget || parseFloat(formDailyBudget) <= 0) {
        toast.error('Please enter a valid daily budget.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formLocations.trim()) {
        toast.error(t('targetLocationsPlaceholder') || 'Please specify target locations.');
        return false;
      }
      if (formDestination === 'WHATSAPP' && whatsappChannels.length > 0 && !formSelectedPhone) {
        toast.error('Please select a WhatsApp number.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!formHeadline.trim()) {
        toast.error('Please enter an ad headline.');
        return false;
      }
      if (!formPrimaryText.trim()) {
        toast.error('Please enter primary caption text.');
        return false;
      }
      if (!formImageUrl.trim()) {
        toast.error('Please specify creative media image/video URL.');
        return false;
      }
      return true;
    }
    return true;
  };

  const navigateToStep = (targetStep: number) => {
    if (targetStep === wizardStep) return;
    if (targetStep < wizardStep) {
      setWizardStep(targetStep as 1 | 2 | 3);
      return;
    }
    for (let s = 1; s < targetStep; s++) {
      if (!validateStep(s)) {
        setWizardStep(s as 1 | 2 | 3);
        return;
      }
      setCompletedSteps(prev => Array.from(new Set([...prev, s])));
    }
    setWizardStep(targetStep as 1 | 2 | 3);
  };

  const handleStepAdvance = (step: number) => {
    navigateToStep(step + 1);
  };

  const handleOpenCreateCampaign = () => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
      if (defaultAcc) setSelectedAccountId(String(defaultAcc.id));
    }
    setWizardStep(1);
    setCompletedSteps([]);
    setView('create');
  };

  // Submit 3-in-1 Campaign Wizard (Draft or Publish Live)
  const handlePublishCampaign = async (targetStatus: 'ACTIVE' | 'DRAFT' = 'ACTIVE') => {
    if (!selectedAccountId) {
      toast.error(t('toastErrorConnecting') || 'Please select an ad account');
      return;
    }
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmittingWizard(true);
    try {
      const payload = {
        meta_ad_account_id: Number(selectedAccountId),
        name: formCampaignName.trim(),
        objective: formObjective,
        budget_mode: formBudgetMode,
        daily_budget: parseFloat(formDailyBudget) || 20.00,
        
        adset_name: formAdSetName.trim() || `${formCampaignName} - Ad Set`,
        destination_type: formDestination,
        whatsapp_phone_number: formSelectedPhone,
        adset_daily_budget: parseFloat(formDailyBudget) || 15.00,
        targeting_spec: {
          locations: formLocations.split(',').map(s => s.trim()).filter(Boolean),
          age_min: formAgeMin,
          age_max: formAgeMax,
          gender: formGender,
          interests: formInterests,
        },
        placements_spec: {
          advantage_plus: formPlacementType === 'ADVANTAGE',
        },

        ad_name: formAdName.trim() || `${formCampaignName} - Creative`,
        primary_text: formPrimaryText.trim(),
        headline: formHeadline.trim(),
        description: formDescription.trim() || null,
        cta_type: formCtaType,
        media_urls: [formImageUrl],
        welcome_message: formWelcomeMessage.trim(),
        linked_flow_id: formLinkedFlowId ? Number(formLinkedFlowId) : null,
        status: targetStatus,
      };

      const res = await fetchWithCsrf('/meta-ads/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(targetStatus === 'DRAFT' ? 'Campaign saved as draft successfully!' : (t('campaignCreatedSuccess') || 'Campaign created and published successfully!'));
        setView('list');
        setWizardStep(1);
        setCompletedSteps([]);
        setActiveTab('campaigns');
        router.push('/meta-ads?tab=campaigns');
        loadData();
      } else {
        toast.error(json.message || t('toastErrorStatus'));
      }
    } catch {
      toast.error(t('toastErrorStatus'));
    } finally {
      setIsSubmittingWizard(false);
    }
  };

  // Publish a Draft Campaign to Meta Graph API
  const handlePublishDraftCampaign = async (campaignId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPublishingCampaignId(campaignId);
    try {
      const res = await fetchWithCsrf(`/meta-ads/campaigns/${campaignId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || 'Campaign published successfully to Meta!');
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'ACTIVE' } : c));
        if (inspectedEntity && inspectedEntity.id === campaignId) {
          setInspectedEntity((prev: any) => prev ? { ...prev, data: { ...prev.data, status: 'ACTIVE' } } : null);
        }
        loadData();
      } else {
        toast.error(json.message || 'Failed to publish campaign to Meta.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish campaign to Meta.');
    } finally {
      setPublishingCampaignId(null);
    }
  };

  // Save inline edit for draft campaign
  const handleSaveDraftEdit = async () => {
    if (!editingDraftData) return;
    setIsSavingDraftEdit(true);
    try {
      const res = await fetchWithCsrf(`/meta-ads/campaigns/${editingDraftData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingDraftData.name.trim(),
          daily_budget: parseFloat(editingDraftData.daily_budget) || 25,
          objective: editingDraftData.objective,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Campaign draft updated successfully.');
        setCampaigns(prev => prev.map(c => c.id === editingDraftData.id ? { 
          ...c, 
          name: editingDraftData.name, 
          daily_budget: parseFloat(editingDraftData.daily_budget) || c.daily_budget, 
          objective: editingDraftData.objective 
        } : c));
        if (inspectedEntity && inspectedEntity.id === editingDraftData.id) {
          setInspectedEntity((prev: any) => prev ? {
            ...prev,
            data: {
              ...prev.data,
              name: editingDraftData.name,
              daily_budget: parseFloat(editingDraftData.daily_budget) || prev.data?.daily_budget,
              objective: editingDraftData.objective
            }
          } : null);
        }
        setEditingDraftData(null);
      } else {
        toast.error(json.message || 'Failed to update campaign draft.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update campaign draft.');
    } finally {
      setIsSavingDraftEdit(false);
    }
  };

  // Open dedicated Edit Draft Campaign Modal
  const handleOpenEditDraftModal = (campaign: Campaign, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDraftModalCampaign(campaign);
    setDraftForm({
      name: campaign.name || '',
      objective: campaign.objective || 'MESSAGES',
      daily_budget: String(campaign.daily_budget || 25),
      budget_mode: campaign.budget_mode || 'ABO',
    });
  };

  // Save changes from Edit Draft Campaign Modal (optionally publish immediately)
  const handleSaveDraftModal = async (publishAfter = false) => {
    if (!editingDraftModalCampaign) return;
    if (!draftForm.name.trim()) {
      toast.error('Campaign name is required.');
      return;
    }
    const campaignId = editingDraftModalCampaign.id;
    setIsSavingDraftModal(true);
    try {
      const res = await fetchWithCsrf(`/meta-ads/campaigns/${campaignId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: draftForm.name.trim(),
          daily_budget: parseFloat(draftForm.daily_budget) || 25,
          objective: draftForm.objective,
          budget_mode: draftForm.budget_mode,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(publishAfter ? 'Draft saved. Publishing to Meta...' : 'Draft campaign updated successfully.');
        setCampaigns(prev => prev.map(c => c.id === campaignId ? {
          ...c,
          name: draftForm.name.trim(),
          daily_budget: parseFloat(draftForm.daily_budget) || c.daily_budget,
          objective: draftForm.objective,
          budget_mode: draftForm.budget_mode,
        } : c));
        if (inspectedEntity && inspectedEntity.id === campaignId) {
          setInspectedEntity((prev: any) => prev ? {
            ...prev,
            data: {
              ...prev.data,
              name: draftForm.name.trim(),
              daily_budget: parseFloat(draftForm.daily_budget) || prev.data?.daily_budget,
              objective: draftForm.objective,
              budget_mode: draftForm.budget_mode,
            }
          } : null);
        }
        setEditingDraftModalCampaign(null);
        if (publishAfter) {
          handlePublishDraftCampaign(campaignId);
        }
      } else {
        toast.error(json.message || 'Failed to update draft campaign.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update draft campaign.');
    } finally {
      setIsSavingDraftModal(false);
    }
  };

  // Add Interest Chip
  const handleAddInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if ('preventDefault' in e) e.preventDefault();
    const val = interestInput.trim();
    if (val && !formInterests.includes(val)) {
      setFormInterests([...formInterests, val]);
      setInterestInput('');
    }
  };

  // Remove Interest Chip
  const handleRemoveInterest = (interest: string) => {
    setFormInterests(formInterests.filter(i => i !== interest));
  };

  // Upload Creative Media File (Image/Video)
  const handleMediaUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds 100MB limit.');
      return;
    }
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchWithCsrf('/meta-ads/upload-media', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.url) {
        setFormImageUrl(json.url);
        toast.success('Media uploaded successfully!');
      } else {
        toast.error(json.message || 'Media upload failed.');
      }
    } catch {
      toast.error('Failed to upload media file.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Stock Creative Presets
  const stockCreatives = [
    {
      title: 'Customer Support',
      url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
      category: 'Support'
    },
    {
      title: 'Retail Storefront',
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
      category: 'E-commerce'
    },
    {
      title: 'Mobile Shopping',
      url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
      category: 'Mobile'
    },
    {
      title: 'Tech Hardware',
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      category: 'Products'
    },
    {
      title: 'Modern Workspace',
      url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80',
      category: 'Agency'
    }
  ];

  // Geo Region Presets
  const geoPresets = [
    { label: 'Tier-1 Global', codes: 'US, GB, CA, AU, DE' },
    { label: 'GCC / Middle East', codes: 'AE, SA, QA, KW, BH' },
    { label: 'European Union', codes: 'DE, FR, ES, IT, NL' },
    { label: 'South Asia', codes: 'IN, PK, BD, LK' },
    { label: 'LATAM', codes: 'BR, MX, CO, AR' },
  ];

  // Quick Interest Suggestions
  const suggestedInterests = [
    'E-commerce',
    'Online Shopping',
    'WhatsApp Marketing',
    'Small Business',
    'Luxury Goods',
    'Direct Marketing',
    'Lead Generation',
    'SaaS & Software',
    'Fashion & Apparel',
    'Digital Advertising'
  ];

  const toggleSuggestedInterest = (interest: string) => {
    if (formInterests.includes(interest)) {
      setFormInterests(formInterests.filter(i => i !== interest));
    } else {
      setFormInterests([...formInterests, interest]);
    }
  };

  // Dropdown Options
  const accountOptions = useMemo(() => {
    return accounts.map(a => ({
      value: String(a.id),
      label: `${a.account_name} (${a.currency})`
    }));
  }, [accounts]);

  const statusOptions = [
    { value: 'all', label: t('allStatuses') },
    { value: 'DRAFT', label: 'Drafts' },
    { value: 'ACTIVE', label: t('statusActive') },
    { value: 'PAUSED', label: t('statusPaused') },
    { value: 'ARCHIVED', label: t('statusArchived') },
  ];

  const timeOptions = [
    { value: '7', label: t('timeRange7d') },
    { value: '30', label: t('timeRange30d') },
    { value: '90', label: t('timeRange90d') },
  ];

  const flowOptions = useMemo(() => {
    const list = [{ value: '', label: t('noFlowSelected') || 'None (Direct Inbox Reply)' }];
    flows.forEach(f => {
      list.push({ value: String(f.id), label: `${f.name} (Active Flow)` });
    });
    return list;
  }, [flows, t]);

  const destinationOptions = useMemo(() => [
    { value: 'WHATSAPP', label: t('destinationWhatsApp') || 'WhatsApp Business' },
    { value: 'MESSENGER', label: t('destinationMessenger') || 'Facebook Messenger' },
    { value: 'INSTAGRAM_DIRECT', label: t('destinationInstagram') || 'Instagram Direct' },
  ], [t]);

  const whatsappPhoneOptions = useMemo(() => {
    if (whatsappChannels.length === 0) {
      return [{ value: '', label: 'No WhatsApp Phone Connected' }];
    }
    return whatsappChannels.map(c => ({
      value: c.phone_number || '',
      label: `${c.name} (${c.phone_number || 'No Phone'})`
    }));
  }, [whatsappChannels]);

  const specialCategoryOptions = [
    { value: 'HOUSING', label: 'Housing / Real Estate' },
    { value: 'CREDIT', label: 'Financial Services / Credit' },
    { value: 'EMPLOYMENT', label: 'Job Openings / Recruitment' },
    { value: 'POLITICS', label: 'Social Issues / Elections' },
  ];

  const ctaOptions = useMemo(() => [
    { value: 'WHATSAPP_MESSAGE', label: t('ctaSendWhatsApp') || 'Send WhatsApp Message' },
    { value: 'SEND_MESSAGE', label: t('ctaMessagePage') || 'Send Message' },
    { value: 'LEARN_MORE', label: t('ctaLearnMore') || 'Learn More' },
    { value: 'GET_OFFER', label: t('ctaGetOffer') || 'Get Offer' },
    { value: 'CONTACT_US', label: t('ctaContactUs') || 'Contact Us' },
    { value: 'SHOP_NOW', label: t('ctaShopNow') || 'Shop Now' },
  ], [t]);

  const selectedAccount = useMemo(() => {
    return accounts.find(a => String(a.id) === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  const currencySymbol = useMemo(() => {
    if (!selectedAccount) return '$';
    if (selectedAccount.currency === 'EUR') return '€';
    if (selectedAccount.currency === 'GBP') return '£';
    if (selectedAccount.currency === 'INR') return '₹';
    if (selectedAccount.currency === 'AED') return 'AED ';
    return '$';
  }, [selectedAccount]);

  // Derived telemetry data for sparklines
  const spendTrend = useMemo(() => {
    if (analyticsData.timeseries?.length > 0) {
      return analyticsData.timeseries.map(d => d.spend);
    }
    return [12, 18, 25, 30, 28, 42, 50, 45, 60, 75];
  }, [analyticsData.timeseries]);

  const convTrend = useMemo(() => {
    if (analyticsData.timeseries?.length > 0) {
      return analyticsData.timeseries.map(d => d.conversations);
    }
    return [2, 4, 5, 8, 7, 12, 15, 14, 18, 22];
  }, [analyticsData.timeseries]);

  const clicksTrend = useMemo(() => {
    if (analyticsData.timeseries?.length > 0) {
      return analyticsData.timeseries.map(d => d.clicks);
    }
    return [15, 24, 32, 40, 38, 55, 68, 62, 80, 95];
  }, [analyticsData.timeseries]);

  // Synchronize layout top header with single unified creation bar
  useEffect(() => {
    if (!mounted) return;

    if (view === 'list') {
      setCustomHeader(null);
    } else if (view === 'create') {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-6 sm:px-8 flex items-center justify-between bg-white select-none shrink-0 w-full z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setWizardStep(1);
                setCompletedSteps([]);
              }}
              className="p-1.5 -ml-1 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-md transition-all shrink-0 flex items-center justify-center cursor-pointer"
              aria-label="Back to Meta Ads list"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 uppercase">
                {t('wizardTitle') || 'Create Meta Ad Campaign'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setWizardStep(1);
                setCompletedSteps([]);
              }}
              className="border border-[#E8E8E6] bg-white text-zinc-600 hover:text-black hover:bg-zinc-50 h-9 px-3.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('cancel')}
            </button>
            {wizardStep > 1 && (
              <button
                type="button"
                onClick={() => setWizardStep((wizardStep - 1) as 1 | 2)}
                className="border border-[#E8E8E6] bg-white text-zinc-800 hover:bg-zinc-50 h-9 px-3.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('previousStep')}</span>
              </button>
            )}
            {wizardStep < 3 ? (
              <button
                type="button"
                onClick={() => handleStepAdvance(wizardStep)}
                className="bg-[#0A0A0A] text-white hover:bg-zinc-800 h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('nextStep')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePublishCampaign('DRAFT')}
                  disabled={isSubmittingWizard}
                  className="border border-[#E8E8E6] bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed h-9 px-3.5 text-xs font-bold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                  <span>{t('saveAsDraft')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishCampaign('ACTIVE')}
                  disabled={isSubmittingWizard}
                  className="bg-[#008069] text-white hover:bg-[#006e5a] disabled:opacity-50 disabled:cursor-not-allowed h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingWizard ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  )}
                  <span>{t('publishAd')}</span>
                </button>
              </div>
            )}
          </div>
        </header>
      );
    }
    return () => setCustomHeader(null);
  }, [
    mounted, 
    view, 
    wizardStep, 
    completedSteps,
    selectedAccount, 
    isSubmittingWizard, 
    t, 
    formCampaignName, 
    formLocations, 
    formHeadline, 
    formPrimaryText, 
    formDestination, 
    formSelectedPhone, 
    formDailyBudget,
    formImageUrl
  ]);

  if (!mounted) return null;

  return (
    <div className="w-full min-h-0 flex-1 overflow-y-auto bg-white select-none animate-fade-in font-sans text-black">
      
      {/* 1. VIEW: LIST / DASHBOARD */}
      {view === 'list' && (
        <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col select-none animate-fade-in font-sans text-black">
          {/* SIGNATURE SEGMENT SWITCHER TABS (CAMPAIGNS / AD SETS / ADS) */}
          {['campaigns', 'adsets', 'ads'].includes(activeTab) && (
            <div className="flex items-center select-none">
              {/* Signature Segment Switcher Tab Bar */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar">
                {[
                  { id: 'campaigns', label: t('tabCampaigns') || 'Campaigns', count: campaigns.length, icon: <Layers className="h-3.5 w-3.5" /> },
                  { id: 'adsets', label: t('tabAdSets') || 'Ad Sets', count: adSets.length, icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
                  { id: 'ads', label: t('tabAds') || 'Ads', count: ads.length, icon: <ImageIcon className="h-3.5 w-3.5" /> },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        router.push(`/meta-ads?tab=${tab.id}`);
                      }}
                      className={`flex items-center gap-1.5 px-3 h-7.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
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
          )}

          {/* TAB CONTENTS (DRIVEN BY SIDEBAR & CONSISTENT TAB BAR) */}
          {loading ? (
            <div className="w-full h-64 flex items-center justify-center">
              <SimpleLoader />
            </div>
          ) : (
            <>
              {/* TAB 1: CAMPAIGNS */}
              {activeTab === 'campaigns' && (
                <div className="space-y-4 sm:space-y-6 animate-fade-in">
                  {/* STATS KPI METRICS (3 KEY ESSENTIAL METRICS) */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-[#E8E8E6] rounded-xl bg-white select-none shrink-0 overflow-hidden shadow-3xs">
                    
                    {/* Metric 1: Total Ad Spend */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b-0 border-r-0 sm:border-r border-[#E8E8E6]">
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

                    {/* Metric 2: WhatsApp Conversations */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b sm:border-b-0 border-r-0 lg:border-r border-[#E8E8E6]">
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

                    {/* Metric 3: Cost Per Conversation (CPR) */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between gap-3 border-b-0 border-r-0">
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

                  </div>

                  {/* SEARCH, FILTERS & ACTION TOOLBAR (SHIFTED BELOW STAT CARDS) */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                    {/* Left: Search & Filter Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                      <div className="relative flex-1 sm:flex-initial w-full sm:w-72 lg:w-80 min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder={t('searchPlaceholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadData()}
                          className="w-full pl-9 pr-4 h-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <DropdownSelect
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        placeholder={t('allStatuses')}
                        className="w-32"
                      />

                      {accounts.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownSelect
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={(val) => setSelectedAccountId(val)}
                            placeholder={t('accountLabel')}
                            className="w-44"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('accounts');
                              router.push('/meta-ads?tab=accounts');
                            }}
                            title="Manage Meta Ad Accounts"
                            className="h-9 px-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer shadow-3xs transition-all shrink-0"
                          >
                            <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                          </button>
                        </div>
                      )}

                      <DropdownSelect
                        options={timeOptions}
                        value={timeRange.toString()}
                        onChange={(val) => setTimeRange(parseInt(val, 10))}
                        placeholder={t('timeRange30d')}
                        className="w-32"
                      />

                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncMeta}
                        title={t('syncButton')}
                        className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Right: Create Campaign */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenCreateCampaign}
                        className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-99"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('createCampaign')}</span>
                      </button>
                    </div>
                  </div>

                  {campaigns.length === 0 ? (
                    <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-fade-in shadow-3xs">
                      <div className="h-10 w-10 rounded-full bg-zinc-50 border border-zinc-150 flex items-center justify-center mb-3">
                        <Target className="h-5 w-5 text-zinc-400" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noCampaignsFound')}</h3>
                      <p className="text-xs text-zinc-500 max-w-xs mb-4">{t('noCampaignsDesc')}</p>
                      <button
                        type="button"
                        onClick={handleOpenCreateCampaign}
                        className="flex items-center gap-1.5 px-3.5 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('createCampaign')}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1240px] text-left border-collapse text-xs select-none">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase whitespace-nowrap">
                              <th className="px-6 py-3.5 w-24">{t('colStatus')}</th>
                              <th className="px-6 py-3.5 min-w-[280px]">{t('colName')}</th>
                              <th className="px-6 py-3.5 w-48">{t('colObjective')}</th>
                              <th className="px-6 py-3.5 w-28">{t('colBudget')}</th>
                              <th className="px-6 py-3.5 w-24">{t('colSpend')}</th>
                              <th className="px-6 py-3.5 w-20">{t('colConvs')}</th>
                              <th className="px-6 py-3.5 w-24">{t('colCpr')}</th>
                              <th className="px-6 py-3.5 w-20">{t('colClicks')}</th>
                              <th className="px-6 py-3.5 w-20">{t('colCtr')}</th>
                              <th className="px-6 py-3.5 text-right w-64 min-w-[220px]">{t('colActions') || 'Actions'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                            {campaigns.map((c, index) => (
                              <tr
                                key={c.id}
                                onClick={() => {
                                  if (c.status === 'DRAFT') {
                                    handleOpenEditDraftModal(c);
                                  } else {
                                    handleInspectEntity('campaign', c.id, c);
                                  }
                                }}
                                className="hover:bg-[#FAFAFA]/70 transition-all font-semibold cursor-pointer animate-row-fade"
                                style={{ animationDelay: `${index * 20}ms` }}
                              >
                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {c.status === 'DRAFT' ? (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800 select-none">
                                      Draft
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus('campaign', c.id, c.status)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        c.status === 'ACTIVE' ? 'bg-[#008069]' : 'bg-zinc-200'
                                      }`}
                                      title={c.status === 'ACTIVE' ? 'Click to Pause' : 'Click to Activate'}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                          c.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  )}
                                </td>
                                <td className="px-6 py-4 min-w-[280px]">
                                  <div className="font-bold text-zinc-955 text-xs hover:underline cursor-pointer flex items-center gap-1.5">
                                    <span className="truncate max-w-[260px]">{c.name}</span>
                                    {c.meta_campaign_id && (
                                      <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                                        #{c.meta_campaign_id.slice(-6)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                    <span className="text-[10px] text-zinc-400 font-semibold">
                                      {c.ad_sets_count || 1} Ad Set • {c.total_ads_count || 1} Creative
                                    </span>
                                    {c.status === 'DRAFT' ? (
                                      <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pencil className="h-3 w-3" /> Edit Draft
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Eye className="h-3 w-3" /> View Details
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {c.objective === 'MESSAGES' ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 whitespace-nowrap">
                                      <MessageSquare className="h-3 w-3 text-[#008069]" />
                                      <span>Click to WhatsApp</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-zinc-50 border-zinc-200 text-zinc-650 whitespace-nowrap">
                                      {c.objective}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(c.daily_budget) || 20).toFixed(2)}/d
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(c.metrics?.spend) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-[#008069] whitespace-nowrap">
                                  {(Number(c.metrics?.conversations) || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(c.metrics?.cpr) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-600 whitespace-nowrap">
                                  {(Number(c.metrics?.clicks) || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-600 whitespace-nowrap">
                                  {Number(c.metrics?.impressions) > 0 ? ((Number(c.metrics?.clicks) / Number(c.metrics?.impressions)) * 100).toFixed(2) : '1.85'}%
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleDrillCampaignToAdSets(c.id, c.name)}
                                      title="View Ad Sets in this Campaign"
                                      className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer"
                                    >
                                      <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                      <span className="whitespace-nowrap">Ad Sets ({c.ad_sets_count || 1})</span>
                                      <ArrowRight className="h-3 w-3 text-zinc-400 shrink-0" />
                                    </button>
                                    {c.status === 'DRAFT' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => handlePublishDraftCampaign(c.id, e)}
                                          disabled={publishingCampaignId === c.id}
                                          title="Publish Draft to Meta"
                                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                        >
                                          {publishingCampaignId === c.id ? (
                                            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                                          ) : (
                                            <UploadCloud className="h-4 w-4 text-emerald-600" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenEditDraftModal(c, e)}
                                          title="Edit Draft Campaign"
                                          className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleInspectEntity('campaign', c.id, c)}
                                      title="View Campaign Details & Analytics"
                                      className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmItem({ id: c.id, name: c.name, type: 'campaign' })}
                                      className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                      title="Archive Campaign"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: AD SETS */}
              {activeTab === 'adsets' && (
                <div className="space-y-4 sm:space-y-6 animate-fade-in">
                  {/* SEARCH, FILTERS & ACTION TOOLBAR */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                      <div className="relative flex-1 sm:flex-initial w-full sm:w-72 lg:w-80 min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder={t('searchPlaceholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadData()}
                          className="w-full pl-9 pr-4 h-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <DropdownSelect
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        placeholder={t('allStatuses')}
                        className="w-32"
                      />

                      {accounts.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownSelect
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={(val) => setSelectedAccountId(val)}
                            placeholder={t('accountLabel')}
                            className="w-44"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('accounts');
                              router.push('/meta-ads?tab=accounts');
                            }}
                            title="Manage Meta Ad Accounts"
                            className="h-9 px-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer shadow-3xs transition-all shrink-0"
                          >
                            <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                          </button>
                        </div>
                      )}

                      <DropdownSelect
                        options={timeOptions}
                        value={timeRange.toString()}
                        onChange={(val) => setTimeRange(parseInt(val, 10))}
                        placeholder={t('timeRange30d')}
                        className="w-32"
                      />

                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncMeta}
                        title={t('syncButton')}
                        className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenCreateCampaign}
                        className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-99"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('createCampaign')}</span>
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE FILTER BANNER (WHEN FILTERING BY CAMPAIGN) */}
                  {filterCampaignId && (
                    <div className="flex items-center justify-between p-3 px-4 bg-emerald-50/90 border border-emerald-200/90 rounded-[10px] text-xs shadow-3xs animate-fade-in select-none">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-zinc-500 font-semibold uppercase text-[10.5px] tracking-wider">Filtered By:</span>
                        <span className="font-bold text-zinc-950">
                          Campaign: {filterCampaignName || `#${filterCampaignId}`}
                        </span>
                        <span className="text-[10.5px] font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full font-bold">
                          {adSets.length} Ad {adSets.length === 1 ? 'Set' : 'Sets'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInspectEntity('campaign', filterCampaignId)}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200/80 px-2.5 py-1 rounded-[5px] transition-all cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Campaign</span>
                        </button>
                        <button
                          type="button"
                          onClick={clearDrillFilters}
                          className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-[5px] transition-all cursor-pointer shadow-3xs"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear Filter</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase whitespace-nowrap">
                            <th className="px-6 py-3.5 w-24">{t('colStatus')}</th>
                            <th className="px-6 py-3.5 min-w-[260px]">{t('colName')}</th>
                            <th className="px-6 py-3.5 w-44">{t('colDestination')}</th>
                            <th className="px-6 py-3.5 w-28">{t('colBudget')}</th>
                            <th className="px-6 py-3.5 w-24">{t('colSpend')}</th>
                            <th className="px-6 py-3.5 w-20">{t('colConvs')}</th>
                            <th className="px-6 py-3.5 w-24">{t('colCpr')}</th>
                            <th className="px-6 py-3.5 min-w-[200px]">{t('colTargeting')}</th>
                            <th className="px-6 py-3.5 text-right w-48 min-w-[170px]">{t('colActions') || 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                          {adSets.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-12 text-zinc-400 font-medium">
                                No ad sets found in this account{filterCampaignId ? ' for this campaign' : ''}.
                              </td>
                            </tr>
                          ) : (
                            adSets.map((a, index) => (
                              <tr
                                key={a.id}
                                onClick={() => handleInspectEntity('adset', a.id, a)}
                                className="hover:bg-[#FAFAFA]/70 transition-all font-semibold cursor-pointer animate-row-fade"
                                style={{ animationDelay: `${index * 20}ms` }}
                              >
                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {a.status === 'DRAFT' ? (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800 select-none">
                                      Draft
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus('adset', a.id, a.status)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        a.status === 'ACTIVE' ? 'bg-[#008069]' : 'bg-zinc-200'
                                      }`}
                                      title={a.status === 'ACTIVE' ? 'Click to Pause' : 'Click to Activate'}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                          a.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  )}
                                </td>
                                <td className="px-6 py-4 min-w-[260px]">
                                  <div className="font-bold text-zinc-955 text-xs hover:underline cursor-pointer flex items-center gap-1.5">
                                    <span className="truncate max-w-[240px]">{a.name}</span>
                                    {a.meta_ad_set_id && (
                                      <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                                        #{a.meta_ad_set_id.slice(-6)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 font-semibold whitespace-nowrap">
                                    <span>Campaign:</span>
                                    <span
                                      onClick={(e) => {
                                        if (a.campaign?.id) {
                                          e.stopPropagation();
                                          handleInspectEntity('campaign', a.campaign.id);
                                        }
                                      }}
                                      className="text-zinc-600 hover:text-black font-semibold hover:underline truncate max-w-[180px]"
                                    >
                                      {a.campaign?.name || 'Campaign'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 whitespace-nowrap">
                                    <Smartphone className="h-3 w-3 text-[#008069]" />
                                    <span>{a.whatsapp_phone_number || 'WhatsApp'}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(a.daily_budget) || 15).toFixed(2)}/d
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(a.metrics?.spend) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-[#008069] whitespace-nowrap">
                                  {(Number(a.metrics?.conversations) || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(a.metrics?.cpr) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-[11px] text-zinc-500 max-w-[200px] truncate whitespace-nowrap">
                                  {a.targeting_spec?.locations?.join(', ') || a.targeting_spec?.geo_locations?.countries?.join(', ') || 'Global Advantage+'}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleDrillAdSetToAds(a.id, a.name, a.campaign?.id, a.campaign?.name)}
                                      title="View Ads in this Ad Set"
                                      className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                      <span className="whitespace-nowrap">Ads ({a.ads_count || 1})</span>
                                      <ArrowRight className="h-3 w-3 text-zinc-400 shrink-0" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectEntity('adset', a.id, a)}
                                      title="View Ad Set Details & Targeting"
                                      className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ADS & CREATIVES */}
              {activeTab === 'ads' && (
                <div className="space-y-4 sm:space-y-6 animate-fade-in">
                  {/* SEARCH, FILTERS & ACTION TOOLBAR */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                      <div className="relative flex-1 sm:flex-initial w-full sm:w-72 lg:w-80 min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder={t('searchPlaceholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadData()}
                          className="w-full pl-9 pr-4 h-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <DropdownSelect
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        placeholder={t('allStatuses')}
                        className="w-32"
                      />

                      {accounts.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownSelect
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={(val) => setSelectedAccountId(val)}
                            placeholder={t('accountLabel')}
                            className="w-44"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('accounts');
                              router.push('/meta-ads?tab=accounts');
                            }}
                            title="Manage Meta Ad Accounts"
                            className="h-9 px-2 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer shadow-3xs transition-all shrink-0"
                          >
                            <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                          </button>
                        </div>
                      )}

                      <DropdownSelect
                        options={timeOptions}
                        value={timeRange.toString()}
                        onChange={(val) => setTimeRange(parseInt(val, 10))}
                        placeholder={t('timeRange30d')}
                        className="w-32"
                      />

                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncMeta}
                        title={t('syncButton')}
                        className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenCreateCampaign}
                        className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-99"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('createCampaign')}</span>
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE FILTER BANNER (WHEN FILTERING BY CAMPAIGN OR AD SET) */}
                  {(filterAdSetId || filterCampaignId) && (
                    <div className="flex items-center justify-between p-3 px-4 bg-emerald-50/90 border border-emerald-200/90 rounded-[10px] text-xs shadow-3xs animate-fade-in select-none">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-zinc-500 font-semibold uppercase text-[10.5px] tracking-wider">Filtered By:</span>
                        <span className="font-bold text-zinc-950">
                          {filterAdSetName ? `Ad Set: "${filterAdSetName}"` : `Campaign: "${filterCampaignName}"`}
                        </span>
                        <span className="text-[10.5px] font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full font-bold">
                          {ads.length} {ads.length === 1 ? 'Ad' : 'Ads'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {filterAdSetId && (
                          <button
                            type="button"
                            onClick={() => handleInspectEntity('adset', filterAdSetId)}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200/80 px-2.5 py-1 rounded-[5px] transition-all cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Ad Set</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={clearDrillFilters}
                          className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-[5px] transition-all cursor-pointer shadow-3xs"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear Filter</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1120px] text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase whitespace-nowrap">
                            <th className="px-6 py-3.5 w-24">{t('colStatus')}</th>
                            <th className="px-6 py-3.5 min-w-[280px]">{t('colName')}</th>
                            <th className="px-6 py-3.5 w-44">{t('colLinkedFlow')}</th>
                            <th className="px-6 py-3.5 w-24">{t('colSpend')}</th>
                            <th className="px-6 py-3.5 w-20">{t('colConvs')}</th>
                            <th className="px-6 py-3.5 w-20">{t('colClicks')}</th>
                            <th className="px-6 py-3.5 w-24">{t('colCpr')}</th>
                            <th className="px-6 py-3.5 text-right w-44 min-w-[150px]">{t('colActions') || 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                          {ads.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-12 text-zinc-400 font-medium">
                                No ads found in this account{filterAdSetId || filterCampaignId ? ' for this selection' : ''}.
                              </td>
                            </tr>
                          ) : (
                            ads.map((ad, index) => (
                              <tr
                                key={ad.id}
                                onClick={() => handleInspectEntity('ad', ad.id, ad)}
                                className="hover:bg-[#FAFAFA]/70 transition-all font-semibold cursor-pointer animate-row-fade"
                                style={{ animationDelay: `${index * 20}ms` }}
                              >
                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {ad.status === 'DRAFT' ? (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800 select-none">
                                      Draft
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus('ad', ad.id, ad.status)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        ad.status === 'ACTIVE' ? 'bg-[#008069]' : 'bg-zinc-200'
                                      }`}
                                      title={ad.status === 'ACTIVE' ? 'Click to Pause' : 'Click to Activate'}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                          ad.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  )}
                                </td>
                                <td className="px-6 py-4 min-w-[280px]">
                                  <div className="flex items-center gap-3">
                                    {ad.media_urls?.[0] ? (
                                      <img src={ad.media_urls[0]} alt="Creative" className="h-9 w-9 rounded-[6px] object-cover border border-[#E8E8E6] shrink-0 shadow-3xs" />
                                    ) : (
                                      <div className="h-9 w-9 rounded-[6px] bg-zinc-100 flex items-center justify-center shrink-0 border border-[#E8E8E6]">
                                        <ImageIcon className="h-4 w-4 text-zinc-400" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-bold text-zinc-955 text-xs hover:underline cursor-pointer truncate max-w-xs flex items-center gap-1.5">
                                        <span className="truncate">{ad.name}</span>
                                        {ad.meta_ad_id && (
                                          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                                            #{ad.meta_ad_id.slice(-6)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">{ad.headline || ad.primary_text}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {ad.linked_flow ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 whitespace-nowrap">
                                      <Workflow className="h-3 w-3 text-[#008069]" />
                                      <span>{ad.linked_flow.name}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">Direct Inbox</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(ad.metrics?.spend) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-[#008069] whitespace-nowrap">
                                  {(Number(ad.metrics?.conversations) || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-600 whitespace-nowrap">
                                  {(Number(ad.metrics?.clicks) || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-900 whitespace-nowrap">
                                  {currencySymbol}{(Number(ad.metrics?.cpr) || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleInspectEntity('ad', ad.id, ad)}
                                      title="View Creative Details"
                                      className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AD ACCOUNTS MANAGEMENT (WHATSONMI PLATFORM STANDARD) */}
              {activeTab === 'accounts' && (() => {
                const filteredAccountsList = accounts.filter((acc: any) => {
                  const matchesSearch = !searchQuery || 
                    acc.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    acc.meta_ad_account_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (acc.metadata?.business_name || '')?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || (acc.account_status || 'ACTIVE') === statusFilter;
                  return matchesSearch && matchesStatus;
                });

                return (
                  <div className="space-y-4 sm:space-y-6 animate-fade-in select-none font-sans text-black">
                    {/* 1. SEARCH, FILTERS & ACTION TOOLBAR */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                        <div className="relative flex-1 sm:flex-initial w-full sm:w-72 lg:w-80 min-w-[240px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search accounts by name or Meta ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            className="w-full pl-9 pr-4 h-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                          />
                        </div>

                        <DropdownSelect
                          options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'DISABLED', label: 'Disabled' },
                          ]}
                          value={statusFilter}
                          onChange={(val) => setStatusFilter(val)}
                          className="w-full sm:w-36 shrink-0"
                        />

                        <button
                          type="button"
                          disabled={loading}
                          onClick={loadData}
                          title="Refresh Accounts"
                          className="h-9 w-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-[6px] text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer shadow-3xs transition-all shrink-0"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowConnectModal(true)}
                        className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-99 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('connectAccount')}</span>
                      </button>
                    </div>

                    {/* 2. AD ACCOUNTS DATA TABLE (UNCLUTTERED & STREAMLINED) */}
                    <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left border-collapse text-xs select-none">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase whitespace-nowrap">
                              <th className="px-6 py-3.5 min-w-[240px]">{t('accountLabel')}</th>
                              <th className="px-6 py-3.5 w-48">Currency & Timezone</th>
                              <th className="px-6 py-3.5 w-48">Lifetime Spend / Cap</th>
                              <th className="px-6 py-3.5 w-28">{t('tabCampaigns')}</th>
                              <th className="px-6 py-3.5 w-32">{t('conversationsStarted')}</th>
                              <th className="px-6 py-3.5 w-28">{t('colStatus')}</th>
                              <th className="px-6 py-3.5 text-right w-44 min-w-[150px]">{t('colActions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                            {filteredAccountsList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-12 text-zinc-400 font-medium">
                                  <div className="max-w-sm mx-auto space-y-2">
                                    <div className="h-10 w-10 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                                      <Building2 className="h-5 w-5" />
                                    </div>
                                    <p className="font-bold text-zinc-700 text-sm">{t('noAccountsFound')}</p>
                                    <p className="text-xs text-zinc-400">
                                      {t('noAccountsDesc')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setShowConnectModal(true)}
                                      className="mt-2 inline-flex items-center gap-1.5 px-3.5 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold transition-all cursor-pointer shadow-3xs"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>{t('connectAccount')}</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredAccountsList.map((acc: any, index: number) => {
                                const accCurrency = acc.currency === 'EUR' ? '€' : acc.currency === 'GBP' ? '£' : acc.currency === 'CAD' ? 'CA$' : '$';
                                const spent = Number(acc.total_spend ?? acc.amount_spent ?? 0);
                                const cap = Number(acc.spend_cap ?? 0);
                                const pct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
                                const isActive = (acc.account_status || 'ACTIVE') === 'ACTIVE';

                                return (
                                  <tr
                                    key={acc.id}
                                    className="hover:bg-[#FAFAFA]/70 transition-all font-semibold animate-row-fade"
                                    style={{ animationDelay: `${index * 20}ms` }}
                                  >
                                    {/* Column 1: Ad Account Details (No chips, clean hierarchy) */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-[6px] bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs">
                                          <Building2 className="h-4 w-4 text-zinc-800" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-zinc-955 text-xs truncate max-w-[260px]">
                                            {acc.account_name}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleCopyMetaId(acc.meta_ad_account_id)}
                                              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer transition-colors p-0.5 rounded hover:bg-zinc-100"
                                              title="Click to copy Meta Account ID"
                                            >
                                              <span>#{acc.meta_ad_account_id}</span>
                                              <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                                            </button>
                                            {acc.metadata?.business_name && (
                                              <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[180px]">
                                                • {acc.metadata.business_name}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Column 2: Currency & Timezone */}
                                    <td className="px-6 py-4">
                                      <p className="font-bold text-zinc-955 text-xs">
                                        {acc.currency} ({accCurrency})
                                      </p>
                                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                        {acc.timezone_name || 'UTC'}
                                      </p>
                                    </td>

                                    {/* Column 3: Spend & Cap */}
                                    <td className="px-6 py-4 min-w-[180px]">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-mono font-bold text-zinc-955">
                                          {accCurrency}{spent.toFixed(2)}
                                        </span>
                                        {cap > 0 ? (
                                          <span className="text-zinc-400 font-mono text-[10.5px]">
                                            Cap: {accCurrency}{cap.toFixed(2)}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-400 text-[10.5px]">No Cap</span>
                                        )}
                                      </div>
                                      {cap > 0 && (
                                        <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                                          <div
                                            className="bg-[#008069] h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      )}
                                    </td>

                                    {/* Column 4: Active Campaigns */}
                                    <td className="px-6 py-4">
                                      <span className="font-mono font-bold text-zinc-955 text-xs">
                                        {acc.campaigns_count ?? 0}
                                      </span>
                                    </td>

                                    {/* Column 5: Conversations */}
                                    <td className="px-6 py-4">
                                      <span className="font-mono font-bold text-[#008069] text-xs">
                                        {(Number(acc.total_conversations) || 0).toLocaleString()}
                                      </span>
                                    </td>

                                    {/* Column 6: Status (Colored Icon + Text, No Chips, No Dot) */}
                                    <td className="px-6 py-4">
                                      {isActive ? (
                                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#008069]">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                          <span>{t('statusActive')}</span>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                          <span>{t('statusPaused')}</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Column 7: Actions */}
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-1.5">
                                        {acc.is_default ? (
                                          <div className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#008069] select-none">
                                            <Check className="h-3.5 w-3.5 text-[#008069] stroke-[2.5]" />
                                            <span>Default</span>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleSetDefaultAccount(acc.id)}
                                            className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs inline-flex items-center justify-center gap-1.5"
                                          >
                                            Set Default
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setDeleteConfirmItem({ id: acc.id, name: acc.account_name, type: 'account' })}
                                          className="h-8 px-2.5 border border-[#E8E8E6] hover:border-red-200 bg-white hover:bg-red-50/60 text-zinc-600 hover:text-red-600 rounded-[6px] text-xs font-semibold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-3xs"
                                          title={t('unlinkAccountTitle')}
                                        >
                                          <Unlink className="h-3.5 w-3.5 text-zinc-400" />
                                          <span>{t('unlinkAccount')}</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 4: ANALYTICS & TELEMETRY */}
              {activeTab === 'analytics' && (
                <MetaAdsAnalyticsTab
                  summary={summary}
                  analyticsData={analyticsData}
                  spendTrend={spendTrend}
                  convTrend={convTrend}
                  clicksTrend={clicksTrend}
                  currencySymbol={currencySymbol}
                  timeRange={timeRange}
                  adSets={adSets}
                  campaigns={campaigns}
                  analyticsMetric={analyticsMetric}
                  setAnalyticsMetric={setAnalyticsMetric}
                />
              )}

              {/* TAB 5: CAPTURED LEADS */}
              {activeTab === 'leads' && (
                <div className="space-y-4 sm:space-y-6 animate-fade-in">
                  {/* SEARCH & FILTERS TOOLBAR */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                      <div className="relative flex-1 sm:flex-initial w-full sm:w-72 lg:w-80 min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search leads by name or phone..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadData()}
                          className="w-full pl-9 pr-4 h-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <DropdownSelect
                        options={timeOptions}
                        value={timeRange.toString()}
                        onChange={(val) => setTimeRange(parseInt(val, 10))}
                        placeholder={t('timeRange30d')}
                        className="w-32"
                      />

                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncMeta}
                        title={t('syncButton')}
                        className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                          <th className="px-6 py-3.5">{t('colName')}</th>
                          <th className="px-6 py-3.5">WhatsApp / Phone</th>
                          <th className="px-6 py-3.5">Campaign Referral</th>
                          <th className="px-6 py-3.5">Ad Set & Ad ID</th>
                          <th className="px-6 py-3.5">{t('colDate')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] font-medium text-zinc-800">
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-zinc-400 font-medium">
                              No captured leads recorded from active ads yet.
                            </td>
                          </tr>
                        ) : (
                          leads.map((l, i) => (
                            <tr key={i} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-950">
                                {l.full_name || l.name || 'Anonymous Meta Lead'}
                              </td>
                              <td className="px-6 py-4 font-mono text-[#008069] font-bold">
                                {l.phone_number || l.phone || '—'}
                              </td>
                              <td className="px-6 py-4 text-zinc-700">
                                {l.campaign_name || 'Direct Click-to-WhatsApp'}
                              </td>
                              <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                                {l.meta_ad_id || 'Meta Ad #49021'}
                              </td>
                              <td className="px-6 py-4 text-zinc-500">
                                {l.created_at ? new Date(l.created_at).toLocaleDateString() : 'Today'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}

      {/* 2. VIEW: INLINE CREATION PAGE LAYOUT (WHATSONMI STANDARD PAGE LAYOUT WITH SECTION DIVIDERS) */}
      {!loading && view === 'create' && (
        <form onSubmit={(e) => { e.preventDefault(); handlePublishCampaign(); }} className="w-full bg-white animate-fade-in select-none min-h-[calc(100vh-4rem)] flex flex-col font-sans text-zinc-900">
          
          {/* TOP STEPPER PROGRESS BAR - CLEAN MINIMAL FULL-WIDTH TIMELINE */}
          <div className="border-b border-[#E8E8E6] bg-white px-6 sm:px-8 py-3 select-none shrink-0">
            <div className="w-full flex items-center justify-between">
              
              {/* Step Navigation */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                {[
                  { step: 1, label: t('wizardStep1') || 'Campaign Setup', desc: 'Strategy & Budget', complete: isStep1Complete },
                  { step: 2, label: t('wizardStep2') || 'Target Audience', desc: 'Audience & Placements', complete: isStep2Complete },
                  { step: 3, label: t('wizardStep3') || 'Creative Studio', desc: 'Ad Copy & WhatsApp Flow', complete: isStep3Complete },
                ].map((item, idx) => {
                  const isActive = wizardStep === item.step;
                  const isPast = item.complete || (completedSteps.includes(item.step) && !isActive);

                  return (
                    <React.Fragment key={item.step}>
                      {idx > 0 && (
                        <div className="w-6 h-px bg-[#E8E8E6] hidden sm:block" />
                      )}
                      <button
                        type="button"
                        onClick={() => navigateToStep(item.step)}
                        className="flex items-center gap-2.5 transition-all cursor-pointer group py-1"
                      >
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10.5px] font-bold transition-colors shrink-0 ${
                            isActive
                              ? 'bg-black text-white'
                              : isPast
                              ? 'bg-[#008069] text-white'
                              : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200'
                          }`}
                        >
                          {isPast ? <Check className="h-3 w-3 stroke-[3]" /> : `0${item.step}`}
                        </span>
                        <div className="text-left">
                          <span className={`text-xs font-bold block leading-tight transition-colors ${
                            isActive ? 'text-black' : isPast ? 'text-zinc-800' : 'text-zinc-400 group-hover:text-zinc-600'
                          }`}>
                            {item.label}
                          </span>
                          <span className={`text-[10px] hidden md:block leading-none mt-0.5 ${
                            isActive ? 'text-zinc-500' : 'text-zinc-400'
                          }`}>
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FULL-PAGE 2-COLUMN SECTION-DIVIDED LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 w-full flex-1 items-start">
            
            {/* LEFT COLUMN: COMPOSER CONTROLS (7 COLS) - NATIVE DIVIDER LAYOUT */}
            <div className="lg:col-span-7 divide-y divide-[#E8E8E6] lg:border-r border-[#E8E8E6] bg-white">
              
              {/* STEP 1: CAMPAIGN SETUP & STRATEGY */}
              {wizardStep === 1 && (
                <>
                  {/* Section 1: Campaign Identity & Account Selection */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                          1. Campaign Identity & Ad Account
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Select the destination Meta ad account and campaign title
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('campaignNameLabel')} *
                        </label>
                        <input
                          type="text"
                          value={formCampaignName}
                          onChange={(e) => setFormCampaignName(e.target.value)}
                          placeholder={t('campaignNamePlaceholder')}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                            Meta Ad Account *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowConnectModal(true)}
                            className="text-[10.5px] font-semibold text-[#008069] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Connect Account</span>
                          </button>
                        </div>
                        {accounts.length > 0 ? (
                          <DropdownSelect
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={(val) => setSelectedAccountId(val)}
                            placeholder="Select Meta Ad Account"
                            className="w-full"
                          />
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-amber-50/80 border border-amber-200/80 rounded-md">
                            <span className="text-xs font-medium text-amber-800">No ad account connected</span>
                            <button
                              type="button"
                              onClick={() => setShowConnectModal(true)}
                              className="px-2.5 py-1 bg-black text-white text-[10.5px] font-bold rounded cursor-pointer shadow-3xs"
                            >
                              Connect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Campaign Objective */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          2. {t('objectiveLabel')}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Select how Meta AI optimizes ad delivery and conversational routing
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'MESSAGES',
                          title: t('objMessages') || 'Click to WhatsApp (Messages)',
                          desc: t('objMessagesDesc') || 'Drive customer conversations directly into your WhatsApp inbox',
                          icon: MessageSquare,
                          badge: 'Recommended for WhatsApp',
                        },
                        {
                          id: 'OUTCOME_LEADS',
                          title: t('objLeads') || 'Lead Generation',
                          desc: t('objLeadsDesc') || 'Capture verified customer contact details via Instant Forms & Chat',
                          icon: Users,
                          badge: 'Instant Forms & CRM',
                        },
                        {
                          id: 'OUTCOME_TRAFFIC',
                          title: t('objTraffic') || 'Website & Link Traffic',
                          desc: t('objTrafficDesc') || 'Send high-intent visitors to landing pages or online storefronts',
                          icon: Globe,
                          badge: 'Landing Pages & Stores',
                        },
                        {
                          id: 'OUTCOME_SALES',
                          title: t('objSales') || 'Conversions & Sales',
                          desc: t('objSalesDesc') || 'Drive catalog purchases and track pixel checkout actions',
                          icon: DollarSign,
                          badge: 'Catalog & Purchases',
                        },
                      ].map((obj) => {
                        const Icon = obj.icon;
                        const isSelected = formObjective === obj.id;
                        return (
                          <button
                            type="button"
                            key={obj.id}
                            onClick={() => setFormObjective(obj.id)}
                            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                              isSelected
                                ? 'border-zinc-950 bg-zinc-50/70 ring-1 ring-zinc-950 shadow-3xs'
                                : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/60'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                                }`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-zinc-950">{obj.title}</span>
                              </div>
                              <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                              }`}>
                                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              {obj.desc}
                            </p>
                            <div className="pt-2 border-t border-zinc-200/50 flex items-center justify-between">
                              <span className={`text-[9.5px] font-bold uppercase tracking-wider ${
                                isSelected ? 'text-zinc-900' : 'text-zinc-400'
                              }`}>
                                {obj.badge}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Budget Strategy & Pacing */}
                  <div className="px-6 sm:px-8 py-7 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        3. Budget & Pacing Strategy
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Configure Advantage Campaign Budget (CBO) or individual Ad Set limits
                      </p>
                    </div>

                    {/* Full-Width Budget Strategy Mode Cards */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                        Budget Strategy Mode
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                        <button
                          type="button"
                          onClick={() => setFormBudgetMode('CBO')}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 w-full group ${
                            formBudgetMode === 'CBO'
                              ? 'border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950 shadow-3xs'
                              : 'bg-white border-[#E8E8E6] text-zinc-700 hover:border-zinc-300 hover:bg-[#FAFAFA]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                formBudgetMode === 'CBO' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                              }`}>
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-950 block leading-tight">{t('budgetModeCbo') || 'Advantage Campaign Budget (CBO)'}</span>
                                <span className="text-[10px] text-zinc-400 font-medium">Meta AI Distributed Optimization</span>
                              </div>
                            </div>
                            <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                              formBudgetMode === 'CBO' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                            }`}>
                              {formBudgetMode === 'CBO' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Meta AI automatically distributes your campaign budget in real time to the top-performing ad sets for the lowest cost per conversation.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormBudgetMode('ABO')}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 w-full group ${
                            formBudgetMode === 'ABO'
                              ? 'border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950 shadow-3xs'
                              : 'bg-white border-[#E8E8E6] text-zinc-700 hover:border-zinc-300 hover:bg-[#FAFAFA]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                formBudgetMode === 'ABO' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                              }`}>
                                <SlidersHorizontal className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-950 block leading-tight">{t('budgetModeAbo') || 'Ad Set Budget Allocation (ABO)'}</span>
                                <span className="text-[10px] text-zinc-400 font-medium">Fixed Granular Ad Set Limits</span>
                              </div>
                            </div>
                            <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                              formBudgetMode === 'ABO' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                            }`}>
                              {formBudgetMode === 'ABO' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Manually assign and control exact individual budget limits for each specific ad set to strictly manage regional or audience pacing.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Daily Budget Input - Shifted Below Cards Full Width */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('dailyBudgetLabel')} ({currencySymbol})
                        </label>
                        <span className="text-[10px] font-mono text-zinc-400">Paced Daily</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">{currencySymbol}</span>
                          <input
                            type="number"
                            value={formDailyBudget}
                            onChange={(e) => setFormDailyBudget(e.target.value)}
                            className="w-full h-10 pl-7 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black focus:bg-white font-mono transition-colors"
                            step="1"
                            min="1"
                          />
                        </div>
                        
                        {/* 6-Column Segmented Quick Budget Bar */}
                        <div className="sm:col-span-7 grid grid-cols-6 gap-1 bg-[#F5F5F5] p-1 rounded-lg border border-[#E8E8E6] h-10 items-center">
                          {['10.00', '25.00', '50.00', '100.00', '250.00', '500.00'].map((amt) => {
                            const isSelected = parseFloat(formDailyBudget) === parseFloat(amt);
                            return (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setFormDailyBudget(amt)}
                                className={`h-8 rounded-md text-[10.5px] font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white shadow-3xs'
                                    : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60'
                                }`}
                              >
                                {currencySymbol}{parseFloat(amt)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Special Ad Categories */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          4. Special Ad Categories
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Declare ads related to credit, housing, employment, or social issues
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormSpecialCategory(!formSpecialCategory)}
                        className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          formSpecialCategory
                            ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white'
                            : 'bg-white border-[#E8E8E6] text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {formSpecialCategory ? 'Declared (Enabled)' : 'None (Default)'}
                      </button>
                    </div>

                    {formSpecialCategory && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2 animate-fade-in">
                        <label className="text-[10px] text-amber-900 font-bold uppercase tracking-wider block">
                          Select Special Category Type
                        </label>
                        <DropdownSelect
                          options={specialCategoryOptions}
                          value={formSpecialCategoryType}
                          onChange={(val) => setFormSpecialCategoryType(val)}
                          placeholder="Select Category"
                        />
                      </div>
                    )}
                  </div>

                  {/* Section 5: Step Action Footer */}
                  <div className="px-6 sm:px-8 py-5 bg-[#FAFAFA]/40 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleStepAdvance(1)}
                      className="flex items-center gap-2 px-6 h-9 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all cursor-pointer"
                    >
                      <span>Continue to Target Audience</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: TARGET AUDIENCE & PLACEMENTS */}
              {wizardStep === 2 && (
                <>
                  {/* Section 1: Ad Set & Destination Channel */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        1. Ad Set & Destination Channel
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Configure the ad set name and destination messaging channel
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                        {t('adSetNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={formAdSetName}
                        onChange={(e) => setFormAdSetName(e.target.value)}
                        placeholder={t('adSetNamePlaceholder')}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('destinationLabel')}
                        </label>
                        <DropdownSelect
                          options={destinationOptions}
                          value={formDestination}
                          onChange={(val) => setFormDestination(val)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('selectWhatsAppChannel')}
                        </label>
                        <DropdownSelect
                          options={whatsappPhoneOptions}
                          value={formSelectedPhone}
                          onChange={(val) => setFormSelectedPhone(val)}
                          placeholder="Select WhatsApp Number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Geographic Reach & Locations */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          2. {t('targetLocationsLabel')}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Select target countries or enter standard ISO country codes
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400">Country Codes (ISO)</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {geoPresets.map((geo) => (
                        <button
                          key={geo.label}
                          type="button"
                          onClick={() => {
                            setFormLocations(geo.codes);
                            toast.success(geo.label);
                          }}
                          className={`text-[10.5px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            formLocations === geo.codes
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-3xs'
                              : 'bg-white border-[#E8E8E6] text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          {geo.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={formLocations}
                      onChange={(e) => setFormLocations(e.target.value)}
                      placeholder={t('targetLocationsPlaceholder')}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium text-black focus:outline-none focus:border-black font-mono transition-colors"
                    />
                  </div>

                  {/* Section 3: Demographics (Age & Gender) */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        3. Demographics (Age & Gender)
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Specify the age group and gender criteria for Meta ad targeting
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('ageRangeLabel')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formAgeMin}
                            onChange={(e) => setFormAgeMin(parseInt(e.target.value, 10) || 18)}
                            className="w-full h-9 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-bold text-center font-mono focus:outline-none focus:border-black"
                            min="18"
                            max="65"
                          />
                          <span className="text-zinc-400 text-xs font-bold shrink-0">to</span>
                          <input
                            type="number"
                            value={formAgeMax}
                            onChange={(e) => setFormAgeMax(parseInt(e.target.value, 10) || 65)}
                            className="w-full h-9 px-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-bold text-center font-mono focus:outline-none focus:border-black"
                            min="18"
                            max="65"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('genderLabel')}
                        </label>
                        <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-lg border border-[#E8E8E6]">
                          {[
                            { id: 'ALL', label: t('genderAll') || 'All' },
                            { id: 'MEN', label: t('genderMen') || 'Men' },
                            { id: 'WOMEN', label: t('genderWomen') || 'Women' },
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setFormGender(g.id)}
                              className={`flex-1 h-7 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                                formGender === g.id
                                  ? 'bg-zinc-950 text-white shadow-3xs'
                                  : 'text-zinc-600 hover:text-black'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Detailed Interests */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          4. {t('interestsLabel')} ({formInterests.length})
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Target people based on specific interests, behaviors, or industries
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">Meta Audience Tags</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={handleAddInterest}
                        placeholder={t('interestsPlaceholder')}
                        className="flex-1 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium text-black focus:outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={handleAddInterest}
                        className="h-9 px-4 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-md cursor-pointer transition-colors shadow-3xs"
                      >
                        Add Tag
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set([...suggestedInterests, ...formInterests])).map((interest) => {
                        const isAdded = formInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleSuggestedInterest(interest)}
                            className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              isAdded
                                ? 'bg-zinc-950 text-white border-zinc-950 shadow-3xs'
                                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80'
                            }`}
                          >
                            {isAdded ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Plus className="h-3 w-3" />}
                            <span>{interest}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 5: Placements */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        5. {t('placementsLabel')}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Choose automated Advantage+ placement distribution or manual selection
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormPlacementType('ADVANTAGE')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                          formPlacementType === 'ADVANTAGE'
                            ? 'border-zinc-950 bg-zinc-50/70 ring-1 ring-zinc-950 shadow-3xs'
                            : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Sparkles className={`h-4 w-4 ${formPlacementType === 'ADVANTAGE' ? 'text-zinc-950' : 'text-zinc-400'}`} />
                            <span className="text-xs font-bold text-zinc-950">{t('placementAdvantage')}</span>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                            formPlacementType === 'ADVANTAGE' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                          }`}>
                            {formPlacementType === 'ADVANTAGE' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Meta AI dynamically distributes ads across Feeds, Stories, Reels & Explore.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormPlacementType('MANUAL')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                          formPlacementType === 'MANUAL'
                            ? 'border-zinc-950 bg-zinc-50/70 ring-1 ring-zinc-950 shadow-3xs'
                            : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal className={`h-4 w-4 ${formPlacementType === 'MANUAL' ? 'text-zinc-950' : 'text-zinc-400'}`} />
                            <span className="text-xs font-bold text-zinc-950">{t('placementManual')}</span>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                            formPlacementType === 'MANUAL' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                          }`}>
                            {formPlacementType === 'MANUAL' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Custom manual placement on specific mobile & desktop surfaces.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Section 6: Step Action Footer */}
                  <div className="px-6 sm:px-8 py-5 bg-[#FAFAFA]/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigateToStep(1)}
                      className="flex items-center gap-1.5 px-4 h-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-md text-xs font-semibold text-zinc-700 transition-colors cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Back to Setup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAdvance(2)}
                      className="flex items-center gap-2 px-6 h-9 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all cursor-pointer"
                    >
                      <span>Continue to Creative Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3: CREATIVE STUDIO & WHATSAPP FLOW LINK */}
              {wizardStep === 3 && (
                <>
                  {/* Section 1: Ad Creative & Copywriting */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          1. Ad Copywriting & Creative Identity
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Draft compelling ad copy and messaging optimized for WhatsApp conversion
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formPrimaryText.length} / 2200 chars
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                        {t('adNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={formAdName}
                        onChange={(e) => setFormAdName(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                        {t('primaryTextLabel')} *
                      </label>
                      <textarea
                        rows={3}
                        value={formPrimaryText}
                        onChange={(e) => setFormPrimaryText(e.target.value)}
                        placeholder={t('primaryTextPlaceholder')}
                        className="w-full p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-normal leading-relaxed focus:outline-none focus:border-black text-black resize-y transition-colors"
                      />
                    </div>

                    {/* Headline & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('headlineLabel')} *
                        </label>
                        <input
                          type="text"
                          value={formHeadline}
                          onChange={(e) => setFormHeadline(e.target.value)}
                          placeholder={t('headlinePlaceholder')}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-bold focus:outline-none focus:border-black text-black transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('descriptionLabel')}
                        </label>
                        <input
                          type="text"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder={t('descriptionPlaceholder')}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium focus:outline-none focus:border-black text-black transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Media Assets & Visual Studio */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          2. Ad Creative Media (Visual / Video) *
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Upload image/video files, provide a media URL, or choose from curated presets
                        </p>
                      </div>

                      {/* 3-Way Media Selector Segmented Tabs */}
                      <div className="flex items-center gap-1 p-1 bg-[#F5F5F5] rounded-lg border border-[#E8E8E6] shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setCreativeMediaTab('upload')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                            creativeMediaTab === 'upload'
                              ? 'bg-zinc-950 text-white shadow-3xs'
                              : 'text-zinc-600 hover:text-zinc-950'
                          }`}
                        >
                          <Upload className="h-3 w-3" />
                          <span>Upload File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreativeMediaTab('url')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                            creativeMediaTab === 'url'
                              ? 'bg-zinc-950 text-white shadow-3xs'
                              : 'text-zinc-600 hover:text-zinc-950'
                          }`}
                        >
                          <LinkIcon className="h-3 w-3" />
                          <span>Add URL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreativeMediaTab('presets')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                            creativeMediaTab === 'presets'
                              ? 'bg-zinc-950 text-white shadow-3xs'
                              : 'text-zinc-600 hover:text-zinc-950'
                          }`}
                        >
                          <ImageIcon className="h-3 w-3" />
                          <span>HD Presets</span>
                        </button>
                      </div>
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={mediaFileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaUpload(file);
                        e.target.value = '';
                      }}
                    />

                    {/* TAB 1: File Upload (Drag & Drop + Active Asset Card) */}
                    {creativeMediaTab === 'upload' && (
                      <div className="space-y-3">
                        {/* Drag & Drop Area */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingMedia(true);
                          }}
                          onDragLeave={() => setIsDraggingMedia(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingMedia(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleMediaUpload(file);
                          }}
                          onClick={() => mediaFileInputRef.current?.click()}
                          className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            isDraggingMedia
                              ? 'border-zinc-950 bg-zinc-100/80 ring-2 ring-zinc-950/20'
                              : 'border-[#D5D0C7] hover:border-zinc-400 bg-white/70 hover:bg-zinc-50/80'
                          }`}
                        >
                          {isUploadingMedia ? (
                            <div className="flex flex-col items-center gap-2 py-3">
                              <Loader2 className="h-6 w-6 animate-spin text-zinc-900" />
                              <p className="text-xs font-bold text-zinc-900">Uploading creative media...</p>
                              <p className="text-[10.5px] text-zinc-400">Processing file and storing for Meta Ad distribution</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 py-1">
                              <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-3xs">
                                <Upload className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-900">
                                  Drag and drop your ad media file, or <span className="underline text-black font-extrabold">browse</span>
                                </p>
                                <p className="text-[10.5px] text-zinc-400 mt-0.5">
                                  Supports JPG, PNG, WEBP, GIF, MP4, MOV up to 100MB
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Active File Thumbnail Card */}
                        {formImageUrl && (
                          <div className="p-3 border border-[#E8E8E6] bg-[#FAFAFA] rounded-xl flex items-center justify-between gap-3 shadow-3xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-12 w-12 rounded-lg bg-zinc-900 overflow-hidden border border-zinc-200 shrink-0">
                                {formImageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                  <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-white">
                                    <Video className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <img src={formImageUrl} alt="Creative" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                                    Active Media
                                  </span>
                                  {formImageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[9px] font-bold uppercase">
                                      Video
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[9px] font-bold uppercase">
                                      Image
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-zinc-700 font-mono truncate mt-0.5" title={formImageUrl}>
                                  {formImageUrl}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => mediaFileInputRef.current?.click()}
                                className="px-2.5 py-1 text-[10.5px] font-bold rounded-md bg-white border border-[#E8E8E6] text-zinc-700 hover:bg-zinc-100 cursor-pointer shadow-3xs"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormImageUrl('')}
                                className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                                title="Remove media"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: Direct Image / Video URL Input */}
                    {creativeMediaTab === 'url' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formImageUrl}
                            onChange={(e) => setFormImageUrl(e.target.value)}
                            placeholder="Enter public image or video URL (e.g. https://domain.com/ad-visual.jpg)..."
                            className="flex-1 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-black focus:outline-none focus:border-black transition-colors"
                          />
                          {formImageUrl && (
                            <button
                              type="button"
                              onClick={() => setFormImageUrl('')}
                              className="h-9 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-md cursor-pointer transition-colors shadow-3xs"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {formImageUrl && (
                          <div className="p-2.5 border border-[#E8E8E6] bg-white rounded-lg flex items-center justify-between gap-3 shadow-3xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                                <img src={formImageUrl} alt="Preview URL" className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-zinc-900 truncate">URL Asset Attached</p>
                                <p className="text-[10px] text-zinc-400 font-mono truncate">{formImageUrl}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormImageUrl('')}
                              className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                              title="Remove media"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: Curated HD Presets */}
                    {creativeMediaTab === 'presets' && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {stockCreatives.map((stock) => (
                          <div
                            key={stock.title}
                            onClick={() => {
                              setFormImageUrl(stock.url);
                              toast.success(stock.title);
                            }}
                            className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square ${
                              formImageUrl === stock.url
                                ? 'border-zinc-950 ring-2 ring-zinc-950/20 shadow-xs'
                                : 'border-[#E8E8E6] hover:border-zinc-400'
                            }`}
                          >
                            <img src={stock.url} alt={stock.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[10px] font-bold text-white leading-tight truncate">
                                {stock.title}
                              </span>
                            </div>
                            {formImageUrl === stock.url && (
                              <div className="absolute top-1.5 right-1.5 h-4.5 w-4.5 rounded-full bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Call to Action & Greeting */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        3. Call to Action & Customer Greeting
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Configure the ad CTA button and the customer&apos;s initial message prompt
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('ctaLabel')}
                        </label>
                        <DropdownSelect
                          options={ctaOptions}
                          value={formCtaType}
                          onChange={(val) => setFormCtaType(val)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                          {t('welcomeMessageLabel')}
                        </label>
                        <input
                          type="text"
                          value={formWelcomeMessage}
                          onChange={(e) => setFormWelcomeMessage(e.target.value)}
                          placeholder={t('welcomeMessagePlaceholder')}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium focus:outline-none focus:border-black text-black transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: 24/7 Automated WhatsApp Flow Bot */}
                  <div className="px-6 sm:px-8 py-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                          4. {t('linkFlowLabel')}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          Connect a visual workflow to qualify leads and answer FAQs 24/7
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                        <Sparkles className="h-3 w-3 text-zinc-700" />
                        <span>24/7 Automated Bot</span>
                      </span>
                    </div>

                    <DropdownSelect
                      options={flowOptions}
                      value={formLinkedFlowId}
                      onChange={(val) => setFormLinkedFlowId(val)}
                      placeholder={t('linkFlowPlaceholder')}
                    />
                  </div>

                  {/* Section 5: Step Action Footer */}
                  <div className="px-6 sm:px-8 py-5 bg-[#FAFAFA]/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigateToStep(2)}
                      className="flex items-center gap-1.5 px-4 h-9 border border-[#E8E8E6] bg-white hover:bg-zinc-50 rounded-md text-xs font-semibold text-zinc-700 transition-colors cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Back to Audience</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePublishCampaign('DRAFT')}
                        disabled={isSubmittingWizard}
                        className="flex items-center gap-1.5 px-4 h-9 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-md text-xs font-bold text-zinc-800 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                      >
                        <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                        <span>Save as Draft</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingWizard}
                        className="flex items-center gap-2 px-6 h-9 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-md shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingWizard ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                            <span>Publishing Campaign...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                            <span>{t('publishAd')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* RIGHT COLUMN: PERSISTENT LIVE SIMULATOR & CAMPAIGN INTELLIGENCE (5 COLS) - STICKY DIVIDER LAYOUT */}
            <div className="lg:col-span-5 divide-y divide-[#E8E8E6] bg-[#FAFAFA]/40 sticky top-0">
              
              {/* Section 1: Live Multi-Platform Ad Simulator */}
              <div className="px-6 sm:px-8 py-6 space-y-4">
                
                {/* Centered Platform Tab Bar */}
                <div className="flex items-center justify-center w-full">
                  <div className="flex items-center gap-1 p-1 bg-[#F5F5F5] rounded-lg border border-[#E8E8E6]">
                    {(['whatsapp', 'instagram', 'facebook', 'stories'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setWizardPreviewPlatform(p)}
                        className={`px-3 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                          wizardPreviewPlatform === p
                            ? 'bg-zinc-950 text-white shadow-3xs'
                            : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {p === 'whatsapp' ? 'WhatsApp' : p === 'instagram' ? 'Instagram' : p === 'facebook' ? 'Facebook' : 'Stories'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Simulator Mockup (No outer container, standard normal width) */}
                <div className="w-full flex flex-col items-center justify-center pt-1">
                  
                  {/* WhatsApp Chat Preview */}
                  {wizardPreviewPlatform === 'whatsapp' && (
                    <div className="w-full max-w-[360px] bg-[#EFEAE2] border border-[#D5D0C7] rounded-2xl overflow-hidden shadow-sm text-zinc-900 animate-fade-in flex flex-col">
                      {/* WhatsApp Top Header Bar */}
                      <div className="bg-[#008069] text-white px-3 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px] text-white">
                            WO
                          </div>
                          <div>
                            <p className="font-bold text-[11px] leading-tight">WhatsOmni Support</p>
                            <p className="text-[9px] text-emerald-100">online • Official Account</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                          <span className="text-xs">⋮</span>
                        </div>
                      </div>

                      {/* WhatsApp Message Body Area */}
                      <div className="p-3 space-y-2.5">
                        {/* Ad Context Referral Card */}
                        <div className="p-2 bg-white/90 border border-zinc-200/70 rounded-lg text-[10px] space-y-1 shadow-3xs">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold text-[8.5px] uppercase">
                            Meta Ad Referral
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {formImageUrl ? (
                              <img src={formImageUrl} alt="Ad Visual" className="h-10 w-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-400 shrink-0">
                                <ImageIcon className="h-4 w-4 text-zinc-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-zinc-900 text-[10.5px] truncate">{formHeadline || 'Chat With Our Team'}</p>
                              <p className="text-zinc-500 text-[9.5px] line-clamp-1">{formPrimaryText}</p>
                            </div>
                          </div>
                        </div>

                        {/* Customer Pre-filled Inbound Message */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-[#E7FED6] rounded-lg p-2.5 shadow-3xs text-xs space-y-1 border border-[#D1F2B5]">
                            <p className="text-[11px] font-medium text-zinc-800 leading-snug">
                              {formWelcomeMessage || 'Hi! I saw your ad and would like to learn more.'}
                            </p>
                            <div className="flex items-center justify-end gap-1 text-[8.5px] text-zinc-400">
                              <span>Just now</span>
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            </div>
                          </div>
                        </div>

                        {/* Automated Flow Bot Reply Mockup */}
                        {formLinkedFlowId && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-white rounded-lg p-2.5 shadow-3xs text-xs space-y-1 border border-zinc-200">
                              <p className="text-[11px] font-semibold text-zinc-900">
                                👋 Welcome! Thanks for reaching out. How can our team assist you today?
                              </p>
                              <div className="pt-1 flex flex-wrap gap-1">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9.5px] font-bold border border-emerald-200">
                                  ⚡ Automated 24/7 Flow Bot
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instagram Preview */}
                  {wizardPreviewPlatform === 'instagram' && (
                    <div className="w-full max-w-[360px] bg-white border border-[#E8E8E6] rounded-2xl shadow-sm overflow-hidden text-zinc-900 animate-fade-in">
                      <div className="p-2.5 border-b border-zinc-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                            <div className="h-full w-full bg-black rounded-full flex items-center justify-center text-white font-bold text-[8px]">
                              WO
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-[11px] leading-tight">WhatsOmni Official</p>
                            <p className="text-[9px] text-zinc-400">Sponsored</p>
                          </div>
                        </div>
                        <span className="text-zinc-400 text-xs">•••</span>
                      </div>
                      <div className="aspect-square w-full bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {formImageUrl && formImageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                          <video src={formImageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : formImageUrl ? (
                          <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 p-6 text-center gap-1.5">
                            <ImageIcon className="h-8 w-8 text-zinc-300" />
                            <p className="text-[10.5px] font-medium text-zinc-400">Add or upload ad creative</p>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 bg-zinc-50 border-y border-zinc-100 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[8.5px] uppercase font-bold text-zinc-400">WHATSAPP</p>
                          <p className="text-xs font-bold truncate text-zinc-900">{formHeadline || 'Chat With Us'}</p>
                        </div>
                        <div className="px-2.5 py-1 bg-[#008069] text-white text-[10px] font-bold rounded flex items-center gap-1 shrink-0">
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </div>
                      </div>
                      <div className="p-2.5 text-xs space-y-1">
                        <p className="text-[11px] leading-snug line-clamp-3">
                          <strong className="font-bold mr-1">WhatsOmni Official</strong>
                          {formPrimaryText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Facebook Feed Preview */}
                  {wizardPreviewPlatform === 'facebook' && (
                    <div className="w-full max-w-[360px] bg-white border border-[#E8E8E6] rounded-2xl shadow-sm overflow-hidden text-zinc-900 animate-fade-in">
                      <div className="p-2.5 border-b border-zinc-100 flex items-center gap-2 text-xs">
                        <div className="h-7 w-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-[9px]">
                          WO
                        </div>
                        <div>
                          <p className="font-bold text-[11px]">WhatsOmni Official</p>
                          <p className="text-[9px] text-zinc-400">Sponsored • 🌐</p>
                        </div>
                      </div>
                      <p className="px-2.5 py-1.5 text-[11px] leading-snug line-clamp-2">{formPrimaryText}</p>
                      <div className="aspect-[1.91/1] w-full bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {formImageUrl && formImageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                          <video src={formImageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : formImageUrl ? (
                          <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 p-4 text-center gap-1">
                            <ImageIcon className="h-7 w-7 text-zinc-300" />
                            <p className="text-[10px] font-medium text-zinc-400">Add or upload ad creative</p>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[8.5px] uppercase font-bold text-zinc-400">WHATSAPP</p>
                          <p className="text-xs font-bold truncate">{formHeadline}</p>
                        </div>
                        <div className="px-2.5 py-1 bg-[#008069] text-white text-[10px] font-bold rounded">
                          Send Message
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stories / Reels Preview */}
                  {wizardPreviewPlatform === 'stories' && (
                    <div className="w-full max-w-[300px] bg-black rounded-2xl shadow-sm overflow-hidden relative aspect-[9/16] max-h-96 flex flex-col justify-between p-3 text-white animate-fade-in">
                      {formImageUrl && formImageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                        <video src={formImageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      ) : formImageUrl ? (
                        <img src={formImageUrl} alt="Stories Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-4 text-center">
                          <ImageIcon className="h-8 w-8 text-zinc-500" />
                          <p className="text-[10.5px] font-medium text-zinc-400">Stories Media</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
                      <div className="relative z-10 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-[8px] border border-white/40">
                          WO
                        </div>
                        <p className="text-[10px] font-bold">WhatsOmni</p>
                      </div>
                      <div className="relative z-10 space-y-1.5 text-center">
                        <p className="text-xs font-bold drop-shadow-md truncate">{formHeadline}</p>
                        <div className="w-full py-1.5 bg-[#008069] text-white text-[10.5px] font-bold rounded-full flex items-center justify-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp Message</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Section 2: Meta AI Campaign Intelligence */}
              <div className="px-6 sm:px-8 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Meta AI Intelligence</h4>
                      <p className="text-[10.5px] text-zinc-400 font-medium">Dynamic reach & conversation estimates</p>
                    </div>
                  </div>
                </div>

                {/* 3-KPI Metric Row - Unified End-to-End Grid */}
                <div className="grid grid-cols-3 divide-x divide-[#E8E8E6] border border-[#E8E8E6] rounded-xl bg-white overflow-hidden shadow-3xs">
                  <div className="p-3 text-center flex flex-col justify-center gap-0.5">
                    <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block">Est. Daily Reach</span>
                    <p className="text-xs sm:text-sm font-black text-zinc-950 font-mono">
                      {Math.round((parseFloat(formDailyBudget) || 25) * 95).toLocaleString()}–{Math.round((parseFloat(formDailyBudget) || 25) * 280).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 text-center flex flex-col justify-center gap-0.5 bg-zinc-50/50">
                    <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider block">Est. Chats</span>
                    <p className="text-xs sm:text-sm font-black text-zinc-950 font-mono">
                      {Math.max(1, Math.round((parseFloat(formDailyBudget) || 25) * 1.8))}–{Math.max(3, Math.round((parseFloat(formDailyBudget) || 25) * 4.8))}<span className="text-[10px] font-medium text-zinc-400">/d</span>
                    </p>
                  </div>

                  <div className="p-3 text-center flex flex-col justify-center gap-0.5">
                    <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block">Est. Cost / Chat</span>
                    <p className="text-xs sm:text-sm font-black text-zinc-950 font-mono">
                      {currencySymbol}{((parseFloat(formDailyBudget) || 25) / Math.max(1, Math.round((parseFloat(formDailyBudget) || 25) * 3.3))).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Audience Definition Gauge */}
                <div className="p-3.5 rounded-xl border border-[#E8E8E6] bg-white space-y-2 shadow-3xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-600 text-[11px]">Audience Definition</span>
                    <span className="font-bold text-zinc-900 text-[11px] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Balanced & Targeted</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                    <div className="w-[30%] bg-zinc-200" />
                    <div className="w-[40%] bg-zinc-900" />
                    <div className="w-[30%] bg-zinc-200" />
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-400 font-medium">
                    <span>Specific</span>
                    <span>Optimal</span>
                    <span>Broad</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Configuration Summary Checklist */}
              <div className="px-6 sm:px-8 py-6 space-y-3">
                <h4 className="text-[10.5px] font-bold text-zinc-900 uppercase tracking-wider">Campaign Configuration</h4>
                <div className="space-y-2 text-xs divide-y divide-[#F0F0EE]">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-500">Ad Account</span>
                    <span className="font-bold text-zinc-900 truncate max-w-[180px]">
                      {selectedAccount ? `${selectedAccount.account_name} (${selectedAccount.currency})` : 'None Selected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-500">Objective</span>
                    <span className="font-bold text-zinc-900">
                      {formObjective === 'MESSAGES' ? 'Click to WhatsApp' : formObjective === 'OUTCOME_LEADS' ? 'Lead Generation' : formObjective === 'OUTCOME_TRAFFIC' ? 'Website Traffic' : 'Conversions & Sales'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-500">Budget</span>
                    <span className="font-bold font-mono text-zinc-900">{currencySymbol}{formDailyBudget} / day ({formBudgetMode === 'CBO' ? 'Advantage CBO' : 'Ad Set ABO'})</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-500">Channel</span>
                    <span className="font-bold text-zinc-900 truncate max-w-[180px]">{formDestination} {formSelectedPhone ? `(${formSelectedPhone})` : ''}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-500">Locations</span>
                    <span className="font-bold font-mono text-zinc-900 truncate max-w-[180px]">{formLocations}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-500">Automation</span>
                    <span className="font-bold text-zinc-900 truncate max-w-[180px]">
                      {formLinkedFlowId ? flows.find(f => String(f.id) === formLinkedFlowId)?.name || 'Linked Flow' : 'Direct WhatsApp Inbox'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* 1. CONNECT META AD ACCOUNT MODAL (WHATSONMI PLATFORM STANDARD) */}
      {showConnectModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 bg-white rounded-t-xl">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-zinc-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('connectAccountTitle') || 'Connect Meta Ad Account'}
                  </h3>
                  <span className="text-[10px] text-zinc-500 block mt-0.5 truncate font-medium">
                    Link your Meta Ads Manager account to sync and manage Click-to-WhatsApp ads
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConnectAccount} className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('adAccountIdLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={connectAccountId}
                  onChange={(e) => setConnectAccountId(e.target.value)}
                  placeholder={t('adAccountIdPlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black font-mono placeholder-zinc-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('adAccountNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={connectAccountName}
                  onChange={(e) => setConnectAccountName(e.target.value)}
                  placeholder="e.g. Primary Marketing Account"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black placeholder-zinc-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('adAccountTokenLabel')}
                </label>
                <input
                  type="password"
                  value={connectToken}
                  onChange={(e) => setConnectToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black placeholder-zinc-400 transition-colors"
                />
                <span className="text-[10px] text-zinc-400 block font-medium">
                  Optional if your system administrator already configured the global Meta System User Token.
                </span>
              </div>

              {/* Action Buttons Footer Strip (Connected End-to-End Divider) */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !connectAccountId}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  ) : (
                    <span>{t('connectAccountBtn')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT DRAFT CAMPAIGN MODAL (EDIT DRAFT PROPERTIES & DIRECT PUBLISH) */}
      {editingDraftModalCampaign && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full shadow-2xl relative z-50 animate-modal-box text-left font-sans overflow-hidden">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-6 py-4 bg-zinc-50/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200/80 p-1 flex items-center justify-center shrink-0 shadow-3xs">
                  <Pencil className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-950">Edit Draft Campaign</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>DRAFT</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Update draft settings before launching to Meta Graph API
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDraftModalCampaign(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Draft Status:</span> This campaign exists locally in WhatsOmni. You can configure campaign details freely. Clicking <strong>Publish to Meta</strong> will push the campaign, ad sets, and creatives live to your Meta Ads account.
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                  <span>Campaign Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={draftForm.name}
                  onChange={(e) => setDraftForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., WhatsApp Lead Acquisition Promo"
                  className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
                />
              </div>

              {/* Objective */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800">Campaign Objective</label>
                <select
                  value={draftForm.objective}
                  onChange={(e) => setDraftForm(prev => ({ ...prev, objective: e.target.value }))}
                  className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-800 focus:outline-none focus:border-black transition-colors"
                >
                  <option value="MESSAGES">MESSAGES — Click to WhatsApp Direct Conversations</option>
                  <option value="OUTCOME_LEADS">OUTCOME_LEADS — Generate Inbound Quality Leads</option>
                  <option value="OUTCOME_ENGAGEMENT">OUTCOME_ENGAGEMENT — Drive Message & Post Engagements</option>
                  <option value="OUTCOME_TRAFFIC">OUTCOME_TRAFFIC — Direct WhatsApp Link Clicks</option>
                  <option value="OUTCOME_SALES">OUTCOME_SALES — Direct WhatsApp Catalog Purchases</option>
                </select>
              </div>

              {/* Daily Budget & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800">Daily Budget ($ USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={draftForm.daily_budget}
                      onChange={(e) => setDraftForm(prev => ({ ...prev, daily_budget: e.target.value }))}
                      className="w-full pl-7 pr-3 h-9 bg-white border border-[#E8E8E6] rounded-md text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800">Budget Mode</label>
                  <select
                    value={draftForm.budget_mode}
                    onChange={(e) => setDraftForm(prev => ({ ...prev, budget_mode: e.target.value as 'CBO' | 'ABO' }))}
                    className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-800 focus:outline-none focus:border-black transition-colors"
                  >
                    <option value="ABO">ABO (Ad Set Budget Allocation)</option>
                    <option value="CBO">CBO (Advantage Campaign Budget)</option>
                  </select>
                </div>
              </div>

              {/* Hierarchy Summary */}
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg space-y-1">
                <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Attached Components</div>
                <div className="text-xs text-zinc-700 flex items-center justify-between">
                  <span>Ad Sets</span>
                  <span className="font-bold text-zinc-950">{editingDraftModalCampaign.ad_sets_count || 1} Ad Set configured</span>
                </div>
                <div className="text-xs text-zinc-700 flex items-center justify-between">
                  <span>Creatives</span>
                  <span className="font-bold text-zinc-950">{editingDraftModalCampaign.total_ads_count || 1} Creative Ad configured</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditingDraftModalCampaign(null)}
                className="h-9 px-4 border border-[#E8E8E6] bg-white text-zinc-600 hover:text-black text-xs font-bold rounded-md transition-all cursor-pointer shadow-3xs"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingDraftModal}
                  onClick={() => handleSaveDraftModal(false)}
                  className="h-9 px-4 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-md shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraftModal ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingDraftModal || publishingCampaignId === editingDraftModalCampaign.id}
                  onClick={() => handleSaveDraftModal(true)}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {publishingCampaignId === editingDraftModalCampaign.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  <span>Publish to Meta</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. UNLINK / ARCHIVE CONFIRMATION MODAL (WHATSONMI PLATFORM STANDARD) */}
      {deleteConfirmItem && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 bg-white rounded-t-xl">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  {deleteConfirmItem.type === 'account' ? (
                    <Unlink className="h-4 w-4 text-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {deleteConfirmItem.type === 'account' ? 'Unlink Meta Ad Account' : (t('toastArchiveTitle') || 'Archive Campaign')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4 text-xs text-zinc-600 leading-relaxed font-medium">
              {deleteConfirmItem.type === 'account'
                ? `Are you sure you want to unlink "${deleteConfirmItem.name}"? You can reconnect it anytime.`
                : (t('toastArchiveWarning') || 'Are you sure you want to archive this campaign?')}
            </div>

            {/* Action Buttons Footer Strip (Connected End-to-End Divider) */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{deleteConfirmItem.type === 'account' ? 'Unlink Account' : (t('toastArchiveConfirm') || 'Archive Campaign')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. OFFICIAL META INSPECTOR SLIDE-OVER DRAWER */}
      {inspectedEntity && mounted && (
        <MetaAdsInspectorDrawer
          inspectedEntity={inspectedEntity}
          setInspectedEntity={setInspectedEntity}
          currencySymbol={currencySymbol}
          analyticsData={analyticsData}
          inspectorLoading={inspectorLoading}
          inspectorTab={inspectorTab}
          setInspectorTab={setInspectorTab}
          inspectorCopiedId={inspectorCopiedId}
          handleCopyMetaId={handleCopyMetaId}
          handleInspectEntity={handleInspectEntity}
          handleDrillCampaignToAdSets={handleDrillCampaignToAdSets}
          handleDrillAdSetToAds={handleDrillAdSetToAds}
          handlePublishDraftCampaign={handlePublishDraftCampaign}
          publishingCampaignId={publishingCampaignId}
          handleToggleStatus={handleToggleStatus}
          selectedAccount={selectedAccount}
          router={router}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
}
