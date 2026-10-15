'use client';

import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import zxcvbn from 'zxcvbn';

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Route parameters
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  // Inputs
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength calculation
  const strengthScore = useMemo(() => {
    if (!password) return -1;
    return zxcvbn(password).score;
  }, [password]);

  const strengthDetails = useMemo(() => {
    const labels = [
      t('passwordStrengthVeryWeak'),
      t('passwordStrengthWeak'),
      t('passwordStrengthFair'),
      t('passwordStrengthStrong'),
      t('passwordStrengthVeryStrong'),
    ];
    const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
    if (strengthScore === -1) return { label: t('passwordStrengthNone'), color: 'bg-muted' };
    return {
      label: labels[strengthScore],
      color: colors[strengthScore],
    };
  }, [strengthScore, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setErrorMsg('');
    setSuccessMsg('');

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            token,
            email,
            password,
            password_confirmation: confirmPassword,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success(t('passwordUpdated'), {
            description: data.message || t('passwordUpdatedDesc'),
          });
          setSuccessMsg(data.message || t('passwordUpdatedSuccessText'));
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setErrorMsg(data.message || t('resetPasswordFailed'));
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
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('resetPasswordHeading')}</h2>
        <p className="text-xs text-fg-secondary leading-relaxed">
          {t('resetPasswordSubheading')}
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
        {/* Password Field */}
        <div className="space-y-1.5 font-sans">
          <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
            {t('newPasswordLabel')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strengthScore ? strengthDetails.color : 'bg-bg-badge'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-fg-secondary">
                {t('passwordStrength')}:{' '}
                <span className="font-semibold text-foreground">{strengthDetails.label}</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 font-sans">
          <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
            {t('confirmPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isPending || !token || !email}
          className="w-full h-10 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer mt-2"
        >
          {isPending ? t('resetting') : t('saveNewPasswordBtn')}
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
