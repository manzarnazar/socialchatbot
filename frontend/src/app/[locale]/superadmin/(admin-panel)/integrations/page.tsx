'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { fetchWithCsrf } from '@/lib/api';
import { 
  X, 
  SlidersHorizontal,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';

interface IntegrationItem {
  id: string;
  providerKey: string;
  labelKey: string;
  descKey: string;
  defaultLabel: string;
  defaultDesc: string;
  logo: string;
  needsEnv: boolean;
  isDbConfigurable: boolean;
  docsUrl: string;
  docsHintKey: string;
  defaultDocsHint: string;
  clientIdLabel?: string;
  clientIdPlaceholder?: string;
  clientSecretLabel?: string;
  clientSecretPlaceholder?: string;
}

interface ProviderConfigResponse {
  provider: string;
  client_id?: string;
  client_key?: string;
  worker_url?: string;
  app_name?: string;
  scopes?: string;
  tenant_id?: string;
  has_secret?: boolean;
  client_secret_masked?: string;
  redirect_uri?: string;
  default_redirect_uri?: string;
  effective_redirect_uri?: string;
  is_configured?: boolean;
  source?: string;
}

export default function IntegrationsPage() {
  const t = useTranslations('Superadmin');
  const [mounted, setMounted] = useState(false);

  const [integrationsEnabled, setIntegrationsEnabled] = useState<Record<string, boolean>>({});
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');
  const [confirmActionType, setConfirmActionType] = useState<'enable' | 'disable'>('enable');

  // Database credentials modal states
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<IntegrationItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [formTenantId, setFormTenantId] = useState('common');
  const [formScopes, setFormScopes] = useState('');
  const [formRedirectUri, setFormRedirectUri] = useState('');
  const [defaultRedirectUri, setDefaultRedirectUri] = useState('');
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const resIntegrations = await fetchWithCsrf('/admin/integrations');

      if (resIntegrations.ok) {
        const data = await resIntegrations.json();
        setIntegrationsEnabled(data.integrations_enabled_config || {});
        setEnvStatus(data.env_status || {});
      }
    } catch {
      toast.error(t('integrations.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveSettings = async (updatedConfig = integrationsEnabled) => {
    setSaving(true);
    try {
      const response = await fetchWithCsrf('/admin/integrations', {
        method: 'PUT',
        body: JSON.stringify({
          integrations_enabled_config: updatedConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t('integrations.saveSuccess'));
        setIntegrationsEnabled(data.integrations_enabled_config || {});
      } else {
        throw new Error();
      }
    } catch {
      toast.error(t('integrations.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConfigModal = async (item: IntegrationItem) => {
    setActiveItem(item);
    setShowSecret(false);
    setCopiedRedirect(false);
    setIsConfigModalOpen(true);
    setModalLoading(true);

    try {
      const res = await fetchWithCsrf(`/admin/integrations/app-config/${item.providerKey}`);
      if (res.ok) {
        const data: ProviderConfigResponse = await res.json();
        setFormClientId(data.client_id || data.client_key || data.worker_url || data.app_name || '');
        setFormClientSecret('');
        setHasExistingSecret(!!data.has_secret);
        setFormTenantId(data.tenant_id || 'common');
        setFormScopes(data.scopes || '');
        setFormRedirectUri(data.redirect_uri || '');
        setDefaultRedirectUri(data.default_redirect_uri || '');
      } else {
        setFormClientId('');
        setFormClientSecret('');
        setHasExistingSecret(false);
        setFormTenantId('common');
        setFormScopes('');
        setFormRedirectUri('');
        setDefaultRedirectUri('');
      }
    } catch {
      toast.error('Failed to load credentials for this provider.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeItem) return;

    if (activeItem.providerKey !== 'woocommerce' && !formClientId.trim() && !hasExistingSecret) {
      toast.error(t('integrations.clientIdRequired', { label: activeItem.clientIdLabel || 'Client ID' }) || `${activeItem.clientIdLabel || 'Client ID'} is required.`);
      return;
    }

    setTestingConfig(true);
    try {
      const payload: Record<string, string> = {
        provider: activeItem.providerKey,
        client_id: formClientId.trim(),
        redirect_uri: formRedirectUri.trim(),
      };

      if (formClientSecret.trim()) {
        payload.client_secret = formClientSecret.trim();
        payload.secret_token = formClientSecret.trim();
      }

      if (activeItem.providerKey === 'teams') {
        payload.tenant_id = formTenantId.trim() || 'common';
      }

      if (activeItem.providerKey === 'shopify' || activeItem.providerKey === 'woocommerce') {
        payload.scopes = formScopes.trim();
      }

      const res = await fetchWithCsrf('/admin/integrations/test-config', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Connection test successful.');
      } else {
        toast.error(data.message || 'Connection test failed.');
      }
    } catch {
      toast.error('An error occurred while testing connection.');
    } finally {
      setTestingConfig(false);
    }
  };

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    if (activeItem.providerKey !== 'woocommerce' && !formClientId.trim()) {
      toast.error(t('integrations.clientIdRequired', { label: activeItem.clientIdLabel || 'Client ID' }) || `${activeItem.clientIdLabel || 'Client ID'} is required.`);
      return;
    }

    if (!formClientSecret.trim() && !hasExistingSecret && activeItem.providerKey !== 'woocommerce') {
      toast.error(t('integrations.clientSecretRequired', { label: activeItem.clientSecretLabel || 'Client Secret' }) || `${activeItem.clientSecretLabel || 'Client Secret'} is required.`);
      return;
    }

    setSavingConfig(true);
    try {
      const payload: Record<string, string> = {
        provider: activeItem.providerKey,
        client_id: formClientId.trim(),
        redirect_uri: formRedirectUri.trim(),
      };

      if (formClientSecret.trim()) {
        payload.client_secret = formClientSecret.trim();
        payload.secret_token = formClientSecret.trim();
      }

      if (activeItem.providerKey === 'teams') {
        payload.tenant_id = formTenantId.trim() || 'common';
      }

      if (activeItem.providerKey === 'shopify' || activeItem.providerKey === 'woocommerce') {
        payload.scopes = formScopes.trim();
      }

      const res = await fetchWithCsrf('/admin/integrations/app-config', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const itemLabel = t(`integrations.providers.${activeItem.id}`) || activeItem.defaultLabel;
        toast.success(t('integrations.credentialsSaved', { label: itemLabel }) || `${itemLabel} credentials saved successfully.`);
        setIsConfigModalOpen(false);

        // Mark as configured in state and refresh
        setEnvStatus(prev => ({ 
          ...prev, 
          [activeItem.id]: true,
          ...(activeItem.providerKey === 'google' ? { google_sheets: true, google_calendar: true } : {})
        }));
        fetchConfig();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save credentials.');
      }
    } catch {
      toast.error('An error occurred while saving integration configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleClick = (item: IntegrationItem) => {
    const isConfigured = !!envStatus[item.id];
    const itemLabel = t(`integrations.providers.${item.id}`) || item.defaultLabel;
    
    if (!isConfigured) {
      toast.info(t('integrations.configureBeforeEnable', { label: itemLabel }) || `Please configure credentials for ${itemLabel} before enabling.`);
      handleOpenConfigModal(item);
      return;
    }

    const isCurrentlyEnabled = !!integrationsEnabled[item.id];
    setConfirmTargetId(item.id);
    setConfirmTargetName(itemLabel);
    setConfirmActionType(isCurrentlyEnabled ? 'disable' : 'enable');
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = () => {
    if (!confirmTargetId) return;

    const updated = {
      ...integrationsEnabled,
      [confirmTargetId]: confirmActionType === 'enable'
    };
    setIntegrationsEnabled(updated);
    setIsConfirmOpen(false);

    // Save automatically on confirm
    handleSaveSettings(updated);
  };

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRedirect(true);
      toast.success(t('integrations.copied') || 'OAuth Redirect URI copied to clipboard.');
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('integrations.loading')} />;
  }

  const integrationsList: IntegrationItem[] = [
    { 
      id: 'google_sheets', 
      providerKey: 'google',
      labelKey: 'integrations.providers.google_sheets',
      descKey: 'integrations.providerDescriptions.google_sheets',
      defaultLabel: 'Google Sheets',
      defaultDesc: 'Sync client database lists directly into Google Sheets records', 
      logo: '/google_sheets.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://console.cloud.google.com/apis/credentials',
      docsHintKey: 'integrations.providerDocs.google',
      defaultDocsHint: 'Create OAuth 2.0 Client ID in Google Cloud Console with Google Sheets and Drive APIs enabled.',
      clientIdLabel: 'Google OAuth Client ID',
      clientIdPlaceholder: 'e.g. 1234567890-abc.apps.googleusercontent.com',
      clientSecretLabel: 'Google OAuth Client Secret',
      clientSecretPlaceholder: 'e.g. GOCSPX-xxxxxxxxxxxx',
    },
    { 
      id: 'google_calendar', 
      providerKey: 'google',
      labelKey: 'integrations.providers.google_calendar',
      descKey: 'integrations.providerDescriptions.google_calendar',
      defaultLabel: 'Google Calendar',
      defaultDesc: 'Manage calendar slot intervals, meetings and booking links', 
      logo: '/google_calendar.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://console.cloud.google.com/apis/credentials',
      docsHintKey: 'integrations.providerDocs.google',
      defaultDocsHint: 'Create OAuth 2.0 Client ID in Google Cloud Console with Google Calendar API enabled.',
      clientIdLabel: 'Google OAuth Client ID',
      clientIdPlaceholder: 'e.g. 1234567890-abc.apps.googleusercontent.com',
      clientSecretLabel: 'Google OAuth Client Secret',
      clientSecretPlaceholder: 'e.g. GOCSPX-xxxxxxxxxxxx',
    },
    { 
      id: 'zoom', 
      providerKey: 'zoom',
      labelKey: 'integrations.providers.zoom',
      descKey: 'integrations.providerDescriptions.zoom',
      defaultLabel: 'Zoom',
      defaultDesc: 'Schedule and attach Zoom meetings to appointments using database API keys', 
      logo: '/zoom.png', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://marketplace.zoom.us/develop/create',
      docsHintKey: 'integrations.providerDocs.zoom',
      defaultDocsHint: 'Create an OAuth App in Zoom App Marketplace with meeting:write:admin scopes.',
      clientIdLabel: 'Zoom Client ID',
      clientIdPlaceholder: 'e.g. 7qX0vRkAQ1aW2...',
      clientSecretLabel: 'Zoom Client Secret',
      clientSecretPlaceholder: 'Enter Zoom Client Secret',
    },
    { 
      id: 'teams', 
      providerKey: 'teams',
      labelKey: 'integrations.providers.teams',
      descKey: 'integrations.providerDescriptions.teams',
      defaultLabel: 'Microsoft Teams',
      defaultDesc: 'Generate Microsoft Teams call links for reservations using database API keys', 
      logo: '/teams.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
      docsHintKey: 'integrations.providerDocs.teams',
      defaultDocsHint: 'Register a multi-tenant app in Microsoft Entra / Azure Portal with OnlineMeetings.ReadWrite permission.',
      clientIdLabel: 'Application (Client) ID',
      clientIdPlaceholder: 'e.g. 00000000-0000-0000-0000-000000000000',
      clientSecretLabel: 'Client Secret Value',
      clientSecretPlaceholder: 'Enter Microsoft Client Secret',
    },
    { 
      id: 'hubspot', 
      providerKey: 'hubspot',
      labelKey: 'integrations.providers.hubspot',
      descKey: 'integrations.providerDescriptions.hubspot',
      defaultLabel: 'HubSpot',
      defaultDesc: 'Push contact lifecycle stages and sync deals metadata to HubSpot', 
      logo: '/hubspot.png', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://developers.hubspot.com/docs/api/overview',
      docsHintKey: 'integrations.providerDocs.hubspot',
      defaultDocsHint: 'Create a Public App in HubSpot Developer Portal with crm.objects.contacts scopes.',
      clientIdLabel: 'HubSpot App Client ID',
      clientIdPlaceholder: 'e.g. 00000000-0000-0000-0000-000000000000',
      clientSecretLabel: 'HubSpot App Client Secret',
      clientSecretPlaceholder: 'Enter HubSpot Client Secret',
    },
    { 
      id: 'salesforce', 
      providerKey: 'salesforce',
      labelKey: 'integrations.providers.salesforce',
      descKey: 'integrations.providerDescriptions.salesforce',
      defaultLabel: 'Salesforce',
      defaultDesc: 'Create leads and bi-directionally sync CRM pipelines with Salesforce', 
      logo: '/salesforce.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm',
      docsHintKey: 'integrations.providerDocs.salesforce',
      defaultDocsHint: 'Create a Connected App in Salesforce App Manager with OAuth 2.0 Web Server Flow.',
      clientIdLabel: 'Consumer Key (Client ID)',
      clientIdPlaceholder: 'e.g. 3MVG9...xxxxxxxxxx',
      clientSecretLabel: 'Consumer Secret (Client Secret)',
      clientSecretPlaceholder: 'Enter Salesforce Consumer Secret',
    },
    { 
      id: 'zoho', 
      providerKey: 'zoho',
      labelKey: 'integrations.providers.zoho',
      descKey: 'integrations.providerDescriptions.zoho',
      defaultLabel: 'Zoho CRM',
      defaultDesc: 'Fetch accounts metrics and manage lists structures in Zoho CRM', 
      logo: '/zoho_crm.png', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://api-console.zoho.com/',
      docsHintKey: 'integrations.providerDocs.zoho',
      defaultDocsHint: 'Create a Server-based Application in Zoho API Console with ZohoCRM.modules.contacts.ALL.',
      clientIdLabel: 'Zoho Client ID',
      clientIdPlaceholder: 'e.g. 1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      clientSecretLabel: 'Zoho Client Secret',
      clientSecretPlaceholder: 'Enter Zoho Client Secret',
    },
    { 
      id: 'shopify', 
      providerKey: 'shopify',
      labelKey: 'integrations.providers.shopify',
      descKey: 'integrations.providerDescriptions.shopify',
      defaultLabel: 'Shopify',
      defaultDesc: 'Retrieve shopping carts details and track orders notifications', 
      logo: '/shopify.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://partners.shopify.com/',
      docsHintKey: 'integrations.providerDocs.shopify',
      defaultDocsHint: 'Create a Custom App in Shopify Partners with read/write products, orders and checkouts scopes.',
      clientIdLabel: 'Shopify Client ID (API Key)',
      clientIdPlaceholder: 'e.g. shpca_xxxxxxxxxxxxxxxxxxxxxxxx',
      clientSecretLabel: 'Shopify Client Secret (API Secret Key)',
      clientSecretPlaceholder: 'Enter Shopify API Secret Key',
    },
    { 
      id: 'woocommerce', 
      providerKey: 'woocommerce',
      labelKey: 'integrations.providers.woocommerce',
      descKey: 'integrations.providerDescriptions.woocommerce',
      defaultLabel: 'WooCommerce',
      defaultDesc: 'WooCommerce hooks for orders triggers and checkouts alerts', 
      logo: '/woocommerce.webp', 
      needsEnv: false, 
      isDbConfigurable: true,
      docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
      docsHintKey: 'integrations.providerDocs.woocommerce',
      defaultDocsHint: 'Configure WooCommerce REST API and webhook listeners in WordPress admin.',
      clientIdLabel: 'Application Name',
      clientIdPlaceholder: 'WhatsOmni',
      clientSecretLabel: 'Access Scopes',
      clientSecretPlaceholder: 'read_write',
    },
  ];

  const confirmTargetInfo = integrationsList.find(p => p.id === confirmTargetId);
  const effectiveCallback = formRedirectUri || defaultRedirectUri;

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex-1">

      {/* Unified Configurations List */}
      <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs divide-y divide-[#E8E8E6]">
        {integrationsList.map((item) => {
          const isConfigured = !!envStatus[item.id];
          const isEnabled = isConfigured && !!integrationsEnabled[item.id];
          const label = t(item.labelKey) || item.defaultLabel;
          const desc = t(item.descKey) || item.defaultDesc;
          
          return (
            <div 
              key={item.id} 
              className={`p-5 flex items-center justify-between hover:bg-[#FAFAFA]/70 transition-colors ${
                !isConfigured ? 'opacity-90' : ''
              }`}
            >
              {/* Logo / Details */}
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-[6px] border border-[#E8E8E6] bg-white flex items-center justify-center shrink-0 p-1.5 select-none shadow-3xs">
                  <Image 
                    src={item.logo} 
                    alt={label} 
                    width={24} 
                    height={24} 
                    className="object-contain max-h-6 w-auto select-none" 
                  />
                </div>
                
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-955 text-xs block">{label}</span>
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {t('integrations.configured') || 'Configured'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        {t('integrations.setupRequired') || 'Setup Required'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">{desc}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center select-none shrink-0 gap-3">
                {/* Configure Button */}
                <button
                  type="button"
                  onClick={() => handleOpenConfigModal(item)}
                  className="h-8 px-3 border border-[#E8E8E6] hover:border-black/30 bg-white text-zinc-700 hover:text-black text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('integrations.configure') || 'Configure'}</span>
                </button>

                {/* Switch Control */}
                <button
                  type="button"
                  onClick={() => handleToggleClick(item)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer inline-flex items-center ${
                    isEnabled ? 'bg-zinc-955' : 'bg-zinc-200'
                  }`}
                  aria-label={`Toggle ${label}`}
                >
                  <div 
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* UNIFIED DATABASE CREDENTIALS CONFIGURATION MODAL */}
      {isConfigModalOpen && activeItem && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none overflow-y-auto"
          onClick={() => setIsConfigModalOpen(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Image 
                    src={activeItem.logo} 
                    alt={t(activeItem.labelKey) || activeItem.defaultLabel} 
                    width={18} 
                    height={18} 
                    className="object-contain select-none" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t(activeItem.labelKey) || activeItem.defaultLabel}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            {modalLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-5 w-5 text-zinc-400 animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">{t('integrations.loading') || 'Loading credentials...'}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveProviderConfig} className="flex flex-col min-h-0 flex-1">
                <div className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1">
                  
                  {/* Setup & Documentation Card */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-lg flex items-start justify-between gap-3 text-left">
                    <div className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                      {t(activeItem.docsHintKey) || activeItem.defaultDocsHint}
                    </div>
                    {activeItem.docsUrl && (
                      <a
                        href={activeItem.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-black hover:text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded shadow-3xs transition-all shrink-0 cursor-pointer"
                      >
                        <span>{t('integrations.docsLink') || 'Developer Docs'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Authorized Redirect URI (if applicable) */}
                  {effectiveCallback && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                        {t('integrations.authorizedRedirectUri') || 'Authorized OAuth Redirect URI'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          readOnly 
                          value={effectiveCallback} 
                          className="flex-1 h-9 px-3 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-zinc-700 font-mono select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(effectiveCallback)}
                          className="h-9 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-bold rounded-md shadow-3xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          {copiedRedirect ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-600">{t('integrations.copied') || 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-zinc-500" />
                              <span>{t('integrations.copy') || 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Client ID / App Key */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                      {activeItem.clientIdLabel || 'Client ID'}
                    </label>
                    <input
                      type="text"
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      placeholder={activeItem.clientIdPlaceholder || 'Enter Client ID'}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required={activeItem.providerKey !== 'woocommerce'}
                    />
                  </div>

                  {/* Client Secret (if applicable) */}
                  {activeItem.providerKey !== 'woocommerce' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                          {activeItem.clientSecretLabel || 'Client Secret'}
                        </label>
                        {hasExistingSecret && (
                          <span className="text-[10px] text-zinc-400 font-medium">{t('integrations.leaveBlankToRetain') || 'Leave blank to retain saved secret'}</span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          value={formClientSecret}
                          onChange={(e) => setFormClientSecret(e.target.value)}
                          placeholder={hasExistingSecret ? '•••••••••••••••• (Leave blank to keep existing)' : (activeItem.clientSecretPlaceholder || 'Enter Client Secret')}
                          className="w-full h-9 pl-3 pr-9 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium font-mono transition-colors"
                          required={!hasExistingSecret}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                        >
                          {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Microsoft Teams Tenant ID (Only for Teams) */}
                  {activeItem.providerKey === 'teams' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                        Directory (Tenant) ID
                      </label>
                      <input
                        type="text"
                        value={formTenantId}
                        onChange={(e) => setFormTenantId(e.target.value)}
                        placeholder="common (or your specific Azure AD Directory ID)"
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                  )}

                  {/* Custom Redirect URI Override */}
                  {defaultRedirectUri && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                        {t('integrations.customRedirectUri') || 'Custom Redirect URI (Optional Override)'}
                      </label>
                      <input
                        type="url"
                        value={formRedirectUri}
                        onChange={(e) => setFormRedirectUri(e.target.value)}
                        placeholder={defaultRedirectUri}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium font-mono text-[11px] transition-colors"
                      />
                    </div>
                  )}

                </div>

                {/* Footer Strip */}
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-between gap-3 select-none font-bold shrink-0">
                  {/* Test Connection Button */}
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConfig || savingConfig}
                    className="h-9 px-3 border border-zinc-300 hover:border-black/40 bg-white text-zinc-800 hover:text-black text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs disabled:opacity-50"
                  >
                    {testingConfig ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>{testingConfig ? (t('integrations.testingConnection') || 'Testing...') : (t('integrations.testConnection') || 'Test Connection')}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(false)}
                      className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                    >
                      {t('integrations.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
                    >
                      {savingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : (t('integrations.saveSettings') || 'Save Settings')}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION DIALOG */}
      {isConfirmOpen && confirmTargetInfo && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded border p-1 flex items-center justify-center shrink-0 ${
                  confirmActionType === 'disable'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-[#FAFAFA] border-[#E8E8E6]'
                }`}>
                  {confirmActionType === 'disable' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Image 
                      src={confirmTargetInfo.logo} 
                      alt={confirmTargetName} 
                      width={16} 
                      height={16} 
                      className="object-contain select-none" 
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {confirmActionType === 'enable' 
                      ? t('integrations.confirmEnableTitle') 
                      : t('integrations.confirmDisableTitle')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {confirmActionType === 'enable' 
                  ? t('integrations.confirmEnableText', { name: confirmTargetName }) 
                  : t('integrations.confirmDisableText', { name: confirmTargetName })}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('integrations.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`h-9 px-4 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer ${
                  confirmActionType === 'enable'
                    ? 'bg-[#0A0A0A] hover:bg-zinc-900'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmActionType === 'enable' 
                  ? t('integrations.enable') 
                  : t('integrations.disable')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
