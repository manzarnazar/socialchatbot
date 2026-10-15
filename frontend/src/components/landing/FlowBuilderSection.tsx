'use client';

import { motion } from 'framer-motion';
import { 
  Play, 
  Tag, 
  MessageSquare, 
  UserCheck, 
  Briefcase,
  Lock,
  Sparkles
} from 'lucide-react';

interface FlowBuilderSectionProps {
  brandName?: string;
}

export function FlowBuilderSection({ brandName = 'WhatsOmni' }: FlowBuilderSectionProps) {
  return (
    <section id="flow-builder" className="relative bg-white py-20 sm:py-28 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous Glow Touch */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-4 mb-16 max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Automate the Repetitive Stuff
          </h2>
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed">
            Build intelligent multi-step conversational journeys visually. Qualify leads, branch on conditions, and sync data seamlessly.
          </p>
        </motion.div>

        {/* Professional Flow Builder Canvas (Exact Tenant Platform Node & Port Architecture) */}
        <div className="relative max-w-[1040px] mx-auto overflow-x-auto lg:overflow-visible pb-8">
          <div className="relative w-[1000px] h-[375px] mx-auto hidden lg:block select-none">
            
            {/* SVG Connector Rails */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" 
              viewBox="0 0 1000 375"
              fill="none"
            >
              {/* Wire 1: Inbound Message -> AI Binary Decision */}
              <path
                d="M 220 92 L 260 92"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Wire 2: AI YES -> Tag Contact */}
              <path
                d="M 480 141 C 500 141, 500 82, 520 82"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Wire 3: Tag Contact -> Send Message */}
              <path
                d="M 740 82 C 760 82, 760 86, 780 86"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Wire 4: AI NO -> Human Handoff (Curved Drop) */}
              <path
                d="M 480 175 C 500 175, 500 275, 520 275"
                stroke="#F43F5E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 3"
              />

              {/* Wire 5: Tag Contact -> Create Deal (Curved Drop) */}
              <path
                d="M 740 82 C 760 82, 760 274, 780 274"
                stroke="#F97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 3"
              />
            </svg>

            {/* NODE 1: Inbound Message (Exact Tenant Platform Trigger Node) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="absolute left-0 top-[30px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block with Category Styling */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-[#E8FDE8]/50">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-emerald-50 border border-emerald-250 text-emerald-700">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    Inbound Message
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #trigger_1
                  </p>
                </div>
                <div className="shrink-0 flex items-center justify-center text-zinc-400">
                  <Lock className="h-3 w-3" />
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase">
                    <span>Any Message</span>
                    <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">
                      Root
                    </span>
                  </div>
                  <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
                    <span className="text-[9.5px] font-bold text-zinc-800">
                      Starts on any incoming customer message
                    </span>
                  </div>
                </div>
              </div>

              {/* Single Output Handle */}
              <div 
                className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

            {/* NODE 2: AI Binary Decision (Exact Tenant Platform AI Condition Node with Multi-ports) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="absolute left-[260px] top-[15px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-purple-50/40">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-purple-50 border border-purple-200 text-purple-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    AI Binary Decision
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #ai_condition_1
                  </p>
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <div className="bg-purple-50 border border-purple-100 text-purple-800 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[72px] overflow-y-auto">
                    Does customer inquire about pricing, plans or demos?
                  </div>
                </div>
              </div>

              {/* Multi-Port Output Rows */}
              <div className="border-t border-[#E8E8E6] bg-[#FAFAFA]/30 rounded-b-xl divide-y divide-[#E8E8E6] select-none">
                <div className="relative flex items-center justify-between px-3.5 py-2 hover:bg-zinc-50/50 transition-colors select-none">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-700 font-bold font-sans">
                      Yes
                    </span>
                  </div>
                  <div 
                    className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
                  />
                </div>
                <div className="relative flex items-center justify-between px-3.5 py-2 hover:bg-zinc-50/50 transition-colors select-none rounded-b-xl">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-700 font-bold font-sans">
                      No
                    </span>
                  </div>
                  <div 
                    className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
                  />
                </div>
              </div>

              {/* Input Handle */}
              <div 
                className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

            {/* NODE 3: Tag Contact (Exact Tenant Platform Tag Contact Node) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute left-[520px] top-[20px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-indigo-50/40">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    Tag Contact
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #tag_contact_1
                  </p>
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1 text-[8.5px]">
                    <span className="text-zinc-400 font-bold uppercase text-[7.5px]">Action:</span>
                    <span className="font-black uppercase tracking-tight text-[7.5px] px-1 rounded-[3px] bg-[#E8FDE8] text-emerald-700 border border-emerald-200">
                      Add Tag
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-1.5 shadow-3xs">
                    <Tag className="h-3 w-3 text-teal-500" />
                    <span className="text-[10px] font-bold text-zinc-850 truncate flex-1">
                      warm_lead
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Handle */}
              <div 
                className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
              {/* Output Handle */}
              <div 
                className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

            {/* NODE 4: Send Message (Exact Tenant Platform Message Node) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="absolute left-[780px] top-[20px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-blue-50/40">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    Send Message
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #send_message_1
                  </p>
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <div className="bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-800 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[72px] overflow-y-auto">
                    "Hi <span className="font-bold text-blue-600 select-none">Contact First Name</span>! Our plans start from $29/mo with full AI automation. Here is your checkout link."
                  </div>
                </div>
              </div>

              {/* Input Handle */}
              <div 
                className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

            {/* NODE 5: Human Handoff (Exact Tenant Platform Handoff Node) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="absolute left-[520px] top-[220px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-rose-50/40">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-rose-50 border border-rose-200 text-rose-700">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    Human Handoff
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #human_handoff_1
                  </p>
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between shadow-3xs">
                  <div>
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Queue Routing</p>
                    <p className="text-[10px] font-bold text-rose-700 mt-0.5">Live Agent Priority Queue</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-rose-500 shrink-0" />
                </div>
              </div>

              {/* Input Handle */}
              <div 
                className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

            {/* NODE 6: Create Deal (Exact Tenant Platform Create Deal Node) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="absolute left-[780px] top-[220px] w-[220px] rounded-xl border border-[#E8E8E6] bg-white shadow-3xs hover:border-zinc-400 hover:shadow-2xs transition-all duration-200 font-sans text-left z-20"
            >
              {/* Header Block */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl bg-orange-50/40">
                <div className="p-1.5 rounded-[6px] shrink-0 flex items-center justify-center bg-orange-50 border border-orange-200 text-orange-700">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
                    Create Deal
                  </p>
                  <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal">
                    #create_deal_1
                  </p>
                </div>
              </div>

              {/* Node Details Preview */}
              <div className="px-3.5 py-3 select-none">
                <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between shadow-3xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">CRM Deal Value</p>
                    <p className="text-xs font-black text-orange-600 truncate mt-0.5">$348.00</p>
                  </div>
                  <Briefcase className="h-4 w-4 text-orange-500 shrink-0" />
                </div>
              </div>

              {/* Input Handle */}
              <div 
                className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#4AE54A] border-2 border-white shadow-[0_0_0_0.5px_#C8C8C6] z-30" 
              />
            </motion.div>

          </div>

          {/* Mobile Fallback Stack (Responsive Exact Platform Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden text-left">
            
            {/* Inbound Message */}
            <div className="rounded-xl border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] bg-[#E8FDE8]/50">
                <div className="p-1.5 rounded-[6px] bg-emerald-50 border border-emerald-250 text-emerald-700">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">Inbound Message</p>
                  <p className="text-[8.5px] font-mono text-zinc-400">#trigger_1</p>
                </div>
              </div>
              <div className="p-3.5">
                <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded p-2 text-[9.5px] font-bold text-zinc-800">
                  Starts on any incoming customer message
                </div>
              </div>
            </div>

            {/* AI Binary Decision */}
            <div className="rounded-xl border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] bg-purple-50/40">
                <div className="p-1.5 rounded-[6px] bg-purple-50 border border-purple-200 text-purple-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">AI Binary Decision</p>
                  <p className="text-[8.5px] font-mono text-zinc-400">#ai_condition_1</p>
                </div>
              </div>
              <div className="p-3.5">
                <div className="bg-purple-50 border border-purple-100 text-purple-800 rounded p-2 text-[9.5px] font-medium">
                  Does customer inquire about pricing, plans or demos?
                </div>
              </div>
            </div>

            {/* Tag Contact */}
            <div className="rounded-xl border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] bg-indigo-50/40">
                <div className="p-1.5 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">Tag Contact</p>
                  <p className="text-[8.5px] font-mono text-zinc-400">#tag_contact_1</p>
                </div>
              </div>
              <div className="p-3.5">
                <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded p-2 text-[9.5px] font-bold text-zinc-800 flex items-center justify-between">
                  <span>warm_lead</span>
                  <span className="text-[7.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">CRM</span>
                </div>
              </div>
            </div>

            {/* Send Message */}
            <div className="rounded-xl border border-[#E8E8E6] bg-white shadow-3xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] bg-blue-50/40">
                <div className="p-1.5 rounded-[6px] bg-blue-50 border border-blue-200 text-blue-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">Send Message</p>
                  <p className="text-[8.5px] font-mono text-zinc-400">#send_message_1</p>
                </div>
              </div>
              <div className="p-3.5">
                <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded p-2 text-[9.5px] text-zinc-800">
                  "Hi Contact First Name! Our plans start from $29/mo..."
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
