'use client';

import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Bot,
  CheckCheck,
  Sparkles
} from 'lucide-react';

interface AiAgentsSectionProps {
  brandName?: string;
}

export function AiAgentsSection({ brandName = 'WhatsOmni' }: AiAgentsSectionProps) {
  const conversation = [
    { 
      sender: 'customer',
      senderName: 'Patient',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Hi, I have been feeling a sharp chest pain since morning.', 
      time: '10:05 AM' 
    },
    { 
      sender: 'agent',
      senderName: 'Clinic AI Assistant',
      text: 'I understand that can be concerning. Grounded in our clinic directory, I recommend booking an immediate session with our Cardiologist, Dr. Elena.', 
      time: '10:06 AM' 
    },
    { 
      sender: 'customer',
      senderName: 'Patient',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Are there slots open tomorrow?', 
      time: '10:06 AM' 
    },
    { 
      sender: 'agent',
      senderName: 'Clinic AI Assistant',
      text: 'Yes! Dr. Elena has open appointments tomorrow at 11:00 AM and 3:00 PM. Would you like me to reserve the 11:00 AM slot for you?', 
      time: '10:07 AM' 
    }
  ];

  const bullets = [
    'Set up an AI chatbot for any channel — it answers using your own knowledge base, not generic guesses',
    'Automatically hands off to a real person when a conversation needs a human touch',
    'Outbound AI chatbots can reach out first to follow up on leads, remind about bookings, or re-engage',
    'Full transparency — always see exactly what the AI said and why',
  ];

  return (
    <section id="ai-agents" className="relative bg-[#FAFAFA] py-20 sm:py-24 border-b border-[#E8E8E6] overflow-hidden">
      
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Authentic WhatsApp Chat Bubbles */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col gap-4.5 w-full max-w-[500px] mx-auto lg:mx-0 order-2 lg:order-1 select-none"
          >
            {conversation.map((msg, index) => {
              const isCustomer = msg.sender === 'customer';
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.12 }}
                  className={`flex items-start gap-2.5 max-w-[88%] sm:max-w-[84%] ${
                    isCustomer ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  {/* Avatar Circle */}
                  {isCustomer ? (
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={msg.avatar}
                        alt="Customer"
                        className="w-8 h-8 rounded-full object-cover border border-[#E9EDEF] shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center shadow-xs border border-white">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#25D366] border-2 border-white rounded-full" />
                    </div>
                  )}

                  {/* WhatsApp Chat Bubble */}
                  <div className="relative">
                    {/* WhatsApp Chat Notch / Tail */}
                    {isCustomer ? (
                      <svg
                        viewBox="0 0 8 13"
                        className="absolute -left-2 top-0 w-2 h-3.5 text-white fill-current pointer-events-none drop-shadow-[-1px_1px_1px_rgba(0,0,0,0.04)]"
                      >
                        <path d="M1.533 3.568 8 12.193V0H2.812C1.042 0 .474 2.156 1.533 3.568z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 8 13"
                        className="absolute -right-2 top-0 w-2 h-3.5 text-[#D9FDD3] fill-current pointer-events-none drop-shadow-[1px_1px_1px_rgba(0,0,0,0.04)]"
                      >
                        <path d="M5.188 0H0v12.193l6.467-8.625C7.526 2.156 6.958 0 5.188 0z" />
                      </svg>
                    )}

                    {/* Bubble Content */}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl shadow-[0_1px_1px_rgba(11,20,26,0.12)] text-left ${
                        isCustomer
                          ? 'bg-white text-[#111B21] rounded-tl-none border border-black/[0.04]'
                          : 'bg-[#D9FDD3] text-[#111B21] rounded-tr-none border border-[#C5EDB7]/70'
                      }`}
                    >
                      {/* Sender label */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[11px] font-bold leading-tight ${
                            isCustomer ? 'text-[#128C7E]' : 'text-[#008069]'
                          }`}
                        >
                          {msg.senderName}
                        </span>
                        {!isCustomer && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#008069]/10 text-[#008069] text-[9px] font-semibold">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </span>
                        )}
                      </div>

                      {/* Message body */}
                      <p className="text-xs sm:text-[13px] leading-relaxed text-[#111B21] font-normal">
                        {msg.text}
                      </p>

                      {/* Bottom row: timestamp & WhatsApp double blue ticks */}
                      <div className="mt-1 flex items-center justify-end gap-1 select-none">
                        <span className="text-[10px] text-[#667781] font-medium leading-none">
                          {msg.time}
                        </span>
                        {!isCustomer && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] stroke-[2.4]" />
                        )}
                      </div>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </motion.div>

          {/* Right Column: Description & Bullet Points */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 flex flex-col items-start text-left space-y-6 order-1 lg:order-2"
          >
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
              Let AI Handle the First <br />
              (or Every) Reply
            </h2>

            {/* Bullet List */}
            <ul className="space-y-4 pt-2">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E8FDE8] border border-[#4AE54A]/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  </div>
                  <span className="text-xs sm:text-sm text-[#0A0A0A] font-semibold leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
