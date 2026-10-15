'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Mail, 
  Save, 
  Send, 
  RefreshCw, 
  Loader2, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Palette,
  Layers,
  Zap
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import CustomSelect from '@/components/ui/CustomSelect';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';


export default function MailSettingsPage() {
  const t = useTranslations('Superadmin');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [loading, setLoading] = useState(true);
  const [savingMailer, setSavingMailer] = useState(false);
  const [testingMailer, setTestingMailer] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Mailer config fields
  const [mailerType, setMailerType] = useState('smtp');

  // SMTP Config
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(1025);
  const [smtpEncryption, setSmtpEncryption] = useState('tls');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');

  // Resend Config
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromAddress, setResendFromAddress] = useState('');
  const [resendFromName, setResendFromName] = useState('');

  // Connection tester
  const [testRecipient, setTestRecipient] = useState('');

  const fetchMailerAndTemplates = async () => {
    setLoading(true);
    try {
      const settingsRes = await fetchWithCsrf('/admin/settings');

      if (settingsRes.ok) {
        const d = await settingsRes.json();
        const settings = d.settings || {};
        const mailerConfig = settings.mailer || {};

        setMailerType(mailerConfig.type || 'smtp');

        const smtp = mailerConfig.smtp || {};
        setSmtpHost(smtp.host || '');
        setSmtpPort(Number(smtp.port || 1025));
        
        const loadedEncryption = smtp.encryption || 'tls';
        setSmtpEncryption(loadedEncryption === 'none' ? 'tls' : loadedEncryption);

        setSmtpUsername(smtp.username || '');
        setSmtpPassword(smtp.password || '');
        setSmtpFromAddress(smtp.from_address || '');
        setSmtpFromName(smtp.from_name || '');

        const resend = mailerConfig.resend || {};
        setResendApiKey(resend.api_key || '');
        setResendFromAddress(resend.from_address || '');
        setResendFromName(resend.from_name || '');
      }
    } catch {
      toast.error(t('settings.messages.loadMailFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMailerAndTemplates();
  }, []);

  const handleMailerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMailer(true);
    try {
      const res = await fetchWithCsrf('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          settings: {
            mailer: {
              type: mailerType,
              smtp: {
                host: smtpHost,
                port: smtpPort,
                encryption: smtpEncryption,
                username: smtpUsername,
                password: smtpPassword,
                from_address: smtpFromAddress,
                from_name: smtpFromName,
              },
              resend: {
                api_key: resendApiKey,
                from_address: resendFromAddress,
                from_name: resendFromName,
              }
            }
          }
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
      setSavingMailer(false);
    }
  };

  const handleTestMailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim() || testingMailer) return;

    setTestingMailer(true);
    setTestSuccess(false);
    setTestError(null);

    const payload = {
      type: mailerType,
      recipient: testRecipient.trim(),
      config: mailerType === 'smtp' 
        ? {
            host: smtpHost,
            port: smtpPort,
            encryption: smtpEncryption,
            username: smtpUsername,
            password: smtpPassword,
            from_address: smtpFromAddress,
            from_name: smtpFromName,
          }
        : {
            api_key: resendApiKey,
            from_address: resendFromAddress,
            from_name: resendFromName,
          }
    };

    try {
      const res = await fetchWithCsrf('/admin/settings/mailer/test', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTestSuccess(true);
        toast.success(t('settings.messages.testDelivered'));
      } else {
        const d = await res.json();
        setTestError(d.message || 'Delivery check failed.');
      }
    } catch {
      setTestError('Connection timeout or server crash during SMTP delivery.');
    } finally {
      setTestingMailer(false);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('settings.loadingMail')} />;
  }

  return (
    <div className="w-full bg-white font-sans text-black select-none text-left flex-1 overflow-y-auto pb-16 animate-fade-in">
      
      {/* 1. Mailer Gateway Setup */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="col-span-1">
          <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('settings.mailerGatewayTitle')}</h3>
          <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
            {t('settings.mailerGatewayHelp')}
          </p>
        </div>
        <div className="col-span-1 md:col-span-2">
          <form onSubmit={handleMailerSave} className="space-y-6">
            
            {/* Same Selector as AI Provider Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.gatewayProviderOptions')}</label>
              <div className="grid grid-cols-3 gap-3 select-none max-w-md">
                {[
                  { id: 'smtp', label: t('settings.smtpServer'), icon: Layers },
                  { id: 'resend', label: t('settings.resendApi'), icon: Zap }
                ].map((p) => {
                  const isSelected = mailerType === p.id;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMailerType(p.id)}
                      className={`flex flex-col items-center justify-center p-4 border rounded-[6px] transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-50 border-zinc-955 ring-1 ring-zinc-955 text-zinc-955 font-bold shadow-xs' 
                          : 'bg-white border-zinc-200 hover:border-zinc-350 text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mailerType === 'smtp' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.smtpHost')}</label>
                    <input
                      type="text"
                      required
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.mailtrap.io"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.smtpPort')}</label>
                    <input
                      type="number"
                      required
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.encryption')}</label>
                    <CustomSelect
                      value={smtpEncryption}
                      onChange={(val) => setSmtpEncryption(val as string)}
                      options={[
                        { value: 'ssl', label: 'SSL' },
                        { value: 'tls', label: 'TLS' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.username')}</label>
                    <input
                      type="text"
                      required
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.password')}</label>
                    <input
                      type="password"
                      required
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.fromName')}</label>
                    <input
                      type="text"
                      required
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                      placeholder="WhatsOmni Platform"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.fromEmail')}</label>
                    <input
                      type="email"
                      required
                      value={smtpFromAddress}
                      onChange={(e) => setSmtpFromAddress(e.target.value)}
                      placeholder="noreply@whatsomni.com"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.resendApiKey')}</label>
                  <input
                    type="password"
                    required
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxx"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.fromName')}</label>
                    <input
                      type="text"
                      required
                      value={resendFromName}
                      onChange={(e) => setResendFromName(e.target.value)}
                      placeholder="WhatsOmni Support"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.fromEmail')}</label>
                    <input
                      type="email"
                      required
                      value={resendFromAddress}
                      onChange={(e) => setResendFromAddress(e.target.value)}
                      placeholder="noreply@whatsomni.com"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E8E8E6]">
              <button
                type="submit"
                disabled={savingMailer}
                className="h-9 px-4 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-[6px] transition-all flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer disabled:opacity-50"
              >
                {savingMailer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('settings.saveMailSettings')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Connection Tester */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="col-span-1">
          <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('settings.gatewayTesterTitle')}</h3>
          <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
            {t('settings.gatewayTesterHelp')}
          </p>
        </div>
        <div className="col-span-1 md:col-span-2">
          <form onSubmit={handleTestMailer} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('settings.testRecipient')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                />
                <button
                  type="submit"
                  disabled={testingMailer || !testRecipient.trim()}
                  className="h-9 px-4 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-[6px] transition-all flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingMailer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('settings.sendTestMail')}
                </button>
              </div>
            </div>

            {testSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-[6px] text-xs font-medium flex items-start gap-2 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{t('settings.testSuccessMsg', { recipient: testRecipient })}</span>
              </div>
            )}

            {testError && (
              <div className="p-3 bg-red-50 border border-red-150 text-red-800 rounded-[6px] text-xs font-medium flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                <span>{t('settings.deliveryFailure', { error: testError })}</span>
              </div>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}
