'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/api';
import { 
  FileText, 
  Edit3, 
  ExternalLink, 
  Clock, 
  ShieldCheck,
  Info,
  Scale
} from 'lucide-react';
import { toast } from 'sonner';
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

export default function SuperAdminCustomPagesPage() {
  const t = useTranslations('Superadmin.customPages');
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCsrf('/admin/pages');
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      } else {
        toast.error(t('failedLoad'));
      }
    } catch {
      toast.error(t('networkErrorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const getPageIcon = (slug: string) => {
    if (slug === 'about') return <Info className="h-5 w-5 text-blue-500" />;
    if (slug === 'privacy') return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
    if (slug === 'terms') return <Scale className="h-5 w-5 text-amber-500" />;
    return <FileText className="h-5 w-5 text-zinc-500" />;
  };

  if (loading) {
    return <SimpleLoader message={t('loading')} />;
  }

  return (
    <div className="w-full p-8 space-y-6 animate-fade-in font-sans text-black max-w-6xl mx-auto flex-1 overflow-y-auto">
      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pages.map((page) => (
          <div 
            key={page.id}
            className="bg-white border border-[#E8E8E6] rounded-[10px] p-5 shadow-[var(--shadow-card)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-[8px] bg-zinc-50 border border-zinc-200/60 flex items-center justify-center">
                  {getPageIcon(page.slug)}
                </div>
                <span className={`px-2.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                  page.is_published 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${page.is_published ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  {page.is_published ? t('published') : t('draft')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-black">{page.title}</h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">/{page.slug}</p>
              </div>

              <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-medium">
                {page.meta_description || t('noDescription')}
              </p>

              <div className="pt-3 border-t border-[#E8E8E6] flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('updated')} {new Date(page.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-5 flex items-center gap-2">
              <Link
                href={`/superadmin/pages/${page.slug}`}
                className="flex-1 bg-zinc-955 hover:bg-zinc-900 text-white text-xs font-semibold h-8 rounded-[6px] transition-all flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t('editContent')}</span>
              </Link>
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium rounded-[6px] transition-all flex items-center justify-center shadow-3xs cursor-pointer"
                title={t('previewLive')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
