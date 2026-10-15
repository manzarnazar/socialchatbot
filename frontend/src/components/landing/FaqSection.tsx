'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection() {
  const faqs: FaqItem[] = [
    {
      question: 'Do I need a credit card to start?',
      answer: 'No — the Free plan activates immediately with no payment details required.'
    },
    {
      question: 'Can I change plans later?',
      answer: 'Yes, upgrade or downgrade anytime from Settings → Billing. Changes are prorated automatically.'
    },
    {
      question: 'Which AI provider do I need?',
      answer: 'Any one of the supported providers (OpenAI, Claude, Gemini, and others) — connect it during setup with your own API key.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, there\'s no lock-in. Cancel from your billing settings whenever you\'d like.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes — all connected credentials and sensitive data are encrypted, and every account action is logged.'
    }
  ];

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative bg-white py-20 sm:py-24 border-b border-[#E8E8E6] overflow-hidden">
      
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[760px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-14 sm:mb-16"
        >
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Questions, Answered
          </h2>
        </motion.div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="border-b border-[#E8E8E6] pb-4"
              >
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between text-left py-3 focus:outline-none group cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-black text-[#0A0A0A] group-hover:text-[#4AE54A] transition-colors duration-200">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180 text-black' : ''
                    }`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs sm:text-sm text-[#4B4B4B] leading-relaxed pt-1.5 pb-2 font-medium">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
