'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { PlanLockModal } from '@/components/billing/PlanLockModal';
import { 
  RefreshCw,
  Zap,
  ArrowUpRight,
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Lock,
  ShoppingBag
} from 'lucide-react';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface Spreadsheet {
  id: string;
  name: string;
}

export default function IntegrationsSettingsPage() {
  const t = useTranslations('Integrations');
  const tCommon = useTranslations('Common');
  const tPlanLock = useTranslations('PlanLock');

  // Plan Context & Lock States
  const [userPlan, setUserPlan] = useState<any>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockedIntegrationInfo, setLockedIntegrationInfo] = useState<{ title: string; desc: string; name: string } | null>(null);

  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [googleSheetsEmail, setGoogleSheetsEmail] = useState('');
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState('');

  // Spreadsheets listing
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('');
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedSheetTab, setSelectedSheetTab] = useState('');
  const [sheetPreviewRows, setSheetPreviewRows] = useState<string[][]>([]);
  const [googleImporting, setGoogleImporting] = useState(false);

  // Field mapping
  const [mappingFirstName, setMappingFirstName] = useState('-1');
  const [mappingLastName, setMappingLastName] = useState('-1');
  const [mappingEmail, setMappingEmail] = useState('-1');
  const [mappingPhone, setMappingPhone] = useState('-1');
  const [mappingTags, setMappingTags] = useState('-1');
  const [googleDupStrategy, setGoogleDupStrategy] = useState('merge');

  // Toggle sync detail view
  const [showSyncControls, setShowSyncControls] = useState(false);
  const [confirmConnectProvider, setConfirmConnectProvider] = useState<'google_sheets' | 'google_calendar' | 'zoom' | 'teams' | 'hubspot' | 'salesforce' | 'zoho' | null>(null);
  const [confirmDisconnectProvider, setConfirmDisconnectProvider] = useState<'google_sheets' | 'google_calendar' | 'zoom' | 'teams' | 'hubspot' | 'salesforce' | 'zoho' | null>(null);
  
  const [zoomConnected, setZoomConnected] = useState(false);
  const [zoomEmail, setZoomEmail] = useState('');
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [teamsEmail, setTeamsEmail] = useState('');
  const [teamsConfigured, setTeamsConfigured] = useState(false);

  // CRM Dynamic Configurations
  const [crmData, setCrmData] = useState<Record<string, {
    connected: boolean;
    email: string | null;
    field_mapping: Record<string, string>;
    sync_direction: string;
    last_sync_at: string | null;
  }>>({
    hubspot: { connected: false, email: null, field_mapping: {}, sync_direction: 'bidirectional', last_sync_at: null },
    salesforce: { connected: false, email: null, field_mapping: {}, sync_direction: 'bidirectional', last_sync_at: null },
    zoho: { connected: false, email: null, field_mapping: {}, sync_direction: 'bidirectional', last_sync_at: null }
  });

  const [activeSettingsCrm, setActiveSettingsCrm] = useState<string | null>(null);
  const [crmSyncing, setCrmSyncing] = useState(false);
  const [crmDuplicateStrategy, setCrmDuplicateStrategy] = useState<Record<string, string>>({
    hubspot: 'merge',
    salesforce: 'merge',
    zoho: 'merge'
  });

  // Mappings forms input states (stores properties inputs text per CRM dynamically)
  const [hsMappings, setHsMappings] = useState<Record<string, string>>({
    first_name: 'firstname',
    last_name: 'lastname',
    email: 'email',
    phone: 'phone',
    lifecycle_stage: 'hs_lifecycle_stage'
  });

  const [sfMappings, setSfMappings] = useState<Record<string, string>>({
    first_name: 'FirstName',
    last_name: 'LastName',
    email: 'Email',
    phone: 'Phone',
    lifecycle_stage: 'LeadSource'
  });

  const [zohoMappings, setZohoMappings] = useState<Record<string, string>>({
    first_name: 'First_Name',
    last_name: 'Last_Name',
    email: 'Email',
    phone: 'Phone',
    lifecycle_stage: 'Lead_Source'
  });

  interface SyncLogContact {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface SyncLog {
    id: number;
    status: string;
    created_at: string;
    action: string;
    contact?: SyncLogContact | null;
    external_id?: string | null;
    error_message?: string | null;
  }

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isRetryingLogId, setIsRetryingLogId] = useState<number | null>(null);



  const [loading, setLoading] = useState(true);

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleSheetsConnected(data.sheets_connected);
        setGoogleSheetsEmail(data.sheets_email || '');
        setGoogleCalendarConnected(data.calendar_connected);
        setGoogleCalendarEmail(data.calendar_email || '');
        if (data.sheets_connected) {
          await fetchSpreadsheets();
        }
      }
    } catch {}
  };

  const fetchMeetingsStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/meetings/status');
      if (res.ok) {
        const data = await res.json();
        setZoomConnected(data.zoom_connected);
        setZoomEmail(data.zoom_email || '');
        setZoomConfigured(data.zoom_configured);
        setTeamsConnected(data.teams_connected);
        setTeamsEmail(data.teams_email || '');
        setTeamsConfigured(data.teams_configured);
      }
    } catch {}
  };

  const fetchSpreadsheets = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/google/spreadsheets');
      if (res.ok) {
        const data = await res.json();
        setSpreadsheets(data.spreadsheets || []);
      }
    } catch {}
  };

  const fetchCrmStatus = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/crm/status');
      if (res.ok) {
        const data = await res.json();
        setCrmData(data);

        // Prepopulate mapping forms from database details
        if (data.hubspot?.field_mapping) {
          setHsMappings(data.hubspot.field_mapping);
        }
        if (data.salesforce?.field_mapping) {
          setSfMappings(data.salesforce.field_mapping);
        }
        if (data.zoho?.field_mapping) {
          setZohoMappings(data.zoho.field_mapping);
        }
      }
    } catch {}
  };

  const fetchSyncLogs = async (provider: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetchWithCsrf(`/integrations/crm/sync-logs/${provider}`);
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.logs || []);
      }
    } catch {}
    setLoadingLogs(false);
  };

  const handleCrmConnect = async (provider: string) => {
    try {
      const res = await fetchWithCsrf(`/integrations/crm/connect/${provider}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        toast.error(t('authUrlFailed') || `Failed to generate ${provider} auth URL.`);
      }
    } catch {
      toast.error(t('toasts.networkError'));
    }
  };

  const handleCrmDisconnect = async (provider: string) => {
    try {
      const res = await fetchWithCsrf(`/integrations/crm/disconnect/${provider}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(t('toasts.disconnectMeetingSuccess', { provider }));
        fetchCrmStatus();
        if (activeSettingsCrm === provider) {
          setActiveSettingsCrm(null);
          setSyncLogs([]);
        }
      } else {
        toast.error(t('toasts.disconnectMeetingFailed', { provider }));
      }
    } catch {
      toast.error(t('toasts.networkError'));
    }
  };

  const handleCrmSaveMapping = async (e: React.FormEvent, provider: string) => {
    e.preventDefault();
    const mappings = provider === 'hubspot' ? hsMappings 
      : provider === 'salesforce' ? sfMappings 
      : zohoMappings;

    try {
      const res = await fetchWithCsrf(`/integrations/crm/mapping/${provider}`, {
        method: 'POST',
        body: JSON.stringify({
          sync_direction: crmData[provider]?.sync_direction || 'bidirectional',
          field_mapping: mappings
        })
      });
      if (res.ok) {
        toast.success(t('toasts.fieldMappingsUpdated', { provider }));
        fetchCrmStatus();
      } else {
        toast.error(t('toasts.updateFieldMappingsFailed'));
      }
    } catch {
      toast.error(t('toasts.networkError'));
    }
  };

  const handleCrmSyncNow = async (provider: string) => {
    setCrmSyncing(true);
    try {
      const res = await fetchWithCsrf(`/integrations/crm/sync/${provider}`, {
        method: 'POST',
        body: JSON.stringify({
          duplicate_strategy: crmDuplicateStrategy[provider] || 'merge'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.syncCompleted', { imported: data.pulled?.imported || 0, merged: data.pulled?.merged || 0, pushed: data.pushed || 0 }));
        fetchSyncLogs(provider);
      } else {
        toast.error(data.message || 'Manual synchronization failed.');
      }
    } catch {
      toast.error(t('toasts.connectionTimeout'));
    } finally {
      setCrmSyncing(false);
    }
  };

  const handleRetryLog = async (provider: string, logId: number) => {
    setIsRetryingLogId(logId);
    try {
      const res = await fetchWithCsrf(`/integrations/crm/retry-log/${logId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.syncRetrySuccess'));
        fetchSyncLogs(provider);
      } else {
        toast.error(data.message || 'Retry sync failed.');
      }
    } catch {
      toast.error(t('toasts.networkErrorRetry'));
    } finally {
      setIsRetryingLogId(null);
    }
  };

  const [globalIntegrationsEnabled, setGlobalIntegrationsEnabled] = useState<Record<string, boolean>>({
    google_sheets: true,
    google_calendar: true,
    zoom: true,
    teams: true,
    hubspot: true,
    salesforce: true,
    zoho: true,
  });

  const fetchGlobalIntegrationsEnabled = async () => {
    try {
      const res = await fetchWithCsrf('/platform/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.integrations_enabled_config) {
          setGlobalIntegrationsEnabled(data.integrations_enabled_config);
        }
      }
    } catch {}
  };

  const isIntegrationLocked = (key: string) => {
    if (!userPlan) return { locked: false, reason: null };

    if (userPlan.max_integrations === 0) {
      return {
        locked: true,
        reason: tPlanLock('integrationLockedDesc')
      };
    }

    if (userPlan.allowed_integrations) {
      let allowedList: string[] = [];
      if (Array.isArray(userPlan.allowed_integrations)) {
        allowedList = userPlan.allowed_integrations;
      } else if (typeof userPlan.allowed_integrations === 'object') {
        allowedList = Object.keys(userPlan.allowed_integrations).filter(k => {
          const val = (userPlan.allowed_integrations as any)[k];
          return val !== false && val !== 0 && val !== '0' && val !== undefined && val !== null;
        });
      }

      const expanded = new Set<string>();
      allowedList.forEach(k => {
        if (k === 'meetings') {
          expanded.add('zoom');
          expanded.add('teams');
          expanded.add('google_calendar');
        } else if (k === 'crm') {
          expanded.add('hubspot');
          expanded.add('salesforce');
          expanded.add('zoho');
        } else if (k === 'webhooks') {
          expanded.add('zapier');
          expanded.add('n8n');
        } else if (k === 'google' || k === 'google_sheets' || k === 'google_calendar') {
          expanded.add('google_sheets');
          expanded.add('google_calendar');
        } else {
          expanded.add(k);
        }
      });

      if (!expanded.has(key)) {
        return {
          locked: true,
          reason: tPlanLock('integrationLockedDesc')
        };
      }
    }

    return { locked: false, reason: null };
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const meRes = await fetchWithCsrf('/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserPlan(meData.user?.tenant?.plan || null);
        }
      } catch {}
      await fetchGlobalIntegrationsEnabled();
      await fetchGoogleStatus();
      await fetchMeetingsStatus();
      await fetchCrmStatus();
      setLoading(false);
    };

    fetchAll();

    // Check query redirect outcomes
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_sheets_success') === 'true') {
      toast.success(t('toasts.connectGoogleSheetsSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('google_calendar_success') === 'true') {
      toast.success(t('toasts.connectGoogleCalendarSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('meeting_zoom_success') === 'true') {
      toast.success(t('toasts.connectZoomSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('meeting_teams_success') === 'true') {
      toast.success(t('toasts.connectTeamsSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('google_error')) {
      toast.error(t('toasts.googleAuthFailed') + params.get('google_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('meeting_error')) {
      toast.error(t('toasts.meetingAuthFailed') + params.get('meeting_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('crm_success') === 'true') {
      const providerName = params.get('provider') || 'CRM';
      toast.success(t('toasts.connectCrmSuccess', { provider: providerName.toUpperCase() }));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('crm_error')) {
      toast.error(t('toasts.crmAuthFailed') + params.get('crm_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('ecommerce_success') === 'true') {
      const platformName = params.get('platform') || 'E-Commerce';
      toast.success(t('toasts.connectEcommerceSuccess', { platform: platformName.toUpperCase() }));
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAll();
    } else if (params.get('ecommerce_error')) {
      toast.error(t('toasts.ecommerceAuthFailed') + params.get('ecommerce_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch sheet tabs list
  useEffect(() => {
    if (selectedSpreadsheet) {
      setSheetTabs([]);
      setSelectedSheetTab('');
      setSheetPreviewRows([]);
      
      const loadTabs = async () => {
        try {
          const res = await fetchWithCsrf(`/integrations/google/spreadsheets/${selectedSpreadsheet}/sheets`);
          if (res.ok) {
            const data = await res.json();
            setSheetTabs(data.sheets || []);
          }
        } catch {
          toast.error(t('toasts.loadSheetTabsFailed'));
        }
      };
      loadTabs();
    } else {
      setSheetTabs([]);
      setSelectedSheetTab('');
      setSheetPreviewRows([]);
    }
  }, [selectedSpreadsheet]);

  // Load preview data
  useEffect(() => {
    if (selectedSpreadsheet && selectedSheetTab) {
      setSheetPreviewRows([]);
      const loadPreview = async () => {
        try {
          const res = await fetchWithCsrf(`/integrations/google/spreadsheets/${selectedSpreadsheet}/sheets/${encodeURIComponent(selectedSheetTab)}/preview`);
          if (res.ok) {
            const data = await res.json();
            const rows = data.rows || [];
            setSheetPreviewRows(rows);
            
            // Auto-mapping columns
            if (rows.length > 0) {
              const headers = rows[0].map((h: string) => h.toLowerCase().trim());
              
              const fnIdx = headers.findIndex((h: string) => h.includes('first') || h === 'name' || h === 'firstname');
              setMappingFirstName(fnIdx !== -1 ? fnIdx.toString() : '-1');
              
              const lnIdx = headers.findIndex((h: string) => h.includes('last') || h === 'surname' || h === 'lastname');
              setMappingLastName(lnIdx !== -1 ? lnIdx.toString() : '-1');
              
              const emIdx = headers.findIndex((h: string) => h.includes('email') || h === 'mail');
              setMappingEmail(emIdx !== -1 ? emIdx.toString() : '-1');
              
              const phIdx = headers.findIndex((h: string) => h.includes('phone') || h === 'mobile' || h === 'tel' || h === 'contact');
              setMappingPhone(phIdx !== -1 ? phIdx.toString() : '-1');
              
              const tgIdx = headers.findIndex((h: string) => h.includes('tag') || h === 'label');
              setMappingTags(tgIdx !== -1 ? tgIdx.toString() : '-1');
            }
          }
        } catch {
          toast.error(t('toasts.previewSheetFailed'));
        }
      };
      loadPreview();
    } else {
      setSheetPreviewRows([]);
    }
  }, [selectedSpreadsheet, selectedSheetTab]);

  const handleConnect = async (provider: 'google_sheets' | 'google_calendar' | 'zoom' | 'teams') => {
    try {
      if (provider === 'zoom' || provider === 'teams') {
        const res = await fetchWithCsrf(`/integrations/meetings/auth-url?provider=${provider}`);
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
          }
        } else {
          toast.error(t('toasts.generateAuthUrlFailed', { provider }));
        }
        return;
      }
      const type = provider === 'google_sheets' ? 'sheets' : 'calendar';
      const res = await fetchWithCsrf(`/integrations/google/auth-url?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        toast.error(t('toasts.generateGoogleAuthUrlFailed', { type }));
      }
    } catch {
      toast.error(t('toasts.networkError'));
    }
  };

  const handleDisconnect = async (provider: 'google_sheets' | 'google_calendar' | 'zoom' | 'teams') => {
    try {
      if (provider === 'zoom' || provider === 'teams') {
        const res = await fetchWithCsrf(`/integrations/meetings/disconnect?provider=${provider}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          toast.success(t('toasts.disconnectMeetingSuccess', { provider: provider === 'zoom' ? 'Zoom' : 'Microsoft Teams' }));
          if (provider === 'zoom') {
            setZoomConnected(false);
            setZoomEmail('');
          } else {
            setTeamsConnected(false);
            setTeamsEmail('');
          }
        } else {
          toast.error(t('toasts.disconnectMeetingFailed', { provider }));
        }
        return;
      }
      const type = provider === 'google_sheets' ? 'sheets' : 'calendar';
      const res = await fetchWithCsrf(`/integrations/google/disconnect?type=${type}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(t('toasts.disconnectGoogleSuccess', { type }));
        if (provider === 'google_sheets') {
          setGoogleSheetsConnected(false);
          setGoogleSheetsEmail('');
          setSpreadsheets([]);
          setSelectedSpreadsheet('');
          setSheetTabs([]);
          setSelectedSheetTab('');
          setSheetPreviewRows([]);
          setShowSyncControls(false);
        } else {
          setGoogleCalendarConnected(false);
          setGoogleCalendarEmail('');
        }
      } else {
        toast.error(t('toasts.disconnectGoogleFailed', { type }));
      }
    } catch {
      toast.error(t('toasts.networkError'));
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpreadsheet || !selectedSheetTab) {
      toast.error(t('toasts.selectSheetAndTab'));
      return;
    }
    if (mappingEmail === '-1' && mappingPhone === '-1') {
      toast.error(t('toasts.mapRequiredColumns'));
      return;
    }

    setGoogleImporting(true);
    try {
      const res = await fetchWithCsrf('/integrations/google/import', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheet_id: selectedSpreadsheet,
          sheet_name: selectedSheetTab,
          mapping: {
            first_name: mappingFirstName !== '-1' ? parseInt(mappingFirstName) : null,
            last_name: mappingLastName !== '-1' ? parseInt(mappingLastName) : null,
            email: mappingEmail !== '-1' ? parseInt(mappingEmail) : null,
            phone: mappingPhone !== '-1' ? parseInt(mappingPhone) : null,
            tags: mappingTags !== '-1' ? parseInt(mappingTags) : null,
          },
          duplicate_strategy: googleDupStrategy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.importContactsSuccess', { imported: data.imported, merged: data.merged }));
        setSelectedSpreadsheet('');
        setSheetTabs([]);
        setSelectedSheetTab('');
        setSheetPreviewRows([]);
        setShowSyncControls(false);
      } else {
        toast.error(data.message || 'Import failed.');
      }
    } catch {
      toast.error(t('toasts.networkError'));
    } finally {
      setGoogleImporting(false);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('syncingStatus')} />;
  }

  const isEnabled = (key: string) => globalIntegrationsEnabled[key] !== false;

  const configuredCount = 
    (googleSheetsConnected && isEnabled('google_sheets') ? 1 : 0) + 
    (googleCalendarConnected && isEnabled('google_calendar') ? 1 : 0) + 
    (zoomConnected && isEnabled('zoom') ? 1 : 0) + 
    (teamsConnected && isEnabled('teams') ? 1 : 0) + 
    (crmData.hubspot?.connected && isEnabled('hubspot') ? 1 : 0) + 
    (crmData.salesforce?.connected && isEnabled('salesforce') ? 1 : 0) + 
    (crmData.zoho?.connected && isEnabled('zoho') ? 1 : 0);

  const totalAvailableAndNotConnected = 
    (!googleSheetsConnected && isEnabled('google_sheets') ? 1 : 0) +
    (!googleCalendarConnected && isEnabled('google_calendar') ? 1 : 0) +
    (!zoomConnected && isEnabled('zoom') && zoomConfigured ? 1 : 0) +
    (!teamsConnected && isEnabled('teams') && teamsConfigured ? 1 : 0) +
    (!crmData.hubspot?.connected && isEnabled('hubspot') ? 1 : 0) +
    (!crmData.salesforce?.connected && isEnabled('salesforce') ? 1 : 0) +
    (!crmData.zoho?.connected && isEnabled('zoho') ? 1 : 0);

  return (
    <div className="w-full p-8 space-y-8 font-sans text-black animate-fade-in select-none flex-1 overflow-y-auto">
      {/* E-Commerce Hub Notice Banner */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white border border-emerald-200/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              E-Commerce Stores & Products
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">New Dedicated Section</span>
            </h4>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Shopify and WooCommerce stores, product catalog synchronization, and abandoned cart recovery are now managed in the dedicated E-Commerce sidebar section.
            </p>
          </div>
        </div>
        <Link
          href="/ecommerce/stores"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <span>Open E-Commerce</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>


      {/* 1. Configured/Enabled Providers Table Section */}
      {configuredCount > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1 select-none text-left">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest block">{t('activeIntegrations')}</span>
            <p className="text-[10px] text-zinc-500 font-medium">{t('activeIntegrationsDesc')}</p>
          </div>
          
          <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                  <th className="p-4">{t('integration')}</th>
                  <th className="p-4">{t('connectedAccount')}</th>
                  <th className="p-4">{t('syncStatusDirection')}</th>
                  <th className="p-4 text-right">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                {googleSheetsConnected && isEnabled('google_sheets') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1 shrink-0 select-none">
                        <img 
                          src="/google_sheets.webp" 
                          alt="Google Sheets logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">Google Sheets</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {googleSheetsEmail || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700">
                        Import & RAG context
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setShowSyncControls(true)}
                        className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('mapAndImport')}
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectProvider('google_sheets')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {googleCalendarConnected && isEnabled('google_calendar') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1 shrink-0 select-none">
                        <img 
                          src="/google_calendar.png" 
                          alt="Google Calendar logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">{t('googleCalendarDisplay') || 'Google Calendar'}</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {googleCalendarEmail || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700">
                        Bi-directional Calendar Sync
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setConfirmDisconnectProvider('google_calendar')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {zoomConnected && isEnabled('zoom') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1.5 shrink-0 select-none">
                        <img 
                          src="/zoom.png" 
                          alt="Zoom logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">Zoom Meetings</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {zoomEmail || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700">
                        Meeting Integration
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setConfirmDisconnectProvider('zoom')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {teamsConnected && isEnabled('teams') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1 shrink-0 select-none">
                        <img 
                          src="/teams.webp" 
                          alt="Microsoft Teams logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">Microsoft Teams</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {teamsEmail || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700">
                        Meeting Integration
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setConfirmDisconnectProvider('teams')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {crmData.hubspot?.connected && isEnabled('hubspot') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1.5 shrink-0 select-none">
                        <img 
                          src="/hubspot.png" 
                          alt="HubSpot logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">HubSpot CRM</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {crmData.hubspot.email || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700 uppercase">
                        {crmData.hubspot.sync_direction || 'bidirectional'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setActiveSettingsCrm('hubspot');
                          fetchSyncLogs('hubspot');
                        }}
                        className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        Map & Sync
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectProvider('hubspot')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {crmData.salesforce?.connected && isEnabled('salesforce') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1.5 shrink-0 select-none">
                        <img 
                          src="/salesforce.webp" 
                          alt="Salesforce logo" 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">Salesforce CRM</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {crmData.salesforce.email || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700 uppercase">
                        {crmData.salesforce.sync_direction || 'bidirectional'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setActiveSettingsCrm('salesforce');
                          fetchSyncLogs('salesforce');
                        }}
                        className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        Map & Sync
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectProvider('salesforce')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
                {crmData.zoho?.connected && isEnabled('zoho') && (
                  <tr className="hover:bg-neutral-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-lg p-1.5 shrink-0 select-none">
                        <img 
                          src="/zoho_crm.png" 
                          alt="Zoho logo" 
                          className="h-4 w-4 object-contain" 
                        />
                      </div>
                      <span className="text-zinc-955 font-bold">Zoho CRM</span>
                    </td>
                    <td className="p-4 text-zinc-650 font-medium font-mono text-[10px]">
                      {crmData.zoho.email || t('connectedAccount')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-50 px-2 py-0.5 border border-zinc-200/60 rounded text-[10px] font-semibold text-zinc-700 uppercase">
                        {crmData.zoho.sync_direction || 'bidirectional'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setActiveSettingsCrm('zoho');
                          fetchSyncLogs('zoho');
                        }}
                        className="px-2.5 py-1 border border-zinc-150 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        Map & Sync
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectProvider('zoho')}
                        className="px-2.5 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-755 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer inline-flex items-center"
                      >
                        {t('disconnect')}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-4 my-6 select-none animate-overlay-fade">
          <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">{t('syncWorkspaceContacts')}</h3>
            <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed font-semibold">
              {t('syncWorkspaceContactsDesc')}
            </p>
          </div>
        </div>
      )}

      {/* 2. Available/Add Integrations Section */}
      <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
        <div className="space-y-1 select-none text-left">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('availableIntegrations')}</span>
          <p className="text-[10px] text-zinc-500 font-medium">{t('availableIntegrationsDesc')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!googleSheetsConnected && isEnabled('google_sheets') && (() => {
            const lockStatus = isIntegrationLocked('google_sheets');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/google_sheets.webp" alt="Google Sheets logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">Google Sheets</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        Pull spreadsheet contact rows, auto-map columns, and link sheet arrays directly into your RAG text-matching workflows.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.google_sheets')
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
                      onClick={() => setConfirmConnectProvider('google_sheets')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectGoogleSheets')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!googleCalendarConnected && isEnabled('google_calendar') && (() => {
            const lockStatus = isIntegrationLocked('google_calendar');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/google_calendar.webp" alt="Google Calendar logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.google_calendar')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('googleCalendarDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.google_calendar')
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
                      onClick={() => setConfirmConnectProvider('google_calendar')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectGoogleCalendar')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!zoomConnected && isEnabled('zoom') && zoomConfigured && (() => {
            const lockStatus = isIntegrationLocked('zoom');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/zoom.png" alt="Zoom logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.zoom')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('zoomDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.zoom')
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
                      onClick={() => setConfirmConnectProvider('zoom')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectZoom')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!teamsConnected && isEnabled('teams') && teamsConfigured && (() => {
            const lockStatus = isIntegrationLocked('teams');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/teams.webp" alt="Microsoft Teams logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.teams')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('teamsDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.teams')
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
                      onClick={() => setConfirmConnectProvider('teams')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectTeams')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!crmData.hubspot?.connected && isEnabled('hubspot') && (() => {
            const lockStatus = isIntegrationLocked('hubspot');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/hubspot.png" alt="HubSpot logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.hubspot')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('hubspotDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.hubspot')
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
                      onClick={() => setConfirmConnectProvider('hubspot')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectHubspot')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!crmData.salesforce?.connected && isEnabled('salesforce') && (() => {
            const lockStatus = isIntegrationLocked('salesforce');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/salesforce.webp" alt="Salesforce logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.salesforce')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('salesforceDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.salesforce')
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
                      onClick={() => setConfirmConnectProvider('salesforce')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectSalesforce')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {!crmData.zoho?.connected && isEnabled('zoho') && (() => {
            const lockStatus = isIntegrationLocked('zoho');
            const isLocked = lockStatus.locked;
            return (
              <div className={`border rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs transition-all duration-200 ${
                isLocked ? 'border-zinc-200/80 opacity-90' : 'border-[#E8E8E6]/60 hover:shadow-2xs hover:border-zinc-300'
              }`}>
                <div>
                  <div className="flex items-start mb-4 select-none">
                    <div className="h-10 w-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-2 shrink-0">
                      <img src="/zoho_crm.png" alt="Zoho logo" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{tPlanLock('integrationNames.zoho')}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1.5 leading-relaxed min-h-[48px] line-clamp-3">
                        {t('zohoDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0F0F0] pt-3.5 mt-5 font-bold">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedIntegrationInfo({
                          title: tPlanLock('lockedFeature'),
                          desc: lockStatus.reason || tPlanLock('integrationLockedDesc'),
                          name: tPlanLock('integrationNames.zoho')
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
                      onClick={() => setConfirmConnectProvider('zoho')}
                      className="w-full py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-755 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-3xs text-center"
                    >
                      {t('connectZoho')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {totalAvailableAndNotConnected === 0 && (
            <div className="col-span-full border border-dashed border-[#E8E8E6] rounded-2xl p-8 text-center bg-white text-xs text-zinc-400 font-semibold select-none">
              {t('allConnected')}
            </div>
          )}
        </div>
      </div>

      {/* Sync / Importer Settings Portal Dialog Modal */}
      {googleSheetsConnected && showSyncControls && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowSyncControls(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <img 
                    src="/google_sheets.webp" 
                    alt="Google Sheets logo" 
                    className="h-4 w-4 object-contain" 
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('googleSheetsMapping')}</h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">
                    {t('googleSheetsMappingDesc')}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSyncControls(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <form onSubmit={handleImportSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('spreadsheet')}</label>
                  <DropdownSelect
                    value={selectedSpreadsheet}
                    onChange={(val) => {
                      setSelectedSpreadsheet(val);
                      setSelectedSheetTab('');
                      setSheetTabs([]);
                      setSheetPreviewRows([]);
                    }}
                    options={[
                      { value: '', label: t('selectSpreadsheet') },
                      ...spreadsheets.map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('sheetTab')}</label>
                  <DropdownSelect
                    value={selectedSheetTab}
                    onChange={(val) => setSelectedSheetTab(val)}
                    options={[
                      { value: '', label: t('selectSheetTab') },
                      ...sheetTabs.map(t => ({ value: t, label: t }))
                    ]}
                    disabled={!selectedSpreadsheet}
                  />
                </div>
              </div>

              {selectedSheetTab && sheetPreviewRows.length > 0 && (
                <div className="space-y-4 animate-fade-in font-sans">
                  <h4 className="text-[10px] text-zinc-955 font-bold uppercase tracking-wider border-b border-[#E8E8E6] pb-1">
                    {t('columnsConfiguration')}
                  </h4>
                  
                  {(() => {
                    const colOptions = [
                      { value: '-1', label: t('doNotMap') },
                      ...sheetPreviewRows[0].map((col, idx) => ({
                        value: idx.toString(),
                        label: `Col ${String.fromCharCode(65 + idx)}: ${col.slice(0, 30)}${col.length > 30 ? '...' : ''}`
                      }))
                    ];

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('firstNameColumn')}</label>
                          <DropdownSelect
                            value={mappingFirstName}
                            onChange={(val) => setMappingFirstName(val)}
                            options={colOptions}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lastNameColumn')}</label>
                          <DropdownSelect
                            value={mappingLastName}
                            onChange={(val) => setMappingLastName(val)}
                            options={colOptions}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('emailColumn')}</label>
                          <DropdownSelect
                            value={mappingEmail}
                            onChange={(val) => setMappingEmail(val)}
                            options={colOptions}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneColumn')}</label>
                          <DropdownSelect
                            value={mappingPhone}
                            onChange={(val) => setMappingPhone(val)}
                            options={colOptions}
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('tagsColumn')}</label>
                          <DropdownSelect
                            value={mappingTags}
                            onChange={(val) => setMappingTags(val)}
                            options={colOptions}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('duplicatesStrategy')}</label>
                    <div className="h-9 px-3 border border-[#E8E8E6] rounded-[6px] bg-[#FAFAFA] flex items-center gap-4 text-xs font-semibold text-zinc-700 select-none">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                        <input
                          type="radio"
                          name="settingsGoogleDuplicateStrategy"
                          checked={googleDupStrategy === 'merge'}
                          onChange={() => setGoogleDupStrategy('merge')}
                          className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                        />
                        <span>{t('mergeData')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                        <input
                          type="radio"
                          name="settingsGoogleDuplicateStrategy"
                          checked={googleDupStrategy === 'keep'}
                          onChange={() => setGoogleDupStrategy('keep')}
                          className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                        />
                        <span>{t('keepDuplicates')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Action Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
                <button
                  type="button"
                  onClick={() => setShowSyncControls(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={googleImporting || !selectedSheetTab || (mappingEmail === '-1' && mappingPhone === '-1')}
                  className="h-9 px-4 bg-[#0A0A0A] text-white hover:bg-zinc-900 font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[140px] disabled:opacity-50 cursor-pointer"
                >
                  {googleImporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('beginSyncImport')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Dynamic CRM Settings & Logs Configuration Portal Dialog Modal */}
      {activeSettingsCrm && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setActiveSettingsCrm(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-2xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <img 
                    src={
                      activeSettingsCrm === 'hubspot' ? '/hubspot.png' 
                      : activeSettingsCrm === 'salesforce' ? '/salesforce.webp' 
                      : '/zoho_crm.png'
                    } 
                    alt={`${activeSettingsCrm} logo`}
                    className="h-4 w-4 object-contain" 
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('crmConfigurationTitle', { crm: activeSettingsCrm.toUpperCase() })}
                  </h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5 truncate">
                    {t('crmConfigurationDesc', { crm: activeSettingsCrm.toUpperCase() })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {crmData[activeSettingsCrm]?.email && (
                  <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider bg-zinc-50 border border-zinc-250 text-zinc-555">
                    {crmData[activeSettingsCrm]?.email}
                  </span>
                )}
                <button 
                  type="button" 
                  onClick={() => setActiveSettingsCrm(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Container with Form */}
            <form onSubmit={(e) => handleCrmSaveMapping(e, activeSettingsCrm)} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('syncDirection')}</label>
                    <DropdownSelect
                      value={crmData[activeSettingsCrm]?.sync_direction || 'bidirectional'}
                      onChange={(val) => setCrmData({
                        ...crmData,
                        [activeSettingsCrm]: {
                          ...crmData[activeSettingsCrm],
                          sync_direction: val
                        }
                      })}
                      options={[
                        { value: 'push', label: t('pushOnly', { crm: activeSettingsCrm.toUpperCase() }) },
                        { value: 'pull', label: t('pullOnly', { crm: activeSettingsCrm.toUpperCase() }) },
                        { value: 'bidirectional', label: t('bidirectional') }
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('duplicateStrategyPulls')}</label>
                    <div className="h-9 px-3 border border-[#E8E8E6] rounded-[6px] bg-[#FAFAFA] flex items-center gap-4 text-xs font-semibold text-zinc-700 select-none">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                        <input
                          type="radio"
                          name="crmDupStrategy"
                          checked={crmDuplicateStrategy[activeSettingsCrm] === 'merge'}
                          onChange={() => setCrmDuplicateStrategy({
                            ...crmDuplicateStrategy,
                            [activeSettingsCrm]: 'merge'
                          })}
                          className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                        />
                        <span>{t('mergeData')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                        <input
                          type="radio"
                          name="crmDupStrategy"
                          checked={crmDuplicateStrategy[activeSettingsCrm] === 'keep'}
                          onChange={() => setCrmDuplicateStrategy({
                            ...crmDuplicateStrategy,
                            [activeSettingsCrm]: 'keep'
                          })}
                          className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                        />
                        <span>{t('keepDuplicates')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 font-sans">
                  <h4 className="text-[10px] text-zinc-955 font-bold uppercase tracking-wider border-b border-[#E8E8E6] pb-1">
                    {t('propertyMappings', { crm: activeSettingsCrm.toUpperCase() })}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('firstNameProperty')}</label>
                      <input
                        type="text"
                        value={activeSettingsCrm === 'hubspot' ? hsMappings.first_name 
                          : activeSettingsCrm === 'salesforce' ? sfMappings.first_name 
                          : zohoMappings.first_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeSettingsCrm === 'hubspot') setHsMappings({ ...hsMappings, first_name: val });
                          else if (activeSettingsCrm === 'salesforce') setSfMappings({ ...sfMappings, first_name: val });
                          else setZohoMappings({ ...zohoMappings, first_name: val });
                        }}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lastNameProperty')}</label>
                      <input
                        type="text"
                        value={activeSettingsCrm === 'hubspot' ? hsMappings.last_name 
                          : activeSettingsCrm === 'salesforce' ? sfMappings.last_name 
                          : zohoMappings.last_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeSettingsCrm === 'hubspot') setHsMappings({ ...hsMappings, last_name: val });
                          else if (activeSettingsCrm === 'salesforce') setSfMappings({ ...sfMappings, last_name: val });
                          else setZohoMappings({ ...zohoMappings, last_name: val });
                        }}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('emailAddressProperty')}</label>
                      <input
                        type="text"
                        value={activeSettingsCrm === 'hubspot' ? hsMappings.email 
                          : activeSettingsCrm === 'salesforce' ? sfMappings.email 
                          : zohoMappings.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeSettingsCrm === 'hubspot') setHsMappings({ ...hsMappings, email: val });
                          else if (activeSettingsCrm === 'salesforce') setSfMappings({ ...sfMappings, email: val });
                          else setZohoMappings({ ...zohoMappings, email: val });
                        }}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneIndexProperty')}</label>
                      <input
                        type="text"
                        value={activeSettingsCrm === 'hubspot' ? hsMappings.phone 
                          : activeSettingsCrm === 'salesforce' ? sfMappings.phone 
                          : zohoMappings.phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeSettingsCrm === 'hubspot') setHsMappings({ ...hsMappings, phone: val });
                          else if (activeSettingsCrm === 'salesforce') setSfMappings({ ...sfMappings, phone: val });
                          else setZohoMappings({ ...zohoMappings, phone: val });
                        }}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lifecycleStageProperty')}</label>
                      <input
                        type="text"
                        value={activeSettingsCrm === 'hubspot' ? hsMappings.lifecycle_stage 
                          : activeSettingsCrm === 'salesforce' ? sfMappings.lifecycle_stage 
                          : zohoMappings.lifecycle_stage}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeSettingsCrm === 'hubspot') setHsMappings({ ...hsMappings, lifecycle_stage: val });
                          else if (activeSettingsCrm === 'salesforce') setSfMappings({ ...sfMappings, lifecycle_stage: val });
                          else setZohoMappings({ ...zohoMappings, lifecycle_stage: val });
                        }}
                        className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Sync History Logs List */}
                <div className="space-y-3 pt-4 border-t border-[#E8E8E6] font-sans">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] text-zinc-955 font-bold uppercase tracking-wider">
                      {t('syncExecutionLogs')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => fetchSyncLogs(activeSettingsCrm)}
                      disabled={loadingLogs}
                      className="text-[10px] text-zinc-550 hover:text-black font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                      {t('refreshLogs')}
                    </button>
                  </div>

                  <div className="border border-[#E8E8E6] rounded-[6px] overflow-hidden bg-white max-h-60 overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#E8E8E6] text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                          <th className="p-3">{t('time')}</th>
                          <th className="p-3">{t('action')}</th>
                          <th className="p-3">{t('contact')}</th>
                          <th className="p-3">{t('crmId', { crm: activeSettingsCrm.toUpperCase() })}</th>
                          <th className="p-3">{t('status')}</th>
                          <th className="p-3 text-right">{t('details')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6]">
                        {syncLogs.map((log) => {
                          const isSuccess = log.status === 'success';
                          return (
                            <tr key={log.id} className="hover:bg-[#FAFAFA]/40 font-medium">
                              <td className="p-3 text-[10px] text-zinc-400 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-50 border border-zinc-150 text-zinc-650">
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 truncate max-w-[150px]">
                                {log.contact 
                                  ? `${log.contact.first_name || ''} ${log.contact.last_name || ''} (${log.contact.email || log.contact.phone || ''})`
                                  : 'N/A'}
                              </td>
                              <td className="p-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                                {log.external_id || 'N/A'}
                              </td>
                              <td className="p-3 whitespace-nowrap font-bold">
                                {isSuccess ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100">
                                    {t('success')}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-800 border border-red-100">
                                    {t('failed')}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                {!isSuccess ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-[10px] text-red-650 font-bold truncate max-w-[120px]" title={log.error_message || undefined}>
                                      {log.error_message || t('unknownError')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRetryLog(activeSettingsCrm, log.id)}
                                      disabled={isRetryingLogId === log.id}
                                      className="px-2 py-1 bg-red-650 hover:bg-red-750 text-white font-bold text-[9px] uppercase tracking-wider rounded-[4px] cursor-pointer disabled:opacity-50"
                                    >
                                      {isRetryingLogId === log.id ? t('retrying') : t('retry')}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {syncLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-400 font-semibold select-none">
                              {t('noCrmLogs')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Action Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-5 rounded-b-[12px] flex items-center justify-between select-none shrink-0 font-bold">
                <button
                  type="button"
                  onClick={() => setActiveSettingsCrm(null)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCrmSyncNow(activeSettingsCrm)}
                    disabled={crmSyncing}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50 shadow-3xs"
                  >
                    {crmSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('forceSyncNow')}
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer"
                  >
                    {t('savePropertyMapping')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Redirect Authorization Confirmation Portal Dialog Modal */}
      {confirmConnectProvider && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setConfirmConnectProvider(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  {confirmConnectProvider === 'google_sheets' ? (
                    <img src="/google_sheets.webp" alt="Google Sheets logo" className="h-4 w-4 object-contain" />
                  ) : confirmConnectProvider === 'google_calendar' ? (
                    <img src="/google_calendar.webp" alt="Google Calendar logo" className="h-4 w-4 object-contain" />
                  ) : confirmConnectProvider === 'zoom' ? (
                    <img src="/zoom.png" alt="Zoom logo" className="h-4 w-4 object-contain" />
                  ) : confirmConnectProvider === 'teams' ? (
                    <img src="/teams.webp" alt="Microsoft Teams logo" className="h-4 w-4 object-contain" />
                  ) : confirmConnectProvider === 'hubspot' ? (
                    <img src="/hubspot.png" alt="HubSpot logo" className="h-4 w-4 object-contain" />
                  ) : confirmConnectProvider === 'salesforce' ? (
                    <img src="/salesforce.webp" alt="Salesforce logo" className="h-4 w-4 object-contain" />
                  ) : (
                    <img src="/zoho_crm.png" alt="Zoho logo" className="h-4 w-4 object-contain" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('authorizeProviderTitle', {
                      provider: confirmConnectProvider === 'google_sheets' ? 'Google Sheets'
                        : confirmConnectProvider === 'google_calendar' ? 'Google Calendar'
                        : confirmConnectProvider === 'zoom' ? 'Zoom Meetings'
                        : confirmConnectProvider === 'teams' ? 'Microsoft Teams'
                        : confirmConnectProvider === 'hubspot' ? 'HubSpot CRM'
                        : confirmConnectProvider === 'salesforce' ? 'Salesforce CRM'
                        : 'Zoho CRM'
                    })}
                  </h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">
                    {t('confirmRedirection')}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setConfirmConnectProvider(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const provider = confirmConnectProvider;
              setConfirmConnectProvider(null);
              if (provider === 'google_sheets') {
                await handleConnect('google_sheets');
              } else if (provider === 'google_calendar') {
                await handleConnect('google_calendar');
              } else if (provider === 'zoom') {
                await handleConnect('zoom');
              } else if (provider === 'teams') {
                await handleConnect('teams');
              } else if (provider === 'hubspot') {
                await handleCrmConnect('hubspot');
              } else if (provider === 'salesforce') {
                await handleCrmConnect('salesforce');
              } else if (provider === 'zoho') {
                await handleCrmConnect('zoho');
              }
            }}>
              <div className="py-4 space-y-3 font-sans text-xs">
                <p className="text-zinc-650 leading-relaxed font-semibold">
                  {t('redirectionInstructionsText', {
                    authPanel: confirmConnectProvider === 'zoom' ? 'Zoom authorization panel'
                      : confirmConnectProvider === 'teams' ? 'Microsoft Graph authorization panel'
                      : confirmConnectProvider?.startsWith('google') ? 'Google Account Services'
                      : confirmConnectProvider === 'hubspot' ? 'HubSpot Application authorization panel'
                      : confirmConnectProvider === 'salesforce' ? 'Salesforce Application authorization panel'
                      : 'Zoho Application authorization panel'
                  })}
                </p>
                <p className="text-zinc-500 leading-relaxed">
                  {t('redirectionConsentText')}
                </p>
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                <button
                  type="button"
                  onClick={() => setConfirmConnectProvider(null)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-[#0A0A0A] text-white hover:bg-zinc-900 font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center cursor-pointer"
                >
                  {t('proceedAuthorize')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Disconnect Integration Confirmation Alert Dialog Modal */}
      {confirmDisconnectProvider && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setConfirmDisconnectProvider(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('disconnectTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setConfirmDisconnectProvider(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 font-sans text-xs">
              <p className="text-zinc-650 leading-relaxed font-semibold">
                {t('disconnectConfirmText', {
                  provider: confirmDisconnectProvider === 'google_sheets' ? 'Google Sheets'
                    : confirmDisconnectProvider === 'google_calendar' ? 'Google Calendar'
                    : confirmDisconnectProvider === 'zoom' ? 'Zoom Meetings'
                    : confirmDisconnectProvider === 'teams' ? 'Microsoft Teams'
                    : confirmDisconnectProvider === 'hubspot' ? 'HubSpot CRM'
                    : confirmDisconnectProvider === 'salesforce' ? 'Salesforce CRM'
                    : 'Zoho CRM'
                })}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDisconnectProvider(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const provider = confirmDisconnectProvider;
                  setConfirmDisconnectProvider(null);
                  if (provider === 'google_sheets') {
                    await handleDisconnect('google_sheets');
                  } else if (provider === 'google_calendar') {
                    await handleDisconnect('google_calendar');
                  } else if (provider === 'zoom') {
                    await handleDisconnect('zoom');
                  } else if (provider === 'teams') {
                    await handleDisconnect('teams');
                  } else if (provider === 'hubspot') {
                    await handleCrmDisconnect('hubspot');
                  } else if (provider === 'salesforce') {
                    await handleCrmDisconnect('salesforce');
                  } else if (provider === 'zoho') {
                    await handleCrmDisconnect('zoho');
                  }
                }}
                className="bg-red-600 hover:bg-red-750 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center"
              >
                {t('disconnect')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Plan Lock Feature Gate Modal */}
      <PlanLockModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        title={lockedIntegrationInfo?.title}
        description={lockedIntegrationInfo?.desc}
        featureName={lockedIntegrationInfo?.name}
        planName={userPlan?.name}
      />

    </div>
  );
}
