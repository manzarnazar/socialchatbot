'use client';

import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Mail,
  Phone,
  Tag,
  History,
  Check
} from 'lucide-react';

interface CrmPipelineSectionProps {
  brandName?: string;
}

export function CrmPipelineSection({ brandName = 'WhatsOmni' }: CrmPipelineSectionProps) {
  const bullets = [
    'Every contact has a full history — messages, notes, tags, and deals in one place',
    'Drag deals through a pipeline you fully customize to match your team workflow',
    'Duplicate contacts are caught and merged automatically to keep leads clean'
  ];

  const activities = [
    { label: 'Inbound message from WhatsApp', time: '10:05 AM', status: 'completed' },
    { label: 'AI Auto-Tagged as "warm_lead"', time: '10:06 AM', status: 'completed' },
    { label: 'Deal created: $5,400 Value', time: '10:06 AM', status: 'completed' },
    { label: 'Google Calendar demo scheduled', time: 'Tomorrow 3:00 PM', status: 'pending' }
  ];

  return (
    <section id="crm-pipeline" className="relative bg-white py-14 sm:py-16 overflow-hidden">
      
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: CRM Customer Profile & Activity History Cards (7 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-stretch justify-start w-full text-sans text-left"
          >
            {/* Widget Container Card with End-to-End Connected Dividers */}
            <div className="w-full bg-white rounded-2xl border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
              
              {/* Left Column: Customer Profile Details */}
              <div className="flex flex-col justify-between divide-y divide-zinc-200 select-none">
                
                {/* Header: Full Bleed End-to-End */}
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-black text-xs shadow-xs">
                      MB
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-black leading-tight">Marcus Brody</h4>
                      <span className="text-[10.5px] text-zinc-500 font-medium block">Enterprise Buyer</span>
                    </div>
                  </div>

                  <span className="text-[9.5px] font-black uppercase text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                    Lead Synced
                  </span>
                </div>

                {/* Contact Attributes Body: Full Bleed Container */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-zinc-700">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate font-medium">marcus.brody@example.com</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-zinc-700">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium">+1 (555) 019-2834</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-zinc-700">
                    <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="bg-zinc-100 text-zinc-800 font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-200 font-bold">
                      active_prospect
                    </span>
                  </div>
                </div>

                {/* Deal Value Footer: Full Bleed End-to-End */}
                <div className="px-4 py-3 sm:px-5 flex items-center justify-between text-xs bg-zinc-50/50">
                  <span className="text-zinc-500 font-medium">Deal Value:</span>
                  <span className="font-black text-black text-sm sm:text-base">$5,400</span>
                </div>
              </div>

              {/* Right Column: Interaction History Log */}
              <div className="flex flex-col justify-between divide-y divide-zinc-200 select-none">
                
                {/* Header: Full Bleed End-to-End */}
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black">
                      <History className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-black block leading-tight">Activity History</span>
                      <span className="text-[10.5px] text-zinc-500 font-medium">Live sync stream</span>
                    </div>
                  </div>

                  <span className="text-[9.5px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full">
                    4 Events
                  </span>
                </div>

                {/* Activity Feed: Full Bleed Container with Connected Timeline */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center relative">
                  {/* Connected Vertical Timeline Line */}
                  <div className="absolute left-[24px] sm:left-[28px] top-6 bottom-6 w-px bg-zinc-200 pointer-events-none" />

                  <div className="space-y-3.5 relative z-10">
                    {activities.map((act, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="shrink-0 mt-0.5">
                          {act.status === 'completed' ? (
                            <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-zinc-300 bg-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-black leading-tight truncate">
                            {act.label}
                          </p>
                          <span className="text-[9px] text-zinc-400 block mt-0.5 font-medium">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pipeline Stage Footer: Full Bleed End-to-End */}
                <div className="px-4 py-3 sm:px-5 flex items-center justify-between text-[10.5px] text-zinc-600 font-medium bg-zinc-50/50">
                  <span>Pipeline Stage:</span>
                  <span className="font-black text-black">Qualified Proposal</span>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Right Column: Description & Bullet Points (5 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 flex flex-col items-start text-left space-y-6"
          >
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
              Know Every Customer, <br />
              Not Just Every Message
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
