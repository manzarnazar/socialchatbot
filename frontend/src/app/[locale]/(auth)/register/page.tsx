'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, Building, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import zxcvbn from 'zxcvbn';

export default function RegisterPage() {
  const t = useTranslations('Auth');
  const router = useRouter();

  // Inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setFieldErrors({});
    setErrorMsg('');
    let isRedirecting = false;

    try {
      const res = await fetchWithCsrf('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          company_name: companyName,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        isRedirecting = true;
        setRedirecting(true);
        toast.success(t('registerHeading'), {
          description: data.message || t('workspaceCreated'),
        });
        // Success redirect
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        if (res.status === 422 && data.errors) {
          setFieldErrors(data.errors);
        } else {
          setErrorMsg(data.error || t('registrationFailed'));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('networkErrorRegistration');
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
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('registerHeading')}</h2>
        <p className="text-xs text-fg-secondary leading-relaxed">
          {t('registerSubheading')}
        </p>
      </div>

      {/* Error Banners */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
              {t('firstName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
                className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
              />
            </div>
            {fieldErrors.first_name && (
              <p className="text-[10px] text-red-650 font-medium">{fieldErrors.first_name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
              {t('lastName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastNamePlaceholder')}
                className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
              />
            </div>
            {fieldErrors.last_name && (
              <p className="text-[10px] text-red-650 font-medium">{fieldErrors.last_name[0]}</p>
            )}
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-1.5 font-sans">
          <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
            {t('companyName')}
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t('companyNamePlaceholder')}
              className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
            />
          </div>
          {fieldErrors.company_name && (
            <p className="text-[10px] text-red-650 font-medium">{fieldErrors.company_name[0]}</p>
          )}
        </div>

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
              className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-border rounded-lg focus:outline-none focus:border-foreground transition-card"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[10px] text-red-650 font-medium">{fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password Fields */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wider block">
            {t('password')}
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
          {fieldErrors.password && (
            <p className="text-[10px] text-red-650 font-medium">{fieldErrors.password[0]}</p>
          )}

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
        <div className="space-y-1.5">
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
          disabled={loading}
          className="w-full h-10 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer mt-2"
        >
          {loading ? t('registering') : t('register')}
        </Button>
      </form>

      {/* Redirect Login */}
      <div className="text-center text-xs text-fg-secondary">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline transition-button">
          {t('login')}
        </Link>
      </div>
    </div>
  );
}
