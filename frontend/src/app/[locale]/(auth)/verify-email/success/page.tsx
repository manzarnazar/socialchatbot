'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, ArrowRight, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';

function VerificationSuccessScreen() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  
  // Invite state
  const isInvite = searchParams.get('invite') === '1';
  const token = searchParams.get('token') || '';
  const [inviteDetails, setInviteDetails] = useState<{ is_admin?: boolean; email: string; company_name: string; role_name: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(isInvite);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isInvite && token) {
      async function loadInvite() {
        try {
          const res = await fetchWithCsrf(`/invitations/verify/${token}`);
          if (res.ok) {
            const data = await res.json();
            setInviteDetails(data);
          } else {
            toast.error(t('invitationExpired'));
          }
        } catch {
          toast.error(t('failedToVerifyInvitation'));
        } finally {
          setInviteLoading(false);
        }
      }
      loadInvite();
      return;
    }

    toast.success(t('emailVerifiedSuccess'), {
      description: t('accountFullyActive'),
    });

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isInvite, token, t]);

  useEffect(() => {
    if (!isInvite && countdown <= 0) {
      router.push('/onboarding');
    }
  }, [countdown, router, isInvite]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithCsrf('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          first_name: firstName,
          last_name: lastName,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.is_admin) {
          toast.success(t('administratorAccountActivated') || 'Administrator Account Activated', {
            description: 'Your administrator credentials have been securely established.',
          });
          if (data.token) {
            localStorage.setItem('saas_admin_token', data.token);
          }
          document.cookie = `whatsomni_admin_logged_in=1; path=/; max-age=31536000; SameSite=Lax`;
          router.push('/superadmin/dashboard');
          return;
        }

        toast.success(t('joinedWorkspace'), {
          description: t('joinedWorkspaceDesc', { companyName: inviteDetails?.company_name || t('theWorkspace') }),
        });

        // Set indicator cookies immediately
        const tenant = data.user?.tenant;
        const onboardingComplete = '1';
        const planSelected = tenant?.plan_id ? '1' : '0';
        document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `whatsomni_onboarding_completed=${onboardingComplete}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `whatsomni_plan_selected=${planSelected}; path=/; max-age=31536000; SameSite=Lax`;

        router.push('/dashboard');
      } else {
        toast.error(data.message || t('acceptInviteFailed'));
      }
    } catch {
      toast.error(t('errorAcceptingInvitation'));
    } finally {
      setSubmitting(false);
    }
  };

  if (inviteLoading) {
    return <SimpleLoader fullScreen={false} message={t('verifyingWorkspaceInvitation')} />;
  }

  // Render Accept Invite form if invite link
  if (isInvite && inviteDetails) {
    return (
      <div className="space-y-6 animate-fade-in font-sans select-none text-left">
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight text-zinc-950 uppercase">
            {inviteDetails.is_admin ? 'Accept Administrator Invitation' : t('acceptWorkspaceInviteHeading')}
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {inviteDetails.is_admin ? (
              <>You have been invited to join the platform administration team as a <strong className="text-zinc-900 uppercase">{inviteDetails.role_name}</strong>. Set your password to activate your administrative privileges.</>
            ) : (
              t.rich('acceptInviteSubheading', {
                companyName: inviteDetails.company_name,
                roleName: inviteDetails.role_name,
                companyStyle: (chunks) => <strong className="text-zinc-900">{chunks}</strong>,
                roleStyle: (chunks) => <strong className="text-zinc-900 uppercase">{chunks}</strong>
              })
            )}
          </p>
        </div>

        <form onSubmit={handleAcceptInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('firstName')}</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
                className="w-full text-xs h-10 px-3 bg-white border border-border rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-zinc-800 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('lastName')}</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastNamePlaceholder')}
                className="w-full text-xs h-10 px-3 bg-white border border-border rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-zinc-800 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('email')}</label>
            <input
              type="email"
              disabled
              value={inviteDetails.email}
              className="w-full text-xs h-10 px-3 bg-neutral-50 text-neutral-400 border border-border rounded-lg cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('setPasswordPlaceholder')}
                className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-border rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-zinc-800 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('verifyPasswordPlaceholder')}
                className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-border rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-zinc-800 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 bg-zinc-955 hover:bg-zinc-900 text-white font-semibold rounded-[6px] text-xs transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
          >
            {submitting ? t('registering') : (inviteDetails.is_admin ? 'Activate Administrator Account' : t('joinWorkspaceBtn'))}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center animate-fade-in select-none font-sans">
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Animated Check Circle */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-100/50 animate-ping" />
          <div className="relative p-3 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-600 animate-scale-up" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t('emailVerifiedHeading')}</h2>
          <p className="text-xs text-fg-secondary leading-relaxed max-w-sm">
            {t('emailVerifiedSubtext')}
          </p>
        </div>
      </div>

      <div className="bg-[#FAFAFA] border border-border p-4 rounded-xl text-xs text-fg-secondary">
        {t('redirectingOnboarding', { seconds: countdown })}
      </div>

      <div className="pt-2">
        <Button
          onClick={() => router.push('/onboarding')}
          className="w-full h-10 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          {t('proceedToSetupBtn')} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function VerificationSuccessPage() {
  const t = useTranslations('Auth');
  return (
    <Suspense fallback={<SimpleLoader fullScreen={false} message={t('syncingVerificationLayout')} />}>
      <VerificationSuccessScreen />
    </Suspense>
  );
}
