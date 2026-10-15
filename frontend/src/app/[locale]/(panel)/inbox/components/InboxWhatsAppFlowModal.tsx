/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { fetchWithCsrf } from '@/lib/api';
import {
  FormInput,
  X,
  Loader2,
  Send
} from 'lucide-react';

export interface InboxWhatsAppFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConvId: number | null;
  whatsAppFlowsList: any[];
  onFlowSent: (chatMessage?: any) => void;
}

export default function InboxWhatsAppFlowModal({
  isOpen,
  onClose,
  activeConvId,
  whatsAppFlowsList,
  onFlowSent
}: InboxWhatsAppFlowModalProps) {
  const t = useTranslations('Inbox');
  const tCommon = useTranslations('Common');
  const tFlows = useTranslations('WhatsAppFlows');

  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [flowHeader, setFlowHeader] = useState('');
  const [flowBody, setFlowBody] = useState(t('flowDefaultBody'));
  const [flowFooter, setFlowFooter] = useState('');
  const [flowCta, setFlowCta] = useState('');
  const [isSendingFlow, setIsSendingFlow] = useState(false);

  const handleSendWhatsAppFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !selectedFlowId || !flowBody.trim()) {
      toast.error(t('toastSelectFlowAndBody'));
      return;
    }

    setIsSendingFlow(true);
    try {
      const res = await fetchWithCsrf('/whatsapp-flows/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_flow_id: Number(selectedFlowId),
          conversation_id: activeConvId,
          header: flowHeader.trim() || undefined,
          body: flowBody.trim(),
          footer: flowFooter.trim() || undefined,
          flow_cta: flowCta.trim() || tFlows('openForm') || 'Open Form',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('toastFlowSendFailed'));
      }

      toast.success(t('toastFlowSentSuccess'));
      onClose();
      setSelectedFlowId('');
      setFlowHeader('');
      setFlowFooter('');

      onFlowSent(data.chat_message);
    } catch (err: any) {
      toast.error(err.message || t('toastFlowSendFailed'));
    } finally {
      setIsSendingFlow(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
      onClick={onClose}
    >
      <form 
        onSubmit={handleSendWhatsAppFlow}
        className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-[#E8FDE8] border border-[#25D366]/30 p-1 flex items-center justify-center shrink-0">
              <FormInput className="h-4 w-4 text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">{tFlows('sendModalTitle')}</h3>
              <p className="text-[10px] text-zinc-400">{tFlows('subtitle')}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3.5 pt-4 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
              {tFlows('flowName')} <span className="text-red-500">*</span>
            </label>
            {whatsAppFlowsList.length === 0 ? (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-500 flex items-center justify-between">
                <span>{tFlows('emptyTitle')}</span>
                <a href="/whatsapp-flows" target="_blank" className="text-emerald-600 font-bold underline text-[11px]">
                  {tFlows('createBtn')}
                </a>
              </div>
            ) : (
              <select
                value={selectedFlowId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedFlowId(id);
                  const matched = whatsAppFlowsList.find(f => String(f.id) === id);
                  if (matched && !flowBody) {
                    setFlowBody(`Please complete our ${matched.name} form to proceed.`);
                  }
                }}
                required
                className="w-full h-9 px-3 text-xs bg-[#F9F9F8] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
              >
                <option value="">-- {tFlows('selectCategory')} --</option>
                {whatsAppFlowsList.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.status || 'DRAFT'} • {f.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
              {tFlows('screenTitle')}
            </label>
            <input
              type="text"
              maxLength={60}
              placeholder={tFlows('screenTitlePlaceholder')}
              value={flowHeader}
              onChange={(e) => setFlowHeader(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-[#F9F9F8] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
              {tFlows('messageBody')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              maxLength={1024}
              rows={3}
              placeholder={tFlows('descriptionPlaceholder')}
              value={flowBody}
              onChange={(e) => setFlowBody(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#F9F9F8] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-normal transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                {tFlows('buttonCta')}
              </label>
              <input
                type="text"
                maxLength={20}
                placeholder={tFlows('openForm')}
                value={flowCta}
                onChange={(e) => setFlowCta(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-[#F9F9F8] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                {tFlows('footerText')}
              </label>
              <input
                type="text"
                maxLength={60}
                placeholder={tFlows('footerText')}
                value={flowFooter}
                onChange={(e) => setFlowFooter(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-[#F9F9F8] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          {selectedFlowId && (
            <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                {tFlows('interactiveFlow')}
              </span>
              <div className="bg-[#DCF8C6]/40 border border-[#25D366]/20 rounded-lg p-2.5 text-left text-xs">
                {flowHeader && <p className="font-bold text-zinc-900 text-xs mb-1">{flowHeader}</p>}
                <p className="text-zinc-700 text-xs mb-2 leading-relaxed">{flowBody || 'Message body...'}</p>
                {flowFooter && <p className="text-[9px] text-zinc-400 italic mb-2">{flowFooter}</p>}
                <div className="bg-white/80 border border-[#25D366]/30 text-[#075E54] text-[11px] font-bold py-1 px-3 rounded flex items-center justify-center gap-1.5 shadow-3xs">
                  <FormInput className="h-3 w-3 text-[#25D366]" />
                  <span>{flowCta || tFlows('openForm') || 'Open Form'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer Strip */}
        <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSendingFlow || !selectedFlowId || !flowBody.trim()}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSendingFlow ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{tFlows('sendingBtn')}</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{tFlows('sendSubmitBtn')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
