'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText, 
  Link2, 
  HelpCircle, 
  Database, 
  RefreshCw, 
  Search, 
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function CustomSelect({ options, value, onChange, placeholder = 'Select...', className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className={`relative inline-block text-left font-sans text-xs ${className || 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs h-9 px-3 bg-[#FAFAFA]/50 border border-[#E8E8E6] rounded-[6px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer font-medium"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-full rounded-md bg-white border border-[#E8E8E6] shadow-lg z-40 max-h-60 overflow-y-auto">
            <div className="p-1 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-xs font-medium ${
                    opt.value.toString() === value.toString()
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-700 hover:bg-[#FAFAFA]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  sources_count?: number;
  created_at: string;
}

interface KnowledgeSource {
  id: number;
  knowledge_base_id: number;
  source_type: 'file' | 'url' | 'qa' | 'sheet';
  source_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source_metadata: any;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  error_reason: string | null;
  created_at: string;
}

interface QueryMatch {
  chunk_id: number;
  source_name: string;
  source_type: string;
  content: string;
  similarity: number;
}

export default function KnowledgeBaseSettingsPage() {
  const t = useTranslations('Knowledge');
  const tCommon = useTranslations('Common');
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [activeKbId, setActiveKbId] = useState<number | null>(null);
  const [activeKb, setActiveKb] = useState<{ id: number; name: string; description: string | null; sources: KnowledgeSource[] } | null>(null);
  const [loadingBases, setLoadingBases] = useState(true);
  const [loadingKb, setLoadingKb] = useState(false);

  // Create KB Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [creatingKb, setCreatingKb] = useState(false);

  // Add Source Modal State
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [sourceType, setSourceType] = useState<'file' | 'url' | 'qa' | 'sheet'>('file');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceQuestion, setSourceQuestion] = useState('');
  const [sourceAnswer, setSourceAnswer] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingSource, setSubmittingSource] = useState(false);

  // Google Sheet Selector States
  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState('');
  const [spreadsheetSheets, setSpreadsheetSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Query Tester State
  const [queryText, setQueryText] = useState('');
  const [queryLimit, setQueryLimit] = useState(3);
  const [queryResults, setQueryResults] = useState<QueryMatch[]>([]);
  const [querying, setQuerying] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  // Rename Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameKbName, setRenameKbName] = useState('');
  const [renameKbDesc, setRenameKbDesc] = useState('');
  const [renamingKb, setRenamingKb] = useState(false);

  // Delete KB confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [kbToDelete, setKbToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingKb, setDeletingKb] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBases();
    checkGoogleConnection();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowAddSourceModal(false);
        setShowRenameModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeKbId) {
      fetchKbDetails(activeKbId);
    } else {
      setActiveKb(null);
    }
  }, [activeKbId]);

  // Load Google Sheet list if selected
  useEffect(() => {
    if (sourceType === 'sheet' && googleConnected && spreadsheets.length === 0) {
      fetchSpreadsheets();
    }
  }, [sourceType, googleConnected]);

  // Load Tabs when Spreadsheet changes
  useEffect(() => {
    if (selectedSpreadsheetId) {
      fetchSheets(selectedSpreadsheetId);
    } else {
      setSpreadsheetSheets([]);
      setSelectedSheetName('');
    }
  }, [selectedSpreadsheetId]);

  const fetchBases = async () => {
    try {
      setLoadingBases(true);
      const res = await fetchWithCsrf('/knowledge-bases');
      if (res.ok) {
        const data = await res.json();
        setBases(data);
        if (data.length > 0 && !activeKbId) {
          setActiveKbId(data[0].id);
        }
      }
    } catch (err) {
      toast.error(t('details.loadFailed'));
    } finally {
      setLoadingBases(false);
    }
  };

  const fetchKbDetails = async (id: number) => {
    try {
      setLoadingKb(true);
      const res = await fetchWithCsrf(`/knowledge-bases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveKb(data);
      }
    } catch (err) {
      toast.error(t('details.loadDetailsFailed'));
    } finally {
      setLoadingKb(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const res = await fetchWithCsrf('/integrations/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.configured && data.email);
      }
    } catch (err) {
      setGoogleConnected(false);
    }
  };

  const fetchSpreadsheets = async () => {
    try {
      setLoadingSpreadsheets(true);
      const res = await fetchWithCsrf('/integrations/google/spreadsheets');
      if (res.ok) {
        const data = await res.json();
        setSpreadsheets(data.spreadsheets || []);
      }
    } catch (err) {
      toast.error(t('details.retrieveSpreadsheetsFailed') || 'Failed to retrieve spreadsheets from Google Drive.');
    } finally {
      setLoadingSpreadsheets(false);
    }
  };

  const fetchSheets = async (spreadsheetId: string) => {
    try {
      setLoadingSheets(true);
      const res = await fetchWithCsrf(`/integrations/google/spreadsheets/${spreadsheetId}/sheets`);
      if (res.ok) {
        const data = await res.json();
        setSpreadsheetSheets(data.sheets || []);
        if (data.sheets && data.sheets.length > 0) {
          setSelectedSheetName(data.sheets[0]);
        }
      }
    } catch (err) {
      toast.error(t('details.loadTabsFailed') || 'Failed to load spreadsheet tabs.');
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbName.trim()) return;

    try {
      setCreatingKb(true);
      const res = await fetchWithCsrf('/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: kbName, description: kbDesc }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(t('details.createSuccess'));
        setKbName('');
        setKbDesc('');
        setShowCreateModal(false);
        fetchBases();
        setActiveKbId(data.id);
      } else {
        toast.error(t('details.createFailed'));
      }
    } catch (err) {
      toast.error(t('details.createFailed'));
    } finally {
      setCreatingKb(false);
    }
  };

  const handleRenameClick = () => {
    if (!activeKb) return;
    setRenameKbName(activeKb.name);
    setRenameKbDesc(activeKb.description || '');
    setShowRenameModal(true);
  };

  const handleRenameKbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameKbName.trim() || !activeKbId) return;

    try {
      setRenamingKb(true);
      const res = await fetchWithCsrf(`/knowledge-bases/${activeKbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameKbName, description: renameKbDesc }),
      });

      if (res.ok) {
        toast.success(t('details.updateSuccess'));
        setShowRenameModal(false);
        fetchBases();
        if (activeKb) {
          setActiveKb({
            ...activeKb,
            name: renameKbName,
            description: renameKbDesc
          });
        }
      } else {
        toast.error(t('details.updateFailed'));
      }
    } catch (err) {
      toast.error(t('details.updateFailed'));
    } finally {
      setRenamingKb(false);
    }
  };

  const handleDeleteKbClick = (id: number, name: string) => {
    setKbToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!kbToDelete) return;
    try {
      setDeletingKb(true);
      const res = await fetchWithCsrf(`/knowledge-bases/${kbToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('details.deleteSuccess'));
        fetchBases();
        if (activeKbId === kbToDelete.id) {
          setActiveKbId(null);
          setActiveKb(null);
        }
        setShowDeleteModal(false);
        setKbToDelete(null);
      } else {
        toast.error(t('details.deleteFailed'));
      }
    } catch (err) {
      toast.error(t('details.deleteFailed'));
    } finally {
      setDeletingKb(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKbId) return;

    const formData = new FormData();
    formData.append('source_type', sourceType);
    if (sourceName.trim()) {
      formData.append('source_name', sourceName);
    }

    if (sourceType === 'file') {
      if (!sourceFile) {
        toast.error(t('details.uploadFileError'));
        return;
      }
      formData.append('file', sourceFile);
    } else if (sourceType === 'url') {
      if (!sourceUrl.trim()) {
        toast.error(t('details.enterUrlError'));
        return;
      }
      formData.append('url', sourceUrl);
    } else if (sourceType === 'qa') {
      if (!sourceQuestion.trim() || !sourceAnswer.trim()) {
        toast.error(t('details.enterQaError'));
        return;
      }
      formData.append('question', sourceQuestion);
      formData.append('answer', sourceAnswer);
    } else if (sourceType === 'sheet') {
      if (!selectedSpreadsheetId || !selectedSheetName) {
        toast.error(t('details.selectSheetError'));
        return;
      }
      const sheet = spreadsheets.find(s => s.id === selectedSpreadsheetId);
      formData.append('spreadsheet_id', selectedSpreadsheetId);
      formData.append('spreadsheet_name', sheet ? sheet.name : (t('googleSheets') || 'Google Sheet'));
      formData.append('sheet_name', selectedSheetName);
    }

    try {
      setSubmittingSource(true);
      const res = await fetchWithCsrf(`/knowledge-bases/${activeKbId}/sources`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success(t('details.addSourceSuccess'));
        setSourceName('');
        setSourceUrl('');
        setSourceQuestion('');
        setSourceAnswer('');
        setSourceFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSelectedSpreadsheetId('');
        setSelectedSheetName('');
        setShowAddSourceModal(false);
        fetchKbDetails(activeKbId);
      } else {
        const errData = await res.json();
        toast.error(errData.message || t('details.addSourceFailed'));
      }
    } catch (err) {
      toast.error(t('details.addSourceFailed'));
    } finally {
      setSubmittingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm(t('confirmDeleteSource') || 'Are you sure you want to remove this source? All corresponding embeddings will be deleted.')) {
      return;
    }

    try {
      const res = await fetchWithCsrf(`/knowledge-bases/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('details.deleteSourceSuccess'));
        if (activeKbId) fetchKbDetails(activeKbId);
      } else {
        toast.error(t('details.deleteSourceFailed'));
      }
    } catch (err) {
      toast.error(t('details.deleteSourceFailed'));
    }
  };

  const handleReindexSource = async (sourceId: number) => {
    try {
      const res = await fetchWithCsrf(`/knowledge-bases/sources/${sourceId}/reindex`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success(t('details.reindexSuccess'));
        if (activeKbId) fetchKbDetails(activeKbId);
      } else {
        toast.error(t('details.reindexFailed'));
      }
    } catch (err) {
      toast.error(t('details.reindexFailed'));
    }
  };

  const handleQueryTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKbId || !queryText.trim()) return;

    try {
      setQuerying(true);
      const res = await fetchWithCsrf(`/knowledge-bases/${activeKbId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, limit: queryLimit }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueryResults(data.matches || []);
        setHasQueried(true);
      } else {
        toast.error(t('details.searchFailed'));
      }
    } catch (err) {
      toast.error(t('details.searchFailed'));
    } finally {
      setQuerying(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'url': return <Link2 className="h-4 w-4 text-emerald-500" />;
      case 'qa': return <HelpCircle className="h-4 w-4 text-purple-500" />;
      case 'sheet': return <Database className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#E8FDE8] text-[#25D366] border border-[#25D366]/20 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
            {t('statusIndexed') || 'Indexed'}
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 select-none">
            <RefreshCw className="h-2 w-2 animate-spin text-amber-500" />
            {t('statusIndexing') || 'Indexing'}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-50 text-red-600 border border-red-200 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {t('statusFailed') || 'Failed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-zinc-100 text-zinc-600 border border-zinc-200 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            {t('statusPending') || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex overflow-hidden bg-white">
      
      {/* LEFT PANEL: KNOWLEDGE BASE SELECTOR */}
      <div className="w-80 border-r border-[#E8E8E6] flex flex-col h-full bg-white shrink-0">
        <div className="h-16 px-6 border-b border-[#E8E8E6] flex justify-between items-center bg-white select-none shrink-0">
          <div>
            <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('title')}</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">{t('vectorRagGrounding') || 'Vector RAG grounding'}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-7 w-7 rounded-[6px] bg-[#0A0A0A] hover:bg-zinc-900 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
            title={t('createKb') || 'Create Knowledge Base'}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loadingBases ? (
            <div className="flex flex-col items-center justify-center p-8 text-zinc-400 gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-[10px] font-medium">{t('loadingDirectories') || 'Loading directories...'}</span>
            </div>
          ) : bases.length === 0 ? (
            <div className="text-center p-8 text-zinc-400 flex flex-col items-center justify-center gap-2">
              <BookOpen className="h-8 w-8 stroke-1 text-zinc-300" />
              <p className="text-xs font-bold">{t('noBasesTitle')}</p>
              <p className="text-[10px] text-zinc-400">{t('createOneToGetStarted') || 'Create one to get started'}</p>
            </div>
          ) : (
            bases.map(kb => (
              <button
                key={kb.id}
                onClick={() => setActiveKbId(kb.id)}
                className={`w-full text-left px-4 py-3 rounded-[6px] transition-all flex flex-col gap-1 cursor-pointer relative ${
                  activeKbId === kb.id 
                    ? 'bg-[#FAFAFA] text-black font-extrabold shadow-3xs pl-5.5' 
                    : 'text-[#6B6B6B] hover:bg-[#FAFAFA]/70 hover:text-black font-bold'
                }`}
              >
                {activeKbId === kb.id && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#4AE54A] rounded-r-[2px] shadow-[0_0_6px_rgba(74,229,74,0.6)]" />
                )}
                <div className="flex items-center justify-between min-w-0">
                  <span className="text-xs truncate pr-2">{kb.name}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#F0F0EE] text-[#6B6B6B] border border-[#E8E8E6]">
                    {kb.sources_count ?? 0}
                  </span>
                </div>
                {kb.description && (
                  <p className="text-[10px] text-zinc-400 line-clamp-1 leading-relaxed font-medium">{kb.description}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: SELECTED WORKSPACE */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        {loadingKb && !activeKb ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400 bg-white">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-xs font-medium">{t('loadingWorkspace') || 'Loading workspace...'}</span>
          </div>
        ) : activeKb ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header info bar */}
            <div className="h-16 flex items-center justify-between select-none px-8 border-b border-[#E8E8E6] bg-white shrink-0">
              <div>
                <h3 className="text-[11px] font-bold text-black uppercase tracking-wider">{t('groundingResources')}</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">{t('connectedSources', { count: activeKb.sources.length })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowAddSourceModal(true)}
                  className="bg-[#0A0A0A] hover:bg-zinc-900 text-white text-xs font-bold h-9 px-4 rounded-[6px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> {t('addSourceBtn')}
                </Button>
                <button
                  onClick={() => handleRenameClick()}
                  className="h-7.5 w-7.5 rounded-[6px] border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-650 flex items-center justify-center transition-all cursor-pointer"
                  title={t('renameKb') || 'Rename Knowledge Base'}
                >
                  <svg className="h-3.5 w-3.5 text-zinc-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteKbClick(activeKb.id, activeKb.name)}
                  className="h-7.5 w-7.5 rounded-[6px] border border-red-100 bg-red-50/10 hover:bg-red-50 text-red-500 flex items-center justify-center transition-all cursor-pointer"
                  title={t('deleteConfirm') || 'Delete Knowledge Base'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content area: Table & Query test split */}
            <div className="flex-1 overflow-y-auto p-0 bg-white">
              
              <div className="px-8 py-6">
                  <div className="border border-[#E8E8E6] rounded-[8px] overflow-hidden bg-white shadow-3xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase bg-[#FAFAFA]/50">
                            <th className="px-5 py-3.5">{t('sourceName')}</th>
                            <th className="px-5 py-3.5 w-32">{t('typeLabel')}</th>
                            <th className="px-5 py-3.5 w-32">{t('statusLabel')}</th>
                            <th className="px-5 py-3.5 w-28 text-right">{t('actionsLabel')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E6] text-zinc-750">
                          {activeKb.sources.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-10 text-center text-zinc-400 text-xs font-semibold">
                                {t('noSources')}
                              </td>
                            </tr>
                          ) : (
                            activeKb.sources.map(source => (
                              <tr key={source.id} className="hover:bg-[#FAFAFA]/20 text-xs">
                                <td className="px-5 py-3.5 min-w-[200px]">
                                  <div className="flex items-start gap-2.5">
                                    <span className="mt-0.5 shrink-0 text-zinc-400">{getSourceIcon(source.source_type)}</span>
                                    <div className="min-w-0">
                                      <p className="font-bold text-black truncate max-w-md">{source.source_name}</p>
                                      {source.source_type === 'url' && (
                                        <p className="text-[10px] text-zinc-400 truncate max-w-md mt-0.5">{source.source_metadata.url}</p>
                                      )}
                                      {source.source_type === 'sheet' && (
                                        <p className="text-[10px] text-zinc-400 truncate max-w-md mt-0.5">{t('spreadsheetLabel') || 'Spreadsheet:'} {source.source_metadata.spreadsheet_name}</p>
                                      )}
                                      {source.status === 'failed' && source.error_reason && (
                                        <p className="text-[9px] text-red-500 mt-1 flex items-start gap-1 font-medium bg-red-50/30 p-1.5 rounded-[4px] border border-red-100">
                                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                          {source.error_reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-zinc-500">
                                  {source.source_type === 'qa' 
                                    ? t('qaPair') 
                                    : source.source_type === 'file' 
                                      ? t('fileUpload') 
                                      : source.source_type === 'url' 
                                        ? t('websiteUrl') 
                                        : source.source_type === 'sheet' 
                                          ? t('googleSheets') 
                                          : source.source_type}
                                </td>
                                <td className="px-5 py-3.5">
                                  {getStatusBadge(source.status)}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleReindexSource(source.id)}
                                      disabled={source.status === 'indexing'}
                                      className="p-1.5 hover:bg-zinc-100 hover:text-black text-zinc-400 rounded-[6px] transition-all cursor-pointer disabled:opacity-50"
                                      title={t('reindexSource') || 'Re-index Source'}
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${source.status === 'indexing' ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSource(source.id)}
                                      className="p-1.5 hover:bg-red-50 hover:text-red-500 text-zinc-400 rounded-[6px] transition-all cursor-pointer"
                                      title={t('removeSource') || 'Remove Source'}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              {/* Sandbox query tool */}
              <div className="px-8 py-8 bg-[#FAFAFA]/40 space-y-5 border-t border-[#E8E8E6]">
                <div>
                  <h3 className="text-[11px] font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#4AE54A] fill-[#4AE54A]/10" />
                    {t('sandboxTitle')}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-semibold">{t('sandboxDesc')}</p>
                </div>

                <form onSubmit={handleQueryTester} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={t('sandboxSearchPlaceholder') || 'Type query...'}
                      value={queryText}
                      onChange={e => setQueryText(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 text-xs border border-[#E8E8E6] rounded-[6px] focus:outline-none focus:border-zinc-950 bg-[#FAFAFA]/30 placeholder:text-zinc-400 font-medium"
                    />
                  </div>
                  <CustomSelect
                    options={[
                      { value: '1', label: t('top1Match') || 'Top 1 Match' },
                      { value: '3', label: t('top3Matches') || 'Top 3 Matches' },
                      { value: '5', label: t('top5Matches') || 'Top 5 Matches' }
                    ]}
                    value={queryLimit.toString()}
                    onChange={val => setQueryLimit(Number(val))}
                    className="w-36 shrink-0"
                  />
                  <Button
                    type="submit"
                    disabled={querying || !queryText.trim()}
                    className="bg-zinc-955 hover:bg-zinc-900 text-white text-xs font-semibold h-9 px-4 rounded-[6px] shadow-3xs transition-all cursor-pointer shrink-0"
                  >
                    {querying ? (t('searching') || 'Searching...') : t('queryVectors')}
                  </Button>
                </form>

                {hasQueried && (
                  <div className="space-y-4 pt-4 border-t border-[#E8E8E6] animate-fade-in">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t('searchResults')}</h4>
                    {queryResults.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">{t('noMatches')}</p>
                    ) : (
                      <div className="divide-y divide-[#E8E8E6]">
                        {queryResults.map((result, idx) => (
                          <div key={idx} className="py-5 flex flex-col gap-2 relative first:pt-0 last:pb-0">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-[#6B6B6B] px-1.5 py-0.5 rounded bg-[#F0F0EE] border border-[#E8E8E6]">
                                  #{idx + 1}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-700 flex items-center gap-1">
                                  {getSourceIcon(result.source_type)}
                                  {result.source_name}
                                </span>
                              </div>
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                result.similarity > 0.8 
                                  ? 'bg-[#E8FDE8] text-[#25D366] border-[#25D366]/20' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
                                {t('similarityScore', { score: (result.similarity * 100).toFixed(2) })}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-zinc-800 font-semibold whitespace-pre-wrap pl-1">{result.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-white select-none">
            <BookOpen className="h-12 w-12 mb-3 stroke-1 text-zinc-300" />
            <h2 className="text-sm font-bold text-zinc-700 mb-1">{t('ragCenterTitle')}</h2>
            <p className="text-xs text-zinc-400">{t('ragCenterDesc')}</p>
          </div>
        )}
      </div>
      {/* Modals */}
      {mounted && showCreateModal && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="absolute inset-0" onClick={() => setShowCreateModal(false)} />
          <form onSubmit={handleCreateKb} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-[10000] animate-modal-box text-left flex flex-col select-none">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('createKb')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('kbName')}</label>
                <input
                  type="text"
                  placeholder={t('kbNamePlaceholder') || 'e.g. Sales Playbook, Internal Q&A Guidelines'}
                  value={kbName}
                  onChange={e => setKbName(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{tCommon('description') || 'Description'}</label>
                <textarea
                  placeholder={t('kbDescPlaceholder') || 'Summarize the nature of this document grouping...'}
                  value={kbDesc}
                  onChange={e => setKbDesc(e.target.value)}
                  className="w-full min-h-[70px] max-h-[140px] resize-none px-3 py-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={creatingKb || !kbName.trim()}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer"
              >
                {creatingKb ? (t('creating') || 'Creating...') : (t('createBase') || 'Create Base')}
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {mounted && showAddSourceModal && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="absolute inset-0" onClick={() => setShowAddSourceModal(false)} />
          <form onSubmit={handleAddSource} className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-[10000] animate-modal-box text-left flex flex-col select-none">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-black uppercase tracking-wider">{t('addGroundingSource') || 'Add Grounding Source'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSourceModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Source Type selectors */}
            <div className="flex bg-[#FAFAFA] p-1 gap-1 rounded-[8px] mt-4 mb-4 border border-[#E8E8E6]/60">
              {([
                { type: 'file', label: t('fileUpload') || 'File Upload', icon: <FileText className="h-3.5 w-3.5" /> },
                { type: 'url', label: t('websiteUrl') || 'Website URL', icon: <Link2 className="h-3.5 w-3.5" /> },
                { type: 'qa', label: t('qaPair') || 'Q&A Pair', icon: <HelpCircle className="h-3.5 w-3.5" /> },
                { type: 'sheet', label: t('googleSheets') || 'Google Sheets', icon: <Database className="h-3.5 w-3.5" /> },
              ] as const).map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setSourceType(opt.type);
                    setSourceName('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-[11px] font-bold cursor-pointer transition-all ${
                    sourceType === opt.type 
                      ? 'bg-white border border-[#E8E8E6] text-black shadow-3xs' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-1.5 overflow-y-auto max-h-[50vh] pr-1">
              {/* Optional custom source name override */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('customSourceName') || 'Custom Source Name (Optional)'}</label>
                <input
                  type="text"
                  placeholder={t('sourceNamePlaceholder') || 'Defaults to filename, URL host, or sheet title if blank'}
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="h-px bg-[#E8E8E6]" />

              {/* Dynamic form inputs based on sourceType */}
              {sourceType === 'file' && (
                <div className="space-y-3">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('uploadDocumentFile') || 'Upload Document File'}</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#E8E8E6] hover:border-zinc-500 rounded-[8px] p-8 text-center cursor-pointer bg-zinc-50/5 hover:bg-zinc-50/30 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <FileText className="h-10 w-10 text-zinc-300 stroke-1" />
                    <span className="text-xs font-bold text-zinc-800">
                      {sourceFile ? sourceFile.name : (t('selectOrDropFile') || 'Select or drop file here')}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {sourceFile ? `${(sourceFile.size / 1024).toFixed(1)} KB` : (t('fileUploadRules') || 'Supports CSV, JSON, TXT, and PDF files up to 10MB')}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setSourceFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept=".txt,.csv,.json,.pdf"
                  />
                </div>
              )}

              {sourceType === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('websiteLinkUrl') || 'Website Link URL'}</label>
                  <input
                    type="url"
                    placeholder="https://docs.company.com/faq-list"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  <p className="text-[9px] text-zinc-400 leading-normal">{t('urlExplanation') || 'System fetches page content, strips HTML markup tags, and stores vector chunk segments of the text content.'}</p>
                </div>
              )}

              {sourceType === 'qa' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('question') || 'Question'}</label>
                    <textarea
                      placeholder={t('questionPlaceholder') || 'Type query trigger or question...'}
                      value={sourceQuestion}
                      onChange={e => setSourceQuestion(e.target.value)}
                      required
                      className="w-full min-h-[50px] max-h-[100px] resize-none px-3 py-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('answerContentDetails') || 'Answer / Content Details'}</label>
                    <textarea
                      placeholder={t('answerPlaceholder') || 'Type corresponding response context to return...'}
                      value={sourceAnswer}
                      onChange={e => setSourceAnswer(e.target.value)}
                      required
                      className="w-full min-h-[70px] max-h-[140px] resize-none px-3 py-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                </div>
              )}

              {sourceType === 'sheet' && (
                <div className="space-y-4">
                  {!googleConnected ? (
                    <div className="p-4 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-900 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{t('googleSheetConnectionRequired') || 'Google Sheet Connection Required'}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        {t('sheetConnectionRequiredDesc') || 'To add spreadsheet sources, you must first link your workspace to your Google Drive account under Workspace Integrations.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('selectConnectedSpreadsheet') || 'Select Connected Google Spreadsheet'}</label>
                        {loadingSpreadsheets ? (
                          <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>{t('retrievingSpreadsheetsList') || 'Retrieving spreadsheets list...'}</span>
                          </div>
                        ) : spreadsheets.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic py-2">{t('noSpreadsheetsFound') || 'No spreadsheets found in your Google Drive.'}</p>
                        ) : (
                          <CustomSelect
                            options={spreadsheets.map(s => ({ value: s.id, label: s.name }))}
                            value={selectedSpreadsheetId}
                            onChange={val => setSelectedSpreadsheetId(val)}
                            placeholder={t('selectSpreadsheetFile') || 'Select spreadsheet file...'}
                          />
                        )}
                      </div>

                      {selectedSpreadsheetId && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('selectSheetTab') || 'Select Sheet Tab'}</label>
                          {loadingSheets ? (
                            <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>{t('listingSheetTabs') || 'Listing sheet tabs...'}</span>
                            </div>
                          ) : spreadsheetSheets.length === 0 ? (
                             <p className="text-xs text-zinc-500 italic py-2">{t('noTabPagesFound') || 'No tab pages found inside this file.'}</p>
                          ) : (
                            <CustomSelect
                              options={spreadsheetSheets.map(tab => ({ value: tab, label: tab }))}
                              value={selectedSheetName}
                              onChange={val => setSelectedSheetName(val)}
                              placeholder={t('selectSheetTabPlaceholder') || 'Select sheet tab...'}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddSourceModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={submittingSource || (sourceType === 'sheet' && !googleConnected)}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer"
              >
                {submittingSource ? (t('indexing') || 'Indexing...') : (t('indexSource') || 'Index Source')}
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {mounted && showRenameModal && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="absolute inset-0" onClick={() => setShowRenameModal(false)} />
          <form onSubmit={handleRenameKbSubmit} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-[10000] animate-modal-box text-left flex flex-col select-none">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-black uppercase tracking-wider">{t('renameKb') || 'Rename Knowledge Base'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('kbName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('renameKbPlaceholder') || 'e.g. User Manuals & FAQs'}
                  value={renameKbName}
                  onChange={e => setRenameKbName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{tCommon('description') || 'Description'}</label>
                <textarea
                  placeholder={t('renameKbDescPlaceholder') || 'Explain what grounding documents this base contains...'}
                  value={renameKbDesc}
                  onChange={e => setRenameKbDesc(e.target.value)}
                  className="w-full min-h-[70px] max-h-[140px] resize-none px-3 py-2 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowRenameModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={renamingKb || !renameKbName.trim()}
                className="bg-black text-white hover:bg-neutral-800 h-9 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer"
              >
                {renamingKb ? (t('saving') || 'Saving...') : (t('saveChanges') || 'Save Changes')}
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {mounted && showDeleteModal && kbToDelete && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="absolute inset-0" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-[10000] animate-modal-box text-left flex flex-col select-none">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('deleteConfirm')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteKbConfirmationPart1') || 'Are you sure you want to permanently delete the knowledge base'} <strong className="text-black font-extrabold">"{kbToDelete.name}"</strong>{t('deleteKbConfirmationPart2') || '? This will stop all active grounding automations and vector indexing for this document directory.'}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingKb}
                className="bg-red-650 hover:bg-red-750 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer h-9 px-4 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingKb && <RefreshCw className="h-3 w-3 animate-spin text-white" />}
                <span>{t('deleteBase') || 'Delete Base'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
