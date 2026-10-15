/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  FormInput,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  RefreshCw,
  Copy,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Download,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Eye,
  Calendar,
  List,
  CheckSquare,
  Radio,
  Type,
  AlignLeft,
  Star,
  MoveUp,
  MoveDown,
  ChevronDown
} from 'lucide-react';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useTranslations } from 'next-intl';

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
}

interface WhatsAppFlow {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  categories: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'REJECTED';
  meta_flow_id: string | null;
  meta_status: string | null;
  meta_validation_errors: any[] | null;
  flow_json: any;
  ui_schema: any;
  preview_url: string | null;
  is_active: boolean;
  sync_status: string;
  submissions_count: number;
  last_synced_at: string | null;
  created_at: string;
  channel_connection_id?: number | null;
  channel_connection?: ChannelConnection | null;
}

interface Submission {
  id: number;
  flow_token: string;
  response_data: Record<string, any>;
  created_at: string;
  contact?: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
  };
  channel_connection?: ChannelConnection;
}

interface FormFieldItem {
  id: string;
  type: 'TextInput' | 'TextArea' | 'Dropdown' | 'RadioButtonsGroup' | 'CheckboxGroup' | 'DatePicker' | 'OptIn' | 'Rating';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { id: string; title: string }[];
}

interface FormScreenItem {
  id: string;
  title: string;
  subtitle?: string;
  fields: FormFieldItem[];
}

interface TemplateBlueprint {
  id: string;
  name: string;
  category: string;
  description: string;
  screens: FormScreenItem[];
}

const PREBUILT_BLUEPRINTS: TemplateBlueprint[] = [
  {
    id: 'lead-generation',
    name: 'Lead Generation & Quote Request',
    category: 'LEAD_GENERATION',
    description: 'Capture business inquiries, company size, and budget requirements directly inside WhatsApp.',
    screens: [
      {
        id: 'SCREEN_LEAD',
        title: 'Request a Custom Quote',
        subtitle: 'Provide brief details to help us prepare your quotation.',
        fields: [
          { id: 'full_name', type: 'TextInput', label: 'Full Name', placeholder: 'e.g. Alex Johnson', required: true },
          { id: 'company_name', type: 'TextInput', label: 'Company Name', placeholder: 'e.g. Acme Corp', required: true },
          {
            id: 'budget_range',
            type: 'Dropdown',
            label: 'Estimated Budget',
            required: true,
            options: [
              { id: 'under_1k', title: 'Under $1,000' },
              { id: '1k_to_5k', title: '$1,000 - $5,000' },
              { id: '5k_to_20k', title: '$5,000 - $20,000' },
              { id: 'above_20k', title: '$20,000+' }
            ]
          },
          { id: 'project_details', type: 'TextArea', label: 'Project Requirements', placeholder: 'Describe your goals...', required: false }
        ]
      }
    ]
  },
  {
    id: 'appointment-booking',
    name: 'Service Appointment Booking',
    category: 'APPOINTMENT_BOOKING',
    description: 'Allow clients to pick preferred service types, dates, and consultation requirements.',
    screens: [
      {
        id: 'SCREEN_BOOKING',
        title: 'Book an Appointment',
        subtitle: 'Select your preferred service and consultation details.',
        fields: [
          {
            id: 'service_type',
            type: 'Dropdown',
            label: 'Select Service',
            required: true,
            options: [
              { id: 'consultation', title: '1-on-1 Strategy Consultation' },
              { id: 'technical_audit', title: 'Technical Architecture Audit' },
              { id: 'enterprise_onboarding', title: 'Enterprise Team Onboarding' }
            ]
          },
          { id: 'preferred_date', type: 'DatePicker', label: 'Preferred Date', required: true },
          {
            id: 'contact_mode',
            type: 'RadioButtonsGroup',
            label: 'Preferred Meeting Channel',
            required: true,
            options: [
              { id: 'video_call', title: 'Google Meet / Zoom' },
              { id: 'phone_call', title: 'Direct Phone Call' },
              { id: 'whatsapp_chat', title: 'WhatsApp Audio / Chat' }
            ]
          },
          { id: 'client_notes', type: 'TextArea', label: 'Additional Information', placeholder: 'Any agenda items...', required: false }
        ]
      }
    ]
  },
  {
    id: 'csat-feedback',
    name: 'Customer Feedback & CSAT Survey',
    category: 'SURVEY',
    description: 'Measure customer happiness, Net Promoter Score, and collect actionable service feedback.',
    screens: [
      {
        id: 'SCREEN_SURVEY',
        title: 'Service Experience Feedback',
        subtitle: 'Your opinion helps us continuously improve our service.',
        fields: [
          {
            id: 'rating',
            type: 'Rating',
            label: 'Overall Satisfaction (1 to 5 Stars)',
            required: true,
            options: [
              { id: '1', title: '1 - Poor' },
              { id: '2', title: '2 - Fair' },
              { id: '3', title: '3 - Good' },
              { id: '4', title: '4 - Very Good' },
              { id: '5', title: '5 - Excellent' }
            ]
          },
          {
            id: 'recommend_likelihood',
            type: 'RadioButtonsGroup',
            label: 'Would you recommend us to a colleague?',
            required: true,
            options: [
              { id: 'definitely', title: 'Definitely Yes' },
              { id: 'maybe', title: 'Maybe / Neutral' },
              { id: 'unlikely', title: 'Unlikely' }
            ]
          },
          { id: 'suggestions', type: 'TextArea', label: 'How can we improve?', placeholder: 'Your comments...', required: false }
        ]
      }
    ]
  },
  {
    id: 'support-ticket',
    name: 'Customer Support & Bug Report',
    category: 'CUSTOMER_SUPPORT',
    description: 'Collect technical issue descriptions, urgency levels, and affected account details.',
    screens: [
      {
        id: 'SCREEN_TICKET',
        title: 'Submit a Support Ticket',
        subtitle: 'Our technical engineering team will review your report.',
        fields: [
          { id: 'issue_title', type: 'TextInput', label: 'Brief Summary of Issue', placeholder: 'e.g. Cannot connect webhook', required: true },
          {
            id: 'severity',
            type: 'Dropdown',
            label: 'Issue Urgency',
            required: true,
            options: [
              { id: 'low', title: 'Low - General question' },
              { id: 'medium', title: 'Medium - Impaired feature' },
              { id: 'high', title: 'High - System outage / blocker' }
            ]
          },
          { id: 'description', type: 'TextArea', label: 'Detailed Description & Steps to Reproduce', placeholder: 'What happened...', required: true }
        ]
      }
    ]
  }
];

export default function WhatsAppFlowsPage() {
  const t = useTranslations('WhatsAppFlows');
  const tCommon = useTranslations('Common');

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<WhatsAppFlow[]>([]);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Active view: 'list' | 'designer'
  const [view, setView] = useState<'list' | 'designer'>('list');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [deleteConfirmFlow, setDeleteConfirmFlow] = useState<WhatsAppFlow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Designer state
  const [currentFlow, setCurrentFlow] = useState<WhatsAppFlow | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('LEAD_GENERATION');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [screens, setScreens] = useState<FormScreenItem[]>([]);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingMeta, setIsSubmittingMeta] = useState(false);

  // Test Send state
  const [sendTargetFlow, setSendTargetFlow] = useState<WhatsAppFlow | null>(null);
  const [sendPhone, setSendPhone] = useState('');
  const [sendHeader, setSendHeader] = useState('');
  const [sendBody, setSendBody] = useState('Please fill out this quick form to continue.');
  const [sendFooter, setSendFooter] = useState('');
  const [sendCta, setSendCta] = useState('Open Form');
  const [isSending, setIsSending] = useState(false);

  // Submissions state
  const [selectedFlowForSubmissions, setSelectedFlowForSubmissions] = useState<WhatsAppFlow | null>(null);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();

    const handleCopilotAction = (e: any) => {
      if (e?.detail?.action?.type?.includes('whatsapp_flow') || e?.detail?.action_type?.includes('whatsapp_flow')) {
        loadData();
      }
    };
    window.addEventListener('copilot:action-executed', handleCopilotAction);
    return () => window.removeEventListener('copilot:action-executed', handleCopilotAction);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [flowsRes, channelsRes] = await Promise.all([
        fetchWithCsrf('/whatsapp-flows'),
        fetchWithCsrf('/channels')
      ]);

      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        const rawList = Array.isArray(flowsData) ? flowsData : (flowsData.flows || flowsData.data || []);
        setFlows(rawList);
      }
      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        const chList = Array.isArray(channelsData) ? channelsData : (channelsData.channels || channelsData.data || []);
        setChannels(chList.filter((c: any) =>
          ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api', 'whatsapp_baileys', 'baileys'].includes(c.channel_type) ||
          (c.channel_type && (c.channel_type.includes('whatsapp') || c.channel_type.includes('baileys')))
        ));
      }
    } catch {
      toast.error(t('toastSaveFailed') || 'Failed to load WhatsApp Flows.');
    } finally {
      setLoading(false);
    }
  };

  // Filter flows
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.meta_flow_id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || f.categories?.includes(categoryFilter);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'PUBLISHED' && f.status === 'PUBLISHED') ||
        (statusFilter === 'SUBMITTED' && (f.status === 'SUBMITTED' || f.status === 'IN_REVIEW')) ||
        (statusFilter === 'DRAFT' && (f.status === 'DRAFT' || !f.status)) ||
        (statusFilter === 'REJECTED' && f.status === 'REJECTED');

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [flows, searchQuery, categoryFilter, statusFilter]);

  const categoryOptions = [
    { value: 'all', label: t('allCategories') },
    { value: 'LEAD_GENERATION', label: t('leadGeneration') },
    { value: 'APPOINTMENT_BOOKING', label: t('appointmentBooking') },
    { value: 'CUSTOMER_SUPPORT', label: t('customerSupport') },
    { value: 'SURVEY', label: t('surveyFeedback') },
    { value: 'OTHER', label: t('other') },
  ];

  const statusOptions = [
    { value: 'all', label: t('allStatus') },
    { value: 'PUBLISHED', label: t('statusPublished') },
    { value: 'SUBMITTED', label: t('statusInReview') },
    { value: 'DRAFT', label: t('statusDraft') },
    { value: 'REJECTED', label: t('statusRejected') },
  ];

  const { setCustomHeader } = useHeaderStore();

  const getCategoryLabel = (cat: string) => {
    const match = categoryOptions.find((o) => o.value === cat);
    return match ? match.label : cat.replace(/_/g, ' ');
  };

  // Open Create Flow Form (Directly into Designer, matching platform pattern)
  const handleOpenCreate = () => {
    setFormName(t('newFlowFormDefault'));
    setFormDescription('');
    setFormCategory('LEAD_GENERATION');
    setSelectedChannelId(channels[0]?.id ? String(channels[0].id) : '');
    setScreens([
      {
        id: 'SCREEN_ONE',
        title: t('newFlowFormDefault'),
        subtitle: t('newFlowFormSubtitle'),
        fields: [
          { id: 'full_name', type: 'TextInput', label: t('fullNameLabel'), placeholder: t('enterNamePlaceholder'), required: true },
          { id: 'email_address', type: 'TextInput', label: t('emailAddressLabel'), placeholder: 'name@company.com', required: true }
        ]
      }
    ]);
    setActiveScreenIndex(0);
    setCurrentFlow(null);
    setView('designer');
  };

  // Open Designer from Existing Flow
  const handleOpenDesigner = (flow: WhatsAppFlow) => {
    setCurrentFlow(flow);
    setFormName(flow.name);
    setFormDescription(flow.description || '');
    setFormCategory(flow.categories?.[0] || 'LEAD_GENERATION');
    setSelectedChannelId(flow.channel_connection_id ? String(flow.channel_connection_id) : (channels[0]?.id.toString() || ''));
    
    if (flow.ui_schema?.screens && Array.isArray(flow.ui_schema.screens)) {
      setScreens(flow.ui_schema.screens);
    } else {
      setScreens([
        {
          id: 'SCREEN_ONE',
          title: flow.name,
          subtitle: flow.description || '',
          fields: [
            { id: 'field_1', type: 'TextInput', label: 'Your Response', placeholder: 'Type here...', required: true }
          ]
        }
      ]);
    }
    setActiveScreenIndex(0);
    setView('designer');
  };

  // Apply Prebuilt Blueprint
  const handleApplyBlueprint = (blueprint: TemplateBlueprint) => {
    setFormName(blueprint.name);
    setFormDescription(blueprint.description);
    setFormCategory(blueprint.category);
    setScreens(JSON.parse(JSON.stringify(blueprint.screens)));
    setActiveScreenIndex(0);
    setShowTemplateModal(false);
    setView('designer');
  };

  // Save Flow Changes
  const handleSaveFlow = async () => {
    if (!formName.trim()) {
      toast.error(t('toastSaveFailed'));
      return;
    }

    setIsSaving(true);
    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      categories: [formCategory],
      channel_connection_id: selectedChannelId ? Number(selectedChannelId) : null,
      ui_schema: { screens },
      status: currentFlow ? currentFlow.status : 'DRAFT'
    };

    try {
      const url = currentFlow ? `/whatsapp-flows/${currentFlow.id}` : '/whatsapp-flows';
      const method = currentFlow ? 'PUT' : 'POST';
      const res = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || t('toastSaved'));
        if (!currentFlow && data.flow) {
          setCurrentFlow(data.flow);
        }
        loadData();
      } else {
        toast.error(data.message || t('toastSaveFailed'));
      }
    } catch {
      toast.error(t('toastSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Submit to Meta Review
  const handleSubmitToMeta = async () => {
    if (!currentFlow) {
      toast.error(t('toastSaveFailed'));
      return;
    }

    setIsSubmittingMeta(true);
    try {
      const res = await fetchWithCsrf(`/whatsapp-flows/${currentFlow.id}/submit-meta`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('toastMetaSubmitted'));
        if (data.flow) {
          setCurrentFlow(data.flow);
        }
        loadData();
      } else {
        toast.error(data.message || t('toastMetaFailed'));
      }
    } catch {
      toast.error(t('toastMetaFailed'));
    } finally {
      setIsSubmittingMeta(false);
    }
  };

  // Sync Status with Meta
  const handleSyncMeta = async (flowId: number) => {
    setSyncingId(flowId);
    try {
      const res = await fetchWithCsrf(`/whatsapp-flows/${flowId}/sync-meta`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toastMetaSynced', { status: data.status || 'DRAFT' }));
        loadData();
      } else {
        toast.error(data.message || t('toastSyncFailed'));
      }
    } catch {
      toast.error(t('toastSyncFailed'));
    } finally {
      setSyncingId(null);
    }
  };

  // Duplicate Flow
  const handleDuplicateFlow = async (flow: WhatsAppFlow) => {
    try {
      const payload = {
        name: `${flow.name} (Copy)`,
        description: flow.description,
        categories: flow.categories,
        channel_connection_id: flow.channel_connection_id,
        ui_schema: flow.ui_schema,
        status: 'DRAFT'
      };
      const res = await fetchWithCsrf('/whatsapp-flows', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(t('toastDuplicated', { name: flow.name }));
        loadData();
      } else {
        toast.error(t('toastDuplicateFailed'));
      }
    } catch {
      toast.error(t('toastDuplicateFailed'));
    }
  };

  // Delete Flow
  const handleDeleteFlow = async () => {
    if (!deleteConfirmFlow) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithCsrf(`/whatsapp-flows/${deleteConfirmFlow.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(t('toastDeleted', { name: deleteConfirmFlow.name }));
        setDeleteConfirmFlow(null);
        if (view === 'designer' && currentFlow?.id === deleteConfirmFlow.id) {
          setView('list');
        }
        loadData();
      } else {
        toast.error(t('toastDeleteFailed'));
      }
    } catch {
      toast.error(t('toastDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Test Send
  const handleOpenSend = (flow: WhatsAppFlow) => {
    setSendTargetFlow(flow);
    setSendHeader(flow.name);
    setSendBody(flow.description || 'Please complete this quick form to continue.');
    setSendFooter('Powered by WhatsOmni');
    setSendCta(t('openForm') || 'Open Form');
    setSendPhone('');
    setShowSendModal(true);
  };

  // Dispatch Test Send
  const handleDispatchSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTargetFlow || !sendPhone.trim()) {
      toast.error(t('toastPhoneRequired'));
      return;
    }

    setIsSending(true);
    try {
      const res = await fetchWithCsrf('/whatsapp-flows/send', {
        method: 'POST',
        body: JSON.stringify({
          whatsapp_flow_id: sendTargetFlow.id,
          phone: sendPhone.trim(),
          header: sendHeader.trim() || undefined,
          body: sendBody.trim(),
          footer: sendFooter.trim() || undefined,
          flow_cta: sendCta.trim() || 'Open Form',
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t('toastSendSuccess'));
        setShowSendModal(false);
      } else {
        toast.error(data.message || t('toastSendFailed'));
      }
    } catch {
      toast.error(t('toastSendFailed'));
    } finally {
      setIsSending(false);
    }
  };

  // Open Submissions
  const handleOpenSubmissions = async (flow: WhatsAppFlow) => {
    setSelectedFlowForSubmissions(flow);
    setShowSubmissionsModal(true);
    setSubmissionsLoading(true);
    try {
      const res = await fetchWithCsrf(`/whatsapp-flows/${flow.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissionsList(Array.isArray(data) ? data : (data.data || []));
      }
    } catch {
      toast.error(t('toastSaveFailed'));
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (submissionsList.length === 0) {
      return;
    }
    const headers = ['Submission ID', 'Date & Time', 'Contact Name', 'Phone', 'Answers'];
    const rows = submissionsList.map((sub) => [
      sub.id,
      new Date(sub.created_at).toLocaleString(),
      sub.contact ? `${sub.contact.first_name} ${sub.contact.last_name}` : 'Customer',
      sub.contact?.phone || 'N/A',
      JSON.stringify(sub.response_data || {}),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flow_${selectedFlowForSubmissions?.id}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Count fields
  const countTotalFields = (flow: WhatsAppFlow) => {
    if (!flow.ui_schema?.screens) return 0;
    return flow.ui_schema.screens.reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0);
  };

  // Designer Field Helpers
  const currentScreen = screens[activeScreenIndex] || screens[0];

  const addFieldToScreen = (type: FormFieldItem['type']) => {
    const newFieldId = `field_${Date.now().toString(36)}`;
    let defaultLabel = 'New Field';
    let options: { id: string; title: string }[] | undefined = undefined;

    if (type === 'TextInput') defaultLabel = 'Short Text Question';
    if (type === 'TextArea') defaultLabel = 'Detailed Feedback';
    if (type === 'Dropdown' || type === 'RadioButtonsGroup' || type === 'CheckboxGroup') {
      defaultLabel = 'Select an Option';
      options = [
        { id: 'opt_1', title: 'Option 1' },
        { id: 'opt_2', title: 'Option 2' },
      ];
    }
    if (type === 'Rating') {
      defaultLabel = 'Service Rating (1 to 5)';
      options = [
        { id: '1', title: '1' },
        { id: '2', title: '2' },
        { id: '3', title: '3' },
        { id: '4', title: '4' },
        { id: '5', title: '5' },
      ];
    }
    if (type === 'DatePicker') defaultLabel = 'Select Date';
    if (type === 'OptIn') defaultLabel = 'I accept terms and conditions';

    const newField: FormFieldItem = {
      id: newFieldId,
      type,
      label: defaultLabel,
      required: true,
      options,
    };

    setScreens((prev) => {
      const copy = [...prev];
      if (!copy[activeScreenIndex]) return prev;
      copy[activeScreenIndex] = {
        ...copy[activeScreenIndex],
        fields: [...(copy[activeScreenIndex].fields || []), newField],
      };
      return copy;
    });
  };

  const updateField = (fieldIndex: number, updates: Partial<FormFieldItem>) => {
    setScreens((prev) => {
      const copy = [...prev];
      if (!copy[activeScreenIndex]) return prev;
      const f = [...copy[activeScreenIndex].fields];
      f[fieldIndex] = { ...f[fieldIndex], ...updates };
      copy[activeScreenIndex] = { ...copy[activeScreenIndex], fields: f };
      return copy;
    });
  };

  const removeField = (fieldIndex: number) => {
    setScreens((prev) => {
      const copy = [...prev];
      if (!copy[activeScreenIndex]) return prev;
      const f = copy[activeScreenIndex].fields.filter((_, i) => i !== fieldIndex);
      copy[activeScreenIndex] = { ...copy[activeScreenIndex], fields: f };
      return copy;
    });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= (currentScreen?.fields?.length || 0)) return;
    setScreens((prev) => {
      const copy = [...prev];
      if (!copy[activeScreenIndex]) return prev;
      const f = [...copy[activeScreenIndex].fields];
      const temp = f[index];
      f[index] = f[targetIndex];
      f[targetIndex] = temp;
      copy[activeScreenIndex] = { ...copy[activeScreenIndex], fields: f };
      return copy;
    });
  };

  const getStatusBadge = (status: string) => {
    const norm = (status || '').toUpperCase();
    if (norm === 'PUBLISHED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8FDE8] text-[#25D366] border border-[#25D366]/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
          <span>{t('statusPublished')}</span>
        </span>
      );
    }
    if (norm === 'SUBMITTED' || norm === 'IN_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{t('statusInReview')}</span>
        </span>
      );
    }
    if (norm === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-600 border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span>{t('statusRejected')}</span>
        </span>
      );
    }
    if (norm === 'DEPRECATED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-500 border border-zinc-200">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          <span>{t('statusDeprecated')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-500 border border-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        <span>{t('statusDraft')}</span>
      </span>
    );
  };

  // Global Header Sync for Visual Form Designer
  useEffect(() => {
    if (!mounted) return;

    if (view !== 'designer') {
      setCustomHeader(null);
      return;
    }

    setCustomHeader(
      <header className="h-16 border-b border-[#E8E8E6] px-6 lg:px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            type="button"
            onClick={() => {
              setView('list');
              setCustomHeader(null);
            }}
            className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title={t('title') || 'Back to WhatsApp Flows'}
          >
            <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
          <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase truncate">
            {currentFlow ? t('editFlowForm') : t('createFlowForm')}
          </h2>
          {formName && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E8E8E6]">
              <span className="text-xs font-semibold text-zinc-500 max-w-xs truncate">
                {formName}
              </span>
            </div>
          )}
          {currentFlow && (
            <div className="hidden md:block">
              {getStatusBadge(currentFlow.status)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setView('list');
              setCustomHeader(null);
            }}
            className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
          >
            {t('cancel')}
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="h-8 px-3.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer hidden md:flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#4AE54A]" />
            <span>{t('templates')}</span>
          </button>

          {currentFlow && (
            <button
              type="button"
              onClick={() => handleOpenSend(currentFlow)}
              className="h-8 px-3.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('sendTest')}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !formName.trim()}
            onClick={handleSaveFlow}
            className="h-8 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99"
          >
            {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
            <span>{isSaving ? t('saving') : (currentFlow ? t('saveChanges') : t('deployFlowForm'))}</span>
          </button>

          {currentFlow && (
            <button
              type="button"
              disabled={isSubmittingMeta}
              onClick={handleSubmitToMeta}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer hidden sm:flex items-center gap-1.5 active:scale-99"
            >
              {isSubmittingMeta ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              )}
              <span>{isSubmittingMeta ? t('submitting') : t('submitToMeta')}</span>
            </button>
          )}
        </div>
      </header>
    );

    return () => {
      setCustomHeader(null);
    };
  }, [
    mounted,
    view,
    currentFlow,
    formName,
    formCategory,
    formDescription,
    selectedChannelId,
    screens,
    isSaving,
    isSubmittingMeta,
    setCustomHeader,
    t
  ]);

  return (
    <>
      {view === 'designer' ? (
        <div className="w-full bg-white font-sans text-zinc-950 select-none flex-1 overflow-y-auto animate-fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 w-full items-start">
            
            {/* LEFT COLUMN: COMPOSER CONTROLS (8 Cols on lg, 9 Cols on 2xl) */}
            <div className="lg:col-span-8 2xl:col-span-9 divide-y divide-[#E8E8E6] lg:border-r border-[#E8E8E6]">
              
              {/* 1. FLOW CONFIGURATION & METADATA */}
              <div className="px-6 sm:px-8 py-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                      {t('metadataTitle')}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                      {t('metadataDesc')}
                    </p>
                  </div>
                </div>

                {/* Flow Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    {t('flowName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t('flowNamePlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                  />
                  <span className="text-[9.5px] text-zinc-400 font-medium block">
                    {t('flowNameHelp')}
                  </span>
                </div>

                {/* Category & Channel Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      {t('category')}
                    </label>
                    <DropdownSelect
                      options={categoryOptions.filter(o => o.value !== 'all')}
                      value={formCategory}
                      onChange={(val) => setFormCategory(val)}
                      placeholder={t('selectCategory')}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      {t('targetChannel')}
                    </label>
                    <DropdownSelect
                      options={channels.map(c => ({ value: c.id.toString(), label: `[${c.channel_type.toUpperCase()}] ${c.name}` }))}
                      value={selectedChannelId}
                      onChange={(val) => setSelectedChannelId(val)}
                      placeholder={t('chooseChannel')}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    {t('description')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('descriptionPlaceholder')}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              {/* 2. SCREEN CONFIGURATION */}
              {currentScreen && (
                <div className="px-6 sm:px-8 py-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        {t('screenConfigTitle')}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        {t('screenConfigDesc')}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-[#F5F5F5] px-2.5 py-1 rounded-[4px] border border-[#E8E8E6]">
                      {t('screenId')}: {currentScreen.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                        {t('screenTitle')}
                      </label>
                      <input
                        type="text"
                        value={currentScreen.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScreens(prev => {
                            const copy = [...prev];
                            if (copy[activeScreenIndex]) {
                              copy[activeScreenIndex] = { ...copy[activeScreenIndex], title: val };
                            }
                            return copy;
                          });
                        }}
                        placeholder={t('screenTitlePlaceholder')}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                        {t('screenSubtitle')}
                      </label>
                      <input
                        type="text"
                        value={currentScreen.subtitle || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScreens(prev => {
                            const copy = [...prev];
                            if (copy[activeScreenIndex]) {
                              copy[activeScreenIndex] = { ...copy[activeScreenIndex], subtitle: val };
                            }
                            return copy;
                          });
                        }}
                        placeholder={t('screenSubtitlePlaceholder')}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. FORM QUESTIONS & FIELDS LIST */}
              {currentScreen && (
                <div className="px-6 sm:px-8 py-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                        {t('questionsTitle')} ({currentScreen.fields?.length || 0})
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        {t('questionsDesc')}
                      </p>
                    </div>
                    <span className="text-[10.5px] font-bold text-zinc-600 bg-[#F5F5F5] px-2.5 py-1 rounded-[4px] border border-[#E8E8E6]">
                      {currentScreen.fields?.length || 0} {t('components')}
                    </span>
                  </div>

                  {(!currentScreen.fields || currentScreen.fields.length === 0) ? (
                    <div className="p-8 border border-dashed border-[#E8E8E6] rounded-xl text-center space-y-2">
                      <FormInput className="h-7 w-7 text-zinc-400 mx-auto" />
                      <span className="text-xs font-bold text-zinc-700 block">{t('noFieldsYet')}</span>
                      <span className="text-[11px] text-zinc-400 block">{t('noFieldsYetDesc')}</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {currentScreen.fields.map((field, fIdx) => (
                        <div
                          key={field.id}
                          className="p-4 border border-[#E8E8E6] bg-[#FAFAFA] rounded-xl space-y-3 relative group transition-all hover:border-zinc-300"
                        >
                          {/* Card Top Strip */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-zinc-200/70 border border-zinc-250 text-zinc-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {fIdx + 1}
                              </span>
                              <span className="text-[9.5px] font-bold bg-white border border-[#E8E8E6] text-zinc-650 px-2 py-0.5 rounded-[4px] uppercase tracking-wider select-none">
                                {field.type.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Reorder Arrows */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={fIdx === 0}
                                  onClick={() => moveField(fIdx, -1)}
                                  className="h-6 w-6 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed shadow-3xs transition-all cursor-pointer"
                                  title={t('moveUp')}
                                >
                                  <MoveUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={fIdx === (currentScreen.fields.length - 1)}
                                  onClick={() => moveField(fIdx, 1)}
                                  className="h-6 w-6 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed shadow-3xs transition-all cursor-pointer"
                                  title={t('moveDown')}
                                >
                                  <MoveDown className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Required Checkbox */}
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={field.required !== false}
                                  onChange={(e) => updateField(fIdx, { required: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-0 cursor-pointer"
                                />
                                <span>{t('required')}</span>
                              </label>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={() => removeField(fIdx)}
                                className="h-6 w-6 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-red-50 hover:border-red-200 flex items-center justify-center text-zinc-400 hover:text-red-600 shadow-3xs transition-all cursor-pointer"
                                title={t('deleteField')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Field Label and Placeholder */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                {t('questionLabel')}
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(fIdx, { label: e.target.value })}
                                placeholder={t('questionLabelPlaceholder')}
                                className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                              />
                            </div>

                            {(field.type === 'TextInput' || field.type === 'TextArea') && (
                              <div className="space-y-1">
                                <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                  {t('placeholderWatermark')}
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateField(fIdx, { placeholder: e.target.value })}
                                  placeholder={t('placeholderWatermarkExample')}
                                  className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-medium transition-colors"
                                />
                              </div>
                            )}
                          </div>

                          {/* Options Editor for Choice Fields */}
                          {(field.type === 'Dropdown' || field.type === 'RadioButtonsGroup' || field.type === 'CheckboxGroup') && (
                            <div className="space-y-2 pt-2 border-t border-[#E8E8E6]">
                              <div className="flex items-center justify-between">
                                <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                  {t('choiceOptions')}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOpts = [
                                      ...(field.options || []),
                                      { id: `opt_${Date.now().toString(36)}`, title: `Option ${(field.options?.length || 0) + 1}` }
                                    ];
                                    updateField(fIdx, { options: newOpts });
                                  }}
                                  className="h-6 px-2.5 text-[10.5px] font-semibold text-zinc-700 bg-white hover:bg-zinc-50 hover:text-black border border-[#E8E8E6] rounded-[6px] inline-flex items-center gap-1 shadow-3xs transition-all cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>{t('addOption')}</span>
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                {field.options?.map((opt, oIdx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-400 w-4 text-center">{oIdx + 1}.</span>
                                    <input
                                      type="text"
                                      value={opt.title}
                                      onChange={(e) => {
                                        const newTitle = e.target.value;
                                        const newOpts = [...(field.options || [])];
                                        newOpts[oIdx] = { ...newOpts[oIdx], title: newTitle };
                                        updateField(fIdx, { options: newOpts });
                                      }}
                                      className="h-7 px-2.5 text-xs bg-white border border-[#E8E8E6] rounded flex-1 focus:outline-none focus:border-black font-medium transition-colors"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newOpts = field.options?.filter((_, i) => i !== oIdx);
                                        updateField(fIdx, { options: newOpts });
                                      }}
                                      className="h-7 w-7 rounded-[6px] border border-transparent hover:border-red-200 hover:bg-red-50 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer text-xs"
                                      title={t('removeOption')}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ADD COMPONENT PALETTE */}
              <div className="px-6 sm:px-8 py-7 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                    {t('addComponentTitle')}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    {t('addComponentDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'TextInput', label: t('shortText'), desc: t('shortTextDesc'), icon: Type },
                    { type: 'TextArea', label: t('longText'), desc: t('longTextDesc'), icon: AlignLeft },
                    { type: 'Dropdown', label: t('dropdown'), desc: t('dropdownDesc'), icon: List },
                    { type: 'RadioButtonsGroup', label: t('singleChoice'), desc: t('singleChoiceDesc'), icon: Radio },
                    { type: 'CheckboxGroup', label: t('checkboxes'), desc: t('checkboxesDesc'), icon: CheckSquare },
                    { type: 'Rating', label: t('starRating'), desc: t('starRatingDesc'), icon: Star },
                    { type: 'DatePicker', label: t('datePicker'), desc: t('datePickerDesc'), icon: Calendar },
                    { type: 'OptIn', label: t('consentOptIn'), desc: t('consentOptInDesc'), icon: Check },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addFieldToScreen(item.type as any)}
                        className="p-3 bg-white hover:bg-zinc-50 border border-[#E8E8E6] hover:border-black/30 rounded-[8px] text-left transition-all cursor-pointer shadow-3xs group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-7 w-7 rounded-[6px] bg-[#F5F5F5] border border-[#E8E8E6] flex items-center justify-center text-zinc-600 group-hover:text-black group-hover:bg-white group-hover:border-zinc-300 transition-all">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-zinc-900 group-hover:text-black block truncate">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-medium block truncate">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: REAL-TIME FLOW PREVIEW (Edge-to-edge covering all available space) */}
            <div className="lg:col-span-4 2xl:col-span-3 sticky top-0 flex flex-col h-[calc(100vh-4rem)] bg-white border-t lg:border-t-0 lg:border-l border-[#E8E8E6] select-none overflow-hidden text-left">
              {/* WhatsApp Top Navigation Bar */}
              <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ArrowLeft className="h-4 w-4 opacity-90 shrink-0 cursor-pointer hover:opacity-100 transition-opacity" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate max-w-[210px]">
                      {formName || 'WhatsApp Form'}
                    </p>
                    <p className="text-[10px] text-emerald-100/85 font-medium leading-none mt-0.5">{t('interactiveFlow')}</p>
                  </div>
                </div>
                <X className="h-4 w-4 opacity-80 cursor-pointer hover:opacity-100 transition-opacity" />
              </div>

              {/* Flow Screen Content - Covers all available space */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
                {/* Screen Title & Subtitle */}
                <div className="p-4 pb-3 border-b border-zinc-100 shrink-0 bg-white">
                  <h3 className="text-sm font-bold text-zinc-900 leading-snug">
                    {currentScreen?.title || formName}
                  </h3>
                  {currentScreen?.subtitle && (
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      {currentScreen.subtitle}
                    </p>
                  )}
                </div>

                {/* Questions / Fields Mockup - Scrollable flex-1 */}
                <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
                  {(!currentScreen?.fields || currentScreen.fields.length === 0) ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-zinc-400 text-xs font-medium space-y-1">
                      <FormInput className="h-6 w-6 text-zinc-300 mx-auto mb-1" />
                      <span>{t('noFieldsYet')}</span>
                      <span className="text-[10px] text-zinc-300">{t('noFieldsYetDesc')}</span>
                    </div>
                  ) : (
                    currentScreen.fields.map((f) => (
                      <div key={f.id} className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-800 block">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </label>

                        {f.type === 'TextInput' && (
                          <div className="h-8 w-full border border-zinc-300 rounded-md px-2.5 text-[11px] flex items-center text-zinc-400 bg-zinc-50/50">
                            {f.placeholder || t('typeHerePlaceholder')}
                          </div>
                        )}

                        {f.type === 'TextArea' && (
                          <div className="h-16 w-full border border-zinc-300 rounded-md p-2.5 text-[11px] text-zinc-400 bg-zinc-50/50">
                            {f.placeholder || t('enterMessagePlaceholder')}
                          </div>
                        )}

                        {f.type === 'Dropdown' && (
                          <div className="h-8 w-full border border-zinc-300 rounded-md px-2.5 text-[11px] flex items-center justify-between text-zinc-500 bg-zinc-50/50">
                            <span>{t('selectOptionPlaceholder')}</span>
                            <ChevronDown className="h-3 w-3 text-zinc-400" />
                          </div>
                        )}

                        {(f.type === 'RadioButtonsGroup' || f.type === 'CheckboxGroup') && (
                          <div className="space-y-1.5 pl-1">
                            {f.options?.slice(0, 4).map((o, idx) => (
                              <div key={o.id} className="flex items-center gap-2 text-[11px] text-zinc-700">
                                <div className={`h-3 w-3 border flex items-center justify-center ${
                                  f.type === 'RadioButtonsGroup' ? 'rounded-full' : 'rounded'
                                } ${idx === 0 ? 'border-[#008069] bg-[#008069]' : 'border-zinc-400 bg-white'}`}>
                                  {idx === 0 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="truncate">{o.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {f.type === 'Rating' && (
                          <div className="flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        )}

                        {f.type === 'DatePicker' && (
                          <div className="h-8 w-full border border-zinc-300 rounded-md px-2.5 text-[11px] flex items-center gap-2 text-zinc-400 bg-zinc-50/50">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            <span>YYYY-MM-DD</span>
                          </div>
                        )}

                        {f.type === 'OptIn' && (
                          <div className="flex items-start gap-2 text-[10.5px] text-zinc-600 leading-snug">
                            <div className="h-3.5 w-3.5 border border-zinc-400 rounded mt-0.5 shrink-0" />
                            <span>{f.label}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Native Submit Button at Bottom */}
                <div className="p-4 pt-3 border-t border-zinc-100 shrink-0 bg-white">
                  <button
                    type="button"
                    className="w-full bg-[#008069] hover:bg-[#006A57] text-white text-xs font-bold py-2.5 rounded-full flex items-center justify-center shadow-3xs cursor-pointer transition-colors"
                  >
                    {t('submitForm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full p-8 space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto font-sans">
      {/* Search and Action Header Row (Standard Platform Layout) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
        {/* Left Search / Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 w-64 md:w-72 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
            />
          </div>

          <DropdownSelect
            options={categoryOptions}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            placeholder={t('allCategories')}
            className="w-auto min-w-[145px]"
          />

          <DropdownSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder={t('allStatus')}
            className="w-auto min-w-[130px]"
          />

          <button
            onClick={loadData}
            title={tCommon('refresh') || 'Refresh'}
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
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('createBtn')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Table Area */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader message={tCommon('loading') || 'Loading...'} />
        </div>
      ) : filteredFlows.length === 0 ? (
        /* Empty State (Exact match to standard flows empty state) */
        <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-row-fade shadow-3xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? t('emptySearchTitle')
              : t('emptyTitle')}
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? t('emptySearchDesc')
              : t('emptyDesc')}
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
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('createBtn')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Data Table (Exact Section 24.10 Standard) */
        <div className="space-y-4">
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5 w-72 max-w-[280px]">{t('tableFlowName')}</th>
                    <th className="px-6 py-3.5">{t('tableCategory')}</th>
                    <th className="px-6 py-3.5">{t('tableChannels')}</th>
                    <th className="px-6 py-3.5">{t('tableSubmissions')}</th>
                    <th className="px-6 py-3.5">{t('tableMetaStatus')}</th>
                    <th className="px-6 py-3.5 text-right">{t('tableActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {filteredFlows.map((flow) => {
                    const totalFields = countTotalFields(flow);
                    const screensCount = flow.ui_schema?.screens?.length || 1;

                    return (
                      <tr key={flow.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        {/* Name & info */}
                        <td className="px-6 py-4 w-72 max-w-[280px]">
                          <div className="flex flex-col text-left overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleOpenDesigner(flow)}
                              title={flow.name}
                              className="font-bold text-zinc-955 text-xs hover:underline inline-flex items-center gap-1.5 group cursor-pointer truncate max-w-full text-left"
                            >
                              <span className="truncate">{flow.name}</span>
                              <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                            {flow.description && (
                              <span title={flow.description} className="text-[10px] text-zinc-400 font-semibold mt-0.5 truncate block max-w-full">
                                {flow.description}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[9.5px] text-zinc-500">
                              <span className="font-semibold text-zinc-600">
                                {screensCount === 1 ? t('screenCount', { count: screensCount }) : t('screensCount', { count: screensCount })}
                              </span>
                              <span>•</span>
                              <span>{t('fieldsCount', { count: totalFields })}</span>
                              {flow.meta_flow_id && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-zinc-500 text-[9px]">ID: {flow.meta_flow_id}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-zinc-600 font-semibold text-xs capitalize">
                            {(flow.categories?.[0] || 'LEAD_GENERATION').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Channel (Icon only) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <img
                              src="/channels/whatsapp.webp"
                              alt="WhatsApp"
                              className="h-4.5 w-4.5 object-contain shrink-0"
                            />
                            <span className="text-xs font-semibold text-zinc-700">
                              {flow.channel_connection?.name || 'WhatsApp Cloud API'}
                            </span>
                          </div>
                        </td>

                        {/* Submissions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissions(flow)}
                            className="font-bold text-zinc-955 text-xs font-mono hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>
                              {(flow.submissions_count || 0) === 1
                                ? t('entry', { count: flow.submissions_count || 0 })
                                : t('entries', { count: flow.submissions_count || 0 })}
                            </span>
                            <ExternalLink className="h-3 w-3 text-zinc-400" />
                          </button>
                        </td>

                        {/* Meta Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(flow.status)}
                            {flow.meta_flow_id && (
                              <button
                                type="button"
                                onClick={() => handleSyncMeta(flow.id)}
                                disabled={syncingId === flow.id}
                                title={t('syncWithMeta')}
                                className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-100 transition-colors"
                              >
                                <RefreshCw className={`h-3 w-3 ${syncingId === flow.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDesigner(flow)}
                              className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title={t('editFlow')}
                            >
                              <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                              <span>{t('editFlow')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSend(flow)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              title={t('sendTestForm')}
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateFlow(flow)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              title={t('duplicateFlow')}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
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

            {/* Footer Summary Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-3.5 flex items-center justify-between text-xs text-[#6B6B6B] select-none font-semibold">
              <span>{filteredFlows.length} / {flows.length}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-medium">Meta WhatsApp Cloud API v21.0</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE FLOW MODAL (Standard Platform DialogModal) */}
      {/* ========================================================= */}
      {mounted && showCreateModal && createPortal(
        <div
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none font-sans"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <FormInput className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('createModalTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-7 w-7 rounded-[6px] border border-transparent hover:border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('flowName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('flowNamePlaceholder')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full pl-3 pr-3 h-9 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-semibold transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('category')}
                </label>
                <DropdownSelect
                  options={categoryOptions.filter(o => o.value !== 'all')}
                  value={formCategory}
                  onChange={(val) => setFormCategory(val)}
                  placeholder={t('selectCategory')}
                />
              </div>

              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('targetChannel')}
                </label>
                <DropdownSelect
                  options={channels.map(c => ({ value: c.id.toString(), label: c.name }))}
                  value={selectedChannelId}
                  onChange={(val) => setSelectedChannelId(val)}
                  placeholder={t('selectChannel')}
                />
              </div>

              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('description')}
                </label>
                <input
                  type="text"
                  placeholder={t('descriptionPlaceholder')}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full pl-3 pr-3 h-9 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-normal transition-colors"
                />
              </div>
            </div>

            {/* Footer Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-between select-none">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={!formName.trim()}
                onClick={() => {
                  setShowCreateModal(false);
                  setView('designer');
                }}
                className="h-8 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99"
              >
                <span>{t('createModalSubmit')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 2: BLUEPRINTS / TEMPLATES MODAL                     */}
      {/* ========================================================= */}
      {mounted && showTemplateModal && createPortal(
        <div
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none font-sans"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-3xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-[#4AE54A]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('blueprintsTitle')}
                  </h2>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {t('blueprintsDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="h-7 w-7 rounded-[6px] border border-transparent hover:border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-all cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-4 overflow-y-auto">
              {PREBUILT_BLUEPRINTS.map((bp) => (
                <div
                  key={bp.id}
                  className="border border-[#E8E8E6] rounded-xl p-4 bg-white hover:bg-zinc-50/70 transition-all flex flex-col justify-between shadow-3xs text-left"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                        {getCategoryLabel(bp.category)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        {t('fieldsCount', { count: bp.screens[0]?.fields?.length || 0 })}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900">{bp.name}</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{bp.description}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#E8E8E6] flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleApplyBlueprint(bp)}
                      className="h-8 px-3.5 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-99"
                    >
                      <span>{t('useBlueprint')}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-4 -mx-6 -mb-6 mt-2 rounded-b-[12px] flex items-center justify-end select-none shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TEST SEND FORM MODAL                            */}
      {/* ========================================================= */}
      {mounted && showSendModal && createPortal(
        <div
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none font-sans"
          onClick={() => setShowSendModal(false)}
        >
          <form
            onSubmit={handleDispatchSend}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Send className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('sendModalTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="h-7 w-7 rounded-[6px] border border-transparent hover:border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-3.5 pt-4">
              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('recipientPhone')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1234567890"
                  value={sendPhone}
                  onChange={(e) => setSendPhone(e.target.value)}
                  className="w-full px-3 h-9 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-semibold font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  {t('messageBody')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-normal resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('buttonCta')}
                  </label>
                  <input
                    type="text"
                    value={sendCta}
                    onChange={(e) => setSendCta(e.target.value)}
                    className="w-full px-3 h-8 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('footerText')}
                  </label>
                  <input
                    type="text"
                    value={sendFooter}
                    onChange={(e) => setSendFooter(e.target.value)}
                    className="w-full px-3 h-8 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-between select-none">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSending || !sendPhone.trim()}
                className="h-8 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99"
              >
                {isSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5" />}
                <span>{isSending ? t('sendingBtn') : t('sendSubmitBtn')}</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 4: SUBMISSIONS DATA INSPECTOR                       */}
      {/* ========================================================= */}
      {mounted && showSubmissionsModal && createPortal(
        <div
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none font-sans"
          onClick={() => setShowSubmissionsModal(false)}
        >
          <div
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-3xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <FormInput className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('submissionsTitle', { name: selectedFlowForSubmissions?.name || '' })}
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    {t('submissionsDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={submissionsList.length === 0}
                  className="h-8 px-3.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('exportCsv')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmissionsModal(false)}
                  className="h-7 w-7 rounded-[6px] border border-transparent hover:border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Submissions List */}
            <div className="py-4 overflow-y-auto flex-1">
              {submissionsLoading ? (
                <div className="py-12">
                  <SimpleLoader message={tCommon('loading') || 'Loading...'} />
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs italic">
                  {t('noSubmissionsYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {submissionsList.map((sub) => (
                    <div key={sub.id} className="border border-[#E8E8E6] rounded-lg p-3.5 bg-[#FAF9F6] text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-[#E8E8E6]">
                        <span className="font-bold text-zinc-800">
                          {sub.contact ? `${sub.contact.first_name} ${sub.contact.last_name} (${sub.contact.phone})` : t('anonymousContact')}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(sub.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {Object.entries(sub.response_data || {}).map(([key, val]) => (
                          <div key={key} className="bg-white border border-[#E8E8E6] rounded p-2 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold uppercase text-zinc-400">{key.replace(/_/g, ' ')}</span>
                            <span className="text-xs font-semibold text-zinc-900 break-words">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-4 -mx-6 -mb-6 mt-2 rounded-b-[12px] flex items-center justify-end select-none shrink-0">
              <button
                type="button"
                onClick={() => setShowSubmissionsModal(false)}
                className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION MODAL (Exact Platform Standard)*/}
      {/* ========================================================= */}
      {mounted && deleteConfirmFlow && createPortal(
        <div
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none font-sans"
          onClick={() => setDeleteConfirmFlow(null)}
        >
          <div
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('deleteModalTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmFlow(null)}
                className="h-7 w-7 rounded-[6px] border border-transparent hover:border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteModalConfirm', { name: deleteConfirmFlow.name })}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteConfirmFlow(null)}
                className="h-8 px-3.5 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteFlow}
                className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[95px] disabled:opacity-40 active:scale-99"
              >
                {isDeleting ? t('deleting') : t('yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
