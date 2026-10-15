'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { fetchWithCsrf } from '@/lib/api';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Scale, 
  Info, 
  Lock, 
  Clock, 
  ChevronRight,
  Mail,
  CheckCircle2
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';

interface CustomPageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  is_published: boolean;
  updated_at: string;
}

const ALL_LEGAL_PAGES = [
  { slug: 'terms', title: 'Terms of Service', icon: Scale },
  { slug: 'privacy', title: 'Privacy Policy', icon: ShieldCheck },
  { slug: 'about', title: 'About Us', icon: Info },
  { slug: 'security', title: 'Security & Trust', icon: Lock },
  { slug: 'sla', title: 'SLA & Uptime', icon: Clock },
];

export default function PublicCustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [page, setPage] = useState<CustomPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetchWithCsrf(`/public/pages/${slug}`);
        if (response.ok) {
          const data: CustomPageData = await response.json();
          setPage(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug]);

  const renderContentHtml = (raw: string) => {
    if (!raw) return '';
    try {
      const parsed = marked.parse(raw, { gfm: true, breaks: true });
      return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
    } catch {
      return DOMPurify.sanitize(raw);
    }
  };

  if (loading) {
    return <SimpleLoader message="Loading document..." />;
  }

  if (error || !page) {
    return (
      <div 
        className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col justify-between selection:bg-zinc-200 selection:text-black"
        style={{ backgroundColor: '#ffffff', color: '#09090b' }}
      >
        <LandingNavbar forceTheme="light" />
        <div className="pt-36 pb-20 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-400">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Page Not Found</h1>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
            The requested legal document does not exist or is currently unpublished.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 h-8.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const wordCount = page.content.trim() ? page.content.trim().split(/\s+/).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div 
      className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col justify-between selection:bg-zinc-200 selection:text-zinc-900"
      style={{ backgroundColor: '#ffffff', color: '#09090b' }}
    >
      <LandingNavbar forceTheme="light" />

      {/* Main Single Column Clean Document Container */}
      <main className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-[840px] mx-auto w-full flex-grow text-left">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <Link href="/" className="hover:text-black transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-zinc-500">Legal & Compliance</span>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-zinc-900 font-bold truncate max-w-[200px] sm:max-w-none">{page.title}</span>
        </nav>

        {/* Quick Legal Switcher Tabs */}
        <div className="mb-8 p-1.5 bg-zinc-50 border border-zinc-200/80 rounded-xl overflow-x-auto flex items-center gap-1">
          {ALL_LEGAL_PAGES.map((item) => {
            const Icon = item.icon;
            const isActive = slug === item.slug;
            return (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                  isActive
                    ? 'bg-black text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100/80'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Header Title Block */}
        <header className="pb-8 mb-10 border-b border-zinc-200 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-600 border border-zinc-200/60">
            <CheckCircle2 className="h-3 w-3 text-zinc-500" />
            <span>Official Legal Documentation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
            {page.title}
          </h1>

          {page.meta_description && (
            <p className="text-sm sm:text-base text-zinc-600 font-medium leading-relaxed max-w-2xl">
              {page.meta_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>Last updated: {new Date(page.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>{readTimeMinutes} min read</span>
            </div>
          </div>
        </header>

        {/* Render Clean Document Markdown & HTML Content */}
        <article
          className="prose prose-zinc max-w-none text-zinc-700 text-sm sm:text-base leading-relaxed space-y-6 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-zinc-950 [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-zinc-200/60 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-950 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-zinc-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-zinc-650 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-zinc-650 [&_strong]:text-zinc-950 [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-zinc-600 [&_blockquote]:bg-zinc-50/60 [&_blockquote]:rounded-r-md [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-zinc-200 [&_th]:p-2.5 [&_th]:bg-zinc-50 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-zinc-200 [&_td]:p-2.5 [&_a]:text-black [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-zinc-600"
          dangerouslySetInnerHTML={{ __html: renderContentHtml(page.content) }}
        />

        {/* Questions and Legal Assistance Footer Card */}
        <div className="mt-14 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-950">Questions about this document?</h4>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              Our legal, compliance, and enterprise privacy teams are available to clarify policies and data handling.
            </p>
          </div>
          <a
            href="mailto:support@whatsomni.com"
            className="inline-flex items-center gap-1.5 px-4 h-9 bg-black text-white hover:bg-zinc-800 text-xs font-bold rounded-lg transition-all shadow-2xs shrink-0"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Contact Legal Team</span>
          </a>
        </div>

      </main>

      <LandingFooter />
    </div>
  );
}
