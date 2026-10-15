'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { fetchWithCsrf, getBackendUrl } from '@/lib/api';
import { 
  MessageSquare, 
  MessageCircle, 
  Mail, 
  Send, 
  X, 
  Smartphone,
  SlidersHorizontal,
  AlertTriangle,
  KeyRound,
  Sparkles,
  Check,
  ShieldCheck,
  Layers,
  Loader2,
  Info,
  Lock,
  QrCode,
  Bot,
  Radio,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Film,
  Video,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface MetaConfig {
  app_id: string;
  app_secret: string;
  has_secret?: boolean;
  whatsapp_config_id: string;
  instagram_config_id: string;
  messenger_config_id: string;
}

export default function ChannelsPage() {
  const t = useTranslations('Superadmin');

  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [activeProvider, setActiveProvider] = useState('twilio');
  const [providerCreds, setProviderCreds] = useState<Record<string, Record<string, string>>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal / SMS Management States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempActiveProvider, setTempActiveProvider] = useState('twilio');
  const [tempProviderCreds, setTempProviderCreds] = useState<Record<string, any>>({});

  // Confirmation Switch states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmChannelId, setConfirmChannelId] = useState<string | null>(null);
  const [confirmChannelName, setConfirmChannelName] = useState<string>('');
  const [confirmChannelLogo, setConfirmChannelLogo] = useState<string | undefined>(undefined);
  const [confirmChannelIcon, setConfirmChannelIcon] = useState<React.ComponentType<any> | undefined>(undefined);
  const [confirmActionType, setConfirmActionType] = useState<'enable' | 'disable'>('enable');

  // Connection Modes & Meta Embedded States
  type MetaChannelKey = 'whatsapp_cloud' | 'instagram' | 'messenger';
  const [selectedMetaChannel, setSelectedMetaChannel] = useState<MetaChannelKey>('whatsapp_cloud');

  const metaChannelMetaMap: Record<MetaChannelKey, {
    name: string;
    fullName: string;
    logo: string;
    desc: string;
    configIdKey: 'whatsapp_config_id' | 'instagram_config_id' | 'messenger_config_id';
    configIdLabel: string;
    configIdPlaceholder: string;
    note: string;
  }> = {
    whatsapp_cloud: {
      name: 'WhatsApp Official',
      fullName: 'WhatsApp Cloud API',
      logo: '/channels/whatsapp.webp',
      desc: 'Configure connection mode for WhatsApp Cloud API.',
      configIdKey: 'whatsapp_config_id',
      configIdLabel: 'WhatsApp Login Configuration ID (Optional)',
      configIdPlaceholder: 'e.g. 123456789012345 (from Meta WhatsApp Embedded Signup)',
      note: 'Requires WhatsApp Business Account (WABA) & Meta Cloud API setup.',
    },
    instagram: {
      name: 'Instagram Direct',
      fullName: 'Instagram Direct Messaging',
      logo: '/channels/instagram.svg',
      desc: 'Configure connection mode for Instagram Direct messages.',
      configIdKey: 'instagram_config_id',
      configIdLabel: 'Instagram Login Configuration ID (Optional)',
      configIdPlaceholder: 'e.g. 123456789012345 (from Meta Instagram Embedded Signup)',
      note: 'Requires connected Facebook Page and Instagram Professional Account.',
    },
    messenger: {
      name: 'Facebook Messenger',
      fullName: 'Facebook Page Messenger',
      logo: '/channels/messenger.webp',
      desc: 'Configure connection mode for Facebook Messenger pages.',
      configIdKey: 'messenger_config_id',
      configIdLabel: 'Messenger Login Configuration ID (Optional)',
      configIdPlaceholder: 'e.g. 123456789012345 (from Meta Messenger Embedded Signup)',
      note: 'Requires Facebook Page Admin privileges and Page Access Tokens.',
    },
  };

  const [connectionModes, setConnectionModes] = useState<Record<string, 'both' | 'embedded' | 'manual'>>({
    whatsapp_cloud: 'both',
    instagram: 'both',
    messenger: 'both',
  });
  const [metaConfig, setMetaConfig] = useState<MetaConfig>({
    app_id: '',
    app_secret: '',
    has_secret: false,
    whatsapp_config_id: '',
    instagram_config_id: '',
    messenger_config_id: '',
  });

  const [isModesModalOpen, setIsModesModalOpen] = useState(false);
  const [tempModes, setTempModes] = useState<Record<string, 'both' | 'embedded' | 'manual'>>({
    whatsapp_cloud: 'both',
    instagram: 'both',
    messenger: 'both',
  });
  const [savingModes, setSavingModes] = useState(false);

  // TikTok App Configuration States
  const [isTikTokModalOpen, setIsTikTokModalOpen] = useState(false);
  const [tiktokClientKey, setTiktokClientKey] = useState('');
  const [tiktokClientSecret, setTiktokClientSecret] = useState('');
  const [tiktokHasSecret, setTiktokHasSecret] = useState(false);
  const [tiktokRedirectUri, setTiktokRedirectUri] = useState('');
  const [showTiktokSecret, setShowTiktokSecret] = useState(false);
  const [savingTikTokConfig, setSavingTikTokConfig] = useState(false);

  // LinkedIn App Configuration States
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [linkedinClientId, setLinkedinClientId] = useState('');
  const [linkedinClientSecret, setLinkedinClientSecret] = useState('');
  const [linkedinHasSecret, setLinkedinHasSecret] = useState(false);
  const [linkedinRedirectUri, setLinkedinRedirectUri] = useState('');
  const [showLinkedinSecret, setShowLinkedinSecret] = useState(false);
  const [savingLinkedInConfig, setSavingLinkedInConfig] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [channelsRes, modesRes] = await Promise.all([
        fetchWithCsrf('/admin/channels'),
        fetchWithCsrf('/admin/channels/connection-modes')
      ]);

      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels_enabled || {});
        setActiveProvider(data.sms_providers_config?.active_provider || 'twilio');
        setProviderCreds(data.sms_providers_config?.providers || {});
        if (data.tiktok_app_config) {
          setTiktokClientKey(data.tiktok_app_config.client_key || '');
          setTiktokHasSecret(data.tiktok_app_config.has_secret || false);
          setTiktokRedirectUri(data.tiktok_app_config.redirect_uri || `${getBackendUrl()}/api/integrations/tiktok/callback`);
        } else {
          setTiktokRedirectUri(`${getBackendUrl()}/api/integrations/tiktok/callback`);
        }
        if (data.linkedin_app_config) {
          setLinkedinClientId(data.linkedin_app_config.client_id || '');
          setLinkedinHasSecret(data.linkedin_app_config.has_secret || false);
          setLinkedinRedirectUri(data.linkedin_app_config.redirect_uri || `${getBackendUrl()}/api/integrations/linkedin/callback`);
        } else {
          setLinkedinRedirectUri(`${getBackendUrl()}/api/integrations/linkedin/callback`);
        }
      }

      if (modesRes.ok) {
        const modesData = await modesRes.json();
        const loadedModes = modesData.connection_modes || {
          whatsapp_cloud: 'both',
          instagram: 'both',
          messenger: 'both',
        };
        const loadedMeta = modesData.meta_config || {
          app_id: '',
          app_secret: '',
          has_secret: false,
          whatsapp_config_id: '',
          instagram_config_id: '',
          messenger_config_id: '',
        };
        setConnectionModes(loadedModes);
        setMetaConfig(loadedMeta);
      }
    } catch {
      toast.error(t('channels.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveSettings = async (updatedChannels = channels, updatedActiveProv = activeProvider, updatedCreds = providerCreds) => {
    setSaving(true);
    try {
      const response = await fetchWithCsrf('/admin/channels', {
        method: 'PUT',
        body: JSON.stringify({
          channels_enabled: updatedChannels,
          sms_providers_config: {
            active_provider: updatedActiveProv,
            providers: updatedCreds
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t('channels.saveSuccess'));
        setChannels(data.channels_enabled || {});
        setActiveProvider(data.sms_providers_config?.active_provider || 'twilio');
        setProviderCreds(data.sms_providers_config?.providers || {});
      } else {
        throw new Error();
      }
    } catch {
      toast.error(t('channels.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTikTokConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokClientKey.trim()) {
      toast.error('TikTok Client Key is required.');
      return;
    }
    setSavingTikTokConfig(true);
    try {
      const res = await fetchWithCsrf('/admin/channels/tiktok-config', {
        method: 'PUT',
        body: JSON.stringify({
          client_key: tiktokClientKey.trim(),
          client_secret: tiktokClientSecret.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('TikTok Developer App configuration saved successfully.');
        setIsTikTokModalOpen(false);
        setTiktokClientSecret('');
        setTiktokHasSecret(true);
        if (data.redirect_uri) setTiktokRedirectUri(data.redirect_uri);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save TikTok settings.');
      }
    } catch {
      toast.error('An error occurred while saving TikTok settings.');
    } finally {
      setSavingTikTokConfig(false);
    }
  };

  const handleSaveLinkedInConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinClientId.trim()) {
      toast.error('LinkedIn Client ID is required.');
      return;
    }
    setSavingLinkedInConfig(true);
    try {
      const res = await fetchWithCsrf('/admin/channels/linkedin-config', {
        method: 'PUT',
        body: JSON.stringify({
          client_id: linkedinClientId.trim(),
          client_secret: linkedinClientSecret.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('LinkedIn Developer App configuration saved successfully.');
        setIsLinkedInModalOpen(false);
        setLinkedinClientSecret('');
        setLinkedinHasSecret(true);
        if (data.redirect_uri) setLinkedinRedirectUri(data.redirect_uri);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save LinkedIn settings.');
      }
    } catch {
      toast.error('An error occurred while saving LinkedIn settings.');
    } finally {
      setSavingLinkedInConfig(false);
    }
  };

  const handleOpenModesModal = (channelId: MetaChannelKey = 'whatsapp_cloud') => {
    setSelectedMetaChannel(channelId);
    const isConfigured = !!(metaConfig.app_id && (metaConfig.has_secret || metaConfig.app_secret));
    const modes = { ...connectionModes };
    if (!isConfigured && (modes[channelId] === 'both' || modes[channelId] === 'embedded')) {
      modes[channelId] = 'manual';
    }
    setTempModes(modes);
    setIsModesModalOpen(true);
  };

  const handleSaveConnectionModes = async () => {
    const isConfigured = !!(metaConfig.app_id && (metaConfig.has_secret || metaConfig.app_secret));
    const selectedMode = tempModes[selectedMetaChannel] || (isConfigured ? 'both' : 'manual');
    if ((selectedMode === 'both' || selectedMode === 'embedded') && !isConfigured) {
      toast.error('Cannot enable Embedded Signup until Meta credentials are configured in Meta Settings.');
      return;
    }
    setSavingModes(true);
    try {
      const response = await fetchWithCsrf('/admin/channels/connection-modes', {
        method: 'PUT',
        body: JSON.stringify({
          connection_modes: tempModes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t('channels.saveModesSuccess') || 'Channel connection mode updated successfully.');
        setConnectionModes(data.connection_modes);
        setIsModesModalOpen(false);
      } else {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update connection mode.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update connection mode.');
    } finally {
      setSavingModes(false);
    }
  };



  const handleChannelToggleClick = (id: string, label: string, logo?: string, icon?: React.ComponentType<any>) => {
    const isCurrentlyEnabled = !!channels[id];
    setConfirmChannelId(id);
    setConfirmChannelName(label);
    setConfirmChannelLogo(logo);
    setConfirmChannelIcon(icon);
    setConfirmActionType(isCurrentlyEnabled ? 'disable' : 'enable');
    setIsConfirmOpen(true);
  };

  const handleConfirmSwitch = () => {
    if (!confirmChannelId) return;

    const updated = {
      ...channels,
      [confirmChannelId]: confirmActionType === 'enable'
    };
    setChannels(updated);
    setIsConfirmOpen(false);

    // Save automatically on confirm
    handleSaveSettings(updated, activeProvider, providerCreds);
  };

  const handleOpenManageModal = () => {
    setTempActiveProvider(activeProvider);
    const credsCopy: Record<string, any> = {};
    for (const key of Object.keys(providerCreds)) {
      credsCopy[key] = { ...providerCreds[key] };
      if (credsCopy[key].enabled === undefined) {
        credsCopy[key].enabled = key === activeProvider;
      }
    }
    setTempProviderCreds(credsCopy);
    setIsModalOpen(true);
  };

  const handleSaveModalSettings = () => {
    setProviderCreds(tempProviderCreds);
    setActiveProvider(tempActiveProvider);
    setIsModalOpen(false);
    handleSaveSettings(channels, tempActiveProvider, tempProviderCreds);
  };

  const handleProviderToggle = (provider: string) => {
    setTempProviderCreds(prev => {
      const current = !!prev[provider]?.enabled;
      const nextEnabled = !current;
      
      if (nextEnabled) {
        setTempActiveProvider(provider);
      }

      return {
        ...prev,
        [provider]: {
          ...(prev[provider] || {}),
          enabled: nextEnabled
        }
      };
    });
  };

  if (loading) {
    return <SimpleLoader message={t('channels.loading')} />;
  }

  const metaChannelsList = [
    { 
      id: 'whatsapp_cloud', 
      label: t('channels.list.whatsapp_cloud.label'), 
      desc: t('channels.list.whatsapp_cloud.desc'), 
      logo: '/channels/whatsapp.webp',
      hasConnectionModes: true 
    },
    { 
      id: 'instagram', 
      label: t('channels.list.instagram.label'), 
      desc: t('channels.list.instagram.desc'), 
      logo: '/channels/instagram.svg',
      hasConnectionModes: true 
    },
    { 
      id: 'messenger', 
      label: t('channels.list.messenger.label'), 
      desc: t('channels.list.messenger.desc'), 
      logo: '/channels/messenger.webp',
      hasConnectionModes: true 
    },
  ];

  const otherChannelsList = [
    { 
      id: 'whatsapp_baileys', 
      label: t('channels.list.whatsapp_baileys.label'), 
      desc: t('channels.list.whatsapp_baileys.desc'), 
      logo: '/channels/whatsapp.webp',
      protocolBadge: t('channels.protoBaileys') || 'Web Socket (QR Session)',
      protocolSubtitle: 'Multi-Device Direct Protocol',
      protocolIcon: QrCode,
      protocolColor: 'text-emerald-700',
      iconColor: 'text-emerald-600',
    },
    { 
      id: 'telegram', 
      label: t('channels.list.telegram.label'), 
      desc: t('channels.list.telegram.desc'), 
      logo: '/channels/telegram.webp',
      protocolBadge: t('channels.protoTelegram') || 'Telegram Bot API',
      protocolSubtitle: 'Official Bot Token Gateway',
      protocolIcon: Bot,
      protocolColor: 'text-sky-700',
      iconColor: 'text-sky-600',
    },
    { 
      id: 'sms', 
      label: t('channels.list.sms.label'), 
      desc: t('channels.list.sms.desc'), 
      icon: Smartphone, 
      hasManage: true,
      protocolBadge: t('channels.protoSms') || 'SMS Telephony Gateway',
      protocolSubtitle: 'Twilio, Plivo, Vonage & Telnyx',
      protocolIcon: Radio,
      protocolColor: 'text-purple-700',
      iconColor: 'text-purple-600',
    },
    { 
      id: 'email', 
      label: t('channels.list.email.label'), 
      desc: t('channels.list.email.desc'), 
      icon: Mail, 
      protocolBadge: t('channels.protoEmail') || 'Two-Way Mailbox Sync',
      protocolSubtitle: 'SMTP / IMAP Mail Service',
      protocolIcon: Mail,
      protocolColor: 'text-amber-700',
      iconColor: 'text-amber-600',
    },
    { 
      id: 'tiktok', 
      label: t('channels.list.tiktok.label') || 'TikTok', 
      desc: t('channels.list.tiktok.desc') || 'Official TikTok Login Kit, Webhooks & Video Publishing API', 
      logo: '/channels/tiktok.webp', 
      hasManageTikTok: true,
      protocolBadge: t('channels.protoTikTok') || 'TikTok Open API',
      protocolSubtitle: 'OAuth 2.0 & Video Content Posting',
      protocolIcon: Film,
      protocolColor: 'text-zinc-900',
      iconColor: 'text-zinc-900',
    },
    { 
      id: 'linkedin', 
      label: t('channels.list.linkedin.label') || 'LinkedIn', 
      desc: t('channels.list.linkedin.desc') || 'Official LinkedIn OAuth 2.0 & Community Management Posts API', 
      logo: '/channels/linkedin.png', 
      hasManageLinkedIn: true,
      protocolBadge: t('channels.protoLinkedIn') || 'LinkedIn Posts API',
      protocolSubtitle: 'OAuth 2.0 & Content Publishing Only',
      protocolIcon: Globe,
      protocolColor: 'text-[#0A66C2]',
      iconColor: 'text-[#0A66C2]',
    },
  ];

  const providerDetails = [
    { id: 'twilio', label: t('channels.providers.twilio'), logo: '/channels/twilio.svg' },
    { id: 'vonage', label: t('channels.providers.vonage'), logo: '/channels/vonage.webp' },
    { id: 'messagebird', label: t('channels.providers.messagebird'), logo: '/channels/message_bird.webp' },
    { id: 'plivo', label: t('channels.providers.plivo'), logo: '/channels/plivo.svg' },
    { id: 'sinch', label: t('channels.providers.sinch'), logo: '/channels/sinch.png' },
    { id: 'telnyx', label: t('channels.providers.telnyx'), logo: '/channels/telnyx.ico' },
  ];

  const modeOptions = [
    { value: 'both', label: t('channels.modes.both') || t('channels.allowBoth') || 'Allow Both (Embedded + Manual BYOK)' },
    { value: 'embedded', label: t('channels.modes.embedded') || 'Meta Embedded Signup Only' },
    { value: 'manual', label: t('channels.modes.manual') || 'Manual API Keys / BYOK Only' },
  ];

  const ConfirmIconComponent = confirmChannelIcon;

  return (
    <div className="w-full bg-white select-none text-black animate-fade-in font-sans p-4 sm:p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
      

      {/* 1. META CONVERSATIONAL CHANNELS TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
          <div>
            <h2 className="text-xs font-bold text-zinc-955 uppercase tracking-wider">
              {t('channels.metaChannelsTitle') || 'Meta Conversational Channels'}
            </h2>
            <p className="text-[10.5px] text-zinc-500 font-medium mt-0.5">
              {t('channels.metaChannelsDesc') || 'Official Meta Graph API channels supporting 1-Click Embedded Signup and Manual BYOK keys.'}
            </p>
          </div>
          <Link
            href="/superadmin/settings/meta"
            className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-3xs shrink-0 self-start sm:self-auto"
            title="Configure Meta Settings"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>{t('channels.configureMeta') || 'Configure Meta'}</span>
          </Link>
        </div>

        <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[10px] tracking-wider uppercase">
                  <th className="px-5 py-3">{t('channels.thChannel') || 'Channel'}</th>
                  <th className="px-5 py-3">{t('channels.thConnectionMode') || 'Tenant Connection Mode'}</th>
                  <th className="px-5 py-3 text-right">{t('channels.thActions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E6] text-zinc-850">
                {metaChannelsList.map((ch) => {
                  const isEnabled = !!channels[ch.id];
                  const mode = connectionModes[ch.id] || 'both';

                  return (
                    <tr 
                      key={ch.id}
                      onClick={() => handleOpenModesModal(ch.id as MetaChannelKey)}
                      className="hover:bg-[#FAFAFA]/50 transition-colors cursor-pointer"
                    >
                      {/* Channel Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-lg border border-[#E8E8E6] bg-white flex items-center justify-center shrink-0 p-2 select-none">
                            <Image 
                              src={ch.logo} 
                              alt={ch.label} 
                              width={24} 
                              height={24} 
                              className="object-contain max-h-6 w-auto select-none" 
                            />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-bold text-zinc-955 block">{ch.label}</span>
                            <span className="text-[10px] text-zinc-450 font-medium block mt-0.5">{ch.desc}</span>
                          </div>
                        </div>
                      </td>

                      {/* Connection Mode */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            {mode === 'both' && (
                              <>
                                <Layers className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="text-xs font-bold text-emerald-700">
                                  Embedded + BYOK
                                </span>
                              </>
                            )}
                            {mode === 'embedded' && (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-blue-700">
                                  Embedded Only
                                </span>
                              </>
                            )}
                            {mode === 'manual' && (
                              <>
                                <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span className="text-xs font-bold text-amber-700">
                                  BYOK Only
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-450 font-medium">Meta Graph API v21.0</span>
                        </div>
                      </td>



                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 select-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModesModal(ch.id as MetaChannelKey);
                            }}
                            className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                            title={`Manage ${ch.label}`}
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>{t('channels.manage') || 'Manage'}</span>
                          </button>

                          {/* Switch Control */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChannelToggleClick(ch.id, ch.label, ch.logo);
                            }}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer inline-flex items-center ${
                              isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                            }`}
                            aria-label={`Toggle ${ch.label}`}
                          >
                            <div 
                              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`} 
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. INDEPENDENT MESSAGING GATEWAYS TABLE */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between select-none">
          <div>
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
              {t('channels.otherChannelsTitle') || 'Independent Messaging Gateways'}
            </h2>
            <p className="text-[10.5px] text-zinc-500 font-medium mt-0.5">
              {t('channels.otherChannelsDesc') || 'Socket sessions, Bot tokens, Telephony SMS, and Mailbox communication infrastructure.'}
            </p>
          </div>
        </div>

        <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[10px] tracking-wider uppercase">
                  <th className="px-5 py-3">{t('channels.thChannel') || 'Channel'}</th>
                  <th className="px-5 py-3">{t('channels.thIntegrationType') || 'Integration Protocol'}</th>
                  <th className="px-5 py-3 text-right">{t('channels.thActions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E6] text-zinc-850">
                {otherChannelsList.map((ch) => {
                  const isEnabled = !!channels[ch.id];

                  return (
                    <tr 
                      key={ch.id}
                      className="hover:bg-[#FAFAFA]/50 transition-colors"
                    >
                      {/* Channel Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-lg border border-[#E8E8E6] bg-white flex items-center justify-center shrink-0 p-2 select-none">
                            {ch.logo ? (
                              <Image 
                                src={ch.logo} 
                                alt={ch.label} 
                                width={24} 
                                height={24} 
                                className="object-contain max-h-6 w-auto select-none" 
                              />
                            ) : ch.icon ? (
                              <ch.icon className="h-5 w-5 text-zinc-650" />
                            ) : null}
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-bold text-zinc-955 block">{ch.label}</span>
                            <span className="text-[10px] text-zinc-450 font-medium block mt-0.5">{ch.desc}</span>
                          </div>
                        </div>
                      </td>

                      {/* Integration Protocol */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            {ch.protocolIcon && (
                              <ch.protocolIcon className={`h-3.5 w-3.5 ${ch.iconColor} shrink-0`} />
                            )}
                            <span className={`text-xs font-bold ${ch.protocolColor}`}>
                              {ch.protocolBadge}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-450 font-medium">{ch.protocolSubtitle}</span>
                        </div>
                      </td>



                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 select-none">
                          {ch.hasManage && (
                            <button
                              type="button"
                              onClick={handleOpenManageModal}
                              className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>{t('channels.manageProviders')}</span>
                            </button>
                          )}

                          {ch.hasManageTikTok && (
                            <button
                              type="button"
                              onClick={() => setIsTikTokModalOpen(true)}
                              className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>{t('channels.configureTikTok') || 'Configure TikTok'}</span>
                            </button>
                          )}

                          {ch.hasManageLinkedIn && (
                            <button
                              type="button"
                              onClick={() => setIsLinkedInModalOpen(true)}
                              className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>{t('channels.configureLinkedIn') || 'Configure LinkedIn'}</span>
                            </button>
                          )}

                          {/* Switch Control */}
                          <button
                            type="button"
                            onClick={() => handleChannelToggleClick(ch.id, ch.label, ch.logo, ch.icon)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer inline-flex items-center ${
                              isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                            }`}
                            aria-label={`Toggle ${ch.label}`}
                          >
                            <div 
                              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`} 
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* META EMBEDDED & CONNECTION MODES CONFIGURATION MODAL */}
      {isModesModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsModesModalOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsModesModalOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full shadow-xl relative z-50 animate-modal-box text-left flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0">
                  <Image 
                    src={metaChannelMetaMap[selectedMetaChannel].logo} 
                    alt={metaChannelMetaMap[selectedMetaChannel].name} 
                    width={20} 
                    height={20} 
                    className="object-contain" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {metaChannelMetaMap[selectedMetaChannel].fullName} Configuration
                  </h3>
                  <span className="text-[10px] text-zinc-450 font-medium block mt-0.5 truncate">
                    {metaChannelMetaMap[selectedMetaChannel].desc}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModesModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">

              {/* Connection Mode for Selected Channel */}
              <div className="space-y-2.5">
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                  Choose whether tenants connect {metaChannelMetaMap[selectedMetaChannel].name} via Meta Embedded Signup popup, their own Manual API Keys (BYOK), or allow both.
                </p>

                {/* Options List */}
                {(() => {
                  const isMetaConfigured = !!(metaConfig.app_id && (metaConfig.has_secret || metaConfig.app_secret));
                  const effectiveMode = !isMetaConfigured ? 'manual' : (tempModes[selectedMetaChannel] || 'both');

                  return (
                    <div className="grid grid-cols-1 gap-2">
                      {/* Option A: Both */}
                      <div
                        title={!isMetaConfigured ? "Requires Meta App credentials in Meta Settings" : undefined}
                        onClick={() => {
                          if (!isMetaConfigured) {
                            toast.error(t('channels.requireMetaConfig') || 'Please configure Meta credentials before enabling Embedded Signup.');
                            return;
                          }
                          setTempModes({ ...tempModes, [selectedMetaChannel]: 'both' });
                        }}
                        className={`group relative p-3 rounded-xl border transition-all select-none ${
                          !isMetaConfigured
                            ? 'bg-zinc-50/70 border-[#E8E8E6] opacity-60 cursor-not-allowed'
                            : effectiveMode === 'both'
                              ? 'bg-white border-zinc-955 shadow-3xs ring-1 ring-zinc-955 cursor-pointer'
                              : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-zinc-50/40 cursor-pointer'
                        }`}
                      >
                        {/* Tooltip on hover when locked */}
                        {!isMetaConfigured && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-medium rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5">
                            <Lock className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                            <span>{t('channels.requireMetaConfig') || 'Requires Meta App credentials in Meta Settings'}</span>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900 rotate-45" />
                          </div>
                        )}

                        <div className="flex items-center h-5 shrink-0">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                            !isMetaConfigured
                              ? 'border-zinc-300 bg-zinc-100'
                              : effectiveMode === 'both'
                                ? 'border-zinc-955 bg-zinc-955'
                                : 'border-zinc-300 bg-white'
                          }`}>
                            {isMetaConfigured && effectiveMode === 'both' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center h-5">
                            <span className={`text-xs font-bold ${!isMetaConfigured ? 'text-zinc-500' : 'text-zinc-955'}`}>
                              {t('channels.allowBoth') || 'Allow Both (Embedded + Manual BYOK)'}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 font-normal mt-0.5 leading-relaxed">
                            Tenants can either onboard in 1-click via official Meta popup or supply their own API credentials.
                          </p>
                        </div>
                      </div>

                      {/* Option B: Embedded Only */}
                      <div
                        title={!isMetaConfigured ? "Requires Meta App credentials in Meta Settings" : undefined}
                        onClick={() => {
                          if (!isMetaConfigured) {
                            toast.error(t('channels.requireMetaConfig') || 'Please configure Meta credentials before enabling Embedded Signup.');
                            return;
                          }
                          setTempModes({ ...tempModes, [selectedMetaChannel]: 'embedded' });
                        }}
                        className={`group relative p-3 rounded-xl border transition-all select-none ${
                          !isMetaConfigured
                            ? 'bg-zinc-50/70 border-[#E8E8E6] opacity-60 cursor-not-allowed'
                            : effectiveMode === 'embedded'
                              ? 'bg-white border-zinc-955 shadow-3xs ring-1 ring-zinc-955 cursor-pointer'
                              : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-zinc-50/40 cursor-pointer'
                        }`}
                      >
                        {/* Tooltip on hover when locked */}
                        {!isMetaConfigured && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-medium rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5">
                            <Lock className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                            <span>{t('channels.requireMetaConfig') || 'Requires Meta App credentials in Meta Settings'}</span>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900 rotate-45" />
                          </div>
                        )}

                        <div className="flex items-center h-5 shrink-0">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                            !isMetaConfigured
                              ? 'border-zinc-300 bg-zinc-100'
                              : effectiveMode === 'embedded'
                                ? 'border-zinc-955 bg-zinc-955'
                                : 'border-zinc-300 bg-white'
                          }`}>
                            {isMetaConfigured && effectiveMode === 'embedded' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center h-5">
                            <span className={`text-xs font-bold ${!isMetaConfigured ? 'text-zinc-500' : 'text-zinc-955'}`}>
                              Meta Embedded Signup Only
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 font-normal mt-0.5 leading-relaxed">
                            Tenants are strictly restricted to 1-click official Meta OAuth popup onboarding.
                          </p>
                        </div>
                      </div>

                      {/* Option C: Manual BYOK Only */}
                      <div
                        onClick={() => setTempModes({ ...tempModes, [selectedMetaChannel]: 'manual' })}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          effectiveMode === 'manual'
                            ? 'bg-white border-zinc-955 shadow-3xs ring-1 ring-zinc-955'
                            : 'bg-white border-[#E8E8E6] hover:border-zinc-300 hover:bg-zinc-50/40'
                        }`}
                      >
                        <div className="flex items-center h-5 shrink-0">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                            effectiveMode === 'manual' ? 'border-zinc-955 bg-zinc-955' : 'border-zinc-300 bg-white'
                          }`}>
                            {effectiveMode === 'manual' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center h-5">
                            <span className="text-xs font-bold text-zinc-955">Manual API Keys / BYOK Only</span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 font-normal mt-0.5 leading-relaxed">
                            Tenants must provide their own Meta Developer App keys, tokens, and account IDs.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Warning Banner or Configured Status for Embedded Signup */}
              {(() => {
                const isMetaConfigured = !!(metaConfig.app_id && (metaConfig.has_secret || metaConfig.app_secret));
                const currentMode = tempModes[selectedMetaChannel] || (isMetaConfigured ? 'both' : 'manual');
                const requiresMeta = currentMode === 'both' || currentMode === 'embedded';

                if (!isMetaConfigured) {
                  return (
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 overflow-hidden text-amber-950 animate-fade-in shadow-3xs">
                      <div className="p-3.5 flex items-start gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-amber-100/90 border border-amber-200/80 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-amber-950">
                            Meta Developer App Not Configured
                          </h4>
                          <p className="text-[11px] text-amber-900/80 font-medium mt-1 leading-relaxed">
                            Embedded Signup options are locked because Meta App credentials are not configured. Connect your Meta App credentials to unlock Embedded Signup.
                          </p>
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 bg-amber-100/40 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[10.5px] font-medium text-amber-900/75">
                          Configure Meta credentials to unlock Embedded modes
                        </span>
                        <Link
                          href="/superadmin/settings/meta"
                          onClick={() => setIsModesModalOpen(false)}
                          className="h-8 px-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-[6px] shrink-0 transition-all shadow-3xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Configure Meta</span>
                        </Link>
                      </div>
                    </div>
                  );
                }

                if (requiresMeta && isMetaConfigured) {
                  return (
                    <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 flex items-center justify-between gap-2.5 animate-fade-in text-xs shadow-3xs">
                      <div className="flex items-center gap-2.5 text-emerald-950 font-medium">
                        <div className="h-6 w-6 rounded-md bg-emerald-100 border border-emerald-200/80 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                        </div>
                        <span className="text-[11px]">
                          Meta App configured & active (App ID: <span className="font-mono font-bold text-emerald-900">{metaConfig.app_id}</span>).
                        </span>
                      </div>
                      <Link
                        href="/superadmin/settings/meta"
                        onClick={() => setIsModesModalOpen(false)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer shrink-0 inline-flex items-center gap-1"
                      >
                        <span>Configure Meta</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="p-3 rounded-xl border border-[#E8E8E6] bg-[#FAFAFA] flex items-center gap-2.5 text-xs text-zinc-600 shadow-3xs">
                    <div className="h-6 w-6 rounded-md bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0">
                      <Info className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <span className="text-[11px] font-medium leading-relaxed">
                      Tenants will provide their own Meta API keys. Platform Meta App configuration is not required for this mode.
                    </span>
                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-5 py-3.5 flex items-center justify-end gap-2.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setIsModesModalOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8.5 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                disabled={savingModes}
                onClick={handleSaveConnectionModes}
                className="h-8.5 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingModes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t('dashboard.saveChanges')}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}



      {/* SMS MANAGEMENT CONFIGURATION MODAL */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full shadow-xl relative z-50 animate-modal-box text-left flex flex-col overflow-hidden max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('channels.smsCarriersConfig')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              
              {/* Providers list inline - Toggles Only */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden divide-y divide-[#E8E8E6] shadow-3xs">
                {providerDetails.map((prov) => {
                  const isEnabled = !!tempProviderCreds[prov.id]?.enabled;
                  
                  return (
                    <div 
                      key={prov.id} 
                      className="p-4 flex items-center justify-between hover:bg-[#FAFAFA]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white border border-[#E8E8E6] flex items-center justify-center p-1.5 select-none shrink-0">
                          <Image 
                            src={prov.logo} 
                            alt={prov.label} 
                            width={24} 
                            height={24} 
                            className="object-contain max-h-5 select-none" 
                          />
                        </div>
                        <span className="text-xs font-bold text-zinc-955">{prov.label}</span>
                      </div>

                      {/* Switch Enable Control */}
                      <button
                        type="button"
                        onClick={() => handleProviderToggle(prov.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                          isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                        }`}
                        aria-label={`Toggle ${prov.label}`}
                      >
                        <div 
                          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`} 
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-5 py-3.5 flex items-center justify-end gap-2.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8.5 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveModalSettings}
                className="h-8.5 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer"
              >
                {t('dashboard.saveChanges')}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION SWITCH DIALOG */}
      {isConfirmOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsConfirmOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full shadow-xl relative z-50 animate-modal-box text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded border p-1 flex items-center justify-center shrink-0 ${
                  confirmActionType === 'disable'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-[#FAFAFA] border-[#E8E8E6]'
                }`}>
                  {confirmActionType === 'disable' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                  ) : confirmChannelLogo ? (
                    <Image 
                      src={confirmChannelLogo} 
                      alt={confirmChannelName} 
                      width={16} 
                      height={16} 
                      className="object-contain select-none" 
                    />
                  ) : ConfirmIconComponent ? (
                    <ConfirmIconComponent className="h-4 w-4 text-[#6B6B6B]" />
                  ) : null}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {confirmActionType === 'enable' 
                      ? t('channels.confirmEnableTitle') 
                      : t('channels.confirmDisableTitle')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {confirmActionType === 'enable' 
                  ? t('channels.confirmEnableText', { name: confirmChannelName }) 
                  : t('channels.confirmDisableText', { name: confirmChannelName })}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-5 py-3.5 flex items-center justify-end gap-2.5 select-none">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8.5 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className={`h-8.5 px-4 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer ${
                  confirmActionType === 'enable' 
                    ? 'bg-zinc-955 hover:bg-zinc-900' 
                    : 'bg-red-650 hover:bg-red-750'
                }`}
              >
                {confirmActionType === 'enable' 
                  ? t('channels.enable') 
                  : t('channels.disable')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TIKTOK APP CONFIGURATION MODAL */}
      {isTikTokModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsTikTokModalOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsTikTokModalOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full shadow-xl relative z-50 animate-modal-box text-left overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded border border-[#E8E8E6] bg-white p-1 flex items-center justify-center shrink-0 shadow-3xs">
                  <Image 
                    src="/channels/tiktok.webp" 
                    alt="TikTok" 
                    width={18} 
                    height={18} 
                    className="object-contain select-none" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('channels.tiktokSettingsTitle') || 'TikTok Developer App Settings'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                    {t('channels.tiktokSettingsDesc') || 'Configure official TikTok Login Kit & Content Posting credentials'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTikTokModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveTikTokConfig} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-5 space-y-4 flex-1">
                {/* Information Tip */}
                <div className="p-3 bg-zinc-50 border border-[#E8E8E6] rounded-lg text-left text-xs text-zinc-650 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
                    <span>TikTok Developer Portal Setup</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed">
                    Obtain your <strong>Client Key</strong> and <strong>Client Secret</strong> from the TikTok for Developers portal. Ensure your app has requested the permissions: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">user.info.basic</code>, <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">im</code>, <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">video.upload</code>, and <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">video.publish</code>.
                  </p>
                </div>

                {/* TikTok Client Key */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10.5px] font-bold text-zinc-800 uppercase tracking-wider block">
                    TikTok Client Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tiktokClientKey}
                    onChange={(e) => setTiktokClientKey(e.target.value)}
                    placeholder="e.g. aw1234567890abcdef"
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-[6px] focus:outline-none focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 font-mono transition-colors"
                  />
                </div>

                {/* TikTok Client Secret */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-zinc-800 uppercase tracking-wider block">
                      TikTok Client Secret
                    </label>
                    {tiktokHasSecret && (
                      <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showTiktokSecret ? 'text' : 'password'}
                      value={tiktokClientSecret}
                      onChange={(e) => setTiktokClientSecret(e.target.value)}
                      placeholder={tiktokHasSecret ? '•••••••••••••••••••••••• (Leave blank to keep existing)' : 'Enter TikTok Client Secret'}
                      className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-[#E8E8E6] rounded-[6px] focus:outline-none focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTiktokSecret(!showTiktokSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      title={showTiktokSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showTiktokSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* OAuth Redirect URI Helper */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Authorized OAuth Redirect URI (Add to TikTok Console)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={tiktokRedirectUri || `${getBackendUrl()}/api/integrations/tiktok/callback`}
                      className="flex-1 h-8 px-2.5 text-[11px] bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-zinc-700 font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = tiktokRedirectUri || `${getBackendUrl()}/api/integrations/tiktok/callback`;
                        navigator.clipboard.writeText(url);
                        toast.success('Redirect URI copied to clipboard!');
                      }}
                      className="h-8 px-2.5 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Webhook Endpoint Helper */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Webhook Endpoint Template (Per Tenant Connection)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${getBackendUrl()}/api/webhooks/channel/{connection_id}`}
                      className="flex-1 h-8 px-2.5 text-[11px] bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-zinc-700 font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${getBackendUrl()}/api/webhooks/channel/{connection_id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Webhook template copied to clipboard!');
                      }}
                      className="h-8 px-2.5 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-5 py-3.5 flex items-center justify-end gap-2.5 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTikTokModalOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8.5 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingTikTokConfig}
                  className="h-8.5 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTikTokConfig ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save App Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* LINKEDIN APP CONFIGURATION MODAL */}
      {isLinkedInModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
          onClick={() => setIsLinkedInModalOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsLinkedInModalOpen(false)} />
          
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full shadow-xl relative z-50 animate-modal-box text-left overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded border border-[#E8E8E6] bg-white p-1 flex items-center justify-center shrink-0 shadow-3xs">
                  <Image 
                    src="/channels/linkedin.png" 
                    alt="LinkedIn" 
                    width={18} 
                    height={18} 
                    className="object-contain select-none" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('channels.linkedinSettingsTitle') || 'LinkedIn Developer App Settings'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                    {t('channels.linkedinSettingsDesc') || 'Configure official LinkedIn OAuth 2.0 & Posts API credentials'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkedInModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveLinkedInConfig} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-5 space-y-4 flex-1">
                {/* Information Tip */}
                <div className="p-3 bg-zinc-50 border border-[#E8E8E6] rounded-lg text-left text-xs text-zinc-650 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#0A66C2] text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-[#0A66C2]" />
                    <span>LinkedIn Developer Portal Setup</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed">
                    Obtain your <strong>Client ID</strong> and <strong>Client Secret</strong> from the LinkedIn Developer Portal. In your app products, enable <strong>Share on LinkedIn</strong> and <strong>Sign In with LinkedIn using OpenID Connect</strong> (scopes: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">openid</code>, <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">profile</code>, <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">w_member_social</code>, <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-[9.5px]">w_organization_social</code>).
                  </p>
                  <p className="text-[10px] text-zinc-500 italic pt-0.5">
                    Note: LinkedIn integration is exclusively configured for Content Publishing to personal profiles and organization company pages.
                  </p>
                </div>

                {/* LinkedIn Client ID */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10.5px] font-bold text-zinc-800 uppercase tracking-wider block">
                    LinkedIn Client ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={linkedinClientId}
                    onChange={(e) => setLinkedinClientId(e.target.value)}
                    placeholder="e.g. 78xxxxxxxxxxxx"
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-[6px] focus:outline-none focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 font-mono transition-colors"
                  />
                </div>

                {/* LinkedIn Client Secret */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-zinc-800 uppercase tracking-wider block">
                      LinkedIn Client Secret
                    </label>
                    {linkedinHasSecret && (
                      <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showLinkedinSecret ? 'text' : 'password'}
                      value={linkedinClientSecret}
                      onChange={(e) => setLinkedinClientSecret(e.target.value)}
                      placeholder={linkedinHasSecret ? '•••••••••••••••••••••••• (Leave blank to keep existing)' : 'Enter LinkedIn Client Secret'}
                      className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-[#E8E8E6] rounded-[6px] focus:outline-none focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLinkedinSecret(!showLinkedinSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      title={showLinkedinSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showLinkedinSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* OAuth Redirect URI Helper */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Authorized OAuth Redirect URI (Add to LinkedIn Developer Console)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={linkedinRedirectUri || `${getBackendUrl()}/api/integrations/linkedin/callback`}
                      className="flex-1 h-8 px-2.5 text-[11px] bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-zinc-700 font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = linkedinRedirectUri || `${getBackendUrl()}/api/integrations/linkedin/callback`;
                        navigator.clipboard.writeText(url);
                        toast.success('LinkedIn Redirect URI copied to clipboard!');
                      }}
                      className="h-8 px-2.5 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-[10px] font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-5 py-3.5 flex items-center justify-end gap-2.5 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLinkedInModalOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8.5 px-3.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingLinkedInConfig}
                  className="h-8.5 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingLinkedInConfig ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save App Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
