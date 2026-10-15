'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, ArrowLeft, ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DesktopSafeguardBannerProps {
  title?: string;
  description?: string;
  backUrl?: string;
  backLabel?: string;
  allowBypass?: boolean;
}

export default function DesktopSafeguardBanner({
  title = 'Desktop Recommended for Canvas Editing',
  description = 'This visual node builder requires precise multi-touch and mouse controls. For the best builder experience, please open on a computer screen or switch to desktop mode.',
  backUrl = '/flows',
  backLabel = 'Back to Overview',
  allowBypass = true,
}: DesktopSafeguardBannerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-overlay-fade font-sans">
      <div className="bg-white border border-[#E8E8E6] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-modal-box">
        
        {/* Visual Badge & Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-3xs">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                Display Notice
              </span>
              <h3 className="text-sm font-bold text-zinc-950 mt-0.5 tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          {allowBypass && (
            <button
              onClick={() => setDismissed(true)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Message body */}
        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
          {description}
        </p>

        {/* Feature Highlights on Desktop */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-2 text-[11px] font-semibold text-zinc-700">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Interactive drag-and-drop node graph</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>High-precision connector routing & zoom pan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Multi-pane properties & live telemetry runner</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => router.push(backUrl)}
            className="w-full sm:flex-1 h-9.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </button>
          {allowBypass && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-full sm:w-auto h-9.5 px-4 bg-white border border-[#E8E8E6] hover:bg-zinc-50 text-zinc-700 font-bold text-xs rounded-xl shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
              <span>Continue on Mobile</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
