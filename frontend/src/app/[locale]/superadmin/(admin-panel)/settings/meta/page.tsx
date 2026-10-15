'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchWithCsrf, getBackendUrl } from '@/lib/api';
import { 
  KeyRound, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ExternalLink,
  Copy,
  Check,
  Globe,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface MetaConfig {
  app_id: string;
  app_secret: string;
  has_secret?: boolean;
  whatsapp_config_id: string;
  instagram_config_id: string;
  messenger_config_id: string;
  verify_token?: string;
}

export default function MetaSettingsPage() {
  const t = useTranslations('Superadmin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [whatsappConfigId, setWhatsappConfigId] = useState('');
  const [instagramConfigId, setInstagramConfigId] = useState('');
  const [messengerConfigId, setMessengerConfigId] = useState('');

  const [verifyToken, setVerifyToken] = useState('whatsomni_meta_token');
  const [serverWebhookUrl, setServerWebhookUrl] = useState('');

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchMetaSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/admin/settings/meta');
      if (res.ok) {
        const data = await res.json();
        const cfg: MetaConfig = data.meta_config || {};
        setAppId(cfg.app_id || '');
        setAppSecret(cfg.app_secret || '');
        setHasExistingSecret(!!cfg.has_secret);
        setWhatsappConfigId(cfg.whatsapp_config_id || '');
        setInstagramConfigId(cfg.instagram_config_id || '');
        setMessengerConfigId(cfg.messenger_config_id || '');
        if (data.webhook_url) {
          setServerWebhookUrl(data.webhook_url);
        }
        if (data.verify_token || cfg.verify_token) {
          setVerifyToken(data.verify_token || cfg.verify_token || 'whatsomni_meta_token');
        }
      } else {
        toast.error('Failed to load Meta settings.');
      }
    } catch {
      toast.error('Network error loading Meta settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaSettings();
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    const isRemoving = !appId.trim();

    try {
      const res = await fetchWithCsrf('/admin/settings/meta', {
        method: 'PUT',
        body: JSON.stringify({
          app_id: appId.trim(),
          app_secret: appSecret,
          whatsapp_config_id: whatsappConfigId.trim(),
          instagram_config_id: instagramConfigId.trim(),
          messenger_config_id: messengerConfigId.trim(),
          verify_token: verifyToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || (isRemoving ? 'Meta credentials removed successfully.' : 'Meta settings saved successfully.'));
        if (data.meta_config) {
          setAppId(data.meta_config.app_id || '');
          setAppSecret(data.meta_config.app_secret || '');
          setHasExistingSecret(!!data.meta_config.has_secret);
          setWhatsappConfigId(data.meta_config.whatsapp_config_id || '');
          setInstagramConfigId(data.meta_config.instagram_config_id || '');
          setMessengerConfigId(data.meta_config.messenger_config_id || '');
          if (data.meta_config.verify_token) {
            setVerifyToken(data.meta_config.verify_token);
          }
        }
        if (data.webhook_url) {
          setServerWebhookUrl(data.webhook_url);
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save Meta settings.');
      }
    } catch {
      toast.error('Network error saving Meta settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCredentials = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetchWithCsrf('/admin/settings/meta', {
        method: 'PUT',
        body: JSON.stringify({
          app_id: '',
          app_secret: '',
          whatsapp_config_id: whatsappConfigId.trim(),
          instagram_config_id: instagramConfigId.trim(),
          messenger_config_id: messengerConfigId.trim(),
          verify_token: verifyToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Meta credentials removed successfully.');
        setAppId('');
        setAppSecret('');
        setHasExistingSecret(false);
        if (data.webhook_url) {
          setServerWebhookUrl(data.webhook_url);
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to remove Meta credentials.');
      }
    } catch {
      toast.error('Network error removing Meta credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!appId.trim()) {
      toast.error('Please enter a Meta App ID before testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetchWithCsrf('/admin/settings/meta/test', {
        method: 'POST',
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestResult({ success: false, message: data.message || 'Meta Graph API connection failed.' });
        toast.error(data.message || 'Meta connection verification failed.');
      }
    } catch (e: any) {
      const msg = e.message || 'Meta connection test error.';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <SimpleLoader message="Loading Meta configurations..." />;
  }

  // Use environment-configured backend API URL
  const activeBackendUrl = getBackendUrl();
  const webhookCallbackUrl = serverWebhookUrl || `${activeBackendUrl}/api/webhooks/meta`;
  const oauthCallbackUrl = `${activeBackendUrl}/api/integrations/messenger/oauth/callback`;

  return (
    <div className="w-full bg-white font-sans text-black select-none text-left flex-1 overflow-y-auto pb-16 animate-fade-in">
      
      <form onSubmit={handleSave}>
        {/* 1. Meta Developer App Section */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded bg-[#F5F5F5] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                <Image src="/channels/meta.png" alt="Meta" width={16} height={16} className="object-contain" />
              </div>
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">Meta Developer App</h3>
            </div>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed mb-4">
              Configure your master Meta Developer App credentials. These enable 1-Click Embedded Signup onboarding for WhatsApp Cloud API, Instagram Direct, and Facebook Messenger across all tenants.
            </p>

            <div className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-2">
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Quick Setup Guide</span>
              <ul className="text-[10px] text-zinc-500 space-y-1 font-medium list-disc list-inside leading-relaxed">
                <li>Create a <strong>Business</strong> app at developers.facebook.com</li>
                <li>Add <strong>WhatsApp</strong>, <strong>Instagram Graph</strong> & <strong>Messenger</strong></li>
                <li>Verify your Business Manager account in Meta Business Suite</li>
              </ul>
              <a 
                href="https://developers.facebook.com/apps" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-black hover:underline mt-1"
              >
                Open Meta Developer Console
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-5">
            {/* Meta App ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Meta App ID (Client ID)
                </label>
                {(appId || hasExistingSecret) && (
                  <span className="text-[9.5px] text-zinc-400 font-medium">Leave blank and save to remove</span>
                )}
              </div>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. 154892019482019 (leave blank to remove credentials)"
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
              />
              <p className="text-[10px] text-zinc-400 font-medium">Found on your Meta App Dashboard under App Settings &gt; Basic.</p>
            </div>

            {/* Meta App Secret */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Meta App Secret (Client Secret)
                </label>
                {hasExistingSecret && (
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                    Saved
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={hasExistingSecret ? '••••••••••••••••' : 'Enter Meta App Secret'}
                  className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Keep this secure. Leave masked to keep current stored secret.</p>
            </div>

            {/* Test Connection & Remove Keys Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={testing || !appId.trim()}
                onClick={handleTestConnection}
                className="h-9 px-4 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-2 shadow-3xs disabled:opacity-40"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying with Graph API...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Test Meta App Connection</span>
                  </>
                )}
              </button>

              {(appId || hasExistingSecret) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleClearCredentials}
                  className="h-9 px-3.5 border border-[#E8E8E6] hover:border-red-300 hover:bg-red-50/60 text-red-600 hover:text-red-700 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Clear and remove stored Meta Developer App credentials"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Keys</span>
                </button>
              )}
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Embedded Signup Configurations Section */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded bg-[#F5F5F5] border border-[#E8E8E6] flex items-center justify-center">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">Embedded Signup Configs</h3>
            </div>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              Login Configuration IDs generated in your Meta App Dashboard under Facebook Login for Business or WhatsApp Embedded Signup. (Optional, defaults to standard permission sets if omitted).
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4">
            {/* WhatsApp Configuration ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                WhatsApp Login Configuration ID (Optional)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Image 
                    src="/channels/whatsapp.webp" 
                    alt="WhatsApp" 
                    width={16} 
                    height={16} 
                    className="object-contain select-none" 
                  />
                </div>
                <input
                  type="text"
                  value={whatsappConfigId}
                  onChange={(e) => setWhatsappConfigId(e.target.value)}
                  placeholder="e.g. 109284759281729"
                  className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Used in WhatsApp Embedded Signup SDK popup <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[9.5px]">config_id</code> parameter.</p>
            </div>

            {/* Instagram Configuration ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Instagram Login Configuration ID (Optional)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Image 
                    src="/channels/instagram.svg" 
                    alt="Instagram" 
                    width={16} 
                    height={16} 
                    className="object-contain select-none" 
                  />
                </div>
                <input
                  type="text"
                  value={instagramConfigId}
                  onChange={(e) => setInstagramConfigId(e.target.value)}
                  placeholder="e.g. 209284759281730"
                  className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Config ID with <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[9.5px]">instagram_basic, instagram_manage_messages</code> permissions.</p>
            </div>

            {/* Messenger Configuration ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Facebook Messenger Configuration ID (Optional)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Image 
                    src="/channels/messenger.webp" 
                    alt="Messenger" 
                    width={16} 
                    height={16} 
                    className="object-contain select-none" 
                  />
                </div>
                <input
                  type="text"
                  value={messengerConfigId}
                  onChange={(e) => setMessengerConfigId(e.target.value)}
                  placeholder="e.g. 309284759281731"
                  className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Config ID with <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[9.5px]">pages_messaging, pages_show_list</code> permissions.</p>
            </div>
          </div>
        </div>

        {/* 3. Callback URLs Reference Section */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded bg-[#F5F5F5] border border-[#E8E8E6] flex items-center justify-center">
                <Globe className="h-3.5 w-3.5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">OAuth & Webhook URLs</h3>
            </div>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              Whitelisted callback and webhook URLs resolved from your environment variables. Copy these directly into your Meta App configuration under <strong>WhatsApp &gt; Configuration</strong>, <strong>Webhooks</strong>, and <strong>Facebook Login &gt; Settings</strong>.
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4">
            {/* Webhook Callback URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Webhook Callback URL
                </label>
                <span className="text-[9.5px] text-zinc-400 font-medium">Environment endpoint for WhatsApp, Instagram & Messenger</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookCallbackUrl}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(webhookCallbackUrl, 'webhook')}
                  className="h-9 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black rounded-md flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-3xs"
                  aria-label="Copy Webhook URL"
                  title="Copy Webhook Callback URL"
                >
                  {copiedField === 'webhook' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Paste into Meta Developer Dashboard &gt; <strong>WhatsApp / Webhooks &gt; Callback URL</strong>.
              </p>
            </div>

            {/* Webhook Verify Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Webhook Verify Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="whatsomni_meta_token"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-700 focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(verifyToken, 'verify_token')}
                  className="h-9 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black rounded-md flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-3xs"
                  aria-label="Copy Verify Token"
                  title="Copy Verify Token"
                >
                  {copiedField === 'verify_token' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Paste into Meta Developer Dashboard &gt; <strong>WhatsApp / Webhooks &gt; Verify Token</strong>.
              </p>
            </div>

            {/* OAuth Callback */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Valid OAuth Redirect URI
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={oauthCallbackUrl}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono text-zinc-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(oauthCallbackUrl, 'oauth')}
                  className="h-9 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black rounded-md flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-3xs"
                  aria-label="Copy OAuth Callback URL"
                  title="Copy Valid OAuth Redirect URI"
                >
                  {copiedField === 'oauth' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Paste into Meta Developer Dashboard &gt; <strong>Facebook Login &gt; Settings &gt; Valid OAuth Redirect URIs</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Action Save Footer */}
        <div className="px-4 sm:px-6 md:px-8 py-5 flex items-center justify-between gap-3 select-none">
          <div className="text-[11px] text-zinc-400 font-medium">
            {appId ? (
              <span className="text-zinc-600">Configured App ID: <strong className="font-mono text-zinc-800">{appId}</strong></span>
            ) : (
              <span>No Meta Developer App configured</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(appId || hasExistingSecret) && (
              <button
                type="button"
                disabled={saving}
                onClick={handleClearCredentials}
                className="h-9 px-4 border border-[#E8E8E6] hover:border-red-300 hover:bg-red-50/60 text-red-600 hover:text-red-700 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Credentials</span>
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </form>

    </div>
  );
}
