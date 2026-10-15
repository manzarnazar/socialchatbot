'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  User, 
  Key, 
  Loader2, 
  RefreshCw,
  Coins,
  X
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DropdownSelect } from '@/components/ui/dropdown-select';

export default function GeneralSettingsPage() {
  const t = useTranslations('Superadmin');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingFinancials, setSavingFinancials] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Password fields
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // Financial fields
  const [defaultCurrencySetting, setDefaultCurrencySetting] = useState('USD');

  const fetchProfileAndSettings = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        fetchWithCsrf('/admin/me'),
        fetchWithCsrf('/admin/settings')
      ]);

      if (profileRes.ok) {
        const d = await profileRes.json();
        if (d.admin) {
          setFirstName(d.admin.first_name || '');
          setLastName(d.admin.last_name || '');
          setEmail(d.admin.email || '');
        }
      }

      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.settings && d.settings.default_currency) {
          setDefaultCurrencySetting(d.settings.default_currency);
        }
      }
    } catch {
      toast.error(t('settings.messages.loadProfileFailed') || 'Failed to load configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndSettings();
    setMounted(true);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetchWithCsrf('/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        })
      });

      if (res.ok) {
        toast.success(t('settings.saveSuccess'));
      } else {
        toast.error(t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error(t('settings.messages.enterNewPassword') || 'Please enter new password.');
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error(t('settings.messages.passwordMismatch') || 'Password confirmation mismatch.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetchWithCsrf('/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          password: password,
          password_confirmation: passwordConfirmation,
        })
      });

      if (res.ok) {
        setPassword('');
        setPasswordConfirmation('');
        setShowPasswordDialog(false);
        toast.success(t('settings.saveSuccess'));
      } else {
        toast.error(t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFinancials(true);
    try {
      const res = await fetchWithCsrf('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          settings: {
            default_currency: defaultCurrencySetting
          }
        })
      });

      if (res.ok) {
        toast.success(t('settings.currencyUpdated'));
      } else {
        toast.error(t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingFinancials(false);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('settings.loadingSettings')} />;
  }

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar (USD - $)' },
    { value: 'NGN', label: 'Nigerian Naira (NGN - ₦)' },
    { value: 'EUR', label: 'Euro (EUR - €)' },
    { value: 'GBP', label: 'British Pound (GBP - £)' },
    { value: 'INR', label: 'Indian Rupee (INR - ₹)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD - $)' },
    { value: 'AUD', label: 'Australian Dollar (AUD - $)' },
    { value: 'NZD', label: 'New Zealand Dollar (NZD - $)' },
    { value: 'JPY', label: 'Japanese Yen (JPY - ¥)' },
    { value: 'SGD', label: 'Singapore Dollar (SGD - $)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
    { value: 'HKD', label: 'Hong Kong Dollar (HKD - $)' },
    { value: 'SEK', label: 'Swedish Krona (SEK - kr)' },
    { value: 'NOK', label: 'Norwegian Krone (NOK - kr)' },
    { value: 'DKK', label: 'Danish Krone (DKK - kr)' },
    { value: 'MXN', label: 'Mexican Peso (MXN - $)' },
    { value: 'BRL', label: 'Brazilian Real (BRL - R$)' },
    { value: 'ZAR', label: 'South African Rand (ZAR - R)' },
    { value: 'AED', label: 'United Arab Emirates Dirham (AED)' },
    { value: 'PLN', label: 'Polish Zloty (PLN - zł)' },
    { value: 'TRY', label: 'Turkish Lira (TRY - ₺)' },
    { value: 'CNY', label: 'Chinese Yuan (CNY - ¥)' },
  ];

  return (
    <div className="w-full select-none text-zinc-750 selection:bg-zinc-100 animate-fade-in font-sans flex-1 overflow-y-auto">
      
      {/* SECTION 1: Personal Profile Settings */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="col-span-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('settings.adminProfile')}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              {t('settings.supervisorHelp')}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="col-span-1 md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.firstName')}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.lastName')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 px-4 h-9 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all disabled:opacity-50"
            >
              {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t('settings.saveProfile')}</span>
            </button>
          </div>

          <div className="h-[1px] w-full bg-[#E8E8E6]" />

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.emailReadOnlyLabel')}</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium text-zinc-500 opacity-80 cursor-not-allowed select-all"
            />
          </div>

          {/* Password update inline row section */}
          <div className="flex items-center justify-between py-4 border-t border-[#E8E8E6] mt-4 select-none">
            <div className="space-y-0.5 text-left">
              <label className="text-[10px] text-zinc-555 font-bold uppercase tracking-wider block">{t('settings.changePasswordTitle')}</label>
              <p className="text-[11px] text-zinc-400 font-medium">{t('settings.changePasswordDesc')}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all"
              >
                <Key className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t('settings.updatePassword')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 2: Platform Financial Configurations */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="col-span-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('settings.financialsTitle')}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              {t('settings.financialsDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateFinancials} className="col-span-1 md:col-span-2 space-y-6">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.defaultCurrencyLabel')}</label>
            <DropdownSelect
              value={defaultCurrencySetting}
              onChange={(val) => setDefaultCurrencySetting(val)}
              options={currencyOptions}
              className="w-full"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingFinancials}
              className="flex items-center gap-1.5 px-4 h-9 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all disabled:opacity-50"
            >
              {savingFinancials && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t('settings.saveFinancials')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Update Password Modal Dialog Portal */}
      {mounted && showPasswordDialog && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowPasswordDialog(false)}
        >
          <div className="fixed inset-0" onClick={() => setShowPasswordDialog(false)} />
          <form 
            onSubmit={handleUpdatePassword} 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('settings.changePasswordModalTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswordDialog(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  placeholder={t('settings.placeholders.newPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('settings.confirmPassword')}</label>
                <input
                  type="password"
                  placeholder={t('settings.placeholders.confirmPassword')}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowPasswordDialog(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('settings.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all flex items-center justify-center min-w-[125px]"
              >
                {savingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
