'use client';

import { motion } from 'framer-motion';
import { 
  Zap,
  Bot,
  TrendingUp
} from 'lucide-react';

interface MetaAdsSectionProps {
  brandName?: string;
}

export function MetaAdsSection({ brandName = 'WhatsOmni' }: MetaAdsSectionProps) {
  const cards = [
    {
      icon: Zap,
      title: 'Instant Click-to-Chat',
      desc: 'Bypass leaky landing page forms. Route buyers from Facebook and Instagram ads directly into live WhatsApp & Instagram chats.'
    },
    {
      icon: Bot,
      title: 'Real-Time Qualification',
      desc: 'AI engages every prospect immediately, answers product queries, and qualifies leads before intent cools.'
    },
    {
      icon: TrendingUp,
      title: 'Closed-Loop ROAS',
      desc: 'Sync qualified conversions back to Meta Ads Manager in real time to train your bidding algorithm and maximize ROI.'
    }
  ];

  return (
    <section id="meta-ads" className="relative bg-white pt-8 sm:pt-12 pb-16 sm:pb-20 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous Soft Neon Green & Cyan Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.16) 0%, rgba(0,128,255,0.08) 50%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Showcase: Big Meta Logo & Headline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Big Official Meta Logo Showcase */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 flex flex-col items-center justify-center w-full select-none order-2 lg:order-1"
          >
            <div className="relative flex items-center justify-center w-full max-w-[400px] py-1 sm:py-2">
              {/* Luminous Brand Ambient Halo */}
              <div 
                className="absolute inset-0 rounded-full opacity-35 blur-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(0,100,224,0.25) 0%, rgba(37,211,102,0.12) 50%, transparent 70%)',
                }}
              />
              
              {/* Grand Big Meta Logo */}
              <div className="relative z-10 flex items-center justify-center p-2 transition-transform duration-500 hover:scale-105">
                <img 
                  src="/meta.svg" 
                  alt="Meta" 
                  className="w-48 sm:w-60 md:w-68 lg:w-76 h-auto object-contain drop-shadow-[0_12px_24px_rgba(0,100,224,0.16)]" 
                />
              </div>
            </div>
          </motion.div>

          {/* Right Column: Meta Ads Value Proposition Headline & Description */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 flex flex-col items-start text-left space-y-4 order-1 lg:order-2"
          >
            {/* Professional Headline */}
            <div className="w-full">
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0A0A0A] tracking-tight leading-[1.15]">
                Convert{' '}
                <span className="relative inline-block text-[#0064E0]">
                  Meta Ads
                  <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#0064E0] rounded-full" />
                </span>{' '}
                into <br className="hidden sm:inline" />
                Direct Sales
              </h2>
            </div>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#4B4B4B] leading-relaxed font-normal">
              Skip leaky landing page forms. Route high-intent buyers from Facebook and Instagram ads directly into WhatsApp and Instagram DMs — qualifying leads and closing deals before intent cools.
            </p>
          </motion.div>

        </div>

        {/* Clean 3-Column Features Integrated into Meta Ads Section */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                className="space-y-3 p-2 sm:p-3 hover:translate-y-[-2px] transition-transform duration-300"
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
