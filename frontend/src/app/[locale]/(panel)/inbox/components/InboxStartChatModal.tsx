/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { fetchWithCsrf } from '@/lib/api';
import {
  MessageSquare,
  Search,
  Check,
  X
} from 'lucide-react';

export interface InboxStartChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  allContacts: any[];
  allChannels: any[];
  onChatStarted: (newConvId: number) => void;
}

export default function InboxStartChatModal({
  isOpen,
  onClose,
  allContacts,
  allChannels,
  onChatStarted
}: InboxStartChatModalProps) {
  const t = useTranslations('Inbox');
  const tCommon = useTranslations('Common');

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      toast.error(t('toastSelectContact'));
      return;
    }
    if (!selectedChannelId) {
      toast.error(t('toastSelectChannel'));
      return;
    }

    setIsStartingChat(true);
    try {
      const res = await fetchWithCsrf('/conversations/start', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: Number(selectedContactId),
          channel_connection_id: Number(selectedChannelId),
        }),
      });

      if (res.ok) {
        const newConv = await res.json();
        toast.success(t('toastStartSuccess'));
        onClose();
        onChatStarted(newConv.id);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || t('toastStartFailed'));
      }
    } catch {
      toast.error(t('toastStartNetworkError'));
    } finally {
      setIsStartingChat(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
      onClick={onClose}
    >
      <form 
        onSubmit={handleStartChat}
        className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-[#6B6B6B]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('startNewChat')}</h3>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content */}
        <div className="space-y-4 pt-4">
          {/* Select Contact Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('targetContact')}</label>
            
            {/* Search Bar within modal */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholderModal')}
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* Selector Option lists */}
        <div className="space-y-4 pt-0">
          {/* Select Contact Option List */}
          <div className="space-y-1.5 text-left">
            {(() => {
              const filteredContacts = allContacts.filter(c => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const q = contactSearchQuery.toLowerCase();
                return fullName.includes(q) || phone.includes(q) || email.includes(q);
              });

              if (filteredContacts.length === 0) {
                return (
                  <div className="p-3 text-center border border-dashed border-[#E8E8E6] rounded-md bg-[#FBFBFB] text-xs text-[#6B6B6B]">
                    {t('noContactsFound')}
                  </div>
                );
              }

              return (
                <div className="max-h-36 overflow-y-auto border border-[#E8E8E6] rounded-md divide-y divide-[#E8E8E6] bg-white">
                  {filteredContacts.map(c => {
                    const isSelected = selectedContactId === c.id;
                    const contactName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('unnamedContact');
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContactId(c.id)}
                        className={`w-full text-left p-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                          isSelected ? 'bg-zinc-100 font-semibold' : 'hover:bg-[#F9F9F8]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-black">{contactName}</span>
                          <span className="text-[10px] text-zinc-400">{c.phone || c.email || '—'}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-black" />}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Select Channel Connection Section */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('targetChannelConnection')}</label>
            <div className="border border-[#E8E8E6] rounded-md divide-y divide-[#E8E8E6] max-h-32 overflow-y-auto bg-white">
              {allChannels.map(ch => {
                const isSelected = selectedChannelId === ch.id;
                const renderChannelIcon = (type: string) => {
                  const clean = (type || '').toLowerCase();
                  if (clean === 'whatsapp') return <img src="/channels/whatsapp.webp" className="h-4 w-4 object-contain" alt="WhatsApp" />;
                  if (clean === 'telegram') return <img src="/channels/telegram.webp" className="h-4 w-4 object-contain" alt="Telegram" />;
                  if (clean === 'instagram') return <img src="/channels/instagram.svg" className="h-4 w-4 object-contain" alt="Instagram" />;
                  if (clean === 'tiktok') return <img src="/channels/tiktok.webp" className="h-4 w-4 object-contain" alt="TikTok" />;
                  if (clean === 'messenger') return <img src="/channels/messenger.webp" className="h-4 w-4 object-contain" alt="Messenger" />;
                  if (clean === 'sms') return <img src="/channels/twilio.svg" className="h-4 w-4 object-contain" alt="SMS" />;
                  return (
                    <svg className="h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  );
                };

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'bg-zinc-50 font-bold text-black' : 'text-zinc-650 hover:bg-[#F9F9F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {renderChannelIcon(ch.channel_type)}
                      <div>
                        <span className="font-semibold text-black">{ch.name}</span>
                        <span className="text-[9px] text-zinc-400 ml-1.5 uppercase font-semibold">({ch.channel_type})</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-black" />}
                  </button>
                );
              })}
              {allChannels.length === 0 && (
                <div className="p-4 text-center text-zinc-400 text-xs select-none">
                  {t('noChannelConnections')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer Strip */}
        <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isStartingChat || !selectedContactId || !selectedChannelId}
            className="bg-zinc-955 hover:bg-zinc-900 text-white h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-3xs"
          >
            {isStartingChat ? t('starting') : t('startChat')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
