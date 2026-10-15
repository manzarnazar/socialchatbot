'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const router = useRouter();

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg('');
    setLockoutSeconds(null);
    let isRedirecting = false;

    try {
      const res = await fetchWithCsrf('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      if (res.ok) {
        isRedirecting = true;
        setRedirecting(true);
        toast.success(t('loginHeading'), {
          description: data.message || t('loginSuccess'),
        });

        // Save Bearer token to prevent cross-origin session loss
        if (data.token) {
          localStorage.setItem('whatsomni_token', data.token);
        }

        // Set status cookies immediately so middleware routes correctly
        const tenant = data.user?.tenant;
        const onboardingComplete = (tenant?.onboarding_step === 'complete' || tenant?.onboarding_step === '3') ? '1' : '0';
        const planSelected = tenant?.plan_id ? '1' : '0';
        
        document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `whatsomni_onboarding_completed=${onboardingComplete}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `whatsomni_plan_selected=${planSelected}; path=/; max-age=31536000; SameSite=Lax`;

        // Redirect directly to the correct view
        if (tenant) {
          const isTrialActive = tenant.status === 'trial' && !tenant.is_trial_expired;
          const hasActivePlanOrTrial = Boolean(tenant.plan_id || isTrialActive || tenant.status === 'active');

          if (tenant.onboarding_step !== 'complete' && tenant.onboarding_step !== '3') {
            router.push('/onboarding');
          } else if (!hasActivePlanOrTrial) {
            router.push('/billing/plans');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } else {
        // Handle lockout countdown
        if (res.status === 429 && data.lockout_seconds) {
          setLockoutSeconds(data.lockout_seconds);
        }

        // Handle unverified redirection redirect
        if (res.status === 403 && data.verified === false) {
          isRedirecting = true;
          setRedirecting(true);
          toast.warning(t('accountVerificationPending'), {
            description: data.message,
          });
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }

        setErrorMsg(data.message || t('authFailed'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('networkError');
      setErrorMsg(msg);
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  };

  if (redirecting) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
        <div className="w-10 h-10 border-4 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-black tracking-tight animate-pulse">Redirecting to your workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 font-sans">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('loginHeading')}</h2>
        <p className="text-xs text-fg-secondary leading-relaxed">
          {t('loginSubheading')}
        </p>
      </div>

      {/* Error Banners */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs font-sans">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{t('loginError')}</p>
            <p>{errorMsg}</p>
          </div>
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

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
              {t('password')}
            </label>
            <Link 
              href="/forgot-password" 
              className="text-[11px] font-semibold text-emerald-700 hover:underline transition-button"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-border rounded-lg placeholder:text-fg-muted focus:outline-none focus:border-foreground transition-card"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Keep session checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-0 cursor-pointer"
          />
          <label htmlFor="remember" className="text-xs text-fg-secondary select-none cursor-pointer">
            {t('rememberSession')}
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || lockoutSeconds !== null}
          className="w-full h-10 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          {loading ? t('signingIn') : t('login')}
        </Button>
      </form>

      {/* Redirect Register */}
      <div className="text-center text-xs text-fg-secondary">
        {t('needAccount')}{' '}
        <Link href="/register" className="font-semibold text-emerald-700 hover:underline transition-button">
          {t('register')}
        </Link>
      </div>
    </div>
  );
}
