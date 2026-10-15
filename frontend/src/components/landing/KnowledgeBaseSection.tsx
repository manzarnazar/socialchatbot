'use client';

import { motion } from 'framer-motion';
import { 
  Cpu,
  RefreshCw,
  Layers
} from 'lucide-react';

interface KnowledgeBaseSectionProps {
  brandName?: string;
}

export function KnowledgeBaseSection({ brandName = 'WhatsOmni' }: KnowledgeBaseSectionProps) {
  const cards = [
    {
      icon: Cpu,
      title: 'Zero Guesswork',
      desc: 'Your AI agent only answers using verified business context, preventing hallucinated replies.'
    },
    {
      icon: RefreshCw,
      title: 'Real-Time Syncing',
      desc: 'Connect live documents or spreadsheets and watch updates sync to your vector store immediately.'
    },
    {
      icon: Layers,
      title: 'Hybrid Knowledge',
      desc: 'Combine FAQs, company policies, and product catalogs into a unified knowledge repository.'
    }
  ];

  return (
    <section id="knowledge-base" className="relative bg-white py-20 sm:py-24 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous, Soft Neon Green Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.14) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 text-center">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-5 mb-16 max-w-2xl mx-auto"
        >
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Your AI Only Says What's True
          </h2>

          {/* Subheading Description */}
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed font-normal">
            Upload your FAQs, product docs, or connect a live spreadsheet — {brandName} turns them into answers your AI agent can actually use, instead of making things up.
          </p>
        </motion.div>

        {/* Clean, Box-free 3-Column Text Grid (No Windows, Cards, or File/Document lists) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                className="space-y-3 p-4 hover:translate-y-[-2px] transition-transform duration-300"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center text-[#0A0A0A] shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A0A0A] tracking-tight">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#4B4B4B] leading-relaxed font-normal">
                  {card.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
