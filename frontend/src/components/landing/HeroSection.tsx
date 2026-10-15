'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { 
  ArrowRight, 
  Sparkles, 
  Bot, 
  ShoppingBag, 
  Zap, 
  MessageSquare, 
  Share2, 
  Workflow,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessagePair {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'telegram';
  customer: {
    name: string;
    avatar: string;
    channelIcon: string;
    channelName: string;
    text: string;
    time: string;
    bubbleClass: string;
    textClass: string;
  };
  aiResponse: {
    name: string;
    avatar: string;
    text: string;
    time: string;
    bubbleClass: string;
    textClass: string;
    checkColorClass: string;
  };
}

function MetaIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M17.225 4.026c-1.968 0-3.506 1.482-4.899 3.365-1.914-2.437-3.514-3.365-5.429-3.365C2.992 4.026 0 9.107 0 14.486c0 3.366 1.628 5.489 4.356 5.489 1.963 0 3.375-.925 5.885-5.313 0 0 1.046-1.848 1.766-3.12.252.407.517.845.797 1.316l1.177 1.98c2.293 3.836 3.57 5.137 5.885 5.137 2.657 0 4.136-2.152 4.136-5.588C24 8.755 20.941 4.026 17.225 4.026zm-8.899 9.448c-2.035 3.19-2.739 3.905-3.872 3.905-1.166 0-1.859-1.024-1.859-2.849 0-3.905 1.947-7.897 4.268-7.897 1.257 0 2.307.726 3.916 3.029C9.252 12.004 8.326 13.474 8.326 13.474zm11.593 3.905c-1.159 0-1.713-.765-3.913-4.306l-1.407-2.347c-.381-.619-.746-1.188-1.098-1.71 1.268-1.957 2.314-2.933 3.559-2.933 2.585 0 4.653 3.806 4.653 8.48 0 .825-.583 1.859-1.794 1.859z" />
    </svg>
  );
}

function WhatsAppIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.36 9.72 14.81 12.16 15.86C12.74 16.11 13.19 16.26 13.55 16.37C14.13 16.56 14.67 16.53 15.09 16.47C15.56 16.4 16.53 15.88 16.73 15.31C16.94 14.74 16.94 14.25 16.88 14.15C16.82 14.05 16.66 13.99 16.42 13.87C16.18 13.75 15 13.17 14.78 13.09C14.56 13.01 14.4 12.97 14.24 13.21C14.08 13.45 13.62 13.99 13.48 14.15C13.34 14.31 13.2 14.33 12.96 14.21C12.72 14.09 11.95 13.84 11.03 13.02C10.31 12.38 9.83 11.59 9.69 11.35C9.55 11.11 9.67 10.98 9.79 10.86C9.9 10.75 10.04 10.57 10.16 10.43C10.28 10.29 10.32 10.19 10.4 10.03C10.48 9.87 10.44 9.73 10.38 9.61C10.32 9.49 9.86 8.35 9.67 7.89C9.48 7.44 9.29 7.5 9.15 7.49C9.02 7.49 8.86 7.48 8.7 7.48C8.54 7.48 8.53 7.33 8.53 7.33Z" />
    </svg>
  );
}

const messagePairs: MessagePair[] = [
  {
    id: 'pair-1',
    channel: 'instagram',
    customer: {
      name: 'Sophia Chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      channelIcon: '/channels/instagram.svg',
      channelName: 'Instagram DM',
      text: 'Hey! Is the 4-bedroom luxury villa in Grand Oaks available for a private walkthrough?',
      time: '02:20 PM',
      bubbleClass: 'bg-[#18181B] border border-white/10 text-white rounded-2xl rounded-tl-xs shadow-lg backdrop-blur-md',
      textClass: 'text-white',
    },
    aiResponse: {
      name: 'Grand Oaks AI Agent',
      avatar: '',
      text: 'Walkthrough reserved for 5:00 PM today! Senior Agent Mark assigned & digital brochure dispatched.',
      time: '02:20 PM',
      bubbleClass: 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#3B82F6] rounded-2xl rounded-tr-xs shadow-md',
      textClass: 'text-white',
      checkColorClass: 'text-white/90',
    },
  },
  {
    id: 'pair-2',
    channel: 'whatsapp',
    customer: {
      name: 'David Miller',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      channelIcon: '/channels/whatsapp.webp',
      channelName: 'WhatsApp',
      text: 'Hi! I need to book a cardiology consultation with Dr. Elena for tomorrow morning.',
      time: '09:14 AM',
      bubbleClass: 'bg-[#18181B] border border-white/10 text-white rounded-2xl rounded-tl-xs shadow-lg backdrop-blur-md',
      textClass: 'text-white',
    },
    aiResponse: {
      name: 'Apex Health AI',
      avatar: '',
      text: 'Appointment confirmed for 11:00 AM tomorrow with Dr. Elena! Confirmation SMS & map link sent.',
      time: '09:14 AM',
      bubbleClass: 'bg-[#128C7E] text-white rounded-2xl rounded-tr-xs shadow-lg',
      textClass: 'text-white',
      checkColorClass: 'text-emerald-200',
    },
  },
  {
    id: 'pair-3',
    channel: 'telegram',
    customer: {
      name: 'Alex Riviera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      channelIcon: '/channels/telegram.webp',
      channelName: 'Telegram',
      text: 'Can your AI sync WhatsApp Official Cloud API directly into our HubSpot CRM pipeline?',
      time: '04:05 PM',
      bubbleClass: 'bg-[#18181B] border border-white/10 text-white rounded-2xl rounded-tl-xs shadow-lg backdrop-blur-md',
      textClass: 'text-white',
    },
    aiResponse: {
      name: 'CloudScale AI Agent',
      avatar: '',
      text: 'Yes! Bi-directional HubSpot OAuth sync enabled. Strategy call booked for 4:30 PM tomorrow.',
      time: '04:05 PM',
      bubbleClass: 'bg-[#0088CC] text-white rounded-2xl rounded-tr-xs shadow-lg',
      textClass: 'text-white',
      checkColorClass: 'text-cyan-200',
    },
  },
];

interface HeroSectionProps {
  brandName?: string;
}

export function HeroSection({ brandName = 'WhatsOmni' }: HeroSectionProps) {
  const [activePairIdx, setActivePairIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePairIdx((prev) => (prev + 1) % messagePairs.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentPair = messagePairs[activePairIdx];

  // Platform capabilities to showcase in the animated capability marquee
  const capabilities = [
    { name: 'Meta Ads', icon: MetaIcon },
    { name: 'WhatsApp Catalog', icon: WhatsAppIcon },
    { name: 'Shared Inbox', icon: MessageSquare },
    { name: 'AI ChatBot', icon: Bot },
    { name: 'Advance WhatsApp', icon: WhatsAppIcon },
    { name: 'Automations', icon: Workflow },
    { name: 'E-Commerce', icon: ShoppingBag },
    { name: 'Content Publishing', icon: Share2 },
    { name: 'AI Copilot', icon: Sparkles },
    { name: 'Instant Triggers', icon: Zap },
  ];

  // Tripled for seamless infinite marquee gliding
  const infiniteCapabilities = [...capabilities, ...capabilities, ...capabilities];

  return (
    <section className="relative overflow-hidden bg-[#0A0A0A] text-white pt-24 pb-16 sm:pt-32 sm:pb-20 border-b border-[#1F1F1F]">
      
      {/* 1. Animated Multi-Layer Neon Green Glowing Dark Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        
        {/* Primary Floating Neon Green Mesh Glow Orb (Breathing Animation) */}
        <motion.div
          className="absolute -top-12 left-1/2 w-[700px] sm:w-[1100px] h-[450px] sm:h-[650px] rounded-full"
          animate={{
            scale: [1, 1.15, 0.95, 1],
            x: ['-50%', '-46%', '-54%', '-50%'],
            y: [0, -30, 25, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(74, 229, 74, 0.28) 0%, rgba(16, 185, 129, 0.15) 40%, rgba(10, 10, 10, 0) 72%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Secondary Cyan / Mint Ambient Glow Orb (Reverse Flow) */}
        <motion.div
          className="absolute top-1/4 right-[8%] w-[450px] sm:w-[650px] h-[350px] sm:h-[500px] rounded-full"
          animate={{
            scale: [0.95, 1.18, 1, 0.95],
            x: [0, -40, 30, 0],
            y: [0, 35, -25, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(37, 211, 102, 0.2) 0%, rgba(24, 119, 242, 0.12) 50%, rgba(10, 10, 10, 0) 75%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Tertiary Left Ambient Glow */}
        <motion.div
          className="absolute bottom-1/4 left-[6%] w-[400px] sm:w-[550px] h-[300px] sm:h-[450px] rounded-full"
          animate={{
            scale: [1.1, 0.95, 1.05, 1.1],
            x: [0, 35, -25, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(74, 229, 74, 0.18) 0%, rgba(139, 92, 246, 0.15) 55%, rgba(10, 10, 10, 0) 75%)',
            filter: 'blur(75px)',
          }}
        />

      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* 2-Column Hero Grid: Left Content + Right Interactive Chat Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Subtitle, CTA Buttons */}
          <div className="lg:col-span-6 xl:col-span-6 text-left">
            
            {/* High-Impact Left-Aligned Headline with Staggered Entrance & Signature Neon Underline */}
            <motion.h1 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.12 }
                }
              }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[52px] xl:text-[60px] font-black tracking-tight text-white leading-[1.16]"
            >
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="block"
              >
                Your All-in-One
              </motion.span>

              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="block mt-2 sm:mt-3"
              >
                <span className="relative inline-block whitespace-nowrap">
                  <span className="relative z-10">Omnichannel</span>
                  <motion.svg
                    className="absolute left-0 -bottom-1.5 sm:-bottom-2 w-full h-3 sm:h-4 text-[#4AE54A] -z-10 pointer-events-none drop-shadow-[0_0_10px_rgba(74,229,74,0.7)]"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M0 15 Q 50 2 100 15"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
                    />
                  </motion.svg>
                </span>
              </motion.span>

              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="block mt-2 sm:mt-3"
              >
                Growth Platform
              </motion.span>
            </motion.h1>

            {/* Subtitle Copy */}
            <motion.p 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-7 sm:mt-8 text-sm sm:text-base md:text-lg text-[#A1A1AA] max-w-xl font-normal leading-relaxed"
            >
              Streamline your business with our intuitive, scalable AI platform for{' '}
              <span className="font-semibold text-white">Shared Inbox</span>,{' '}
              <span className="font-semibold text-white">Meta Ads</span>,{' '}
              <span className="font-semibold text-white">Content Publishing</span>,{' '}
              <span className="font-semibold text-white">Automations</span>,{' '}
              <span className="font-semibold text-white">ChatBots</span> &{' '}
              <span className="font-semibold text-white">Advance WhatsApp</span>.
            </motion.p>

            {/* Professional Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-9 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3.5 sm:gap-4"
            >
              <Link href="/register">
                <Button 
                  className="h-10 sm:h-11 px-6 rounded-full bg-[#4AE54A] hover:bg-[#3EDB3E] text-[#0A0A0A] font-semibold text-sm transition-colors border-0 flex items-center gap-2 cursor-pointer shadow-none"
                >
                  <span>Start free trial</span>
                  <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
                </Button>
              </Link>

              <Link href="/login">
                <Button 
                  variant="outline"
                  className="h-10 sm:h-11 px-5 rounded-full bg-white/5 hover:bg-white/10 border-white/15 hover:border-white/30 text-white font-medium text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
                >
                  <span>Explore Platform</span>
                  <span className="text-neutral-400">→</span>
                </Button>
              </Link>
            </motion.div>

            {/* Micro Trust Subtext */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-4 sm:mt-5 text-xs text-[#71717A] font-medium"
            >
              ✦ 14-day free trial · No credit card required · Instant 2-minute setup
            </motion.p>
          </div>

          {/* Right Column: Platform Authentic Multi-Channel Chat Bubbles */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end select-none"
          >
            <div className="w-full max-w-[460px] space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPair.id}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3.5"
                >
                  {/* 1. Customer Incoming Chat Bubble */}
                  <div className="flex items-start gap-2.5 max-w-[90%]">
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={currentPair.customer.avatar}
                        alt={currentPair.customer.name}
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                    </div>

                    <div className={`${currentPair.customer.bubbleClass} p-3.5 text-left`}>
                      <div className="mb-1">
                        <span className={`text-[11px] font-bold ${currentPair.customer.textClass}`}>
                          {currentPair.customer.name}
                        </span>
                      </div>

                      <p className={`text-xs sm:text-sm leading-relaxed font-normal ${currentPair.customer.textClass}`}>
                        "{currentPair.customer.text}"
                      </p>

                      {/* Bottom Row: Channel Logo on Left, Timestamp on Right */}
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={currentPair.customer.channelIcon}
                            alt={currentPair.customer.channelName}
                            className="w-3.5 h-3.5 rounded-full object-contain"
                          />
                          <span className="text-[9px] font-semibold opacity-70 text-white/80">
                            {currentPair.customer.channelName}
                          </span>
                        </div>
                        <span className="text-[9px] opacity-60 font-medium text-white/70">
                          {currentPair.customer.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. AI Outgoing Response Bubble */}
                  <motion.div 
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-2.5 max-w-[90%] ml-auto flex-row-reverse"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#18181B] flex items-center justify-center shrink-0 mt-0.5 border border-white/15 shadow-2xs">
                      <Bot className="w-4 h-4 text-[#4AE54A]" />
                    </div>

                    <div className={`${currentPair.aiResponse.bubbleClass} p-3.5 text-left`}>
                      <div className="mb-1">
                        <span className={`text-[11px] font-bold ${currentPair.aiResponse.textClass}`}>
                          {currentPair.aiResponse.name}
                        </span>
                      </div>

                      <p className={`text-xs sm:text-sm leading-relaxed font-normal ${currentPair.aiResponse.textClass}`}>
                        {currentPair.aiResponse.text}
                      </p>

                      {/* Bottom Row: Timestamp & Double Read Ticks */}
                      <div className="mt-2 flex items-center justify-end gap-1.5 pt-1 border-t border-white/10">
                        <span className={`text-[9px] font-medium opacity-80 ${currentPair.aiResponse.textClass}`}>
                          {currentPair.aiResponse.time}
                        </span>
                        <CheckCheck className={`w-3.5 h-3.5 ${currentPair.aiResponse.checkColorClass}`} />
                      </div>
                    </div>
                  </motion.div>

                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

        </div>

        {/* 4. Professional Animated Capability Marquee (End-to-End, Icon & Text only) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-14 sm:mt-16 lg:mt-18 w-screen relative left-1/2 -translate-x-1/2 overflow-hidden py-3 select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          }}
        >
          <motion.div
            className="flex items-center gap-11 sm:gap-16 w-max"
            animate={{
              x: ['0%', '-33.333%'],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 28,
                ease: 'linear',
              },
            }}
          >
            {infiniteCapabilities.map((item, i) => {
              const IconComp = item.icon;
              return (
                <div
                  key={`${item.name}-${i}`}
                  className="flex items-center gap-2.5 shrink-0 text-sm sm:text-base font-bold text-white opacity-85 hover:opacity-100 transition-opacity cursor-default group"
                >
                  <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4AE54A] group-hover:text-white transition-colors shrink-0" />
                  <span className="tracking-tight whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

      </div>

    </section>
  );
}
