'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { PlatformLogo } from '@/components/common/PlatformLogo';

function AuthSidebarAnimation() {
  const tAuth = useTranslations('Auth');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto my-auto py-10 flex flex-col items-center justify-center min-h-[300px]">
      <div className="flex flex-col gap-6 w-full relative z-10 select-none animate-fade-in">
        {/* Inbound Customer Message */}
        <div 
          className={`flex items-start gap-3 bg-white/5 border rounded-xl p-3.5 max-w-[85%] transition-all duration-500 ease-out ${
            step >= 0 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 0 ? 'border-accent-green/30 bg-accent-green/5 shadow-[0_0_15px_rgba(74,229,74,0.05)]' : 'border-white/10'}`}
        >
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-white/80" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/55 font-bold uppercase tracking-widest">{tAuth('customerInbound')}</p>
            <p className="text-xs text-white/90 font-medium">&ldquo;{tAuth('customerInboundMessage')}&rdquo;</p>
          </div>
        </div>

        {/* AI Agent Engine Processing */}
        <div 
          className={`self-center flex items-center gap-3 bg-white/5 border rounded-xl px-5 py-3 transition-all duration-500 ease-out ${
            step >= 1 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 1 ? 'border-accent-green bg-foreground ring-4 ring-accent-green/10 shadow-[0_0_25px_rgba(74,229,74,0.2)]' : 'border-white/10'}`}
        >
          <div className={`h-6 w-6 rounded-full bg-accent-green/10 flex items-center justify-center shrink-0 ${step === 1 ? 'animate-pulse' : ''}`}>
            <Sparkles className="h-3.5 w-3.5 text-accent-green" />
          </div>
          <div className="text-left">
            <p className="text-[9px] text-white/55 font-bold uppercase tracking-widest">{tAuth('aiRouterEngine')}</p>
            <p className="text-xs text-white font-bold tracking-tight">
              {step === 1 ? tAuth('thinking') : tAuth('optimalFlowDispatched')}
            </p>
          </div>
        </div>

        {/* Resolved Outbound Dispatch */}
        <div 
          className={`self-end flex items-start gap-3 bg-white/5 border rounded-xl p-3.5 max-w-[85%] transition-all duration-500 ease-out ${
            step >= 2 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 2 ? 'border-accent-green/30 bg-accent-green/5 shadow-[0_0_15px_rgba(74,229,74,0.05)]' : 'border-white/10'}`}
        >
          <div className="h-6 w-6 rounded-full bg-accent-green/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-accent-green font-bold uppercase tracking-widest">{tAuth('automatedReply')}</p>
            <p className="text-xs text-white/90 font-medium">&ldquo;{tAuth('automatedReplyMessage')}&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Common');
  const tAuth = useTranslations('Auth');

  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-sans bg-bg-root">
      {/* Left panel — Brand Spotlight (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col bg-foreground p-12 text-white relative overflow-hidden select-none">
        {/* Neon Green Radial Spotlight Signature */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none mix-blend-screen"
          style={{ 
            background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} 
        />
        
        {/* Top: Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <PlatformLogo 
            className="h-7 w-auto object-contain max-h-7 brightness-0 invert" 
            fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-md"
            showText
            textClassName="text-lg font-black tracking-tight text-white"
          />
        </div>

        {/* Middle: Live Animated Flow Graphic */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <AuthSidebarAnimation />
        </div>

        {/* Bottom: Brand Quote */}
        <div className="relative z-10 max-w-md pt-6 border-t border-white/5 font-sans">
          <blockquote className="space-y-4">
            <p className="text-2xl font-semibold leading-snug text-white/95">
              &ldquo;{tAuth('brandQuote')}&rdquo;
            </p>
            <footer className="text-xs text-white/60 font-medium uppercase tracking-wider">
              {tAuth('brandQuoteAuthor')}
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — Dynamic Auth Forms */}
      <div className="flex items-center justify-center p-6 md:p-8 bg-bg-root relative">
        {/* Subtle decorative glow for mobile screen depth */}
        <div 
          className="lg:hidden absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} 
        />
        
        <div className="w-full max-w-[400px] relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
