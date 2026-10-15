'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

interface FinalCtaSectionProps {
  brandName?: string;
}

export function FinalCtaSection({ brandName = 'WhatsOmni' }: FinalCtaSectionProps) {
  const router = useRouter();

  return (
    <section id="final-cta" className="relative bg-white py-20 sm:py-24 overflow-hidden border-b border-[#E8E8E6]">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous, Soft Neon Green Spotlight Glow behind card */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.18) 0%, rgba(200,250,200,0.2) 45%, transparent 75%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Compact Inner Card Container */}
        <div className="max-w-[840px] mx-auto rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-8 sm:p-10 relative overflow-hidden backdrop-blur-xs shadow-2xl transition-colors duration-300 hover:border-[#4AE54A]/30">
          
          <div className="space-y-6 max-w-2xl mx-auto relative z-10">

            {/* Heading */}
            <motion.h2 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight"
            >
              Ready to Bring Every Conversation <br />
              Into One Place?
            </motion.h2>

            {/* Subtext */}
            <motion.p 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-[11px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed"
            >
              Start free. Upgrade whenever you're ready.
            </motion.p>

            {/* Button CTA Link with pulse ring animation */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="pt-2 flex justify-center"
            >
              <div className="relative group">
                
                {/* Pulsing Backglow Ring */}
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#4AE54A] to-[#10B981] opacity-40 blur group-hover:opacity-85 transition duration-300 group-hover:scale-105" />
                
                <a
                  href="/register"
                  className="relative inline-flex items-center gap-2.5 px-8 py-3.5 bg-white text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:bg-zinc-100 shadow-md block cursor-pointer"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4 stroke-[3.5] group-hover:translate-x-1.5 transition-transform" />
                </a>
              </div>
            </motion.div>
            
            {/* Helper tag below button */}
            <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider mt-3">
              No Credit Card Required • Instant Setup
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}
