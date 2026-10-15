'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  UserPlus, 
  Upload, 
  Trash2, 
  ExternalLink,
  RefreshCw,
  FileText,
  ShieldAlert,
  Database,
  X
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface Contact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lifecycle_stage: string;
  tags: string[] | null;
  created_at: string;
}

interface ParsedContact {
  id: string; // client temporary ID
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lifecycle_stage: string;
  tags: string[];
  isDuplicate: boolean;
  selected: boolean;
}

export default function ContactsDirectoryPage() {
  const t = useTranslations('Contacts');
  const tCommon = useTranslations('Common');
  const [mounted, setMounted] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [stageInput, setStageInput] = useState('lead');
  const [tagsInput, setTagsInput] = useState('');

  // Unified Import Modal States
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [activeImportSource, setActiveImportSource] = useState<'csv' | 'google_sheets' | 'hubspot' | 'salesforce' | 'zoho' | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [crms, setCrms] = useState<Record<string, { connected: boolean; email: string | null }>>({
    hubspot: { connected: false, email: null },
    salesforce: { connected: false, email: null },
    zoho: { connected: false, email: null },
  });
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // Google Sheets configuration states
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('');
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedSheetTab, setSelectedSheetTab] = useState('');
  const [sheetPreviewRows, setSheetPreviewRows] = useState<string[][]>([]);
  const [googleImporting, setGoogleImporting] = useState(false);
  const [googleDupStrategy, setGoogleDupStrategy] = useState('merge');

  // Google Sheets mappings
  const [mappingFirstName, setMappingFirstName] = useState('-1');
  const [mappingLastName, setMappingLastName] = useState('-1');
  const [mappingEmail, setMappingEmail] = useState('-1');
  const [mappingPhone, setMappingPhone] = useState('-1');
  const [mappingTags, setMappingTags] = useState('-1');

  // CRM sync states
  const [crmDuplicateStrategy, setCrmDuplicateStrategy] = useState('merge');

  // CSV Import configuration states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedContacts, setCsvParsedContacts] = useState<ParsedContact[]>([]);
  const [csvPreviewMode, setCsvPreviewMode] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<'merge' | 'keep'>('merge');

  const loadContacts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (stageFilter) query.append('stage', stageFilter);

      const res = await fetchWithCsrf(`/contacts?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      } else {
        toast.error(t('toastRetrieveFailed'));
      }
    } catch {
      toast.error(t('toastRetrieveNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [search, stageFilter]);

  const handleCloseImportModal = () => {
    setIntegrationOpen(false);
    setActiveImportSource(null);
    setCsvFile(null);
    setCsvParsedContacts([]);
    setCsvPreviewMode(false);
    setSelectedSpreadsheet('');
    setSheetTabs([]);
    setSelectedSheetTab('');
    setSheetPreviewRows([]);
  };

  const fetchIntegrationStatuses = async () => {
    setIntegrationLoading(true);
    try {
      const [googleRes, crmRes] = await Promise.all([
        fetchWithCsrf('/integrations/google/status'),
        fetchWithCsrf('/integrations/crm/status'),
      ]);

      if (googleRes.ok) {
        const googleData = await googleRes.json();
        setGoogleConnected(googleData.sheets_connected);
        setGoogleEmail(googleData.sheets_email || '');
        if (googleData.sheets_connected) {
          try {
            const res = await fetchWithCsrf('/integrations/google/spreadsheets');
            if (res.ok) {
              const data = await res.json();
              setSpreadsheets(data.spreadsheets || []);
            }
          } catch {}
        }
      }

      if (crmRes.ok) {
        const crmData = await crmRes.json();
        setCrms({
          hubspot: { connected: crmData.hubspot?.connected || false, email: crmData.hubspot?.email || null },
          salesforce: { connected: crmData.salesforce?.connected || false, email: crmData.salesforce?.email || null },
          zoho: { connected: crmData.zoho?.connected || false, email: crmData.zoho?.email || null },
        });
      }
    } catch {
      toast.error(t('toastLoadIntegrationStatusFailed'));
    } finally {
      setIntegrationLoading(false);
    }
  };

  // Google Sheets tab details loader
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
          toast.error(t('toastLoadSheetTabsFailed'));
        }
      };
      loadTabs();
    } else {
      setSheetTabs([]);
      setSelectedSheetTab('');
      setSheetPreviewRows([]);
    }
  }, [selectedSpreadsheet]);

  // Load preview data & Auto-mapping columns for sheets
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
          toast.error(t('toastPreviewSheetFailed'));
        }
      };
      loadPreview();
    }
  }, [selectedSpreadsheet, selectedSheetTab]);

  const handleCrmSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      const res = await fetchWithCsrf(`/integrations/crm/sync/${provider}`, {
        method: 'POST',
        body: JSON.stringify({
          duplicate_strategy: crmDuplicateStrategy
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('crmSyncSuccess', { provider: provider.toUpperCase() }), {
          description: `Imported: ${data.imported || 0} records. Merged: ${data.merged || 0} duplicates.`,
        });
        handleCloseImportModal();
        loadContacts();
      } else {
        toast.error(data.message || t('toastProviderSyncError', { provider: provider.toUpperCase() }));
      }
    } catch {
      toast.error(t('toastProviderSyncError', { provider: provider.toUpperCase() }));
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleGoogleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpreadsheet || !selectedSheetTab) {
      toast.error(t('toastSelectSpreadsheetAndTab'));
      return;
    }
    if (mappingEmail === '-1' && mappingPhone === '-1') {
      toast.error(t('toastMapEmailOrPhone'));
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
        toast.success(t('googleImportSuccess', { imported: data.imported, merged: data.merged }));
        handleCloseImportModal();
        loadContacts();
      } else {
        toast.error(data.message || 'Import failed.');
      }
    } catch {
      toast.error(t('toastNetworkError'));
    } finally {
      setGoogleImporting(false);
    }
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput && !phoneInput) {
      toast.error(t('toastSpecifyEmailOrPhone'));
      return;
    }

    startTransition(async () => {
      try {
        const parsedTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
        const res = await fetchWithCsrf('/contacts', {
          method: 'POST',
          body: JSON.stringify({
            first_name: firstNameInput || null,
            last_name: lastNameInput || null,
            email: emailInput || null,
            phone: phoneInput || null,
            lifecycle_stage: stageInput,
            tags: parsedTags,
          }),
        });

        if (res.ok) {
          toast.success(t('toastContactCreated'));
          setCreateOpen(false);
          setFirstNameInput('');
          setLastNameInput('');
          setEmailInput('');
          setPhoneInput('');
          setStageInput('lead');
          setTagsInput('');
          loadContacts();
        } else {
          const data = await res.json();
          toast.error(data.message || t('toastSaveContactFailed'));
        }
      } catch {
        toast.error(t('toastSaveContactFailed'));
      }
    });
  };

  const handleCsvImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error(t('toastSelectCsv'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          toast.error(t('toastCsvEmpty'));
          return;
        }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
        const headerMap: { [key: string]: number } = {};
        header.forEach((h, idx) => {
          headerMap[h] = idx;
        });

        const parsed: ParsedContact[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const row = matches.map(val => val.trim().replace(/^["']|["']$/g, ''));

          if (row.length === 0) continue;

          const getValue = (key: string) => {
            const idx = headerMap[key];
            return idx !== undefined && idx < row.length ? row[idx] : '';
          };

          const first_name = getValue('first_name');
          const last_name = getValue('last_name');
          const email = getValue('email');
          const phone = getValue('phone');
          const lifecycle_stage = getValue('lifecycle_stage') || 'lead';
          const tagsRaw = getValue('tags');
          const tags = tagsRaw ? tagsRaw.split(';').flatMap(t => t.split(',')).map(t => t.trim()).filter(Boolean) : [];

          if (!email && !phone) continue;

          const isDuplicate = contacts.some(c => 
            (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
            (phone && c.phone && c.phone === phone)
          );

          parsed.push({
            id: `temp_${i}_${Date.now()}`,
            first_name,
            last_name,
            email,
            phone,
            lifecycle_stage,
            tags,
            isDuplicate,
            selected: true,
          });
        }

        if (parsed.length === 0) {
          toast.error(t('toastCsvNoValidRecords'));
          return;
        }

        setCsvParsedContacts(parsed);
        setCsvPreviewMode(true);
        toast.info(t('toastCsvParsedSuccess', { count: parsed.length }));
      } catch {
        toast.error(t('toastCsvParseFailed'));
      }
    };
    reader.readAsText(csvFile);
  };

  const handleConfirmBulkImport = () => {
    const selected = csvParsedContacts.filter(c => c.selected);
    if (selected.length === 0) {
      toast.error(t('toastSelectImportContacts'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/contacts/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            duplicate_strategy: duplicateMode,
            contacts: selected.map(c => ({
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
              lifecycle_stage: c.lifecycle_stage,
              tags: c.tags,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success(t('toastImportSuccess'), {
            description: `Imported: ${data.imported} records. Merged: ${data.merged} duplicate records.`,
          });
          handleCloseImportModal();
          loadContacts();
        } else {
          toast.error(data.message || t('toastImportSuccess'));
        }
      } catch {
        toast.error(t('toastBulkImportError'));
      }
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/contacts/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          toast.success(t('toastContactDeleted'));
          loadContacts();
        } else {
          toast.error(t('toastDeleteContactFailed'));
        }
      } catch {
        toast.error(t('toastNetworkError'));
      }
    });
  };

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto">
      
      {/* Search and Action Header Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 select-none">
        
        {/* Left Search / Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
            />
          </div>

          <DropdownSelect
            value={stageFilter}
            onChange={(val) => setStageFilter(val)}
            placeholder={t('allStages')}
            options={[
              { value: '', label: t('allStages') },
              { value: 'lead', label: t('lead') },
              { value: 'subscriber', label: t('subscriber') },
              { value: 'opportunity', label: t('opportunity') },
              { value: 'customer', label: t('customer') },
              { value: 'churned', label: t('churned') },
            ]}
            className="w-full sm:w-auto min-w-[145px]"
          />
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setIntegrationOpen(true);
              setActiveImportSource(null);
              fetchIntegrationStatuses();
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
          >
            <Upload className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('importContacts')}</span>
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t('addContact')}</span>
          </button>
        </div>
      </div>

      {/* Contacts List Grid Table */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader message={t('syncingContacts')} />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-row-fade shadow-3xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noContacts')}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">{t('noContactsDesc')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIntegrationOpen(true);
                setActiveImportSource(null);
                fetchIntegrationStatuses();
              }}
              className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
            >
              <Upload className="h-3.5 w-3.5 text-zinc-550" />
              <span>{t('importContacts')}</span>
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('addContact')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
          <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5">{t('contactDetailsHeader')}</th>
                    <th className="px-6 py-3.5">{t('lifecycle')}</th>
                    <th className="px-6 py-3.5">{t('tags')}</th>
                    <th className="px-6 py-3.5">{t('createdDate')}</th>
                    <th className="px-6 py-3.5 text-right">{tCommon('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-zinc-955 text-xs">
                            {contact.first_name || contact.last_name 
                              ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                              : t('unnamedContact')}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 font-mono">
                            {contact.email || contact.phone || t('noContactData')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase bg-zinc-100 border border-zinc-200 text-zinc-650 px-2 py-0.5 rounded-[4px] tracking-wide">
                          {contact.lifecycle_stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="bg-zinc-50 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-semibold"
                              >
                                #{tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-300 font-mono text-[10px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-[11px]">
                        {new Date(contact.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1 transition-all"
                          >
                            <span>{t('view')}</span>
                            <ExternalLink className="h-3 w-3 text-zinc-400" />
                          </Link>
                          <button
                            onClick={() => setDeleteTargetId(contact.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Manual Creation Dialog Modal Portal */}
      {createOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <form onSubmit={handleCreateContact} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('addContactHeader')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('firstName')}</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lastName')}</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('email')}</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phone')}</label>
                <input
                  type="text"
                  placeholder={t('phonePlaceholder')}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lifecycle')}</label>
                  <DropdownSelect
                    value={stageInput}
                    onChange={(val) => setStageInput(val)}
                    options={[
                      { value: 'lead', label: t('lead') },
                      { value: 'subscriber', label: t('subscriber') },
                      { value: 'opportunity', label: t('opportunity') },
                      { value: 'customer', label: t('customer') },
                      { value: 'churned', label: t('churned') },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('tagsCommaSeparated')}</label>
                  <input
                    type="text"
                    placeholder={t('tagsInputPlaceholder')}
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
              >
                {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('saveContact')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId !== null && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteTargetId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-650" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('confirmDeleteTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deletePermanentWarning')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetId !== null) {
                    handleDelete(deleteTargetId);
                    setDeleteTargetId(null);
                  }
                }}
                disabled={isPending}
                className="h-9 px-4 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer disabled:opacity-50"
              >
                {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unified Import Contacts Modal Portal */}
      {integrationOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={handleCloseImportModal}
        >
          <div 
            className={`bg-white border border-[#E8E8E6] rounded-xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left transition-all ${
              activeImportSource === 'csv' && csvPreviewMode ? 'max-w-2xl' : 'max-w-md'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Upload className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {activeImportSource === 'csv' && csvPreviewMode 
                      ? t('previewImport', { count: csvParsedContacts.filter(c => c.selected).length })
                      : activeImportSource === 'csv' ? t('csvFileImport')
                      : activeImportSource === 'google_sheets' ? t('importFromGoogleSheets')
                      : activeImportSource === 'hubspot' ? t('importFromHubSpot')
                      : activeImportSource === 'salesforce' ? t('importFromSalesforce')
                      : activeImportSource === 'zoho' ? t('importFromZoho')
                      : t('importContacts')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseImportModal}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: Selector Panel */}
            {activeImportSource === null && (
              <div className="pt-4 space-y-4">
                <div className="text-xs text-zinc-500 font-semibold mb-2">{t('selectImportSource')}</div>
                {integrationLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('checkingCredentials')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* CSV File Choice */}
                    <button
                      onClick={() => setActiveImportSource('csv')}
                      className="w-full flex items-center justify-between p-3.5 border border-[#E8E8E6] hover:border-zinc-950 rounded-lg text-left transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
                          <FileText className="h-4.5 w-4.5 text-zinc-650" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-955">{t('localCsvFile')}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold leading-tight mt-0.5">{t('localCsvFileDesc')}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{tCommon('upload')}</span>
                    </button>

                    {/* Google Sheets Choice */}
                    <button
                      onClick={() => setActiveImportSource('google_sheets')}
                      className="w-full flex items-center justify-between p-3.5 border border-[#E8E8E6] hover:border-zinc-950 rounded-lg text-left transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
                          <img src="/google_sheets.webp" alt="Google Sheets Logo" className="h-5 w-5 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-955">{t('googleSheets')}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold leading-tight mt-0.5">
                            {googleConnected ? t('connectedTo', { email: googleEmail }) : t('disconnected')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${googleConnected ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {googleConnected ? t('ready') : t('setup')}
                      </span>
                    </button>

                    {/* HubSpot Choice */}
                    <button
                      onClick={() => setActiveImportSource('hubspot')}
                      className="w-full flex items-center justify-between p-3.5 border border-[#E8E8E6] hover:border-zinc-950 rounded-lg text-left transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
                          <img src="/hubspot.png" alt="HubSpot Logo" className="h-5 w-5 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-955">{t('hubspotCrm')}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold leading-tight mt-0.5">
                            {crms.hubspot.connected ? t('connectedTo', { email: crms.hubspot.email || 'OAuth Active' }) : t('disconnected')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${crms.hubspot.connected ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {crms.hubspot.connected ? t('ready') : t('setup')}
                      </span>
                    </button>

                    {/* Salesforce Choice */}
                    <button
                      onClick={() => setActiveImportSource('salesforce')}
                      className="w-full flex items-center justify-between p-3.5 border border-[#E8E8E6] hover:border-zinc-950 rounded-lg text-left transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
                          <img src="/salesforce.webp" alt="Salesforce Logo" className="h-5 w-5 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-955">{t('salesforceCrm')}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold leading-tight mt-0.5">
                            {crms.salesforce.connected ? t('connectedTo', { email: crms.salesforce.email || 'OAuth Active' }) : t('disconnected')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${crms.salesforce.connected ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {crms.salesforce.connected ? t('ready') : t('setup')}
                      </span>
                    </button>

                    {/* Zoho CRM Choice */}
                    <button
                      onClick={() => setActiveImportSource('zoho')}
                      className="w-full flex items-center justify-between p-3.5 border border-[#E8E8E6] hover:border-zinc-950 rounded-lg text-left transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
                          <img src="/zoho_crm.png" alt="Zoho CRM Logo" className="h-5 w-5 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-955">{t('zohoCrm')}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold leading-tight mt-0.5">
                            {crms.zoho.connected ? t('connectedTo', { email: crms.zoho.email || 'OAuth Active' }) : t('disconnected')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${crms.zoho.connected ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {crms.zoho.connected ? t('ready') : t('setup')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2a: CSV Import Flow */}
            {activeImportSource === 'csv' && (
              <div className="pt-3.5 space-y-4">
                {!csvPreviewMode ? (
                  <form onSubmit={handleCsvImport} className="space-y-4">
                    <div className="border border-dashed border-[#E8E8E6] rounded-[8px] p-6 text-center hover:border-zinc-400 transition-colors relative cursor-pointer bg-[#FAFAFA]/50">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-zinc-400" />
                        <span className="text-xs font-semibold text-zinc-700">
                          {csvFile ? csvFile.name : t('selectCsvFile')}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">{t('supportedHeaders')}</span>
                      </div>
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => setActiveImportSource(null)}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('back')}
                      </button>
                      <button
                        type="submit"
                        disabled={isPending || !csvFile}
                        className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        {t('beginFileImport')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-[#6B6B6B]">
                      {t('parsedRecords')}
                    </div>

                    {csvParsedContacts.some(c => c.isDuplicate) && (
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-xs font-semibold">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('duplicatesStrategy')}</span>
                        <div className="flex items-center gap-4 select-none text-zinc-750">
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                            <input
                              type="radio"
                              name="duplicateStrategy"
                              checked={duplicateMode === 'merge'}
                              onChange={() => setDuplicateMode('merge')}
                              className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                            />
                            <span>{t('mergeData')}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                            <input
                              type="radio"
                              name="duplicateStrategy"
                              checked={duplicateMode === 'keep'}
                              onChange={() => setDuplicateMode('keep')}
                              className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                            />
                            <span>{t('keepDuplicates')}</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="border border-[#E8E8E6] rounded-[8px] overflow-hidden max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-zinc-550 border-collapse">
                        <thead className="bg-[#FAFAFA] border-b border-[#E8E8E6] sticky top-0 z-10 text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5 w-10">
                              <input
                                type="checkbox"
                                checked={csvParsedContacts.length > 0 && csvParsedContacts.every(c => c.selected)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setCsvParsedContacts(prev => prev.map(c => ({ ...c, selected: checked })));
                                }}
                                className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-2.5">{t('nameHeader')}</th>
                            <th className="px-4 py-2.5">{t('detailHeader')}</th>
                            <th className="px-4 py-2.5">{t('stageHeader')}</th>
                            <th className="px-4 py-2.5">{tCommon('status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E6]">
                          {csvParsedContacts.map((contact) => (
                            <tr key={contact.id} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={contact.selected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setCsvParsedContacts(prev => prev.map(c => c.id === contact.id ? { ...c, selected: checked } : c));
                                  }}
                                  className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-2.5 font-bold text-zinc-950">
                                {contact.first_name || contact.last_name ? `${contact.first_name} ${contact.last_name}` : t('unnamedContact')}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-zinc-400">
                                {contact.email || contact.phone}
                              </td>
                              <td className="px-4 py-2.5 uppercase font-bold text-[9px] text-zinc-550">{contact.lifecycle_stage}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-[4px] ${
                                  contact.isDuplicate ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                  {contact.isDuplicate ? t('duplicateLabel') : t('newLabel')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setCsvPreviewMode(false);
                          setCsvParsedContacts([]);
                        }}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {t('backToUpload')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseImportModal}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('cancel')}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleConfirmBulkImport}
                        className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[145px] cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('importSelected', { count: csvParsedContacts.filter(c => c.selected).length })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2b: Google Sheets Import Flow */}
            {activeImportSource === 'google_sheets' && (
              <div className="pt-3.5 space-y-4">
                {!googleConnected ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-zinc-550 mb-4">{t('googleSheetsNotConnected')}</p>
                    <div className="flex justify-between items-center bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px]">
                      <button
                        type="button"
                        onClick={() => setActiveImportSource(null)}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
                      >
                        {tCommon('back')}
                      </button>
                      <Link
                        href="/settings/integrations"
                        className="h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all flex items-center justify-center cursor-pointer"
                      >
                        {t('connectProvider', { provider: t('googleSheets') })}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleGoogleImportSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('spreadsheetLabel')}</label>
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
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('sheetTabLabel')}</label>
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
                      <div className="space-y-3.5 border-t border-[#E8E8E6] pt-3.5 animate-fade-in text-left">
                        <h4 className="text-[10px] text-zinc-955 font-bold uppercase tracking-wider border-b border-[#E8E8E6] pb-1">
                          {t('configureColumns')}
                        </h4>
                        
                        {(() => {
                          const colOptions = [
                            { value: '-1', label: t('doNotMap') },
                            ...sheetPreviewRows[0].map((col, idx) => ({
                              value: idx.toString(),
                              label: `Col ${String.fromCharCode(65 + idx)}: ${col.slice(0, 20)}${col.length > 20 ? '...' : ''}`
                            }))
                          ];

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('firstNameCol')}</label>
                                <DropdownSelect value={mappingFirstName} onChange={setMappingFirstName} options={colOptions} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lastNameCol')}</label>
                                <DropdownSelect value={mappingLastName} onChange={setMappingLastName} options={colOptions} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('emailCol')}</label>
                                <DropdownSelect value={mappingEmail} onChange={setMappingEmail} options={colOptions} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneCol')}</label>
                                <DropdownSelect value={mappingPhone} onChange={setMappingPhone} options={colOptions} />
                              </div>
                              <div className="space-y-1.5 col-span-2">
                                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('tagsCol')}</label>
                                <DropdownSelect value={mappingTags} onChange={setMappingTags} options={colOptions} />
                              </div>
                            </div>
                          );
                        })()}

                        <div className="p-3 bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-xs font-semibold">
                          <span className="text-[9px] font-black text-zinc-455 uppercase tracking-widest block mb-1">{t('duplicateStrategy')}</span>
                          <div className="flex items-center gap-4 text-zinc-750">
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                              <input
                                type="radio"
                                name="googleDupStrategy"
                                checked={googleDupStrategy === 'merge'}
                                onChange={() => setGoogleDupStrategy('merge')}
                                className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                              />
                              <span>{t('mergeData')}</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                              <input
                                type="radio"
                                name="googleDupStrategy"
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

                    <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => setActiveImportSource(null)}
                        className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                      >
                        {tCommon('back')}
                      </button>
                      <button
                        type="submit"
                        disabled={googleImporting || !selectedSpreadsheet || !selectedSheetTab}
                        className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        {googleImporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('syncAndImport')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Step 2c: CRM Import Flow (HubSpot, Salesforce, Zoho) */}
            {(activeImportSource === 'hubspot' || activeImportSource === 'salesforce' || activeImportSource === 'zoho') && (
              <div className="pt-3.5 space-y-4">
                {(() => {
                  const provider = activeImportSource;
                  const isConnected = crms[provider].connected;
                  if (!isConnected) {
                    return (
                      <div className="text-center py-6">
                        <p className="text-xs text-zinc-550 mb-4">{t('crmNotConnected', { provider: provider.toUpperCase() })}</p>
                        <div className="flex justify-between items-center bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px]">
                          <button
                            type="button"
                            onClick={() => setActiveImportSource(null)}
                            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
                          >
                            {tCommon('back')}
                          </button>
                          <Link
                            href="/settings/integrations"
                            className="h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all flex items-center justify-center cursor-pointer"
                          >
                            {t('connectProvider', { provider: provider.toUpperCase() })}
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 text-left">
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-550">
                          {t('crmAuthorizedDesc', { provider: provider.toUpperCase() })}
                        </p>
                      </div>

                      <div className="p-3 bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-xs font-semibold">
                        <span className="text-[9px] font-black text-zinc-455 uppercase tracking-widest block mb-1">{t('duplicateStrategy')}</span>
                        <div className="flex items-center gap-4 text-zinc-750">
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                            <input
                              type="radio"
                              name="crmDuplicateStrategy"
                              checked={crmDuplicateStrategy === 'merge'}
                              onChange={() => setCrmDuplicateStrategy('merge')}
                              className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                            />
                            <span>{t('mergeData')}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-black">
                            <input
                              type="radio"
                              name="crmDuplicateStrategy"
                              checked={crmDuplicateStrategy === 'keep'}
                              onChange={() => setCrmDuplicateStrategy('keep')}
                              className="h-3.5 w-3.5 text-black border-[#E8E8E6] focus:ring-black cursor-pointer bg-white"
                            />
                            <span>{t('keepDuplicates')}</span>
                          </label>
                        </div>
                      </div>

                      <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                        <button
                          type="button"
                          onClick={() => setActiveImportSource(null)}
                          className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                        >
                          {tCommon('back')}
                        </button>
                        <button
                          type="button"
                          disabled={syncingProvider !== null}
                          onClick={() => handleCrmSync(provider)}
                          className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] disabled:opacity-50 cursor-pointer"
                        >
                          {syncingProvider === provider ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                          ) : (
                            t('importNow')
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
