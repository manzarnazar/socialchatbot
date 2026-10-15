'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { fetchWithCsrf } from '@/lib/api';
import { echo } from '@/lib/echo';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Share2,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  Copy,
  Eye,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  ImageIcon,
  Layers,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Globe,
  ThumbsUp,
  MessageSquare,
  MoreHorizontal,
  LayoutGrid,
  List,
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
import { AlertDialog } from '@/ui-components-library';

interface Channel {
  id: number;
  name: string;
  channel_type: string;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  status: string;
  handle?: string;
}

interface PostChannel {
  id: number;
  channel_connection_id: number;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  status: string;
  external_post_id?: string;
  permalink?: string;
  error_message?: string;
  channel_connection?: Channel;
}

interface SocialPost {
  id: number;
  tenant_id: number;
  title: string;
  content: string;
  media_urls?: string[];
  post_type: string;
  timing_type: 'immediate' | 'scheduled' | 'draft';
  scheduled_at?: string;
  published_at?: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'partially_published' | 'failed';
  ai_prompt?: string;
  ai_model?: string;
  metadata?: any;
  created_at: string;
  channels?: Channel[];
  post_channels?: PostChannel[];
}

export default function SocialPostsPage() {
  const router = useRouter();
  const { setCustomHeader } = useHeaderStore();
  const t = useTranslations('SocialPosts');
  const tCommon = useTranslations('Common');

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    draft: 0,
    failed: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);

  // AI Prompt Bar State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Preview Modal
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook' | 'tiktok' | 'linkedin'>('instagram');
  const [deleteTarget, setDeleteTarget] = useState<SocialPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<SocialPost | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [retryingPostId, setRetryingPostId] = useState<number | null>(null);

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
    if (type === 'reel' || type === 'video') return true;
    if (!url) return false;
    return /\.(mp4|mov|m4v|webm|quicktime)(\?.*)?$/i.test(url);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // View mode: 'grid' | 'table' (defaults to 'grid' per user requirement)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsomni_social_posts_view_mode') as 'grid' | 'table' | null;
      if (saved === 'grid' || saved === 'table') {
        setViewMode(saved);
      }
    }
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsomni_social_posts_view_mode', mode);
    }
  };

  const renderTimingText = (post: SocialPost) => {
    if (post.status === 'published' && post.published_at) {
      return `${new Date(post.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(post.published_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    } else if (post.status === 'scheduled' && post.scheduled_at) {
      return `${new Date(post.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `${new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Generate Post with AI
  const handleGenerateAiPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) {
      toast.error(t('toastPromptRequired') || 'Please enter a prompt to generate a post');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await fetchWithCsrf('/social-posts/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          tone: 'casual',
          target_platform: 'both',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          let rawTitle = data.data.title || aiPrompt.trim();
          let rawCaption = data.data.caption || '';
          let hashtags: string[] = Array.isArray(data.data.hashtags) ? data.data.hashtags : [];

          // Defensive: if rawCaption or rawTitle starts with '{', unwrap JSON structure
          if (rawCaption.trim().startsWith('{') || rawTitle.trim().startsWith('{')) {
            const jsonText = rawCaption.trim().startsWith('{') ? rawCaption.trim() : rawTitle.trim();
            try {
              const inner = JSON.parse(jsonText);
              if (inner.title) rawTitle = inner.title;
              if (inner.caption) rawCaption = inner.caption;
              if (Array.isArray(inner.hashtags) && inner.hashtags.length > 0) hashtags = inner.hashtags;
            } catch {
              const tm = jsonText.match(/"title"\s*:\s*"([^"]+)"/i);
              if (tm) rawTitle = tm[1];
              const cm = jsonText.match(/"caption"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:hashtags|suggested_media_idea)/i);
              if (cm) rawCaption = cm[1].replace(/\\n/g, '\n').replace(/\\r/g, '');
              const hm = jsonText.match(/"hashtags"\s*:\s*\[([\s\S]*?)\]/i);
              if (hm) {
                const tags = hm[1].match(/#[a-zA-Z0-9_]+/g);
                if (tags) hashtags = tags;
              }
            }
          }

          const cleanTitleCandidate = rawTitle
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/<\/?think>/gi, '')
            .replace(/^Thinking Process:.*$/gim, '')
            .trim();
          const cleanTitle = (cleanTitleCandidate && !cleanTitleCandidate.startsWith('<') && !cleanTitleCandidate.startsWith('{') && !['{', '}', 'null'].includes(cleanTitleCandidate) && !cleanTitleCandidate.toLowerCase().includes('think'))
            ? cleanTitleCandidate
            : aiPrompt.trim();

          const cleanCaption = rawCaption
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/<\/?think>/gi, '')
            .replace(/^Thinking Process:.*$/gim, '')
            .trim();

          const finalCaption = cleanCaption.startsWith('{')
            ? `✨ ${cleanTitle} ✨\n\n${aiPrompt.trim()}\n\n👉 Check out the link in our bio for more details!`
            : cleanCaption;

          const combinedContent = hashtags && hashtags.length > 0
            ? `${finalCaption}\n\n${hashtags.join(' ')}`
            : finalCaption;

          sessionStorage.setItem('ai_draft_post', JSON.stringify({
            title: cleanTitle,
            content: combinedContent,
            ai_prompt: aiPrompt.trim(),
            ai_model: data.data.ai_model || null,
          }));

          toast.success(t('toastAiDraftSuccess') || 'Post drafted with AI! Opening composer...');
          router.push('/social-posts/create');
        }
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastAiDraftFailed') || 'AI generation failed');
      }
    } catch {
      toast.error(t('toastAiNetworkError') || 'Network error during AI generation');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Fetch Channels
  const fetchChannels = async () => {
    try {
      const res = await fetchWithCsrf('/social-posts/channels');
      if (res.ok) {
        const data = await res.json();
        setAvailableChannels(data.channels || []);
      }
    } catch {
      console.error('Failed to load social channels');
    }
  };

  // Fetch Posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (channelFilter !== 'all') params.set('channel_id', channelFilter);

      const res = await fetchWithCsrf(`/social-posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts?.data || []);
        setTotalPages(data.posts?.last_page || 1);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch {
      toast.error(t('toastLoadPostsFailed') || 'Failed to load social posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter, channelFilter]);

  // Real-Time Reverb Telemetry Listener
  useEffect(() => {
    let cleanupEcho: (() => void) | undefined;

    const setupEcho = async () => {
      try {
        const res = await fetchWithCsrf('/auth/me');
        if (res.ok) {
          const authData = await res.json();
          const currentTenantId = authData.user?.tenant_id;
          if (currentTenantId && echo) {
            const token = localStorage.getItem('whatsomni_token');
            echo.options.auth = {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
                Accept: 'application/json',
              },
            };

            const channelName = `tenant.${currentTenantId}`;
            const privateChannel = echo.private(channelName);

            const handlePostUpdate = (eventData: { post: SocialPost }) => {
              if (!eventData?.post) return;
              const updated = eventData.post;

              setPosts((prev) => {
                const exists = prev.some((p) => p.id === updated.id);
                if (exists) {
                  return prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
                }
                return [updated, ...prev];
              });

              if (updated.status === 'published') {
                toast.success(`Post "${updated.title}" published successfully!`);
              } else if (updated.status === 'partially_published') {
                toast.warning(`Post "${updated.title}" partially published with some channel errors.`);
              } else if (updated.status === 'failed') {
                toast.error(`Post "${updated.title}" failed to publish.`);
              }

              // Update telemetry counts
              fetchPosts();
            };

            privateChannel.listen('SocialPostStatusUpdatedEvent', handlePostUpdate);
            privateChannel.listen('.SocialPostStatusUpdatedEvent', handlePostUpdate);

            cleanupEcho = () => {
              if (echo) {
                echo.leave(channelName);
              }
            };
          }
        }
      } catch (err) {
        console.error('Failed to initialize Echo for social posts:', err);
      }
    };

    setupEcho();

    return () => {
      if (cleanupEcho) cleanupEcho();
    };
  }, []);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchPosts();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Ensure default platform persistent header is active
  useEffect(() => {
    setCustomHeader(null);
    return () => setCustomHeader(null);
  }, [setCustomHeader]);

  // Delete Handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithCsrf(`/social-posts/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(t('toastDeleteSuccess') || 'Post deleted successfully');
        setDeleteTarget(null);
        fetchPosts();
      } else {
        toast.error(t('toastDeleteFailed') || 'Failed to delete post');
      }
    } catch {
      toast.error(t('toastDeleteNetworkError') || 'Network error during post deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate / Clone Post Handler
  const handleConfirmClone = async () => {
    if (!cloneTarget) return;
    setIsCloning(true);
    try {
      const channelIds = (cloneTarget.channels || []).map(c => c.id);
      const res = await fetchWithCsrf('/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${cloneTarget.title} (Copy)`,
          content: cloneTarget.content,
          channel_ids: channelIds.length > 0 ? channelIds : (availableChannels[0] ? [availableChannels[0].id] : []),
          media_urls: cloneTarget.media_urls || [],
          timing_type: 'draft',
        }),
      });
      if (res.ok) {
        toast.success(t('postClonedSuccess') || 'Post cloned as draft');
        setCloneTarget(null);
        fetchPosts();
      } else {
        toast.error(t('clonePostError') || 'Failed to clone post');
      }
    } catch {
      toast.error(t('clonePostError') || 'Failed to clone post');
    } finally {
      setIsCloning(false);
    }
  };

  // Retry Failed Channels Handler
  const handleRetry = async (postId: number, channelIds?: number[]) => {
    setRetryingPostId(postId);
    try {
      const res = await fetchWithCsrf(`/social-posts/${postId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelIds ? { channel_ids: channelIds } : {}),
      });

      if (res.ok) {
        toast.success(t('retrySuccess') || 'Publishing retry initiated for failed channels.');
        fetchPosts();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastRetryFailed') || 'Failed to retry channels');
      }
    } catch {
      toast.error(t('toastRetryNetworkError') || 'Network error retrying channel publishing');
    } finally {
      setRetryingPostId(null);
    }
  };

  // Status Component (Colored icon & colored text only, no chip background or border)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-600 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>{t('statusPublished')}</span>
          </div>
        );
      case 'scheduled':
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-blue-600 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span>{t('statusScheduled')}</span>
          </div>
        );
      case 'publishing':
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-blue-600 whitespace-nowrap animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 text-blue-600 animate-spin" />
            <span>{t('statusPublishing')}</span>
          </div>
        );
      case 'partially_published':
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-600 whitespace-nowrap">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>{t('statusPartiallyPublished') || 'Partially Published'}</span>
          </div>
        );
      case 'failed':
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-red-600 whitespace-nowrap">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span>{t('statusFailed')}</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-zinc-500 whitespace-nowrap">
            <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span>{t('statusDraft')}</span>
          </div>
        );
    }
  };

  const channelFilterOptions = [
    { value: 'all', label: t('allConnectedChannels') },
    ...availableChannels.map(c => ({
      value: String(c.id),
      label: `${c.platform === 'instagram' ? 'Instagram' : c.platform === 'tiktok' ? 'TikTok' : c.platform === 'linkedin' ? 'LinkedIn' : 'Facebook'}: ${c.name}`,
    })),
  ];

  const statusFilterOptions = [
    { value: 'all', label: t('allStatuses') },
    { value: 'published', label: t('statusPublished') },
    { value: 'scheduled', label: t('statusScheduled') },
    { value: 'draft', label: t('draftPosts') },
    { value: 'failed', label: t('statusFailed') },
  ];

  return (
    <div className="w-full p-6 sm:p-8 space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto animate-fade-in font-sans text-zinc-955 select-none text-left bg-white">
      
      {/* 1. ACTION BAR (Search + Channel Filter + Refresh + Create Post Button in alignment) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
        {/* Left: Search & Channel Filter */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-[6px] text-xs font-medium placeholder-zinc-400 focus:outline-none focus:border-zinc-955 bg-white text-zinc-950"
            />
          </div>

          <div className="w-48 sm:w-56 shrink-0">
            <DropdownSelect
              value={channelFilter}
              onChange={(val) => { setChannelFilter(val); setPage(1); }}
              options={channelFilterOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Right: View Mode Toggle & Primary Action Button in alignment */}
        <div className="flex items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-zinc-100 rounded-[6px] border border-[#E8E8E6] select-none">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-950 shadow-3xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title={t('viewGrid') || 'Grid View'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-zinc-950 shadow-3xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title={t('viewTable') || 'Table View'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Link
            href="/social-posts/create"
            className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('createNewPost')}</span>
          </Link>
        </div>
      </div>

      {/* 2. SEGMENT SWITCHER TABS (Below Search Bar, No Dividers) */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar">
        {[
          { key: 'all', label: t('allStatuses'), count: counts.total, icon: <Share2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />, badgeActive: 'bg-zinc-100 text-zinc-900' },
          { key: 'published', label: t('statusPublished'), count: counts.published, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />, badgeActive: 'bg-emerald-100 text-emerald-900' },
          { key: 'scheduled', label: t('statusScheduled'), count: counts.scheduled, icon: <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />, badgeActive: 'bg-amber-100 text-amber-900' },
          { key: 'draft', label: t('draftPosts'), count: counts.draft, icon: <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />, badgeActive: 'bg-zinc-100 text-zinc-900' },
          { key: 'failed', label: t('statusFailed'), count: counts.failed, icon: <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />, badgeActive: 'bg-red-100 text-red-900' },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                isActive
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${isActive ? tab.badgeActive : 'bg-zinc-200/60 text-zinc-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. POSTS TABLE / EMPTY STATE */}
      <div className="space-y-4">
        {loading ? (
          <div className="border border-[#E8E8E6] rounded-xl p-16 flex flex-col items-center justify-center space-y-3 bg-white shadow-3xs">
            <SimpleLoader message={tCommon('loading') || 'Loading posts...'} />
          </div>
        ) : posts.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-[#E8E8E6] rounded-xl p-12 text-center bg-white space-y-4 select-none">
            <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
              <Share2 className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-zinc-950">{t('noPostsFound')}</h3>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                {searchQuery || statusFilter !== 'all' || channelFilter !== 'all'
                  ? 'No posts matched your active filter criteria. Try resetting your search or channel filter.'
                  : t('noPostsDesc')}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/social-posts/create"
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-semibold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('createFirstPost')}</span>
              </Link>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View with Black Fading Overlay */
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0 p-0 border-t border-l border-[#E8E8E6]">
              {posts.map((post) => {
                const isPartiallyFailed = post.status === 'failed' || post.status === 'partially_published';
                const firstMedia = post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null;
                const mediaCount = post.media_urls ? post.media_urls.length : 0;
                const primaryMedia = firstMedia ? resolveMediaUrl(firstMedia) : null;

                return (
                  <div
                    key={post.id}
                    className="group relative bg-zinc-950 border-r border-b border-[#E8E8E6] overflow-hidden aspect-square select-none shadow-2xs hover:shadow-lg hover:z-10 transition-all duration-300 flex flex-col justify-between rounded-none"
                  >
                    {/* 1. Background Media / Visual Layer */}
                    {primaryMedia ? (
                      isVideoMedia(firstMedia, post.post_type) ? (
                        <div className="absolute inset-0 w-full h-full bg-zinc-950 overflow-hidden rounded-none">
                          <video
                            src={primaryMedia}
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover rounded-none group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                            onMouseEnter={(e) => {
                              try { (e.currentTarget as HTMLVideoElement).play(); } catch {}
                            }}
                            onMouseLeave={(e) => {
                              try {
                                const v = e.currentTarget as HTMLVideoElement;
                                v.pause();
                                v.currentTime = 0;
                              } catch {}
                            }}
                          />
                        </div>
                      ) : (
                        <img
                          src={primaryMedia}
                          alt={post.title}
                          className="absolute inset-0 w-full h-full object-cover rounded-none group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-850 via-zinc-900 to-black flex items-center justify-center p-6 rounded-none">
                        <div className="text-zinc-700/40 select-none group-hover:scale-110 transition-transform duration-500">
                          <FileText className="h-16 w-16 stroke-[1]" />
                        </div>
                      </div>
                    )}

                    {/* 2. Black Fading Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/25 flex flex-col justify-between p-4 text-white z-10 transition-colors">
                      {/* Top Header Row inside Overlay: Channels & Status */}
                      <div className="flex items-start justify-between gap-2">
                        {/* Target Channel Badges (Platform Consistent rounded-full pills) */}
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[65%]">
                          {(post.channels || []).slice(0, 2).map((channel) => {
                            const isInstagram = channel.channel_type === 'instagram' || channel.platform === 'instagram';
                            const isTikTok = channel.channel_type === 'tiktok' || channel.platform === 'tiktok';
                            const isLinkedIn = channel.channel_type === 'linkedin' || channel.platform === 'linkedin';
                            return (
                              <span
                                key={channel.id}
                                className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-semibold text-white shadow-3xs"
                                title={channel.name}
                              >
                                {isInstagram ? (
                                  <img src="/channels/instagram.svg" alt="Instagram" className="w-3.5 h-3.5 object-contain shrink-0" />
                                ) : isTikTok ? (
                                  <img src="/channels/tiktok.webp" alt="TikTok" className="w-3.5 h-3.5 object-contain shrink-0" />
                                ) : isLinkedIn ? (
                                  <img src="/channels/linkedin.png" alt="LinkedIn" className="w-3.5 h-3.5 object-contain shrink-0" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                    <img src="/channels/facebook.webp" alt="Facebook" className="w-full h-full object-cover scale-135" />
                                  </div>
                                )}
                                <span className="truncate max-w-[65px] sm:max-w-[75px]">{channel.name}</span>
                              </span>
                            );
                          })}
                          {(post.channels || []).length > 2 && (
                            <span
                              className="inline-flex items-center justify-center bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white shadow-3xs"
                              title={(post.channels || []).slice(2).map(c => c.name).join(', ')}
                            >
                              +{(post.channels || []).length - 2}
                            </span>
                          )}
                        </div>

                        {/* Status Badge (Platform Consistent rounded-full) */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md border shrink-0 ${
                            post.status === 'published'
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                              : post.status === 'scheduled'
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                              : isPartiallyFailed
                              ? 'bg-red-500/25 text-red-300 border-red-500/40'
                              : 'bg-white/20 text-white border-white/20'
                          }`}
                        >
                          {post.status === 'published' && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                          {post.status === 'scheduled' && <Clock className="h-3 w-3 text-amber-400 shrink-0" />}
                          {isPartiallyFailed && <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />}
                          {post.status === 'draft' && <FileText className="h-3 w-3 text-zinc-300 shrink-0" />}
                          <span className="capitalize truncate">
                            {post.status === 'published'
                              ? t('statusPublished')
                              : post.status === 'scheduled'
                              ? t('statusScheduled')
                              : isPartiallyFailed
                              ? t('statusFailed')
                              : t('statusDraft')}
                          </span>
                        </span>
                      </div>

                      {/* Bottom Section inside Overlay: Title, Caption, Timing & Action Strip */}
                      <div className="space-y-2 pt-6 min-w-0">
                        {/* Post Title */}
                        <h4
                          className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-emerald-400 transition-colors drop-shadow-sm truncate"
                          title={post.title}
                        >
                          {post.title}
                        </h4>

                        {/* Post Caption / Content Snippet */}
                        {post.content && (
                          <p className="text-xs text-zinc-200/90 font-normal line-clamp-2 leading-relaxed drop-shadow-xs">
                            {post.content}
                          </p>
                        )}

                        {/* Delivery / Timing Info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{renderTimingText(post)}</span>
                        </div>

                        {/* Divider & Action Strip */}
                        <div className="border-t border-white/15 pt-2.5 flex items-center justify-between gap-2 min-w-0">
                          {/* Left: Media count or Retry button */}
                          <div className="min-w-0 flex-1 truncate">
                            {isPartiallyFailed ? (
                              <button
                                type="button"
                                disabled={retryingPostId === post.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(post.id);
                                }}
                                title={t('retryFailed') || 'Retry Failed Channels'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-red-500/25 hover:bg-red-500/35 border border-red-500/40 text-red-300 text-[10px] font-semibold transition-colors cursor-pointer shrink-0 max-w-full truncate"
                              >
                                <RotateCcw className={`h-2.5 w-2.5 shrink-0 ${retryingPostId === post.id ? 'animate-spin' : ''}`} />
                                <span className="truncate">{retryingPostId === post.id ? (t('retrying') || 'Retrying...') : (tCommon('retry') || 'Retry')}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-medium inline-flex items-center gap-1 truncate">
                                {firstMedia && mediaCount > 0 ? (
                                  isVideoMedia(firstMedia, post.post_type) ? (
                                    <>
                                      <Film className="h-3 w-3 text-zinc-200 shrink-0" />
                                      <span className="truncate text-zinc-200 font-semibold">{t('reelBadge') || 'Reel'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ImageIcon className="h-3 w-3 text-zinc-400 shrink-0" />
                                      <span className="truncate">{mediaCount} {mediaCount === 1 ? 'image' : 'images'}</span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                                    <span>Text only</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Right: Action Buttons (Platform Consistent rounded-[6px]) */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewPost(post);
                                const firstChType = post.channels?.[0]?.channel_type || post.channels?.[0]?.platform;
                                setPreviewPlatform(firstChType === 'tiktok' ? 'tiktok' : firstChType === 'linkedin' ? 'linkedin' : firstChType === 'facebook' ? 'facebook' : 'instagram');
                              }}
                              className="h-7 w-7 rounded-[6px] p-1 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                              title={t('previewPost')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setCloneTarget(post)}
                              className="h-7 w-7 rounded-[6px] p-1 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                              title={t('clonePost') || t('duplicatePost') || 'Clone Post'}
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            {post.status !== 'published' && post.status !== 'partially_published' && (
                              <Link
                                href={`/social-posts/create?edit=${post.id}`}
                                className="h-7 w-7 rounded-[6px] p-1 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                                title={t('editPost')}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(post)}
                              className="h-7 w-7 rounded-[6px] p-1 text-zinc-300 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                              title={t('deletePost')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer for Grid View */}
            {totalPages > 1 && (
              <div className="bg-white border border-[#E8E8E6] rounded-xl px-6 py-4 flex items-center justify-between text-xs text-zinc-500 font-semibold select-none shadow-3xs">
                <span>Showing page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    className="border border-[#E8E8E6] bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    className="border border-[#E8E8E6] bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Data Table (Spacious, Professional, Platform-Consistent) */
          <div className="border border-[#E8E8E6] rounded-xl bg-white shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E8E8E6] text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                    <th className="px-6 py-4 w-[36%]">{t('colPostContent')}</th>
                    <th className="px-6 py-4 w-[26%]">{t('colChannels')}</th>
                    <th className="px-6 py-4 w-[15%]">{t('colTiming')}</th>
                    <th className="px-6 py-4 w-[11%]">{t('colStatus')}</th>
                    <th className="px-6 py-4 text-right w-[12%]">{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {posts.map((post) => {
                    const firstMedia = post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null;
                    const targetedChannels = post.channels || [];
                    const isPartiallyFailed = post.status === 'failed' || post.status === 'partially_published';

                    return (
                      <tr key={post.id} className="hover:bg-[#FAFAFA]/70 transition-colors group">
                        {/* 1. Post Content & Media */}
                        <td className="px-6 py-5 align-top">
                          <div className="flex items-start gap-3.5">
                            {firstMedia ? (
                              <div className="h-12 w-12 rounded-lg border border-[#E8E8E6] overflow-hidden shrink-0 bg-zinc-950 relative shadow-3xs flex items-center justify-center">
                                {isVideoMedia(firstMedia, post.post_type) ? (
                                  <>
                                    <video
                                      src={resolveMediaUrl(firstMedia)}
                                      className="h-full w-full object-cover"
                                      preload="metadata"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                      <Film className="h-4 w-4 text-white drop-shadow" />
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={resolveMediaUrl(firstMedia)}
                                    alt={post.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-lg border border-[#E8E8E6] flex items-center justify-center shrink-0 bg-zinc-50 text-zinc-400 shadow-3xs">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}

                            <div className="space-y-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-[13px] font-bold text-zinc-950 truncate leading-snug">
                                  {post.title}
                                </h4>
                                {post.post_type === 'reel' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                    <Film className="h-2.5 w-2.5" />
                                    <span>{t('reelBadge') || 'Reel'}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] text-zinc-500 font-normal leading-relaxed line-clamp-2">
                                {post.content}
                              </p>
                              {post.ai_model && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium font-mono pt-0.5">
                                  <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>Generated with AI</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Target Channels */}
                        <td className="px-6 py-5 align-top">
                          <div className="flex flex-wrap gap-2 items-center">
                            {targetedChannels.length === 0 ? (
                              <span className="text-[11px] text-zinc-400 font-medium italic">None</span>
                            ) : (
                              <>
                                {targetedChannels.slice(0, 2).map((ch) => {
                                  const postChannel = (post.post_channels || []).find(pc => pc.channel_connection_id === ch.id);
                                  const isPublished = postChannel?.status === 'published';
                                  const isFailed = postChannel?.status === 'failed';
                                  const isPublishing = postChannel?.status === 'publishing';
                                  const permalink = postChannel?.permalink;
                                  const isInstagram = ch.channel_type === 'instagram' || ch.platform === 'instagram';
                                  const isTikTok = ch.channel_type === 'tiktok' || ch.platform === 'tiktok';
                                  const isLinkedIn = ch.channel_type === 'linkedin' || ch.platform === 'linkedin';

                                  return (
                                    <div
                                      key={ch.id}
                                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all shadow-3xs ${
                                        isFailed
                                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                          : 'bg-[#F8F8F8] border-[#E8E8E6] text-zinc-800'
                                      }`}
                                    >
                                      {isInstagram ? (
                                        <img src="/channels/instagram.svg" alt="Instagram" className="h-4 w-4 object-contain shrink-0" />
                                      ) : isTikTok ? (
                                        <img src="/channels/tiktok.webp" alt="TikTok" className="h-4 w-4 object-contain shrink-0" />
                                      ) : isLinkedIn ? (
                                        <img src="/channels/linkedin.png" alt="LinkedIn" className="h-4 w-4 object-contain shrink-0" />
                                      ) : (
                                        <div className="h-4 w-4 rounded-xs overflow-hidden flex items-center justify-center shrink-0">
                                          <img src="/channels/facebook.webp" alt="Facebook" className="h-full w-full object-cover scale-135" />
                                        </div>
                                      )}
                                      <span className="truncate max-w-[130px] font-medium">{ch.name}</span>

                                      {/* Live Permalink Link */}
                                      {isPublished && permalink && (
                                        <a
                                          href={permalink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={t('viewLivePost') || 'View Live Post'}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded p-0.5 transition-colors cursor-pointer inline-flex items-center ml-0.5"
                                        >
                                          <ExternalLink className="h-3 w-3 text-emerald-600" />
                                        </a>
                                      )}

                                      {/* Failed Channel Warning & Retry Icon */}
                                      {isFailed && (
                                        <div className="flex items-center gap-1 ml-0.5">
                                          <span
                                            title={postChannel?.error_message || t('deliveryFailedTooltip') || 'Delivery failed on this channel'}
                                            className="text-red-500 flex items-center cursor-help"
                                          >
                                            <AlertCircle className="h-3 w-3 text-red-500" />
                                          </span>
                                          <button
                                            type="button"
                                            disabled={retryingPostId === post.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRetry(post.id, [ch.id]);
                                            }}
                                            title="Retry publishing to this channel"
                                            className="text-zinc-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer disabled:opacity-50"
                                          >
                                            <RotateCcw className={`h-2.5 w-2.5 ${retryingPostId === post.id ? 'animate-spin' : ''}`} />
                                          </button>
                                        </div>
                                      )}

                                      {/* Publishing Spinner */}
                                      {isPublishing && (
                                        <RefreshCw className="h-3 w-3 text-blue-600 animate-spin shrink-0 ml-0.5" />
                                      )}
                                    </div>
                                  );
                                })}

                                {targetedChannels.length > 2 && (() => {
                                  const hiddenChannels = targetedChannels.slice(2);
                                  const hasHiddenFailed = hiddenChannels.some(c =>
                                    (post.post_channels || []).find(pc => pc.channel_connection_id === c.id)?.status === 'failed'
                                  );
                                  return (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold shadow-3xs cursor-default select-none ${
                                        hasHiddenFailed
                                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                          : 'bg-[#F8F8F8] border-[#E8E8E6] text-zinc-700'
                                      }`}
                                      title={hiddenChannels.map(c => c.name).join(', ')}
                                    >
                                      {hasHiddenFailed && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                                      <span>+{hiddenChannels.length}</span>
                                    </span>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. Timing & Delivery */}
                        <td className="px-6 py-5 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            {post.status === 'published' && post.published_at ? (
                              <>
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                                  Published
                                </span>
                                <span className="text-xs text-zinc-900 font-semibold block">
                                  {new Date(post.published_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-mono block">
                                  {new Date(post.published_at).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            ) : post.status === 'scheduled' && post.scheduled_at ? (
                              <>
                                <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                                  Scheduled
                                </span>
                                <span className="text-xs text-zinc-900 font-semibold block">
                                  {new Date(post.scheduled_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-mono block">
                                  {new Date(post.scheduled_at).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                                  Created
                                </span>
                                <span className="text-xs text-zinc-800 font-semibold block">
                                  {new Date(post.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-mono block">
                                  {new Date(post.created_at).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="px-6 py-5 align-top whitespace-nowrap">
                          {renderStatusBadge(post.status)}
                        </td>

                        {/* 5. Actions */}
                        <td className="px-6 py-5 align-top text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-3.5">
                            {/* Icon Actions Row */}
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewPost(post);
                                  const firstChType = post.channels?.[0]?.channel_type || post.channels?.[0]?.platform;
                                  setPreviewPlatform(firstChType === 'tiktok' ? 'tiktok' : firstChType === 'linkedin' ? 'linkedin' : firstChType === 'facebook' ? 'facebook' : 'instagram');
                                }}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                title={t('previewPost')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCloneTarget(post)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                title={t('clonePost') || t('duplicatePost') || 'Clone Post'}
                              >
                                <Copy className="h-4 w-4" />
                              </button>

                              {post.status !== 'published' && post.status !== 'partially_published' && (
                                <Link
                                  href={`/social-posts/create?edit=${post.id}`}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                  title={t('editPost')}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Link>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(post)}
                                className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={t('deletePost')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Retry Failed Channels Button placed BELOW icon buttons with ample spacing */}
                            {isPartiallyFailed && (
                              <button
                                type="button"
                                disabled={retryingPostId === post.id}
                                onClick={() => handleRetry(post.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:no-underline shrink-0 select-none mt-1"
                                title={t('retryFailed') || 'Retry Failed Channels'}
                              >
                                <RotateCcw className={`h-3.5 w-3.5 text-amber-600 shrink-0 ${retryingPostId === post.id ? 'animate-spin' : ''}`} />
                                <span>{retryingPostId === post.id ? (t('retrying') || 'Retrying...') : (t('retryFailed') || 'Retry Failed Channels')}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-4 flex items-center justify-between text-xs text-zinc-500 font-semibold select-none">
                <span>Showing page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    className="border border-[#E8E8E6] bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    className="border border-[#E8E8E6] bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black cursor-pointer text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PREVIEW MODAL */}
      {previewPost && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="bg-white rounded-[12px] border border-[#E8E8E6] shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E8E8E6] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center">
                  <Eye className="h-3.5 w-3.5 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">{t('previewModalTitle')}</h3>
                  <span className="text-[10px] text-zinc-400 font-medium block">{t('liveSimulatedFeed')}</span>
                </div>
              </div>

              {/* Platform Switcher Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100/90 rounded-[6px] border border-[#E8E8E6] shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('instagram')}
                  className={`px-2.5 h-7 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                    previewPlatform === 'instagram'
                      ? 'bg-white text-zinc-950 shadow-3xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <img src="/channels/instagram.svg" alt="Instagram" className="h-3.5 w-3.5 object-contain shrink-0" />
                  <span>Instagram</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('facebook')}
                  className={`px-2.5 h-7 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                    previewPlatform === 'facebook'
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
                  onClick={() => setPreviewPlatform('tiktok')}
                  className={`px-2.5 h-7 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                    previewPlatform === 'tiktok'
                      ? 'bg-white text-zinc-950 shadow-3xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <img src="/channels/tiktok.webp" alt="TikTok" className="h-3.5 w-3.5 object-contain shrink-0" />
                  <span>TikTok</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('linkedin')}
                  className={`px-2.5 h-7 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 leading-none ${
                    previewPlatform === 'linkedin'
                      ? 'bg-white text-zinc-950 shadow-3xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <img src="/channels/linkedin.png" alt="LinkedIn" className="h-3.5 w-3.5 object-contain shrink-0" />
                  <span>LinkedIn</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="h-7 w-7 rounded-[6px] flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Feed Mockup */}
            <div className="p-4 bg-zinc-100/60 max-h-[80vh] overflow-y-auto">
              {previewPlatform === 'instagram' ? (
                /* Simulated Instagram Feed Card */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto">
                  {/* Instagram Top Bar */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center p-1 shrink-0 shadow-3xs">
                        <img src="/channels/instagram.svg" alt="Instagram" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">
                          {previewPost.channels?.[0]?.handle || previewPost.channels?.[0]?.name || 'brand_official'}
                        </span>
                        <span className="text-[9.5px] text-zinc-400">
                          {previewPost.post_type === 'reel' ? (t('reelBadge') || 'Instagram Reel') : (t('sponsoredFeed') || 'Sponsored / Feed')}
                        </span>
                      </div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-zinc-400 cursor-pointer hover:text-zinc-600" />
                  </div>

                  {/* Media Content */}
                  {previewPost.media_urls && previewPost.media_urls.length > 0 ? (
                    <div className="aspect-square w-full bg-zinc-950 overflow-hidden relative flex items-center justify-center">
                      {isVideoMedia(previewPost.media_urls[0], previewPost.post_type) ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                          <video
                            src={resolveMediaUrl(previewPost.media_urls[0])}
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
                          src={resolveMediaUrl(previewPost.media_urls[0])}
                          alt={previewPost.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-zinc-50 flex items-center justify-center text-zinc-400 text-xs font-medium">
                      No media attached
                    </div>
                  )}

                  {/* Instagram Action Icons */}
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

                  {/* Instagram Caption */}
                  <div className="p-3 pt-1 text-left space-y-1">
                    <span className="text-[11px] font-bold text-zinc-955 mr-1.5">
                      {previewPost.channels?.[0]?.handle || 'brand_official'}
                    </span>
                    <span className="text-[11px] text-zinc-800 leading-relaxed whitespace-pre-line font-normal">
                      {previewPost.content}
                    </span>
                  </div>
                </div>
              ) : previewPlatform === 'facebook' ? (
                /* Simulated Facebook Feed Card */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto">
                  {/* Facebook Header */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                        <img src="/channels/facebook.webp" alt="Facebook" className="h-full w-full object-cover scale-135" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">
                          {previewPost.channels?.[0]?.name || t('companyFacebookPage') || 'Company Facebook Page'}
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

                  {/* Facebook Caption */}
                  <div className="p-3 text-[11px] text-zinc-800 leading-relaxed whitespace-pre-line text-left">
                    {previewPost.content}
                  </div>

                  {/* Media */}
                  {previewPost.media_urls && previewPost.media_urls.length > 0 && (
                    <div className="aspect-[16/9] w-full bg-black overflow-hidden relative flex items-center justify-center">
                      {isVideoMedia(previewPost.media_urls[0], previewPost.post_type) ? (
                        <video
                          src={resolveMediaUrl(previewPost.media_urls[0])}
                          controls
                          playsInline
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <img
                          src={resolveMediaUrl(previewPost.media_urls[0])}
                          alt={previewPost.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Facebook Engagement Bar */}
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
              ) : previewPlatform === 'tiktok' ? (
                /* Simulated TikTok Mobile Mockup */
                <div className="relative mx-auto max-w-[280px] sm:max-w-[300px] aspect-[9/16] rounded-2xl bg-black border-4 border-zinc-900 overflow-hidden shadow-2xl flex flex-col justify-between text-white select-none">
                  {/* Video or Placeholder Background */}
                  {previewPost.media_urls && previewPost.media_urls.length > 0 && isVideoMedia(previewPost.media_urls[0], previewPost.post_type) ? (
                    <video
                      src={resolveMediaUrl(previewPost.media_urls[0])}
                      controls
                      playsInline
                      loop
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : previewPost.media_urls && previewPost.media_urls.length > 0 ? (
                    <div className="absolute inset-0 h-full w-full">
                      <img
                        src={resolveMediaUrl(previewPost.media_urls[0])}
                        alt={previewPost.title || 'TikTok Media'}
                        className="h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-zinc-400 space-y-2">
                      <Film className="h-8 w-8 text-zinc-600" />
                      <span className="text-xs font-medium text-zinc-400">Vertical video playback simulated for TikTok</span>
                    </div>
                  )}

                  {/* Top Bar: Live, Following, For You */}
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
                          @{previewPost.channels?.[0]?.handle || previewPost.channels?.[0]?.name?.toLowerCase().replace(/\s+/g, '_') || 'brand_official'}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#25F4EE]" />
                      </div>

                      <p className="text-[11px] text-white/90 line-clamp-3 leading-snug font-normal whitespace-pre-line">
                        {previewPost.content}
                      </p>

                      <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                        <span className="animate-pulse">♫</span>
                        <span className="truncate">Original Sound - @{previewPost.channels?.[0]?.handle || 'brand_official'}</span>
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
                /* Simulated LinkedIn Feed Card */
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-3xs max-w-sm mx-auto">
                  {/* LinkedIn Header */}
                  <div className="px-3.5 py-3 flex items-start justify-between border-b border-[#F0F0F0]">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-md bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center overflow-hidden shrink-0">
                        <img src="/channels/linkedin.png" alt="LinkedIn" className="h-5 w-5 object-contain" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 leading-tight">
                            {previewPost.channels?.[0]?.name || t('companyLinkedInPage') || 'LinkedIn Company Page'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">• 1st</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block leading-tight">
                          Enterprise Social Hub & Messaging
                        </span>
                        <div className="flex items-center gap-1 text-[9.5px] text-zinc-400 mt-0.5">
                          <span>Just now</span>
                          <span>•</span>
                          <Globe className="h-2.5 w-2.5 text-zinc-400" />
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-zinc-400 cursor-pointer hover:text-zinc-600" />
                  </div>

                  {/* LinkedIn Post Commentary */}
                  <div className="p-3.5 text-[11.5px] text-zinc-800 leading-relaxed whitespace-pre-line text-left">
                    {previewPost.content}
                  </div>

                  {/* Media */}
                  {previewPost.media_urls && previewPost.media_urls.length > 0 && (
                    <div className="w-full bg-zinc-100 overflow-hidden relative flex items-center justify-center border-t border-b border-zinc-100">
                      {isVideoMedia(previewPost.media_urls[0], previewPost.post_type) ? (
                        <video
                          src={resolveMediaUrl(previewPost.media_urls[0])}
                          controls
                          playsInline
                          className="w-full max-h-72 object-contain"
                        />
                      ) : (
                        <img
                          src={resolveMediaUrl(previewPost.media_urls[0])}
                          alt={previewPost.title}
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
                      <span className="font-semibold text-zinc-600 ml-1">42</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 font-medium">
                      <span>12 comments</span>
                      <span>•</span>
                      <span>5 reposts</span>
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

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-between">
              {/* Live Link if Published */}
              <div>
                {(previewPost.status === 'published' || previewPost.status === 'partially_published') && (
                  (() => {
                    const activeChannel = (previewPost.post_channels || []).find(
                      pc => pc.platform === previewPlatform && pc.permalink
                    ) || (previewPost.post_channels || []).find(pc => pc.permalink);

                    if (activeChannel?.permalink) {
                      return (
                        <a
                          href={activeChannel.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8.5 px-3.5 bg-[#0A0A0A] hover:bg-zinc-900 text-white text-xs font-semibold rounded-[6px] shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{t('viewLivePost') || 'View Live Post'}</span>
                        </a>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="h-8.5 px-4 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-semibold rounded-[6px] shadow-3xs cursor-pointer transition-all"
              >
                {tCommon('close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. DELETE CONFIRMATION DIALOG (Platform-Consistent AlertDialog) */}
      <AlertDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteModalTitle') || 'Delete Social Post'}
        description={t('deleteModalWarning') || 'Are you sure you want to delete this social post? This action cannot be undone.'}
        confirmLabel={isDeleting ? (t('deleting') || 'Deleting...') : (tCommon('delete') || t('deletePost') || 'Delete')}
        cancelLabel={tCommon('cancel') || 'Cancel'}
        type="danger"
        isLoading={isDeleting}
      />

      {/* 6. CLONE CONFIRMATION DIALOG (Platform-Consistent AlertDialog) */}
      <AlertDialog
        isOpen={!!cloneTarget}
        onClose={() => setCloneTarget(null)}
        onConfirm={handleConfirmClone}
        title={t('cloneModalTitle') || 'Clone Social Post'}
        description={
          <span>
            {t('cloneModalWarning') || 'Are you sure you want to clone this social post? A new draft copy will be created.'}
            {cloneTarget?.title && (
              <span className="block mt-1.5 font-bold text-zinc-900 truncate">
                "{cloneTarget.title}"
              </span>
            )}
          </span>
        }
        confirmLabel={isCloning ? (t('cloning') || 'Cloning...') : (t('clonePost') || t('duplicatePost') || 'Clone Post')}
        cancelLabel={tCommon('cancel') || 'Cancel'}
        type="info"
        icon={<Copy className="h-4 w-4 text-zinc-800" />}
        iconBoxClassName="bg-[#FAFAFA] border border-[#E8E8E6]"
        confirmVariant="primary"
        isLoading={isCloning}
      />
    </div>
  );
}
