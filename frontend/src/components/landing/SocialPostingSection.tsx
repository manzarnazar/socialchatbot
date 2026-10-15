'use client';

import { motion } from 'framer-motion';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Film
} from 'lucide-react';

interface SocialPostingSectionProps {
  brandName?: string;
}

export function SocialPostingSection({ brandName = 'WhatsOmni' }: SocialPostingSectionProps) {
  const cards = [
    {
      icon: FileText,
      title: 'Text Posts',
      desc: 'Share thought-leadership articles, status updates, and announcement commentary across LinkedIn and Facebook.',
    },
    {
      icon: ImageIcon,
      title: 'Image Posts',
      desc: 'Publish single-photo highlights and multi-image carousel slides natively to Instagram, Facebook, and LinkedIn.',
    },
    {
      icon: Video,
      title: 'Video Posts',
      desc: 'Broadcast widescreen and square product walkthroughs, webinars, and customer story videos seamlessly.',
    },
    {
      icon: Film,
      title: 'Short Videos & Reels',
      desc: 'Auto-publish vertical 9:16 reels and viral clips directly to Instagram Reels and TikTok with sound and hashtag sync.',
    }
  ];

  return (
    <section id="social-posting" className="relative bg-white pt-20 sm:pt-24 pb-8 sm:pb-10 overflow-hidden">
      
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

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 text-center">
        
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
            Create with AI, Schedule & <br />
            <span className="relative inline-block text-[#4AE54A]">
              Publish Everywhere
              <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#4AE54A] rounded-full shadow-[0_0_8px_rgba(74,229,74,0.6)]" />
            </span>
          </h2>

          {/* Subheading Description */}
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed font-normal">
            Generate high-converting content with AI and cross-publish or schedule seamlessly across Instagram, Facebook, TikTok, and LinkedIn in one single workspace.
          </p>
        </motion.div>

        {/* Clean, Box-free 4-Column Text Grid (Matching KnowledgeBaseSection exact design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
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
