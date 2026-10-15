'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import Image from 'next/image';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Building2, 
  CreditCard, 
  ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { PlatformLogo } from '@/components/common/PlatformLogo';
import { useBranding } from '@/components/BrandingThemeProvider';

function AuthSidebarAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto my-auto py-10 flex flex-col items-center justify-center min-h-[300px]">
      <div className="flex flex-col gap-6 w-full relative z-10 select-none animate-fade-in">
        {/* Tenant Registry Event */}
        <div 
          className={`flex items-start gap-3 bg-white/5 border rounded-xl p-3.5 max-w-[85%] transition-all duration-500 ease-out ${
            step >= 0 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 0 ? 'border-accent-green/30 bg-accent-green/5 shadow-[0_0_15px_rgba(74,229,74,0.05)]' : 'border-white/10'}`}
        >
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-white/80" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/55 font-bold uppercase tracking-widest">Tenant Registry</p>
            <p className="text-xs text-white/90 font-medium">&ldquo;ACME Corporation initialized a new workspace.&rdquo;</p>
          </div>
        </div>

        {/* Stripe Provisioner Event */}
        <div 
          className={`self-center flex items-center gap-3 bg-white/5 border rounded-xl px-5 py-3 transition-all duration-500 ease-out ${
            step >= 1 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 1 ? 'border-accent-green bg-foreground ring-4 ring-accent-green/10 shadow-[0_0_25px_rgba(74,229,74,0.2)]' : 'border-white/10'}`}
        >
          <div className={`h-6 w-6 rounded-full bg-accent-green/10 flex items-center justify-center shrink-0 ${step === 1 ? 'animate-pulse' : ''}`}>
            <CreditCard className="h-3.5 w-3.5 text-accent-green" />
          </div>
          <div className="text-left">
            <p className="text-[9px] text-white/55 font-bold uppercase tracking-widest">Stripe Ledger</p>
            <p className="text-xs text-white font-bold tracking-tight">
              {step === 1 ? 'Syncing prices...' : 'Product prices synchronized'}
            </p>
          </div>
        </div>

        {/* Platform Mailer Event */}
        <div 
          className={`self-end flex items-start gap-3 bg-white/5 border rounded-xl p-3.5 max-w-[85%] transition-all duration-500 ease-out ${
            step >= 2 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } ${step === 2 ? 'border-accent-green/30 bg-accent-green/5 shadow-[0_0_15px_rgba(74,229,74,0.05)]' : 'border-white/10'}`}
        >
          <div className="h-6 w-6 rounded-full bg-accent-green/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-accent-green font-bold uppercase tracking-widest">Platform Mailer</p>
            <p className="text-xs text-white/90 font-medium">&ldquo;SMTP connection test passed successfully.&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  const t = useTranslations('Superadmin');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    let isRedirecting = false;

    try {
      const response = await fetchWithCsrf('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('login.invalidCreds'));
      }

      isRedirecting = true;
      setRedirecting(true);
      toast.success(t('login.welcomeToast'));

      if (data.token) {
        localStorage.setItem('whatsomni_admin_token', data.token);
      }

      const host = window.location.hostname;
      const domains = Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));
      domains.forEach(d => {
        document.cookie = `whatsomni_admin_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
      });
      
      router.push('/superadmin/dashboard');
      router.refresh();

    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.loginError');
      setErrorMsg(message);
      toast.error(message);
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  };

  if (redirecting) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-white tracking-tight animate-pulse">Redirecting to admin console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-sans bg-white text-black">
      {/* Left panel — Brand Spotlight (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col bg-[#0A0A0A] p-12 text-white relative overflow-hidden select-none">
        {/* Neon Green Radial Spotlight Signature */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none mix-blend-screen"
          style={{ 
            background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} 
        />
        
        {/* Top: Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <PlatformLogo 
            className="h-7 w-auto object-contain max-h-7 brightness-0 invert" 
            fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-md"
            showText
            textClassName="text-lg font-black tracking-tight text-white flex items-center gap-1.5"
          />
          <span className="text-[10px] uppercase font-bold tracking-widest bg-accent-green/10 text-accent-green px-1.5 py-0.5 rounded-sm">
            SaaS Admin
          </span>
        </div>

        {/* Middle: Live Animated Flow Graphic */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <AuthSidebarAnimation />
        </div>

        {/* Bottom: Brand Quote */}
        <div className="relative z-10 max-w-md pt-6 border-t border-white/5">
          <blockquote className="space-y-4">
            <p className="text-2xl font-semibold leading-snug text-white/95">
              &ldquo;Our global administration dashboard provides full oversight of Stripe ledgers, tenant activity metrics, API credentials encryption, and multi-language routing configs.&rdquo;
            </p>
            <footer className="text-xs text-white/60 font-medium uppercase tracking-wider">
              — SaaS Operations Guidelines
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — Flat Admin Auth Form */}
      <div className="flex items-center justify-center p-6 md:p-8 bg-white relative">
        {/* Subtle decorative glow for mobile screen depth */}
        <div 
          className="lg:hidden absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} 
        />
        
        <div className="w-full max-w-[400px] relative z-10 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
              {t('login.title')}
            </h2>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-50 text-red-700 border border-red-100 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{t('login.authError')}</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
                {t('login.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@whatsomni.com"
                  className="w-full text-xs h-10 pl-9 pr-3 bg-white border border-[#E8E8E6] rounded-md placeholder:text-neutral-300 focus:outline-none focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs h-10 pl-9 pr-10 bg-white border border-[#E8E8E6] rounded-md placeholder:text-neutral-300 focus:outline-none focus:border-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-black"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-zinc-955 hover:bg-zinc-900 text-white font-semibold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer mt-6"
            >
              {loading ? t('login.verifying') : t('login.signInBtn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
