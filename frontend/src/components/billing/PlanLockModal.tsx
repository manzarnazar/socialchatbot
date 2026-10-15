'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/routing';
import { Lock, ArrowRight, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlanLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
  planName?: string;
}

export function PlanLockModal({
  isOpen,
  onClose,
  title,
  description,
  featureName,
  planName
}: PlanLockModalProps) {
  const router = useRouter();
  const t = useTranslations('PlanLock');
  const tCommon = useTranslations('Common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof window === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/billing');
  };

  return createPortal(
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
    >
      <div 
        className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section (Connected End-to-End Divider matching AI Providers) */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-zinc-900" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                {title || t('lockedFeature')}
              </h3>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {featureName ? `${featureName} • ${t('upgradeToUnlock')}` : t('lockedFeatureDesc')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="space-y-4 pt-4 text-xs font-sans">
          {/* Main Info Card */}
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded bg-zinc-200/70 flex items-center justify-center shrink-0 mt-0.5 text-zinc-700">
                <ShieldAlert className="h-3 w-3" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-bold text-zinc-900 block">
                  {featureName || title || t('lockedFeature')}
                </span>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                  {description || (planName 
                    ? t('featureNotAvailableInPlan', { plan: planName }) 
                    : t('upgradeToUnlockDesc'))}
                </p>
              </div>
            </div>
          </div>

          {/* Current Tier Status Bar */}
          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-zinc-500">
            <span>
              {t('currentPlan')}: <strong className="text-zinc-900 font-bold">{planName || t('defaultTierName')}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-650 font-bold text-[10px] uppercase tracking-wider">
              <Sparkles className="h-3 w-3 fill-current" />
              <span>{t('unlockInstantAccess')}</span>
            </span>
          </div>
        </div>

        {/* Footer Action Strip (Nested with off-white bg fill connected end-to-end) */}
        <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
          >
            {tCommon('cancel') || 'Cancel'}
          </button>
          <button 
            type="button"
            onClick={handleUpgrade}
            className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{t('viewPlansAndUpgrade')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
