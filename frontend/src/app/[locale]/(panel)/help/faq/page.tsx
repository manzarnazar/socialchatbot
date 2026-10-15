'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, BookOpen, Sparkles, MessageSquare, CreditCard, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  icon: React.ComponentType<any>;
  items: FaqItem[];
}

export default function FaqPage() {
  const t = useTranslations('Help');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(t('faqCategory1'));
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const categories: FaqCategory[] = [
    {
      title: t('faqCategory1'),
      icon: BookOpen,
      items: [
        {
          id: 'ws-1',
          question: t('faqQ1'),
          answer: t('faqA1'),
        },
        {
          id: 'ws-2',
          question: t('faqQ2'),
          answer: t('faqA2'),
        },
      ],
    },
    {
      title: t('faqCategory2'),
      icon: Sparkles,
      items: [
        {
          id: 'ai-1',
          question: t('faqQ3'),
          answer: t('faqA3'),
        },
        {
          id: 'ai-2',
          question: t('faqQ4'),
          answer: t('faqA4'),
        },
      ],
    },
    {
      title: t('faqCategory3'),
      icon: MessageSquare,
      items: [
        {
          id: 'ch-1',
          question: t('faqQ5'),
          answer: t('faqA5'),
        },
        {
          id: 'ch-2',
          question: t('faqQ6'),
          answer: t('faqA6'),
        },
      ],
    },
    {
      title: t('faqCategory4'),
      icon: CreditCard,
      items: [
        {
          id: 'bl-1',
          question: t('faqQ7'),
          answer: t('faqA7'),
        },
      ],
    },
  ];

  const handleToggle = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  // Determine what to display: if there is search query, show matched items from all categories; otherwise show items for the active category.
  const displayItems = searchQuery.trim()
    ? categories.flatMap(cat => cat.items).filter(
        item =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories.find(cat => cat.title === activeCategory)?.items || [];

  return (
    <div className="w-full p-8 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in relative flex-1 overflow-y-auto">
      
      {/* Radial glowing spotlight blob matching design guidelines */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(74,229,74,0.05)_0%,transparent_70%)] pointer-events-none select-none z-0" />

      <div className="grid grid-cols-4 gap-10 relative z-10">
        
        {/* Left Column: Categories List */}
        <div className="col-span-1 space-y-6 text-left">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('faqTopics')}</span>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              {t('faqDescription')}
            </p>
          </div>

          <nav className="flex flex-col gap-1">
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const isSelected = activeCategory === cat.title && !searchQuery.trim();

              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.title);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold tracking-tight transition-all flex items-center gap-2.5 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-zinc-950 text-white font-extrabold shadow-3xs'
                      : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-black'
                  }`}
                >
                  <CatIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-450'}`} />
                  <span className="truncate">{cat.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Column: Search & Accordion Items */}
        <div className="col-span-3 space-y-6">
          
          {/* Search Bar Input */}
          <div className="relative w-full text-left">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('faqSearchPlaceholder')}
              className="w-full h-10 pl-9 pr-4 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder:text-zinc-400"
            />
          </div>

          {/* Accordion Questions List */}
          {displayItems.length === 0 ? (
            <div className="text-center py-20 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center p-6 select-none animate-row-fade">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <HelpCircle className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('faqNoGuides')}</h3>
              <p className="text-xs text-zinc-500 max-w-xs">{t('faqNoGuidesDesc')}</p>
            </div>
          ) : (
            <div className="border-t border-[#E8E8E6] divide-y divide-[#E8E8E6] select-none animate-row-fade">
              {displayItems.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="relative py-4 pl-6 pr-4 transition-all hover:bg-[#FAFAFA]/20">
                    
                    {/* Glowing Accent active sidebar strip indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-[#4AE54A] rounded-r transition-all duration-200 ${
                      isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'
                    }`} />

                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className="w-full flex items-center justify-between text-left hover:text-black transition-colors cursor-pointer select-none"
                    >
                      <span className={`text-xs font-bold ${isOpen ? 'text-zinc-950 font-black' : 'text-zinc-800'}`}>
                        {item.question}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-250 shrink-0 ml-4 ${
                        isOpen ? 'rotate-180 text-black' : ''
                      }`} />
                    </button>

                    <div className={`transition-all overflow-hidden duration-300 ${
                      isOpen ? 'max-h-[300px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed pr-8 select-text">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
