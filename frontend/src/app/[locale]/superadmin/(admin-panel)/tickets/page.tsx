'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { 
  ArrowLeft, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  MessageSquare,
  LifeBuoy,
  Loader2,
  Paperclip,
  Search,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useHeaderStore } from '@/store/useHeaderStore';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface UserShort {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface TenantShort {
  id: number;
  company_name: string;
  domain: string;
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
  tenant?: TenantShort;
  messages?: SupportTicketMessage[];
}

export default function SupportTicketsConsolePage() {
  const t = useTranslations('Superadmin');
  const searchParams = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // View state: 'list' | 'thread'
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Pending status confirmation modal state
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const { setCustomHeader } = useHeaderStore();

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/admin/tickets?page=${page}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (filterPriority !== 'all') url += `&priority=${filterPriority}`;
      if (searchQuery.trim() !== '') url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetchWithCsrf(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets?.data || []);
        setCurrentPage(data.tickets?.current_page || 1);
        setLastPage(data.tickets?.last_page || 1);
      } else {
        toast.error(t('tickets.saveFailed'));
      }
    } catch {
      toast.error(t('tickets.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketThread = async (id: number) => {
    setLoadingThread(true);
    try {
      const res = await fetchWithCsrf(`/admin/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      } else {
        toast.error(t('tickets.saveFailed'));
      }
    } catch {
      toast.error(t('tickets.saveFailed'));
    } finally {
      setLoadingThread(false);
    }
  };

  // Handle deep-link ticketId param from notifications/URLs
  useEffect(() => {
    if (ticketIdParam) {
      const id = parseInt(ticketIdParam, 10);
      if (!isNaN(id)) {
        setView('thread');
        fetchTicketThread(id);
      }
    }
  }, [ticketIdParam]);

  useEffect(() => {
    fetchTickets(1);
  }, [filterStatus, filterPriority, searchQuery]);

  // Update layout custom header depending on view
  useEffect(() => {
    if (view === 'list' || !selectedTicket) {
      setCustomHeader(null);
    } else {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full animate-fade-in">
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
              {t('tickets.title')} / {t('tickets.ticketNo', { id: selectedTicket.id })}
            </h2>
          </div>
        </header>
      );
    }
    return () => {
      setCustomHeader(null);
    };
  }, [view, selectedTicket]);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setView('thread');
    fetchTicketThread(ticket.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetchWithCsrf(`/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyMessage.trim() })
      });

      if (res.ok) {
        setReplyMessage('');
        await fetchTicketThread(selectedTicket.id);
        toast.success(t('tickets.saveSuccess'));
      } else {
        toast.error(t('tickets.saveFailed'));
      }
    } catch {
      toast.error(t('tickets.saveFailed'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = (status: string) => {
    if (!selectedTicket) return;
    setPendingStatus(status);
  };

  const confirmStatusChange = async () => {
    if (!selectedTicket || !pendingStatus) return;

    const statusToApply = pendingStatus;
    setPendingStatus(null);

    try {
      const res = await fetchWithCsrf(`/admin/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: statusToApply })
      });

      if (res.ok) {
        toast.success(t('tickets.saveSuccess'));
        await fetchTicketThread(selectedTicket.id);
        fetchTickets(currentPage);
      } else {
        toast.error(t('tickets.saveFailed'));
      }
    } catch {
      toast.error(t('tickets.saveFailed'));
    }
  };

  if (loading && tickets.length === 0 && searchQuery === '') {
    return <SimpleLoader message={t('tickets.loading')} />;
  }

  const statusTabs = [
    { id: 'all', label: t('tickets.statuses.all') || 'All Status' },
    { id: 'open', label: t('tickets.statuses.open') },
    { id: 'in_progress', label: t('tickets.statuses.in_progress') },
    { id: 'resolved', label: t('tickets.statuses.resolved') },
    { id: 'closed', label: t('tickets.statuses.closed') },
  ];

  const priorityOptions = [
    { value: 'all', label: t('tickets.allPriorities') || 'All Priorities' },
    { value: 'low', label: t('tickets.priorities.low') },
    { value: 'medium', label: t('tickets.priorities.medium') },
    { value: 'high', label: t('tickets.priorities.high') },
  ];

  const statusDropdownOptions = [
    { value: 'open', label: t('tickets.statuses.open') },
    { value: 'in_progress', label: t('tickets.statuses.in_progress') },
    { value: 'resolved', label: t('tickets.statuses.resolved') },
    { value: 'closed', label: t('tickets.statuses.closed') },
  ];

  return (
    <div className="w-full bg-white select-none text-zinc-750 font-sans h-full flex flex-col">
      {view === 'list' ? (
        <div className="flex-1 p-8 overflow-y-auto w-full bg-white h-full">
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            
            {/* Header Action Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
              
              {/* Left group - Tabs and Search */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Tabs Selector (Same styling as plans view) */}
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
                    placeholder={t('tickets.searchPlaceholder')}
                    className="w-full h-9 pl-9 pr-4 bg-white border border-[#E8E8E6] rounded-[6px] text-xs focus:outline-none focus:border-zinc-955 shadow-3xs font-medium placeholder:text-zinc-400 text-black text-left"
                  />
                  <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Priority Filter via DropdownSelect */}
              <div className="w-48 shrink-0">
                <DropdownSelect
                  value={filterPriority}
                  onChange={setFilterPriority}
                  options={priorityOptions}
                  placeholder={t('tickets.filterByPriority')}
                />
              </div>

            </div>

            {/* Tickets List Table */}
            {tickets.length === 0 ? (
              <div className="text-center py-16 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center p-6 select-none animate-row-fade">
                <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                  <LifeBuoy className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('tickets.noTickets')}</h3>
              </div>
            ) : (
              <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-[var(--shadow-card)] animate-row-fade">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="bg-zinc-50/50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[10px] tracking-wider uppercase">
                        <th className="px-6 py-3.5">ID</th>
                        <th className="px-6 py-3.5">{t('tickets.type')}</th>
                        <th className="px-6 py-3.5">{t('tickets.subject')}</th>
                        <th className="px-6 py-3.5">{t('tickets.workspace')}</th>
                        <th className="px-6 py-3.5">{t('tickets.submittedBy')}</th>
                        <th className="px-6 py-3.5">{t('tickets.priority')}</th>
                        <th className="px-6 py-3.5">{t('tickets.status')}</th>
                        <th className="px-6 py-3.5 text-right">{t('analytics.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6] text-zinc-750">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-[10px] text-zinc-400">#{ticket.id}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold bg-zinc-50 border border-zinc-150 text-zinc-655 px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                              {t(`tickets.types.${ticket.type}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-955">{ticket.subject}</td>
                          <td className="px-6 py-4 font-bold text-zinc-800">{ticket.tenant?.company_name}</td>
                          <td className="px-6 py-4 font-semibold text-zinc-600">
                            {ticket.user ? `${ticket.user.first_name} ${ticket.user.last_name}` : t('tickets.operator')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                              ticket.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-150' :
                              ticket.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                              'bg-zinc-50 text-zinc-655 border border-zinc-200'
                            }`}>
                              {t(`tickets.priorities.${ticket.priority}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                              ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' :
                              ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              ticket.status === 'closed' ? 'bg-zinc-50 text-zinc-500 border border-zinc-200' :
                              'bg-red-50 text-red-700 border border-red-150'
                            }`}>
                              {t(`tickets.statuses.${ticket.status}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleSelectTicket(ticket)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-zinc-200"
                              title={t('tickets.viewDiscussion')}
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
            )}

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
                  {t('tickets.previous')}
                </button>
                <span className="text-[10px] text-[#6B6B6B] font-bold">
                  {t('tickets.pageOf', { current: currentPage, total: lastPage })}
                </span>
                <button
                  type="button"
                  disabled={currentPage === lastPage}
                  onClick={() => fetchTickets(currentPage + 1)}
                  className={`h-8 px-3 border border-[#E8E8E6] text-[10px] font-bold uppercase tracking-wider rounded-[6px] transition-all ${
                    currentPage === lastPage ? 'opacity-50 cursor-not-allowed bg-zinc-50' : 'bg-white hover:border-black/30 cursor-pointer'
                  }`}
                >
                  {t('tickets.next')}
                </button>
              </div>
            )}

          </div>
        </div>
      ) : (
        selectedTicket && (
          <div className="w-full h-full min-h-0 flex flex-col overflow-hidden text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in text-left bg-white relative">
            
            {/* 2-Column Flex: Borderless split lines layout at full height with zero gaps */}
            <div className="flex flex-1 min-h-0 items-stretch w-full overflow-hidden">
              
              {/* Chat Conversation Area (Left, 75% width) */}
              <div className="w-3/4 flex flex-col h-full min-h-0 bg-white select-none">
                
                {/* Scrollable messages thread */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white">
                  {loadingThread ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 h-full">
                      <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('tickets.syncingThread')}</span>
                    </div>
                  ) : selectedTicket.messages?.length === 0 ? (
                    <div className="text-center py-10 text-xs text-zinc-400 font-medium">{t('tickets.noMessagesYet')}</div>
                  ) : (
                    selectedTicket.messages?.map((msg) => {
                      const isAdmin = msg.is_admin_reply;
                      return (
                        <div 
                          key={msg.id}
                          className={`flex flex-col max-w-[80%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                        >
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">
                            {isAdmin ? t('tickets.adminReplyLabel') : `${selectedTicket.user?.first_name} ${selectedTicket.user?.last_name}`}
                          </span>
                          
                          <div className={`p-3 rounded-lg text-xs leading-relaxed text-left font-medium ${
                            isAdmin 
                              ? 'bg-black text-white rounded-tr-none shadow-3xs' 
                              : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-none'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Form Composer strip */}
                <div className="border-t border-[#E8E8E6] bg-white shrink-0 flex flex-col">
                  <form onSubmit={handleSendReply} className="p-6 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      disabled={sendingReply}
                      placeholder={t('tickets.replyPlaceholder')}
                      className="flex-1 h-10 px-4 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors placeholder:text-zinc-400 text-black text-left"
                    />

                    {/* Paperclip attachment button */}
                    <label
                      htmlFor="chat-attachment"
                      className="h-10 w-10 shrink-0 border border-[#E8E8E6] hover:bg-zinc-50 text-[#6B6B6B] hover:text-black rounded-md transition-all flex items-center justify-center cursor-pointer shadow-3xs animate-fade-in"
                      title={t('tickets.attachImage')}
                    >
                      <Paperclip className="h-4 w-4" />
                    </label>
                    <input
                      type="file"
                      id="chat-attachment"
                      accept="image/*"
                      className="hidden"
                      disabled={true}
                    />
                    
                    <button
                      type="submit"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="h-10 w-10 shrink-0 bg-black hover:bg-neutral-800 text-white rounded-md shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
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

              {/* Details Box & Admin Controls (Right, 25% width) */}
              <div className="w-1/4 border-l border-[#E8E8E6] p-8 flex flex-col h-full overflow-y-auto space-y-6 text-left bg-white shrink-0">
                
                {/* Meta details header */}
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('tickets.caseParameters')}</h3>
                    <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                      {t('tickets.caseParametersDesc')}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    
                    {/* Classification */}
                    <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#E8E8E6]">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('tickets.type')}</span>
                      <span className="font-bold text-zinc-955 uppercase text-[10px]">
                        {t(`tickets.types.${selectedTicket.type}`)}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#E8E8E6]">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('tickets.priority')}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded-[4px] font-black uppercase text-[9px] ${
                        selectedTicket.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-150' :
                        selectedTicket.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                        'bg-zinc-50 text-zinc-655 border border-zinc-200'
                      }`}>
                        {t(`tickets.priorities.${selectedTicket.priority}`)}
                      </span>
                    </div>

                    {/* Status inline select dropdown */}
                    <div className="flex flex-col py-2.5 border-b border-[#E8E8E6] text-left gap-1.5">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('tickets.status')}</span>
                      <DropdownSelect
                        value={selectedTicket.status}
                        onChange={handleStatusChange}
                        options={statusDropdownOptions}
                        placeholder={t('tickets.changeStatus')}
                      />
                    </div>

                    {/* Workspace */}
                    <div className="flex flex-col py-2.5 border-b border-[#E8E8E6] text-left gap-1">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('tickets.workspace')}</span>
                      <span className="font-bold text-zinc-955 text-xs truncate" title={selectedTicket.tenant?.company_name}>
                        {selectedTicket.tenant?.company_name}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 font-mono">
                        {selectedTicket.tenant?.domain}.whatsomni.com
                      </span>
                    </div>

                    {/* Submitter User Profile */}
                    <div className="flex flex-col py-2.5 border-b border-[#E8E8E6] text-left gap-1">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">{t('tickets.submittedBy')}</span>
                      <span className="font-bold text-zinc-955 text-xs">
                        {selectedTicket.user?.first_name} {selectedTicket.user?.last_name}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400">
                        {selectedTicket.user?.email}
                      </span>
                    </div>

                  </div>

                  {/* Original Description */}
                  <div className="pt-4 space-y-2 text-left">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('tickets.originalDescription')}</span>
                    <p className="text-xs font-semibold text-zinc-750 leading-relaxed break-words whitespace-pre-wrap select-text">
                      {selectedTicket.description}
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* Confirmation Alert Dialog Overlay */}
            {pendingStatus && (
              <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
                <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left select-none font-sans">
                  {/* Header Section (Connected End-to-End Divider) */}
                  <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-zinc-50 border border-zinc-200 p-1 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-zinc-650" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('tickets.confirmStatusTitle')}</h3>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPendingStatus(null)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                      aria-label="Close dialog"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 pt-4">
                    <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                      {t('tickets.confirmStatusText', { status: t(`tickets.statuses.${pendingStatus}`) })}
                    </p>
                  </div>

                  <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                    <button
                      type="button"
                      onClick={() => setPendingStatus(null)}
                      className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                    >
                      {t('tickets.cancelButton')}
                    </button>
                    <button
                      type="button"
                      onClick={confirmStatusChange}
                      className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center cursor-pointer"
                    >
                      {t('tickets.confirmButton')}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )
      )}
    </div>
  );
}
