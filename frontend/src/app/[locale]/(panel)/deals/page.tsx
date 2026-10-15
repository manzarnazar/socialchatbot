'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { 
  Plus, 
  Trash2, 
  X, 
  RefreshCw, 
  User, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Lock,
  Sparkles,
  Workflow,
  Coins,
  Check
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
}

interface Deal {
  id: number;
  title: string;
  amount: string;
  stage: string;
  pipeline_stage_order: number;
  contact: Contact | null;
}

interface PipelineStage {
  key: string;
  name: string;
  color: string;
}

const FALLBACK_STAGES: PipelineStage[] = [
  { key: 'lead', name: 'Lead Inbox', color: 'bg-zinc-100 text-zinc-700' },
  { key: 'qualified', name: 'Qualified', color: 'bg-blue-50 text-blue-800' },
  { key: 'proposal', name: 'Proposal', color: 'bg-purple-50 text-purple-800' },
  { key: 'negotiation', name: 'Negotiation', color: 'bg-amber-50 text-amber-800' },
  { key: 'won', name: 'Closed Won', color: 'bg-emerald-50 text-emerald-800' },
  { key: 'lost', name: 'Closed Lost', color: 'bg-red-50 text-red-800' },
];

export default function DealsPipelinePage() {
  const t = useTranslations('Deals');
  const tPlanLock = useTranslations('PlanLock');
  const tPlanCard = useTranslations('PlanCard');
  const tCommon = useTranslations('Common');

  const [mounted, setMounted] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>(FALLBACK_STAGES);
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [dealStage, setDealStage] = useState('lead');

  // Custom Pipeline Stage Creator States
  const [createStageOpen, setCreateStageOpen] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageColor, setStageColor] = useState('#71717A');
  
  // Custom Delete Confirm State
  const [deleteDealId, setDeleteDealId] = useState<number | null>(null);

  // Drag and Drop Visual States
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);

  // Linked Contact lookup
  const [searchContact, setSearchContact] = useState('');
  const [foundContacts, setFoundContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');

  const loadPipeline = async () => {
    try {
      const res = await fetchWithCsrf('/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages);
        }
        if (data.currency) {
          setCurrencySymbol(data.currency.symbol || '$');
          setCurrencyCode(data.currency.code || 'USD');
        }
        setGated(false);
      } else if (res.status === 403) {
        setGated(true);
      } else {
        toast.error(t('toastLoadDealsFailed'));
      }
    } catch {
      toast.error(t('toastLoadDealsNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  // Search contacts for linking
  useEffect(() => {
    if (searchContact.trim().length >= 2) {
      const fetchMatched = async () => {
        try {
          const res = await fetchWithCsrf(`/contacts?search=${searchContact}`);
          if (res.ok) {
            const data = await res.json();
            setFoundContacts(data.contacts || []);
          }
        } catch {}
      };
      fetchMatched();
    } else {
      setFoundContacts([]);
    }
  }, [searchContact]);

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim()) {
      toast.error(t('toastSpecifyDealTitle'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/deals', {
          method: 'POST',
          body: JSON.stringify({
            title: dealTitle.trim(),
            amount: parseFloat(dealAmount) || 0,
            stage: dealStage,
            contact_id: selectedContact?.id || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(t('toastCreateDealSuccess'));
          setCreateOpen(false);
          setDealTitle('');
          setDealAmount('');
          setSelectedContact(null);
          setSearchContact('');
          loadPipeline(); // Reload
        } else {
          toast.error(t('toastCreateDealFailed'));
        }
      } catch {
        toast.error(t('toastNetworkError'));
      }
    });
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      toast.error(t('toastSpecifyStageName'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf('/deals/stages', {
          method: 'POST',
          body: JSON.stringify({
            name: stageName.trim(),
            color: stageColor,
          }),
        });

        if (res.ok) {
          toast.success(t('toastCreateStageSuccess'));
          setCreateStageOpen(false);
          setStageName('');
          setStageColor('#71717A');
          loadPipeline();
        } else {
          toast.error(t('toastCreateStageFailed'));
        }
      } catch {
        toast.error(t('toastNetworkError'));
      }
    });
  };

  const handleDeleteDeal = (id: number) => {
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/deals/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success(t('toastDeleteDealSuccess'));
          setDeleteDealId(null);
          loadPipeline();
        } else {
          toast.error(t('toastDeleteDealFailed'));
        }
      } catch {
        toast.error(t('toastNetworkError'));
      }
    });
  };

  // Drag and Drop Logic Handlers
  const handleDragStart = (e: React.DragEvent, dealId: number) => {
    e.dataTransfer.setData('dealId', dealId.toString());
    setActiveDragId(dealId);
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
    setDraggedOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedOverStage !== stageId) {
      setDraggedOverStage(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setActiveDragId(null);
    setDraggedOverStage(null);

    const dealIdStr = e.dataTransfer.getData('dealId');
    if (!dealIdStr) return;

    const dealId = parseInt(dealIdStr);
    const targetDeal = deals.find(d => d.id === dealId);
    if (!targetDeal || targetDeal.stage === targetStage) return;

    // Local state optimistic update for smooth UI transitions
    const originalDeals = [...deals];
    const updated = deals.map(d => {
      if (d.id === dealId) {
        return { ...d, stage: targetStage };
      }
      return d;
    });
    setDeals(updated);

    try {
      const res = await fetchWithCsrf('/deals/stages', {
        method: 'PUT',
        body: JSON.stringify({
          deal_id: dealId,
          stage: targetStage,
          pipeline_stage_order: 1, // Appends sequence positioning
        }),
      });

      if (!res.ok) {
        throw new Error();
      }
    } catch {
      toast.error(t('toastSavePositionFailed'));
      setDeals(originalDeals); // Revert UI
    }
  };

  // Sum value calculations
  const getStageMetrics = (stageId: string) => {
    const matched = deals.filter(d => d.stage === stageId);
    const sum = matched.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    return {
      count: matched.length,
      amount: sum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    };
  };

  if (loading) {
    return <SimpleLoader message={t('syncingDeals')} />;
  }

  if (gated) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 sm:p-16 bg-white select-none animate-fade-in font-sans text-center">
        
        {/* Page Layout Center Container */}
        <div className="max-w-lg w-full mx-auto flex flex-col items-center space-y-6">
          
          {/* 1. Simple Icon */}
          <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 flex items-center justify-center shadow-3xs">
            <TrendingUp className="h-5 w-5 text-zinc-800" />
          </div>

          {/* 2. Title & 2-Line Description */}
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-950">
              {t('lockedHeroTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium max-w-md mx-auto line-clamp-2">
              {t('lockedHeroSubtitle')}
            </p>
          </div>

          {/* 3. Capabilities Vertical List */}
          <div className="w-full max-w-md border border-[#E8E8E6] bg-white rounded-xl divide-y divide-[#E8E8E6] text-left shadow-3xs overflow-hidden">
            
            <div className="p-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors">
              <div className="h-7 w-7 rounded-lg bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center text-zinc-800 shadow-3xs shrink-0 mt-0.5">
                <Workflow className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-950">{t('lockedFeature1Title')}</h4>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-normal">{t('lockedFeature1Desc')}</p>
              </div>
            </div>

            <div className="p-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors">
              <div className="h-7 w-7 rounded-lg bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center text-zinc-800 shadow-3xs shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-950">{t('lockedFeature2Title')}</h4>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-normal">{t('lockedFeature2Desc')}</p>
              </div>
            </div>

            <div className="p-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors">
              <div className="h-7 w-7 rounded-lg bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center text-zinc-800 shadow-3xs shrink-0 mt-0.5">
                <Coins className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-950">{t('lockedFeature3Title')}</h4>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-normal">{t('lockedFeature3Desc')}</p>
              </div>
            </div>

            <div className="p-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors">
              <div className="h-7 w-7 rounded-lg bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center text-zinc-800 shadow-3xs shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-zinc-800" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-950">{t('lockedFeature4Title')}</h4>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-normal">{t('lockedFeature4Desc')}</p>
              </div>
            </div>

          </div>

          {/* 4. Action Buttons */}
          <div className="flex items-center justify-center gap-2.5 pt-2 w-full select-none">
            <Link
              href="/dashboard"
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs flex items-center justify-center"
            >
              <span>{t('backToDashboard')}</span>
            </Link>
            <Link
              href="/settings/billing"
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <span>{t('explorePlans')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in font-sans text-black flex flex-col min-h-0 flex-1">
      
      {/* Dynamic Symmetric Controls Header */}
      <div className="px-4 sm:px-8 py-3.5 sm:py-4 border-b border-[#E8E8E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 select-none bg-white shrink-0">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-955 uppercase">{t('title')}</h1>
          <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">{t('desc')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setCreateStageOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 h-8.5 sm:h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all select-none"
          >
            <Plus className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('addStage')}</span>
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 h-8.5 sm:h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all select-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('addDeal')}</span>
          </button>
        </div>
      </div>

      {/* Top metrics dashboard bar - End-to-End Grid */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-[#E8E8E6] lg:divide-y-0 border-b border-[#E8E8E6] bg-white select-none shrink-0">
        {/* Metric 1 */}
        <div className="p-3.5 sm:p-6 flex items-center gap-3">
          <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg bg-[#E8FDE8] border border-accent-green/20 text-emerald-800 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-450 uppercase tracking-wider truncate">{t('pipelineValue')}</p>
            <h4 className="text-xs sm:text-sm font-black text-zinc-955 truncate">
              {currencySymbol}{deals.reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 sm:p-6 flex items-center gap-3">
          <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-455 uppercase tracking-wider truncate">{t('activeDeals')}</p>
            <h4 className="text-xs sm:text-sm font-black text-zinc-955 truncate">{t('activeDealsCount', { count: deals.length })}</h4>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 sm:p-6 flex items-center gap-3">
          <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-450 uppercase tracking-wider truncate">{t('closedWon')}</p>
            <h4 className="text-xs sm:text-sm font-black text-emerald-800 truncate">
              {currencySymbol}{deals.filter(d => d.stage === 'won').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-3.5 sm:p-6 flex items-center gap-3">
          <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-450 uppercase tracking-wider truncate">{t('avgDealSize')}</p>
            <h4 className="text-xs sm:text-sm font-black text-zinc-955 truncate">
              {currencySymbol}{(deals.length ? deals.reduce((acc, curr) => acc + parseFloat(curr.amount), 0) / deals.length : 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>
      </div>

      {/* Kanban Stages Grid Scroll Container */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-8 select-none bg-[#FAFAFA]/30 scrollbar-thin">
        <div className="flex gap-4 min-w-[1200px] h-[calc(100vh-270px)] items-stretch">
          {stages.map((stage) => {
            const metrics = getStageMetrics(stage.key);
            const stageDeals = deals.filter(d => d.stage === stage.key);

            return (
              <div
                key={stage.key}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={() => setDraggedOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`w-[280px] shrink-0 bg-[#FAFAFA]/65 border rounded-xl flex flex-col p-4 space-y-4 transition-all duration-200 ${
                  draggedOverStage === stage.key
                    ? 'border-zinc-400 bg-zinc-50/90 shadow-sm ring-1 ring-zinc-200'
                    : 'border-[#E8E8E6]'
                }`}
              >
                {/* Column stage metrics header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]/60 mb-3 select-none">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const isHexColor = stage.color && stage.color.startsWith('#');
                      return (
                        <span 
                          className={isHexColor ? "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border" : `text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${stage.color}`}
                          style={isHexColor ? { backgroundColor: `${stage.color}15`, borderColor: stage.color, color: stage.color } : undefined}
                        >
                          {stage.name}
                        </span>
                      );
                    })()}
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-[4px]">
                      {metrics.count}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-zinc-950">
                    {currencySymbol}{metrics.amount}
                  </span>
                </div>

                {/* Cards Viewport */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
                  {stageDeals.length === 0 ? (
                    <div className="border border-dashed border-zinc-200 rounded-xl p-6 text-center text-[10px] text-zinc-400 font-bold select-none bg-white/40">
                      {t('dragDealsHere')}
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const clientName = deal.contact 
                        ? [deal.contact.first_name, deal.contact.last_name].filter(Boolean).join(' ') || deal.contact.email
                        : null;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={() => {
                            setActiveDragId(null);
                            setDraggedOverStage(null);
                          }}
                          className={`bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-3xs hover:shadow-xs cursor-grab active:cursor-grabbing hover:border-zinc-350 transition-all select-none group relative ${
                            activeDragId === deal.id ? 'opacity-40 border-dashed border-zinc-300' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-zinc-955 group-hover:text-black line-clamp-1 pr-6 transition-colors">{deal.title}</h4>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] font-black text-zinc-955">
                                {currencySymbol}{parseFloat(deal.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              {clientName && (
                                <div className="flex items-center gap-1 text-[9px] font-semibold text-zinc-500 max-w-[125px] select-none">
                                  <User className="h-3 w-3 text-zinc-450 shrink-0" />
                                  <span className="truncate">{clientName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setDeleteDealId(deal.id)}
                            disabled={isPending}
                            className="absolute top-3.5 right-3.5 p-1 text-zinc-300 hover:text-red-650 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title={t('deleteDeal')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Creation Modal */}
      {createOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <form onSubmit={handleCreateDeal} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('createDealRecord')}</h3>
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
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('dealTitle')}</label>
                <input
                  type="text"
                  placeholder={t('dealTitlePlaceholder')}
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('amountLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5000"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1.5 font-semibold text-zinc-700 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('initialStage')}</label>
                  <DropdownSelect
                    value={dealStage}
                    onChange={(val) => setDealStage(val)}
                    options={stages.map(s => ({ value: s.key, label: s.name }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('associateContact')}</label>
                
                {selectedContact ? (
                  <div className="flex items-center justify-between bg-[#F5F5F5] border border-[#E8E8E6] px-3 py-2 rounded-md text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-zinc-400" />
                      <span>{[selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(' ') || selectedContact.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedContact(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('searchContacts')}
                      value={searchContact}
                      onChange={(e) => setSearchContact(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />

                    {foundContacts.length > 0 && (
                      <div className="border border-[#E8E8E6] rounded-[6px] max-h-40 overflow-y-auto bg-white divide-y divide-zinc-100 text-xs font-semibold shadow-3xs">
                        {foundContacts.map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() => {
                              setSelectedContact(contact);
                              setFoundContacts([]);
                              setSearchContact('');
                            }}
                            className="px-3 py-2 hover:bg-[#FAFAFA] cursor-pointer flex justify-between items-center"
                          >
                            <span>{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || t('unnamedContact')}</span>
                            <span className="text-[10px] text-zinc-455 font-medium">{contact.email || contact.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('addDeal')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteDealId !== null && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
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
                onClick={() => setDeleteDealId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteDealWarning')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteDealId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteDealId !== null) {
                    handleDeleteDeal(deleteDealId);
                    setDeleteDealId(null);
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

      {/* Custom Pipeline Stage Creation Modal */}
      {createStageOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <form onSubmit={handleCreateStage} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('addPipelineStage')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateStageOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('stageName')}</label>
                <input
                  type="text"
                  placeholder={t('stageNamePlaceholder')}
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5 font-semibold text-zinc-700 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('visualColorTheme')}</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-md border border-[#E8E8E6] overflow-hidden shrink-0 cursor-pointer shadow-3xs hover:border-zinc-400 transition-colors">
                    <input
                      type="color"
                      value={stageColor}
                      onChange={(e) => setStageColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="w-full h-full border border-white rounded-md" 
                      style={{ backgroundColor: stageColor }} 
                    />
                  </div>
                  <input
                    type="text"
                    value={stageColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('#') && val.length <= 7) {
                        setStageColor(val);
                      }
                    }}
                    placeholder={t('colorPlaceholder')}
                    className="flex-1 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold uppercase tracking-wider transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setCreateStageOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
              >
                {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('addStage')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
