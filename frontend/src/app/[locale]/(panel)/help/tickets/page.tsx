'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { Plus, LifeBuoy, RefreshCw, Send, Loader2, MessageSquare, ArrowLeft, Paperclip, Search, CheckCircle2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { useHeaderStore } from '@/store/useHeaderStore';
import { toast } from 'sonner';

interface UserShort {
  id: number;
  first_name: string;
  last_name: string;
}

interface SupportTicketMessage {
  id: number;
  support_ticket_id: number;
  user_id: number | null;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user?: UserShort;
}

interface SupportTicket {
  id: number;
  tenant_id: number;
  user_id: number;
  subject: string;
  description: string;
  type: 'billing' | 'technical' | 'general' | 'feedback';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  user?: UserShort;
  messages?: SupportTicketMessage[];
}

export default function SupportTicketsPage() {
  const t = useTranslations('Help');
  const tCommon = useTranslations('Common');
  const searchParams = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // View state: 'list' | 'thread'
  const [view, setView] = useState<'list' | 'thread'>('list');

  // New ticket form state
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);

  // Selected ticket chat state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const { setCustomHeader } = useHeaderStore();

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/help/tickets?page=${page}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (searchQuery.trim() !== '') url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetchWithCsrf(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets?.data || []);
        setCurrentPage(data.tickets?.current_page || 1);
        setLastPage(data.tickets?.last_page || 1);
      } else {
        toast.error(t('toasts.loadTicketsFailed'));
      }
    } catch {
      toast.error(t('toasts.loadTicketsNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
    setMounted(true);
  }, [filterStatus, searchQuery]);

  const handleOpenTicketThread = async (id: number) => {
    setView('thread');
    setLoadingThread(true);
    try {
      const res = await fetchWithCsrf(`/help/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      } else {
        toast.error(t('toasts.loadDiscussionFailed'));
      }
    } catch {
      toast.error(t('toasts.loadDiscussionNetworkError'));
    } finally {
      setLoadingThread(false);
    }
  };

  // Handle deep-link ticketId param
  useEffect(() => {
    if (ticketIdParam) {
      const id = parseInt(ticketIdParam, 10);
      if (!isNaN(id)) {
        handleOpenTicketThread(id);
      }
    }
  }, [ticketIdParam]);

  // Update layout custom header depending on view
  useEffect(() => {
    if (view === 'list' || !selectedTicket) {
      setCustomHeader(null);
    } else {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3 text-left">
            <button 
              type="button"
              onClick={() => {
                setView('list');
                setSelectedTicket(null);
              }}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {t('supportTickets')} / {t('ticketNo')}{selectedTicket.id}
            </h2>
          </div>
        </header>
      );
    }
    return () => {
      setCustomHeader(null);
    };
  }, [view, selectedTicket, setCustomHeader, t]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      toast.error(t('toasts.fillRequiredTicketFields'));
      return;
    }

    setSavingTicket(true);
    try {
      const res = await fetchWithCsrf('/help/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, type, priority, description }),
      });

      if (res.ok) {
        toast.success(t('toasts.ticketRegistered'));
        setCreateOpen(false);
        setSubject('');
        setDescription('');
        setType('general');
        setPriority('medium');
        fetchTickets();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to create support ticket.');
      }
    } catch {
      toast.error(t('toasts.ticketRegistryNetworkError'));
    } finally {
      setSavingTicket(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error(t('toasts.onlyImagesAllowed'));
        return;
      }
      setAttachedFile(file);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!replyMessage.trim() && !attachedFile)) return;

    setSendingReply(true);
    try {
      let finalMessage = replyMessage.trim();
      if (attachedFile) {
        if (finalMessage) {
          finalMessage += `\n[Attached Image: ${attachedFile.name}]`;
        } else {
          finalMessage = `[Attached Image: ${attachedFile.name}]`;
        }
      }

      const res = await fetchWithCsrf(`/help/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: finalMessage }),
      });

      if (res.ok) {
        setReplyMessage('');
        setAttachedFile(null);
        await handleOpenTicketThread(selectedTicket.id);
        fetchTickets();
      } else {
        toast.error(t('toasts.postReplyFailed'));
      }
    } catch {
      toast.error(t('toasts.postReplyNetworkError'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || closingTicket) return;
    setClosingTicket(true);
    try {
      const res = await fetchWithCsrf(`/help/tickets/${selectedTicket.id}/close`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success(t('ticketStatusClosed'));
        await handleOpenTicketThread(selectedTicket.id);
        fetchTickets(currentPage);
      } else {
        toast.error(t('toasts.loadTicketsFailed'));
      }
    } catch {
      toast.error(t('toasts.loadTicketsNetworkError'));
    } finally {
      setClosingTicket(false);
    }
  };

  const statusTabs = [
    { id: 'all', label: tCommon('all') || 'All' },
    { id: 'open', label: tCommon('statusOpen') },
    { id: 'in_progress', label: t('ticketStatusPending') },
    { id: 'resolved', label: tCommon('statusResolved') },
    { id: 'closed', label: t('ticketStatusClosed') },
  ];

  if (view === 'thread' && selectedTicket) {
    return (
      <div className="w-full h-full min-h-0 flex flex-col overflow-hidden text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in text-left">
        
        {/* 2-Column Flex: Borderless split lines layout at full height with zero gaps */}
        <div className="flex flex-1 min-h-0 items-stretch w-full overflow-hidden">
          
          {/* Chat Conversation Area (Left, 75% width) */}
          <div className="w-3/4 flex flex-col h-full min-h-0 bg-white select-none">
            {/* Scrollable messages thread */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white">
              {loadingThread ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 h-full">
                  <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('syncingThread')}</span>
                </div>
              ) : selectedTicket.messages?.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400 font-medium">{t('noRepliesYet')}</div>
              ) : (
                selectedTicket.messages?.map((msg) => {
                  const isAdmin = msg.is_admin_reply;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isAdmin ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                    >
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">
                        {isAdmin ? (t('helpdeskAdmin') || 'Helpdesk Admin') : msg.user ? `${msg.user.first_name} ${msg.user.last_name}` : (t('operator') || 'Operator')}
                      </span>
                      
                      <div className={`p-3 rounded-lg text-xs leading-relaxed text-left font-medium ${
                        isAdmin 
                          ? 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-none' 
                          : 'bg-black text-white rounded-tr-none shadow-3xs'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Fixed Chat Reply Form strip with top line separator */}
            <div className="border-t border-[#E8E8E6] bg-white shrink-0 flex flex-col">
              {attachedFile && (
                <div className="px-6 py-2 bg-zinc-50 border-b border-[#E8E8E6] flex items-center justify-between text-xs font-semibold text-zinc-650 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('attachment')}</span>
                    <span className="text-zinc-800 truncate max-w-xs">{attachedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-zinc-400 hover:text-black font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form onSubmit={handleSendReply} className="p-6 flex items-center gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={sendingReply}
                  placeholder={t('postReplyPlaceholder')}
                  className="flex-1 h-10 px-4 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder:text-zinc-400"
                />
                
                {/* Paperclip attachment button */}
                <label
                  htmlFor="chat-attachment"
                  className="h-10 w-10 shrink-0 border border-[#E8E8E6] hover:bg-zinc-50 text-[#6B6B6B] hover:text-black rounded-md transition-all flex items-center justify-center cursor-pointer shadow-3xs"
                  title={t('attachImageTooltip')}
                >
                  <Paperclip className="h-4 w-4" />
                </label>
                <input
                  type="file"
                  id="chat-attachment"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Send message button */}
                <button
                  type="submit"
                  disabled={sendingReply || (!replyMessage.trim() && !attachedFile)}
                  className="h-10 w-10 shrink-0 bg-black hover:bg-neutral-800 text-white rounded-md shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title={t('sendMessageTooltip')}
                >
                  {sendingReply ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Details Box (Right, 25% width, split with left vertical line) */}
          <div className="w-1/4 border-l border-[#E8E8E6] p-8 flex flex-col h-full overflow-y-auto space-y-6 text-left shrink-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('caseParameters')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                  {t('caseParametersDesc')}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E8E8E6]">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('classification')}</span>
                  <span className="font-bold text-zinc-955 uppercase text-[10px]">
                    {selectedTicket.type === 'billing' ? t('billingInvoice') :
                     selectedTicket.type === 'technical' ? t('technicalIssue') :
                     selectedTicket.type === 'feedback' ? t('featureRequest') : t('generalInquiry')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E8E8E6]">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('priority')}</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                    selectedTicket.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-150' :
                    selectedTicket.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                    'bg-zinc-50 text-zinc-650 border border-zinc-200'
                  }`}>
                    {selectedTicket.priority === 'high' ? t('high') : selectedTicket.priority === 'medium' ? t('medium') : t('low')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E8E8E6]">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('status')}</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                    selectedTicket.status === 'resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' :
                    selectedTicket.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    selectedTicket.status === 'closed' ? 'bg-zinc-50 text-zinc-500 border border-zinc-200' :
                    'bg-red-50 text-red-700 border border-red-150'
                  }`}>
                    {selectedTicket.status === 'resolved' ? tCommon('statusResolved') :
                     selectedTicket.status === 'in_progress' ? t('ticketStatusPending') :
                     selectedTicket.status === 'closed' ? t('ticketStatusClosed') : tCommon('statusOpen')}
                  </span>
                </div>
              </div>

              {/* Original Trouble Description Box */}
              <div className="pt-4 space-y-2 text-left">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('originalDescription')}</span>
                <p className="text-xs font-semibold text-zinc-750 leading-relaxed break-words whitespace-pre-wrap select-text">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Close Ticket Action for Tenant */}
              {selectedTicket.status !== 'closed' && (
                <div className="pt-4 border-t border-[#E8E8E6]">
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    disabled={closingTicket}
                    className="w-full h-9 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 font-bold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {closingTicket ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    <span>{t('ticketStatusClosed')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-8 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in space-y-6">
      
      {/* Top Action Row */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-[#E8E8E6]">
        {/* Left group - Tabs and Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs Selector */}
          <div className="flex items-center gap-1 border border-[#E8E8E6] bg-[#F9F9F8] p-0.5 rounded-[8px] select-none shrink-0 shadow-3xs">
            {statusTabs.map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`relative px-4 py-1.5 text-xs font-bold transition-all rounded-[6px] cursor-pointer ${
                    isActive ? 'text-black font-extrabold bg-white shadow-3xs' : 'text-[#6B6B6B] hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="w-60 relative shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('faqSearchPlaceholder')}
              className="w-full h-9 pl-9 pr-4 bg-white border border-[#E8E8E6] rounded-[6px] text-xs focus:outline-none focus:border-zinc-955 shadow-3xs font-medium placeholder:text-zinc-400 text-black text-left"
            />
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('newSupportTicket')}</span>
        </button>
      </div>

      {loading && tickets.length === 0 && searchQuery === '' ? (
        <SimpleLoader message={t('syncingTickets')} />
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center p-6 select-none animate-row-fade">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
            <LifeBuoy className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noSupportTickets')}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">{t('noSupportTicketsDesc')}</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('createTicket')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-row-fade">
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[10px] tracking-wider uppercase">
                    <th className="px-6 py-3.5">{t('ticketId')}</th>
                    <th className="px-6 py-3.5">{t('classification')}</th>
                    <th className="px-6 py-3.5">{t('ticketSubject')}</th>
                    <th className="px-6 py-3.5">{t('requestedBy')}</th>
                    <th className="px-6 py-3.5">{t('priority')}</th>
                    <th className="px-6 py-3.5">{t('status')}</th>
                    <th className="px-6 py-3.5 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-750">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[10px] text-zinc-400">#{ticket.id}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold bg-zinc-50 border border-zinc-150 text-zinc-650 px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                          {ticket.type === 'billing' ? t('billingInvoice') :
                           ticket.type === 'technical' ? t('technicalIssue') :
                           ticket.type === 'feedback' ? t('featureRequest') : t('generalInquiry')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-955">{ticket.subject}</td>
                      <td className="px-6 py-4 font-semibold text-zinc-600">
                        {ticket.user ? `${ticket.user.first_name} ${ticket.user.last_name}` : (t('operator') || 'Operator')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                          ticket.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-150' :
                          ticket.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                          'bg-zinc-50 text-zinc-650 border border-zinc-200'
                        }`}>
                          {ticket.priority === 'high' ? t('high') : ticket.priority === 'medium' ? t('medium') : t('low')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                          ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' :
                          ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          ticket.status === 'closed' ? 'bg-zinc-50 text-zinc-500 border border-zinc-200' :
                          'bg-red-50 text-red-700 border border-red-150'
                        }`}>
                          {ticket.status === 'resolved' ? tCommon('statusResolved') :
                           ticket.status === 'in_progress' ? t('ticketStatusPending') :
                           ticket.status === 'closed' ? t('ticketStatusClosed') : tCommon('statusOpen')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenTicketThread(ticket.id)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center"
                          title={t('viewThreadTooltip')}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-[#E8E8E6] pt-4 select-none text-xs">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => fetchTickets(currentPage - 1)}
                className={`h-8 px-3 border border-[#E8E8E6] text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all ${
                  currentPage === 1 ? 'opacity-50 cursor-not-allowed bg-zinc-50' : 'bg-white hover:border-black/30 cursor-pointer'
                }`}
              >
                {tCommon('previous') || 'Previous'}
              </button>
              <span className="text-[10px] text-[#6B6B6B] font-bold">
                {currentPage} / {lastPage}
              </span>
              <button
                type="button"
                disabled={currentPage === lastPage}
                onClick={() => fetchTickets(currentPage + 1)}
                className={`h-8 px-3 border border-[#E8E8E6] text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all ${
                  currentPage === lastPage ? 'opacity-50 cursor-not-allowed bg-zinc-50' : 'bg-white hover:border-black/30 cursor-pointer'
                }`}
              >
                {tCommon('next') || 'Next'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Creation Dialog Modal Portal */}
      {createOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <form onSubmit={handleCreateTicket} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <LifeBuoy className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('createTicket')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('issueSummary')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('hubspotPlaceholder')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('ticketType')}</label>
                  <DropdownSelect
                    value={type}
                    onChange={(val) => setType(val)}
                    options={[
                      { value: 'general', label: t('generalInquiry') },
                      { value: 'billing', label: t('billingInvoice') },
                      { value: 'technical', label: t('technicalIssue') },
                      { value: 'feedback', label: t('featureRequest') },
                    ]}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('priorityLevel')}</label>
                  <DropdownSelect
                    value={priority}
                    onChange={(val) => setPriority(val)}
                    options={[
                      { value: 'low', label: t('low') },
                      { value: 'medium', label: t('medium') },
                      { value: 'high', label: t('high') },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('troubleDescription')}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t('describeDetailPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                />
              </div>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingTicket}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
              >
                {savingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('openTicket')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
