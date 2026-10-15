'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  User, 
  ShieldAlert, 
  Building, 
  Key, 
  Loader2, 
  X, 
  RefreshCw, 
  Mail,
  Laptop,
  Megaphone,
  ShoppingBag,
  Home,
  HeartPulse,
  TrendingUp,
  GraduationCap,
  Compass,
  Check
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  language?: string | null;
  role?: {
    name: string;
    display_name: string;
  };
  tenant?: {
    company_name: string;
    team_size: string | null;
    industry_category: string | null;
    default_language: string | null;
    status: string;
    currency?: {
      code: string;
      symbol: string;
    } | null;
  };
}

export default function GeneralSettings() {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Delete Account States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1); // 1 = warning check, 2 = verify OTP code
  const [sendingDeleteCode, setSendingDeleteCode] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');

  // Profile forms
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Email change dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [codeSentToCurrent, setCodeSentToCurrent] = useState(false);
  const [emailCodeCurrent, setEmailCodeCurrent] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailCodeNew, setEmailCodeNew] = useState('');
  const [sendingCurrentCode, setSendingCurrentCode] = useState(false);
  const [verifyingCurrentCode, setVerifyingCurrentCode] = useState(false);
  const [sendingNewCode, setSendingNewCode] = useState(false);
  const [confirmingNewEmail, setConfirmingNewEmail] = useState(false);
  const [newCodeSent, setNewCodeSent] = useState(false);

  // Workspace forms
  const [companyName, setCompanyName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [isTeamSizeOpen, setIsTeamSizeOpen] = useState(false);
  const [industry, setIndustry] = useState('');
  const [workspaceCurrency, setWorkspaceCurrency] = useState('USD');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setFirstName(data.user.first_name || '');
          setLastName(data.user.last_name || '');
          
          if (data.user.tenant) {
            setCompanyName(data.user.tenant.company_name || '');
            setTeamSize(data.user.tenant.team_size || '');
            setIndustry(data.user.tenant.industry_category || 'Technology');
            setWorkspaceCurrency(data.user.tenant.currency?.code || 'USD');
          }
        }
      }
    } catch {
      toast.error(t('toasts.loadProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    setMounted(true);
  }, []);

  const handleOpenEmailDialog = () => {
    setShowEmailDialog(true);
    setEmailStep(1);
    setCodeSentToCurrent(false);
    setEmailCodeCurrent('');
    setNewEmailInput('');
    setEmailCodeNew('');
    setNewCodeSent(false);
  };

  const handleSendDeleteCode = async () => {
    setSendingDeleteCode(true);
    try {
      const res = await fetchWithCsrf('/auth/settings/delete-account/send-code', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.deleteCodeDispatched'));
        setDeleteStep(2);
      } else {
        toast.error(data.message || 'Failed to dispatch verification code.');
      }
    } catch {
      toast.error(t('toasts.requestCodeFailed'));
    } finally {
      setSendingDeleteCode(false);
    }
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteCode || deleteCode.length !== 6) {
      toast.error(t('toasts.enterSixDigitCode'));
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetchWithCsrf('/auth/settings/delete-account/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: deleteCode }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(t('toasts.accountDeleted'));
        setShowConfirmModal(false);
        localStorage.clear();
        router.push('/login');
      } else {
        toast.error(data.message || 'Failed to confirm account deletion.');
      }
    } catch {
      toast.error(t('toasts.deleteAccountNetworkError'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowConfirmModal(false);
    setDeleteStep(1);
    setDeleteCode('');
  };

  // Send validation code to the active email address upon confirmation
  const handleSendCurrentCode = async () => {
    setSendingCurrentCode(true);
    try {
      const res = await fetchWithCsrf('/auth/profile/email/send-current-code', {
        method: 'POST',
      });
      if (res.ok) {
        toast.info(t('toasts.currentEmailCodeDispatched'));
        setCodeSentToCurrent(true);
      } else {
        toast.error(t('toasts.sendCodeFailed'));
      }
    } catch {
      toast.error(t('toasts.dispatchNetworkError'));
    } finally {
      setSendingCurrentCode(false);
    }
  };

  const handleVerifyCurrentEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailCodeCurrent.length !== 6) {
      toast.error(t('toasts.enterSixDigitCode'));
      return;
    }

    setVerifyingCurrentCode(true);

    try {
      const res = await fetchWithCsrf('/auth/profile/email/verify-current-code', {
        method: 'POST',
        body: JSON.stringify({ code: emailCodeCurrent }),
      });

      if (res.ok) {
        toast.success(t('toasts.identityVerified'));
        setEmailStep(2);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Invalid verification code.');
      }
    } catch {
      toast.error(t('toasts.codeCheckNetworkError'));
    } finally {
      setVerifyingCurrentCode(false);
    }
  };

  const handleSendNewEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput) {
      toast.error(t('toasts.enterNewEmailAddress'));
      return;
    }

    setSendingNewCode(true);

    try {
      const res = await fetchWithCsrf('/auth/profile/email/send-new-code', {
        method: 'POST',
        body: JSON.stringify({ new_email: newEmailInput }),
      });

      if (res.ok) {
        toast.success(t('toasts.newEmailCodeSent'));
        setNewCodeSent(true);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Proposed email address validation failed.');
      }
    } catch {
      toast.error(t('toasts.newDispatchNetworkError'));
    } finally {
      setSendingNewCode(false);
    }
  };

  const handleConfirmEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailCodeNew.length !== 6) {
      toast.error(t('toasts.enterSixDigitCode'));
      return;
    }

    setConfirmingNewEmail(true);

    try {
      const res = await fetchWithCsrf('/auth/profile/email/confirm-update', {
        method: 'POST',
        body: JSON.stringify({ code: emailCodeNew }),
      });

      if (res.ok) {
        toast.success(t('toasts.emailUpdated'));
        setShowEmailDialog(false);
        fetchProfile();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Confirmation code failed to verify.');
      }
    } catch {
      toast.error(t('toasts.finalConfirmNetworkError'));
    } finally {
      setConfirmingNewEmail(false);
    }
  };

  const isOwner = user?.role?.name === 'owner';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetchWithCsrf('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (res.ok) {
        toast.success(t('toasts.profileUpdated'));
        fetchProfile();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update profile.');
      }
    } catch {
      toast.error(t('toasts.profileUpdateNetworkError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error(t('toasts.enterNewPassword'));
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error(t('toasts.passwordsDoNotMatch'));
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetchWithCsrf('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          password: password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (res.ok) {
        toast.success(t('toasts.passwordUpdated'));
        setPassword('');
        setPasswordConfirmation('');
        setShowPasswordDialog(false);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update password.');
      }
    } catch {
      toast.error(t('toasts.passwordUpdateNetworkError'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setSavingWorkspace(true);

    try {
      const res = await fetchWithCsrf('/auth/workspace', {
        method: 'PATCH',
        body: JSON.stringify({
          company_name: companyName,
          team_size: teamSize,
          industry_category: industry,
          currency: workspaceCurrency,
        }),
      });

      if (res.ok) {
        toast.success(t.has('toasts.workspaceUpdated') ? t('toasts.workspaceUpdated') : 'Workspace details updated successfully.');
        fetchProfile();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update workspace.');
      }
    } catch {
      toast.error(t.has('toasts.workspaceUpdateNetworkError') ? t('toasts.workspaceUpdateNetworkError') : 'Network error updating workspace.');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const industryCategories = [
    { value: 'Technology', label: t('industryTech'), icon: Laptop },
    { value: 'Marketing', label: t('industryMarketing'), icon: Megaphone },
    { value: 'Ecommerce', label: t('industryEcommerce'), icon: ShoppingBag },
    { value: 'Real Estate', label: t('industryRealEstate'), icon: Home },
    { value: 'Healthcare', label: t('industryHealthcare'), icon: HeartPulse },
    { value: 'Finance', label: t('industryFinance'), icon: TrendingUp },
    { value: 'Education', label: t('industryEducation'), icon: GraduationCap },
    { value: 'Other', label: t('industryOther'), icon: Compass },
  ];

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

  if (loading) {
    return <SimpleLoader message={t('syncingSettings')} />;
  }

  return (
    <div className="w-full select-none text-zinc-750 selection:bg-zinc-100 animate-fade-in flex-1 overflow-y-auto">
      
      {/* SECTION 1: Personal Profile Settings */}
      <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('personalProfile')}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              {t('personalProfileDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('firstName')}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('lastName')}</label>
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
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
            >
              {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('saveProfileChanges')}
            </button>
          </div>

          <div className="h-[1px] w-full bg-[#E8E8E6]" />

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('activeEmailReadOnly')}</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-medium text-zinc-500 opacity-80 cursor-not-allowed select-all"
            />
          </div>

          {/* Email update inline row section */}
          <div className="flex items-center justify-between py-4 border-t border-[#E8E8E6] mt-4 select-none">
            <div className="space-y-0.5 text-left">
              <label className="text-[10px] text-zinc-555 font-bold uppercase tracking-wider block">{t('securityEmailAddress')}</label>
              <p className="text-[11px] text-zinc-400 font-medium">{t('securityEmailDesc')}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenEmailDialog}
                className="flex items-center gap-1.5 px-3 h-8 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
              >
                <Mail className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t('updateEmail')}</span>
              </button>
            </div>
          </div>

          {/* Password update inline row section */}
          <div className="flex items-center justify-between py-4 border-t border-[#E8E8E6] mt-4 select-none">
            <div className="space-y-0.5 text-left">
              <label className="text-[10px] text-zinc-555 font-bold uppercase tracking-wider block">{t('securityPassword')}</label>
              <p className="text-[11px] text-zinc-400 font-medium">{t('securityPasswordDesc')}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center gap-1.5 px-3 h-8 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
              >
                <Key className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t('updatePassword')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 2: Workspace Information */}
      <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('workspaceProfile')}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              {t('workspaceProfileDesc')}
            </p>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          {!isOwner && (
            <div className="p-3.5 bg-zinc-50 rounded-md border border-zinc-150 flex items-start gap-2.5 text-left text-zinc-500 text-[11px] leading-relaxed">
              <ShieldAlert className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <span>{t('workspaceProtected')}</span>
            </div>
          )}

          <form onSubmit={handleUpdateWorkspace} className="space-y-6">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('companyWorkspaceName')}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={!isOwner}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              
              {/* Custom Team Size Dropdown Selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('teamSizeRange')}</label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => setIsTeamSizeOpen(!isTeamSizeOpen)}
                    className="w-full text-xs h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-left font-medium flex items-center justify-between hover:border-black transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {teamSize === '1-5' && `1 - 5 ${t('teamMembersSuffix')}`}
                      {teamSize === '6-20' && `6 - 20 ${t('teamMembersSuffix')}`}
                      {teamSize === '21-50' && `21 - 50 ${t('teamMembersSuffix')}`}
                      {teamSize === '21-100' && `21 - 100 ${t('teamMembersSuffix')}`}
                      {teamSize === '50+' && `50+ ${t('teamMembersSuffix')}`}
                      {teamSize === '100+' && `100+ ${t('teamMembersSuffix')}`}
                      {teamSize && !['1-5', '6-20', '21-50', '21-100', '50+', '100+'].includes(teamSize) && teamSize}
                      {!teamSize && t('selectTeamSize')}
                    </span>
                    <span className="text-[8px] text-zinc-400">▼</span>
                  </button>

                  {isTeamSizeOpen && isOwner && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsTeamSizeOpen(false)} />
                      <div className="absolute top-10 left-0 right-0 z-30 border border-[#E8E8E6] bg-white rounded-lg shadow-lg py-1 animate-scale-up">
                        {[
                          { label: `1 - 5 ${t('teamMembersSuffix')}`, value: '1-5' },
                          { label: `6 - 20 ${t('teamMembersSuffix')}`, value: '6-20' },
                          { label: `21 - 50 ${t('teamMembersSuffix')}`, value: '21-50' },
                          { label: `21 - 100 ${t('teamMembersSuffix')}`, value: '21-100' },
                          { label: `50+ ${t('teamMembersSuffix')}`, value: '50+' },
                          { label: `100+ ${t('teamMembersSuffix')}`, value: '100+' },
                        ].map((opt) => (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => {
                              setTeamSize(opt.value);
                              setIsTeamSizeOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className={teamSize === opt.value ? 'font-bold text-black' : 'text-zinc-500 font-medium'}>
                              {opt.label}
                            </span>
                            {teamSize === opt.value && <Check className="h-3.5 w-3.5 text-[#3DD43D]" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Workspace Base Currency Dropdown Selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Workspace CRM Currency</label>
                <DropdownSelect
                  value={workspaceCurrency}
                  onChange={(val) => setWorkspaceCurrency(val)}
                  options={currencyOptions}
                  disabled={!isOwner}
                  className="w-full"
                />
              </div>

            </div>

            {/* Custom Industry Visual Grid Selector matching Onboarding */}
            <div className="space-y-2.5 text-left">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                {t('industryCategory')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[30vh] overflow-y-auto pr-1">
                {industryCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isSelected = industry === cat.value;

                  return (
                    <button
                      key={cat.value}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setIndustry(cat.value)}
                      className={`h-16 flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-center transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected 
                          ? 'border-black bg-zinc-50 text-black shadow-2xs font-bold' 
                          : 'border-[#E8E8E6] bg-white text-zinc-500 hover:border-black hover:text-black'
                      }`}
                    >
                      <CatIcon className={`h-4 w-4 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                      <span className="text-[9px] uppercase tracking-wider font-extrabold">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isOwner && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingWorkspace}
                  className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  {savingWorkspace && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t('saveWorkspaceDetails')}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* SECTION 3: Danger Zone (Delete Account) */}
      <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
        {/* Left Column: Descriptive Header */}
        <div className="col-span-1 text-left">
          <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('deleteAccount')}</h3>
          <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
            {t('deleteAccountInstructions')}
          </p>
        </div>

        {/* Right Column: Short instructions & Button */}
        <div className="col-span-2 space-y-4 text-left">
          <p className="text-[11.5px] text-zinc-650 font-semibold leading-relaxed">
            {t('deleteWarningText')}
          </p>
          <div>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 h-9 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer"
            >
              {t('deleteMyAccount')}
            </button>
          </div>
        </div>
      </div>

      {/* Security Update Password Modal Dialog Portal */}
      {mounted && showPasswordDialog && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowPasswordDialog(false)}
        >
          <form 
            onSubmit={handleUpdatePassword} 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('changePassword')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswordDialog(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('newPassword')}</label>
                <input
                  type="password"
                  placeholder={t('newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('confirmPassword')}</label>
                <input
                  type="password"
                  placeholder={t('repeatPasswordPlaceholder')}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setShowPasswordDialog(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[125px] cursor-pointer"
              >
                {savingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('updatePassword')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Security Update Email Modal Dialog Portal */}
      {mounted && showEmailDialog && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowEmailDialog(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('changeEmailCredentials')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEmailDialog(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4">
              {emailStep === 1 ? (
                <div className="space-y-4 text-left">
                  {!codeSentToCurrent ? (
                    <div className="space-y-4">
                      <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                        {t('verifyIdentityText', { email: user?.email || '' })}
                      </p>

                      <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                        <button
                          type="button"
                          onClick={() => setShowEmailDialog(false)}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendCurrentCode}
                          disabled={sendingCurrentCode}
                          className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
                        >
                          {sendingCurrentCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('requestCode')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyCurrentEmailCode} className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('verificationCode')}</label>
                        <input
                          type="text"
                          value={emailCodeCurrent}
                          onChange={(e) => setEmailCodeCurrent(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          placeholder="123456"
                          className="w-full h-9 px-3 text-center text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black text-slate-800 font-mono tracking-widest transition-colors font-medium"
                        />
                      </div>

                      <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                        <button
                          type="button"
                          onClick={() => setCodeSentToCurrent(false)}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('back')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEmailDialog(false)}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingCurrentCode}
                          className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
                        >
                          {verifyingCurrentCode ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : tCommon('confirm')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : !newCodeSent ? (
                <form onSubmit={handleSendNewEmailCode} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('newEmailAddress')}</label>
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      required
                      placeholder={t('newEmailPlaceholder')}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black text-slate-800 transition-colors font-medium text-xs"
                    />
                  </div>

                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                    <button
                      type="button"
                      onClick={() => setShowEmailDialog(false)}
                      className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={sendingNewCode}
                      className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
                    >
                      {sendingNewCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('requestCode')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmEmailUpdate} className="space-y-4">
                  <div className="p-3 bg-[#F5F5F5] rounded-md border border-[#E8E8E6] flex items-start gap-2.5 text-left text-zinc-500 text-[11px] leading-relaxed">
                    <ShieldAlert className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                    <span>
                      {t('emailSentToNew', { email: newEmailInput })}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('verificationCode')}</label>
                    <input
                      type="text"
                      value={emailCodeNew}
                      onChange={(e) => setEmailCodeNew(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="654321"
                      className="w-full h-9 px-3 text-center text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black text-slate-800 font-mono tracking-widest transition-colors font-medium"
                    />
                  </div>

                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between gap-3 select-none">
                    <button
                      type="button"
                      onClick={() => setNewCodeSent(false)}
                      className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                    >
                      {tCommon('back')}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowEmailDialog(false)}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={confirmingNewEmail}
                        className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
                      >
                        {confirmingNewEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : tCommon('confirm')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Danger Zone: Permanent Account Deletion Modal Portal */}
      {mounted && showConfirmModal && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={handleCloseDeleteModal}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-650" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {deleteStep === 1 ? t('confirmDeletion') : t('verifySecurityCode')}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseDeleteModal}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: Warning Panel */}
            {deleteStep === 1 && (
              <div className="space-y-4 pt-4">
                <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                  {t('deleteAccountConfirmationText')}
                </p>

                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={handleCloseDeleteModal}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={sendingDeleteCode}
                    onClick={handleSendDeleteCode}
                    className="h-9 px-4 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
                  >
                    {sendingDeleteCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('requestCode')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verification Panel */}
            {deleteStep === 2 && (
              <form onSubmit={handleConfirmDeletion} className="space-y-4 pt-4">
                <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                  {t('enterCodeToDeleteText')}
                </p>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('securityCode')}</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-center tracking-widest text-lg transition-colors"
                  />
                </div>

                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={handleCloseDeleteModal}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={deletingAccount || deleteCode.length !== 6}
                    className="h-9 px-4 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[140px] cursor-pointer disabled:opacity-50"
                  >
                    {deletingAccount ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('confirmDeletion')}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
