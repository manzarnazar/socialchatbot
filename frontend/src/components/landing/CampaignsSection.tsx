'use client';

import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  SlidersHorizontal, 
  Zap,
  CheckCircle2
} from 'lucide-react';

interface CampaignsSectionProps {
  brandName?: string;
}

export function CampaignsSection({ brandName = 'WhatsOmni' }: CampaignsSectionProps) {
  const cards = [
    {
      icon: ShieldCheck,
      title: 'Smart Anti-Ban Engine',
      desc: 'Channel-aware pacing and randomized human jitter keep your sending numbers safe from platform spam detection.',
      features: [
        '4s–8s randomized typing jitter',
        '45s cooldown window every 25 messages',
        'Cloud API, SMS & Telegram rate pacing'
      ]
    },
    {
      icon: SlidersHorizontal,
      title: 'Live In-Flight Controls',
      desc: 'Full real-time command over active campaigns with instant execution response and zero duplicate message guarantees.',
      features: [
        'One-click Pause, Resume & Cancel',
        'Crash-resilient state deduplication',
        'Sub-150ms worker response time'
      ]
    },
    {
      icon: Zap,
      title: 'Non-Blocking Queue Pipeline',
      desc: 'Two-tier asynchronous queue architecture dispatches high-volume blasts without locking threads or slowing live chats.',
      features: [
        'Zero PHP sleep() worker blocking',
        '3-second live delivery telemetry',
        'Automated opt-out & quiet hours filters'
      ]
    }
  ];

  return (
    <section id="campaigns" className="relative bg-white pt-20 sm:pt-24 pb-0 overflow-hidden">
      
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.14) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Constrained Header Container */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-4 mb-14 sm:mb-16 max-w-2xl mx-auto"
        >
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            High-Volume Broadcasts with <br />
            Built-in{' '}
            <span className="relative inline-block text-[#4AE54A]">
              Anti-Ban
              <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#4AE54A] rounded-full shadow-[0_0_8px_rgba(74,229,74,0.6)]" />
            </span>{' '}
            Protection
          </h2>
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed font-normal">
            Launch targeted audience campaigns across WhatsApp, SMS, and Telegram with humanized pacing, real-time lifecycle controls, and non-blocking queues.
          </p>
        </motion.div>
      </div>

      {/* Full-Width End-to-End Horizontal Divider Container */}
      <div className="w-full border-t border-b border-[#E8E8E6] relative z-10 bg-white/40 backdrop-blur-xs">
        <div className="max-w-[1240px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-[#E8E8E6] text-left">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="flex flex-col justify-between space-y-8 p-8 sm:p-10 hover:bg-white/70 transition-colors duration-300 group"
                >
                  <div className="space-y-4">
                    {/* Icon wrapper */}
                    <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center text-[#0A0A0A] group-hover:bg-zinc-100 group-hover:border-zinc-300 transition-all duration-300 shadow-2xs">
                      <Icon className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    
                    {/* Title & Desc */}
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl font-black text-[#0A0A0A] tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-sm text-[#4B4B4B] leading-relaxed font-normal">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  {/* Clean Feature List */}
                  <ul className="space-y-2.5 pt-6 border-t border-[#E8E8E6]">
                    {card.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2.5 text-xs font-semibold text-[#0A0A0A]">
                        <div className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-[#0A0A0A]" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}
