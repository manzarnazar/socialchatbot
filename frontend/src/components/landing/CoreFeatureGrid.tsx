'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Bot, 
  Brain, 
  Users, 
  Megaphone, 
  Share2,
  Calendar, 
  ShoppingCart, 
  BarChart3,
} from 'lucide-react';

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

interface FeatureItem {
  icon: React.ComponentType<any>;
  title: string;
  desc: string;
}

interface CoreFeatureGridProps {
  brandName?: string;
}

export function CoreFeatureGrid({ brandName = 'WhatsOmni' }: CoreFeatureGridProps) {
  const features: FeatureItem[] = [
    {
      icon: MessageSquare,
      title: 'Unified Shared Inbox',
      desc: 'Route WhatsApp, Instagram, Messenger, Telegram, SMS, and Email into one single collaborative workspace.',
    },
    {
      icon: MetaIcon,
      title: 'Meta Ads',
      desc: 'Capture, attribute, and auto-qualify inbound leads from Facebook & Instagram Ads with zero delay.',
    },
    {
      icon: WhatsAppIcon,
      title: 'WhatsApp Native Flows',
      desc: 'Deploy native in-chat WhatsApp interactive forms, KYC verification, and booking with zero external redirects.',
    },
    {
      icon: WhatsAppIcon,
      title: 'WhatsApp Catalog',
      desc: 'Sync product collections directly into WhatsApp chats, share interactive multi-item carts, and close sales natively.',
    },
    {
      icon: ShoppingCart,
      title: 'Advance E-Commerce & Carts',
      desc: 'Real-time catalog vectorization, product stock queries, and automated abandoned checkout cart recovery.',
    },
    {
      icon: Bot,
      title: 'AI Autonomous Agents',
      desc: 'Deploy custom LLM-powered sales and support agents with tool calling, knowledge retrieval, and handoffs.',
    },
    {
      icon: Brain,
      title: 'Smart Knowledge Base (RAG)',
      desc: 'Grounded AI responses built from website scraping, custom PDFs, docs, and product catalogs.',
    },
    {
      icon: Users,
      title: 'Built-in CRM & Deals',
      desc: 'Manage contact profiles, custom attributes, deal pipelines, and bi-directional HubSpot/Salesforce sync.',
    },
    {
      icon: Megaphone,
      title: 'Omnichannel Campaigns',
      desc: 'Schedule and launch high-throughput targeted broadcasts with anti-ban pacing and delivery receipts.',
    },
    {
      icon: Calendar,
      title: 'Appointment Booking',
      desc: 'Automated calendar scheduling, Google Calendar/Meet sync, Zoom meetings, and staff routing.',
    },
    {
      icon: Share2,
      title: 'Social Media Publishing',
      desc: 'Draft, schedule, and auto-publish content across LinkedIn, TikTok, Facebook, and Instagram.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      desc: 'Track conversation response times, campaign conversion rates, ad attribution, and agent performance.',
    },
  ];

  return (
    <section id="features" className="relative bg-white pt-20 pb-20 sm:pt-28 sm:pb-28 border-t border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern in Light Green Shade */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-70" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous, Soft Neon Green Spotlight Glow (Accent Touch) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.12) 0%, rgba(200,250,200,0.16) 45%, transparent 75%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Everything You Need to Convert Leads
          </h2>
        </motion.div>

        {/* 3-Column Hairline-Separated Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#E8E8E6] bg-white/40 backdrop-blur-xs">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                whileHover={{ scale: 1.015, y: -2, zIndex: 10 }}
                className="border-r border-b border-[#E8E8E6] p-8 sm:p-10 flex flex-col items-start space-y-4 bg-white/50 hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all duration-300 group"
              >
                {/* Icon Container with Neutral Background and Primary Color Icon */}
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E6] flex items-center justify-center text-[#4AE54A] transition-all duration-300 shadow-2xs group-hover:border-[#D0D0CE]">
                  <Icon className="w-5 h-5 text-[#4AE54A] stroke-[1.8]" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#0A0A0A] tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B4B4B] leading-relaxed font-normal">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
