import React from 'react';

export interface WhatsAppConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  phone_number_id?: string;
  whatsapp_business_account_id?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  webhook_secret?: string;
  connection_mode?: 'manual' | 'embedded';
  raw_credentials?: Record<string, unknown>;
}

export interface BaileysConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  webhook_verify_token?: string;
}

export interface InstagramConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  instagram_business_account_id?: string;
  page_id?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  connection_mode?: 'manual' | 'embedded';
  raw_credentials?: Record<string, unknown>;
}

export interface FacebookMessengerConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  page_id?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  connection_mode?: 'manual' | 'embedded';
  raw_credentials?: Record<string, unknown>;
}

export interface TelegramConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  bot_username?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  raw_credentials?: Record<string, unknown>;
}

export interface SmsConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  provider?: "twilio" | "vonage" | "plivo" | "messagebird" | "sinch" | "telnyx";
  webhook_url?: string;
  webhook_verify_token?: string;
  raw_credentials?: Record<string, unknown>;
  details?: {
    twilio_account_sid?: string;
    twilio_phone_number?: string;
    vonage_api_key?: string;
    vonage_phone_number?: string;
    plivo_phone_number?: string;
    messagebird_phone_number?: string;
    sinch_phone_number?: string;
    telnyx_phone_number?: string;
  };
}

export interface EmailConnection {
  connected: boolean;
  id?: number;
  name?: string;
  status?: string;
  provider?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  raw_credentials?: Record<string, unknown>;
  details?: {
    email_address?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_encryption?: string;
    imap_host?: string;
    imap_port?: number;
    imap_username?: string;
    imap_encryption?: string;
  };
}

export interface TikTokConnection {
  connected?: boolean;
  id?: number;
  name?: string;
  status?: string;
  handle?: string;
  open_id?: string;
  avatar_url?: string;
  webhook_url?: string;
  created_at?: string;
  raw_credentials?: Record<string, unknown>;
}

export interface LinkedInConnection {
  connected?: boolean;
  id?: number;
  name?: string;
  status?: string;
  author_type?: 'organization' | 'person';
  author_urn?: string;
  handle?: string;
  created_at?: string;
  raw_credentials?: Record<string, unknown>;
}

export interface ChannelItem {
  slug: string;
  name: string;
  description: string;
  logoColor: string;
}

export interface ActiveChannelItem {
  id: number;
  slug: string;
  name: string;
  providerTitle: string;
  status?: string;
  details: WhatsAppConnection | BaileysConnection | InstagramConnection | FacebookMessengerConnection | TelegramConnection | SmsConnection | EmailConnection | TikTokConnection | LinkedInConnection | null;
}

export const availableChannelsList: ChannelItem[] = [
  {
    slug: 'whatsapp_cloud',
    name: 'WhatsApp Cloud API',
    description: 'Official WhatsApp Cloud API connection. Send and receive messages via Meta Graph APIs, templates, and interactive media.',
    logoColor: 'text-emerald-500'
  },
  {
    slug: 'whatsapp_baileys',
    name: 'WhatsApp Baileys (Unofficial)',
    description: 'Connect unofficial numbers by scanning worker-emitted QR codes over WebSockets. Independent from Meta developer panels.',
    logoColor: 'text-cyan-500'
  },
  {
    slug: 'instagram',
    name: 'Instagram Business',
    description: 'Send and receive Direct Messages (DMs) and Story replies via Meta Login for Business OAuth and linked Instagram Accounts.',
    logoColor: 'text-pink-500'
  },
  {
    slug: 'messenger',
    name: 'Facebook Messenger',
    description: 'Send and receive messages and quick replies using Meta Login for Business OAuth and linked Facebook Pages.',
    logoColor: 'text-blue-600'
  },
  {
    slug: 'telegram',
    name: 'Telegram Bot',
    description: 'Connect official customer support bot profiles via HTTP bot API tokens and automatic webhook subscriptions.',
    logoColor: 'text-sky-400'
  },
  {
    slug: 'sms',
    name: 'SMS Channel',
    description: 'Connect Bring-Your-Own-Key gateways (Twilio and Vonage/Nexmo) for direct, reliable customer text message outreach.',
    logoColor: 'text-indigo-500'
  },
  {
    slug: 'email',
    name: 'Email Channel',
    description: 'Connect customer service mailboxes (SMTP/IMAP) for two-way threaded client conversation support.',
    logoColor: 'text-rose-500'
  },
  {
    slug: 'tiktok',
    name: 'TikTok',
    description: 'Connect your TikTok account to receive direct messages in Shared Inbox and publish video content.',
    logoColor: 'text-zinc-900'
  },
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn account to publish company and personal content. Content publishing only.',
    logoColor: 'text-[#0A66C2]'
  }
];

export const getSmsProviderLogo = (provider: string, className = "h-4 w-4") => {
  switch (provider) {
    case 'twilio':
      return <img src="/channels/twilio.svg" alt="Twilio" className={`${className} object-contain`} />;
    case 'vonage':
      return <img src="/channels/vonage.webp" alt="Vonage" className={`${className} object-contain`} />;
    case 'plivo':
      return <img src="/channels/plivo.svg" alt="Plivo" className={`${className} object-contain`} />;
    case 'messagebird':
      return <img src="/channels/message_bird.webp" alt="MessageBird" className={`${className} object-contain`} />;
    case 'sinch':
      return <img src="/channels/sinch.png" alt="Sinch" className={`${className} object-contain`} />;
    case 'telnyx':
      return <img src="/channels/telnyx.ico" alt="Telnyx" className={`${className} object-contain`} />;
    default:
      return <span className={`h-2 w-2 rounded-full bg-zinc-400 shrink-0`} />;
  }
};

export const renderChannelLogo = (slug: string, className = "h-5 w-5", smsProviderName?: string) => {
  if (slug === 'sms') {
    if (smsProviderName) {
      return getSmsProviderLogo(smsProviderName, className);
    }
    return <img src="/channels/twilio.svg" alt="SMS" className={`${className} object-contain`} />;
  }
  switch (slug) {
    case 'whatsapp_cloud':
    case 'whatsapp_baileys':
      return <img src="/channels/whatsapp.webp" alt="WhatsApp" className={`${className} object-contain`} />;
    case 'instagram':
      return <img src="/channels/instagram.svg" alt="Instagram" className={`${className} object-contain`} />;
    case 'messenger':
      return <img src="/channels/messenger.webp" alt="Messenger" className={`${className} object-contain`} />;
    case 'telegram':
      return <img src="/channels/telegram.webp" alt="Telegram" className={`${className} object-contain`} />;
    case 'email':
      return (
        <svg className={`${className} text-rose-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'tiktok':
      return <img src="/channels/tiktok.webp" alt="TikTok" className={`${className} object-contain`} />;
    case 'linkedin':
      return <img src="/channels/linkedin.png" alt="LinkedIn" className={`${className} object-contain`} />;
    default:
      return (
        <svg className={`${className} text-zinc-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        </svg>
      );
  }
};
