'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check } from 'lucide-react';

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if consent has already been saved in localStorage
    const consent = localStorage.getItem('whatsomni_cookie_consent');
    if (!consent) {
      // Delay slightly for smooth page load transition
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('whatsomni_cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('whatsomni_cookie_consent', 'dismissed');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 max-w-md z-[9999] select-none pointer-events-auto"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-[#E8E8E6] rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E8FDE8] border border-[#4AE54A]/30 flex items-center justify-center shrink-0 text-[#0A0A0A] mt-0.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Cookie Notice</h4>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-zinc-400 hover:text-black transition-colors p-1"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  We use essential cookies for secure authentication, CSRF protection, and language preferences. No tracking pixels or advertising cookies are used.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E8E6] flex items-center justify-between gap-2">
              <Link
                href="/privacy"
                className="text-[11px] font-semibold text-zinc-500 hover:text-black underline underline-offset-2 transition-colors"
              >
                Read Privacy Policy
              </Link>

              <button
                type="button"
                onClick={handleAccept}
                className="h-8 px-4 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Got it</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
