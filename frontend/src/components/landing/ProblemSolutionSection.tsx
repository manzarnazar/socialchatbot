'use client';

import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface ProblemSolutionSectionProps {
  brandName?: string;
}

export function ProblemSolutionSection({ brandName = 'WhatsOmni' }: ProblemSolutionSectionProps) {
  const comparisonRows = [
    {
      label: 'Channel Management',
      problem: 'Scattered customer inquiries across WhatsApp, Instagram, Telegram, and Email.',
      solution: 'All channels consolidated into a single unified workspace with live sync.',
    },
    {
      label: 'Lead Responding',
      problem: 'Leads sit unanswered overnight and go cold long before your team is online.',
      solution: 'Autonomous AI agents respond in seconds, qualify leads, and book meetings 24/7.',
    },
    {
      label: 'Workflow efficiency',
      problem: 'Agents waste hours copy-pasting customer data between chats and spreadsheets.',
      solution: 'Bi-directional contact details and conversation summaries synced to your CRM.',
    },
    {
      label: 'Agent Intelligence',
      problem: 'Rigid, static chatbots that fail to understand context or answer real questions.',
      solution: 'AI agents instantly grounded in your specific documents, FAQs, and files.',
    },
  ];

  return (
    <section id="problem-solution" className="relative bg-white pt-10 pb-14 sm:pt-12 sm:pb-16 border-t border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Premium Dot Grid Backdrop Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40" 
        style={{
          backgroundImage: 'radial-gradient(#E8E8E6 1.2px, transparent 1.2px)',
          backgroundSize: '32px 32px'
        }} 
      />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Title without comparison table chip */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            From Inbox Chaos to Automated Revenue
          </h2>
        </motion.div>

        {/* Elegant Comparison Table (No Emojis, No Outer Container Card Background fill) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch border border-[#E8E8E6] rounded-2xl overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          
          {/* Column 1: The Old Way */}
          <div className="lg:col-span-6 p-6 sm:p-8 bg-white relative flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 pb-4 border-b border-[#E8E8E6] mb-6">
              <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                <X className="w-3 h-3 text-rose-500" />
              </div>
              <span className="text-xs font-black text-[#0A0A0A] uppercase tracking-wider">
                The Old Way
              </span>
            </div>

            {/* Rows */}
            <div className="space-y-6">
              {comparisonRows.map((row, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[9px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
                    {row.label}
                  </span>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed font-normal">
                    {row.problem}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: With WhatsOmni (Highlighted & Beautifully Bordered, No Emojis) */}
          <div className="lg:col-span-6 p-6 sm:p-8 bg-white border-t lg:border-t-0 lg:border-l-2 border-[#4AE54A] relative shadow-[0_8px_32px_rgba(74,229,74,0.06)] z-10 flex flex-col">
            
            {/* Floating Highlight Tag */}
            <div className="absolute top-4 right-6 bg-[#E8FDE8] text-[#0A0A0A] font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#4AE54A]/30">
              AI-POWERED
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 pb-4 border-b border-[#4AE54A]/20 mb-6">
              <div className="w-5 h-5 rounded-full bg-[#E8FDE8] border border-[#4AE54A]/40 flex items-center justify-center">
                <Check className="w-3 h-3 text-[#0A0A0A]" />
              </div>
              <span className="text-xs font-black text-[#0A0A0A] uppercase tracking-wider">
                With {brandName}
              </span>
            </div>

            {/* Rows */}
            <div className="space-y-6">
              {comparisonRows.map((row, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[9px] font-bold text-[#0A0A0A] uppercase tracking-wider block">
                    {row.label}
                  </span>
                  <p className="text-xs sm:text-sm text-[#0A0A0A] leading-relaxed font-semibold">
                    {row.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
