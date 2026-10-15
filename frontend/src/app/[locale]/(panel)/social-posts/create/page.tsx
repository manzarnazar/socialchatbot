'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Clock, 
  Sparkles, 
  Upload, 
  Link2, 
  X, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  Calendar, 
  RefreshCw, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Smartphone,
  Eye,
  Send,
  HelpCircle,
  Heart,
  MessageCircle,
  Bookmark,
  Globe,
  ThumbsUp,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Film,
  Video,
  Play,
  Repeat2
} from 'lucide-react';
import { useHeaderStore } from '@/store/useHeaderStore';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

interface Channel {
  id: number;
  name: string;
  channel_type: string;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  status: string;
  handle?: string;
}

export default function SocialPostComposerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { setCustomHeader } = useHeaderStore();
  const t = useTranslations('SocialPosts');
  const tCommon = useTranslations('Common');

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInputUrl, setMediaInputUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [postType, setPostType] = useState<'feed_post' | 'reel'>('feed_post');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timing
  const [timingType, setTimingType] = useState<'immediate' | 'scheduled' | 'draft'>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');

  const getFormattedScheduleString = () => {
    if (!scheduleDate) return null;
    try {
      const dt = new Date(`${scheduleDate}T${scheduleTime || '00:00'}:00`);
      if (isNaN(dt.getTime())) return null;
      return dt.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  // AI Post Metadata (if post draft was generated via AI on Social Posts page)
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  // Preview State
  const [activePreviewTab, setActivePreviewTab] = useState<'instagram' | 'facebook' | 'tiktok' | 'linkedin'>('instagram');

  // Helper to normalize media URLs (proxying /storage/ through Next.js rewrite)
  const resolveMediaUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.includes('/storage/')) {
      return url.substring(url.indexOf('/storage/'));
    }
    return url;
  };

  // Helper to determine whether media is a video / reel
  const isVideoMedia = (url: string | null | undefined, type?: string) => {
    if (type === 'reel') return true;
    if (!url) return false;
    return /\.(mp4|mov|m4v|webm|quicktime)(\?.*)?$/i.test(url);
  };

  // Fetch Channels & Post (if editing)
  useEffect(() => {
    const initData = async () => {
      setInitialLoading(true);
      try {
        const channelsRes = await fetchWithCsrf('/social-posts/channels');
        if (channelsRes.ok) {
          const chData = await channelsRes.json();
          const channelsList: Channel[] = chData.channels || [];
          setAvailableChannels(channelsList);

          // If not editing, default select all available channels
          if (!editId && channelsList.length > 0) {
            setSelectedChannelIds(channelsList.map(c => c.id));
          }
        }

        // If editing, load post details
        if (editId) {
          const postRes = await fetchWithCsrf(`/social-posts/${editId}`);
          if (postRes.ok) {
            const postData = await postRes.json();
            const post = postData.post;
            if (post) {
              if (post.status === 'published' || post.status === 'partially_published') {
                toast.error(t('cannotEditPublished') || 'Published posts cannot be modified.');
                router.push('/social-posts');
                return;
              }
              setTitle(post.title || '');
              setContent(post.content || '');
              setMediaUrls(post.media_urls || []);
              setTimingType(post.timing_type || 'draft');
              setPostType(post.post_type === 'reel' ? 'reel' : 'feed_post');
              setSelectedChannelIds((post.channels || []).map((c: any) => c.id));

              if (post.scheduled_at) {
                const dt = new Date(post.scheduled_at);
                setScheduleDate(dt.toISOString().split('T')[0]);
                setScheduleTime(dt.toTimeString().slice(0, 5));
              }
            }
          }
        } else {
          // Default schedule date to tomorrow at 10:00 AM
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setScheduleDate(tomorrow.toISOString().split('T')[0]);
          setScheduleTime('10:00');

          // Check if post draft was generated via AI on Social Posts page
          if (typeof window !== 'undefined') {
            try {
              const rawDraft = sessionStorage.getItem('ai_draft_post');
              if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                sessionStorage.removeItem('ai_draft_post');

                const sanitizeText = (text: string) => {
                  if (!text) return '';
                  return text
                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                    .replace(/<think>[\s\S]*/gi, '')
                    .replace(/<\/?think>/gi, '')
                    .replace(/^Thinking Process:.*$/gim, '')
                    .trim();
                };

                // Defensive unwrap if content was stored as raw JSON object string
                if (parsed.content && typeof parsed.content === 'string' && parsed.content.trim().startsWith('{')) {
                  const contentTrimmed = parsed.content.trim();
                  try {
                    const inner = JSON.parse(contentTrimmed);
                    if (inner.title && (!parsed.title || parsed.title === '{' || parsed.title.startsWith('{'))) {
                      parsed.title = inner.title;
                    }
                    if (inner.caption) {
                      const tags = Array.isArray(inner.hashtags) && inner.hashtags.length > 0 ? `\n\n${inner.hashtags.join(' ')}` : '';
                      parsed.content = `${inner.caption}${tags}`;
                    }
                  } catch {
                    const tm = contentTrimmed.match(/"title"\s*:\s*"([^"]+)"/i);
                    if (tm && (!parsed.title || parsed.title === '{' || parsed.title.startsWith('{'))) {
                      parsed.title = tm[1];
                    }
                    const cm = contentTrimmed.match(/"caption"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:hashtags|suggested_media_idea)/i);
                    if (cm) {
                      const tagsMatch = contentTrimmed.match(/"hashtags"\s*:\s*\[([\s\S]*?)\]/i);
                      const tags = tagsMatch ? (tagsMatch[1].match(/#[a-zA-Z0-9_]+/g) || []).join(' ') : '';
                      parsed.content = `${cm[1].replace(/\\n/g, '\n').replace(/\\r/g, '')}${tags ? `\n\n${tags}` : ''}`;
                    }
                  }
                }

                if (parsed.title) {
                  const cleanT = sanitizeText(parsed.title);
                  setTitle(cleanT && !cleanT.startsWith('{') && !['{', '}', 'null'].includes(cleanT) && !cleanT.toLowerCase().includes('think') ? cleanT : 'New Social Post');
                }
                if (parsed.content) {
                  const cleanC = sanitizeText(parsed.content);
                  setContent(cleanC.startsWith('{') ? 'Ready to share something exciting! Check the details below.' : cleanC);
                }
                if (parsed.ai_prompt) setAiPrompt(parsed.ai_prompt);
                if (parsed.ai_model) setAiModel(parsed.ai_model);
                toast.success(t('toastAiApplied') || 'AI draft applied to post!');
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to initialize composer data', err);
      } finally {
        setInitialLoading(false);
      }
    };

    initData();
  }, [editId]);

  // Set Global Header
  useEffect(() => {
    setCustomHeader(
      <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/social-posts"
            className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Back to posts list"
          >
            <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
          </Link>
          <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase truncate">
            {editId ? t('editPost') : t('composeNewPost')}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/social-posts"
            className="border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black h-8 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs hover:bg-zinc-50"
          >
            {tCommon('cancel') || 'Cancel'}
          </Link>

          {/* Save Draft Action */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('draft')}
            className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black h-8 px-3.5 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('saveDraft')}</span>
          </button>

          {/* Primary Publish/Schedule Action */}
          <button
            type="button"
            disabled={saving || selectedChannelIds.length === 0 || !title.trim() || !content.trim()}
            onClick={() => handleSubmit(timingType)}
            className="bg-[#0A0A0A] hover:bg-zinc-900 text-white disabled:opacity-50 disabled:cursor-not-allowed h-8 px-4 text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                <span>{t('saving')}</span>
              </>
            ) : timingType === 'scheduled' ? (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('schedulePost')}</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{t('postImmediately')}</span>
              </>
            )}
          </button>
        </div>
      </header>
    );

    return () => setCustomHeader(null);
  }, [setCustomHeader, saving, selectedChannelIds, title, content, timingType, editId, t, tCommon]);

  // Channel Selection Toggle
  const toggleChannel = (channelId: number) => {
    setSelectedChannelIds(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  // Media File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|quicktime)$/i.test(file.name);

    // Validate size (<100MB for video, <10MB for image)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? 'Video size must be under 100MB' : 'Image size must be under 10MB');
      return;
    }

    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchWithCsrf('/social-posts/upload-media', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const finalUrl = data.relative_url || data.url;
        if (finalUrl) {
          setMediaUrls([finalUrl]);
          if (isVideo || data.media_type === 'video') {
            setPostType('reel');
            toast.success(t('toastVideoAttached') || 'Video attached & switched to Reel/Video format');
          } else {
            toast.success(t('toastImageAttached') || 'Image attached successfully');
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastMediaUploadFailed') || 'Failed to upload media');
      }
    } catch {
      toast.error(t('toastMediaUploadNetworkError') || 'Network error uploading media');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add Remote Media URL
  const handleAddMediaUrl = () => {
    if (!mediaInputUrl.trim()) return;
    try {
      new URL(mediaInputUrl.trim());
      const url = mediaInputUrl.trim();
      setMediaUrls([url]);
      if (isVideoMedia(url)) {
        setPostType('reel');
        toast.success(t('toastVideoUrlAttached') || 'Video URL attached & switched to Reel/Video format');
      } else {
        toast.success(t('toastMediaUrlAttached') || 'Media URL attached');
      }
      setMediaInputUrl('');
      setShowUrlInput(false);
    } catch {
      toast.error(t('toastInvalidMediaUrl') || 'Please enter a valid HTTP/HTTPS media URL');
    }
  };

  // Submit Handler (Draft, Scheduled, Immediate)
  const handleSubmit = async (targetTiming: 'immediate' | 'scheduled' | 'draft') => {
    if (!title.trim()) {
      toast.error(t('toastTitleRequired') || 'Please enter a post title');
      return;
    }
    if (!content.trim()) {
      toast.error(t('toastContentRequired') || 'Please write some post content or caption');
      return;
    }
    if (selectedChannelIds.length === 0) {
      toast.error(t('toastChannelsRequired') || 'Please select at least one social channel');
      return;
    }

    // TikTok Content Posting API requires at least one video attachment
    const hasTikTokSelected = selectedChannelIds.some(id => {
      const ch = availableChannels.find(c => c.id === id);
      return ch?.platform === 'tiktok' || ch?.channel_type === 'tiktok';
    });
    if (hasTikTokSelected) {
      const hasVideo = mediaUrls.some(u => isVideoMedia(u, postType));
      if (!hasVideo) {
        toast.error(t('toastTikTokVideoRequired') || 'TikTok Content Posting API requires a video file (.mp4, .mov, etc.)');
        return;
      }
    }

    let calculatedScheduledAt: string | null = null;
    if (targetTiming === 'scheduled') {
      if (!scheduleDate || !scheduleTime) {
        toast.error(t('toastScheduleDateRequired') || 'Please choose a valid schedule date and time');
        return;
      }
      calculatedScheduledAt = `${scheduleDate}T${scheduleTime}:00`;
      if (new Date(calculatedScheduledAt).getTime() <= Date.now()) {
        toast.error(t('toastScheduleDateFuture') || 'Scheduled date and time must be in the future');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        channel_ids: selectedChannelIds,
        media_urls: mediaUrls,
        post_type: postType,
        timing_type: targetTiming,
        scheduled_at: calculatedScheduledAt,
        ai_prompt: aiPrompt ? aiPrompt.trim() : null,
        ai_model: aiModel || null,
      };

      const url = editId ? `/social-posts/${editId}` : '/social-posts';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || (targetTiming === 'scheduled' ? (t('postScheduledSuccess') || 'Post scheduled successfully!') : (t('postSavedSuccess') || 'Post saved successfully!')));
        router.push('/social-posts');
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastSaveFailed') || 'Failed to save post');
      }
    } catch {
      toast.error(t('toastSaveNetworkError') || 'Network error saving social post');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return <SimpleLoader message={t('loadingComposer') || 'Loading social post composer...'} />;
  }

  // Selected Channels Info for preview
  const primarySelectedChannel = availableChannels.find(c => selectedChannelIds.includes(c.id)) || availableChannels[0];

  return (
    <div className="w-full bg-white font-sans text-zinc-950 select-none flex-1 overflow-y-auto animate-fade-in text-left">
      
      {/* Warning if no channels connected */}
      {availableChannels.length === 0 && (
        <div className="border-b border-amber-200/80 bg-amber-50/70 px-6 sm:px-8 py-4 flex items-start justify-between gap-4 select-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900">{t('noChannelsConnected')}</h4>
              <p className="text-[11.5px] text-amber-800 leading-relaxed font-medium">
                {t('connectChannelsPrompt')}
              </p>
            </div>
          </div>
          <Link
            href="/channels"
            className="h-8 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <span>{t('goToChannels')}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 w-full items-start">
        
        {/* LEFT COLUMN: COMPOSER CONTROLS (7 Cols) - END-TO-END DIVIDER LAYOUT */}
        <div className="lg:col-span-7 divide-y divide-[#E8E8E6] lg:border-r border-[#E8E8E6]">

          {/* 1. CHANNEL SELECTION (Instagram, Facebook & TikTok) */}
          <div className="px-6 sm:px-8 py-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                  {t('targetChannels')}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  {t('selectChannelsDesc')}
                </p>
              </div>
              <span className="text-[10.5px] font-bold text-zinc-600 bg-[#F5F5F5] px-2.5 py-1 rounded-[4px] border border-[#E8E8E6]">
                {selectedChannelIds.length} {tCommon('selected') || 'Selected'}
              </span>
            </div>

            {availableChannels.length === 0 ? (
              <div className="p-4 border border-dashed border-[#E8E8E6] rounded-lg text-center text-xs text-zinc-400 font-medium">
                {t('noChannelsConnected')} <Link href="/channels" className="text-black font-bold underline">{t('goToChannels')}</Link>.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableChannels.map((ch) => {
                  const isSelected = selectedChannelIds.includes(ch.id);
                  return (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/40 border-[#4AE54A] shadow-3xs'
                          : 'bg-white border-[#E8E8E6] hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {ch.channel_type === 'instagram' || ch.platform === 'instagram' ? (
                          <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0 shadow-3xs">
                            <img src="/channels/instagram.svg" alt="Instagram" className="h-full w-full object-contain" />
                          </div>
                        ) : ch.channel_type === 'tiktok' || ch.platform === 'tiktok' ? (
                          <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0 shadow-3xs">
                            <img src="/channels/tiktok.webp" alt="TikTok" className="h-full w-full object-contain" />
                          </div>
                        ) : ch.channel_type === 'linkedin' || ch.platform === 'linkedin' ? (
                          <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0 shadow-3xs">
                            <img src="/channels/linkedin.png" alt="LinkedIn" className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs overflow-hidden">
                            <img src="/channels/facebook.webp" alt="Facebook" className="h-full w-full object-cover scale-135" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-950 block truncate">{ch.name}</span>
                          <span className="text-[10px] text-zinc-400 font-medium truncate block">
                            {ch.handle ? `@${ch.handle}` : (ch.channel_type === 'instagram' ? 'Instagram Business' : ch.channel_type === 'tiktok' ? 'TikTok Account' : ch.channel_type === 'linkedin' ? 'LinkedIn Page/Profile' : 'Facebook Page')}
                          </span>
                        </div>
                      </div>

                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white'
                          : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. POST DETAILS (Title & Content) */}
          <div className="px-6 sm:px-8 py-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                  {t('postDetails')}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  Define reference title and public post caption
                </p>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">
                {content.length} characters (IG max: 2,200)
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                {t('postTitle')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('postTitlePlaceholder')}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
              />
            </div>

            {/* Caption / Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  {t('postCaption')}
                </label>
                {/* Common hashtag quick pills */}
                <div className="flex items-center gap-1">
                  {['#WhatsOmni', '#Announcement', '#Sale'].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setContent(prev => prev ? `${prev} ${tag}` : tag)}
                      className="text-[10px] font-semibold text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded-[4px] border border-zinc-200/60 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('captionPlaceholder')}
                className="w-full p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-normal leading-relaxed focus:outline-none focus:border-black text-black resize-y transition-colors"
              />
            </div>
          </div>

          {/* 3. MEDIA ASSETS & FORMAT */}
          <div className="px-6 sm:px-8 py-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                  {t('mediaAttachment')}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  {t('mediaDesc')}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="h-7.5 px-3 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>{showUrlInput ? (tCommon('cancel') || 'Cancel') : t('orPasteUrl')}</span>
                </button>
              </div>
            </div>

            {/* Post Format Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPostType('feed_post')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  postType === 'feed_post'
                    ? 'bg-zinc-50/70 border-zinc-950 shadow-3xs ring-1 ring-zinc-950/10'
                    : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/50'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  postType === 'feed_post' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 block truncate">{t('postTypeFeed') || 'Feed Post'}</span>
                    {postType === 'feed_post' && <Check className="h-3 w-3 text-zinc-950 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium truncate block">
                    {t('postTypeFeedDesc') || 'Standard image or text'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPostType('reel')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  postType === 'reel'
                    ? 'bg-zinc-50/70 border-zinc-950 shadow-3xs ring-1 ring-zinc-950/10'
                    : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/50'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  postType === 'reel' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <Film className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 block truncate">{t('postTypeReel') || 'Reel / Video'}</span>
                    {postType === 'reel' && <Check className="h-3 w-3 text-zinc-950 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium truncate block">
                    {t('postTypeReelDesc') || 'Instagram Reel, TikTok & Facebook Video'}
                  </span>
                </div>
              </button>
            </div>

            {/* Paste URL Bar */}
            {showUrlInput && (
              <div className="flex items-center gap-2 p-2 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg">
                <input
                  type="url"
                  value={mediaInputUrl}
                  onChange={(e) => setMediaInputUrl(e.target.value)}
                  placeholder={t('enterImageUrl')}
                  className="flex-1 h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs font-medium focus:outline-none focus:border-black text-black"
                />
                <button
                  type="button"
                  onClick={handleAddMediaUrl}
                  className="h-8 px-3.5 bg-[#0A0A0A] hover:bg-zinc-900 text-white text-xs font-semibold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  {t('applyUrl')}
                </button>
              </div>
            )}

            {/* Current Media Preview or Dropzone */}
            {mediaUrls.length > 0 ? (
              <div className="flex items-start gap-4 p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-xl">
                <div className="h-24 w-24 rounded-lg border border-[#E8E8E6] overflow-hidden bg-zinc-950 shrink-0 relative flex items-center justify-center">
                  {isVideoMedia(mediaUrls[0], postType) ? (
                    <video
                      src={resolveMediaUrl(mediaUrls[0])}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={resolveMediaUrl(mediaUrls[0])}
                      alt="Attached preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-zinc-955 block truncate">{t('mediaAttachment')}</span>
                    {isVideoMedia(mediaUrls[0], postType) ? (
                      <span className="inline-flex items-center gap-1 bg-zinc-900 text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full">
                        <Film className="h-2.5 w-2.5" />
                        {t('reelBadge') || 'Reel / Video'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9.5px] font-semibold px-2 py-0.5 rounded-full">
                        <ImageIcon className="h-2.5 w-2.5" />
                        Image
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono block truncate max-w-sm">
                    {mediaUrls[0]}
                  </span>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setMediaUrls([])}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{t('clearMedia')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E8E8E6] hover:border-black rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#FAFAFA]/50 hover:bg-zinc-50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                />
                <div className="space-y-2">
                  <div className="h-9 w-9 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-500 shadow-3xs">
                    {isUploadingMedia ? <RefreshCw className="h-4 w-4 animate-spin text-black" /> : <Upload className="h-4 w-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">
                      {isUploadingMedia ? tCommon('loading') : t('mediaUploadPrompt')}
                    </span>
                    <span className="text-[10.5px] text-zinc-400 font-medium">
                      {t('mediaUploadSubtext')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. PUBLISHING TIMING */}
          <div className="px-6 sm:px-8 py-7 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                {t('deliveryTiming')}
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                Choose whether to publish immediately, schedule for later, or save as draft
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Immediate */}
              <button
                type="button"
                onClick={() => setTimingType('immediate')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  timingType === 'immediate'
                    ? 'bg-zinc-50/60 border-zinc-950 shadow-3xs ring-1 ring-zinc-950/10'
                    : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                    timingType === 'immediate' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                  }`}>
                    <Send className="h-4 w-4" />
                  </div>
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                    timingType === 'immediate' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                  }`}>
                    {timingType === 'immediate' && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">{t('postImmediately')}</span>
                  <span className="text-[11px] text-zinc-400 font-medium leading-relaxed block mt-0.5">
                    {t('postImmediatelyDesc')}
                  </span>
                </div>
              </button>

              {/* Scheduled */}
              <button
                type="button"
                onClick={() => setTimingType('scheduled')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  timingType === 'scheduled'
                    ? 'bg-zinc-50/60 border-zinc-950 shadow-3xs ring-1 ring-zinc-950/10'
                    : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                    timingType === 'scheduled' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                  }`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                    timingType === 'scheduled' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                  }`}>
                    {timingType === 'scheduled' && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">{t('scheduleForLater')}</span>
                  <span className="text-[11px] text-zinc-400 font-medium leading-relaxed block mt-0.5">
                    {t('scheduleForLaterDesc')}
                  </span>
                </div>
              </button>

              {/* Draft */}
              <button
                type="button"
                onClick={() => setTimingType('draft')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  timingType === 'draft'
                    ? 'bg-zinc-50/60 border-zinc-950 shadow-3xs ring-1 ring-zinc-950/10'
                    : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-[#FAFAFA]/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                    timingType === 'draft' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200/70'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                    timingType === 'draft' ? 'bg-zinc-950 text-white' : 'border border-zinc-300 bg-white'
                  }`}>
                    {timingType === 'draft' && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">{t('saveDraft')}</span>
                  <span className="text-[11px] text-zinc-400 font-medium leading-relaxed block mt-0.5">
                    {t('saveDraftDesc')}
                  </span>
                </div>
              </button>
            </div>

          </div>

          {/* 6. SCHEDULE DATE & TIME (When Scheduled selected) - SEPARATE DIVIDED SECTION (End-to-End Divider) */}
          {timingType === 'scheduled' && (
            <div className="px-6 sm:px-8 py-7 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
                    {t('schedulePost') || 'Publishing Schedule'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    Specify the date and time for automatic dispatch
                  </p>
                </div>
                <span className="text-[10px] font-medium text-zinc-400">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>

              {/* Date & Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                    {t('postDate')}
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                    {t('postTime')}
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black text-black transition-colors"
                  />
                </div>
              </div>

              {/* Schedule Confirmation Note (No blinking dot) */}
              {scheduleDate && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-zinc-50/80 border border-[#E8E8E6] rounded-lg text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-600 font-medium truncate">
                      Auto-publishing scheduled for: <strong className="text-zinc-950 font-bold">{getFormattedScheduleString()}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: LIVE MULTI-PLATFORM PREVIEW (5 Cols) */}
        <div className="lg:col-span-5 sticky top-0 divide-y divide-[#E8E8E6]">
          
          <div className="px-6 sm:px-8 py-4">
            {/* Tabs */}
            <div className="w-full grid grid-cols-4 gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
              <button
                type="button"
                onClick={() => setActivePreviewTab('instagram')}
                className={`h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                  activePreviewTab === 'instagram'
                    ? 'bg-white text-zinc-950 shadow-3xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <img src="/channels/instagram.svg" alt="Instagram" className="h-3.5 w-3.5 object-contain shrink-0" />
                <span>Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('facebook')}
                className={`h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                  activePreviewTab === 'facebook'
                    ? 'bg-white text-zinc-950 shadow-3xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <div className="h-3.5 w-3.5 rounded-xs overflow-hidden flex items-center justify-center shrink-0">
                  <img src="/channels/facebook.webp" alt="Facebook" className="h-full w-full object-cover scale-135" />
                </div>
                <span>Facebook</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('tiktok')}
                className={`h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                  activePreviewTab === 'tiktok'
                    ? 'bg-white text-zinc-950 shadow-3xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <img src="/channels/tiktok.webp" alt="TikTok" className="h-3.5 w-3.5 object-contain shrink-0" />
                <span>TikTok</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('linkedin')}
                className={`h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                  activePreviewTab === 'linkedin'
                    ? 'bg-white text-zinc-950 shadow-3xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <img src="/channels/linkedin.png" alt="LinkedIn" className="h-3.5 w-3.5 object-contain shrink-0" />
                <span>LinkedIn</span>
              </button>
            </div>
          </div>

          {/* Feed Card Container */}
          <div className="px-6 sm:px-8 py-7 space-y-4">
            <div className="bg-zinc-100/60 p-3.5 rounded-xl border border-[#E8E8E6]">
              {activePreviewTab === 'instagram' ? (
                /* Instagram Feed Mockup */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto">
                  {/* Header */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center p-1 shrink-0 shadow-3xs">
                        <img src="/channels/instagram.svg" alt="Instagram" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">
                          {primarySelectedChannel?.handle || primarySelectedChannel?.name || 'brand_official'}
                        </span>
                        <span className="text-[9.5px] text-zinc-400">
                          {postType === 'reel' ? (t('reelBadge') || 'Instagram Reel') : (t('postTypeFeed') || 'Feed Post')}
                        </span>
                      </div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-zinc-400 cursor-pointer hover:text-zinc-600" />
                  </div>

                  {/* Media Content (Image or Video) */}
                  {mediaUrls.length > 0 ? (
                    <div className="aspect-square w-full bg-zinc-950 overflow-hidden relative">
                      {isVideoMedia(mediaUrls[0], postType) ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                          <video
                            src={resolveMediaUrl(mediaUrls[0])}
                            controls
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-semibold text-white flex items-center gap-1 pointer-events-none">
                            <Film className="h-3 w-3" />
                            <span>{t('reelBadge') || 'Reel'}</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={resolveMediaUrl(mediaUrls[0])}
                          alt={title || 'Preview'}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-zinc-50 border-y border-[#F0F0F0] flex flex-col items-center justify-center text-zinc-400 text-xs font-medium p-4 text-center space-y-1">
                      <ImageIcon className="h-6 w-6 text-zinc-300" />
                      <span>No media attached yet</span>
                    </div>
                  )}

                  {/* Social Action Icons */}
                  <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-zinc-700">
                    <div className="flex items-center gap-3.5">
                      <button type="button" className="hover:text-red-500 transition-colors cursor-pointer text-zinc-800">
                        <Heart className="h-4.5 w-4.5 stroke-[2]" />
                      </button>
                      <button type="button" className="hover:text-black transition-colors cursor-pointer text-zinc-800">
                        <MessageCircle className="h-4.5 w-4.5 stroke-[2]" />
                      </button>
                      <button type="button" className="hover:text-black transition-colors cursor-pointer text-zinc-800">
                        <Send className="h-4 w-4 stroke-[2] -rotate-12" />
                      </button>
                    </div>
                    <button type="button" className="hover:text-black transition-colors cursor-pointer text-zinc-800">
                      <Bookmark className="h-4.5 w-4.5 stroke-[2]" />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="p-3 pt-1 text-left space-y-1">
                    <span className="text-[11px] font-bold text-zinc-955 mr-1.5">
                      {primarySelectedChannel?.handle || 'brand_official'}
                    </span>
                    <span className="text-[11px] text-zinc-800 leading-relaxed whitespace-pre-line font-normal">
                      {content || t('defaultCaptionPlaceholder') || 'Your post caption will be displayed here in real-time as you compose it.'}
                    </span>
                  </div>
                </div>
              ) : activePreviewTab === 'facebook' ? (
                /* Facebook Feed Mockup */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto">
                  {/* Header */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                        <img src="/channels/facebook.webp" alt="Facebook" className="h-full w-full object-cover scale-135" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">
                          {primarySelectedChannel?.name || t('companyFacebookPage') || 'Company Facebook Page'}
                        </span>
                        <div className="flex items-center gap-1 text-[9.5px] text-zinc-400">
                          <span>Just now</span>
                          <span>·</span>
                          <Globe className="h-2.5 w-2.5 text-zinc-400" />
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-zinc-400 cursor-pointer hover:text-zinc-600" />
                  </div>

                  {/* Text */}
                  <div className="p-3 text-[11px] text-zinc-800 leading-relaxed whitespace-pre-line text-left">
                    {content || t('defaultCaptionPlaceholder') || 'Your post caption will be displayed here in real-time as you compose it.'}
                  </div>

                  {/* Media */}
                  {mediaUrls.length > 0 && (
                    <div className="aspect-[16/9] w-full bg-black overflow-hidden relative">
                      {isVideoMedia(mediaUrls[0], postType) ? (
                        <video
                          src={resolveMediaUrl(mediaUrls[0])}
                          controls
                          playsInline
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <img
                          src={resolveMediaUrl(mediaUrls[0])}
                          alt={title || 'Preview'}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Engagement Bar */}
                  <div className="px-3 py-2 border-t border-[#E8E8E6] flex items-center justify-between text-[11px] text-zinc-500 font-semibold">
                    <button type="button" className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer">
                      <ThumbsUp className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Like</span>
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer">
                      <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Comment</span>
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer">
                      <Share2 className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ) : activePreviewTab === 'tiktok' ? (
                /* TikTok Mobile Mockup */
                <div className="relative mx-auto max-w-[280px] sm:max-w-[300px] aspect-[9/16] rounded-2xl bg-black border-4 border-zinc-900 overflow-hidden shadow-2xl flex flex-col justify-between text-white select-none">
                  {/* Video or Placeholder Background */}
                  {mediaUrls.length > 0 && isVideoMedia(mediaUrls[0], postType) ? (
                    <video
                      src={resolveMediaUrl(mediaUrls[0])}
                      controls
                      playsInline
                      loop
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : mediaUrls.length > 0 ? (
                    <div className="absolute inset-0 h-full w-full">
                      <img
                        src={resolveMediaUrl(mediaUrls[0])}
                        alt={title || 'TikTok Media'}
                        className="h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-zinc-400 space-y-2">
                      <Film className="h-8 w-8 text-zinc-600" />
                      <span className="text-xs font-medium text-zinc-400">Attach a vertical video (.mp4, .mov) to simulate TikTok feed player</span>
                    </div>
                  )}

                  {/* Top Bar: Live, Following, For You, Search */}
                  <div className="relative z-10 pt-3 px-4 flex items-center justify-between text-white drop-shadow-md">
                    <span className="text-[11px] font-semibold text-white/60">LIVE</span>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-white/60 cursor-pointer">Following</span>
                      <div className="relative cursor-pointer">
                        <span className="text-white">For You</span>
                        <div className="h-0.5 w-6 bg-white mx-auto mt-0.5 rounded-full" />
                      </div>
                    </div>
                    <div className="h-4 w-4 flex items-center justify-center text-white/80">
                      <Eye className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Middle / Right Action Rail & Bottom Caption Info */}
                  <div className="relative z-10 p-3 pb-4 flex items-end justify-between gap-3">
                    {/* Left: User handle, caption, music ticker */}
                    <div className="flex-1 min-w-0 text-left space-y-1.5 drop-shadow-md">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          @{primarySelectedChannel?.handle || primarySelectedChannel?.name?.toLowerCase().replace(/\s+/g, '_') || 'brand_official'}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#25F4EE]" />
                      </div>

                      <p className="text-[11px] text-white/90 line-clamp-3 leading-snug font-normal whitespace-pre-line">
                        {content || t('defaultTikTokCaptionPlaceholder') || 'Your TikTok caption and hashtags will appear here...'}
                      </p>

                      <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                        <span className="animate-pulse">♫</span>
                        <span className="truncate">Original Sound - @{primarySelectedChannel?.handle || 'brand_official'}</span>
                      </div>
                    </div>

                    {/* Right Rail: Profile (+), Heart, Comment, Bookmark, Share, Vinyl */}
                    <div className="flex flex-col items-center gap-3 shrink-0 pb-1 text-white">
                      {/* Avatar with Plus */}
                      <div className="relative mb-1">
                        <div className="h-9 w-9 rounded-full border border-white/80 bg-zinc-900 overflow-hidden flex items-center justify-center p-1">
                          <img src="/channels/tiktok.webp" alt="TikTok" className="h-full w-full object-contain" />
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#FE2C55] text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                          +
                        </div>
                      </div>

                      {/* Heart */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Heart className="h-5 w-5 fill-white/20 stroke-white stroke-[2]" />
                        <span className="text-[9px] font-semibold">12.4K</span>
                      </div>

                      {/* Comment */}
                      <div className="flex flex-col items-center gap-0.5">
                        <MessageCircle className="h-5 w-5 stroke-white stroke-[2]" />
                        <span className="text-[9px] font-semibold">348</span>
                      </div>

                      {/* Bookmark */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Bookmark className="h-5 w-5 stroke-white stroke-[2]" />
                        <span className="text-[9px] font-semibold">892</span>
                      </div>

                      {/* Share */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Share2 className="h-5 w-5 stroke-white stroke-[2]" />
                        <span className="text-[9px] font-semibold">154</span>
                      </div>

                      {/* Spinning Vinyl Record Disc */}
                      <div className="h-8 w-8 rounded-full border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
                        <div className="h-3 w-3 rounded-full bg-zinc-950 border border-zinc-700" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* LinkedIn Feed Mockup */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto text-left select-none">
                  {/* LinkedIn Header */}
                  <div className="px-3.5 py-3 flex items-start justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-md bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                        <img src="/channels/linkedin.png" alt="LinkedIn" className="h-5 w-5 object-contain" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 leading-tight truncate">
                            {primarySelectedChannel?.name || t('companyLinkedInPage') || 'Company LinkedIn Page'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">• 1st</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block leading-tight truncate">
                          Enterprise Social Hub & Messaging
                        </span>
                        <div className="flex items-center gap-1 text-[9.5px] text-zinc-400 mt-0.5">
                          <span>Just now</span>
                          <span>•</span>
                          <Globe className="h-2.5 w-2.5 text-zinc-400" />
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-zinc-400 cursor-pointer hover:text-zinc-600 shrink-0" />
                  </div>

                  {/* LinkedIn Commentary / Caption */}
                  <div className="p-3.5 text-[11.5px] text-zinc-800 leading-relaxed whitespace-pre-line text-left">
                    {content || (
                      <span className="text-zinc-400 italic">Your LinkedIn post commentary, thoughts, and hashtags will appear here...</span>
                    )}
                  </div>

                  {/* Media */}
                  {mediaUrls.length > 0 && (
                    <div className="w-full bg-zinc-100 overflow-hidden relative flex items-center justify-center border-t border-b border-zinc-100">
                      {isVideoMedia(mediaUrls[0], postType) ? (
                        <video
                          src={resolveMediaUrl(mediaUrls[0])}
                          controls
                          playsInline
                          className="w-full max-h-72 object-contain"
                        />
                      ) : (
                        <img
                          src={resolveMediaUrl(mediaUrls[0])}
                          alt={title || 'LinkedIn Media'}
                          className="w-full max-h-72 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* LinkedIn Reaction Counts */}
                  <div className="px-3.5 py-2 flex items-center justify-between text-[10px] text-zinc-500 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1 items-center">
                        <span className="h-4 w-4 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[9px] shadow-3xs">👍</span>
                        <span className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] shadow-3xs">❤️</span>
                        <span className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] shadow-3xs">💡</span>
                      </div>
                      <span className="font-semibold text-zinc-600 ml-1">24</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 font-medium">
                      <span>4 comments</span>
                      <span>•</span>
                      <span>2 reposts</span>
                    </div>
                  </div>

                  {/* LinkedIn Action Bar (Like, Comment, Repost, Send) */}
                  <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-zinc-600 font-bold">
                    <button type="button" className="flex-1 py-1.5 flex items-center justify-center gap-1.5 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                      <ThumbsUp className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Like</span>
                    </button>
                    <button type="button" className="flex-1 py-1.5 flex items-center justify-center gap-1.5 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                      <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Comment</span>
                    </button>
                    <button type="button" className="flex-1 py-1.5 flex items-center justify-center gap-1.5 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                      <Repeat2 className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Repost</span>
                    </button>
                    <button type="button" className="flex-1 py-1.5 flex items-center justify-center gap-1.5 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                      <Send className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-neutral-50 rounded-lg border border-[#E8E8E6] flex items-center gap-2 text-[10.5px] text-zinc-500">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>Simulated preview closely mirrors the official Facebook, Instagram, TikTok, and LinkedIn platforms.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
