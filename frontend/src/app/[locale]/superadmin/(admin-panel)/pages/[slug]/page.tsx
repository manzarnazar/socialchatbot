'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { fetchWithCsrf } from '@/lib/api';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Edit3, 
  Globe, 
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckCircle2,
  RefreshCw,
  Columns,
  Quote,
  Code
} from 'lucide-react';
import { toast } from 'sonner';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';

interface CustomPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  is_published: boolean;
  updated_at: string;
}

export default function SuperAdminEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const setCustomHeader = useHeaderStore(state => state.setCustomHeader);
  const t = useTranslations('Superadmin.customPages');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'split' | 'preview'>('split');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Mutable ref to always have latest state values and prevent stale closures
  const stateRef = useRef({ title, content, metaDescription, isPublished });
  useEffect(() => {
    stateRef.current = { title, content, metaDescription, isPublished };
  }, [title, content, metaDescription, isPublished]);

  const fetchPageDetails = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCsrf(`/admin/pages/${slug}`);
      if (response.ok) {
        const data: CustomPage = await response.json();
        setTitle(data.title);
        setContent(data.content);
        setMetaDescription(data.meta_description || '');
        setIsPublished(data.is_published);
      } else {
        toast.error(t('failedLoadContent'));
        router.push('/superadmin/pages');
      }
    } catch {
      toast.error(t('networkErrorLoadContent'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageDetails();
  }, [slug]);

  const handleSave = async () => {
    const currentState = stateRef.current;
    if (!currentState.title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithCsrf(`/admin/pages/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: currentState.title,
          content: currentState.content,
          meta_description: currentState.metaDescription,
          is_published: currentState.isPublished,
        }),
      });

      if (response.ok) {
        toast.success(t('updateSuccess'));
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || t('updateFailed'));
      }
    } catch {
      toast.error(t('networkErrorSave'));
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Safe markdown + html renderer for preview
  const renderPreviewHtml = (raw: string) => {
    if (!raw) return '';
    try {
      const parsed = marked.parse(raw, { gfm: true, breaks: true });
      return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
    } catch {
      return DOMPurify.sanitize(raw);
    }
  };

  // Exact AI Agent top bar header pattern
  useEffect(() => {
    setCustomHeader(
      <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/superadmin/pages')}
            className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
          <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
            {t('editPage', { title: title || slug })}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{t('viewLive')}</span>
          </a>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-black text-white hover:bg-neutral-800 h-8 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" /> : <Save className="h-3.5 w-3.5 text-white" />}
            <span>{t('saveChanges')}</span>
          </button>
        </div>
      </header>
    );

    return () => {
      setCustomHeader(null);
    };
  }, [slug, title, content, metaDescription, isPublished, saving, setCustomHeader, router, t]);

  const insertSnippet = (tag: string, endTag: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${tag}${selected}${endTag}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  if (loading) {
    return <SimpleLoader message={t('loadingContent')} />;
  }

  const statusOptions = [
    { value: 'published', label: t('publishedDesc'), icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
    { value: 'draft', label: t('draftDesc'), icon: <span className="h-2 w-2 rounded-full bg-zinc-400" /> },
  ];

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full bg-white animate-fade-in select-none font-sans text-black flex-1 overflow-y-auto pb-12">
      
      {/* 1. Basic Settings Section */}
      <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
        <div className="col-span-1">
          <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('pageTitle')}</h3>
          <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('description')}</p>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('pageTitle')}</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Privacy Policy"
              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('publicationStatus')}</label>
              <DropdownSelect
                value={isPublished ? 'published' : 'draft'}
                onChange={(val) => setIsPublished(val === 'published')}
                options={statusOptions}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('pageRouteSlug')}</label>
              <input 
                type="text"
                value={`/${slug}`}
                disabled
                className="w-full h-9 px-3 bg-[#FAF9F6] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-400 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('metaDescription')}</label>
            <input
              type="text"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              placeholder={t('metaDescriptionPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* 2. Redesigned Page Content Layout Studio */}
      <div className="px-8 py-8 border-b border-[#E8E8E6] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">Page Content & Typography Studio</h3>
            <p className="text-[11px] text-zinc-500 font-semibold">Write and format your page content with live side-by-side preview rendering.</p>
          </div>
        </div>

        <div className="bg-white border border-[#E8E8E6] rounded-[10px] overflow-hidden shadow-[var(--shadow-card)]">
          {/* Studio Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E8E8E6] bg-zinc-50/80 select-none">
            
            {/* View Mode Selector Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'editor' ? 'bg-white text-zinc-950 shadow-3xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                <span>{t('htmlContentEditor')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'split' ? 'bg-white text-zinc-950 shadow-3xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Columns className="h-3.5 w-3.5 text-zinc-500" />
                <span>{t('htmlSourceEditor')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview' ? 'bg-white text-zinc-950 shadow-3xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-zinc-500" />
                <span>{t('livePagePreview')}</span>
              </button>
            </div>

            {/* Quick HTML Snippet Formatter Buttons */}
            {activeTab !== 'preview' && (
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => insertSnippet('<h1>', '</h1>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Heading 1"
                >
                  <Heading1 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>H1</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<h2>', '</h2>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Heading 2"
                >
                  <Heading2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>H2</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<strong>', '</strong>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Bold Text"
                >
                  <Bold className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<em>', '</em>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Italic Text"
                >
                  <Italic className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Italic</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<ul>\n  <li>', '</li>\n</ul>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Bullet List"
                >
                  <List className="h-3.5 w-3.5 text-zinc-500" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<blockquote>', '</blockquote>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Blockquote"
                >
                  <Quote className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('<p>', '</p>')}
                  className="px-2 py-1 bg-white border border-[#E8E8E6] hover:bg-zinc-100 rounded-[6px] text-zinc-700 hover:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer"
                  title="Insert Paragraph"
                >
                  <Code className="h-3.5 w-3.5 text-zinc-500" />
                  <span>P</span>
                </button>
              </div>
            )}
          </div>

          {/* Studio Body Panes */}
          {activeTab === 'editor' && (
            <textarea
              id="content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={22}
              className="w-full p-5 text-xs font-mono border-0 focus:outline-none focus:ring-0 leading-relaxed bg-[#FAF9F6] resize-none text-zinc-900 min-h-[480px]"
              placeholder={t('editorPlaceholder')}
            />
          )}

          {activeTab === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E8E8E6] min-h-[480px]">
              {/* Code Editor Pane */}
              <div className="flex flex-col bg-[#FAF9F6]">
                <div className="px-4 py-2 bg-zinc-100/70 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="h-3 w-3 text-zinc-400" />
                  <span>{t('htmlSourceEditor')}</span>
                </div>
                <textarea
                  id="content-editor"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 w-full p-4 text-xs font-mono border-0 focus:outline-none focus:ring-0 leading-relaxed bg-[#FAF9F6] resize-none text-zinc-900 min-h-[440px]"
                  placeholder={t('editorPlaceholder')}
                />
              </div>

              {/* Rendered HTML Live Preview Pane */}
              <div className="flex flex-col bg-white">
                <div className="px-4 py-2 bg-zinc-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-zinc-400" />
                  <span>{t('liveRenderedOutput')}</span>
                </div>
                <div className="flex-1 p-6 bg-white overflow-y-auto max-h-[500px]">
                  <article 
                    className="prose max-w-none text-zinc-800 text-xs leading-relaxed space-y-4 [&_h1]:text-xl [&_h1]:font-black [&_h1]:text-black [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-black [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold [&_strong]:text-black [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-600"
                    dangerouslySetInnerHTML={{ __html: renderPreviewHtml(content) }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-8 bg-white min-h-[480px]">
              <article 
                className="prose max-w-none text-zinc-800 text-sm leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-black [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-black [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold [&_strong]:text-black [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-600"
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(content) }}
              />
            </div>
          )}

          {/* Integrated Studio Bottom Status Bar */}
          <div className="px-5 py-2.5 bg-zinc-50 border-t border-[#E8E8E6] flex items-center justify-between text-[11px] text-zinc-400 font-mono select-none">
            <div className="flex items-center gap-4">
              <span>{charCount.toLocaleString()} {t('characters')}</span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} {t('words')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{t('html5Compliant')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Sticky / Footer Action Bar */}
      <div className="px-8 py-4 flex items-center justify-between border-t border-[#E8E8E6] bg-zinc-50/60 mt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/pages"
            className="px-4 py-2 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 rounded-md text-xs font-semibold transition-all shadow-3xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Pages</span>
          </Link>
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 rounded-md text-xs font-semibold transition-all shadow-3xs flex items-center gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{t('viewLive')}</span>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-black text-white hover:bg-neutral-800 h-9 px-6 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" /> : <Save className="h-3.5 w-3.5 text-white" />}
            <span>{t('saveChanges')}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
