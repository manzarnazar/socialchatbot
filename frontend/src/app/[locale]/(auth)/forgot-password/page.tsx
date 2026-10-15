'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth');

  // Inputs
  const [email, setEmail] = useState('');

  // UI States
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setErrorMsg('');
    setSuccessMsg('');

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success(t('recoveryLinkSent'), {
            description: data.message || t('checkInboxRecoveryLink'),
          });
          setSuccessMsg(data.message || t('verificationLinkSentText'));
        } else {
          setErrorMsg(data.message || t('resetLinkRequestFailed'));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('networkErrorOccurred');
        setErrorMsg(msg);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('forgotPasswordHeading')}</h2>
        <p className="text-xs text-fg-secondary leading-relaxed">
          {t('forgotPasswordSubheading')}
        </p>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-green-bg text-emerald-800 border border-accent-green/20 text-xs">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
            {t('email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-border rounded-lg placeholder:text-fg-muted focus:outline-none focus:border-foreground transition-card"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-10 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer mt-2"
        >
          {isPending ? t('sending') : t('sendResetLink')}
        </Button>
      </form>

      {/* Redirect Login */}
      <div className="text-center text-xs text-fg-secondary">
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline transition-button">
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
