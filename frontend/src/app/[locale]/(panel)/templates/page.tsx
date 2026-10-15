'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { 
  X,
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  Settings2, 
  Send, 
  Sparkles, 
  FileText, 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  MoveUp,
  MoveDown,
  Heading,
  AlignLeft,
  Image as ImageIcon,
  Link2,
  Square,
  Minus,
  Code,
  Brain,
  Mail,
  Smartphone,
  MessageSquare,
  Globe,
  ShieldAlert,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  Copy
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useHeaderStore } from '@/store/useHeaderStore';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
}

interface MessageTemplate {
  id: number;
  name: string;
  type: string;
  category: string;
  language: string;
  status: string;
  meta_template_id: string | null;
  channel_connection_id: number | null;
  channel_connection?: ChannelConnection | null;
  content: any;
  created_at: string;
}

interface BlockItem {
  id: string;
  type: 'header' | 'paragraph' | 'image' | 'button' | 'divider';
  content: string;
  url?: string;
  src?: string;
}

interface ButtonItem {
  id: string;
  type: 'quick_reply' | 'url' | 'phone' | 'copy_code';
  text: string;
  url?: string;
  phone_number?: string;
  coupon_code?: string;
}

interface CarouselCardItem {
  id: string;
  header: {
    format: 'IMAGE' | 'VIDEO';
    media_url: string;
  };
  body: {
    text: string;
  };
  buttons: ButtonItem[];
}

export default function MessageTemplatesPage() {
  const t = useTranslations('Templates');
  const tContacts = useTranslations('ContactsDetail');

  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // View state: list, create, edit
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Test Send Email Modal state
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testSendTemplate, setTestSendTemplate] = useState<MessageTemplate | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Dialog Confirmation Portal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [submitMetaOpen, setSubmitMetaOpen] = useState(false);
  const [submitMetaTargetId, setSubmitMetaTargetId] = useState<number | null>(null);
  const [isHeaderSubmit, setIsHeaderSubmit] = useState(false);

  // Form Field States
  const [name, setName] = useState('');
  const [type, setType] = useState('whatsapp');
  const [category, setCategory] = useState('utility');
  const [language, setLanguage] = useState('en_US');
  const [channelConnectionId, setChannelConnectionId] = useState('');

  // 1. WhatsApp Template State
  const [waFormat, setWaFormat] = useState<'standard' | 'carousel'>('standard');
  const [waHeaderText, setWaHeaderText] = useState('');
  const [waBodyText, setWaBodyText] = useState('Hello {{1}}, welcome to WhatsOmni!');
  const [waFooterText, setWaFooterText] = useState('');
  const [waButtons, setWaButtons] = useState<ButtonItem[]>([]);

  // Carousel Cards State (2-10 cards per Meta specification)
  const [carouselCards, setCarouselCards] = useState<CarouselCardItem[]>([
    {
      id: 'c1',
      header: {
        format: 'IMAGE',
        media_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
      },
      body: {
        text: 'Smart Watch Series 9 — Discover cutting-edge performance.'
      },
      buttons: [
        { id: 'b1_1', type: 'quick_reply', text: 'Order Now' },
        { id: 'b1_2', type: 'url', text: 'View Catalog', url: 'https://whatsomni.io' }
      ]
    },
    {
      id: 'c2',
      header: {
        format: 'IMAGE',
        media_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
      },
      body: {
        text: 'Wireless Noise Cancelling Headphones with HD audio.'
      },
      buttons: [
        { id: 'b2_1', type: 'quick_reply', text: 'Order Now' },
        { id: 'b2_2', type: 'url', text: 'View Details', url: 'https://whatsomni.io' }
      ]
    }
  ]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [previewCardIndex, setPreviewCardIndex] = useState(0);

  // 2. Email Template (Drag & Drop Block Builder) State
  const [emailBlocks, setEmailBlocks] = useState<BlockItem[]>([
    { id: '1', type: 'header', content: 'Welcome to WhatsOmni' },
    { id: '2', type: 'paragraph', content: 'Hi {{ contact.first_name }}, we are thrilled to have you on board! Check out our visual template builder.' },
    { id: '3', type: 'button', content: 'Get Started Now', url: '{{ url }}' }
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const { setCustomHeader } = useHeaderStore();

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTestSendOpen(false);
        setDeleteConfirmOpen(false);
        setSubmitMetaOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync layout header overriding
  useEffect(() => {
    if (!mounted) return;

    if (view === 'list') {
      setCustomHeader(null);
    } else {
      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setView('list')}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {view === 'create' ? t('newTemplate') : t('editTemplate')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-8 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('cancel')}
            </button>

            {type === 'email' && view === 'edit' && (
              <button
                type="button"
                onClick={() => {
                  if (editingTemplate) {
                    setTestSendTemplate(editingTemplate);
                    setTestEmailAddress('');
                    setTestSendOpen(true);
                  }
                }}
                className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 h-8 px-3 text-xs font-bold rounded-md shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{t('testSend')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveTemplate(false)}
              disabled={isPending || (type === 'whatsapp' && (!editingTemplate || (editingTemplate.status !== 'approved' && editingTemplate.status !== 'ready')))}
              className="bg-[#0A0A0A] hover:bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>{view === 'edit' ? t('saveChanges') : t('deploy')}</span>
            </button>

            {type === 'whatsapp' && (
              <button
                type="button"
                onClick={() => handleSaveTemplate(true)}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed h-8 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('submitMeta')}</span>
              </button>
            )}
          </div>
        </header>
      );
    }

    return () => {
      setCustomHeader(null);
    };
  }, [
    mounted,
    view,
    type,
    name,
    category,
    language,
    channelConnectionId,
    waFormat,
    waHeaderText,
    waBodyText,
    waFooterText,
    waButtons,
    carouselCards,
    activeCardIndex,
    previewCardIndex,
    emailBlocks,
    isPending,
    editingTemplate
  ]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [templatesRes, channelsRes] = await Promise.all([
        fetchWithCsrf('/templates'),
        fetchWithCsrf('/channels')
      ]);

      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (channelsRes.ok) setChannels((await channelsRes.json()) || []);
    } catch {
      toast.error(t('details.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    const hasWhatsApp = channels.some(c => c.channel_type === 'whatsapp' || c.channel_type === 'baileys');
    setEditingTemplate(null);
    setName('');
    setType(hasWhatsApp ? 'whatsapp' : 'email');
    setWaFormat('standard');
    setCategory('utility');
    setLanguage('en_US');
    setChannelConnectionId('');
    setWaHeaderText('');
    setWaBodyText('Hello {{1}}, welcome to WhatsOmni!');
    setWaFooterText('');
    setWaButtons([]);
    setCarouselCards([
      {
        id: 'c1',
        header: {
          format: 'IMAGE',
          media_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
        },
        body: {
          text: 'Smart Watch Series 9 — Discover cutting-edge performance.'
        },
        buttons: [
          { id: 'b1_1', type: 'quick_reply', text: 'Order Now' },
          { id: 'b1_2', type: 'url', text: 'View Catalog', url: 'https://whatsomni.io' }
        ]
      },
      {
        id: 'c2',
        header: {
          format: 'IMAGE',
          media_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
        },
        body: {
          text: 'Wireless Noise Cancelling Headphones with HD audio.'
        },
        buttons: [
          { id: 'b2_1', type: 'quick_reply', text: 'Order Now' },
          { id: 'b2_2', type: 'url', text: 'View Details', url: 'https://whatsomni.io' }
        ]
      }
    ]);
    setActiveCardIndex(0);
    setPreviewCardIndex(0);
    setEmailBlocks([
      { id: '1', type: 'header', content: 'Welcome to WhatsOmni' },
      { id: '2', type: 'paragraph', content: 'Hi {{ contact.first_name }}, we are thrilled to have you on board! Check out our visual template builder.' },
      { id: '3', type: 'button', content: 'Get Started Now', url: '{{ url }}' }
    ]);
    setActiveBlockId(null);
    setView('create');
  };

  const handleOpenEditForm = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setName(template.name || '');
    setType(template.type || 'whatsapp');
    setCategory(template.category || 'utility');
    setLanguage(template.language || 'en_US');
    setChannelConnectionId(template.channel_connection_id?.toString() || '');

    const content = template.content || {};
    if (template.type === 'whatsapp') {
      const isCarousel = content.format === 'carousel' || (content.carousel?.cards && content.carousel.cards.length > 0);
      if (isCarousel) {
        setWaFormat('carousel');
        setWaBodyText(content.body?.text || 'Explore our latest collection below:');
        if (content.carousel?.cards && Array.isArray(content.carousel.cards) && content.carousel.cards.length > 0) {
          setCarouselCards(content.carousel.cards.map((c: any, i: number) => ({
            id: c.id || `c_${i + 1}`,
            header: {
              format: (c.header?.format === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
              media_url: c.header?.media_url || c.header?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
            },
            body: {
              text: c.body?.text || `Featured Item #${i + 1}`
            },
            buttons: (Array.isArray(c.buttons) ? c.buttons : []).map((btn: any, bi: number) => ({
              ...btn,
              id: btn.id || `card_btn_${i + 1}_${bi + 1}_${Math.random().toString(36).substring(2, 7)}`
            }))
          })));
        }
        setActiveCardIndex(0);
        setPreviewCardIndex(0);
      } else {
        setWaFormat('standard');
        if (content.header) {
          setWaHeaderText(content.header.text || '');
        } else {
          setWaHeaderText('');
        }
        if (content.body) {
          setWaBodyText(content.body.text || '');
        } else {
          setWaBodyText('');
        }
        if (content.footer) {
          setWaFooterText(content.footer.text || '');
        } else {
          setWaFooterText('');
        }
        const rawButtons = Array.isArray(content.buttons) ? content.buttons : [];
        setWaButtons(rawButtons.map((btn: any, bi: number) => ({
          ...btn,
          id: btn.id || `wa_btn_${bi + 1}_${Math.random().toString(36).substring(2, 7)}`
        })));
      }
    } else {
      const rawBlocks = Array.isArray(content.blocks) ? content.blocks : [];
      setEmailBlocks(rawBlocks.map((b: any, bi: number) => ({
        ...b,
        id: b.id || `email_block_${bi + 1}_${Math.random().toString(36).substring(2, 7)}`
      })));
    }

    setView('edit');
  };

  const handleSaveTemplate = (submitMeta = false) => {
    if (!name.trim()) {
      toast.error(t('validationName'));
      return;
    }

    if (submitMeta) {
      setIsHeaderSubmit(true);
      setSubmitMetaOpen(true);
      return;
    }

    executeHeaderSave(false);
  };

  const executeHeaderSaveSubmitMeta = () => {
    executeHeaderSave(true);
  };

  const executeHeaderSave = (submitMeta: boolean) => {
    // Format WhatsApp slug name
    let formattedName = name;
    if (type === 'whatsapp') {
      formattedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    let templateContent: any = {};
    if (type === 'whatsapp') {
      if (waFormat === 'carousel') {
        if (carouselCards.length < 2) {
          toast.error(t('carouselMinCards') || 'Carousel templates require at least 2 cards.');
          return;
        }
        const hasEmptyCard = carouselCards.some(c => !c.body.text.trim());
        if (hasEmptyCard) {
          toast.error(t('carouselCardValidation') || 'All carousel cards must have body text.');
          return;
        }
        templateContent = {
          format: 'carousel',
          body: { text: waBodyText },
          carousel: {
            cards: carouselCards
          }
        };
      } else {
        templateContent = {
          header: waHeaderText.trim() ? { text: waHeaderText } : null,
          body: { text: waBodyText },
          footer: waFooterText ? { text: waFooterText } : null,
          buttons: waButtons
        };
      }
    } else {
      templateContent = {
        blocks: emailBlocks
      };
    }

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
        const url = editingTemplate ? `/templates/${editingTemplate.id}` : '/templates';
        const method = editingTemplate ? 'PUT' : 'POST';

        const res = await fetchWithCsrf(url, {
          method,
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const savedTemplate = await res.json();
          const targetId = editingTemplate ? editingTemplate.id : savedTemplate.id;

          if (submitMeta && type === 'whatsapp') {
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
            toast.success(editingTemplate ? t('updateSuccess') : t('saveDraftSuccess'));
          }

          setView('list');
          loadAllData();
        } else {
          const err = await res.json();
          toast.error(err.message || t('saveFailed'));
        }
      } catch {
        toast.error(t('saveNetworkError'));
      }
    });
  };

  const handleDeleteTemplate = (id: number) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteTemplate = () => {
    if (!deleteTargetId) return;
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/templates/${deleteTargetId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success(t('deleteSuccess'));
          loadAllData();
          if (editingTemplate && editingTemplate.id === deleteTargetId) {
            setView('list');
            setCustomHeader(null);
          }
        } else {
          toast.error(t('deleteFailed'));
        }
      } catch {
        toast.error(t('deleteNetworkError'));
      } finally {
        setDeleteConfirmOpen(false);
        setDeleteTargetId(null);
      }
    });
  };

  const handleSubmitToMeta = (id: number) => {
    setIsHeaderSubmit(false);
    setSubmitMetaTargetId(id);
    setSubmitMetaOpen(true);
  };

  const executeRowSubmitMeta = () => {
    if (!submitMetaTargetId) return;
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/templates/${submitMetaTargetId}/submit-whatsapp`, {
          method: 'POST'
        });

        if (res.ok) {
          toast.success(t('submitSuccess'));
          loadAllData();
        } else {
          const err = await res.json();
          toast.error(err.message || t('submitFailed'));
        }
      } catch {
        toast.error(t('submitNetworkError'));
      } finally {
        setSubmitMetaOpen(false);
        setSubmitMetaTargetId(null);
      }
    });
  };

  const handleOpenTestSend = (template: MessageTemplate) => {
    setTestSendTemplate(template);
    setTestEmailAddress('');
    setTestSendOpen(true);
  };

  const handleTriggerTestSend = async () => {
    if (!testSendTemplate || !testEmailAddress.trim()) return;
    setTestSending(true);

    try {
      const res = await fetchWithCsrf(`/templates/${testSendTemplate.id}/test-send-email`, {
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

  // WhatsApp Button Config Helpers (Standard Single Message - Supports Mixed Sets up to 10 buttons)
  const handleAddWaButton = (btnType: 'quick_reply' | 'url' | 'phone' | 'copy_code') => {
    if (waButtons.length >= 10) {
      toast.error(t('toastMaxTotalButtons') || 'Meta templates support a maximum of 10 total buttons.');
      return;
    }

    const quickReplyCount = waButtons.filter(b => b.type === 'quick_reply').length;
    const urlCount = waButtons.filter(b => b.type === 'url').length;
    const phoneCount = waButtons.filter(b => b.type === 'phone').length;
    const copyCodeCount = waButtons.filter(b => b.type === 'copy_code').length;

    if (btnType === 'quick_reply' && quickReplyCount >= 3) {
      toast.error(t('toastMaxQuickReply') || 'Maximum 3 quick reply buttons allowed.');
      return;
    }
    if (btnType === 'url' && urlCount >= 2) {
      toast.error(t('toastMaxUrl') || 'Maximum 2 URL buttons allowed.');
      return;
    }
    if (btnType === 'phone' && phoneCount >= 1) {
      toast.error(t('toastMaxPhone') || 'Maximum 1 phone number button allowed.');
      return;
    }
    if (btnType === 'copy_code' && copyCodeCount >= 1) {
      toast.error(t('toastMaxCopyCode') || 'Maximum 1 copy code button allowed.');
      return;
    }

    const newBtn: ButtonItem = {
      id: uniqId(),
      type: btnType,
      text: btnType === 'quick_reply' 
        ? 'Quick Reply' 
        : btnType === 'url' 
        ? 'Visit Website' 
        : btnType === 'phone' 
        ? 'Call Support' 
        : 'Copy Promo Code',
      url: btnType === 'url' ? 'https://example.com' : undefined,
      phone_number: btnType === 'phone' ? '+15551234567' : undefined,
      coupon_code: btnType === 'copy_code' ? 'PROMO20' : undefined
    };
    setWaButtons([...waButtons, newBtn]);
  };

  const handleUpdateWaButton = (id: string, field: keyof ButtonItem, val: string) => {
    setWaButtons(waButtons.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const handleRemoveWaButton = (id: string) => {
    setWaButtons(waButtons.filter(b => b.id !== id));
  };

  // Carousel Card Helper Functions
  const handleAddCarouselCard = () => {
    if (carouselCards.length >= 10) {
      toast.error(t('carouselMaxCards') || 'Meta supports a maximum of 10 carousel cards.');
      return;
    }
    const newCard: CarouselCardItem = {
      id: uniqId(),
      header: {
        format: 'IMAGE',
        media_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80'
      },
      body: {
        text: `Product Card #${carouselCards.length + 1}`
      },
      buttons: [
        { id: uniqId(), type: 'quick_reply', text: 'Select Option' }
      ]
    };
    const updated = [...carouselCards, newCard];
    setCarouselCards(updated);
    setActiveCardIndex(updated.length - 1);
    setPreviewCardIndex(updated.length - 1);
  };

  const handleRemoveCarouselCard = (index: number) => {
    if (carouselCards.length <= 2) {
      toast.error(t('carouselMinCards') || 'Carousel templates require at least 2 cards.');
      return;
    }
    const updated = carouselCards.filter((_, i) => i !== index);
    setCarouselCards(updated);
    if (activeCardIndex >= updated.length) {
      setActiveCardIndex(Math.max(0, updated.length - 1));
    }
    if (previewCardIndex >= updated.length) {
      setPreviewCardIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleUpdateCardHeader = (index: number, format: 'IMAGE' | 'VIDEO', media_url: string) => {
    setCarouselCards(prev => prev.map((card, i) => i === index ? {
      ...card,
      header: { format, media_url }
    } : card));
  };

  const handleUpdateCardBody = (index: number, text: string) => {
    setCarouselCards(prev => prev.map((card, i) => i === index ? {
      ...card,
      body: { text }
    } : card));
  };

  const handleAddCardButton = (cardIndex: number, btnType: 'quick_reply' | 'url' | 'phone') => {
    const card = carouselCards[cardIndex];
    if (!card) return;
    if ((card.buttons || []).length >= 2) {
      toast.error(t('carouselMaxButtons') || 'Meta supports a maximum of 2 action buttons per card.');
      return;
    }
    const newBtn: ButtonItem = {
      id: uniqId(),
      type: btnType,
      text: btnType === 'quick_reply' ? 'Quick Reply' : btnType === 'url' ? 'Visit Link' : 'Call Now',
      url: btnType === 'url' ? 'https://whatsomni.io' : undefined,
      phone_number: btnType === 'phone' ? '+15551234567' : undefined
    };
    setCarouselCards(prev => prev.map((c, i) => i === cardIndex ? {
      ...c,
      buttons: [...(c.buttons || []), newBtn]
    } : c));
  };

  const handleUpdateCardButton = (cardIndex: number, btnId: string, field: keyof ButtonItem, val: string) => {
    setCarouselCards(prev => prev.map((card, i) => i === cardIndex ? {
      ...card,
      buttons: (card.buttons || []).map(b => b.id === btnId ? { ...b, [field]: val } : b)
    } : card));
  };

  const handleRemoveCardButton = (cardIndex: number, btnId: string) => {
    setCarouselCards(prev => prev.map((card, i) => i === cardIndex ? {
      ...card,
      buttons: (card.buttons || []).filter(b => b.id !== btnId)
    } : card));
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
    
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    setEmailBlocks(newBlocks);
  };

  const insertMergeTag = (tag: string) => {
    if (!activeBlockId) {
      toast.warning(t('toastSelectBlockMerge'));
      return;
    }
    setEmailBlocks(emailBlocks.map(b => {
      if (b.id === activeBlockId) {
        return { ...b, content: b.content + ' ' + tag };
      }
      return b;
    }));
  };

  const uniqId = () => Math.random().toString(36).substring(2, 9);

  const getChannelLogo = (channelType: string) => {
    const normalized = channelType.toLowerCase();
    if (normalized.includes('whatsapp') || normalized.includes('baileys')) return '/channels/whatsapp.webp';
    if (normalized.includes('email')) return '/channels/smtp.svg';
    return null;
  };
  const hasWhatsAppChannel = channels.some(c => c.channel_type === 'whatsapp' || c.channel_type === 'baileys');

  // Filter list
  const filteredTemplates = templates.filter(t => {
    return t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredChannels = channels.filter(c => {
    if (type === 'whatsapp') {
      return c.channel_type === 'whatsapp' || c.channel_type === 'baileys' || c.status === 'mock';
    }
    return c.channel_type === 'email' || c.status === 'mock';
  });

  const keywordChips = ['{{ contact.first_name }}', '{{ contact.email }}'];

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col min-h-0 flex-1">
      
      {/* 1. LIST VIEW */}
      {view === 'list' && (
        <div className="w-full p-8 space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
            
            {/* Search */}
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-[6px] text-xs font-medium placeholder-zinc-400 focus:outline-none focus:border-zinc-955 bg-white"
                />
              </div>

              <button 
                onClick={loadAllData}
                className="flex items-center justify-center p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Create Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('deployTemplate')}</span>
              </button>
            </div>
          </div>

          {/* Unified Listing Table */}
          {loading ? (
            <div className="py-12">
              <SimpleLoader message={t('details.syncing') || 'Syncing templates database...'} />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none shadow-3xs animate-fade-in">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noTemplates')}</h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {t('noTemplatesDesc')}
              </p>
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('deployTemplate')}</span>
              </button>
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                        <th className="px-6 py-3.5">{t('templateName')}</th>
                        <th className="px-6 py-3.5">{t('type')}</th>
                        <th className="px-6 py-3.5">{t('category')}</th>
                        <th className="px-6 py-3.5">{t('language')}</th>
                        <th className="px-6 py-3.5">{t('status')}</th>
                        <th className="px-6 py-3.5 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6] text-zinc-750">
                      {filteredTemplates.map((template) => {
                        return (
                          <tr key={template.id} className="hover:bg-[#FAFAFA]/70 transition-all font-semibold">
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleOpenEditForm(template)}
                                className="text-xs font-black text-zinc-955 hover:underline cursor-pointer text-left"
                              >
                                {template.name}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-800 font-semibold">
                                {template.type === 'whatsapp' ? (
                                  <>
                                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>WhatsApp</span>
                                    {template.content?.format === 'carousel' || Boolean(template.content?.carousel?.cards?.length) ? (
                                      <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-tight">
                                        <Layers className="h-2.5 w-2.5" />
                                        Carousel
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-tight">
                                        Standard
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
                                    <span>Email</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-700 font-semibold capitalize">
                                {(() => {
                                  const cat = (template.category || 'marketing').toLowerCase();
                                  if (cat === 'utility') {
                                    return (
                                      <>
                                        <Settings2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <span>{t('utility')}</span>
                                      </>
                                    );
                                  } else if (cat === 'authentication') {
                                    return (
                                      <>
                                        <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <span>{t('authentication')}</span>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        <span>{t('marketing')}</span>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {template.type === 'whatsapp' ? (
                                <div className="inline-flex items-center gap-1.5 text-xs text-zinc-700 font-semibold uppercase">
                                  <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                  <span>{template.language || 'en_US'}</span>
                                </div>
                              ) : (
                                <span className="text-zinc-400 font-semibold text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const status = template.status.toLowerCase();
                                if (status === 'approved' || status === 'ready') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 uppercase tracking-wider">
                                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                                      {t('approved')}
                                    </span>
                                  );
                                }
                                if (status === 'pending') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-150 uppercase tracking-wider">
                                      <Clock className="h-3 w-3 shrink-0" />
                                      {t('pending')}
                                    </span>
                                  );
                                }
                                if (status === 'rejected') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-150 uppercase tracking-wider">
                                      <AlertCircle className="h-3 w-3 shrink-0" />
                                      {t('rejected')}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 border border-zinc-200 uppercase tracking-wider">
                                    {t('draft')}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {template.type === 'whatsapp' && template.status === 'draft' && (
                                  <button
                                    onClick={() => handleSubmitToMeta(template.id)}
                                    className="px-2 py-1 bg-zinc-955 text-white text-[10px] font-bold rounded hover:bg-zinc-900 cursor-pointer shadow-3xs inline-flex items-center gap-1"
                                    title={t('submitMetaTitle')}
                                  >
                                    <Send className="h-2.5 w-2.5" />
                                    {t('submitMeta')}
                                  </button>
                                )}
                                {template.type === 'email' && (
                                  <button
                                    onClick={() => handleOpenTestSend(template)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                    title={t('sendTestEmailTitle')}
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenEditForm(template)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                  title={t('editTemplateContent')}
                                >
                                  <Settings2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title={t('deleteTemplate')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
          )}
        </div>
      )}

      {/* 2. FORM VIEW (IN-PLACE WORKSPACE COMPOSER) */}
      {view !== 'list' && (
        <div className="w-full bg-white select-none animate-fade-in">
          
          <div className="w-full">
            
            {/* Section 1: Basic Template settings */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.basicSettings')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('wizard.basicSettingsDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('templateName')}</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'whatsapp' ? 'e.g. coupon_welcome_code' : 'e.g. Weekly Product Updates'}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                    required
                  />
                </div>

                {view === 'create' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('type')}</label>
                    <div className="grid grid-cols-4 gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          if (!hasWhatsAppChannel) {
                            toast.error(t('toastWhatsappNotConfigured'));
                            return;
                          }
                          setType('whatsapp');
                          setChannelConnectionId('');
                        }}
                        className={`flex flex-col items-center justify-center p-4 border rounded-[6px] transition-all cursor-pointer ${
                          type === 'whatsapp'
                            ? 'bg-zinc-50 border-zinc-955 ring-1 ring-zinc-955 text-zinc-955 font-bold shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-350 text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <img src="/channels/whatsapp.webp" alt="WhatsApp" className="h-6 w-6 object-contain mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Whatsapp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setType('email');
                          setChannelConnectionId('');
                        }}
                        className={`flex flex-col items-center justify-center p-4 border rounded-[6px] transition-all cursor-pointer ${
                          type === 'email'
                            ? 'bg-zinc-50 border-zinc-955 ring-1 ring-zinc-955 text-zinc-955 font-bold shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-350 text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Mail className="h-6 w-6 mb-2 text-zinc-700" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('category')}</label>
                    <DropdownSelect
                      value={category}
                      onChange={(val: string) => setCategory(val)}
                      options={[
                        { value: 'utility', label: t('utility') },
                        { value: 'marketing', label: t('marketing') },
                        { value: 'authentication', label: t('authentication') }
                      ]}
                    />
                  </div>

                  {type === 'whatsapp' ? (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('language')}</label>
                      <DropdownSelect
                        value={language}
                        onChange={(val: string) => setLanguage(val)}
                        options={[
                          { value: 'en_US', label: 'English (US)' },
                          { value: 'en_GB', label: 'English (UK)' },
                          { value: 'es_ES', label: 'Spanish' },
                          { value: 'pt_BR', label: 'Portuguese' }
                        ]}
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Composer Content Workspace */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('wizard.visualBuilderWorkspace')}</h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                    {type === 'whatsapp' ? 'Compose rich headers, footer texts, and interactive buttons.' : 'Drag, arrange, and edit custom HTML template blocks.'}
                  </p>
                </div>

                {type === 'whatsapp' && (
                  <>
                    {waFormat === 'carousel' ? (
                      <div className="flex flex-col max-w-[290px] w-full border border-[#E8E8E6] rounded-xl overflow-hidden bg-[#efeae2] p-4 shadow-sm select-none gap-3 animate-row-fade mt-4">
                        {/* Outbound intro bubble */}
                        <div className="bg-[#d9fdd3] text-zinc-900 rounded-lg rounded-tr-none p-3 shadow-3xs text-[11px] font-medium leading-relaxed max-w-[240px] w-full text-left self-end relative border border-[#e1f3d8] flex flex-col gap-1">
                          <div className="absolute right-[-6px] top-0 w-0 h-0 border-t-[6px] border-t-[#d9fdd3] border-r-[6px] border-r-transparent" />
                          <div className="whitespace-pre-line break-words text-zinc-855 font-semibold">
                            {waBodyText || 'Explore our collection below:'}
                          </div>
                          <div className="flex items-center justify-end gap-0.5 text-[8px] text-zinc-400 font-bold self-end mt-0.5">
                            <span>12:00 PM</span>
                            <span className="text-sky-500">✓✓</span>
                          </div>
                        </div>

                        {/* Interactive Horizontal Carousel Swiper Card */}
                        {carouselCards.length > 0 && (
                          <div className="flex flex-col gap-2 max-w-[250px] w-full self-end">
                            {(() => {
                              const currentCard = carouselCards[previewCardIndex] || carouselCards[0];
                              return (
                                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-sm flex flex-col transition-all text-left">
                                  {/* Card Media Header */}
                                  <div className="relative w-full h-32 bg-zinc-100 overflow-hidden group">
                                    {currentCard.header.format === 'VIDEO' ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white relative">
                                        <Video className="h-8 w-8 text-zinc-400" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-1">{t('videoHeader')}</span>
                                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold uppercase">VIDEO</span>
                                      </div>
                                    ) : (
                                      <>
                                        <img 
                                          src={currentCard.header.media_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'} 
                                          alt="" 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
                                          }}
                                        />
                                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold uppercase">IMAGE</span>
                                      </>
                                    )}
                                    
                                    {/* Carousel Index Badge */}
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[8.5px] font-bold tracking-tight">
                                      {previewCardIndex + 1} / {carouselCards.length}
                                    </div>
                                  </div>

                                  {/* Card Body Text */}
                                  <div className="p-3 text-[11px] font-semibold text-zinc-800 leading-snug border-b border-zinc-100 min-h-[48px]">
                                    {currentCard.body.text || <span className="text-zinc-400 italic">{t('cardBodyPlaceholder')}</span>}
                                  </div>

                                  {/* Card Buttons */}
                                  {currentCard.buttons && currentCard.buttons.length > 0 && (
                                    <div className="divide-y divide-zinc-100">
                                      {currentCard.buttons.map((btn, btnIdx) => (
                                        <div 
                                          key={btn.id || `preview_card_btn_${btnIdx}`}
                                          className="py-2 px-3 text-center text-[10.5px] font-bold text-emerald-700 hover:bg-zinc-50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                        >
                                          {btn.type === 'url' && <Link2 className="h-3 w-3 text-emerald-600" />}
                                          {btn.type === 'phone' && <Phone className="h-3 w-3 text-emerald-600" />}
                                          {btn.type === 'quick_reply' && <MessageSquare className="h-3 w-3 text-emerald-600" />}
                                          <span className="truncate">{btn.text || 'Button'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Carousel Navigation Controller Controls */}
                            <div className="flex items-center justify-between pt-1 px-1 text-zinc-600">
                              <button
                                type="button"
                                onClick={() => setPreviewCardIndex(prev => Math.max(0, prev - 1))}
                                disabled={previewCardIndex === 0}
                                className="p-1 rounded-full bg-white/80 hover:bg-white border border-zinc-200/80 disabled:opacity-30 disabled:cursor-not-allowed shadow-3xs cursor-pointer transition-all"
                                title={t('prevCard')}
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>

                              <div className="flex items-center gap-1">
                                {carouselCards.map((_, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewCardIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                      previewCardIndex === idx ? 'w-4 bg-emerald-600' : 'w-1.5 bg-zinc-400/60 hover:bg-zinc-500'
                                    }`}
                                  />
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => setPreviewCardIndex(prev => Math.min(carouselCards.length - 1, prev + 1))}
                                disabled={previewCardIndex === carouselCards.length - 1}
                                className="p-1 rounded-full bg-white/80 hover:bg-white border border-zinc-200/80 disabled:opacity-30 disabled:cursor-not-allowed shadow-3xs cursor-pointer transition-all"
                                title={t('nextCard')}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col max-w-[270px] w-full border border-[#E8E8E6] rounded-xl overflow-hidden bg-[#efeae2] p-5 shadow-sm select-none gap-3 animate-row-fade mt-4">
                        {/* Outbound light-green WhatsApp message bubble */}
                        <div className="bg-[#d9fdd3] text-zinc-900 rounded-lg rounded-tr-none p-3 shadow-3xs text-[11px] font-medium leading-relaxed max-w-[220px] w-full text-left self-end relative border border-[#e1f3d8] flex flex-col gap-1">
                          {/* Triangle Tail pointing right */}
                          <div className="absolute right-[-6px] top-0 w-0 h-0 border-t-[6px] border-t-[#d9fdd3] border-r-[6px] border-r-transparent" />
                          
                          {waHeaderText.trim() && (
                            <div className="font-extrabold text-[11.5px] text-zinc-955 pb-0.5 block border-b border-zinc-200/20">{waHeaderText}</div>
                          )}
                          <div className="whitespace-pre-line break-words text-zinc-855 font-semibold">{waBodyText}</div>
                          {waFooterText.trim() && (
                            <div className="text-[8.5px] text-zinc-400 font-bold pt-0.5 uppercase tracking-wide block">{waFooterText}</div>
                          )}

                          {/* Meta indicators: time + double check ticks */}
                          <div className="flex items-center justify-end gap-0.5 text-[8px] text-zinc-400 font-bold self-end mt-1">
                            <span>12:00 PM</span>
                            <span className="text-sky-500">✓✓</span>
                          </div>
                        </div>

                        {/* Action buttons list */}
                        {waButtons.length > 0 && (
                          <div className="flex flex-col gap-1.5 max-w-[220px] w-full self-end -mt-2">
                            {waButtons.map((btn, btnIdx) => (
                              <div 
                                key={btn.id || `wa_preview_btn_${btnIdx}`}
                                className="bg-white border border-[#E8E8E6]/60 rounded-md py-1.5 px-3 text-center text-[10.5px] font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer select-none"
                              >
                                {btn.type === 'url' && <Link2 className="h-3 w-3 text-sky-500" />}
                                {btn.type === 'phone' && <Phone className="h-3 w-3 text-emerald-500" />}
                                {btn.type === 'copy_code' && <Copy className="h-3 w-3 text-purple-500" />}
                                {btn.type === 'quick_reply' && <MessageSquare className="h-3 w-3 text-zinc-400" />}
                                <span>{btn.text || (btn.type === 'copy_code' ? (btn.coupon_code ? `Code: ${btn.coupon_code}` : 'Copy Code') : 'Button')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {type === 'email' && (
                  <div className="space-y-4 pt-2 select-none animate-row-fade">
                    <div className="border-b border-[#E8E8E6] pb-2 mb-2">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{t('blockModules')}</h4>
                      <span className="text-[9px] text-zinc-400 font-semibold uppercase">{t('injectLayoutComponents')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => addBlock('header')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                      >
                        <Heading className="h-4.5 w-4.5 mb-1.5 text-zinc-500" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('titleHeader')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('paragraph')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                      >
                        <AlignLeft className="h-4.5 w-4.5 mb-1.5 text-zinc-500" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('bodyText')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('image')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                      >
                        <ImageIcon className="h-4.5 w-4.5 mb-1.5 text-zinc-500" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('imageCard')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('button')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-lg bg-white transition-all cursor-pointer shadow-3xs"
                      >
                        <Square className="h-4.5 w-4.5 mb-1.5 text-zinc-500" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('ctaButton')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('divider')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-lg bg-white transition-all cursor-pointer shadow-3xs col-span-2"
                      >
                        <Minus className="h-4.5 w-4.5 mb-1.5 text-zinc-500" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('horizontalDivider')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                
                {/* WHATSAPP SUB-COMPOSER */}
                {type === 'whatsapp' && (
                  <div className="space-y-6 w-full animate-fade-in text-left">
                    {/* Format Selector: Standard vs Carousel */}
                    <div className="space-y-1.5 border-b border-[#E8E8E6] pb-4">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('format') || 'Template Format'}</label>
                      <div className="grid grid-cols-2 gap-3 select-none">
                        <button
                          type="button"
                          onClick={() => setWaFormat('standard')}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            waFormat === 'standard'
                              ? 'bg-zinc-50 border-black ring-1 ring-black text-black shadow-3xs'
                              : 'bg-white border-[#E8E8E6] hover:border-zinc-300 text-zinc-600'
                          }`}
                        >
                          <div className="h-7 w-7 rounded bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 mt-0.5">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{t('standard') || 'Standard Template'}</span>
                            <span className="text-[10px] text-zinc-400 font-medium leading-tight block mt-0.5">{t('standardDesc') || 'Single message with optional header & buttons'}</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWaFormat('carousel')}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            waFormat === 'carousel'
                              ? 'bg-zinc-50 border-black ring-1 ring-black text-black shadow-3xs'
                              : 'bg-white border-[#E8E8E6] hover:border-zinc-300 text-zinc-600'
                          }`}
                        >
                          <div className="h-7 w-7 rounded bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 mt-0.5">
                            <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{t('carousel') || 'Carousel Template'}</span>
                            <span className="text-[10px] text-zinc-400 font-medium leading-tight block mt-0.5">{t('carouselDesc') || 'Multi-card swiper (2-10 cards) with media headers'}</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* CAROUSEL TEMPLATE BUILDER */}
                    {waFormat === 'carousel' ? (
                      <div className="space-y-5 animate-fade-in">
                        {/* Carousel Introduction Body */}
                        <div className="space-y-1.5 border-b border-[#E8E8E6] pb-4">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                            {t('carouselIntroLabel') || 'Introduction Message (Body Text)'}
                          </label>
                          <textarea
                            value={waBodyText}
                            onChange={(e) => setWaBodyText(e.target.value)}
                            placeholder={t('carouselIntroPlaceholder') || 'Enter an introductory message displayed above the carousel cards...'}
                            className="w-full min-h-[70px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-y leading-relaxed"
                          />
                        </div>

                        {/* Carousel Cards Management */}
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                {t('cards') || 'Carousel Cards'}
                              </label>
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[9px] font-extrabold tracking-wider uppercase border border-zinc-200">
                                {carouselCards.length} / 10 Cards
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddCarouselCard}
                              disabled={carouselCards.length >= 10}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#0A0A0A] hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{t('addCard') || 'Add Card'}</span>
                            </button>
                          </div>

                          {/* Horizontal Card Tabs Strip */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                            {carouselCards.map((card, idx) => {
                              const isActive = activeCardIndex === idx;
                              return (
                                <div
                                  key={card.id || `carousel_card_${idx}`}
                                  onClick={() => {
                                    setActiveCardIndex(idx);
                                    setPreviewCardIndex(idx);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                    isActive
                                      ? 'bg-black text-white border-black shadow-3xs'
                                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                                  }`}
                                >
                                  <span>Card {idx + 1}</span>
                                  {carouselCards.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCarouselCard(idx);
                                      }}
                                      className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors cursor-pointer ${
                                        isActive ? 'text-zinc-400' : 'text-zinc-400'
                                      }`}
                                      title={t('deleteCard') || 'Delete Card'}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Active Card Configuration Canvas */}
                          {carouselCards[activeCardIndex] && (
                            <div className="p-4 border border-[#E8E8E6] rounded-xl bg-white space-y-4 shadow-3xs animate-fade-in">
                              <div className="flex items-center justify-between border-b border-[#E8E8E6] pb-2">
                                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider">
                                  Configuring Card #{activeCardIndex + 1}
                                </span>
                                {carouselCards.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCarouselCard(activeCardIndex)}
                                    className="text-[10px] font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>{t('deleteCard') || 'Delete Card'}</span>
                                  </button>
                                )}
                              </div>

                              {/* Card Media Header Configuration */}
                              <div className="space-y-2">
                                <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                  {t('cardMediaHeader') || 'Card Media Header'}
                                </label>
                                <div className="grid grid-cols-4 gap-2 select-none mb-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCardHeader(activeCardIndex, 'IMAGE', carouselCards[activeCardIndex].header.media_url)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border text-xs font-bold transition-all cursor-pointer ${
                                      carouselCards[activeCardIndex].header.format === 'IMAGE'
                                        ? 'bg-zinc-900 text-white border-zinc-900'
                                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                                    }`}
                                  >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span>{t('cardImage') || 'Image'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCardHeader(activeCardIndex, 'VIDEO', carouselCards[activeCardIndex].header.media_url)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border text-xs font-bold transition-all cursor-pointer ${
                                      carouselCards[activeCardIndex].header.format === 'VIDEO'
                                        ? 'bg-zinc-900 text-white border-zinc-900'
                                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                                    }`}
                                  >
                                    <Video className="h-3.5 w-3.5" />
                                    <span>{t('cardVideo') || 'Video'}</span>
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={carouselCards[activeCardIndex].header.media_url}
                                    onChange={(e) => handleUpdateCardHeader(activeCardIndex, carouselCards[activeCardIndex].header.format, e.target.value)}
                                    placeholder={t('cardMediaHeaderPlaceholder') || 'e.g. https://images.unsplash.com/photo-... or hosted media URL'}
                                    className="w-full h-8 px-2.5 bg-zinc-50 border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-semibold"
                                  />
                                </div>
                              </div>

                              {/* Card Body Text (Max 160 Chars for Meta WhatsApp Carousel) */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                    {t('cardBodyText') || 'Card Body Text'} <span className="text-zinc-500 font-normal">({t('max160Chars')})</span>
                                  </label>
                                  <span className={`text-[9.5px] font-mono font-bold ${
                                    (carouselCards[activeCardIndex].body.text || '').length > 160 ? 'text-rose-600' : 'text-zinc-400'
                                  }`}>
                                    {(carouselCards[activeCardIndex].body.text || '').length} / 160
                                  </span>
                                </div>
                                <textarea
                                  maxLength={160}
                                  value={carouselCards[activeCardIndex].body.text}
                                  onChange={(e) => handleUpdateCardBody(activeCardIndex, e.target.value)}
                                  placeholder={t('cardBodyTextPlaceholder') || 'Enter card description or price (max 160 characters)...'}
                                  className="w-full min-h-[70px] p-2.5 bg-zinc-50 border border-[#E8E8E6] rounded text-xs focus:outline-none focus:border-black font-semibold resize-y"
                                />
                                <div className="flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCardBody(activeCardIndex, (carouselCards[activeCardIndex].body.text || '') + ' {{1}}')}
                                    className="text-[10px] text-zinc-600 hover:text-black hover:underline cursor-pointer flex items-center gap-1 font-bold"
                                  >
                                    <Code className="h-3 w-3" />
                                    <span>{t('addParamVariable')}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Card Action Buttons (Max 2 Buttons Per Card) */}
                              <div className="space-y-2.5 pt-2 border-t border-[#E8E8E6]">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                                    {t('cardButtons') || 'Card Action Buttons (Max 2)'}
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAddCardButton(activeCardIndex, 'quick_reply')}
                                      disabled={(carouselCards[activeCardIndex].buttons || []).length >= 2}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10px] font-bold text-zinc-700 cursor-pointer shadow-3xs transition-all"
                                    >
                                      <Plus className="h-3 w-3 text-emerald-600" />
                                      <span>{t('quickReply')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddCardButton(activeCardIndex, 'url')}
                                      disabled={(carouselCards[activeCardIndex].buttons || []).length >= 2}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10px] font-bold text-zinc-700 cursor-pointer shadow-3xs transition-all"
                                    >
                                      <Plus className="h-3 w-3 text-sky-600" />
                                      <span>{t('websiteUrl')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddCardButton(activeCardIndex, 'phone')}
                                      disabled={(carouselCards[activeCardIndex].buttons || []).length >= 2}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10px] font-bold text-zinc-700 cursor-pointer shadow-3xs transition-all"
                                    >
                                      <Plus className="h-3 w-3 text-amber-600" />
                                      <span>{t('phoneNumber')}</span>
                                    </button>
                                  </div>
                                </div>

                                {(carouselCards[activeCardIndex].buttons || []).length === 0 ? (
                                  <div className="p-3.5 border border-dashed border-[#E8E8E6] rounded-xl text-center select-none">
                                    <span className="text-[10.5px] text-zinc-400 font-medium">{t('noCardButtons')}</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {(carouselCards[activeCardIndex].buttons || []).map((btn, cbIdx) => (
                                       <div
                                         key={btn.id || `card_btn_edit_${cbIdx}`}
                                         className="p-3 border border-[#E8E8E6] bg-[#FAFAFA] rounded-xl space-y-2.5 relative group transition-all hover:border-zinc-300 shadow-3xs text-left"
                                       >
                                         {/* Card Top Strip */}
                                         <div className="flex items-center justify-between gap-2">
                                           <div className="flex items-center gap-2 select-none">
                                             {btn.type === 'quick_reply' && <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                             {btn.type === 'url' && <Link2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
                                             {btn.type === 'phone' && <Phone className="h-3.5 w-3.5 text-amber-600 shrink-0" />}

                                             <div className="flex items-center gap-1.5">
                                               <span className="text-xs font-bold text-zinc-900">
                                                 {btn.type === 'quick_reply' ? t('quickReply') : btn.type === 'url' ? t('websiteUrl') : t('phoneNumber')}
                                               </span>
                                               <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                 #{cbIdx + 1}
                                               </span>
                                             </div>
                                           </div>

                                           <button
                                             type="button"
                                             onClick={() => handleRemoveCardButton(activeCardIndex, btn.id)}
                                             className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100 shrink-0 cursor-pointer"
                                             title={t('removeButton')}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </button>
                                         </div>

                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                           <div>
                                             <input
                                               type="text"
                                               value={btn.text}
                                               onChange={(e) => handleUpdateCardButton(activeCardIndex, btn.id, 'text', e.target.value)}
                                               placeholder={t('buttonLabelPlaceholder')}
                                               className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400"
                                             />
                                           </div>
                                           {btn.type === 'url' ? (
                                             <div>
                                               <input
                                                 type="text"
                                                 value={btn.url || ''}
                                                 onChange={(e) => handleUpdateCardButton(activeCardIndex, btn.id, 'url', e.target.value)}
                                                 placeholder="https://..."
                                                 className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400"
                                               />
                                             </div>
                                           ) : btn.type === 'phone' ? (
                                             <div>
                                               <input
                                                 type="text"
                                                 value={btn.phone_number || ''}
                                                 onChange={(e) => handleUpdateCardButton(activeCardIndex, btn.id, 'phone_number', e.target.value)}
                                                 placeholder={t('phoneNumberPlaceholder')}
                                                 className="w-full h-8 px-2.5 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400"
                                               />
                                             </div>
                                           ) : (
                                             <div className="h-8 px-2.5 bg-white border border-dashed border-zinc-250 rounded-md flex items-center gap-1.5 text-[10.5px] text-zinc-500 font-medium select-none">
                                               <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                               <span className="truncate">{t('instantCustomerResponse')}</span>
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* STANDARD SINGLE MESSAGE BUILDER */
                      <div className="space-y-5 animate-fade-in">
                        <div className="space-y-1.5 border-b border-[#E8E8E6] pb-4">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('templateHeaderTitle')} <span className="text-zinc-400 text-[9px] font-semibold lowercase">{t('optional')}</span></label>
                          <input
                            type="text"
                            value={waHeaderText}
                            onChange={(e) => setWaHeaderText(e.target.value)}
                            placeholder={t('headerTitlePlaceholder')}
                            className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('bodyTextLabel')}</label>
                          <textarea
                            value={waBodyText}
                            onChange={(e) => setWaBodyText(e.target.value)}
                            placeholder={t('bodyTextPlaceholder')}
                            className="w-full min-h-[120px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-y leading-relaxed"
                          />
                          <div className="flex items-center justify-between text-[9.5px] text-zinc-400 font-semibold uppercase">
                            <span>{t('max1024Chars')}</span>
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

                        <div className="space-y-1.5 border-b border-[#E8E8E6] pb-4">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('footerTextLabel')} <span className="text-zinc-400 text-[9px] font-semibold lowercase">{t('optional')}</span></label>
                          <input
                            type="text"
                            value={waFooterText}
                            onChange={(e) => setWaFooterText(e.target.value)}
                            placeholder={t('footerTextPlaceholder')}
                            className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold"
                          />
                        </div>

                        <div className="space-y-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E8E6]">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('actionButtonsLabel')} <span className="text-zinc-400 text-[9px] font-semibold lowercase">{t('optional')}</span></label>
                              <span className="text-[9.5px] text-zinc-400 font-medium">{t('mixedButtonsHint')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAddWaButton('quick_reply')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10.5px] font-bold text-zinc-700 hover:text-black cursor-pointer shadow-3xs transition-all"
                              >
                                <Plus className="h-3 w-3 text-emerald-600" />
                                <span>{t('addQuickReply')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddWaButton('url')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10.5px] font-bold text-zinc-700 hover:text-black cursor-pointer shadow-3xs transition-all"
                              >
                                <Plus className="h-3 w-3 text-sky-600" />
                                <span>{t('addWebsiteUrl')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddWaButton('phone')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10.5px] font-bold text-zinc-700 hover:text-black cursor-pointer shadow-3xs transition-all"
                              >
                                <Plus className="h-3 w-3 text-amber-600" />
                                <span>{t('addPhoneNumber')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddWaButton('copy_code')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-[6px] text-[10.5px] font-bold text-zinc-700 hover:text-black cursor-pointer shadow-3xs transition-all"
                              >
                                <Plus className="h-3 w-3 text-purple-600" />
                                <span>{t('addCopyCode')}</span>
                              </button>
                            </div>
                          </div>

                          {waButtons.length === 0 ? (
                            <div className="p-5 border border-dashed border-[#E8E8E6] rounded-xl text-center select-none">
                              <span className="text-[11px] text-zinc-400 font-medium">{t('noActionButtons')}</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {waButtons.map((btn, bIdx) => (
                                <div 
                                  key={btn.id || `wa_btn_edit_${bIdx}`}
                                  className="p-3.5 sm:p-4 border border-[#E8E8E6] bg-[#FAFAFA] rounded-xl space-y-3 relative group transition-all hover:border-zinc-300 shadow-3xs text-left"
                                >
                                  {/* Card Top Strip */}
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 select-none">
                                      {btn.type === 'quick_reply' && <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />}
                                      {btn.type === 'url' && <Link2 className="h-4 w-4 text-sky-600 shrink-0" />}
                                      {btn.type === 'phone' && <Phone className="h-4 w-4 text-amber-600 shrink-0" />}
                                      {btn.type === 'copy_code' && <Copy className="h-4 w-4 text-purple-600 shrink-0" />}

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-zinc-900">
                                          {btn.type === 'quick_reply' ? (t('quickReply') || 'Quick Reply') :
                                           btn.type === 'url' ? (t('websiteUrl') || 'Website URL') :
                                           btn.type === 'phone' ? (t('phoneNumber') || 'Phone Number') :
                                           (t('copyCode') || 'Coupon / Promo Code')}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                          #{bIdx + 1}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Remove Action */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveWaButton(btn.id)}
                                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition-colors border border-transparent hover:border-red-100 shrink-0 cursor-pointer"
                                      title={t('removeButton')}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {/* Form Fields Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                        {t('buttonLabel')}
                                      </label>
                                      <input
                                        type="text"
                                        value={btn.text}
                                        onChange={(e) => handleUpdateWaButton(btn.id, 'text', e.target.value)}
                                        placeholder={t('buttonLabelPlaceholder')}
                                        className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400 transition-colors"
                                      />
                                    </div>

                                    {btn.type === 'url' ? (
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                          {t('targetUrl')}
                                        </label>
                                        <input
                                          type="text"
                                          value={btn.url || ''}
                                          onChange={(e) => handleUpdateWaButton(btn.id, 'url', e.target.value)}
                                          placeholder={t('targetUrlPlaceholder')}
                                          className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400 transition-colors"
                                        />
                                      </div>
                                    ) : btn.type === 'phone' ? (
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                          {t('phoneNumberLabel') || 'Phone Number'}
                                        </label>
                                        <input
                                          type="text"
                                          value={btn.phone_number || ''}
                                          onChange={(e) => handleUpdateWaButton(btn.id, 'phone_number', e.target.value)}
                                          placeholder={t('phoneNumberPlaceholder') || '+15551234567'}
                                          className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400 transition-colors"
                                        />
                                      </div>
                                    ) : btn.type === 'copy_code' ? (
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                          {t('couponCodeLabel') || 'Offer / Promo Code'}
                                        </label>
                                        <input
                                          type="text"
                                          value={btn.coupon_code || ''}
                                          onChange={(e) => handleUpdateWaButton(btn.id, 'coupon_code', e.target.value)}
                                          placeholder={t('couponCodePlaceholder') || 'e.g. 20OFF'}
                                          className="w-full h-9 px-3 bg-white border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold text-zinc-900 placeholder:text-zinc-400 transition-colors uppercase tracking-wider"
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                                          {t('quickReplyActions') || 'Action Trigger'}
                                        </label>
                                        <div className="h-9 px-3 bg-white border border-dashed border-zinc-250 rounded-md flex items-center gap-2 text-[11px] text-zinc-500 font-medium select-none">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                          <span className="truncate">{t('sendsButtonText')}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                  {/* EMAIL VISUAL BUILDER */}
                {type === 'email' && (
                  <div className="space-y-5 w-full animate-fade-in text-left">
                    {/* Merge Tags */}
                    <div className="flex items-center justify-between select-none pb-2.5 border-b border-[#E8E8E6]">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('mergeTags')}</span>
                      <div className="flex gap-1.5 select-none">
                        {keywordChips.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertMergeTag(tag)}
                            className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-[10px] font-bold text-zinc-800 cursor-pointer transition-colors"
                          >
                            {tag.replace('contact.', '').replace('{{', '').replace('}}', '').trim()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email Paper Canvas Container */}
                    <div className="border border-[#E8E8E6] rounded-xl p-8 bg-[#FAFAFA] min-h-[460px] flex flex-col gap-5 overflow-y-auto shadow-3xs">
                      <div className="bg-white border border-[#E8E8E6] rounded-xl p-8 shadow-sm flex flex-col gap-6 max-w-2xl mx-auto w-full min-h-[400px]">
                        {emailBlocks.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 text-xs font-bold uppercase select-none border border-dashed rounded-lg bg-zinc-50 border-[#E8E8E6] min-h-[300px]">
                            <span>{t('emailCanvasEmpty')}</span>
                          </div>
                        ) : (
                          emailBlocks.map((block, index) => {
                            const blockId = block.id || `email-block-${index}`;
                            const isActive = activeBlockId === block.id || activeBlockId === blockId;
                            return (
                              <div 
                                key={blockId}
                                onClick={() => setActiveBlockId(blockId)}
                                className={`p-5 border rounded-lg bg-white transition-all relative group cursor-pointer ${
                                  isActive 
                                    ? 'border-zinc-950 ring-1 ring-zinc-955' 
                                    : 'border-[#E8E8E6] hover:border-zinc-350'
                                }`}
                              >
                                {/* Block Settings Overlay Toolbar */}
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#E8E8E6] rounded p-1 select-none shadow-3xs z-50">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                                    className="p-1 hover:bg-zinc-50 hover:text-black rounded text-zinc-400 cursor-pointer transition-colors"
                                    title={t('moveBlockUp')}
                                  >
                                    <MoveUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                                    className="p-1 hover:bg-zinc-50 hover:text-black rounded text-zinc-400 cursor-pointer transition-colors"
                                    title={t('moveBlockDown')}
                                  >
                                    <MoveDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); deleteBlock(blockId); }}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer transition-colors"
                                    title={t('deleteBlock')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="text-left space-y-2">
                                  {block.type === 'header' && (
                                    <div className="space-y-1">
                                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block select-none">{t('blockTitleHeader')}</span>
                                      <input 
                                        type="text"
                                        value={block.content}
                                        onChange={(e) => updateBlockContent(blockId, e.target.value)}
                                        className="text-lg font-black text-zinc-955 w-full focus:outline-none border-b border-transparent focus:border-zinc-200 py-1"
                                        placeholder={t('headerTitleTextPlaceholder')}
                                      />
                                    </div>
                                  )}
                                  {block.type === 'paragraph' && (
                                    <div className="space-y-1">
                                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block select-none">{t('blockParagraph')}</span>
                                      <textarea
                                        value={block.content}
                                        onChange={(e) => updateBlockContent(blockId, e.target.value)}
                                        className="text-xs text-zinc-700 w-full focus:outline-none border-b border-transparent focus:border-zinc-200 py-1 resize-y leading-relaxed font-semibold min-h-[60px]"
                                        placeholder={t('paragraphTextPlaceholder')}
                                      />
                                    </div>
                                  )}
                                  {block.type === 'button' && (
                                    <div className="space-y-3 pt-1">
                                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block select-none">{t('blockCtaButton')}</span>
                                      <div className="flex flex-col gap-2.5 max-w-md">
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="text"
                                            value={block.content}
                                            onChange={(e) => updateBlockContent(blockId, e.target.value)}
                                            className="px-4 py-2 bg-zinc-950 text-white rounded-[6px] font-bold text-xs focus:outline-none uppercase tracking-wider text-center max-w-[160px] shadow-3xs"
                                            placeholder={t('buttonTextPlaceholder')}
                                          />
                                          <span className="text-[9.5px] text-zinc-400 font-bold uppercase select-none">{t('buttonLabel')}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="text"
                                            value={block.url || ''}
                                            onChange={(e) => updateBlockUrl(blockId, e.target.value)}
                                            placeholder={t('buttonRedirectionPlaceholder')}
                                            className="w-full h-8 px-2 bg-zinc-50 border border-zinc-200 rounded text-xs focus:outline-none focus:border-black font-semibold"
                                          />
                                          <span className="text-[9.5px] text-zinc-400 font-bold uppercase select-none shrink-0">{t('targetUrl')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {block.type === 'divider' && (
                                    <div className="py-2">
                                      <hr className="border-t border-zinc-200" />
                                      <span className="text-[8.5px] text-zinc-400 font-bold block uppercase mt-1 select-none">{t('blockDivider')}</span>
                                    </div>
                                  )}
                                  {block.type === 'image' && (
                                    <div className="space-y-3">
                                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block select-none">{t('blockImageCard')}</span>
                                      <div className="flex flex-col gap-2.5">
                                        {block.src ? (
                                          <img src={block.src} alt="" className="max-h-[160px] w-auto max-w-[320px] object-cover rounded-md border border-zinc-200 shadow-3xs" />
                                        ) : (
                                          <div className="h-20 max-w-[320px] bg-zinc-50 border border-dashed border-zinc-200 rounded-md flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase select-none">{t('noImageUrlConfigured')}</div>
                                        )}
                                        <input 
                                          type="text"
                                          value={block.src || ''}
                                          onChange={(e) => updateBlockSrc(blockId, e.target.value)}
                                          placeholder={t('imageUrlSourcePlaceholder')}
                                          className="w-full h-8 px-2 bg-zinc-50 border border-zinc-200 rounded text-xs focus:outline-none focus:border-black font-semibold"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
      {/* PORTAL OVERLAYS (FULL SCREEN VIEWPORT PORTALS ON CLIENT SIDE) */}
      
      {/* 1. SEND TEST EMAIL PORTAL */}
      {testSendOpen && testSendTemplate && createPortal(
        <div 
          onClick={() => setTestSendOpen(false)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Send className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('sendTestTitle')}</h3>
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
              <p className="text-xs text-[#6B6B6B] font-semibold leading-relaxed">
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
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleTriggerTestSend}
                disabled={testSending || !testEmailAddress.trim()}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {testSending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-450" />}
                <span>{t('sendTestBtn')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. SUBMIT TO META PORTAL */}
      {submitMetaOpen && createPortal(
        <div 
          onClick={() => setSubmitMetaOpen(false)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('metaSubmitConfirm')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitMetaOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] font-semibold leading-relaxed">
                {t('metaSubmitWarning')}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setSubmitMetaOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitMetaOpen(false);
                  if (isHeaderSubmit) {
                    executeHeaderSaveSubmitMeta();
                  } else {
                    executeRowSubmitMeta();
                  }
                }}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer"
              >
                {t('yesSubmit')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. DELETE CONFIRMATION PORTAL */}
      {deleteConfirmOpen && createPortal(
        <div 
          onClick={() => setDeleteConfirmOpen(false)}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('deleteConfirm')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteWarning')}
              </p>
            </div>

            {/* Footer Buttons Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={executeDeleteTemplate}
                className="bg-red-650 hover:bg-red-750 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center"
              >
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
