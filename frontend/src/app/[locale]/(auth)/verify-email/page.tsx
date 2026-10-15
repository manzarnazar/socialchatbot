'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  // Cooldown states
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  // Mask the email address for security
  const maskedEmail = () => {
    if (!email) return t('yourInbox');
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***${local[local.length - 1]}@${domain}`;
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = () => {
    setErrorMsg('');
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/email/verification-notification', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (res.ok) {
          toast.success(t('verificationResent'), {
            description: data.message || t('checkInboxNewLink'),
          });
          setCooldown(60); // 60-second throttle cooldown
        } else {
          setErrorMsg(data.message || t('failedToDispatchEmail'));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('networkErrorOccurred');
        setErrorMsg(msg);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-accent-green-bg flex items-center justify-center text-accent-green">
        <Mail className="h-6 w-6 text-emerald-800" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('verifyEmailHeading')}</h2>
        <p className="text-xs text-fg-secondary leading-relaxed max-w-sm mx-auto font-sans">
          {t.rich('verifyEmailBodyText', {
            email: maskedEmail(),
            emailStyle: (chunks) => <span className="font-semibold text-foreground break-all">{chunks}</span>
          })}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs text-left">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <Button
          onClick={handleResend}
          disabled={isPending || cooldown > 0 || !email}
          variant="outline"
          className="w-full h-10 border-border hover:bg-bg-root rounded-lg text-xs font-semibold gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          {cooldown > 0 
            ? t('cooldown', { seconds: cooldown }) 
            : isPending 
            ? t('resending') 
            : t('resendVerification')
          }
        </Button>

        <div className="text-xs text-fg-secondary">
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline transition-button">
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
