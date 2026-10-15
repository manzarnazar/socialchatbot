'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { fetchWithCsrf } from '@/lib/api';
import { echo } from '@/lib/echo';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { 
  RefreshCw,
  Copy,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Trash2,
  Loader2,
  Check,
  ExternalLink,
  KeyRound,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  renderChannelLogo,
  WhatsAppConnection,
  BaileysConnection,
  InstagramConnection,
  FacebookMessengerConnection,
  TelegramConnection,
  SmsConnection,
  EmailConnection,
  TikTokConnection,
  LinkedInConnection
} from '../channelsTypes';

let metaSdkPromise: Promise<any> | null = null;
let currentLoadedAppId: string | null = null;

const loadMetaSdk = (appId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Meta SDK cannot load outside of a browser window.'));
    }

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      return reject(
        new Error(
          'Meta Embedded Signup requires an HTTPS connection. Meta disallows calling FB.login from non-localhost HTTP pages.'
        )
      );
    }

    if ((window as any).FB && (window as any).__metaSdkInitialized && currentLoadedAppId === appId) {
      return resolve((window as any).FB);
    }

    if (metaSdkPromise && currentLoadedAppId === appId) {
      return metaSdkPromise.then(resolve).catch(reject);
    }

    metaSdkPromise = new Promise((innerResolve, innerReject) => {
      const timeoutId = setTimeout(() => {
        innerReject(new Error('Meta SDK initialization timed out (10s). Please check your internet connection or ad blockers.'));
      }, 10000);

      (window as any).fbAsyncInit = function () {
        try {
          (window as any).FB.init({
            appId: appId,
            cookie: true,
            xfbml: false,
            version: 'v21.0',
          });
          (window as any).__metaSdkInitialized = true;
          currentLoadedAppId = appId;
          clearTimeout(timeoutId);
          innerResolve((window as any).FB);
        } catch (err: any) {
          clearTimeout(timeoutId);
          innerReject(err || new Error('Failed to initialize Meta SDK.'));
        }
      };

      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        if ((window as any).FB) {
          try {
            (window as any).FB.init({
              appId: appId,
              cookie: true,
              xfbml: false,
              version: 'v21.0',
            });
            (window as any).__metaSdkInitialized = true;
            currentLoadedAppId = appId;
            clearTimeout(timeoutId);
            return innerResolve((window as any).FB);
          } catch (err: any) {
            clearTimeout(timeoutId);
            return innerReject(err || new Error('Failed to re-initialize Meta SDK.'));
          }
        }
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        clearTimeout(timeoutId);
        innerReject(new Error('Failed to download Meta JavaScript SDK. Please check your network or ad blockers.'));
      };
      document.body.appendChild(script);
    });

    metaSdkPromise.then(resolve).catch(reject);
  });
};

const renderWebhookInfo = (webhookUrl: string, verifyToken?: string, t?: any) => {
  return (
    <div className="bg-[#FAFAFA] border border-[#E8E8E6] p-3.5 rounded-lg space-y-3 mb-4 text-xs font-medium text-zinc-700">
      <div className="space-y-1.5">
        <span className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('callbackLabel') || 'Callback Webhook URL'}</span>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            readOnly 
            value={webhookUrl} 
            className="flex-1 h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md font-mono text-[11px] select-all outline-none text-zinc-900"
          />
          <button 
            type="button" 
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              toast.success(t('toastWebhookUrlCopied') || 'Webhook URL copied!');
            }}
            className="h-8 px-2.5 bg-white border border-[#E8E8E6] hover:bg-zinc-50 hover:text-black rounded-md transition-all cursor-pointer shadow-3xs flex items-center justify-center text-zinc-600 shrink-0"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {verifyToken && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('verifyTokenLabel') || 'Webhook Verify Token'}</span>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={verifyToken} 
              className="flex-1 h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md font-mono text-[11px] select-all outline-none text-zinc-900"
            />
            <button 
              type="button" 
              onClick={() => {
                navigator.clipboard.writeText(verifyToken);
                toast.success(t('toastVerifyTokenCopied') || 'Verify Token copied!');
              }}
              className="h-8 px-2.5 bg-white border border-[#E8E8E6] hover:bg-zinc-50 hover:text-black rounded-md transition-all cursor-pointer shadow-3xs flex items-center justify-center text-zinc-600 shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export interface ChannelConfigModalProps {
  selectedChannelSlug: string;
  editingConnection: any;
  onClose: () => void;
  onSuccess: (channelSlug: string) => Promise<void> | void;
  onDisconnectRequested?: (target: { id?: number; slug: string; name?: string }) => void;
  channelConnectionModes: Record<string, string>;
  metaAppId: string;
  metaConfigIds: Record<string, string>;
  userPlan?: any;
  setLockedChannelInfo: (info: { title: string; desc: string; name: string } | null) => void;
  setLockModalOpen: (open: boolean) => void;
  whatsappConnected?: boolean;
  whatsappDetails?: WhatsAppConnection | null;
  instagramConnected?: boolean;
  instagramDetails?: InstagramConnection | null;
  messengerConnected?: boolean;
  messengerDetails?: FacebookMessengerConnection | null;
  telegramConnected?: boolean;
  telegramDetails?: TelegramConnection | null;
  smsConnected?: boolean;
  smsDetails?: SmsConnection | null;
  emailConnected?: boolean;
  emailDetails?: EmailConnection | null;
  tiktokConnected?: boolean;
  tiktokDetails?: TikTokConnection | null;
  linkedinConnected?: boolean;
  linkedinDetails?: LinkedInConnection | null;
  baileysConnected?: boolean;
  baileysDetails?: BaileysConnection | null;
}

export default function ChannelConfigModal({
  selectedChannelSlug,
  editingConnection,
  onClose,
  onSuccess,
  onDisconnectRequested,
  channelConnectionModes,
  metaAppId,
  metaConfigIds,
  userPlan,
  setLockedChannelInfo,
  setLockModalOpen,
  whatsappConnected = false,
  whatsappDetails = null,
  instagramConnected = false,
  instagramDetails = null,
  messengerConnected = false,
  messengerDetails = null,
  telegramConnected = false,
  telegramDetails = null,
  smsConnected = false,
  smsDetails = null,
  emailConnected = false,
  emailDetails = null,
  tiktokConnected = false,
  tiktokDetails = null,
  linkedinConnected = false,
  linkedinDetails = null,
  baileysConnected = false,
  baileysDetails = null,
}: ChannelConfigModalProps) {
  const t = useTranslations('Channels');
  const tCommon = useTranslations('Common');
  const tPlanLock = useTranslations('PlanLock');

  const editingConnectionId = editingConnection?.id || null;

  // General Modal States
  const [isSaving, setIsSaving] = useState(false);
  const [metaSdkLoading, setMetaSdkLoading] = useState(false);

  // Tab selections
  const [whatsappTab, setWhatsappTab] = useState<'embedded' | 'manual'>('embedded');
  const [instagramTab, setInstagramTab] = useState<'embedded' | 'manual'>('embedded');
  const [messengerTab, setMessengerTab] = useState<'embedded' | 'manual'>('embedded');
  const [emailStep, setEmailStep] = useState<number>(editingConnection ? 2 : 1);
  const [smsStep, setSmsStep] = useState<number>(editingConnection ? 2 : 1);
  const [smsProviderDropdownOpen, setSmsProviderDropdownOpen] = useState(false);
  const [emailSmtpEncDropdownOpen, setEmailSmtpEncDropdownOpen] = useState(false);
  const [emailImapEncDropdownOpen, setEmailImapEncDropdownOpen] = useState(false);

  // WhatsApp Cloud API Form Inputs
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [wabaInput, setWabaInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);

  // WhatsApp Baileys Form Inputs & Sockets
  const [baileysQr, setBaileysQr] = useState<string>('');
  const [baileysNameInput, setBaileysNameInput] = useState('');
  const [baileysConnecting, setBaileysConnecting] = useState(false);
  const [baileysNicknameRequired, setBaileysNicknameRequired] = useState(false);
  const baileysIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baileysConnectionIdRef = useRef<number | null>(null);

  // Instagram Form Inputs
  const [instagramNameInput, setInstagramNameInput] = useState('');
  const [instagramPageIdInput, setInstagramPageIdInput] = useState('');
  const [instagramAccountIdInput, setInstagramAccountIdInput] = useState('');
  const [instagramTokenInput, setInstagramTokenInput] = useState('');
  const [instagramSecretInput, setInstagramSecretInput] = useState('');

  // Messenger Form Inputs
  const [messengerNameInput, setMessengerNameInput] = useState('');
  const [messengerPageIdInput, setMessengerPageIdInput] = useState('');
  const [messengerTokenInput, setMessengerTokenInput] = useState('');
  const [messengerSecretInput, setMessengerSecretInput] = useState('');

  // Telegram Form Inputs
  const [telegramNameInput, setTelegramNameInput] = useState('');
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [telegramConnecting, setTelegramConnecting] = useState(false);

  // TikTok Form Inputs
  const [tiktokNameInput, setTiktokNameInput] = useState('');
  const [tiktokHandleInput, setTiktokHandleInput] = useState('');
  const [tiktokOpenIdInput, setTiktokOpenIdInput] = useState('');
  const [tiktokTokenInput, setTiktokTokenInput] = useState('');
  const [tiktokClientSecretInput, setTiktokClientSecretInput] = useState('');
  const [showTikTokToken, setShowTikTokToken] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);

  // LinkedIn Form Inputs
  const [linkedinNameInput, setLinkedinNameInput] = useState('');
  const [linkedinAuthorTypeInput, setLinkedinAuthorTypeInput] = useState<'organization' | 'person'>('organization');
  const [linkedinAuthorUrnInput, setLinkedinAuthorUrnInput] = useState('');
  const [linkedinTokenInput, setLinkedinTokenInput] = useState('');
  const [linkedinClientSecretInput, setLinkedinClientSecretInput] = useState('');
  const [showLinkedInToken, setShowLinkedInToken] = useState(false);
  const [linkedinConnecting, setLinkedinConnecting] = useState(false);

  // SMS Form Inputs
  const [smsNameInput, setSmsNameInput] = useState('');
  const [smsProvider, setSmsProvider] = useState<'twilio' | 'vonage' | 'plivo' | 'messagebird' | 'sinch' | 'telnyx'>('twilio');
  const [smsConnecting, setSmsConnecting] = useState(false);
  const [smsTwilioSidInput, setSmsTwilioSidInput] = useState('');
  const [smsTwilioTokenInput, setSmsTwilioTokenInput] = useState('');
  const [smsTwilioPhoneInput, setSmsTwilioPhoneInput] = useState('');
  const [smsVonageKeyInput, setSmsVonageKeyInput] = useState('');
  const [smsVonageSecretInput, setSmsVonageSecretInput] = useState('');
  const [smsVonagePhoneInput, setSmsVonagePhoneInput] = useState('');
  const [smsPlivoAuthIdInput, setSmsPlivoAuthIdInput] = useState('');
  const [smsPlivoAuthTokenInput, setSmsPlivoAuthTokenInput] = useState('');
  const [smsPlivoPhoneInput, setSmsPlivoPhoneInput] = useState('');
  const [smsMessagebirdKeyInput, setSmsMessagebirdKeyInput] = useState('');
  const [smsMessagebirdPhoneInput, setSmsMessagebirdPhoneInput] = useState('');
  const [smsSinchPlanIdInput, setSmsSinchPlanIdInput] = useState('');
  const [smsSinchTokenInput, setSmsSinchTokenInput] = useState('');
  const [smsSinchPhoneInput, setSmsSinchPhoneInput] = useState('');
  const [smsTelnyxKeyInput, setSmsTelnyxKeyInput] = useState('');
  const [smsTelnyxPhoneInput, setSmsTelnyxPhoneInput] = useState('');
  const [showSmsTwilioToken, setShowSmsTwilioToken] = useState(false);
  const [showSmsVonageSecret, setShowSmsVonageSecret] = useState(false);
  const [showSmsPlivoToken, setShowSmsPlivoToken] = useState(false);
  const [showSmsMessagebirdKey, setShowSmsMessagebirdKey] = useState(false);
  const [showSmsSinchToken, setShowSmsSinchToken] = useState(false);
  const [showSmsTelnyxKey, setShowSmsTelnyxKey] = useState(false);

  // Email Form Inputs
  const [emailNameInput, setEmailNameInput] = useState('');
  const [emailAddressInput, setEmailAddressInput] = useState('');
  const [emailSmtpHostInput, setEmailSmtpHostInput] = useState('');
  const [emailSmtpPortInput, setEmailSmtpPortInput] = useState('587');
  const [emailSmtpUserInput, setEmailSmtpUserInput] = useState('');
  const [emailSmtpPassInput, setEmailSmtpPassInput] = useState('');
  const [emailSmtpEncInput, setEmailSmtpEncInput] = useState<'none' | 'ssl' | 'tls'>('tls');
  const [emailImapHostInput, setEmailImapHostInput] = useState('');
  const [emailImapPortInput, setEmailImapPortInput] = useState('993');
  const [emailImapUserInput, setEmailImapUserInput] = useState('');
  const [emailImapPassInput, setEmailImapPassInput] = useState('');
  const [emailImapEncInput, setEmailImapEncInput] = useState<'none' | 'ssl' | 'tls'>('ssl');
  const [showEmailSmtpPass, setShowEmailSmtpPass] = useState(false);
  const [showEmailImapPass, setShowEmailImapPass] = useState(false);
  const [emailConnecting, setEmailConnecting] = useState(false);
  const emailProvider = 'smtp';

  const whatsappMode = channelConnectionModes?.['whatsapp_cloud'] || 'both';
  const instagramMode = channelConnectionModes?.['instagram'] || 'both';
  const messengerMode = channelConnectionModes?.['messenger'] || 'both';

  // Initialize fields on open or change of editingConnection
  useEffect(() => {
    const channelMode = channelConnectionModes?.[selectedChannelSlug] || 'both';
    if (channelMode === 'manual' || editingConnection?.connection_mode === 'manual') {
      if (selectedChannelSlug === 'whatsapp_cloud') setWhatsappTab('manual');
      if (selectedChannelSlug === 'instagram') setInstagramTab('manual');
      if (selectedChannelSlug === 'messenger') setMessengerTab('manual');
    } else {
      if (selectedChannelSlug === 'whatsapp_cloud') setWhatsappTab('embedded');
      if (selectedChannelSlug === 'instagram') setInstagramTab('embedded');
      if (selectedChannelSlug === 'messenger') setMessengerTab('embedded');
    }

    if (editingConnection) {
      if (selectedChannelSlug === 'whatsapp_cloud') {
        setNameInput(editingConnection.name || '');
        setPhoneInput(editingConnection.phone_number_id || '');
        setWabaInput(editingConnection.whatsapp_business_account_id || '');
        setSecretInput(editingConnection.webhook_secret || '');
        setTokenInput(editingConnection.raw_credentials?.system_user_access_token || '');
      } else if (selectedChannelSlug === 'instagram') {
        setInstagramNameInput(editingConnection.name || '');
        setInstagramPageIdInput(editingConnection.details?.page_id || editingConnection.page_id || '');
        setInstagramAccountIdInput(editingConnection.details?.instagram_business_account_id || editingConnection.instagram_business_account_id || '');
        setInstagramTokenInput(editingConnection.raw_credentials?.page_access_token || '');
        setInstagramSecretInput(editingConnection.raw_credentials?.app_secret || editingConnection.raw_credentials?.webhook_secret || '');
      } else if (selectedChannelSlug === 'messenger') {
        setMessengerNameInput(editingConnection.name || '');
        setMessengerPageIdInput(editingConnection.details?.page_id || editingConnection.page_id || '');
        setMessengerTokenInput(editingConnection.raw_credentials?.page_access_token || '');
        setMessengerSecretInput(editingConnection.raw_credentials?.app_secret || editingConnection.raw_credentials?.webhook_secret || '');
      } else if (selectedChannelSlug === 'whatsapp_baileys') {
        setBaileysNameInput(editingConnection.name || '');
        setBaileysQr('');
        setBaileysNicknameRequired(false);
      } else if (selectedChannelSlug === 'telegram') {
        setTelegramNameInput(editingConnection.name || '');
        setTelegramTokenInput(editingConnection.raw_credentials?.token || '');
      } else if (selectedChannelSlug === 'tiktok') {
        setTiktokNameInput(editingConnection.name || '');
        setTiktokHandleInput(editingConnection.raw_credentials?.handle || editingConnection.handle || '');
        setTiktokOpenIdInput(editingConnection.raw_credentials?.open_id || editingConnection.open_id || '');
        setTiktokTokenInput(editingConnection.raw_credentials?.access_token || '');
        setTiktokClientSecretInput(editingConnection.raw_credentials?.client_secret || '');
      } else if (selectedChannelSlug === 'linkedin') {
        setLinkedinNameInput(editingConnection.name || '');
        setLinkedinAuthorTypeInput(editingConnection.raw_credentials?.author_type || editingConnection.author_type || 'organization');
        setLinkedinAuthorUrnInput(editingConnection.raw_credentials?.author_urn || editingConnection.author_urn || '');
        setLinkedinTokenInput(editingConnection.raw_credentials?.access_token || '');
        setLinkedinClientSecretInput(editingConnection.raw_credentials?.client_secret || '');
      } else if (selectedChannelSlug === 'sms') {
        setSmsNameInput(editingConnection.name || '');
        const provider = editingConnection.provider || 'twilio';
        setSmsProvider(provider);
        const raw = editingConnection.raw_credentials || {};
        if (provider === 'twilio') {
          setSmsTwilioSidInput(raw.twilio_account_sid || '');
          setSmsTwilioTokenInput(raw.twilio_auth_token || '');
          setSmsTwilioPhoneInput(raw.twilio_phone_number || '');
        } else if (provider === 'vonage') {
          setSmsVonageKeyInput(raw.vonage_api_key || '');
          setSmsVonageSecretInput(raw.vonage_api_secret || '');
          setSmsVonagePhoneInput(raw.vonage_phone_number || '');
        } else if (provider === 'plivo') {
          setSmsPlivoAuthIdInput(raw.plivo_auth_id || '');
          setSmsPlivoAuthTokenInput(raw.plivo_auth_token || '');
          setSmsPlivoPhoneInput(raw.plivo_phone_number || '');
        } else if (provider === 'messagebird') {
          setSmsMessagebirdKeyInput(raw.messagebird_api_key || '');
          setSmsMessagebirdPhoneInput(raw.messagebird_phone_number || '');
        } else if (provider === 'sinch') {
          setSmsSinchPlanIdInput(raw.sinch_service_plan_id || '');
          setSmsSinchTokenInput(raw.sinch_api_token || '');
          setSmsSinchPhoneInput(raw.sinch_phone_number || '');
        } else if (provider === 'telnyx') {
          setSmsTelnyxKeyInput(raw.telnyx_api_key || '');
          setSmsTelnyxPhoneInput(raw.telnyx_phone_number || '');
        }
      } else if (selectedChannelSlug === 'email') {
        setEmailNameInput(editingConnection.name || '');
        const raw = editingConnection.raw_credentials || {};
        setEmailAddressInput(raw.email_address || raw.email || '');
        setEmailSmtpHostInput(raw.smtp_host || '');
        setEmailSmtpPortInput(String(raw.smtp_port || '587'));
        setEmailSmtpUserInput(raw.smtp_username || '');
        setEmailSmtpPassInput(raw.smtp_password || '');
        setEmailSmtpEncInput(raw.smtp_encryption || 'tls');
        setEmailImapHostInput(raw.imap_host || '');
        setEmailImapPortInput(String(raw.imap_port || '993'));
        setEmailImapUserInput(raw.imap_username || '');
        setEmailImapPassInput(raw.imap_password || '');
        setEmailImapEncInput(raw.imap_encryption || 'ssl');
      }
    } else {
      if (selectedChannelSlug === 'whatsapp_baileys') {
        setTimeout(() => {
          triggerConnectBaileys();
        }, 50);
      }
    }

    return () => {
      if (baileysIntervalRef.current) {
        clearInterval(baileysIntervalRef.current);
      }
      if (echo && baileysConnectionIdRef.current) {
        echo.leave(`channel-connection.${baileysConnectionIdRef.current}`);
      }
    };
  }, [selectedChannelSlug, editingConnection, channelConnectionModes]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (baileysIntervalRef.current) {
        clearInterval(baileysIntervalRef.current);
      }
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // WhatsApp Cloud Handlers
  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !phoneInput || !wabaInput || !tokenInput) {
      toast.error(t('toastFillRequiredFields'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify({
          id: editingConnectionId || undefined,
          name: nameInput,
          phone_number_id: phoneInput,
          whatsapp_business_account_id: wabaInput,
          system_user_access_token: tokenInput,
          webhook_secret: secretInput,
        })
      });
      if (res.ok) {
        toast.success(t('toastWhatsappConnectSuccess'));
        await onSuccess('whatsapp_cloud');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastWhatsappConnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setIsSaving(false);
    }
  };

  const launchWhatsAppEmbeddedSignup = async () => {
    if (!metaAppId) {
      toast.error(t('metaNotConfigured') || 'Embedded connection is temporarily unavailable. Please connect via Manual API Keys (BYOK) or contact support.');
      return;
    }

    setMetaSdkLoading(true);

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !isLocalhost) {
      toast.error(t('toastMetaHttpsRequired') || 'Meta Embedded Signup requires an HTTPS connection. Please access via https:// or use Manual API Keys (BYOK).');
      return;
    }
    try {
      const FB = await loadMetaSdk(metaAppId);

      let sessionWabaId: string | null = null;
      let sessionPhoneId: string | null = null;

      const messageListener = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (raw && (raw.type === 'WA_EMBEDDED_SIGNUP' || raw.event === 'whatsapp_embedded_signup' || raw.event === 'FINISH')) {
            const waba = raw.data?.waba_id || raw.data?.whatsapp_business_account_id || raw.data?.account_id || raw.waba_id || null;
            const phone = raw.data?.phone_number_id || raw.phone_number_id || null;
            if (waba) sessionWabaId = String(waba);
            if (phone) sessionPhoneId = String(phone);
          }
        } catch {}
      };
      window.addEventListener('message', messageListener);

      const loginOptions: any = {
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: '2',
        }
      };
      if (metaConfigIds.whatsapp) {
        loginOptions.config_id = metaConfigIds.whatsapp;
      } else {
        loginOptions.scope = 'whatsapp_business_management,whatsapp_business_messaging';
      }

      FB.login((response: any) => {
        window.removeEventListener('message', messageListener);
        if (response.authResponse && (response.authResponse.code || response.authResponse.accessToken)) {
          const authCode = response.authResponse.code || response.authResponse.accessToken;
          exchangeWhatsAppEmbeddedCode(authCode, sessionWabaId, sessionPhoneId);
        } else {
          setMetaSdkLoading(false);
          if (response.status !== 'unknown') {
            toast.error(t('toastMetaAuthCancelled') || 'Meta authorization was cancelled or incomplete.');
          }
        }
      }, loginOptions);
    } catch (err: any) {
      setMetaSdkLoading(false);
      toast.error(err.message || 'Failed to initialize Meta SDK.');
    }
  };

  const exchangeWhatsAppEmbeddedCode = async (code: string, wabaId?: string | null, phoneId?: string | null) => {
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/whatsapp/embedded/exchange', {
        method: 'POST',
        body: JSON.stringify({
          code,
          waba_id: wabaId || undefined,
          phone_number_id: phoneId || undefined,
          name: nameInput || 'WhatsApp Official (Embedded)',
        })
      });
      if (res.ok) {
        toast.success(t('toastWhatsappConnectSuccess') || 'WhatsApp connected successfully via Meta!');
        await onSuccess('whatsapp_cloud');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastWhatsappConnectFailed') || 'Failed to exchange Meta authorization code.');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error.');
    } finally {
      setIsSaving(false);
      setMetaSdkLoading(false);
    }
  };

  // WhatsApp Baileys Handlers
  const triggerConnectBaileys = async (id?: number) => {
    setBaileysConnecting(true);
    setBaileysQr('');
    setBaileysNicknameRequired(false);
    if (baileysIntervalRef.current) {
      clearInterval(baileysIntervalRef.current);
    }
    try {
      const res = await fetchWithCsrf('/integrations/baileys/connect', {
        method: 'POST',
        body: JSON.stringify({ id: id || undefined, name: 'WhatsApp Baileys' })
      });
      if (res.ok) {
        const data = await res.json();
        const connectionId = data.id as number;
        baileysConnectionIdRef.current = connectionId;

        if (data.qr) {
          setBaileysQr(data.qr);
          setBaileysConnecting(false);
        }

        const qrTimeout = setTimeout(() => {
          setBaileysConnecting(false);
        }, 35000);

        if (echo) {
          echo.channel(`channel-connection.${connectionId}`)
            .listen('.whatsapp.baileys.qr', (eventData: { qr: string }) => {
              if (eventData.qr) {
                setBaileysQr(eventData.qr);
                setBaileysConnecting(false);
                clearTimeout(qrTimeout);
              }
            });
        }

        const interval = setInterval(async () => {
          try {
            const statusRes = await fetchWithCsrf('/integrations/baileys/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.qr) {
                setBaileysQr(statusData.qr);
                setBaileysConnecting(false);
                clearTimeout(qrTimeout);
              }

              if (statusData.connected && statusData.status === 'connected') {
                await onSuccess('whatsapp_baileys');
                setBaileysQr('');
                setBaileysNameInput('');
                setBaileysNicknameRequired(true);
                
                if (baileysIntervalRef.current) {
                  clearInterval(baileysIntervalRef.current);
                }
                if (echo) {
                  echo.leave(`channel-connection.${connectionId}`);
                }
                return;
              }
            }

            if (!baileysQr && connectionId) {
              const directQrRes = await fetchWithCsrf(`/integrations/baileys/qr/${connectionId}`);
              if (directQrRes.ok) {
                const directQrData = await directQrRes.json();
                if (directQrData.qr) {
                  setBaileysQr(directQrData.qr);
                  setBaileysConnecting(false);
                  clearTimeout(qrTimeout);
                }
              }
            }
          } catch {}
        }, 2000);

        baileysIntervalRef.current = interval;
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to initialize Baileys session.');
        setBaileysConnecting(false);
        onClose();
      }
    } catch {
      toast.error(t('toastNetworkError'));
      setBaileysConnecting(false);
      onClose();
    }
  };

  const handleSaveBaileysNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baileysNameInput) {
      toast.error(t('toastBaileysNameRequired'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/baileys/connect', {
        method: 'POST',
        body: JSON.stringify({ id: baileysConnectionIdRef.current || undefined, name: baileysNameInput })
      });
      if (res.ok) {
        toast.success(t('toastBaileysConnectSuccess'));
        await onSuccess('whatsapp_baileys');
        setBaileysNicknameRequired(false);
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastSaveBaileysNicknameFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Instagram Handlers
  const launchInstagramEmbeddedSignup = async () => {
    if (!metaAppId) {
      toast.error(t('metaNotConfigured') || 'Embedded connection is temporarily unavailable. Please connect via Manual API Keys (BYOK) or contact support.');
      return;
    }

    setMetaSdkLoading(true);

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !isLocalhost) {
      toast.error(t('toastMetaHttpsRequired') || 'Meta Embedded Signup requires an HTTPS connection. Please access via https:// or use Manual API Keys (BYOK).');
      return;
    }
    try {
      const FB = await loadMetaSdk(metaAppId);
      FB.login((response: any) => {
        if (response.authResponse && (response.authResponse.code || response.authResponse.accessToken)) {
          const authCode = response.authResponse.code || response.authResponse.accessToken;
          exchangeInstagramEmbeddedCode(authCode);
        } else {
          setMetaSdkLoading(false);
          if (response.status !== 'unknown') {
            toast.error(t('toastMetaAuthCancelled') || 'Meta authorization was cancelled or incomplete.');
          }
        }
      }, {
        config_id: metaConfigIds.instagram || undefined,
        response_type: 'code',
        override_default_response_type: true,
        scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement',
      });
    } catch (err: any) {
      setMetaSdkLoading(false);
      toast.error(err.message || 'Failed to initialize Meta SDK.');
    }
  };

  const exchangeInstagramEmbeddedCode = async (code: string) => {
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/instagram/embedded/exchange', {
        method: 'POST',
        body: JSON.stringify({
          code,
          name: instagramNameInput || 'Instagram Direct (Embedded)',
        })
      });
      if (res.ok) {
        toast.success(t('toastInstagramConnectSuccess') || 'Instagram Direct connected successfully via Meta!');
        await onSuccess('instagram');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to connect Instagram via Meta.');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error.');
    } finally {
      setIsSaving(false);
      setMetaSdkLoading(false);
    }
  };

  const handleConnectInstagramManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramPageIdInput || !instagramAccountIdInput || !instagramTokenInput) {
      toast.error(t('toastInstagramFieldsRequired') || 'Please fill in Facebook Page ID, Instagram Account ID, and Page Access Token.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/instagram/manual/connect', {
        method: 'POST',
        body: JSON.stringify({
          id: editingConnectionId || undefined,
          name: instagramNameInput || 'Instagram Direct',
          page_id: instagramPageIdInput,
          instagram_business_account_id: instagramAccountIdInput,
          page_access_token: instagramTokenInput,
          app_secret: instagramSecretInput || undefined,
        })
      });
      if (res.ok) {
        toast.success(t('toastInstagramConnectSuccess') || 'Instagram Direct connected successfully with your manual API keys!');
        await onSuccess('instagram');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to connect Instagram Direct.');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  // Messenger Handlers
  const launchMessengerEmbeddedSignup = async () => {
    if (!metaAppId) {
      toast.error(t('metaNotConfigured') || 'Embedded connection is temporarily unavailable. Please connect via Manual API Keys (BYOK) or contact support.');
      return;
    }

    setMetaSdkLoading(true);

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !isLocalhost) {
      toast.error(t('toastMetaHttpsRequired') || 'Meta Embedded Signup requires an HTTPS connection. Please access via https:// or use Manual API Keys (BYOK).');
      return;
    }
    try {
      const FB = await loadMetaSdk(metaAppId);
      FB.login((response: any) => {
        if (response.authResponse && (response.authResponse.code || response.authResponse.accessToken)) {
          const authCode = response.authResponse.code || response.authResponse.accessToken;
          exchangeMessengerEmbeddedCode(authCode);
        } else {
          setMetaSdkLoading(false);
          if (response.status !== 'unknown') {
            toast.error(t('toastMetaAuthCancelled') || 'Meta authorization was cancelled or incomplete.');
          }
        }
      }, {
        config_id: metaConfigIds.messenger || undefined,
        response_type: 'code',
        override_default_response_type: true,
        scope: 'pages_show_list,pages_messaging,pages_read_engagement',
      });
    } catch (err: any) {
      setMetaSdkLoading(false);
      toast.error(err.message || 'Failed to initialize Meta SDK.');
    }
  };

  const exchangeMessengerEmbeddedCode = async (code: string) => {
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/messenger/embedded/exchange', {
        method: 'POST',
        body: JSON.stringify({
          code,
          name: messengerNameInput || 'Facebook Messenger (Embedded)',
        })
      });
      if (res.ok) {
        toast.success(t('toastMessengerConnectSuccess') || 'Facebook Messenger connected successfully via Meta!');
        await onSuccess('messenger');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to connect Messenger via Meta.');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error.');
    } finally {
      setIsSaving(false);
      setMetaSdkLoading(false);
    }
  };

  const handleConnectMessengerManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messengerPageIdInput || !messengerTokenInput) {
      toast.error(t('toastMessengerFieldsRequired') || 'Please fill in Facebook Page ID and Page Access Token.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetchWithCsrf('/integrations/messenger/manual/connect', {
        method: 'POST',
        body: JSON.stringify({
          id: editingConnectionId || undefined,
          name: messengerNameInput || 'Facebook Messenger Page',
          page_id: messengerPageIdInput,
          page_access_token: messengerTokenInput,
          app_secret: messengerSecretInput || undefined,
        })
      });
      if (res.ok) {
        toast.success(t('toastMessengerConnectSuccess') || 'Facebook Messenger connected successfully with your manual API keys!');
        await onSuccess('messenger');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to connect Facebook Messenger.');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  // Telegram Handlers
  const handleConnectTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramNameInput || !telegramTokenInput) {
      toast.error(t('toastTelegramCredentialsRequired'));
      return;
    }
    setTelegramConnecting(true);
    try {
      const res = await fetchWithCsrf('/integrations/telegram/connect', {
        method: 'POST',
        body: JSON.stringify({ id: editingConnectionId || undefined, name: telegramNameInput, token: telegramTokenInput })
      });
      if (res.ok) {
        toast.success(t('toastTelegramConnectSuccess'));
        await onSuccess('telegram');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastTelegramConnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setTelegramConnecting(false);
    }
  };

  // TikTok Handlers
  const handleConnectTikTok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokNameInput || !tiktokHandleInput || !tiktokOpenIdInput || !tiktokTokenInput) {
      toast.error(t('toastTikTokFieldsRequired') || 'Please fill in Account Name, Handle, Open ID, and Access Token.');
      return;
    }
    setTiktokConnecting(true);
    try {
      const res = await fetchWithCsrf('/integrations/tiktok/connect', {
        method: 'POST',
        body: JSON.stringify({
          id: editingConnectionId || undefined,
          name: tiktokNameInput,
          handle: tiktokHandleInput,
          open_id: tiktokOpenIdInput,
          access_token: tiktokTokenInput,
          client_secret: tiktokClientSecretInput || undefined,
        })
      });
      if (res.ok) {
        toast.success(t('toastTikTokConnectSuccess') || 'TikTok account connected successfully!');
        await onSuccess('tiktok');
        onClose();
      } else {
        const err = await res.json();
        if (err.error_code && err.error_code.includes('PLAN')) {
          setLockedChannelInfo({
            title: tPlanLock('lockedFeature'),
            desc: err.message || tPlanLock('channelLockedDesc'),
            name: 'TikTok'
          });
          setLockModalOpen(true);
        } else {
          toast.error(err.message || 'Failed to connect TikTok account.');
        }
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setTiktokConnecting(false);
    }
  };

  const handleOAuthTikTok = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/tiktok/redirect');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'TikTok OAuth authorization failed.');
      }
    } catch {
      toast.error(t('toastTikTokOAuthFailed') || 'Failed to initiate TikTok OAuth authorization.');
    }
  };

  // LinkedIn Handlers
  const handleConnectLinkedIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinNameInput || !linkedinAuthorUrnInput || !linkedinTokenInput) {
      toast.error(t('toastLinkedInFieldsRequired') || 'Please fill in Account Name, Author URN / Organization ID, and Access Token.');
      return;
    }
    setLinkedinConnecting(true);
    try {
      const res = await fetchWithCsrf('/integrations/linkedin/connect', {
        method: 'POST',
        body: JSON.stringify({
          id: editingConnectionId || undefined,
          name: linkedinNameInput,
          author_type: linkedinAuthorTypeInput,
          author_urn: linkedinAuthorUrnInput,
          access_token: linkedinTokenInput,
          client_secret: linkedinClientSecretInput || undefined,
        })
      });
      if (res.ok) {
        toast.success(t('toastLinkedInConnectSuccess') || 'LinkedIn account connected successfully!');
        await onSuccess('linkedin');
        onClose();
      } else {
        const err = await res.json();
        if (err.error_code && err.error_code.includes('PLAN')) {
          setLockedChannelInfo({
            title: tPlanLock('lockedFeature'),
            desc: err.message || tPlanLock('channelLockedDesc'),
            name: 'LinkedIn'
          });
          setLockModalOpen(true);
        } else {
          toast.error(err.message || 'Failed to connect LinkedIn account.');
        }
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setLinkedinConnecting(false);
    }
  };

  const handleOAuthLinkedIn = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/linkedin/redirect');
      if (res.ok) {
        const data = await res.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'LinkedIn OAuth authorization failed.');
      }
    } catch {
      toast.error(t('toastLinkedInOAuthFailed') || 'Failed to initiate LinkedIn OAuth authorization.');
    }
  };

  // SMS Handlers
  const handleConnectSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsNameInput) {
      toast.error(t('toastSmsNameRequired'));
      return;
    }

    const payload: Record<string, string | number | boolean | undefined> = {
      id: editingConnectionId || undefined,
      name: smsNameInput,
      provider: smsProvider
    };

    if (smsProvider === 'twilio') {
      if (!smsTwilioSidInput || !smsTwilioTokenInput || !smsTwilioPhoneInput) {
        toast.error(t('toastTwilioCredentialsRequired'));
        return;
      }
      payload.twilio_account_sid = smsTwilioSidInput;
      payload.twilio_auth_token = smsTwilioTokenInput;
      payload.twilio_phone_number = smsTwilioPhoneInput;
    } else if (smsProvider === 'vonage') {
      if (!smsVonageKeyInput || !smsVonageSecretInput || !smsVonagePhoneInput) {
        toast.error(t('toastVonageCredentialsRequired'));
        return;
      }
      payload.vonage_api_key = smsVonageKeyInput;
      payload.vonage_api_secret = smsVonageSecretInput;
      payload.vonage_phone_number = smsVonagePhoneInput;
    } else if (smsProvider === 'plivo') {
      if (!smsPlivoAuthIdInput || !smsPlivoAuthTokenInput || !smsPlivoPhoneInput) {
        toast.error(t('toastPlivoCredentialsRequired'));
        return;
      }
      payload.plivo_auth_id = smsPlivoAuthIdInput;
      payload.plivo_auth_token = smsPlivoAuthTokenInput;
      payload.plivo_phone_number = smsPlivoPhoneInput;
    } else if (smsProvider === 'messagebird') {
      if (!smsMessagebirdKeyInput || !smsMessagebirdPhoneInput) {
        toast.error(t('toastMessagebirdCredentialsRequired'));
        return;
      }
      payload.messagebird_api_key = smsMessagebirdKeyInput;
      payload.messagebird_phone_number = smsMessagebirdPhoneInput;
    } else if (smsProvider === 'sinch') {
      if (!smsSinchPlanIdInput || !smsSinchTokenInput || !smsSinchPhoneInput) {
        toast.error(t('toastSinchCredentialsRequired'));
        return;
      }
      payload.sinch_service_plan_id = smsSinchPlanIdInput;
      payload.sinch_api_token = smsSinchTokenInput;
      payload.sinch_phone_number = smsSinchPhoneInput;
    } else if (smsProvider === 'telnyx') {
      if (!smsTelnyxKeyInput || !smsTelnyxPhoneInput) {
        toast.error(t('toastTelnyxCredentialsRequired'));
        return;
      }
      payload.telnyx_api_key = smsTelnyxKeyInput;
      payload.telnyx_phone_number = smsTelnyxPhoneInput;
    }

    setSmsConnecting(true);
    try {
      const res = await fetchWithCsrf('/integrations/sms/connect', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(t('toastSmsConnectSuccess', { provider: smsProvider.toUpperCase() }));
        await onSuccess('sms');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastSmsConnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setSmsConnecting(false);
    }
  };

  // Email Handlers
  const handleConnectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailNameInput.trim()) {
      toast.error(t('toastEmailNameRequired'));
      return;
    }

    const payload: Record<string, string | number | boolean | undefined> = {
      id: editingConnectionId || undefined,
      name: emailNameInput,
      provider: emailProvider
    };

    if (emailProvider === 'smtp') {
      if (!emailAddressInput || !emailSmtpHostInput || !emailSmtpPortInput || !emailSmtpUserInput || !emailSmtpPassInput ||
          !emailImapHostInput || !emailImapPortInput || !emailImapUserInput || !emailImapPassInput) {
        toast.error(t('toastEmailCredentialsRequired'));
        return;
      }
      payload.email_address = emailAddressInput;
      payload.smtp_host = emailSmtpHostInput;
      payload.smtp_port = parseInt(emailSmtpPortInput, 10);
      payload.smtp_username = emailSmtpUserInput;
      payload.smtp_password = emailSmtpPassInput;
      payload.smtp_encryption = emailSmtpEncInput;
      
      payload.imap_host = emailImapHostInput;
      payload.imap_port = parseInt(emailImapPortInput, 10);
      payload.imap_username = emailImapUserInput;
      payload.imap_password = emailImapPassInput;
      payload.imap_encryption = emailImapEncInput;
    }

    setEmailConnecting(true);
    try {
      const res = await fetchWithCsrf('/integrations/email/connect', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(t('toastEmailConnectSuccess', { name: emailNameInput }));
        await onSuccess('email');
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastEmailConnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setEmailConnecting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white border border-[#E8E8E6] rounded-xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left transition-all ${
          selectedChannelSlug === 'email' && emailStep === 2 
            ? 'max-w-2xl' 
            : ['whatsapp_cloud', 'instagram', 'messenger'].includes(selectedChannelSlug || '') 
            ? 'max-w-lg' 
            : 'max-w-md'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
              {renderChannelLogo(selectedChannelSlug, "h-4 w-4")}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                {editingConnectionId ? (
                  `Edit Connection (#${editingConnectionId})`
                ) : (
                  selectedChannelSlug === 'whatsapp_cloud' ? t('configureWhatsappCloud') :
                  selectedChannelSlug === 'whatsapp_baileys' ? t('configureWhatsappBaileys') :
                  selectedChannelSlug === 'instagram' ? t('configureInstagramDirect') :
                  selectedChannelSlug === 'messenger' ? t('configureFacebookMessenger') :
                  selectedChannelSlug === 'telegram' ? t('configureTelegramBot') :
                  selectedChannelSlug === 'sms' ? t('configureSmsGateway') :
                  selectedChannelSlug === 'tiktok' ? (t('configureTikTok') || 'Configure TikTok') :
                  selectedChannelSlug === 'linkedin' ? (t('configureLinkedIn') || 'Configure LinkedIn') :
                  t('configureEmailMailbox')
                )}
              </h3>
              <span className="text-[10px] text-zinc-500 block mt-0.5 truncate font-medium">
                {editingConnectionId ? (
                  'Update credentials and configuration for this channel line.'
                ) : (
                  selectedChannelSlug === 'whatsapp_cloud' ? t('descWhatsappCloud') :
                  selectedChannelSlug === 'whatsapp_baileys' ? t('descWhatsappBaileys') :
                  selectedChannelSlug === 'instagram' ? t('descInstagramDirect') :
                  selectedChannelSlug === 'messenger' ? t('descFacebookMessenger') :
                  selectedChannelSlug === 'telegram' ? t('descTelegramBot') :
                  selectedChannelSlug === 'sms' ? t('descSmsGateway') :
                  selectedChannelSlug === 'tiktok' ? (t('descTikTok') || 'Connect TikTok account for Direct Messages and video publishing') :
                  selectedChannelSlug === 'linkedin' ? (t('descLinkedIn') || 'Connect LinkedIn account to publish company and personal posts') :
                  t('descEmailMailbox')
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
            aria-label={tCommon('close') || 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pt-4">
          
          {/* WhatsApp Cloud API Dialog */}
          {selectedChannelSlug === 'whatsapp_cloud' && (
            <div className="space-y-4">
              {whatsappMode === 'both' && (
                <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setWhatsappTab('embedded')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                      whatsappTab === 'embedded'
                        ? 'bg-white text-zinc-950 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Sparkles className={`h-3.5 w-3.5 shrink-0 ${whatsappTab === 'embedded' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                    <span>{t('embeddedSignup') || 'Meta Embedded Signup'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappTab('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                      whatsappTab === 'manual'
                        ? 'bg-white text-zinc-950 shadow-3xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <KeyRound className={`h-3.5 w-3.5 shrink-0 ${whatsappTab === 'manual' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                    <span>{t('manualByok') || 'Manual API Keys (BYOK)'}</span>
                  </button>
                </div>
              )}

              {/* Embedded Signup View */}
              {(whatsappMode === 'embedded' || (whatsappMode === 'both' && whatsappTab === 'embedded')) && (
                <div className="space-y-4 text-left">
                  {!metaAppId && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs">
                      <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-semibold block">{t('metaNotConfiguredTitle') || 'Meta App ID Not Configured'}</span>
                        <span className="text-[11px] text-amber-700">
                          {t('metaNotConfiguredDesc') || 'Meta Embedded Signup requires platform credentials configured in Super Admin Settings > Meta. You can connect using Manual API Keys (BYOK).'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                    <input
                      type="text"
                      placeholder={t('connectionNamePlaceholder') || 'e.g. Production WABA Line'}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>

                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end select-none font-bold">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('cancel') || 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={!metaAppId || metaSdkLoading || isSaving}
                        onClick={launchWhatsAppEmbeddedSignup}
                        className="h-9 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {metaSdkLoading || isSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{t('connecting') || 'Connecting...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('connectWithMeta') || 'Connect with Meta'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual BYOK View */}
              {(whatsappMode === 'manual' || (whatsappMode === 'both' && whatsappTab === 'manual')) && (
                <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                  {whatsappConnected && whatsappDetails?.webhook_url && (
                    renderWebhookInfo(whatsappDetails.webhook_url, whatsappDetails.webhook_verify_token, t)
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('connectionNamePlaceholder')}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneNumberId')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('phoneNumberIdPlaceholder')}
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('wabaAccountId')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('wabaAccountIdPlaceholder')}
                        value={wabaInput}
                        onChange={(e) => setWabaInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('webhookClientSecret') || 'Webhook Client Secret'} <span className="text-zinc-400 lowercase">({t('optional') || 'optional'})</span></label>
                      <input
                        type="text"
                        placeholder={t('hmacVerificationKeyPlaceholder')}
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('permanentAccessToken')}</label>
                      <div className="relative">
                        <input
                          type={showWhatsAppToken ? "text" : "password"}
                          required
                          placeholder="EAAGb3eSZC..."
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                        >
                          {showWhatsAppToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                    <div>
                      {editingConnectionId && onDisconnectRequested && (
                        <button
                          type="button"
                          onClick={() => {
                            onDisconnectRequested({
                              id: editingConnection.id,
                              slug: 'whatsapp_cloud',
                              name: editingConnection.name || 'WhatsApp Cloud API'
                            });
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t('disconnect') || 'Disconnect'}</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('cancel') || 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                      >
                        {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* WhatsApp Baileys Dialog */}
          {selectedChannelSlug === 'whatsapp_baileys' && (
            baileysConnected ? (
              baileysNicknameRequired ? (
                <form onSubmit={handleSaveBaileysNickname} className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{t('deviceLinkedSuccessfully')}</h4>
                    <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                      {t('enterNicknameDesc') || 'Please enter a nickname to identify this WhatsApp channel.'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionNickname')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('connectionNicknamePlaceholder')}
                      value={baileysNameInput}
                      onChange={(e) => setBaileysNameInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : tCommon('save') || 'Save & Complete'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs select-none">
                  <div className="bg-[#E8FDE8] border border-[#3DD43D]/30 p-4 rounded-lg flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#4AE54A] animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 uppercase block tracking-wider text-[10px]">{t('connectedSuccessfully')}</span>
                      <span className="text-emerald-700 font-semibold mt-0.5 block">{t('unofficialLinkedDesc')}</span>
                    </div>
                  </div>
                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end select-none font-bold">
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
                    >
                      {tCommon('done') || 'Done'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {baileysQr ? (
                  <div className="border border-[#E8E8E6] rounded-lg p-5 bg-zinc-50/50 flex flex-col items-center justify-center space-y-3.5 select-none animate-fade-in text-center">
                    <span className="text-[9px] text-[#A0A0A0] font-black uppercase tracking-wider">{t('scanQrCodeInWhatsapp')}</span>
                    <div className="h-44 w-44 bg-white border border-[#E8E8E6] rounded-lg p-2 flex items-center justify-center select-none shadow-3xs mx-auto">
                      <img 
                        src={baileysQr} 
                        alt="Linking QR Code" 
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed max-w-xs mx-auto">
                      {t('baileysScanInstructions') || 'Open WhatsApp → Linked Devices → Link a Device. Scan the QR above to persist the auth session.'}
                    </p>
                  </div>
                ) : (
                  baileysConnecting ? (
                    <div className="border border-dashed border-[#E8E8E6] rounded-lg p-10 flex flex-col items-center justify-center space-y-2 select-none text-center">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#A0A0A0] mx-auto" />
                      <span className="text-[10px] text-zinc-500 font-semibold">{t('contactingWorkerQr')}</span>
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#E8E8E6] rounded-lg p-8 flex flex-col items-center justify-center space-y-3 select-none text-center">
                      <span className="text-xs text-rose-600 font-bold">{t('failedLoadQr')}</span>
                      <button
                        type="button"
                        onClick={() => triggerConnectBaileys(baileysConnectionIdRef.current || undefined)}
                        className="h-8 px-3.5 bg-[#0A0A0A] hover:bg-zinc-800 text-white font-bold text-xs rounded-md shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>{t('retryQrCode') || 'Retry QR Code'}</span>
                      </button>
                    </div>
                  )
                )}
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end select-none font-bold gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                </div>
              </div>
            )
          )}

          {/* Instagram Dialog */}
          {selectedChannelSlug === 'instagram' && (
            instagramConnected && !editingConnectionId ? (
              <div className="space-y-4 text-xs select-none">
                <div className="bg-[#E8FDE8] border border-[#3DD43D]/30 p-4 rounded-lg flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4AE54A] animate-pulse shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900 uppercase block tracking-wider text-[10px]">{t('connectedSuccessfully') || 'Connected successfully'}</span>
                      {instagramDetails?.connection_mode === 'embedded' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Meta Embedded
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Manual BYOK
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-700 font-semibold mt-0.5 block truncate">
                      {t('instagramLinkedDesc', { accountName: instagramDetails?.name || 'Instagram Account' })}
                    </span>
                    {instagramDetails?.instagram_business_account_id && (
                      <span className="text-[10px] text-emerald-600/90 font-mono mt-0.5 block">
                        ID: {instagramDetails.instagram_business_account_id}
                      </span>
                    )}
                  </div>
                </div>

                {instagramDetails?.webhook_url && (
                  renderWebhookInfo(instagramDetails.webhook_url, instagramDetails.webhook_verify_token, t)
                )}

                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDisconnectRequested) {
                        onDisconnectRequested({
                          id: instagramDetails?.id,
                          slug: 'instagram',
                          name: instagramDetails?.name || 'Instagram'
                        });
                      }
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('disconnect') || 'Disconnect'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
                  >
                    {tCommon('done') || 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {instagramMode === 'both' && (
                  <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setInstagramTab('embedded')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                        instagramTab === 'embedded'
                          ? 'bg-white text-zinc-950 shadow-3xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Sparkles className={`h-3.5 w-3.5 shrink-0 ${instagramTab === 'embedded' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                      <span>{t('embeddedSignup') || 'Meta Embedded Signup'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstagramTab('manual')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                        instagramTab === 'manual'
                          ? 'bg-white text-zinc-950 shadow-3xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <KeyRound className={`h-3.5 w-3.5 shrink-0 ${instagramTab === 'manual' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                      <span>{t('manualByok') || 'Manual API Keys (BYOK)'}</span>
                    </button>
                  </div>
                )}

                {(instagramMode === 'embedded' || (instagramMode === 'both' && instagramTab === 'embedded')) && (
                  <div className="space-y-4 text-left">
                    {!metaAppId && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs">
                        <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block">{t('metaNotConfiguredTitle') || 'Meta App ID Not Configured'}</span>
                          <span className="text-[11px] text-amber-700">
                            {t('metaNotConfiguredDesc') || 'Meta Embedded Signup requires platform credentials configured in Super Admin Settings > Meta. You can connect using Manual API Keys (BYOK).'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                      <input
                        type="text"
                        placeholder={t('instagramConnectionNamePlaceholder') || 'e.g. My Brand Instagram'}
                        value={instagramNameInput}
                        onChange={(e) => setInstagramNameInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end select-none font-bold">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel') || 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={!metaAppId || metaSdkLoading || isSaving}
                          onClick={launchInstagramEmbeddedSignup}
                          className="h-9 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {metaSdkLoading || isSaving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{t('connecting') || 'Connecting...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>{t('connectWithMeta') || 'Connect with Meta'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(instagramMode === 'manual' || (instagramMode === 'both' && instagramTab === 'manual')) && (
                  <form onSubmit={handleConnectInstagramManual} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                      <input
                        type="text"
                        placeholder={t('instagramConnectionNamePlaceholder') || 'e.g. My Brand Instagram'}
                        value={instagramNameInput}
                        onChange={(e) => setInstagramNameInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('facebookPageId') || 'Facebook Page ID'} *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 109283746501928"
                          value={instagramPageIdInput}
                          onChange={(e) => setInstagramPageIdInput(e.target.value)}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('instagramAccountId') || 'Instagram Account ID'} *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 178414001234567"
                          value={instagramAccountIdInput}
                          onChange={(e) => setInstagramAccountIdInput(e.target.value)}
                          className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('pageAccessToken') || 'Page Access Token'} *</label>
                      <input
                        type="password"
                        required
                        placeholder="EAAGb3eSZC..."
                        value={instagramTokenInput}
                        onChange={(e) => setInstagramTokenInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('appSecret') || 'App Secret'} <span className="text-zinc-400 lowercase">({t('optional') || 'optional'})</span></label>
                      <input
                        type="password"
                        placeholder="Meta App Secret for HMAC webhook verification"
                        value={instagramSecretInput}
                        onChange={(e) => setInstagramSecretInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono"
                      />
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                      <div>
                        {editingConnectionId && onDisconnectRequested && (
                          <button
                            type="button"
                            onClick={() => {
                              onDisconnectRequested({
                                id: editingConnection.id,
                                slug: 'instagram',
                                name: editingConnection.name || 'Instagram'
                              });
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('disconnect') || 'Disconnect'}</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel') || 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                        >
                          {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )
          )}

          {/* Facebook Messenger Dialog */}
          {selectedChannelSlug === 'messenger' && (
            messengerConnected && !editingConnectionId ? (
              <div className="space-y-4 text-xs select-none">
                <div className="bg-[#E8FDE8] border border-[#3DD43D]/30 p-4 rounded-lg flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4AE54A] animate-pulse shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900 uppercase block tracking-wider text-[10px]">{t('connectedSuccessfully') || 'Connected successfully'}</span>
                      {messengerDetails?.connection_mode === 'embedded' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Meta Embedded
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Manual BYOK
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-700 font-semibold mt-0.5 block truncate">
                      {t('messengerLinkedDesc', { pageName: messengerDetails?.name || 'Facebook Page' })}
                    </span>
                    {messengerDetails?.page_id && (
                      <span className="text-[10px] text-emerald-600/90 font-mono mt-0.5 block">
                        Page ID: {messengerDetails.page_id}
                      </span>
                    )}
                  </div>
                </div>

                {messengerDetails?.webhook_url && (
                  renderWebhookInfo(messengerDetails.webhook_url, messengerDetails.webhook_verify_token, t)
                )}

                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDisconnectRequested) {
                        onDisconnectRequested({
                          id: messengerDetails?.id,
                          slug: 'messenger',
                          name: messengerDetails?.name || 'Messenger'
                        });
                      }
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('disconnect') || 'Disconnect'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
                  >
                    {tCommon('done') || 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messengerMode === 'both' && (
                  <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setMessengerTab('embedded')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                        messengerTab === 'embedded'
                          ? 'bg-white text-zinc-950 shadow-3xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Sparkles className={`h-3.5 w-3.5 shrink-0 ${messengerTab === 'embedded' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                      <span>{t('embeddedSignup') || 'Meta Embedded Signup'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessengerTab('manual')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                        messengerTab === 'manual'
                          ? 'bg-white text-zinc-950 shadow-3xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <KeyRound className={`h-3.5 w-3.5 shrink-0 ${messengerTab === 'manual' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                      <span>{t('manualByok') || 'Manual API Keys (BYOK)'}</span>
                    </button>
                  </div>
                )}

                {(messengerMode === 'embedded' || (messengerMode === 'both' && messengerTab === 'embedded')) && (
                  <div className="space-y-4 text-left">
                    {!metaAppId && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs">
                        <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block">{t('metaNotConfiguredTitle') || 'Meta App ID Not Configured'}</span>
                          <span className="text-[11px] text-amber-700">
                            {t('metaNotConfiguredDesc') || 'Meta Embedded Signup requires platform credentials configured in Super Admin Settings > Meta. You can connect using Manual API Keys (BYOK).'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                      <input
                        type="text"
                        placeholder={t('messengerConnectionNamePlaceholder') || 'e.g. Support Facebook Page'}
                        value={messengerNameInput}
                        onChange={(e) => setMessengerNameInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end select-none font-bold">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel') || 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={!metaAppId || metaSdkLoading || isSaving}
                          onClick={launchMessengerEmbeddedSignup}
                          className="h-9 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {metaSdkLoading || isSaving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{t('connecting') || 'Connecting...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>{t('connectWithMeta') || 'Connect with Meta'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(messengerMode === 'manual' || (messengerMode === 'both' && messengerTab === 'manual')) && (
                  <form onSubmit={handleConnectMessengerManual} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                      <input
                        type="text"
                        placeholder={t('messengerConnectionNamePlaceholder') || 'e.g. Support Facebook Page'}
                        value={messengerNameInput}
                        onChange={(e) => setMessengerNameInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('facebookPageId') || 'Facebook Page ID'} *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 109283746501928"
                        value={messengerPageIdInput}
                        onChange={(e) => setMessengerPageIdInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('pageAccessToken') || 'Page Access Token'} *</label>
                      <input
                        type="password"
                        required
                        placeholder="EAAGb3eSZC..."
                        value={messengerTokenInput}
                        onChange={(e) => setMessengerTokenInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('appSecret') || 'App Secret'} <span className="text-zinc-400 lowercase">({t('optional') || 'optional'})</span></label>
                      <input
                        type="password"
                        placeholder="Meta App Secret for HMAC webhook verification"
                        value={messengerSecretInput}
                        onChange={(e) => setMessengerSecretInput(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono"
                      />
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                      <div>
                        {editingConnectionId && onDisconnectRequested && (
                          <button
                            type="button"
                            onClick={() => {
                              onDisconnectRequested({
                                id: editingConnection.id,
                                slug: 'messenger',
                                name: editingConnection.name || 'Messenger'
                              });
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('disconnect') || 'Disconnect'}</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('cancel') || 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                        >
                          {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )
          )}

          {/* Telegram Dialog */}
          {selectedChannelSlug === 'telegram' && (
            <form onSubmit={handleConnectTelegram} className="space-y-4 font-sans select-none">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('telegramConnectionNamePlaceholder')}
                  value={telegramNameInput}
                  onChange={(e) => setTelegramNameInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('botApiToken')}</label>
                <div className="relative">
                  <input
                    type={showTelegramToken ? "text" : "password"}
                    required
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    value={telegramTokenInput}
                    onChange={(e) => setTelegramTokenInput(e.target.value)}
                    className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                  >
                    {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <div>
                  {editingConnectionId && onDisconnectRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnectRequested({
                          id: editingConnection.id,
                          slug: 'telegram',
                          name: editingConnection.name || 'Telegram'
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('disconnect') || 'Disconnect'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={telegramConnecting}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                  >
                    {telegramConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* SMS Dialog */}
          {selectedChannelSlug === 'sms' && (
            <form onSubmit={handleConnectSms} className="space-y-4 font-sans select-none">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('smsConnectionNamePlaceholder')}
                  value={smsNameInput}
                  onChange={(e) => setSmsNameInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('gatewayProvider')}</label>
                <DropdownSelect
                  options={[
                    { value: 'twilio', label: 'Twilio Gateway' },
                    { value: 'vonage', label: 'Vonage (Nexmo) Gateway' },
                    { value: 'plivo', label: 'Plivo Gateway' },
                    { value: 'messagebird', label: 'MessageBird Gateway' },
                    { value: 'sinch', label: 'Sinch Gateway' },
                    { value: 'telnyx', label: 'Telnyx Gateway' },
                  ]}
                  value={smsProvider}
                  onChange={(val) => setSmsProvider(val as any)}
                />
              </div>

              {smsProvider === 'twilio' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('accountSid') || 'Account SID'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={smsTwilioSidInput}
                      onChange={(e) => setSmsTwilioSidInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('authToken') || 'Auth Token'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsTwilioToken ? "text" : "password"}
                        required
                        placeholder="Auth Token"
                        value={smsTwilioTokenInput}
                        onChange={(e) => setSmsTwilioTokenInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsTwilioToken(!showSmsTwilioToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsTwilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneNumber') || 'Phone Number'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890"
                      value={smsTwilioPhoneInput}
                      onChange={(e) => setSmsTwilioPhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              {smsProvider === 'vonage' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('apiKey') || 'API Key'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="Vonage API Key"
                      value={smsVonageKeyInput}
                      onChange={(e) => setSmsVonageKeyInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('apiSecret') || 'API Secret'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsVonageSecret ? "text" : "password"}
                        required
                        placeholder="Vonage API Secret"
                        value={smsVonageSecretInput}
                        onChange={(e) => setSmsVonageSecretInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsVonageSecret(!showSmsVonageSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsVonageSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('fromNumber') || 'From Number / Sender ID'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890 or Brand"
                      value={smsVonagePhoneInput}
                      onChange={(e) => setSmsVonagePhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              {smsProvider === 'plivo' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('authId') || 'Auth ID'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="Plivo Auth ID"
                      value={smsPlivoAuthIdInput}
                      onChange={(e) => setSmsPlivoAuthIdInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('authToken') || 'Auth Token'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsPlivoToken ? "text" : "password"}
                        required
                        placeholder="Plivo Auth Token"
                        value={smsPlivoAuthTokenInput}
                        onChange={(e) => setSmsPlivoAuthTokenInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsPlivoToken(!showSmsPlivoToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsPlivoToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('senderPhoneNumber') || 'Sender Phone Number'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890"
                      value={smsPlivoPhoneInput}
                      onChange={(e) => setSmsPlivoPhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              {smsProvider === 'messagebird' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('apiAccessKey') || 'API Access Key'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsMessagebirdKey ? "text" : "password"}
                        required
                        placeholder="MessageBird Access Key"
                        value={smsMessagebirdKeyInput}
                        onChange={(e) => setSmsMessagebirdKeyInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsMessagebirdKey(!showSmsMessagebirdKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsMessagebirdKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('originatorPhoneNumber') || 'Originator / Phone Number'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890 or Brand"
                      value={smsMessagebirdPhoneInput}
                      onChange={(e) => setSmsMessagebirdPhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              {smsProvider === 'sinch' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('servicePlanId') || 'Service Plan ID'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="Sinch Service Plan ID"
                      value={smsSinchPlanIdInput}
                      onChange={(e) => setSmsSinchPlanIdInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('apiToken') || 'API Token'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsSinchToken ? "text" : "password"}
                        required
                        placeholder="Sinch API Token"
                        value={smsSinchTokenInput}
                        onChange={(e) => setSmsSinchTokenInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsSinchToken(!showSmsSinchToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsSinchToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('sinchPhoneNumber') || 'Sinch Phone Number'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890"
                      value={smsSinchPhoneInput}
                      onChange={(e) => setSmsSinchPhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              {smsProvider === 'telnyx' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('apiKey') || 'API Key'} *</label>
                    <div className="relative">
                      <input
                        type={showSmsTelnyxKey ? "text" : "password"}
                        required
                        placeholder="Telnyx V2 API Key"
                        value={smsTelnyxKeyInput}
                        onChange={(e) => setSmsTelnyxKeyInput(e.target.value)}
                        className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsTelnyxKey(!showSmsTelnyxKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showSmsTelnyxKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('telnyxPhoneNumber') || 'Telnyx Phone Number'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1234567890"
                      value={smsTelnyxPhoneInput}
                      onChange={(e) => setSmsTelnyxPhoneInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                </div>
              )}

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <div>
                  {editingConnectionId && onDisconnectRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnectRequested({
                          id: editingConnection.id,
                          slug: 'sms',
                          name: editingConnection.name || 'SMS'
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('disconnect') || 'Disconnect'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={smsConnecting}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                  >
                    {smsConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Email Dialog */}
          {selectedChannelSlug === 'email' && (
            <form onSubmit={handleConnectEmail} className="space-y-4 font-sans select-none">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('connectionName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('emailConnectionNamePlaceholder')}
                  value={emailNameInput}
                  onChange={(e) => setEmailNameInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('emailAddress')}</label>
                <input
                  type="email"
                  required
                  placeholder="support@company.com"
                  value={emailAddressInput}
                  onChange={(e) => setEmailAddressInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              {/* SMTP & IMAP Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* SMTP (Outbound) */}
                <div className="border border-[#E8E8E6] rounded-lg p-3.5 bg-zinc-50/50 space-y-3">
                  <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">{t('outboundSmtpSettings') || 'Outbound (SMTP) Settings'}</h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('smtpHost') || 'SMTP Host'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="smtp.mailgun.org"
                      value={emailSmtpHostInput}
                      onChange={(e) => setEmailSmtpHostInput(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('port') || 'Port'} *</label>
                      <input
                        type="number"
                        required
                        placeholder="587"
                        value={emailSmtpPortInput}
                        onChange={(e) => setEmailSmtpPortInput(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('encryption') || 'Encryption'} *</label>
                      <DropdownSelect
                        options={[
                          { value: 'tls', label: 'TLS' },
                          { value: 'ssl', label: 'SSL' },
                          { value: 'none', label: 'None' },
                        ]}
                        value={emailSmtpEncInput}
                        onChange={(val) => setEmailSmtpEncInput(val as any)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('username') || 'Username'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="smtp-user"
                      value={emailSmtpUserInput}
                      onChange={(e) => setEmailSmtpUserInput(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('password') || 'Password'} *</label>
                    <div className="relative">
                      <input
                        type={showEmailSmtpPass ? "text" : "password"}
                        required
                        placeholder="Password"
                        value={emailSmtpPassInput}
                        onChange={(e) => setEmailSmtpPassInput(e.target.value)}
                        className="w-full h-8 pl-2.5 pr-8 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailSmtpPass(!showEmailSmtpPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showEmailSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* IMAP (Inbound) */}
                <div className="border border-[#E8E8E6] rounded-lg p-3.5 bg-zinc-50/50 space-y-3">
                  <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">{t('inboundImapSettings') || 'Inbound (IMAP) Settings'}</h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('imapHost') || 'IMAP Host'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="imap.mailgun.org"
                      value={emailImapHostInput}
                      onChange={(e) => setEmailImapHostInput(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('port') || 'Port'} *</label>
                      <input
                        type="number"
                        required
                        placeholder="993"
                        value={emailImapPortInput}
                        onChange={(e) => setEmailImapPortInput(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('encryption') || 'Encryption'} *</label>
                      <DropdownSelect
                        options={[
                          { value: 'ssl', label: 'SSL' },
                          { value: 'tls', label: 'TLS' },
                          { value: 'none', label: 'None' },
                        ]}
                        value={emailImapEncInput}
                        onChange={(val) => setEmailImapEncInput(val as any)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('username') || 'Username'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="imap-user"
                      value={emailImapUserInput}
                      onChange={(e) => setEmailImapUserInput(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('password') || 'Password'} *</label>
                    <div className="relative">
                      <input
                        type={showEmailImapPass ? "text" : "password"}
                        required
                        placeholder="Password"
                        value={emailImapPassInput}
                        onChange={(e) => setEmailImapPassInput(e.target.value)}
                        className="w-full h-8 pl-2.5 pr-8 bg-white border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailImapPass(!showEmailImapPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                      >
                        {showEmailImapPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <div>
                  {editingConnectionId && onDisconnectRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnectRequested({
                          id: editingConnection.id,
                          slug: 'email',
                          name: editingConnection.name || 'Email'
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('disconnect') || 'Disconnect'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={emailConnecting}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                  >
                    {emailConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TikTok Dialog */}
          {selectedChannelSlug === 'tiktok' && (
            <form onSubmit={handleConnectTikTok} className="space-y-4 font-sans select-none">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('accountName') || 'Account Name'} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Brand TikTok"
                  value={tiktokNameInput}
                  onChange={(e) => setTiktokNameInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('handle') || 'Handle'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="@brand_handle"
                    value={tiktokHandleInput}
                    onChange={(e) => setTiktokHandleInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('openId') || 'Open ID'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="open_id from TikTok"
                    value={tiktokOpenIdInput}
                    onChange={(e) => setTiktokOpenIdInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('accessToken') || 'Access Token'} *</label>
                <div className="relative">
                  <input
                    type={showTikTokToken ? "text" : "password"}
                    required
                    placeholder="act.XXXXX..."
                    value={tiktokTokenInput}
                    onChange={(e) => setTiktokTokenInput(e.target.value)}
                    className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTikTokToken(!showTikTokToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                  >
                    {showTikTokToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('clientSecret') || 'Client Secret'} <span className="text-zinc-400 lowercase">({t('optional') || 'optional'})</span></label>
                <input
                  type="password"
                  placeholder="TikTok App Client Secret"
                  value={tiktokClientSecretInput}
                  onChange={(e) => setTiktokClientSecretInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                />
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <div>
                  {editingConnectionId && onDisconnectRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnectRequested({
                          id: editingConnection.id,
                          slug: 'tiktok',
                          name: editingConnection.name || 'TikTok'
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('disconnect') || 'Disconnect'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={tiktokConnecting}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                  >
                    {tiktokConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* LinkedIn Dialog */}
          {selectedChannelSlug === 'linkedin' && (
            <form onSubmit={handleConnectLinkedIn} className="space-y-4 font-sans select-none">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('accountName') || 'Account Name'} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Company LinkedIn"
                  value={linkedinNameInput}
                  onChange={(e) => setLinkedinNameInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('authorType') || 'Author Type'} *</label>
                  <DropdownSelect
                    options={[
                      { value: 'organization', label: 'Company / Organization' },
                      { value: 'person', label: 'Personal Profile' },
                    ]}
                    value={linkedinAuthorTypeInput}
                    onChange={(val) => setLinkedinAuthorTypeInput(val as any)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('authorUrn') || 'Author URN / Org ID'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="urn:li:organization:123456 or 123456"
                    value={linkedinAuthorUrnInput}
                    onChange={(e) => setLinkedinAuthorUrnInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('oauthAccessToken') || 'OAuth Access Token'} *</label>
                <div className="relative">
                  <input
                    type={showLinkedInToken ? "text" : "password"}
                    required
                    placeholder="AQV..."
                    value={linkedinTokenInput}
                    onChange={(e) => setLinkedinTokenInput(e.target.value)}
                    className="w-full h-9 pl-3 pr-10 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkedInToken(!showLinkedInToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
                  >
                    {showLinkedInToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('clientSecret') || 'Client Secret'} <span className="text-zinc-400 lowercase">({t('optional') || 'optional'})</span></label>
                <input
                  type="password"
                  placeholder="LinkedIn App Client Secret"
                  value={linkedinClientSecretInput}
                  onChange={(e) => setLinkedinClientSecretInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] focus:border-black rounded-md text-xs font-medium placeholder:text-zinc-400 outline-none transition-colors text-black font-mono text-[11px]"
                />
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <div>
                  {editingConnectionId && onDisconnectRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnectRequested({
                          id: editingConnection.id,
                          slug: 'linkedin',
                          name: editingConnection.name || 'LinkedIn'
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-650 hover:text-red-750 font-semibold text-[10px] uppercase tracking-wider hover:bg-red-50 rounded transition-all cursor-pointer border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('disconnect') || 'Disconnect'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={linkedinConnecting}
                    className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
                  >
                    {linkedinConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingConnectionId ? (tCommon('updateConnection') || 'Update Connection') : (tCommon('connect') || 'Connect')}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
