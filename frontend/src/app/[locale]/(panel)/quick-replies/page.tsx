/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { 
  Zap, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle,
  RefreshCw, 
  Tag,
  Copy,
  Image as ImageIcon,
  Video,
  FileText,
  Paperclip,
  Target,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
  phone_number?: string;
}

interface QuickReply {
  id: number;
  tenant_id: number;
  name: string;
  shortcut: string | null;
  trigger_keywords: string[] | null;
  match_type: 'contains' | 'exact' | 'starts_with';
  channel_target_type: 'all' | 'custom';
  body: string;
  media_url: string | null;
  media_type: string | null;
  is_active: boolean;
  auto_reply_enabled: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  channels?: ChannelConnection[];
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

const DYNAMIC_VARIABLES = [
  { tag: '{contact_name}', label: 'Full Name' },
  { tag: '{first_name}', label: 'First Name' },
  { tag: '{last_name}', label: 'Last Name' },
  { tag: '{phone}', label: 'Phone' },
  { tag: '{email}', label: 'Email' },
  { tag: '{company_name}', label: 'Company' },
];

export default function QuickRepliesPage() {
  const t = useTranslations('QuickReplies');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Dialog Modal states for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'starts_with'>('contains');
  const [channelTargetType, setChannelTargetType] = useState<'all' | 'custom'>('all');
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle modal state
  const [statusToggleItem, setStatusToggleItem] = useState<QuickReply | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Shortcut copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Floating portal tooltip for triggers
  const [hoveredTriggers, setHoveredTriggers] = useState<{ keywords: string[]; x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  useEffect(() => {
    const handleScrollOrKey = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setModalOpen(false);
        setDeleteTargetId(null);
        setStatusToggleItem(null);
      }
      setHoveredTriggers(null);
    };
    window.addEventListener('keydown', handleScrollOrKey);
    window.addEventListener('scroll', handleScrollOrKey, true);
    return () => {
      window.removeEventListener('keydown', handleScrollOrKey);
      window.removeEventListener('scroll', handleScrollOrKey, true);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [repliesRes, channelsRes] = await Promise.all([
        fetchWithCsrf('/quick-replies'),
        fetchWithCsrf('/channels')
      ]);

      if (repliesRes.ok) {
        const data = await repliesRes.json();
        setQuickReplies(data.quick_replies || []);
      }

      if (channelsRes.ok) {
        const chanData = await channelsRes.json();
        setChannels(Array.isArray(chanData) ? chanData : []);
      }
    } catch {
      toast.error(t('fetchError') || 'Failed to load quick replies.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingReply(null);
    setName('');
    setShortcut('');
    setTriggerKeywords([]);
    setKeywordInput('');
    setMatchType('contains');
    setChannelTargetType('all');
    setSelectedChannelIds([]);
    setBody('');
    setMediaUrl('');
    setMediaType(null);
    setIsActive(true);
    setAutoReplyEnabled(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (qr: QuickReply) => {
    setEditingReply(qr);
    setName(qr.name);
    setShortcut(qr.shortcut || '');
    setTriggerKeywords(Array.isArray(qr.trigger_keywords) ? qr.trigger_keywords : []);
    setKeywordInput('');
    setMatchType(qr.match_type || 'contains');
    setChannelTargetType(qr.channel_target_type || 'all');
    setSelectedChannelIds(qr.channels ? qr.channels.map(c => c.id) : []);
    setBody(qr.body);
    setMediaUrl(qr.media_url || '');
    setMediaType(qr.media_type || null);
    setIsActive(qr.is_active);
    setAutoReplyEnabled(qr.auto_reply_enabled);
    setModalOpen(true);
  };

  const handleAddKeyword = (kwToAdd?: string) => {
    const raw = kwToAdd !== undefined ? kwToAdd : keywordInput;
    const clean = raw.trim().toLowerCase().replace(/^,|,$/g, '');
    if (clean && !triggerKeywords.includes(clean)) {
      setTriggerKeywords([...triggerKeywords, clean]);
      if (kwToAdd === undefined) setKeywordInput('');
    }
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setTriggerKeywords(triggerKeywords.filter(k => k !== kw));
  };

  const handleInsertVariable = (variableTag: string) => {
    if (!bodyTextareaRef.current) {
      setBody(prev => `${prev} ${variableTag}`);
      return;
    }

    const textarea = bodyTextareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const newBody = body.substring(0, startPos) + variableTag + body.substring(endPos);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + variableTag.length, startPos + variableTag.length);
    }, 0);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchWithCsrf('/quick-replies/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMediaUrl(data.url);
        setMediaType(data.media_type);
        toast.success(t('mediaUploaded') || 'Media attached successfully.');
      } else {
        toast.error(t('mediaUploadError') || 'Failed to upload media file.');
      }
    } catch {
      toast.error(t('mediaUploadError') || 'Failed to upload media file.');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      toast.error(t('fillRequiredFields') || 'Please provide a name and reply content.');
      return;
    }

    if (channelTargetType === 'custom' && selectedChannelIds.length === 0) {
      toast.error(t('selectAtLeastOneChannel') || 'Please select at least one channel.');
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      shortcut: shortcut.trim().replace(/^\//, '') || null,
      trigger_keywords: triggerKeywords,
      match_type: matchType,
      channel_target_type: channelTargetType,
      channel_ids: channelTargetType === 'custom' ? selectedChannelIds : [],
      body: body.trim(),
      media_url: mediaUrl.trim() || null,
      media_type: mediaType,
      is_active: isActive,
      auto_reply_enabled: autoReplyEnabled,
    };

    try {
      if (editingReply) {
        const res = await fetchWithCsrf(`/quick-replies/${editingReply.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(t('updatedSuccess') || 'Quick reply updated successfully.');
          setQuickReplies(prev =>
            prev.map(item => (item.id === editingReply.id ? data.quick_reply : item))
          );
          setModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || t('saveError') || 'Failed to save quick reply.');
        }
      } else {
        const res = await fetchWithCsrf('/quick-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(t('createdSuccess') || 'Quick reply created successfully.');
          setQuickReplies(prev => [data.quick_reply, ...prev]);
          setModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || t('createError') || 'Failed to create quick reply.');
        }
      }
    } catch {
      toast.error(t('saveError') || 'Failed to save quick reply.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusToggleItem) return;
    setTogglingStatus(true);
    const targetId = statusToggleItem.id;
    const oldStatus = statusToggleItem.is_active;
    const newStatus = !oldStatus;

    try {
      const res = await fetchWithCsrf(`/quick-replies/${targetId}/toggle-active`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success(t('toggleSuccess') || 'Status updated successfully.');
        setQuickReplies(prev =>
          prev.map(item => (item.id === targetId ? { ...item, is_active: newStatus } : item))
        );
        setStatusToggleItem(null);
      } else {
        toast.error(t('toggleError') || 'Failed to update status.');
      }
    } catch {
      toast.error(t('toggleError') || 'Failed to update status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDeleteQuickReply = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);

    try {
      const res = await fetchWithCsrf(`/quick-replies/${deleteTargetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('deletedSuccess') || 'Quick reply deleted successfully.');
        setQuickReplies(prev => prev.filter(item => item.id !== deleteTargetId));
        setDeleteTargetId(null);
      } else {
        toast.error(t('deleteError') || 'Failed to delete quick reply.');
      }
    } catch {
      toast.error(t('deleteError') || 'Failed to delete quick reply.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyShortcut = (qr: QuickReply, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!qr.shortcut) return;
    const clean = qr.shortcut.replace(/^\//, '');
    navigator.clipboard.writeText(`/${clean}`);
    setCopiedId(qr.id);
    toast.success(t('shortcutCopied') || 'Shortcut copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredReplies = quickReplies.filter(qr => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = qr.name.toLowerCase().includes(q);
      const matchShortcut = qr.shortcut?.toLowerCase().includes(q);
      const matchBody = qr.body.toLowerCase().includes(q);
      const matchKeywords = qr.trigger_keywords?.some(k => k.toLowerCase().includes(q));
      if (!matchName && !matchShortcut && !matchBody && !matchKeywords) {
        return false;
      }
    }

    if (statusFilter === 'active' && !qr.is_active) return false;
    if (statusFilter === 'inactive' && qr.is_active) return false;

    if (channelFilter !== 'all') {
      const chId = Number(channelFilter);
      if (qr.channel_target_type === 'custom') {
        const hasCh = qr.channels?.some(c => c.id === chId);
        if (!hasCh) return false;
      }
    }

    return true;
  });

  const channelSelectOptions = [
    { value: 'all', label: t('allChannels') },
    ...channels.map(ch => ({
      value: String(ch.id),
      label: `${ch.name} (${ch.channel_type.toUpperCase()})`
    }))
  ];

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col min-h-0 flex-1">
      
      {/* 1. DIRECTORY LIST VIEW */}
      <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
        
        {/* Top Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 select-none">
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-[6px] text-xs font-medium placeholder-zinc-400 focus:outline-none focus:border-black bg-[#F5F5F5] transition-colors"
              />
            </div>

            <DropdownSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'all', label: t('allStatus') },
                { value: 'active', label: t('activeOnly') },
                { value: 'inactive', label: t('inactiveOnly') },
              ]}
              className="w-full sm:w-36"
            />

            {channels.length > 0 && (
              <DropdownSelect
                value={channelFilter}
                onChange={(val) => setChannelFilter(val)}
                options={channelSelectOptions}
                className="w-full sm:w-44"
              />
            )}

            <button 
              onClick={loadAllData}
              className="flex items-center justify-center p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0 self-start sm:self-auto"
              title={t('refreshQuickReplies')}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${loading ? 'animate-spin text-black' : ''}`} />
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('createQuickReply')}</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div className="py-16">
            <SimpleLoader borderless={true} message="Syncing quick replies database..." />
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white shadow-3xs animate-fade-in flex flex-col items-center justify-center select-none">
            <div className="h-12 w-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">{t('emptyTitle')}</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5 leading-relaxed font-medium">
              {t('emptyDesc')}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] text-white rounded-[6px] text-xs font-bold shadow-sm hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('createFirstQuickReply')}</span>
            </button>
          </div>
        ) : (
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5">{t('colNameShortcut')}</th>
                    <th className="px-6 py-3.5">{t('colTriggers')}</th>
                    <th className="px-6 py-3.5">{t('colResponse')}</th>
                    <th className="px-6 py-3.5">{t('colChannels')}</th>
                    <th className="px-6 py-3.5">{t('colUsage')}</th>
                    <th className="px-6 py-3.5">{t('colStatus')}</th>
                    <th className="px-6 py-3.5 text-right">{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-700 font-medium">
                  {filteredReplies.map((qr) => (
                    <tr key={qr.id} className="hover:bg-[#FAFAFA] transition-colors">
                      
                      {/* 1. Reply Name & Shortcut */}
                      <td className="px-6 py-4 max-w-[240px]">
                        <div className="flex flex-col text-left overflow-hidden">
                          <button
                            onClick={() => handleOpenEditModal(qr)}
                            className="text-xs font-bold text-zinc-955 hover:underline cursor-pointer text-left block truncate max-w-[220px]"
                          >
                            {qr.name}
                          </button>
                          {qr.shortcut ? (
                            <span
                              onClick={(e) => handleCopyShortcut(qr, e)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer mt-0.5 w-fit"
                              title={t('copyShortcut')}
                            >
                              <span>/{qr.shortcut.replace(/^\//, '')}</span>
                              {copiedId === qr.id ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 text-zinc-400" />
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic block mt-0.5">{t('noShortcut')}</span>
                          )}
                        </div>
                      </td>

                      {/* 2. Trigger Rules & Match Type (2 Lines Only) */}
                      <td className="px-6 py-4 max-w-[220px] relative">
                        <div className="flex flex-col gap-1">
                          {/* Line 1: Trigger type with icon in 1 short line */}
                          <div className="flex items-center gap-1.5 leading-none whitespace-nowrap">
                            {qr.match_type === 'exact' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900">
                                <Target className="h-3 w-3 text-indigo-600 shrink-0" />
                                <span>{t('exactMatch')}</span>
                              </span>
                            ) : qr.match_type === 'starts_with' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900">
                                <ArrowRight className="h-3 w-3 text-purple-600 shrink-0" />
                                <span>{t('startsWith')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900">
                                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                <span>{t('contains')}</span>
                              </span>
                            )}
                          </div>

                          {/* Line 2: Trigger words or phrases (1 line only, eclipse on overflow, portal tooltip on hover) */}
                          {Array.isArray(qr.trigger_keywords) && qr.trigger_keywords.length > 0 ? (
                            <div 
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredTriggers({
                                  keywords: qr.trigger_keywords || [],
                                  x: rect.left,
                                  y: rect.top
                                });
                              }}
                              onMouseLeave={() => setHoveredTriggers(null)}
                              className="text-[11px] text-zinc-600 font-medium truncate max-w-[210px] cursor-default block"
                              title={qr.trigger_keywords.join(', ')}
                            >
                              <span className="text-zinc-400 font-normal mr-1">{t('triggers')}</span>
                              <span className="text-zinc-700 font-semibold">{qr.trigger_keywords.join(', ')}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-zinc-400 italic truncate max-w-[210px]">
                              {t('noTriggersSet')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Response Preview & Media */}
                      <td className="px-6 py-4 max-w-[260px]">
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-700 font-normal line-clamp-2 leading-relaxed whitespace-pre-wrap">
                            {qr.body}
                          </p>
                          {qr.media_url && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded shadow-3xs">
                              {qr.media_type === 'image' ? (
                                <ImageIcon className="h-3 w-3 text-emerald-600 shrink-0" />
                              ) : qr.media_type === 'video' ? (
                                <Video className="h-3 w-3 text-pink-600 shrink-0" />
                              ) : (
                                <FileText className="h-3 w-3 text-indigo-600 shrink-0" />
                              )}
                              <span>{t('mediaAttachment')}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Target Channels */}
                      <td className="px-6 py-4">
                        <div>
                          {qr.channel_target_type === 'all' ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-700 shadow-3xs">
                              {t('allChannels')}
                            </span>
                          ) : (!qr.channels || qr.channels.length === 0) ? (
                            <span className="text-zinc-400 text-[11px] italic">{t('noChannels')}</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {qr.channels.slice(0, 4).map(ch => (
                                <img
                                  key={ch.id}
                                  src={getChannelIcon(ch.channel_type)}
                                  alt={ch.channel_type}
                                  title={ch.name || ch.channel_type}
                                  className="h-4.5 w-4.5 object-contain shrink-0"
                                />
                              ))}
                              {qr.channels.length > 4 && (
                                <span className="text-[10px] text-zinc-500 font-bold">
                                  +{qr.channels.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Usage Count & Last Used */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-zinc-800">
                            <span>{qr.usage_count} {t('uses')}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-medium">
                            {qr.last_used_at ? new Date(qr.last_used_at).toLocaleDateString(locale) : t('neverUsed')}
                          </div>
                        </div>
                      </td>

                      {/* 6. Status Toggle Switch */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setStatusToggleItem(qr)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            qr.is_active ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                          }`}
                          title={qr.is_active ? t('deactivateQuickReply') : t('activateQuickReply')}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              qr.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(qr)}
                            title={t('editReply')}
                            className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(qr.id)}
                            title={t('deleteReply')}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
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

      {/* 2. CREATION / EDITING DIALOG MODAL (FLUSH UNCROPPED PLATFORM DESIGN) */}
      {modalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setModalOpen(false)}
        >
          <form 
            onSubmit={handleSaveQuickReply}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {editingReply ? t('editQuickReply') : t('createQuickReply')}
                  </h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">
                    {t('modalSubtitle')}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body — Clean, uncropped, zero padding conflicts */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs">
              
              {/* Row 1: Reply Name & Shortcut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('nameLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('shortcutLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-xs">/</span>
                    <input
                      type="text"
                      value={shortcut.replace(/^\//, '')}
                      onChange={(e) => setShortcut(e.target.value.replace(/^\//, ''))}
                      placeholder={t('shortcutPlaceholder')}
                      className="w-full h-9 pl-7 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-mono font-medium transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Trigger Keywords (Normal Clean Form Field) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('triggersLabel')}
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {t('triggersHint')}
                  </span>
                </div>

                <div className="w-full min-h-[38px] px-2.5 py-1.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus-within:outline-none focus-within:border-black font-medium transition-colors flex flex-wrap items-center gap-1.5">
                  {triggerKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] shadow-3xs"
                    >
                      <Tag className="h-2.5 w-2.5 text-amber-600" />
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="hover:text-red-600 text-amber-700 ml-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={() => handleAddKeyword()}
                    placeholder={triggerKeywords.length === 0 ? t('triggersPlaceholder') : '+ keyword...'}
                    className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none font-medium text-black placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {/* Row 3: Match Type & Channel Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('matchTypeLabel') || 'Trigger Match Type'}
                  </label>
                  <DropdownSelect
                    value={matchType}
                    onChange={(val) => setMatchType(val as any)}
                    options={[
                      { value: 'contains', label: t('matchContains') || 'Contains Keywords (Anywhere)' },
                      { value: 'exact', label: t('matchExact') || 'Exact Match Only' },
                      { value: 'starts_with', label: t('matchStartsWith') || 'Starts With Keyword' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('channelTargetLabel') || 'Target Channels'}
                  </label>
                  <DropdownSelect
                    value={channelTargetType}
                    onChange={(val) => setChannelTargetType(val as any)}
                    options={[
                      { value: 'all', label: t('channelTargetAll') || 'All Connected Channels' },
                      { value: 'custom', label: t('channelTargetCustom') || 'Specific Channels Only' },
                    ]}
                  />
                </div>
              </div>

              {/* Specific Channel Selection Grid if Custom Scope */}
              {channelTargetType === 'custom' && (
                <div className="space-y-2 p-3.5 bg-zinc-50/80 border border-[#E8E8E6] rounded-lg animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                      {t('selectChannels') || 'Select Target Channels'}
                    </label>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {selectedChannelIds.length} of {channels.length} selected
                    </span>
                  </div>

                  {channels.length === 0 ? (
                    <div className="p-4 border border-dashed border-zinc-200 rounded-lg text-center bg-white">
                      <p className="text-xs text-zinc-400 font-medium">{t('noChannelsConfigured') || 'No channels connected in this workspace.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {channels.map((ch) => {
                        const isSelected = selectedChannelIds.includes(ch.id);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedChannelIds(selectedChannelIds.filter((id) => id !== ch.id));
                              } else {
                                setSelectedChannelIds([...selectedChannelIds, ch.id]);
                              }
                            }}
                            className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-zinc-50 border-black ring-1 ring-black shadow-3xs'
                                : 'bg-white border-[#E8E8E6] hover:border-zinc-350'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-md bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 p-1 shadow-3xs">
                                <img src={getChannelIcon(ch.channel_type)} alt={ch.channel_type} className="h-4 w-4 object-contain" />
                              </div>
                              <div className="truncate">
                                <span className="text-xs font-bold text-zinc-900 block truncate">{ch.name || ch.channel_type}</span>
                                <span className="text-[10px] text-zinc-400 font-mono uppercase font-semibold">{ch.channel_type}</span>
                              </div>
                            </div>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Row 4: Reply Message & Dynamic Variables */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('bodyLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider shrink-0">{t('variables')}</span>
                    {DYNAMIC_VARIABLES.slice(0, 4).map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertVariable(v.tag)}
                        className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-[#E8E8E6] rounded text-[9px] font-mono font-bold text-zinc-700 transition-colors cursor-pointer shrink-0"
                      >
                        +{v.tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('bodyPlaceholder')}
                  className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              {/* Row 5: Media Attachment & Inbound Auto-Reply Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Media Attachment Upload / Preview */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('mediaLabel')}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                  {mediaUrl ? (
                    <div className="p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {mediaType === 'image' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : mediaType === 'video' ? (
                          <Video className="h-3.5 w-3.5 text-pink-600 shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-zinc-800 truncate">
                          {mediaUrl.split('/').pop()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaUrl('');
                          setMediaType(null);
                        }}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                        title={t('removeMedia')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="w-full h-9 px-3 border border-dashed border-[#E8E8E6] hover:border-zinc-400 rounded-md bg-[#FAFAFA] flex items-center justify-center gap-1.5 text-zinc-600 hover:text-black transition-colors cursor-pointer text-xs font-semibold"
                    >
                      {uploadingMedia ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin text-zinc-500" />
                          <span>{t('uploading')}</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="h-3 w-3 text-zinc-400" />
                          <span>{t('uploadMedia')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Auto Reply Inbound Toggle Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('autoReplyLabel')}
                  </label>
                  <div className="h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-700">
                      Enable Auto-Reply
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoReplyEnabled ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E5]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          autoReplyEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Action Strip — Fixed, uncropped, standard WhatsOmni design */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 text-xs font-medium text-[#6B6B6B] hover:text-black bg-white border border-[#E8E8E6] rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-5 bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-bold rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50 gap-1.5"
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{editingReply ? (t('saveChanges') || 'Save Changes') : (t('createBtn') || 'Create Quick Reply')}</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 3. DELETE CONFIRMATION ALERT DIALOG */}
      {deleteTargetId && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteTargetId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="px-6 py-5 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('deleteConfirmTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteTargetId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteConfirmDesc')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="h-9 px-4 text-xs font-medium text-[#6B6B6B] hover:text-black bg-white border border-[#E8E8E6] rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteQuickReply}
                disabled={deleting}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 gap-1.5"
              >
                {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{t('deleteConfirmBtn')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. STATUS TOGGLE CONFIRMATION ALERT DIALOG */}
      {statusToggleItem && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setStatusToggleItem(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="px-6 py-5 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {statusToggleItem.is_active ? t('deactivateQuickReply') : t('activateQuickReply')}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusToggleItem(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#6B6B6B] leading-relaxed font-semibold">
                {statusToggleItem.is_active ? t('deactivateDesc') : t('activateDesc')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setStatusToggleItem(null)}
                className="h-9 px-4 text-xs font-medium text-[#6B6B6B] hover:text-black bg-white border border-[#E8E8E6] rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {togglingStatus && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{statusToggleItem.is_active ? t('inactive') : t('active')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. FLOATING TRIGGER TOOLTIP (Plain & professional light theme) */}
      {hoveredTriggers && mounted && createPortal(
        <div 
          style={{
            position: 'fixed',
            left: Math.max(16, hoveredTriggers.x),
            top: Math.max(12, hoveredTriggers.y - 6),
            transform: 'translateY(-100%)',
          }}
          className="z-[999999] pointer-events-none max-w-xs bg-white border border-[#E8E8E6] rounded-md shadow-md px-2.5 py-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
        >
          <p className="text-[11px] font-medium text-zinc-700 leading-snug break-words">
            {hoveredTriggers.keywords.join(', ')}
          </p>
        </div>,
        document.body
      )}

    </div>
  );
}
