'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { PlatformLogo } from '@/components/common/PlatformLogo';
import { 
  Key, 
  AlertTriangle, 
  LogOut, 
  Check, 
  Laptop,
  Megaphone,
  ShoppingBag,
  Home,
  HeartPulse,
  TrendingUp,
  GraduationCap,
  Compass,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { fetchWithCsrf, clearAuthSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AIProviderDetails {
  name: string;
  description: string;
  is_configured: boolean;
  models: string[];
  enabled_models: string[];
  default_model: string;
}

const logoMap: Record<string, string> = {
  openai: 'openai.svg',
  anthropic: 'anthropic.png',
  gemini: 'gemini.webp',
  deepseek: 'deepseek.png',
  groq: 'groq.webp',
  xai: 'xai.png',
  mistral: 'mistral.png',
  openrouter: 'openrouter.webp',
};

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function CustomSelect({ options, value, onChange, placeholder = 'Select...' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className="relative inline-block w-full text-left font-sans text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs h-9 px-3 bg-[#FAFAFA]/50 border border-[#E8E8E6] rounded-[6px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer font-medium"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-full rounded-md bg-white border border-[#E8E8E6] shadow-lg z-40 max-h-60 overflow-y-auto">
            <div className="p-1 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-xs font-medium ${
                    opt.value.toString() === value.toString()
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OnboardingWizard() {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state machine
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  // Step 1: Workspace form states
  const [companyName, setCompanyName] = useState<string>('');
  const [teamSize, setTeamSize] = useState<string>('1-5');
  const [industry, setIndustry] = useState<string>('Technology');
  const [isTeamSizeOpen, setIsTeamSizeOpen] = useState<boolean>(false);

  // Step 2: AI Integrations states
  const [operationalModel, setOperationalModel] = useState<string>('byok');
  const [providers, setProviders] = useState<Record<string, AIProviderDetails>>({});
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [skipWarningOpen, setSkipWarningOpen] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);

  // Sync current user context on load
  const loadUserContext = async () => {
    try {
      const response = await fetchWithCsrf('/auth/me');
      if (response.ok) {
        const data = await response.json();
        const tenant = data.user?.tenant;
        if (tenant) {
          if (tenant.onboarding_step === 'complete' || tenant.onboarding_step === '3') {
            router.push('/');
            return;
          }

          // Check operational model
          let opModel = 'byok';
          try {
            const aiRes = await fetchWithCsrf('/settings/ai-providers');
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              if (aiData.operational_model) {
                opModel = aiData.operational_model;
                setOperationalModel(aiData.operational_model);
              }
            }
          } catch {}

          // Resume exactly where the user left off
          const step = parseInt(tenant.onboarding_step || '1', 10);
          if (step === 2 && opModel !== 'byok') {
            // Auto-finalize if in master mode
            await fetchWithCsrf('/onboarding/step-2', { method: 'POST' });
            document.cookie = 'whatsomni_onboarding_completed=1; path=/; max-age=31536000';
            router.push('/');
            return;
          }

          setCurrentStep(isNaN(step) ? 1 : step);

          setCompanyName(tenant.company_name || '');
          setTeamSize(tenant.team_size || '1-5');
          setIndustry(tenant.industry_category || 'Technology');
        }
      } else if (response.status === 401) {
        router.push('/login');
        return;
      }
    } catch {
      toast.error(t('sessionSyncFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadAIProviders = async () => {
    try {
      const response = await fetchWithCsrf('/settings/ai-providers');
      if (response.ok) {
        const data = await response.json();
        if (data.operational_model) {
          setOperationalModel(data.operational_model);
        }
        setProviders(data.providers || {});
      }
    } catch {
      console.error('Failed to load AI providers.');
    }
  };

  useEffect(() => {
    loadUserContext();

    // Check url search parameters for callback toasts
    const verified = searchParams.get('verified');
    if (verified === 'verified' || verified === 'success') {
      toast.success(t('emailVerifiedSuccess'), {
        description: t('workspaceProfileDesc'),
      });
    } else if (verified === 'already') {
      toast.info(t('emailAlreadyVerified'), {
        description: t('welcomeBackSetup'),
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentStep === 2) {
      if (operationalModel !== 'byok') {
        // Auto finalize if in master mode
        fetchWithCsrf('/onboarding/step-2', { method: 'POST' }).then(() => {
          document.cookie = 'whatsomni_onboarding_completed=1; path=/; max-age=31536000';
          router.push('/');
        });
      } else {
        loadAIProviders();
      }
    }
  }, [currentStep, operationalModel]);

  const handleLogout = async () => {
    try {
      await fetchWithCsrf('/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {
      // Ignore
    } finally {
      clearAuthSession('tenant');
      setRedirecting(true);
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      window.location.href = `${localePrefix}/login`;
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1: Profile Save
  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error(t('enterWorkspaceNameError'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithCsrf('/onboarding/step-1', {
        method: 'POST',
        body: JSON.stringify({
          company_name: companyName,
          team_size: teamSize,
          industry_category: industry,
        }),
      });

      if (response.ok) {
        toast.success(t('workspaceProfileUpdated'));
        if (operationalModel !== 'byok') {
          // If in Master mode, bypass Step 2 and finalize immediately!
          await fetchWithCsrf('/onboarding/step-2', { method: 'POST' });
          document.cookie = 'whatsomni_onboarding_completed=1; path=/; max-age=31536000';
          toast.success(t('onboardingComplete') || 'Onboarding complete!', {
            description: t('workspaceInitialized') || 'Workspace initialized successfully.',
          });
          router.push('/');
        } else {
          setCurrentStep(2);
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || t('saveFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProvider = (slug: string, details: AIProviderDetails) => {
    setSelectedProviderSlug(slug);
    setApiKey(details.is_configured ? '••••••••••••••••••••••••' : '');
    const available = details.models || [];
    const savedEnabled = Array.isArray(details.enabled_models) && details.enabled_models.length > 0
      ? details.enabled_models.filter(m => available.includes(m))
      : available;
    const finalEnabled = savedEnabled.length > 0 ? savedEnabled : available;
    setEnabledModels(finalEnabled);

    const validDefault = (details.default_model && finalEnabled.includes(details.default_model))
      ? details.default_model
      : (finalEnabled[0] || '');
    setDefaultModel(validDefault);
    setShowKey(false);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderSlug) return;
    if (!apiKey) {
      toast.error(t('enterApiKeyError'));
      return;
    }

    setSubmitting(true);

    // 1. Perform live credentials validation check
    if (apiKey !== '••••••••••••••••••••••••') {
      try {
        const testResponse = await fetchWithCsrf('/settings/ai-providers/validate', {
          method: 'POST',
          body: JSON.stringify({ provider: selectedProviderSlug, api_key: apiKey }),
        });
        const testData = await testResponse.json();
        if (!testResponse.ok || !testData.success) {
          throw new Error(testData.message || t('validationFailed'));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('validationFailed');
        toast.error(msg);
        setSubmitting(false);
        return;
      }
    }

    // 2. Succeeded validation check -> Save the integration state statefully
    try {
      const response = await fetchWithCsrf('/settings/ai-providers', {
        method: 'POST',
        body: JSON.stringify({
          provider_name: selectedProviderSlug,
          api_key: apiKey === '••••••••••••••••••••••••' ? null : apiKey,
          enabled_models: enabledModels,
          default_model: defaultModel,
        }),
      });

      if (response.ok) {
        toast.success(t('integrationEnabled', { provider: providers[selectedProviderSlug].name }));
        setSelectedProviderSlug(null);
        setApiKey('');
        loadAIProviders();
      } else {
        const data = await response.json();
        throw new Error(data.message || t('saveFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextStep2 = async () => {
    const configuredCount = Object.values(providers).filter(p => p.is_configured).length;
    
    if (configuredCount === 0) {
      setSkipWarningOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithCsrf('/onboarding/step-2', { method: 'POST' });
      if (response.ok) {
        document.cookie = 'whatsomni_onboarding_completed=1; path=/; max-age=31536000';
        toast.success(t('onboardingComplete'), {
          description: t('workspaceInitialized'),
        });
        router.push('/');
      }
    } catch {
      toast.error(t('finalizeOnboardingFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSkipStep2 = async () => {
    setSkipWarningOpen(false);
    setSubmitting(true);
    try {
      const response = await fetchWithCsrf('/onboarding/step-2', { method: 'POST' });
      if (response.ok) {
        document.cookie = 'whatsomni_onboarding_completed=1; path=/; max-age=31536000';
        toast.success(t('onboardingComplete'), {
          description: t('workspaceInitialized'),
        });
        router.push('/');
      }
    } catch {
      toast.error(t('bypassIntegrationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SimpleLoader fullScreen={true} message={t('syncingContext')} />;
  }

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

  return (
    <div className="h-screen w-screen bg-white flex flex-col justify-between p-4 md:p-6 lg:p-8 font-sans relative overflow-hidden select-none">
      
      {/* Floating Logout Button */}
      <button 
        onClick={handleLogout}
        title="Logout Session"
        className="absolute top-4 right-4 z-40 p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
      </button>

      {/* Spacious Full Screen Panel Content (stretches wide symmetrically) */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center overflow-hidden py-4">
        
        {/* STEP 1: Workspace Profile Setup */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in w-full text-left">
            <div className="space-y-2 pb-4 border-b border-[#E8E8E6]">
              <div className="mb-2">
                <PlatformLogo 
                  className="h-7 w-auto object-contain max-h-7" 
                  fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A] uppercase">{t('configureWorkspace')}</h2>
              <p className="text-xs text-zinc-500">{t('companySizingDesc')}</p>
            </div>

            <form onSubmit={handleSaveStep1} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    {t('companyNameLabel')}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder={t('companyNamePlaceholder')}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs h-10 px-3 bg-white border border-[#E8E8E6] rounded-lg placeholder:text-fg-muted focus:outline-none focus:border-foreground transition-all"
                  />
                </div>

                {/* Team Size */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    {t('teamSizeLabel')}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTeamSizeOpen(!isTeamSizeOpen)}
                      className="w-full text-xs h-10 px-3 bg-white border border-[#E8E8E6] rounded-lg text-left font-medium flex items-center justify-between hover:border-foreground transition-all cursor-pointer select-none"
                    >
                      <span>
                        {teamSize === '1-5' && t('teamSize_1_5')}
                        {teamSize === '6-20' && t('teamSize_6_20')}
                        {teamSize === '21-50' && t('teamSize_21_50')}
                        {teamSize === '50+' && t('teamSize_50')}
                      </span>
                      <span className="text-[8px] text-zinc-400">▼</span>
                    </button>

                    {isTeamSizeOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsTeamSizeOpen(false)} />
                        <div className="absolute top-11 left-0 right-0 z-30 border border-[#E8E8E6] bg-white rounded-lg shadow-lg py-1 animate-scale-up">
                          {[
                            { label: t('teamSize_1_5'), value: '1-5' },
                            { label: t('teamSize_6_20'), value: '6-20' },
                            { label: t('teamSize_21_50'), value: '21-50' },
                            { label: t('teamSize_50'), value: '50+' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setTeamSize(opt.value);
                                setIsTeamSizeOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-50 flex items-center justify-between transition-all cursor-pointer"
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

              </div>

              {/* Industry Category visual grid selector with Icons */}
              <div className="space-y-2.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  {t('industryCategoryLabel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[30vh] overflow-y-auto pr-1">
                  {industryCategories.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = industry === cat.value;

                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setIndustry(cat.value)}
                        className={`h-16 flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-center transition-all cursor-pointer select-none ${
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

              <div className="pt-4 border-t border-[#E8E8E6] flex justify-end">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full md:w-64 h-10 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {submitting ? t('registeringWorkspace') : t('saveAndContinue')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Guided AI Integrations Connect */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in w-full text-left">
            <div className="space-y-2 pb-4 border-b border-[#E8E8E6]">
              <div className="mb-2">
                <PlatformLogo 
                  className="h-7 w-auto object-contain max-h-7" 
                  fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A] uppercase">{t('aiIntegrationsTitle')}</h2>
              <p className="text-xs text-zinc-500">{t('byokDesc')}</p>
            </div>

            {/* Providers listing stretching in wide columns */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[60vh] pr-1">
                {Object.entries(providers).map(([slug, details]) => {
                  const logoFile = logoMap[slug] || 'openai.svg';

                  return (
                    <div 
                      key={slug} 
                      className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200 ${
                        details.is_configured ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-[#E8E8E6]/60 hover:border-zinc-300'
                      }`}
                    >
                      <div>
                        {/* Top Row: Logo & Status Badge */}
                        <div className="flex items-start justify-between gap-4 mb-4 select-none">
                          <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-1.5 shrink-0">
                            <img 
                              src={`/ai-providers/${logoFile}`} 
                              alt={`${details.name} logo`} 
                              className="h-full w-full object-contain filter grayscale-[10%]" 
                            />
                          </div>
                          {details.is_configured && (
                            <span className="text-[8px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-black uppercase tracking-wider select-none">
                              {t('connected')}
                            </span>
                          )}
                        </div>

                        {/* Body Content */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{details.name}</h4>
                            <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                              {details.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="border-t border-[#F0F0F0] pt-3.5 mt-5">
                        <button
                          onClick={() => handleSelectProvider(slug, details)}
                          className="w-full py-2 bg-neutral-50 hover:bg-neutral-100 border border-[#E8E8E6] text-zinc-800 hover:text-black font-bold rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                          {details.is_configured ? t('updateSettings') : t('configureKey')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions buttons */}
              <div className="pt-4 border-t border-[#E8E8E6] flex items-center justify-between">
                <button
                  onClick={() => setSkipWarningOpen(true)}
                  className="text-[9px] text-zinc-400 hover:text-black font-extrabold uppercase tracking-widest cursor-pointer"
                >
                  {t('skipIntegrations')}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-32 h-10 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer"
                  >
                    {t('prevStep')}
                  </button>
                  
                  <Button 
                    onClick={handleNextStep2}
                    disabled={submitting}
                    className="w-48 h-10 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer"
                  >
                    {submitting ? t('finalizing') : t('finishSetup')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONNECT API DIALOG MODAL */}
      {selectedProviderSlug && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProviderSlug(null);
          }}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <form 
            onSubmit={handleSaveProvider} 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
          >
            {/* Header section with connected end-to-end divider */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <img 
                    src={`/ai-providers/${logoMap[selectedProviderSlug] || 'openai.svg'}`} 
                    alt={providers[selectedProviderSlug].name} 
                    className="h-full w-full object-contain filter grayscale-[10%]" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('configureProvider', { provider: providers[selectedProviderSlug].name })}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedProviderSlug(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 pt-4">
              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('apiKeyLabel')} {providers[selectedProviderSlug].is_configured && t('configured')}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  <input 
                    type={showKey ? "text" : "password"}
                    placeholder={providers[selectedProviderSlug].is_configured ? '••••••••••••••••••••••••' : t('enterApiKeyPlaceholder')}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full h-9 pl-9 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-[#A0A0A0]">
                  {t('encryptionNote')}
                </p>
              </div>

              {/* Default Model Selector */}
              {enabledModels.length > 0 && (
                <div className="space-y-1.5 text-left animate-fade-in">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('selectModel')}
                  </label>
                  <CustomSelect
                    options={enabledModels.map(m => ({ value: m, label: m }))}
                    value={enabledModels.includes(defaultModel) ? defaultModel : (enabledModels[0] || '')}
                    onChange={(val) => setDefaultModel(val)}
                    placeholder={t('selectModelPlaceholder')}
                  />
                </div>
              )}
            </div>

            {/* Footer action strip nested with off-white bg fill */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setSelectedProviderSlug(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? t('connecting') : t('connect')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM SKIP DIALOG FOR STEP 2 */}
      {skipWarningOpen && (
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-amber-50 border border-amber-100 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('confirmSkipTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSkipWarningOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('confirmSkipDesc')}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setSkipWarningOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmSkipStep2}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer"
              >
                {t('skipAndContinue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {redirecting && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
          <div className="w-10 h-10 border-4 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-black tracking-tight animate-pulse">Logging you out securely...</p>
        </div>
      )}
    </div>
  );
}

export default function OnboardingWizardPage() {
  return (
    <Suspense fallback={<SimpleLoader fullScreen={true} />}>
      <OnboardingWizard />
    </Suspense>
  );
}
