'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { 
  Database, 
  Server, 
  Wifi, 
  Mail, 
  HardDrive, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Activity,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCsrf } from '@/lib/api';
import { useBranding } from '@/components/BrandingThemeProvider';
import { BRANDING_CONFIG } from '@/config/branding';
import { echo } from '@/lib/echo';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { ChannelsStrip } from '@/components/landing/ChannelsStrip';
import { CoreFeatureGrid } from '@/components/landing/CoreFeatureGrid';
import { UnifiedInboxSection } from '@/components/landing/UnifiedInboxSection';
import { AiAgentsSection } from '@/components/landing/AiAgentsSection';
import { KnowledgeBaseSection } from '@/components/landing/KnowledgeBaseSection';
import { MetaAdsSection } from '@/components/landing/MetaAdsSection';
import { FlowBuilderSection } from '@/components/landing/FlowBuilderSection';
import { SocialPostingSection } from '@/components/landing/SocialPostingSection';
import { SocialChannelsStrip } from '@/components/landing/SocialChannelsStrip';
import { CrmPipelineSection } from '@/components/landing/CrmPipelineSection';
import { CrmStrip } from '@/components/landing/CrmStrip';
import { CampaignsSection } from '@/components/landing/CampaignsSection';
import { AppointmentBookingSection } from '@/components/landing/AppointmentBookingSection';
import { MeetingStrip } from '@/components/landing/MeetingStrip';
import { StoreIntegrationsSection } from '@/components/landing/StoreIntegrationsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'loading';
  database: string;
  redis: string;
  timestamp?: string;
}

export default function IndexPage() {
  const t = useTranslations('Common');
  const router = useRouter();
  const { brandingName, logoUrl } = useBranding();
  const finalBrandName = brandingName || BRANDING_CONFIG.defaultName;
  const domain = finalBrandName.toLowerCase().replace(/\s+/g, '') + '.com';
  const supportEmail = `support@${domain}`;

  useEffect(() => {
    // Check if user session cookie indicator exists
    const hasSessionCookie = typeof document !== 'undefined' && document.cookie.includes('whatsomni_logged_in=1');
    if (!hasSessionCookie) return;

    async function checkOnboarding() {
      try {
        const response = await fetchWithCsrf('/auth/me');
        if (response.ok) {
          const data = await response.json();
          const tenant = data.user?.tenant;
            const isTrialActive = tenant.status === 'trial' && !tenant.is_trial_expired;
            const hasActivePlanOrTrial = Boolean(tenant.plan_id || isTrialActive || tenant.status === 'active');

            if (tenant.onboarding_step !== 'complete') {
              router.push('/onboarding');
            } else if (!hasActivePlanOrTrial) {
              router.push('/billing/plans');
            } else {
              router.push('/dashboard');
            }
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to verify onboarding on landing page:', err);
      }
    }
    checkOnboarding();
  }, [router]);

  // Dev Health check toggle drawer
  const [showDevHealth, setShowDevHealth] = useState(false);

  // Health states
  const [systemHealth, setSystemHealth] = useState<HealthStatus>({
    status: 'loading',
    database: 'Checking...',
    redis: 'Checking...',
  });

  // Reverb WebSockets states
  const [reverbConnected, setReverbConnected] = useState<boolean>(false);
  const [reverbMessages, setReverbMessages] = useState<string[]>([]);
  const [reverbLoading, setReverbLoading] = useState<boolean>(false);
  const [reverbInput, setReverbInput] = useState<string>('Hello from Reverb WebSocket!');

  // S3 states
  const [s3Status, setS3Status] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [s3Message, setS3Message] = useState<string>('');
  const [s3Url, setS3Url] = useState<string>('');

  // Mail states
  const [mailStatus, setMailStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [mailMessage, setMailMessage] = useState<string>('');
  const [mailEmail, setMailEmail] = useState<string>('neeraj@ncodeslab.com');
  const [mailDriver, setMailDriver] = useState<'smtp' | 'resend'>('smtp');

  // Trigger base API health checks
  const runBaseHealthCheck = async () => {
    setSystemHealth(prev => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetchWithCsrf('/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth({
          status: data.status,
          database: data.database,
          redis: data.redis,
          timestamp: data.timestamp,
        });
      } else {
        setSystemHealth({
          status: 'unhealthy',
          database: 'API Error',
          redis: 'API Error',
        });
      }
    } catch {
      setSystemHealth({
        status: 'unhealthy',
        database: 'Connection Failed',
        redis: 'Connection Failed',
      });
    }
  };

  // Reverb setup
  useEffect(() => {
    runBaseHealthCheck();

    if (!echo) {
      console.warn('Echo client is not initialized.');
      return;
    }

    // Monitor WebSocket connection lifecycle
    const pusher = echo.connector.pusher;
    pusher.connection.bind('state_change', (states: { current: string }) => {
      console.log('WS Connection State:', states.current);
      setReverbConnected(states.current === 'connected');
    });
    setReverbConnected(pusher.connection.state === 'connected');

    // Subscribe to health channel
    const channel = echo.channel('health-channel');
    channel.listen('.health.check', (e: { message: string }) => {
      console.log('Event received:', e);
      setReverbMessages(prev => [
        `[${new Date().toLocaleTimeString()}] ${e.message}`,
        ...prev
      ]);
    });

    return () => {
      if (echo) {
        echo.leaveChannel('health-channel');
      }
      if (pusher && pusher.connection) {
        pusher.connection.unbind('state_change');
      }
    };
  }, []);

  // Dispatch WebSocket test event
  const triggerReverbTest = async () => {
    if (reverbLoading) return;
    setReverbLoading(true);
    try {
      const res = await fetchWithCsrf('/health/reverb', {
        method: 'POST',
        body: JSON.stringify({ message: reverbInput }),
      });
      if (!res.ok) {
        throw new Error('Could not broadcast event');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setReverbMessages(prev => [`[System Error] ${errMsg}`, ...prev]);
    } finally {
      setReverbLoading(false);
    }
  };

  // Trigger S3 Signed-URL Check
  const triggerS3Check = async () => {
    setS3Status('loading');
    setS3Message('');
    setS3Url('');
    try {
      const res = await fetchWithCsrf('/health/s3', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setS3Status('success');
        setS3Message(data.message);
        setS3Url(data.signed_url);
      } else {
        setS3Status('failed');
        setS3Message(data.error || 'S3 validation failed.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setS3Status('failed');
      setS3Message(errMsg || 'Network error during S3 check.');
    }
  };

  // Trigger Mail Transport Check
  const triggerMailCheck = async () => {
    if (!mailEmail) return;
    setMailStatus('loading');
    setMailMessage('');
    try {
      const res = await fetchWithCsrf('/health/mail', {
        method: 'POST',
        body: JSON.stringify({ email: mailEmail, mailer: mailDriver }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMailStatus('success');
        setMailMessage(data.message);
      } else {
        setMailStatus('failed');
        setMailMessage(data.error || 'Email dispatch failed.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMailStatus('failed');
      setMailMessage(errMsg || 'Network error during mail check.');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col selection:bg-[#4AE54A] selection:text-[#0A0A0A]">
      {/* Sticky Landing Header */}
      <LandingNavbar brandName={finalBrandName} logoSrc={logoUrl} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection brandName={finalBrandName} />

        {/* Channels Strip */}
        <ChannelsStrip />

        {/* Core Feature Grid Section */}
        <CoreFeatureGrid brandName={finalBrandName} />

        {/* Unified Inbox Section */}
        <UnifiedInboxSection />

        {/* AI Agents Section */}
        <AiAgentsSection brandName={finalBrandName} />

        {/* Knowledge Base Section */}
        <KnowledgeBaseSection brandName={finalBrandName} />

        {/* Meta Ads Section */}
        <MetaAdsSection brandName={finalBrandName} />

        {/* Flow Builder Section */}
        <FlowBuilderSection brandName={finalBrandName} />

        {/* Social Media Posting Section */}
        <SocialPostingSection brandName={finalBrandName} />

        {/* Social Channels Brand Integrations Strip */}
        <SocialChannelsStrip />

        {/* CRM Pipeline Section */}
        <CrmPipelineSection brandName={finalBrandName} />

        {/* CRM Brand Integrations Strip */}
        <CrmStrip />

        {/* Campaigns Section */}
        <CampaignsSection brandName={finalBrandName} />

        {/* Appointment Booking Section */}
        <AppointmentBookingSection brandName={finalBrandName} />

        {/* Meeting Brand Integrations Strip */}
        <MeetingStrip />

        {/* Store Integrations Section */}
        <StoreIntegrationsSection brandName={finalBrandName} />

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <FaqSection />

        {/* Final CTA Section */}
        <FinalCtaSection />
      </main>

      {/* Landing page footer */}
      <LandingFooter 
        brandName={finalBrandName} 
        logoSrc={logoUrl} 
        supportEmail={supportEmail} 
        domain={domain} 
      />

    </div>
  );
}
