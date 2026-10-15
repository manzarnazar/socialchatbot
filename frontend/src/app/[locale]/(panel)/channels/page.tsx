'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { PlanLockModal } from '@/components/billing/PlanLockModal';
import { 
  AlertTriangle,
  Lock,
  ShieldAlert,
  X,
  Settings,
  Share2
} from 'lucide-react';
import { 
  WhatsAppConnection,
  BaileysConnection,
  InstagramConnection,
  FacebookMessengerConnection,
  TelegramConnection,
  SmsConnection,
  EmailConnection,
  TikTokConnection,
  LinkedInConnection,
  ActiveChannelItem,
  availableChannelsList,
  renderChannelLogo
} from './channelsTypes';

// Dynamic import of the heavy 2,800+ line modal component (Zero-overhead on initial page load)
const ChannelConfigModal = dynamic(() => import('./components/ChannelConfigModal'), {
  ssr: false,
  loading: () => null
});

export default function ChannelsPage() {
  const t = useTranslations('Channels');
  const tCommon = useTranslations('Common');
  const tPlanLock = useTranslations('PlanLock');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Subscription Plan Context & Gate States
  const [userPlan, setUserPlan] = useState<any>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockedChannelInfo, setLockedChannelInfo] = useState<{ title: string; desc: string; name: string } | null>(null);

  // Multi-Connection Arrays per Channel Provider
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [baileysConnections, setBaileysConnections] = useState<BaileysConnection[]>([]);
  const [instagramConnections, setInstagramConnections] = useState<InstagramConnection[]>([]);
  const [messengerConnections, setMessengerConnections] = useState<FacebookMessengerConnection[]>([]);
  const [telegramConnections, setTelegramConnections] = useState<TelegramConnection[]>([]);
  const [smsConnections, setSmsConnections] = useState<SmsConnection[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [tiktokConnections, setTiktokConnections] = useState<TikTokConnection[]>([]);
  const [linkedinConnections, setLinkedinConnections] = useState<LinkedInConnection[]>([]);

  // Primary status indicators for quick checks
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappDetails, setWhatsappDetails] = useState<WhatsAppConnection | null>(null);
  const [baileysConnected, setBaileysConnected] = useState(false);
  const [baileysDetails, setBaileysDetails] = useState<BaileysConnection | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramDetails, setInstagramDetails] = useState<InstagramConnection | null>(null);
  const [messengerConnected, setMessengerConnected] = useState(false);
  const [messengerDetails, setMessengerDetails] = useState<FacebookMessengerConnection | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramDetails, setTelegramDetails] = useState<TelegramConnection | null>(null);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokDetails, setTiktokDetails] = useState<TikTokConnection | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinDetails, setLinkedinDetails] = useState<LinkedInConnection | null>(null);
  const [smsConnected, setSmsConnected] = useState(false);
  const [smsDetails, setSmsDetails] = useState<SmsConnection | null>(null);
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailDetails, setEmailDetails] = useState<EmailConnection | null>(null);

  // Modal & Selection States
  const [selectedChannelSlug, setSelectedChannelSlug] = useState<string | null>(null);
  const [editingConnection, setEditingConnection] = useState<any | null>(null);
  const [showBaileysDisclaimer, setShowBaileysDisclaimer] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{ slug: string; id?: number; name?: string } | null>(null);
  const [togglingConnectionId, setTogglingConnectionId] = useState<number | null>(null);

  // Global settings from SuperAdmin
  const [globalChannelsEnabled, setGlobalChannelsEnabled] = useState<Record<string, boolean>>({});
  const [channelConnectionModes, setChannelConnectionModes] = useState<Record<string, string>>({
    whatsapp_cloud: 'both',
    instagram: 'both',
    messenger: 'both',
  });
  const [metaAppId, setMetaAppId] = useState<string>('');
  const [metaConfigIds, setMetaConfigIds] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    fetchChannels();
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    try {
      const res = await fetchWithCsrf('/subscription/current');
      if (res.ok) {
        const data = await res.json();
        setUserPlan(data?.subscription?.plan || data?.plan || null);
      } else {
        const fallbackRes = await fetchWithCsrf('/billing/subscription');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setUserPlan(fallbackData?.subscription?.plan || fallbackData?.plan || null);
        }
      }
    } catch {}
  };

  const isChannelLocked = (channelSlug: string): { locked: boolean; reason?: string } => {
    if (!userPlan) return { locked: false };
    const limits = userPlan.limits || {};

    const channelLimitsMap: Record<string, string> = {
      whatsapp_cloud: 'channels_whatsapp_cloud',
      whatsapp_baileys: 'channels_whatsapp_baileys',
      telegram: 'channels_telegram',
      instagram: 'channels_instagram',
      messenger: 'channels_messenger',
      sms: 'channels_sms',
      email: 'channels_email',
      tiktok: 'channels_tiktok',
      linkedin: 'channels_linkedin'
    };

    const limitKey = channelLimitsMap[channelSlug];
    if (limitKey && limits[limitKey] === false) {
      return {
        locked: true,
        reason: tPlanLock('channelFeatureNotIncluded', { plan: userPlan.name })
      };
    }

    // 1. Check per-channel connection cap (-1 is unlimited)
    const allowedChannels = userPlan.allowed_channels;
    if (allowedChannels && typeof allowedChannels === 'object' && !Array.isArray(allowedChannels)) {
      const alias = (channelSlug === 'whatsapp_cloud' || channelSlug === 'whatsapp_baileys') ? 'whatsapp' : channelSlug;
      const rawCap = allowedChannels[channelSlug] ?? allowedChannels[alias];
      if (rawCap !== undefined && rawCap !== -1 && typeof rawCap === 'number' && rawCap > 0) {
        const currentChannelCount = getProviderConnectionCount(channelSlug);
        if (currentChannelCount >= rawCap) {
          return {
            locked: true,
            reason: tPlanLock('channelPerCapReached', { max: rawCap, plan: userPlan.name }) || `Per-channel limit (${rawCap}) reached for ${userPlan.name} plan.`
          };
        }
      }
    }

    // 2. Check workspace overall max_channels (-1 is unlimited)
    const effectiveMaxChannels = userPlan.max_channels ?? limits.max_channels;
    if (effectiveMaxChannels !== undefined && effectiveMaxChannels !== -1 && Number(effectiveMaxChannels) >= 0) {
      const totalConnected = 
        whatsappConnections.length + 
        baileysConnections.length + 
        telegramConnections.length + 
        instagramConnections.length + 
        messengerConnections.length + 
        smsConnections.length + 
        emailConnections.length +
        tiktokConnections.length +
        linkedinConnections.length;

      if (totalConnected >= Number(effectiveMaxChannels)) {
        return {
          locked: true,
          reason: tPlanLock('channelCapacityReached', { max: effectiveMaxChannels }) || `Workspace channel capacity (${effectiveMaxChannels}) reached.`
        };
      }
    }

    return { locked: false };
  };

  const getProviderConnectionCount = (slug: string): number => {
    switch (slug) {
      case 'whatsapp_cloud': return whatsappConnections.length;
      case 'whatsapp_baileys': return baileysConnections.length;
      case 'instagram': return instagramConnections.length;
      case 'messenger': return messengerConnections.length;
      case 'telegram': return telegramConnections.length;
      case 'sms': return smsConnections.length;
      case 'email': return emailConnections.length;
      case 'tiktok': return tiktokConnections.length;
      case 'linkedin': return linkedinConnections.length;
      default: return 0;
    }
  };

  const fetchChannels = async () => {
    setLoading(true);
    try {
      let data: any = null;
      const res = await fetchWithCsrf('/channels/enabled');
      if (res.ok) {
        data = await res.json();
      } else {
        const platRes = await fetchWithCsrf('/platform/settings');
        if (platRes.ok) {
          data = await platRes.json();
        }
      }

      if (data) {
        setGlobalChannelsEnabled(data.channels || data.channels_enabled || {});
        setChannelConnectionModes(data.connection_modes || data.channel_connection_modes || {
          whatsapp_cloud: 'both',
          instagram: 'both',
          messenger: 'both',
        });
        if (data.meta_app_id) {
          setMetaAppId(data.meta_app_id);
        }
        if (data.meta_config_ids) {
          setMetaConfigIds(data.meta_config_ids);
        }
      }
    } catch {
      // Fallback
    }

    await Promise.all([
      fetchWhatsAppStatus(),
      fetchBaileysStatus(),
      fetchInstagramStatus(),
      fetchMessengerStatus(),
      fetchTelegramStatus(),
      fetchSmsStatus(),
      fetchEmailStatus(),
      fetchTikTokStatus(),
      fetchLinkedInStatus()
    ]);
    setLoading(false);
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWhatsappConnected(data.connected);
        setWhatsappDetails(data);
        if (Array.isArray(data.connections)) {
          setWhatsappConnections(data.connections);
        } else if (data.connected && data.id) {
          setWhatsappConnections([data]);
        } else {
          setWhatsappConnections([]);
        }
      }
    } catch {}
  };

  const fetchBaileysStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/baileys/status');
      if (res.ok) {
        const data = await res.json();
        setBaileysConnected(data.connected);
        setBaileysDetails(data);
        if (Array.isArray(data.connections)) {
          setBaileysConnections(data.connections);
        } else if (data.connected && data.id) {
          setBaileysConnections([data]);
        } else {
          setBaileysConnections([]);
        }
      }
    } catch {}
  };

  const fetchInstagramStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/instagram/status');
      if (res.ok) {
        const data = await res.json();
        setInstagramConnected(data.connected);
        setInstagramDetails(data);
        if (Array.isArray(data.connections)) {
          setInstagramConnections(data.connections);
        } else if (data.connected && data.id) {
          setInstagramConnections([data]);
        } else {
          setInstagramConnections([]);
        }
      }
    } catch {}
  };

  const fetchMessengerStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/messenger/status');
      if (res.ok) {
        const data = await res.json();
        setMessengerConnected(data.connected);
        setMessengerDetails(data);
        if (Array.isArray(data.connections)) {
          setMessengerConnections(data.connections);
        } else if (data.connected && data.id) {
          setMessengerConnections([data]);
        } else {
          setMessengerConnections([]);
        }
      }
    } catch {}
  };

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTelegramConnected(data.connected);
        setTelegramDetails(data);
        if (Array.isArray(data.connections)) {
          setTelegramConnections(data.connections);
        } else if (data.connected && data.id) {
          setTelegramConnections([data]);
        } else {
          setTelegramConnections([]);
        }
      }
    } catch {}
  };

  const fetchSmsStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/sms/status');
      if (res.ok) {
        const data = await res.json();
        setSmsConnected(data.connected);
        setSmsDetails(data);
        if (Array.isArray(data.connections)) {
          setSmsConnections(data.connections);
        } else if (data.connected && data.id) {
          setSmsConnections([data]);
        } else {
          setSmsConnections([]);
        }
      }
    } catch {}
  };

  const fetchEmailStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/email/status');
      if (res.ok) {
        const data = await res.json();
        setEmailConnected(data.connected);
        setEmailDetails(data);
        if (Array.isArray(data.connections)) {
          setEmailConnections(data.connections);
        } else if (data.connected && data.id) {
          setEmailConnections([data]);
        } else {
          setEmailConnections([]);
        }
      }
    } catch {}
  };

  const fetchTikTokStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/tiktok/status');
      if (res.ok) {
        const data = await res.json();
        setTiktokConnected(data.connected);
        setTiktokDetails(data);
        if (Array.isArray(data.connections)) {
          setTiktokConnections(data.connections);
        } else if (data.connected && data.id) {
          setTiktokConnections([data]);
        } else {
          setTiktokConnections([]);
        }
      }
    } catch {}
  };

  const fetchLinkedInStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/linkedin/status');
      if (res.ok) {
        const data = await res.json();
        setLinkedinConnected(data.connected);
        setLinkedinDetails(data);
        if (Array.isArray(data.connections)) {
          setLinkedinConnections(data.connections);
        } else if (data.connected && data.id) {
          setLinkedinConnections([data]);
        } else {
          setLinkedinConnections([]);
        }
      }
    } catch {}
  };

  const handleSelectChannel = async (slug: string, bypassDisclaimer = false, connectionToEdit?: any) => {
    if (!connectionToEdit) {
      const lockStatus = isChannelLocked(slug);
      if (lockStatus.locked) {
        const nameMap: Record<string, string> = {
          whatsapp_cloud: tPlanLock('channelNames.whatsapp_cloud'),
          whatsapp_baileys: tPlanLock('channelNames.whatsapp_baileys'),
          instagram: tPlanLock('channelNames.instagram'),
          messenger: tPlanLock('channelNames.messenger'),
          telegram: tPlanLock('channelNames.telegram'),
          sms: tPlanLock('channelNames.sms'),
          email: tPlanLock('channelNames.email'),
          tiktok: tPlanLock('channelNames.tiktok') || 'TikTok',
          linkedin: tPlanLock('channelNames.linkedin') || 'LinkedIn'
        };
        setLockedChannelInfo({
          title: tPlanLock('lockedFeature'),
          desc: lockStatus.reason || tPlanLock('channelLockedDesc'),
          name: nameMap[slug] || slug
        });
        setLockModalOpen(true);
        return;
      }
    }

    if (slug === 'whatsapp_baileys' && !baileysConnected && !bypassDisclaimer && !connectionToEdit) {
      setShowBaileysDisclaimer(true);
      return;
    }

    setSelectedChannelSlug(slug);
    setEditingConnection(connectionToEdit || null);
  };

  // Disconnect Handlers
  const handleDisconnectWhatsApp = async (id?: number) => {
    try {
      const url = id ? `/integrations/whatsapp/disconnect/${id}` : '/integrations/whatsapp/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastWhatsappDisconnectSuccess'));
        await fetchWhatsAppStatus();
      } else {
        toast.error(t('toastWhatsappDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectBaileys = async (id?: number) => {
    try {
      const url = id ? `/integrations/baileys/disconnect/${id}` : '/integrations/baileys/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastBaileysDisconnectSuccess'));
        await fetchBaileysStatus();
      } else {
        toast.error(t('toastBaileysDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectInstagram = async (id?: number) => {
    try {
      const url = id ? `/integrations/instagram/disconnect/${id}` : '/integrations/instagram/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastInstagramDisconnectSuccess'));
        await fetchInstagramStatus();
      } else {
        toast.error(t('toastInstagramDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectMessenger = async (id?: number) => {
    try {
      const url = id ? `/integrations/messenger/disconnect/${id}` : '/integrations/messenger/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastMessengerDisconnectSuccess'));
        await fetchMessengerStatus();
      } else {
        toast.error(t('toastMessengerDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectTelegram = async (id?: number) => {
    try {
      const url = id ? `/integrations/telegram/disconnect/${id}` : '/integrations/telegram/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastTelegramDisconnectSuccess'));
        await fetchTelegramStatus();
      } else {
        toast.error(t('toastTelegramDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectTikTok = async (id?: number) => {
    try {
      const url = id ? `/integrations/tiktok/disconnect/${id}` : '/integrations/tiktok/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastTikTokDisconnectSuccess') || 'TikTok account disconnected successfully.');
        await fetchTikTokStatus();
      } else {
        toast.error(t('toastTikTokDisconnectFailed') || 'Failed to disconnect TikTok account.');
      }
    } catch {
      toast.error(t('toastTikTokDisconnectFailed') || 'Failed to disconnect TikTok account.');
    }
  };

  const handleDisconnectLinkedIn = async (id?: number) => {
    try {
      const url = id ? `/integrations/linkedin/disconnect/${id}` : '/integrations/linkedin/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastLinkedInDisconnectSuccess') || 'LinkedIn account disconnected successfully.');
        await fetchLinkedInStatus();
      } else {
        toast.error(t('toastLinkedInDisconnectFailed') || 'Failed to disconnect LinkedIn account.');
      }
    } catch {
      toast.error(t('toastLinkedInDisconnectFailed') || 'Failed to disconnect LinkedIn account.');
    }
  };

  const handleDisconnectSms = async (id?: number) => {
    try {
      const url = id ? `/integrations/sms/disconnect/${id}` : '/integrations/sms/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastSmsDisconnectSuccess'));
        await fetchSmsStatus();
      } else {
        toast.error(t('toastSmsDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleDisconnectEmail = async (id?: number) => {
    try {
      const url = id ? `/integrations/email/disconnect/${id}` : '/integrations/email/disconnect';
      const res = await fetchWithCsrf(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toastEmailDisconnectSuccess'));
        await fetchEmailStatus();
      } else {
        toast.error(t('toastEmailDisconnectFailed'));
      }
    } catch {
      toast.error(t('toastNetworkError'));
    }
  };

  const handleToggleConnectionStatus = async (item: ActiveChannelItem) => {
    const isCurrentlyActive = item.status === 'connected' || item.status === 'active';
    const nextStatus = isCurrentlyActive ? 'disabled' : 'connected';
    setTogglingConnectionId(item.id);

    try {
      const res = await fetchWithCsrf(`/channels/${item.id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        toast.success(nextStatus === 'connected' ? (t('toastConnectionEnabled') || 'Connection enabled') : (t('toastConnectionDisabled') || 'Connection disabled'));
        if (item.slug === 'whatsapp_cloud') await fetchWhatsAppStatus();
        else if (item.slug === 'whatsapp_baileys') await fetchBaileysStatus();
        else if (item.slug === 'instagram') await fetchInstagramStatus();
        else if (item.slug === 'messenger') await fetchMessengerStatus();
        else if (item.slug === 'telegram') await fetchTelegramStatus();
        else if (item.slug === 'sms') await fetchSmsStatus();
        else if (item.slug === 'email') await fetchEmailStatus();
      } else {
        toast.error(t('toastUpdateStatusFailed') || 'Failed to update connection status');
      }
    } catch {
      toast.error(t('toastNetworkError') || 'Network error');
    } finally {
      setTogglingConnectionId(null);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('details.syncing') || 'Syncing channel integrations...'} />;
  }

  // Active channels flattened list across all providers (supports multi-connection per provider)
  const activeChannels: ActiveChannelItem[] = [];

  if (globalChannelsEnabled['whatsapp_cloud'] !== false) {
    whatsappConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'whatsapp_cloud',
        name: conn.name || 'WhatsApp Cloud API',
        providerTitle: 'WhatsApp Cloud API',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['whatsapp_baileys'] !== false) {
    baileysConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'whatsapp_baileys',
        name: conn.name || 'WhatsApp Baileys',
        providerTitle: 'WhatsApp Baileys (Unofficial)',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['instagram'] !== false) {
    instagramConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'instagram',
        name: conn.name || 'Instagram Direct',
        providerTitle: 'Instagram Business',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['messenger'] !== false) {
    messengerConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'messenger',
        name: conn.name || 'Facebook Messenger',
        providerTitle: 'Facebook Messenger',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['telegram'] !== false) {
    telegramConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'telegram',
        name: conn.name || 'Telegram Support Bot',
        providerTitle: 'Telegram Bot',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['sms'] !== false) {
    smsConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'sms',
        name: conn.name || 'SMS Gateway',
        providerTitle: `SMS Gateway (${conn.provider?.toUpperCase() || 'TWILIO'})`,
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['email'] !== false) {
    emailConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'email',
        name: conn.name || 'Email Mailbox',
        providerTitle: 'Email (SMTP/IMAP)',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['tiktok'] !== false) {
    tiktokConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'tiktok',
        name: conn.name || conn.handle || 'TikTok Account',
        providerTitle: 'TikTok',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  if (globalChannelsEnabled['linkedin'] !== false) {
    linkedinConnections.forEach((conn) => {
      activeChannels.push({
        id: conn.id || 0,
        slug: 'linkedin',
        name: conn.name || conn.handle || 'LinkedIn Account',
        providerTitle: 'LinkedIn',
        status: conn.status || 'connected',
        details: conn,
      });
    });
  }

  const availableGateways = availableChannelsList.filter(c => globalChannelsEnabled[c.slug] !== false);

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 select-none font-sans text-[#0A0A0A] flex-1 overflow-y-auto">

      {/* 1. Configured / Active Channels Datatable */}
      {activeChannels.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('activeTitle')}</span>
            <p className="text-[10px] text-zinc-500 font-medium">{t('configuredConversationalLines')}</p>
          </div>

          <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[580px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="p-4">{t('channel')}</th>
                    <th className="p-4">{t('connectionDetails')}</th>
                    <th className="p-4">{tCommon('status') || 'Status'}</th>
                    <th className="p-4 text-right">{tCommon('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                  {activeChannels.map((item) => {
                    const isEnabled = item.status === 'connected' || item.status === 'active';
                    const isToggling = togglingConnectionId === item.id;
                    return (
                      <tr key={`${item.slug}-${item.id}`} className="hover:bg-neutral-50/50">
                        <td className="p-4 flex items-center gap-3">
                          <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1 shrink-0">
                            {renderChannelLogo(item.slug, "h-5 w-5", item.slug === 'sms' ? (item.details as SmsConnection)?.provider : undefined)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-zinc-955 font-bold block">
                                {item.name || item.providerTitle}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 font-medium">
                                #{item.id}
                              </span>
                              {['whatsapp_cloud', 'instagram', 'messenger'].includes(item.slug) && (
                                (item.details as any)?.connection_mode === 'embedded' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Embedded
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    BYOK
                                  </span>
                                )
                              )}
                              {item.slug === 'linkedin' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#0A66C2]">
                                  <Share2 className="h-2.5 w-2.5 shrink-0 text-[#0A66C2]" />
                                  <span>{t('contentPublishingOnly') || 'Content publishing only'}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium">{item.providerTitle}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {item.slug === 'whatsapp_cloud' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Phone ID:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">{(item.details as WhatsAppConnection)?.phone_number_id || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Account ID:</span>
                                <span className="font-mono font-semibold text-zinc-800 text-[10.5px]">{(item.details as WhatsAppConnection)?.whatsapp_business_account_id || 'N/A'}</span>
                              </div>
                            </div>
                          ) : item.slug === 'whatsapp_baileys' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Driver:</span>
                                <span className="font-bold text-zinc-900 text-[11px]">Node-Baileys</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Session:</span>
                                <span className="font-semibold text-zinc-800 text-[10.5px]">Active Instance</span>
                              </div>
                            </div>
                          ) : item.slug === 'instagram' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Account ID:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">{(item.details as InstagramConnection)?.instagram_business_account_id || 'Linked'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Provider:</span>
                                <span className="font-semibold text-zinc-800 text-[10.5px]">Meta Graph API</span>
                              </div>
                            </div>
                          ) : item.slug === 'messenger' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Page ID:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">{(item.details as FacebookMessengerConnection)?.page_id || 'Linked'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Provider:</span>
                                <span className="font-semibold text-zinc-800 text-[10.5px]">Meta Graph API</span>
                              </div>
                            </div>
                          ) : item.slug === 'telegram' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Username:</span>
                                <span className="font-bold text-zinc-900 text-[11px]">@{(item.details as TelegramConnection)?.bot_username || 'Bot'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Platform:</span>
                                <span className="font-semibold text-zinc-800 text-[10.5px]">Telegram Bot API</span>
                              </div>
                            </div>
                          ) : item.slug === 'sms' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Sender:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">
                                  {(item.details as SmsConnection)?.details?.twilio_phone_number ||
                                   (item.details as SmsConnection)?.details?.vonage_phone_number ||
                                   (item.details as SmsConnection)?.details?.plivo_phone_number ||
                                   (item.details as SmsConnection)?.details?.messagebird_phone_number ||
                                   (item.details as SmsConnection)?.details?.sinch_phone_number ||
                                   (item.details as SmsConnection)?.details?.telnyx_phone_number || 'Gateway Linked'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Gateway:</span>
                                <span className="font-semibold text-zinc-800 uppercase text-[10.5px]">{(item.details as SmsConnection)?.provider || 'Direct'}</span>
                              </div>
                            </div>
                          ) : item.slug === 'tiktok' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Handle:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">{(item.details as TikTokConnection)?.handle || 'Connected'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Open ID:</span>
                                <span className="font-mono font-semibold text-zinc-800 text-[10.5px]">{(item.details as TikTokConnection)?.open_id || 'Connected'}</span>
                              </div>
                            </div>
                          ) : item.slug === 'linkedin' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Author URN:</span>
                                <span className="font-mono font-bold text-zinc-900 text-[11px]">{(item.details as LinkedInConnection)?.author_urn || 'Linked'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Type:</span>
                                <span className="font-semibold text-zinc-800 capitalize text-[10.5px]">{(item.details as LinkedInConnection)?.author_type || 'Organization'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">Address:</span>
                                <span className="font-bold text-zinc-900 text-[11px]">{(item.details as EmailConnection)?.details?.email_address || 'Connected'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-medium">SMTP Host:</span>
                                <span className="font-mono font-semibold text-zinc-800 text-[10.5px]">{(item.details as EmailConnection)?.details?.smtp_host || 'SMTP'}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleConnectionStatus(item)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                              } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isEnabled ? 'text-zinc-955' : 'text-zinc-400'
                            }`}>
                              {isEnabled ? (tCommon('enabled') || 'Enabled') : (tCommon('disabled') || 'Disabled')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleSelectChannel(item.slug, false, item.details)}
                            className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                          >
                            {tCommon('manage') || 'Manage'}
                          </button>
                          <button
                            onClick={() => setDisconnectTarget({ slug: item.slug, id: item.id, name: item.name })}
                            className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-600 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                          >
                            {t('disconnectBtn') || 'Disconnect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-4 select-none">
          <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
            <Settings className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">{t('noActiveChannels')}</h3>
            <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed">
              {t('noActiveChannelsDesc')}
            </p>
          </div>
        </div>
      )}

      {/* 2. Available Channels Grid (Matches AI Providers styles & Supports Multi-Connection) */}
      <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('availableTitle')}</span>
          <p className="text-[10px] text-zinc-500 font-medium">{t('activateExtraConversational')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableGateways.map((c) => {
            const count = getProviderConnectionCount(c.slug);
            const lockStatus = isChannelLocked(c.slug);
            const isLocked = lockStatus.locked;
            return (
              <div 
                key={c.slug}
                className={`border rounded-2xl ${c.slug === 'linkedin' ? 'p-5 pb-3.5' : 'p-5'} bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                  isLocked 
                    ? 'border-zinc-200/80 opacity-90' 
                    : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
                }`}
              >
                <div>
                  {/* Header: Logo */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-1.5 shrink-0">
                      {renderChannelLogo(c.slug, "h-6 w-6")}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">
                        {c.slug === 'whatsapp_cloud' ? t('whatsappCloud') :
                         c.slug === 'whatsapp_baileys' ? t('whatsappBaileys') :
                         c.slug === 'instagram' ? t('instagram') :
                         c.slug === 'messenger' ? t('messenger') :
                         c.slug === 'telegram' ? t('telegram') :
                         c.slug === 'sms' ? t('sms') :
                         c.slug === 'email' ? t('email') :
                         c.slug === 'tiktok' ? t('tiktok') :
                         c.slug === 'linkedin' ? (t('linkedin') || 'LinkedIn') : c.name}
                      </h4>
                      <p className={`text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed ${c.slug === 'linkedin' ? 'min-h-0' : 'min-h-[48px]'} line-clamp-3`}>
                        {c.slug === 'whatsapp_cloud' ? t('whatsappCloudDesc') :
                         c.slug === 'whatsapp_baileys' ? t('whatsappBaileysDesc') :
                         c.slug === 'instagram' ? t('instagramDesc') :
                         c.slug === 'messenger' ? t('messengerDesc') :
                         c.slug === 'telegram' ? t('telegramDesc') :
                         c.slug === 'sms' ? t('smsDesc') :
                         c.slug === 'email' ? t('emailDesc') :
                         c.slug === 'tiktok' ? t('tiktokDesc') :
                         c.slug === 'linkedin' ? (t('linkedinDesc') || 'Connect your LinkedIn account to publish company and personal posts.') : c.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`border-t border-[#F0F0F0] ${c.slug === 'linkedin' ? 'pt-3 mt-3' : 'pt-3.5 mt-5'}`}>
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nameMap: Record<string, string> = {
                          whatsapp_cloud: tPlanLock('channelNames.whatsapp_cloud'),
                          whatsapp_baileys: tPlanLock('channelNames.whatsapp_baileys'),
                          instagram: tPlanLock('channelNames.instagram'),
                          messenger: tPlanLock('channelNames.messenger'),
                          telegram: tPlanLock('channelNames.telegram'),
                          sms: tPlanLock('channelNames.sms'),
                          email: tPlanLock('channelNames.email'),
                          tiktok: tPlanLock('channelNames.tiktok') || 'TikTok',
                          linkedin: tPlanLock('channelNames.linkedin') || 'LinkedIn'
                        };
                        setLockedChannelInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('channelLockedDesc'),
                          name: nameMap[c.slug] || c.name
                        });
                        setLockModalOpen(true);
                      }}
                      className="w-full py-2 bg-zinc-955 hover:bg-black text-white rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center flex items-center justify-center gap-1.5"
                    >
                      <Lock className="h-3 w-3" />
                      <span>{tPlanLock('upgradeToUnlock')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectChannel(c.slug, false, null)}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center flex items-center justify-center gap-1.5"
                    >
                      <span>+</span>
                      <span>{count > 0 ? tPlanLock('addAnotherConnection') : (t('configure') || 'Connect Account')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DIALOG MODAL (Platform Consistent Modal Pattern) - LAZILY LOADED VIA NEXT/DYNAMIC */}
      {selectedChannelSlug && mounted && (
        <ChannelConfigModal
          selectedChannelSlug={selectedChannelSlug}
          editingConnection={editingConnection}
          onClose={() => {
            setSelectedChannelSlug(null);
            setEditingConnection(null);
          }}
          onSuccess={async (slug) => {
            if (slug === 'whatsapp_cloud') await fetchWhatsAppStatus();
            else if (slug === 'whatsapp_baileys') await fetchBaileysStatus();
            else if (slug === 'instagram') await fetchInstagramStatus();
            else if (slug === 'messenger') await fetchMessengerStatus();
            else if (slug === 'telegram') await fetchTelegramStatus();
            else if (slug === 'sms') await fetchSmsStatus();
            else if (slug === 'email') await fetchEmailStatus();
            else if (slug === 'tiktok') await fetchTikTokStatus();
            else if (slug === 'linkedin') await fetchLinkedInStatus();
            else await fetchChannels();
          }}
          onDisconnectRequested={(target) => {
            setDisconnectTarget(target);
          }}
          channelConnectionModes={channelConnectionModes}
          metaAppId={metaAppId}
          metaConfigIds={metaConfigIds}
          userPlan={userPlan}
          setLockedChannelInfo={setLockedChannelInfo}
          setLockModalOpen={setLockModalOpen}
          whatsappConnected={whatsappConnected}
          whatsappDetails={whatsappDetails}
          instagramConnected={instagramConnected}
          instagramDetails={instagramDetails}
          messengerConnected={messengerConnected}
          messengerDetails={messengerDetails}
          telegramConnected={telegramConnected}
          telegramDetails={telegramDetails}
          smsConnected={smsConnected}
          smsDetails={smsDetails}
          emailConnected={emailConnected}
          emailDetails={emailDetails}
          tiktokConnected={tiktokConnected}
          tiktokDetails={tiktokDetails}
          linkedinConnected={linkedinConnected}
          linkedinDetails={linkedinDetails}
          baileysConnected={baileysConnected}
          baileysDetails={baileysDetails}
        />
      )}

      {/* 4. BAN-RISK ALERT DIALOG (MANDATORY REGULATORY DISCLAIMER) */}
      {showBaileysDisclaimer && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setShowBaileysDisclaimer(false)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="fixed inset-0" onClick={() => setShowBaileysDisclaimer(false)} />
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left select-none font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('banRiskDisclaimerTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBaileysDisclaimer(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={tCommon('close') || 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('banRiskDisclaimerDesc')}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowBaileysDisclaimer(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBaileysDisclaimer(false);
                  handleSelectChannel('whatsapp_baileys', true);
                }}
                className="bg-red-650 hover:bg-red-700 text-white rounded-[6px] text-xs font-bold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center"
              >
                {t('acknowledgeAndLink')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Disconnect Confirmation Alert Dialog */}
      {disconnectTarget && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setDisconnectTarget(null)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="fixed inset-0" onClick={() => setDisconnectTarget(null)} />
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left select-none font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('disconnectChannelTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDisconnectTarget(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={tCommon('close') || 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {disconnectTarget.name ? `Are you sure you want to disconnect "${disconnectTarget.name}"?` : t('disconnectChannelDesc')}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDisconnectTarget(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = disconnectTarget;
                  setDisconnectTarget(null);
                  if (target.slug === 'whatsapp_cloud') await handleDisconnectWhatsApp(target.id);
                  else if (target.slug === 'whatsapp_baileys') await handleDisconnectBaileys(target.id);
                  else if (target.slug === 'telegram') await handleDisconnectTelegram(target.id);
                  else if (target.slug === 'instagram') await handleDisconnectInstagram(target.id);
                  else if (target.slug === 'messenger') await handleDisconnectMessenger(target.id);
                  else if (target.slug === 'sms') await handleDisconnectSms(target.id);
                  else if (target.slug === 'email') await handleDisconnectEmail(target.id);
                  else if (target.slug === 'tiktok') await handleDisconnectTikTok(target.id);
                  else if (target.slug === 'linkedin') await handleDisconnectLinkedIn(target.id);
                }}
                className="bg-red-650 hover:bg-red-700 text-white rounded-[6px] text-xs font-bold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center min-w-[120px]"
              >
                {t('confirmDisconnect')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Plan Feature Gate Modal */}
      <PlanLockModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        title={lockedChannelInfo?.title}
        description={lockedChannelInfo?.desc}
        featureName={lockedChannelInfo?.name}
        planName={userPlan?.name}
      />

    </div>
  );
}
