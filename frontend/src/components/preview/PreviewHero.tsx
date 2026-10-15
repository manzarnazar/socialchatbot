'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { 
  ArrowRight, 
  ShoppingCart,
  Star,
  CheckCircle,
  ShieldCheck,
  Bot,
  MessageSquare,
  Sparkles,
  TrendingUp,
  CircleDot,
  Calendar,
  Link2,
  User,
  Plus,
  Layers,
  ShoppingBag,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/BrandingThemeProvider';

interface Scenario {
  channel: 'whatsapp' | 'instagram' | 'telegram';
  channelLogo: string;
  channelColor: string;
  title: string;
  customerName: string;
  customerAvatar: string;
  customerText: string;
  aiResponse: string;
  actionCard: {
    type: 'booking' | 'support' | 'shopify';
    title: string;
    subText: string;
    syncLabel: string;
    valueLabel?: string;
  };
}

const scenarios: Scenario[] = [
  {
    channel: 'whatsapp',
    channelLogo: '/channels/whatsapp.webp',
    channelColor: '#25D366',
    title: 'WhatsApp Automation (Auto-Booking)',
    customerName: 'Sophia Chen',
    customerAvatar: 'SC',
    customerText: 'Hey! I would love to book a VIP system walkthrough for tomorrow.',
    aiResponse: 'Hi Sophia! I found an open slot for tomorrow at 4:30 PM. I have booked it and generated a Zoom invite for you!',
    actionCard: {
      type: 'booking',
      title: 'Appointment Confirmed',
      subText: 'Tomorrow at 4:30 PM (EST) · Zoom Video Call',
      syncLabel: 'CALENDAR SYNCED',
      valueLabel: 'zoom.us/j/98124890251'
    }
  },
  {
    channel: 'instagram',
    channelLogo: '/channels/instagram.svg',
    channelColor: '#E1306C',
    title: 'Instagram Support (Agent Handover)',
    customerName: 'David Miller',
    customerAvatar: 'DM',
    customerText: 'Hi! My onboarding sequence isn’t loading. Can someone help?',
    aiResponse: 'I understand this is urgent, David. Handing over this conversation to a live Technical Support agent immediately.',
    actionCard: {
      type: 'support',
      title: 'Support Session Active',
      subText: 'Alex Riviera assigned to conversation',
      syncLabel: 'AGENT CONNECTED',
      valueLabel: 'Slack Alert Sent'
    }
  },
  {
    channel: 'telegram',
    channelLogo: '/channels/telegram.webp',
    channelColor: '#0088cc',
    title: 'Telegram Integration (Shopify Sync)',
    customerName: 'Marcus Vance',
    customerAvatar: 'MV',
    customerText: 'Can I get a tracking update on order #4892?',
    aiResponse: 'Fetching Shopify details... Order #4892 has been shipped via DHL Express! Expected delivery is Tuesday.',
    actionCard: {
      type: 'shopify',
      title: 'Shopify Fulfillment Sync',
      subText: 'Order #4892 · Shipped & Synced',
      syncLabel: 'SHOPIFY SYNCED',
      valueLabel: 'Tracking: DHL-98127391'
    }
  }
];

export function PreviewHero() {
  const { brandingName } = useBranding();
  const brand = brandingName || 'WhatsOmni';
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setAnimStep((prev) => {
        if (prev === 2) {
          setScenarioIndex((sIndex) => (sIndex + 1) % scenarios.length);
          return 0;
        }
        return prev + 1;
      });
    }, 3000); // 3 seconds per step (total 9s cycle)

    return () => clearInterval(stepTimer);
  }, []);

  const currentScenario = scenarios[scenarioIndex];

  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-[#E8E8E6]">
      {/* Soft Luminous Neon Green Radial Glow behind elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1000px] sm:w-[1400px] h-[650px] sm:h-[850px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(74,229,74,0.25) 0%, rgba(220,255,220,0.22) 50%, transparent 80%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Sales Badge, Headline, Subheadline & CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-start text-left space-y-6"
          >
            {/* Category Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold text-[#6B6B6B] tracking-wide uppercase">
                PHP Scripts › Laravel › SaaS
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black tracking-tight text-[#0A0A0A] leading-[1.12]">
              The Complete Omnichannel <br />
              SaaS Platform — <br />
              <span className="relative inline-block text-[#0A0A0A]">
                AI Agents, Unified Inbox & CRM
                <svg
                  className="absolute left-0 -bottom-1.5 w-full h-3 text-[var(--accent-green)]/80 -z-10"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 15 Q 50 0 100 15"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed max-w-xl font-normal">
              {brand} is a full multi-tenant SaaS you can install, white-label, and sell — unified inbox, BYOK AI agents, built-in CRM, campaigns, booking, and Stripe billing, all included. No mocked features, no missing pieces.
            </p>

            {/* Supported Channels Strip */}
            <div className="flex flex-wrap items-center gap-4.5 pt-1.5">
              {[
                { name: 'WhatsApp', logo: '/channels/whatsapp.webp' },
                { name: 'Instagram', logo: '/channels/instagram.svg' },
                { name: 'Messenger', logo: '/channels/messenger.webp' },
                { name: 'Telegram', logo: '/channels/telegram.webp' },
                { name: 'SMS', logo: '/channels/sms.svg' },
                { name: 'Email', logo: '/channels/email.svg' },
                { name: 'TikTok', logo: '/channels/tiktok.webp' }
              ].map((c) => (
                <div 
                  key={c.name} 
                  className="relative w-8 h-8 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer group"
                  title={c.name}
                >
                  <Image
                    src={c.logo}
                    alt={c.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain transition-all duration-200"
                  />
                </div>
              ))}
            </div>

            {/* CTA Row */}
            <div className="flex flex-col space-y-3 pt-2 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-3">
                <a href="https://codecanyon.net" target="_blank" rel="noopener noreferrer">
                  <Button 
                    size="sm"
                    className="h-11 px-6 rounded-full bg-[#0A0A0A] hover:bg-[#262626] text-white font-black text-xs sm:text-sm shadow-xs transition-all duration-200 border-0 flex items-center gap-2 cursor-pointer group"
                  >
                    <ShoppingCart className="w-4 h-4 text-white" />
                    <span>Buy Now — $59</span>
                  </Button>
                </a>

                <Link href="/">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 px-5 rounded-full bg-white hover:bg-[#FAFAFA] border-[#E8E8E6] hover:border-[#0A0A0A] text-[#0A0A0A] font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <span>Live Preview</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0A0A0A] transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              {/* Micro-copy Checklist */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-[#6B6B6B] pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4AE54A]" />
                  Full source code included
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4AE54A]" />
                  6 months support
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4AE54A]" />
                  Lifetime free updates
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Platform Authentic Chat Bubbles (No window frame) */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[420px] w-full"
          >
            {/* Luminous Soft Radial Backdrop Glow */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full opacity-35"
                style={{
                  background: 'radial-gradient(circle, rgba(74,229,74,0.18) 0%, transparent 70%)',
                  filter: 'blur(50px)',
                }}
              />
            </div>

            <div className="w-full max-w-[420px] space-y-4 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={scenarioIndex}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* 1. Customer Incoming Chat Bubble */}
                  {animStep >= 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 max-w-[90%]"
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-[#E8E8E6] text-xs font-black text-zinc-600">
                          {currentScenario.customerAvatar}
                        </div>
                      </div>

                      <div className="bg-white border border-[#E8E8E6] rounded-2xl rounded-tl-xs p-3.5 text-left shadow-2xs">
                        <div className="mb-1">
                          <span className="text-[11px] font-bold text-[#111B21]">
                            {currentScenario.customerName}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed font-normal text-[#111B21]">
                          "{currentScenario.customerText}"
                        </p>

                        {/* Bottom Row: Channel Logo on Left, Timestamp on Right */}
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-black/5">
                          <div className="flex items-center gap-1.5">
                            <Image
                              src={currentScenario.channelLogo}
                              alt={currentScenario.channel}
                              width={14}
                              height={14}
                              className="w-3.5 h-3.5 rounded-full object-contain"
                            />
                            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wide">
                              {currentScenario.channel}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-400 font-medium">
                            12:30 PM
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 2. AI Outgoing Response Bubble */}
                  {animStep >= 1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-2.5 max-w-[90%] ml-auto flex-row-reverse"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5 border border-[#E8E8E6] shadow-2xs">
                        <Bot className="w-4 h-4 text-white" />
                      </div>

                      <div className="bg-[#E7FFDB] border border-[#C2EBA2] p-3.5 text-left rounded-2xl rounded-tr-xs shadow-2xs">
                        <div className="mb-1">
                          <span className="text-[11px] font-bold text-[#111B21]">
                            {brand} AI Agent
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed font-normal text-[#111B21]">
                          {currentScenario.aiResponse}
                        </p>

                        {/* Bottom Row: Timestamp & Read Check */}
                        <div className="mt-2 flex items-center justify-end gap-1.5 pt-1 border-t border-black/5">
                          <span className="text-[9px] font-medium text-[#128C7E]/80">
                            12:30 PM
                          </span>
                          <span className="text-[#128C7E] font-bold text-[10px]">✓✓</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3. Action Outcome Card (Shopify Sync Card) */}
                  {animStep >= 2 && currentScenario.actionCard.type === 'shopify' && (
                    <motion.div
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="w-full pt-1"
                    >
                      <div className="bg-white border border-[#E8E8E6] rounded-2xl p-5 shadow-lg text-left max-w-sm mx-auto relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
                        {/* Top header row */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-zinc-50 border border-zinc-150 flex items-center justify-center p-1">
                              <Image
                                src="/shopify.webp"
                                alt="Shopify Logo"
                                width={16}
                                height={16}
                                className="object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              Shopify Integration
                            </span>
                          </div>
                          <span className="text-[9px] font-black bg-[#E8FDE8] border border-[#C2EBA2] text-[#4AE54A] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Synced Live
                          </span>
                        </div>

                        {/* Order info */}
                        <div className="py-3 flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] font-extrabold text-zinc-400 block uppercase tracking-wider">
                              Order Reference
                            </span>
                            <span className="text-sm font-black text-black block mt-0.5">
                              {currentScenario.actionCard.title}
                            </span>
                            <span className="text-[11px] font-bold text-zinc-500 block mt-0.5 leading-relaxed">
                              {currentScenario.actionCard.subText}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-extrabold text-zinc-400 block uppercase tracking-wider">
                              Total Value
                            </span>
                            <span className="text-sm font-black text-black block mt-0.5">
                              $2,400.00
                            </span>
                            <span className="text-[9px] font-extrabold text-emerald-600 block mt-0.5 uppercase tracking-wide">
                              Billed Annually
                            </span>
                          </div>
                        </div>

                        {/* Stepper timeline tracker */}
                        <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">
                            <span>Delivery Status</span>
                            <span className="text-black font-black">Shipped (DHL Express)</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 py-1">
                            {/* Step 1: Ordered */}
                            <div className="flex-1 h-1.5 rounded-full bg-[#4AE54A]" />
                            {/* Step 2: Synced */}
                            <div className="flex-1 h-1.5 rounded-full bg-[#4AE54A]" />
                            {/* Step 3: Shipped */}
                            <div className="flex-1 h-1.5 rounded-full bg-[#4AE54A] relative">
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border border-white animate-ping" />
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border border-white" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-zinc-500">
                            {currentScenario.actionCard.valueLabel && (
                              <span className="text-[9.5px] text-[#6B6B6B] font-semibold font-mono bg-zinc-50 border border-[#E8E8E6] px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                {currentScenario.actionCard.valueLabel}
                              </span>
                            )}
                            <span className="text-emerald-600 font-extrabold text-[9px] uppercase tracking-wide cursor-pointer hover:underline">
                              Track Shipments →
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3. Action Outcome Card (Booking & Support Default Cards) */}
                  {animStep >= 2 && currentScenario.actionCard.type !== 'shopify' && (
                    <motion.div
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="w-full pt-1"
                    >
                      <div className="bg-white border border-[#E8E8E6] rounded-2xl p-4 shadow-md flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E8FDE8] flex items-center justify-center text-[#4AE54A] flex-shrink-0">
                            {currentScenario.actionCard.type === 'booking' && (
                              <Calendar className="w-4.5 h-4.5" />
                            )}
                            {currentScenario.actionCard.type === 'support' && (
                              <Headphones className="w-4.5 h-4.5 text-sky-600" />
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                              Automation Outcome
                            </span>
                            <span className="text-xs sm:text-sm font-black text-black block leading-tight">
                              {currentScenario.actionCard.title}
                            </span>
                            <span className="text-[10.5px] font-bold text-[#6B6B6B] block">
                              {currentScenario.actionCard.subText}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1 flex-shrink-0 ml-4">
                          <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                            currentScenario.actionCard.type === 'booking'
                              ? 'bg-[#E8FDE8] border border-[#C2EBA2] text-[#4AE54A]'
                              : 'bg-sky-50 border border-sky-100 text-sky-600'
                          }`}>
                            {currentScenario.actionCard.syncLabel}
                          </span>
                          {currentScenario.actionCard.valueLabel && (
                            <span className="text-[9.5px] text-[#6B6B6B] font-semibold font-mono bg-zinc-50 border border-[#E8E8E6] px-1.5 py-0.5 rounded truncate max-w-[130px]">
                              {currentScenario.actionCard.valueLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Progress Tracker Slider dots overlay */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {scenarios.map((_, idx) => (
                  <span 
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === scenarioIndex ? 'bg-[#0A0A0A] w-3.5' : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
