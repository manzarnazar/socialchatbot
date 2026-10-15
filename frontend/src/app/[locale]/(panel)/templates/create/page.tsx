'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Sparkles, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Heading, 
  AlignLeft, 
  Image as ImageIcon, 
  Link2, 
  Square, 
  Minus, 
  Mail, 
  Send, 
  Smartphone,
  Eye,
  RefreshCw,
  Code,
  X
} from 'lucide-react';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useTranslations } from 'next-intl';

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
}

interface BlockItem {
  id: string;
  type: 'header' | 'paragraph' | 'image' | 'button' | 'divider';
  content: string;
  url?: string; // For buttons or images
  src?: string; // For images
}

interface ButtonItem {
  id: string;
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  url?: string;
  phone_number?: string;
}

export default function CreateTemplatePage() {
  const t = useTranslations('Templates');
  const tContacts = useTranslations('ContactsDetail');

  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const initialType = searchParams.get('type') || 'whatsapp';

  const [mounted, setMounted] = useState(false);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // General Config
  const [name, setName] = useState('');
  const [type, setType] = useState(initialType);
  const [category, setCategory] = useState('utility');
  const [language, setLanguage] = useState('en_US');
  const [channelConnectionId, setChannelConnectionId] = useState('');

  // 1. WhatsApp Template State
  const [waHeaderType, setWaHeaderType] = useState<'none' | 'text'>('none');
  const [waHeaderText, setWaHeaderText] = useState('');
  const [waBodyText, setWaBodyText] = useState('Hello {{1}}, welcome to WhatsOmni!');
  const [waFooterText, setWaFooterText] = useState('');
  const [waButtons, setWaButtons] = useState<ButtonItem[]>([]);

  // 2. Email Template (Drag & Drop Block Builder) State
  const [emailBlocks, setEmailBlocks] = useState<BlockItem[]>([
    { id: '1', type: 'header', content: 'Welcome to WhatsOmni' },
    { id: '2', type: 'paragraph', content: 'Hi {{ contact.first_name }}, we are thrilled to have you on board! Check out our new visual template builder.' },
    { id: '3', type: 'button', content: 'Get Started Now', url: '{{ url }}' }
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Test Send Modal State
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testSending, setTestSending] = useState(false);

  const { setCustomHeader } = useHeaderStore();

  useEffect(() => {
    router.replace('/templates');
  }, [router]);

  // Sync header changes
  useEffect(() => {
    if (!mounted) return;
    
    setCustomHeader(
      <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/templates')}
            className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
          <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
            {templateId ? t('editTemplate') : t('newTemplate')}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/templates')}
            className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
          >
            {t('cancel')}
          </button>
          
          {type === 'email' && templateId && (
            <button
              type="button"
              onClick={() => setTestSendOpen(true)}
              className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 h-8 px-3 text-xs font-bold rounded-md shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{t('testSend')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveTemplate(false)}
            disabled={isPending}
            className="bg-black text-white hover:bg-neutral-800 h-8 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
            <span>{t('deploy')}</span>
          </button>

          {type === 'whatsapp' && (
            <button
              type="button"
              onClick={() => handleSaveTemplate(true)}
              disabled={isPending}
              className="bg-emerald-650 hover:bg-emerald-700 text-white h-8 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{t('submitMeta')}</span>
            </button>
          )}
        </div>
      </header>
    );

    return () => {
      setCustomHeader(null);
    };
  }, [
    mounted,
    type,
    name,
    category,
    language,
    channelConnectionId,
    waHeaderType,
    waHeaderText,
    waBodyText,
    waFooterText,
    waButtons,
    emailBlocks,
    isPending
  ]);

  const loadChannels = async () => {
    try {
      const res = await fetchWithCsrf('/channels');
      if (res.ok) {
        setChannels(await res.json());
      }
    } catch {
      toast.error(t('details.failedToLoad'));
    }
  };

  const loadTemplate = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setType(data.type || 'whatsapp');
        setCategory(data.category || 'utility');
        setLanguage(data.language || 'en_US');
        setChannelConnectionId(data.channel_connection_id?.toString() || '');

        const content = data.content || {};
        if (data.type === 'whatsapp') {
          if (content.header) {
            setWaHeaderType(content.header.text ? 'text' : 'none');
            setWaHeaderText(content.header.text || '');
          }
          if (content.body) {
            setWaBodyText(content.body.text || '');
          }
          if (content.footer) {
            setWaFooterText(content.footer.text || '');
          }
          setWaButtons(content.buttons || []);
        } else {
          setEmailBlocks(content.blocks || []);
        }
      } else {
        toast.error(t('details.failedToLoad'));
      }
    } catch {
      toast.error(t('saveNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = (submitMeta = false) => {
    if (!name.trim()) {
      toast.error(t('validationName'));
      return;
    }

    // Format WhatsApp slug name
    let formattedName = name;
    if (type === 'whatsapp') {
      formattedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    const templateContent = type === 'whatsapp' ? {
      header: waHeaderType === 'text' ? { text: waHeaderText } : null,
      body: { text: waBodyText },
      footer: waFooterText ? { text: waFooterText } : null,
      buttons: waButtons
    } : {
      blocks: emailBlocks
    };

    startTransition(async () => {
      const payload = {
        name: formattedName,
        type,
        category,
        language,
        channel_connection_id: channelConnectionId ? parseInt(channelConnectionId) : null,
        content: templateContent,
        status: type === 'email' ? 'ready' : 'draft'
      };

      try {
        const url = templateId ? `/templates/${templateId}` : '/templates';
        const method = templateId ? 'PUT' : 'POST';

        const res = await fetchWithCsrf(url, {
          method,
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const savedTemplate = await res.json();
          const targetId = templateId || savedTemplate.id;

          if (submitMeta && type === 'whatsapp') {
            // Trigger Meta submission
            const submitRes = await fetchWithCsrf(`/templates/${targetId}/submit-whatsapp`, {
              method: 'POST'
            });
            if (submitRes.ok) {
              toast.success(t('saveSuccess'));
            } else {
              const err = await submitRes.json();
              toast.error(err.message || t('saveDraftFailed'));
            }
          } else {
            toast.success(templateId ? t('updateSuccess') : t('saveDraftSuccess'));
          }

          router.push('/templates');
        } else {
          const err = await res.json();
          toast.error(err.message || t('saveFailed'));
        }
      } catch {
        toast.error(t('saveNetworkError'));
      }
    });
  };

  const handleTriggerTestSend = async () => {
    if (!templateId || !testEmailAddress.trim()) return;
    setTestSending(true);

    try {
      const res = await fetchWithCsrf(`/templates/${templateId}/test-send-email`, {
        method: 'POST',
        body: JSON.stringify({ email: testEmailAddress })
      });

      if (res.ok) {
        toast.success(t('testSuccess'));
        setTestSendOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.message || t('testFailed'));
      }
    } catch {
      toast.error(t('testNetworkError'));
    } finally {
      setTestSending(false);
    }
  };

  // WhatsApp Button Config Helpers
  const handleAddWaButton = (btnType: 'quick_reply' | 'url' | 'phone') => {
    if (waButtons.length >= 3 && btnType === 'quick_reply') {
      toast.error(t('toastMaxQuickReply'));
      return;
    }
    if (waButtons.length >= 2 && (btnType === 'url' || btnType === 'phone')) {
      toast.error(t('toastMaxCta'));
      return;
    }

    const newBtn: ButtonItem = {
      id: uniqId(),
      type: btnType,
      text: btnType === 'quick_reply' ? 'Quick Reply Text' : btnType === 'url' ? 'Visit Website' : 'Call Number',
      url: btnType === 'url' ? 'https://example.com' : undefined,
      phone_number: btnType === 'phone' ? '+15551234567' : undefined
    };
    setWaButtons([...waButtons, newBtn]);
  };

  const handleUpdateWaButton = (id: string, field: keyof ButtonItem, val: string) => {
    setWaButtons(waButtons.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const handleRemoveWaButton = (id: string) => {
    setWaButtons(waButtons.filter(b => b.id !== id));
  };

  // Email Builder Block Helpers
  const addBlock = (blockType: 'header' | 'paragraph' | 'image' | 'button' | 'divider') => {
    const newBlock: BlockItem = {
      id: uniqId(),
      type: blockType,
      content: blockType === 'header' ? 'New Header Title' : 
               blockType === 'paragraph' ? 'Add paragraph body text here...' :
               blockType === 'button' ? 'Click Here' :
               blockType === 'divider' ? '' : 'Image Label',
      url: blockType === 'button' ? '{{ url }}' : undefined,
      src: blockType === 'image' ? 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=800&auto=format&fit=crop&q=60' : undefined
    };

    setEmailBlocks([...emailBlocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateBlockContent = (id: string, text: string) => {
    setEmailBlocks(emailBlocks.map(b => b.id === id ? { ...b, content: text } : b));
  };

  const updateBlockUrl = (id: string, url: string) => {
    setEmailBlocks(emailBlocks.map(b => b.id === id ? { ...b, url } : b));
  };

  const updateBlockSrc = (id: string, src: string) => {
    setEmailBlocks(emailBlocks.map(b => b.id === id ? { ...b, src } : b));
  };

  const deleteBlock = (id: string) => {
    setEmailBlocks(emailBlocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === emailBlocks.length - 1) return;

    const newBlocks = [...emailBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    setEmailBlocks(newBlocks);
  };

  const insertMergeTag = (tag: string) => {
    if (!activeBlockId) {
      toast.warning(t('toastSelectBlockFirst'));
      return;
    }
    
    setEmailBlocks(emailBlocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          content: b.content + ' ' + tag
        };
      }
      return b;
    }));
  };

  const uniqId = () => Math.random().toString(36).substring(2, 9);

  // Filter channels based on type
  const filteredChannels = channels.filter(c => {
    if (type === 'whatsapp') {
      return c.channel_type === 'whatsapp' || c.channel_type === 'baileys' || c.status === 'mock';
    }
    return c.channel_type === 'email' || c.status === 'mock';
  });

  if (!mounted) return null;

  return (
    <div className="w-full p-8 grid grid-cols-12 gap-8 select-none font-sans text-black bg-white min-h-[calc(100vh-4rem)] animate-fade-in flex-1 overflow-y-auto">
      
      {/* LEFT COLUMN: GENERAL SETTINGS */}
      <div className="col-span-12 lg:col-span-4 border-r border-[#E8E8E6] pr-8 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-wider mb-1">{t('wizard.basicSettings') || 'Configuration'}</h3>
          <p className="text-[11px] text-zinc-400 font-semibold uppercase leading-relaxed">{t('wizard.basicSettingsDesc')}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('templateName')}</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'whatsapp' ? 'e.g. customer_welcome_coupon' : 'e.g. Black Friday Promotion'}
              className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
              required
            />
            {type === 'whatsapp' && (
              <span className="text-[9px] text-zinc-400 font-medium block">
                * WhatsApp templates names must be lowercase, alphanumeric, and contain no spaces.
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('type')}</label>
              <DropdownSelect
                value={type}
                onChange={(val) => {
                  setType(val);
                  setChannelConnectionId('');
                }}
                options={[
                  { value: 'whatsapp', label: 'WhatsApp API' },
                  { value: 'email', label: 'Email HTML' }
                ]}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('category')}</label>
              <DropdownSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={[
                  { value: 'utility', label: t('utility') },
                  { value: 'marketing', label: t('marketing') },
                  { value: 'authentication', label: t('authentication') }
                ]}
              />
            </div>
          </div>

          {type === 'whatsapp' && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('language')}</label>
              <DropdownSelect
                value={language}
                onChange={(val) => setLanguage(val)}
                options={[
                  { value: 'en_US', label: 'English (US)' },
                  { value: 'en_GB', label: 'English (UK)' },
                  { value: 'es_ES', label: 'Spanish (Spain)' },
                  { value: 'pt_BR', label: 'Portuguese (Brazil)' }
                ]}
              />
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('wizard.channelLabel')}</label>
            <DropdownSelect
              value={channelConnectionId}
              onChange={(val) => setChannelConnectionId(val)}
              placeholder={t('selectConnectionChannel')}
              options={filteredChannels.map(c => ({
                value: c.id.toString(),
                label: `[${c.channel_type.toUpperCase()}] ${c.name}`
              }))}
            />
          </div>
        </div>
      </div>

      {/* CENTER & RIGHT COLUMN: WORKSPACE */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

        {/* 1. WHATSAPP DESIGN WORKSPACE */}
        {type === 'whatsapp' && (
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* WhatsApp Composer */}
            <div className="col-span-7 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-wider mb-1">{t('whatsAppComposer')}</h3>
                <p className="text-[11px] text-zinc-400 font-semibold uppercase leading-relaxed">{t('whatsAppComposerDesc')}</p>
              </div>

              <div className="space-y-5">
                {/* Header text */}
                <div className="space-y-2 border-b border-[#E8E8E6] pb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('templateHeader')}</label>
                    <select
                      value={waHeaderType}
                      onChange={(e) => setWaHeaderType(e.target.value as any)}
                      className="text-[10.5px] border border-zinc-200 bg-white font-bold tracking-tight rounded-md px-2 py-1 focus:outline-none"
                    >
                      <option value="none">None</option>
                      <option value="text">{t('textTitle')}</option>
                    </select>
                  </div>
                  {waHeaderType === 'text' && (
                    <input
                      type="text"
                      value={waHeaderText}
                      onChange={(e) => setWaHeaderText(e.target.value)}
                      placeholder={t('confirmedEmojiPlaceholder')}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                    />
                  )}
                </div>

                {/* Body Text */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('bodyTextComposerLabel')}</label>
                  <textarea
                    value={waBodyText}
                    onChange={(e) => setWaBodyText(e.target.value)}
                    placeholder={t('bodyTextComposerPlaceholder')}
                    className="w-full min-h-[120px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-y leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-400 font-semibold uppercase">
                    <span>* Limit: 1024 characters</span>
                    <button
                      type="button"
                      onClick={() => setWaBodyText(prev => prev + ` {{${(prev.match(/\{\{\d\}\}/g) || []).length + 1}}}`)}
                      className="text-black hover:underline cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <Code className="h-3 w-3" />
                      {t('addParamVariable')}
                    </button>
                  </div>
                </div>

                {/* Footer text */}
                <div className="space-y-1.5 border-b border-[#E8E8E6] pb-4">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('footerTextLabel')}</label>
                  <input
                    type="text"
                    value={waFooterText}
                    onChange={(e) => setWaFooterText(e.target.value)}
                    placeholder={t('optOutPlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                  />
                </div>

                {/* Buttons block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('actionButtonsLabel')}</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddWaButton('quick_reply')}
                        className="text-[9.5px] font-bold border border-zinc-200 hover:bg-zinc-50 rounded p-1 cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Quick Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddWaButton('url')}
                        className="text-[9.5px] font-bold border border-zinc-200 hover:bg-zinc-50 rounded p-1 cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Website URL
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {waButtons.map((btn, index) => (
                      <div key={btn.id} className="flex flex-col gap-2.5 p-3.5 border border-[#E8E8E6] bg-[#FAFAFA] rounded-md animate-row-fade relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveWaButton(btn.id)}
                          className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-bold bg-zinc-200/60 border border-zinc-250 text-zinc-650 px-2 py-0.5 rounded-[4px] uppercase tracking-wider select-none">
                            {btn.type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">{t('buttonLabel')}</label>
                            <input
                              type="text"
                              value={btn.text}
                              onChange={(e) => handleUpdateWaButton(btn.id, 'text', e.target.value)}
                              className="w-full h-8 px-2 bg-white border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-semibold"
                            />
                          </div>
                          {btn.type === 'url' && (
                            <div className="space-y-1">
                              <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">{t('targetUrl')}</label>
                              <input
                                type="text"
                                value={btn.url || ''}
                                onChange={(e) => handleUpdateWaButton(btn.id, 'url', e.target.value)}
                                className="w-full h-8 px-2 bg-white border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-semibold"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live WhatsApp Mockup Preview */}
            <div className="col-span-5 flex flex-col justify-start">
              <div className="border border-[#E8E8E6] rounded-xl p-4 bg-[#E8FDE8]/30 max-w-[280px] w-full self-center flex flex-col gap-3 shadow-sm select-none border-dashed pt-6 pb-6">
                <div className="flex items-center gap-1.5 text-zinc-400 border-b border-zinc-200/50 pb-2 mb-1 justify-center">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="text-[9.5px] font-bold uppercase tracking-widest">{t('realtimePreview')}</span>
                </div>

                {/* Message Bubble Simulator */}
                <div className="bg-white border border-[#E8E8E6] rounded-lg p-3.5 shadow-3xs flex flex-col gap-1 relative text-[11.5px] font-medium leading-relaxed max-w-[250px] w-full text-left self-center">
                  {waHeaderType === 'text' && waHeaderText.trim() && (
                    <div className="font-extrabold text-[12.5px] text-zinc-950 pb-1 block">{waHeaderText}</div>
                  )}
                  <div className="whitespace-pre-line text-zinc-800 break-words">{waBodyText}</div>
                  {waFooterText.trim() && (
                    <div className="text-[9.5px] text-zinc-400 font-semibold pt-1 uppercase tracking-tight block">{waFooterText}</div>
                  )}
                </div>

                {/* Action buttons simulator list */}
                {waButtons.map(btn => (
                  <div 
                    key={btn.id}
                    className="bg-white border border-[#E8E8E6] rounded-lg py-2.5 px-3 text-center text-xs font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1.5 shadow-3xs select-none max-w-[250px] w-full self-center cursor-pointer"
                  >
                    {btn.type === 'url' && <Link2 className="h-3.5 w-3.5 text-zinc-400" />}
                    <span>{btn.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. EMAIL DESIGN GRAPHICAL DRAG & DROP BUILDER */}
        {type === 'email' && (
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* Visual Builder Canvas */}
            <div className="col-span-8 space-y-4">
              <div className="flex items-center justify-between select-none">
                <div>
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-wider mb-1">{t('emailBuilder')}</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold uppercase leading-relaxed">{t('emailBuilderDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Merge Tags:</span>
                  <div className="flex gap-1.5 select-none">
                    <button
                      type="button"
                      onClick={() => insertMergeTag('{{ contact.first_name }}')}
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-[10px] font-bold text-zinc-800 cursor-pointer"
                    >
                      First Name
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMergeTag('{{ contact.email }}')}
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-[10px] font-bold text-zinc-800 cursor-pointer"
                    >
                      Email
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Workspace Canvas Wrapper */}
              <div className="border border-[#E8E8E6] rounded-xl p-6 bg-[#FAFAFA]/50 min-h-[420px] flex flex-col gap-4 overflow-y-auto">
                {emailBlocks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 text-xs font-bold uppercase select-none">
                    <span>{t('emailCanvasEmptyShort')}</span>
                  </div>
                ) : (
                  emailBlocks.map((block, index) => {
                    const isActive = activeBlockId === block.id;
                    return (
                      <div 
                        key={block.id}
                        onClick={() => setActiveBlockId(block.id)}
                        className={`p-4 border rounded-lg bg-white shadow-3xs transition-all relative group cursor-pointer ${
                          isActive 
                            ? 'border-zinc-950 ring-1 ring-zinc-950' 
                            : 'border-[#E8E8E6] hover:border-zinc-350'
                        }`}
                      >
                        {/* Control actions overlay (UP/DOWN/DELETE) */}
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1.5 bg-white border border-[#E8E8E6] rounded p-1 select-none shadow-3xs z-50">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-650 cursor-pointer"
                          >
                            <MoveUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-650 cursor-pointer"
                          >
                            <MoveDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Inline block content representation */}
                        <div className="text-left">
                          {block.type === 'header' && (
                            <input 
                              type="text"
                              value={block.content}
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              className="text-lg font-black text-zinc-950 w-full focus:outline-none border-b border-transparent focus:border-zinc-200 py-1"
                            />
                          )}
                          {block.type === 'paragraph' && (
                            <textarea
                              value={block.content}
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              className="text-xs text-zinc-600 w-full focus:outline-none border-b border-transparent focus:border-zinc-200 py-1 resize-y leading-relaxed font-semibold min-h-[50px]"
                            />
                          )}
                          {block.type === 'button' && (
                            <div className="flex flex-col gap-2.5 max-w-sm pt-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={block.content}
                                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                  className="px-3 py-1.5 bg-zinc-900 text-white rounded font-bold text-[11px] focus:outline-none uppercase tracking-wider text-center"
                                />
                                <span className="text-[10px] text-zinc-400 font-semibold select-none">Label</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={block.url || ''}
                                  onChange={(e) => updateBlockUrl(block.id, e.target.value)}
                                  placeholder={t('buttonRedirectionPlaceholder')}
                                  className="w-full px-2 py-1 bg-[#F5F5F5] border border-zinc-200 rounded text-[10px] focus:outline-none focus:border-black font-semibold"
                                />
                                <span className="text-[10px] text-zinc-400 font-semibold select-none">Link</span>
                              </div>
                            </div>
                          )}
                          {block.type === 'divider' && (
                            <div className="py-2">
                              <hr className="border-t border-zinc-200" />
                              <span className="text-[9px] text-zinc-400 font-bold block uppercase mt-1 select-none">{t('dividerLine')}</span>
                            </div>
                          )}
                          {block.type === 'image' && (
                            <div className="flex flex-col gap-2">
                              {block.src && (
                                <img src={block.src} alt="" className="max-h-[140px] object-cover rounded-md border" />
                              )}
                              <input 
                                type="text"
                                value={block.src || ''}
                                onChange={(e) => updateBlockSrc(block.id, e.target.value)}
                                placeholder={t('imageUrlPlaceholder')}
                                className="w-full px-2 py-1 bg-[#F5F5F5] border border-zinc-200 rounded text-[10px] focus:outline-none focus:border-black font-semibold"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Visual Builder Components Bar */}
            <div className="col-span-4 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-zinc-955 uppercase tracking-wider mb-2">{t('blockModules')}</h4>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase leading-relaxed">{t('clickToAddModules')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 select-none">
                <button
                  type="button"
                  onClick={() => addBlock('header')}
                  className="flex flex-col items-center justify-center p-4 border border-zinc-200 hover:border-zinc-350 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                >
                  <Heading className="h-5 w-5 mb-2 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('titleHeader')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('paragraph')}
                  className="flex flex-col items-center justify-center p-4 border border-zinc-200 hover:border-zinc-350 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                >
                  <AlignLeft className="h-5 w-5 mb-2 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('bodyText')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="flex flex-col items-center justify-center p-4 border border-zinc-200 hover:border-zinc-350 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                >
                  <ImageIcon className="h-5 w-5 mb-2 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('imageCard')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('button')}
                  className="flex flex-col items-center justify-center p-4 border border-zinc-200 hover:border-zinc-350 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                >
                  <Square className="h-5 w-5 mb-2 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('ctaButton')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('divider')}
                  className="flex flex-col items-center justify-center p-4 border border-zinc-200 hover:border-zinc-350 rounded-lg bg-white transition-all cursor-pointer shadow-3xs col-span-2"
                >
                  <Minus className="h-5 w-5 mb-2 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('horizontalDivider')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TEST SEND EMAIL MODAL OVERLAY */}
      {testSendOpen && templateId && (
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Send className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('sendTestTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestSendOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                Provide a test destination address to verify layout blocks rendering via connection's SMTP transport.
              </p>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('testEmailLabel')}</label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder={t('testEmailPlaceholder') || 'e.g. support@whatsomni.io'}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                  required
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setTestSendOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleTriggerTestSend}
                disabled={testSending || !testEmailAddress.trim()}
                className="h-9 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testSending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
                <span>{t('sendTestBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
