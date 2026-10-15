/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useHeaderStore } from '@/store/useHeaderStore';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useBranding } from '@/components/BrandingThemeProvider';
import { PlatformLogo } from '@/components/common/PlatformLogo';
import {
  Sparkles,
  X,
  RotateCcw,
  Check,
  Zap,
  Megaphone,
  FileText,
  Copy,
  CheckCheck,
  ArrowUp,
  ArrowRight,
  Share2,
  Bot,
  GitBranch,
  Layers,
  Mic,
  Upload,
  Link as LinkIcon,
  Folder,
  Plus,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Wand2,
  MoreHorizontal,
  SlidersHorizontal,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  Paperclip,
  Table,
  ShieldCheck,
  ExternalLink,
  User,
  Target,
  MessageSquare,
  MessageCircle,
  Globe,
  Users,
  Tag,
  DollarSign,
  Hash,
  Calendar,
  ShoppingBag,
  Star,
  Headphones,
  HelpCircle,
  Clock,
  ListFilter,
  UserCheck,
  ShoppingCart,
  Rocket,
  MessageSquareHeart,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { useFlowStore } from '@/app/[locale]/(panel)/flows/store/useFlowStore';

import {
  CopilotActionType,
  CopilotActionData,
  FormField,
  CopilotFormData,
  ChatMessage,
  AttachedFile,
  FlowPromptTemplate,
  CopilotCapability,
} from './copilotTypes';
import {
  FLOW_PROMPT_TEMPLATES,
  FLOW_UPDATE_TEMPLATES,
  FLOW_EXTEND_TEMPLATES,
  getFlowNodeIcon,
  COPILOT_CAPABILITIES,
  getActiveModuleKey,
  getContextTitle,
} from './copilotCapabilities';

export type { CopilotActionType, CopilotActionData, CopilotFormData, ChatMessage, AttachedFile, FlowPromptTemplate, CopilotCapability };
export { FLOW_PROMPT_TEMPLATES, FLOW_UPDATE_TEMPLATES, FLOW_EXTEND_TEMPLATES, getFlowNodeIcon, COPILOT_CAPABILITIES, getActiveModuleKey, getContextTitle };

export default function FloatingCopilot() {
  const t = useTranslations('Copilot');
  const tCommon = useTranslations('Common');
  const { brandingName, logoUrl } = useBranding();
  const rawPathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'he';

  const customHeader = useHeaderStore((state) => state.customHeader);

  // Normalize path without supported locale prefixes (en, hi, es, ar, fr, he, id, it, pt, vi)
  const cleanPath = (rawPathname || '/').replace(/^\/(en|hi|es|ar|fr|he|id|it|pt|vi)(?=\/|$)/, '') || '/';
  const pathname = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  const isFlowDesigner = normalizedPath.includes('/flows/') && (normalizedPath.includes('/edit') || normalizedPath.includes('/create'));
  const isInboxPage = normalizedPath.includes('/inbox');

  // Define root/list views directly accessible from the primary Sidebar (excluding Shared Inbox)
  const SIDEBAR_ROOT_PATHS = new Set([
    '/',
    '/dashboard',
    '/chatbot',
    '/flows',
    '/knowledge-base',
    '/channels',
    '/social-posts',
    '/campaigns',
    '/whatsapp-flows',
    '/quick-replies',
    '/templates',
    '/ecommerce',
    '/ecommerce/stores',
    '/ecommerce/products',
    '/ecommerce/orders',
    '/ecommerce/whatsapp-catalog',
    '/meta-ads',
    '/contacts',
    '/staff',
    '/deals',
    '/calendar',
    '/agents',
    '/settings',
    '/settings/general',
    '/settings/billing',
    '/settings/integrations',
    '/settings/sessions',
    '/settings/ai-providers',
    '/settings/team',
    '/help',
    '/help/faq',
    '/help/tickets',
  ]);

  const isNestedOrEditorRoute =
    isFlowDesigner ||
    isInboxPage || // In Shared Inbox, we exclusively show the floating button, never the wide floating field
    normalizedPath.includes('/create') ||
    normalizedPath.includes('/edit') ||
    normalizedPath.includes('/new') ||
    normalizedPath.includes('/view') ||
    normalizedPath.includes('/show') ||
    normalizedPath.includes('/detail') ||
    normalizedPath.includes('/setup') ||
    !SIDEBAR_ROOT_PATHS.has(normalizedPath);

  // Wide animated floating field widget is ONLY displayed on primary sidebar overview pages (excluding Shared Inbox).
  // In the shared inbox, create pages, edit pages, view detail pages, or nested views, switch to the floating round button in the corner.
  const isSidebarPage = !customHeader && !isNestedOrEditorRoute;

  // Bottom Center Floating Dock Expansion State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPillMinimized, setIsPillMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  // Form values state keyed by message ID
  const [formValues, setFormValues] = useState<Record<string, Record<string, any>>>({});

  // Empty State Capability Explorer State (4-6 Minimal Options: Contextual + Randomized Platform Superpowers)
  const activeModuleKey = getActiveModuleKey(normalizedPath);

  // Dynamic Greeting & Rotating Ideas for Empty State
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [cardsSeed, setCardsSeed] = useState(0);

  const dynamicGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'Good morning';
    if (hour < 18) return t('goodAfternoon') || 'Good afternoon';
    return t('goodEvening') || 'Good evening';
  }, [t]);

  const INTERACTIVE_MESSAGES = useMemo(() => [
    t('interactivePrompt1') || 'How can I help you today?',
    t('interactivePrompt2') || 'What would you like to build?',
    t('interactivePrompt3') || 'What can I automate for you today?',
    t('interactivePrompt4') || 'Pick an action below or ask anything.',
    t('interactivePrompt5') || 'Ready to draft campaigns or workflows?',
  ], [t]);

  const copilotCapabilities = useMemo(() => [
    // 1. AI ChatBots
    {
      id: 'cb-1',
      moduleKey: 'chatbot',
      categoryName: t('actions.chatbot') || 'AI ChatBots',
      title: t('capabilities.cb1Title') || 'Customer Support Bot',
      prompt: t('capabilities.cb1Prompt') || 'Create a 24/7 customer support bot for returns, refunds, and order tracking',
      icon: Bot,
      colorScheme: {
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200/70',
        tagBg: 'bg-purple-100/60',
        tagText: 'text-purple-700',
      },
    },
    {
      id: 'cb-2',
      moduleKey: 'chatbot',
      categoryName: t('actions.chatbot') || 'AI ChatBots',
      title: t('capabilities.cb2Title') || 'Fine-tune Bot Prompt',
      prompt: t('capabilities.cb2Prompt') || 'Update the customer support bot prompt to be polite, concise, and helpful',
      icon: Bot,
      colorScheme: {
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200/70',
        tagBg: 'bg-purple-100/60',
        tagText: 'text-purple-700',
      },
    },
    {
      id: 'cb-3',
      moduleKey: 'chatbot',
      categoryName: t('actions.chatbot') || 'AI ChatBots',
      title: t('capabilities.cb3Title') || 'Audit Active Bots',
      prompt: t('capabilities.cb3Prompt') || 'List all my configured AI chatbots with their active models and status',
      icon: Bot,
      colorScheme: {
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200/70',
        tagBg: 'bg-purple-100/60',
        tagText: 'text-purple-700',
      },
    },
    {
      id: 'cb-4',
      moduleKey: 'chatbot',
      categoryName: t('actions.chatbot') || 'AI ChatBots',
      title: t('capabilities.cb4Title') || 'E-Commerce Sales Bot',
      prompt: t('capabilities.cb4Prompt') || 'Create an autonomous sales assistant chatbot for product recommendations and discounts',
      icon: Bot,
      colorScheme: {
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200/70',
        tagBg: 'bg-purple-100/60',
        tagText: 'text-purple-700',
      },
    },

    // 2. Automation Flows
    {
      id: 'fl-1',
      moduleKey: 'flows',
      categoryName: t('actions.flow') || 'Automation Flows',
      title: t('capabilities.fl1Title') || 'Auto-Reply Keyword Flow',
      prompt: t('capabilities.fl1Prompt') || 'Create an auto-reply workflow when customers send "price" or "catalog"',
      icon: GitBranch,
      colorScheme: {
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200/70',
        tagBg: 'bg-emerald-100/60',
        tagText: 'text-emerald-700',
      },
    },
    {
      id: 'fl-2',
      moduleKey: 'flows',
      categoryName: t('actions.flow') || 'Automation Flows',
      title: t('capabilities.fl2Title') || 'Lead Qualification Flow',
      prompt: t('capabilities.fl2Prompt') || 'Build a lead qualification workflow with conditional logic and contact tagging',
      icon: GitBranch,
      colorScheme: {
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200/70',
        tagBg: 'bg-emerald-100/60',
        tagText: 'text-emerald-700',
      },
    },
    {
      id: 'fl-3',
      moduleKey: 'flows',
      categoryName: t('actions.flow') || 'Automation Flows',
      title: t('capabilities.fl3Title') || 'After-Hours Auto Reply',
      prompt: t('capabilities.fl3Prompt') || 'Set up an after-hours automatic reply with working hours and ticket link',
      icon: GitBranch,
      colorScheme: {
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200/70',
        tagBg: 'bg-emerald-100/60',
        tagText: 'text-emerald-700',
      },
    },
    {
      id: 'fl-4',
      moduleKey: 'flows',
      categoryName: t('actions.flow') || 'Automation Flows',
      title: t('capabilities.fl4Title') || 'Audit Flow Keywords',
      prompt: t('capabilities.fl4Prompt') || 'Show all my automation flows and active keyword trigger rules',
      icon: GitBranch,
      colorScheme: {
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200/70',
        tagBg: 'bg-emerald-100/60',
        tagText: 'text-emerald-700',
      },
    },

    // 3. Marketing Broadcasts
    {
      id: 'cmp-1',
      moduleKey: 'campaigns',
      categoryName: t('actions.campaign') || 'Broadcast Campaigns',
      title: t('capabilities.cmp1Title') || 'Weekend Flash Sale',
      prompt: t('capabilities.cmp1Prompt') || 'Draft a 20% off weekend promotional broadcast campaign for all contacts',
      icon: Megaphone,
      colorScheme: {
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200/70',
        tagBg: 'bg-amber-100/60',
        tagText: 'text-amber-700',
      },
    },
    {
      id: 'cmp-2',
      moduleKey: 'campaigns',
      categoryName: t('actions.campaign') || 'Broadcast Campaigns',
      title: t('capabilities.cmp2Title') || 'VIP Re-Engagement',
      prompt: t('capabilities.cmp2Prompt') || 'Create a VIP customer re-engagement broadcast with coupon code FLASH20',
      icon: Megaphone,
      colorScheme: {
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200/70',
        tagBg: 'bg-amber-100/60',
        tagText: 'text-amber-700',
      },
    },
    {
      id: 'cmp-3',
      moduleKey: 'campaigns',
      categoryName: t('actions.campaign') || 'Broadcast Campaigns',
      title: t('capabilities.cmp3Title') || 'Broadcast Analytics',
      prompt: t('capabilities.cmp3Prompt') || 'Show me all active and draft marketing campaigns with delivery rates',
      icon: Megaphone,
      colorScheme: {
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200/70',
        tagBg: 'bg-amber-100/60',
        tagText: 'text-amber-700',
      },
    },

    // 4. Social Media Posts
    {
      id: 'soc-1',
      moduleKey: 'social-posts',
      categoryName: t('actions.socialPost') || 'Social Media',
      title: t('capabilities.soc1Title') || 'Product Launch Post',
      prompt: t('capabilities.soc1Prompt') || 'Draft a scheduled post announcing our new collection launch with viral hashtags',
      icon: Share2,
      colorScheme: {
        iconColor: 'text-sky-600',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200/70',
        tagBg: 'bg-sky-100/60',
        tagText: 'text-sky-700',
      },
    },
    {
      id: 'soc-2',
      moduleKey: 'social-posts',
      categoryName: t('actions.socialPost') || 'Social Media',
      title: t('capabilities.soc2Title') || 'Cross-Channel Scheduling',
      prompt: t('capabilities.soc2Prompt') || 'Schedule weekend promotional content across Facebook and Instagram channels',
      icon: Share2,
      colorScheme: {
        iconColor: 'text-sky-600',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200/70',
        tagBg: 'bg-sky-100/60',
        tagText: 'text-sky-700',
      },
    },
    {
      id: 'soc-3',
      moduleKey: 'social-posts',
      categoryName: t('actions.socialPost') || 'Social Media',
      title: t('capabilities.soc3Title') || 'Scheduled Post Calendar',
      prompt: t('capabilities.soc3Prompt') || 'Show me my scheduled and draft social media posts for this month',
      icon: Share2,
      colorScheme: {
        iconColor: 'text-sky-600',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200/70',
        tagBg: 'bg-sky-100/60',
        tagText: 'text-sky-700',
      },
    },

    // 5. Meta Ads Manager
    {
      id: 'meta-1',
      moduleKey: 'meta-ads',
      categoryName: t('actions.metaCampaign') || 'Meta Ads',
      title: t('capabilities.meta1Title') || 'Click-to-WhatsApp Ad',
      prompt: t('capabilities.meta1Prompt') || 'Draft a Click-to-WhatsApp Meta ad campaign with $25 daily budget',
      icon: Target,
      colorScheme: {
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200/70',
        tagBg: 'bg-indigo-100/60',
        tagText: 'text-indigo-700',
      },
    },
    {
      id: 'meta-2',
      moduleKey: 'meta-ads',
      categoryName: t('actions.metaCampaign') || 'Meta Ads',
      title: t('capabilities.meta2Title') || 'Ad Budget Optimization',
      prompt: t('capabilities.meta2Prompt') || 'Update the Meta ad campaign daily budget to $50 and review lead targets',
      icon: Target,
      colorScheme: {
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200/70',
        tagBg: 'bg-indigo-100/60',
        tagText: 'text-indigo-700',
      },
    },
    {
      id: 'meta-3',
      moduleKey: 'meta-ads',
      categoryName: t('actions.metaCampaign') || 'Meta Ads',
      title: t('capabilities.meta3Title') || 'Ad Campaigns Review',
      prompt: t('capabilities.meta3Prompt') || 'List all my Meta ad campaigns and their daily budgets and lead counts',
      icon: Target,
      colorScheme: {
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200/70',
        tagBg: 'bg-indigo-100/60',
        tagText: 'text-indigo-700',
      },
    },

    // 6. WhatsApp Flows
    {
      id: 'wf-1',
      moduleKey: 'whatsapp-flows',
      categoryName: t('actions.whatsappFlow') || 'WhatsApp Flows',
      title: t('capabilities.wf1Title') || 'Consultation Booking Flow',
      prompt: t('capabilities.wf1Prompt') || 'Create a WhatsApp Flow form for lead qualification and consultation booking',
      icon: Sparkles,
      colorScheme: {
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200/70',
        tagBg: 'bg-teal-100/60',
        tagText: 'text-teal-700',
      },
    },
    {
      id: 'wf-2',
      moduleKey: 'whatsapp-flows',
      categoryName: t('actions.whatsappFlow') || 'WhatsApp Flows',
      title: t('capabilities.wf2Title') || 'NPS Feedback Survey Flow',
      prompt: t('capabilities.wf2Prompt') || 'Draft a customer satisfaction NPS survey flow with interactive star ratings',
      icon: Sparkles,
      colorScheme: {
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200/70',
        tagBg: 'bg-teal-100/60',
        tagText: 'text-teal-700',
      },
    },

    // 7. Quick Replies
    {
      id: 'qr-1',
      moduleKey: 'quick-replies',
      categoryName: t('actions.quickReply') || 'Quick Replies',
      title: t('capabilities.qr1Title') || 'Order Tracking Shortcut',
      prompt: t('capabilities.qr1Prompt') || 'Create an order tracking quick reply with keyboard shortcut /track',
      icon: Zap,
      colorScheme: {
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200/70',
        tagBg: 'bg-yellow-100/60',
        tagText: 'text-yellow-800',
      },
    },
    {
      id: 'qr-2',
      moduleKey: 'quick-replies',
      categoryName: t('actions.quickReply') || 'Quick Replies',
      title: t('capabilities.qr2Title') || 'Greeting & Support Reply',
      prompt: t('capabilities.qr2Prompt') || 'Draft a friendly greeting quick reply for WhatsApp and live chat support',
      icon: Zap,
      colorScheme: {
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200/70',
        tagBg: 'bg-yellow-100/60',
        tagText: 'text-yellow-800',
      },
    },

    // 8. Message Templates
    {
      id: 'tmpl-1',
      moduleKey: 'templates',
      categoryName: t('actions.messageTemplate') || 'Templates',
      title: t('capabilities.tmpl1Title') || 'Order Shipping Template',
      prompt: t('capabilities.tmpl1Prompt') || 'Draft a WhatsApp order confirmation template with customer variables',
      icon: FileText,
      colorScheme: {
        iconColor: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200/70',
        tagBg: 'bg-rose-100/60',
        tagText: 'text-rose-700',
      },
    },
    {
      id: 'tmpl-2',
      moduleKey: 'templates',
      categoryName: t('actions.messageTemplate') || 'Templates',
      title: t('capabilities.tmpl2Title') || 'Template Status Review',
      prompt: t('capabilities.tmpl2Prompt') || 'Show me all my message templates and their WhatsApp approval status',
      icon: FileText,
      colorScheme: {
        iconColor: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200/70',
        tagBg: 'bg-rose-100/60',
        tagText: 'text-rose-700',
      },
    },

    // 9. E-Commerce
    {
      id: 'ecom-1',
      moduleKey: 'ecommerce',
      categoryName: t('capabilities.ecom1Title') || 'E-Commerce',
      title: t('capabilities.ecom1Title') || 'Sync WhatsApp Catalog',
      prompt: t('capabilities.ecom1Prompt') || 'Sync catalog products and verify stock availability on WhatsApp store',
      icon: ShoppingBag,
      colorScheme: {
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200/70',
        tagBg: 'bg-orange-100/60',
        tagText: 'text-orange-700',
      },
    },
    {
      id: 'ecom-2',
      moduleKey: 'ecommerce',
      categoryName: t('capabilities.ecom2Title') || 'E-Commerce',
      title: t('capabilities.ecom2Title') || 'Abandoned Cart Sequence',
      prompt: t('capabilities.ecom2Prompt') || 'Draft an abandoned cart recovery sequence for customers with pending checkouts',
      icon: ShoppingBag,
      colorScheme: {
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200/70',
        tagBg: 'bg-orange-100/60',
        tagText: 'text-orange-700',
      },
    },

    // 10. CRM & Contacts
    {
      id: 'crm-1',
      moduleKey: 'contacts',
      categoryName: t('capabilities.crm1Title') || 'CRM & Contacts',
      title: t('capabilities.crm1Title') || 'Segment VIP Customers',
      prompt: t('capabilities.crm1Prompt') || 'Segment contacts who ordered more than 3 times into a VIP broadcast list',
      icon: Users,
      colorScheme: {
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200/70',
        tagBg: 'bg-blue-100/60',
        tagText: 'text-blue-700',
      },
    },

    // 11. Knowledge Base
    {
      id: 'kb-1',
      moduleKey: 'knowledge-base',
      categoryName: t('capabilities.kb1Title') || 'Knowledge Base',
      title: t('capabilities.kb1Title') || 'Index Store Policies',
      prompt: t('capabilities.kb1Prompt') || 'Index store return policies and shipping guides for grounded chatbot answers',
      icon: BookOpen,
      colorScheme: {
        iconColor: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200/70',
        tagBg: 'bg-cyan-100/60',
        tagText: 'text-cyan-700',
      },
    },

    // 12. Inbox & Customer Care
    {
      id: 'ib-1',
      moduleKey: 'inbox',
      categoryName: t('capabilities.ib1Title') || 'Shared Inbox',
      title: t('capabilities.ib1Title') || 'Summarize Unresolved Chats',
      prompt: t('capabilities.ib1Prompt') || 'Summarize unresolved customer conversations and priority inquiries from today',
      icon: MessageSquare,
      colorScheme: {
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200/70',
        tagBg: 'bg-emerald-100/60',
        tagText: 'text-emerald-700',
      },
    },

    // 13. Analytics & Overview
    {
      id: 'ana-1',
      moduleKey: 'dashboard',
      categoryName: t('capabilities.ana1Title') || 'Analytics',
      title: t('capabilities.ana1Title') || 'Executive KPI Summary',
      prompt: t('capabilities.ana1Prompt') || 'Generate an executive summary of message volume, active chats, and conversion rates',
      icon: BarChart3,
      colorScheme: {
        iconColor: 'text-violet-600',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200/70',
        tagBg: 'bg-violet-100/60',
        tagText: 'text-violet-700',
      },
    },
  ], [t]);

  const displayedCapabilities = useMemo(() => {
    const contextualList = copilotCapabilities.filter((c) => c.moduleKey === activeModuleKey);
    const otherList = copilotCapabilities.filter((c) => c.moduleKey !== activeModuleKey);

    // Pick 2 contextual options for the active page
    const shuffledContextual = [...contextualList].sort(() => 0.5 - Math.random());
    const selectedContextual = shuffledContextual.slice(0, 2).map((c) => ({
      ...c,
      isContextual: true,
    }));

    // Pick 3 diverse randomized platform options from other modules
    const shuffledOther = [...otherList].sort(() => 0.5 - Math.random());
    const selectedOther: (CopilotCapability & { isContextual: boolean })[] = [];
    const usedModules = new Set<string>();

    for (const item of shuffledOther) {
      if (!usedModules.has(item.moduleKey) && selectedOther.length < 3) {
        usedModules.add(item.moduleKey);
        selectedOther.push({ ...item, isContextual: false });
      }
    }

    for (const item of shuffledOther) {
      if (selectedOther.length >= 3) break;
      if (!selectedOther.some((s) => s.id === item.id)) {
        selectedOther.push({ ...item, isContextual: false });
      }
    }

    // Exactly 5 options (within requested 4-6 range)
    return [...selectedContextual, ...selectedOther];
  }, [copilotCapabilities, activeModuleKey, cardsSeed]);

  // Reference Design Features
  const [credits, setCredits] = useState<number>(0);
  const [isUnlimitedCredits, setIsUnlimitedCredits] = useState<boolean>(false);
  const [operationalMode, setOperationalMode] = useState<string>('master_fixed');
  const [isMagicWandOpen, setIsMagicWandOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDropzoneOpen, setIsDropzoneOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Rotating interactive message interval for empty state
  useEffect(() => {
    if (!isExpanded || messages.length > 0) return;
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % INTERACTIVE_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isExpanded, messages.length, INTERACTIVE_MESSAGES.length]);

  // Collapsed Dynamic Prompts & Tooltips Rotation for Primary Sidebar Pages
  const COLLAPSED_TIPS = useMemo(() => [
    { icon: <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />, title: t('tips.reports') || 'Want reports or insights?', action: t('tips.reportsAction') || 'Ask Copilot with natural prompts' },
    { icon: <Bot className="h-3.5 w-3.5 text-purple-600 shrink-0" />, title: t('tips.chatbot') || 'Want to create a chatbot?', action: t('tips.chatbotAction') || 'Create with a single prompt' },
    { icon: <Megaphone className="h-3.5 w-3.5 text-amber-600 shrink-0" />, title: t('tips.broadcasts') || 'Draft marketing broadcasts?', action: t('tips.broadcastsAction') || 'Launch high-converting campaigns' },
    { icon: <GitBranch className="h-3.5 w-3.5 text-emerald-600 shrink-0" />, title: t('tips.workflows') || 'Build automation workflows?', action: t('tips.workflowsAction') || 'Set up keyword auto-replies' },
    { icon: <Share2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />, title: t('tips.social') || 'Schedule social media posts?', action: t('tips.socialAction') || 'Plan multi-channel content' },
    { icon: <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />, title: t('tips.metaAds') || 'Create Meta ad campaigns?', action: t('tips.metaAdsAction') || 'Target Click-to-WhatsApp leads' },
    { icon: <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />, title: t('tips.whatsappFlows') || 'Create WhatsApp Flows?', action: t('tips.whatsappFlowsAction') || 'Design interactive native forms & surveys' },
  ], [t]);

  const [activeTipIndex, setActiveTipIndex] = useState(0);

  useEffect(() => {
    if (isExpanded) return;
    const interval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % COLLAPSED_TIPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isExpanded, COLLAPSED_TIPS.length]);

  const [flowTemplateTab, setFlowTemplateTab] = useState<'create' | 'update' | 'extend'>('create');

  // Fetch real-time copilot credits and operational mode on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetchWithCsrf('/copilot/credits');
        if (res.ok) {
          const data = await res.json();
          if (data && data.credits) {
            setCredits(data.credits.remaining);
            setIsUnlimitedCredits(Boolean(data.credits.is_unlimited));
            if (data.credits.mode) {
              setOperationalMode(data.credits.mode);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load copilot credits:', err);
      }
    };
    fetchCredits();
  }, []);


  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setIsMagicWandOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Global event listener for external triggers (e.g., Automation Flow visual designer topbar button)
  useEffect(() => {
    const handleToggle = (e?: any) => {
      setIsExpanded((prev) => {
        const next = e?.detail?.open !== undefined ? !!e.detail.open : !prev;
        return next;
      });
    };
    const handleOpen = () => setIsExpanded(true);
    const handleClose = () => setIsExpanded(false);

    window.addEventListener('toggle-copilot', handleToggle);
    window.addEventListener('open-copilot', handleOpen);
    window.addEventListener('close-copilot', handleClose);
    return () => {
      window.removeEventListener('toggle-copilot', handleToggle);
      window.removeEventListener('open-copilot', handleOpen);
      window.removeEventListener('close-copilot', handleClose);
    };
  }, []);

  // Broadcast visibility changes to other UI elements (e.g. flow editor topbar state)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('copilot:visibility-changed', { detail: { isOpen: isExpanded } }));
    }
  }, [isExpanded]);

  // Handle click outside to close floating popovers (Magic Wand, More Menu)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMagicWandOpen || isMoreMenuOpen) {
        setIsMagicWandOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    if (isMagicWandOpen || isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMagicWandOpen, isMoreMenuOpen]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && !isRecording) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isExpanded, isRecording]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, loading, isExpanded]);

  // Voice recording timer effect
  useEffect(() => {
    if (isRecording && !isRecordingPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, isRecordingPaused]);

  // Format seconds to H:MM:SS
  const formatRecordingTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInputMessage(transcript);
        };
        recognition.start();
        (window as any).__copilotRecognition = recognition;
      }
    } catch (e) {
      console.log('Speech recognition not available', e);
    }
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    if ((window as any).__copilotRecognition) {
      try {
        (window as any).__copilotRecognition.stop();
      } catch (e) {}
    }
  };

  const handleConfirmRecording = () => {
    if ((window as any).__copilotRecognition) {
      try {
        (window as any).__copilotRecognition.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    const text = inputMessage.trim() || 'Create a 20% discount campaign draft for all contacts';
    setInputMessage(text);
    handleSendMessage(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      type: f.type,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setIsDropzoneOpen(false);
    toast.success(t('attachedFiles', { count: files.length }) || `Attached ${files.length} file(s)`);
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Populate prompt text field when clicking predefined property buttons (allows user to add prompt)
  const handleApplyActionProperty = (actionProperty: string) => {
    setIsExpanded(true);
    setInputMessage(actionProperty);
    setIsMagicWandOpen(false);
    setIsMoreMenuOpen(false);
    setIsDropzoneOpen(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = actionProperty.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 100);
  };

  // Form field update handler
  const handleUpdateFormField = (msgId: string, fieldKey: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [msgId]: {
        ...(prev[msgId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Form submit handler - sends structured properties back to Copilot
  const handleSubmitFormProperties = (msgId: string, form: CopilotFormData) => {
    const currentValues = formValues[msgId] || {};
    const fieldSummaries: string[] = [];

    form.fields.forEach((field) => {
      const val = currentValues[field.key] !== undefined ? currentValues[field.key] : (field.defaultValue ?? '');
      fieldSummaries.push(`- ${field.label}: ${val}`);
    });

    let entityName = 'Draft';
    if (form.module === 'message_templates') entityName = 'Message Template';
    else if (form.module === 'whatsapp_flows') entityName = 'WhatsApp Flow';
    else if (form.module === 'social_posts') entityName = 'Social Post';
    else if (form.module === 'ai_chatbots') entityName = 'AI ChatBot';
    else if (form.module === 'quick_replies') entityName = 'Quick Reply';
    else if (form.module === 'campaigns') entityName = 'Campaign';
    else if (form.module === 'flows') entityName = 'Automation Flow';
    else if (form.module === 'meta_campaigns') entityName = 'Ad Campaign';
    else if (form.title) entityName = form.title.replace(/Select Channel for | Setup/gi, '').trim();

    const compiledPrompt = `Generate the ${entityName} draft now with the following selected parameters:\n${fieldSummaries.join('\n')}`;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, formSubmitted: true } : m))
    );

    handleSendMessage(compiledPrompt);
  };

  // Contextual helper based on active pathname - 5 Core Modules
  const getContextInfo = () => {
    if (pathname.includes('/campaigns')) {
      return {
        badge: 'Campaigns',
        tip: 'Autonomous AI for WhatsApp Broadcasts (Always Drafts)',
        quickPrompts: [
          'Draft a 20% off weekend promotional campaign for all contacts',
          'Modify the last campaign draft copy to include coupon FLASH20',
          'Show me all active and draft marketing campaigns',
        ],
      };
    }
    if (pathname.includes('/chatbot')) {
      return {
        badge: 'AI ChatBots',
        tip: 'Autonomous AI for Support & Sales Agents (Always Drafts)',
        quickPrompts: [
          'Create a 24/7 customer support bot for returns and order tracking',
          'Update the support bot prompt to be polite and concise',
          'List all my configured AI chatbots and their models',
        ],
      };
    }
    if (pathname.includes('/flows')) {
      return {
        badge: 'Automation Flows',
        tip: 'Autonomous AI for Inbound & Keyword Workflows (Always Drafts)',
        quickPrompts: [
          'Create an auto-reply workflow when customers send "price" or "catalog"',
          'Add keywords "help" and "support" to the welcome workflow',
          'List all my automation flows and trigger keywords',
        ],
      };
    }
    if (pathname.includes('/social-posts')) {
      return {
        badge: 'Social Posts',
        tip: 'Autonomous AI for Multi-Channel Scheduled Posts (Always Drafts)',
        quickPrompts: [
          'Draft a scheduled post announcing our new collection launch',
          'Refine the social post caption with engaging hashtags',
          'Show me my scheduled and draft social media posts',
        ],
      };
    }
    if (pathname.includes('/meta-ads')) {
      return {
        badge: 'Ad Campaigns',
        tip: 'Autonomous AI for Meta & WhatsApp Ads (Always Paused/Draft)',
        quickPrompts: [
          'Draft a Click-to-WhatsApp Meta ad campaign with $25 daily budget',
          'Update the Meta ad campaign daily budget to $50',
          'List all my Meta ad campaigns and their daily budgets',
        ],
      };
    }
    if (pathname.includes('/quick-replies')) {
      return {
        badge: 'Quick Replies',
        tip: 'Autonomous AI for Canned Replies, Slash Commands & Keywords',
        quickPrompts: [
          'Create an order tracking quick reply with shortcut /track',
          'Draft a friendly greeting quick reply for WhatsApp & live chat',
          'Show me all active quick reply shortcuts',
        ],
      };
    }
    if (pathname.includes('/templates')) {
      return {
        badge: 'Message Templates',
        tip: 'Autonomous AI for WhatsApp & Email Official Templates',
        quickPrompts: [
          'Draft a WhatsApp order confirmation template with variables',
          'Create an Email welcome template for new subscribers',
          'Show me all my message templates and their approval status',
        ],
      };
    }
    if (pathname.includes('/whatsapp-flows')) {
      return {
        badge: 'WhatsApp Flows',
        tip: 'Autonomous AI for Native WhatsApp Interactive Forms & Surveys (Always Drafts)',
        quickPrompts: [
          'Create a WhatsApp Flow form for lead qualification & consultation',
          'Draft a customer satisfaction NPS survey flow with star ratings',
          'List all my WhatsApp Flows and their status',
        ],
      };
    }
    return {
      badge: 'Platform Copilot',
      tip: 'Autonomous AI for Campaigns, ChatBots, Flows, Social, Ads, Quick Replies, Templates & WhatsApp Flows',
      quickPrompts: [
        'Draft a 20% discount broadcast campaign for all contacts',
        'Create an AI support bot to answer return and shipping questions',
        'Create a WhatsApp notification template for order delivery',
        'Create a WhatsApp Flow form for lead qualification & consultation',
      ],
    };
  };

  const context = getContextInfo();

  // Send message to Copilot backend
  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || loading) return;

    setIsExpanded(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessageId = 'user-' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: timeStr,
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInputMessage('');
    setAttachedFiles([]);
    setLoading(true);
    setIsDropzoneOpen(false);
    setIsMagicWandOpen(false);
    setIsMoreMenuOpen(false);

    let flowPayload: any = {};
    if (isFlowDesigner) {
      try {
        const flowState = useFlowStore.getState();
        flowPayload = {
          current_nodes: flowState.nodes || [],
          current_edges: flowState.edges || [],
          selected_node_id: flowState.selectedNodeId || null,
        };
      } catch (err) {
        console.error('Error fetching flow store state:', err);
      }
    }

    try {
      const res = await fetchWithCsrf('/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          current_page: pathname,
          attached_files: attachedFiles.map((f) => f.name),
          ...flowPayload,
        }),
      });

      const data = await res.json();
      const respTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (res.ok && data.success) {
        const assistantMsgId = 'copilot-' + Date.now();
        const normalizedAction: CopilotActionData | null =
          data.action && typeof data.action === 'object' && typeof data.action.type === 'string' && data.action.type.trim() !== ''
            ? {
                type: data.action.type.trim(),
                title: data.action.title || 'Draft Action',
                data: (data.action.data && typeof data.action.data === 'object') ? data.action.data : {},
              }
            : null;

        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: data.message || 'I have completed that request.',
          action: normalizedAction,
          form: data.form || null,
          timestamp: respTimeStr,
        };

        // Initialize default form field values if form was returned
        if (data.form && Array.isArray(data.form.fields)) {
          const initVals: Record<string, any> = {};
          data.form.fields.forEach((f: FormField) => {
            initVals[f.key] = f.defaultValue ?? '';
          });
          setFormValues((prev) => ({
            ...prev,
            [assistantMsgId]: initVals,
          }));
        }

        setMessages((prev) => [...prev, assistantMsg]);
        if (data && data.credits) {
          setCredits(data.credits.remaining);
          setIsUnlimitedCredits(Boolean(data.credits.is_unlimited));
          if (data.credits.mode) {
            setOperationalMode(data.credits.mode);
          }
        } else {
          setCredits((prev) => Math.max(0, prev - 1));
        }
      } else {
        if (data && data.credits) {
          setCredits(data.credits.remaining);
          setIsUnlimitedCredits(Boolean(data.credits.is_unlimited));
          if (data.credits.mode) {
            setOperationalMode(data.credits.mode);
          }
        }
        const fallbackText = data.fallback_text || data.message || 'Unable to process your request at this moment.';
        setMessages((prev) => [
          ...prev,
          {
            id: 'copilot-' + Date.now(),
            role: 'assistant',
            content: fallbackText,
            timestamp: respTimeStr,
          },
        ]);
        toast.error(data.message || 'Copilot error');
      }
    } catch (err: any) {
      console.error(err);
      const errTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: 'copilot-' + Date.now(),
          role: 'assistant',
          content: 'I encountered a network error communicating with the server. Please try again.',
          timestamp: errTimeStr,
        },
      ]);
      toast.error('Network error contacting Copilot');
    } finally {
      setLoading(false);
    }
  };

  // Execute structured action in database with 1-click
  const handleExecuteAction = async (msgId: string, action: CopilotActionData) => {
    if (!action || !action.type || typeof action.type !== 'string' || action.type.trim() === '') {
      toast.error('Invalid action: Missing action type.');
      return;
    }
    setExecutingActionId(msgId);
    try {
      const res = await fetchWithCsrf('/copilot/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: action.type.trim(),
          action_data: (action.data && typeof action.data === 'object') ? action.data : {},
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Action executed successfully!');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  executed: true,
                  executedMessage: data.message,
                  executedRedirectUrl: data.redirect_url,
                }
              : m
          )
        );

        // Broadcast custom event so active pages (e.g. WhatsApp Flows, Campaigns, Chatbots) reload their data immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('copilot:action-executed', {
              detail: { action, data, action_type: action.type.trim() },
            })
          );
        }
      } else {
        toast.error(data.message || 'Failed to execute Copilot action');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network error executing Copilot action');
    } finally {
      setExecutingActionId(null);
    }
  };

  // Copy text helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(t('copied') || 'Copied to clipboard');
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Copy structured table data as TSV (Tab-Separated Values)
  const handleCopyTable = (tableKey: string, headers: string[], rows: string[][]) => {
    const headerLine = headers.join('\t');
    const rowLines = rows.map((r) => r.join('\t')).join('\n');
    const tsv = `${headerLine}\n${rowLines}`;
    navigator.clipboard.writeText(tsv);
    setCopiedTableId(tableKey);
    toast.success('Table copied to clipboard (TSV format)');
    setTimeout(() => setCopiedTableId(null), 2000);
  };

  // Reset conversation
  const handleClearHistory = () => {
    setMessages([]);
    setAttachedFiles([]);
    toast.success(t('clearChat') || 'Copilot conversation cleared');
  };

  // Parse inline text (bold, code, italics, links)
  const renderInline = (text: string) => {
    const regex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    const parts = text.split(regex);

    return parts.map((part, pIdx) => {
      if (!part) return null;

      // Link: [Label](url)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2];
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        return (
          <a
            key={pIdx}
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-[#008069] hover:underline font-semibold inline-flex items-center gap-0.5"
          >
            <span>{label}</span>
            {isExternal && <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />}
          </a>
        );
      }

      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={pIdx}
            className="font-mono text-[11.5px] bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-200/80 font-medium"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={pIdx} className="font-semibold text-zinc-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (
        (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length > 2)
      ) {
        return (
          <em key={pIdx} className="italic text-zinc-700">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Smart Table Cell Renderer with Status Pills & Monospace Metric Formats
  const renderSmartTableCell = (cell: string) => {
    const trimmed = cell.trim();
    // Strip markdown formatting symbols so **ACTIVE** or *Draft* match status rules properly
    const cleanText = trimmed.replace(/[*_`#]/g, '').trim();
    const lower = cleanText.toLowerCase();

    // 1. Live / Active / Enabled Statuses
    if (['active', 'live', 'published', 'enabled', 'running', 'success', 'connected', 'ready', 'delivered', 'sent', 'won', 'completed', 'approved'].includes(lower)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-3xs shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize">{cleanText}</span>
        </span>
      );
    }

    // 2. Draft / Pending / Scheduled Statuses
    if (['draft', 'pending', 'scheduled', 'processing', 'queued', 'wait', 'waiting', 'in_progress', 'open', 'review'].includes(lower)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-3xs shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="capitalize">{cleanText}</span>
        </span>
      );
    }

    // 3. Paused / Inactive / Disabled Statuses
    if (['paused', 'inactive', 'disabled', 'stopped', 'archived', 'closed', 'resolved', 'ended'].includes(lower)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/80 shadow-3xs shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          <span className="capitalize">{cleanText}</span>
        </span>
      );
    }

    // 4. Failed / Deleted / Error Statuses
    if (['failed', 'error', 'deleted', 'cancelled', 'rejected', 'bounced', 'lost', 'disconnected'].includes(lower)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-3xs shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="capitalize">{cleanText}</span>
        </span>
      );
    }

    // 5. Numeric / Currency / Percentage / ID values
    if (/^#\d+$/.test(cleanText) || /^id[:\s]*\d+$/i.test(cleanText)) {
      return (
        <span className="font-mono text-zinc-950 font-bold text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded border border-[#E8E8E6] shrink-0">
          {cleanText.startsWith('#') ? cleanText : `#${cleanText.replace(/\D/g, '')}`}
        </span>
      );
    }

    if (/^[$€£₹]?\s*[\d,]+(\.\d+)?%?$/.test(cleanText)) {
      return <span className="font-mono text-zinc-950 font-semibold text-[11.5px]">{cleanText}</span>;
    }

    // 6. Default inline markdown formatting
    return renderInline(cell);
  };

  // Infer meaningful table title from context or headers instead of generic 'Data Table'
  const inferTableTitle = (headers: string[], precedingLines?: string[]): string => {
    // 1. Check if preceding text line introduces the table
    if (precedingLines && precedingLines.length > 0) {
      for (let idx = precedingLines.length - 1; idx >= 0; idx--) {
        const line = precedingLines[idx].trim();
        if (!line) continue;
        const headingMatch = line.match(/^#{1,4}\s+(.*)/) || line.match(/^\*\*(.*)\*\*[:]?$/);
        if (headingMatch && headingMatch[1]) {
          const clean = headingMatch[1].replace(/[*_#`:]/g, '').trim();
          if (clean.length >= 3 && clean.length <= 40) {
            return clean;
          }
        }
        break;
      }
    }

    // 2. Infer from headers content
    const joined = headers.map((h) => h.replace(/[*_#`]/g, '').trim().toLowerCase()).join(' ');

    if (/campaign/i.test(joined)) return 'Campaigns Overview';
    if (/flow|workflow/i.test(joined)) return 'Automation Flows';
    if (/chatbot|bot/i.test(joined)) return 'AI Chatbots';
    if (/contact|phone|customer|audience/i.test(joined)) return 'Contacts Directory';
    if (/ad\b|adset|meta/i.test(joined)) return 'Ad Campaigns';
    if (/post|social/i.test(joined)) return 'Social Media Posts';
    if (/template/i.test(joined)) return 'Message Templates';
    if (/order|product|revenue|store/i.test(joined)) return 'E-Commerce Summary';
    if (/appointment|booking|calendar/i.test(joined)) return 'Appointments Schedule';
    if (/deal|pipeline/i.test(joined)) return 'CRM Deals Pipeline';
    if (/metric|conversion|click|impression|read|delivered|rate/i.test(joined)) return 'Performance Insights';
    if (/node|step|action/i.test(joined)) return 'Workflow Pipeline';

    return 'Summary Overview';
  };

  const getTableIcon = (title: string, headers: string[]) => {
    const combined = `${title} ${headers.join(' ')}`.toLowerCase();
    if (/campaign/i.test(combined)) return <Megaphone className="h-3.5 w-3.5 text-amber-600" />;
    if (/flow|workflow/i.test(combined)) return <GitBranch className="h-3.5 w-3.5 text-emerald-600" />;
    if (/chatbot|bot/i.test(combined)) return <Bot className="h-3.5 w-3.5 text-purple-600" />;
    if (/contact|phone|customer|audience/i.test(combined)) return <UserCheck className="h-3.5 w-3.5 text-sky-600" />;
    if (/ad\b|adset|meta/i.test(combined)) return <Layers className="h-3.5 w-3.5 text-blue-600" />;
    if (/post|social/i.test(combined)) return <Share2 className="h-3.5 w-3.5 text-indigo-600" />;
    if (/template/i.test(combined)) return <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />;
    if (/order|product|revenue|store/i.test(combined)) return <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />;
    if (/appointment|booking/i.test(combined)) return <Calendar className="h-3.5 w-3.5 text-violet-600" />;
    if (/deal|pipeline/i.test(combined)) return <Rocket className="h-3.5 w-3.5 text-emerald-600" />;
    return <Table className="h-3.5 w-3.5 text-zinc-600" />;
  };

  // Content Block Types for Separating Bubbles from Modular Cards
  type ContentBlock =
    | { type: 'text'; lines: string[] }
    | { type: 'table'; headers: string[]; rows: string[][]; key: string; title: string }
    | { type: 'code'; language: string; code: string; key: string };

  // Parser that breaks message markdown into separated blocks
  const parseMessageBlocks = (content: string, messageId: string): ContentBlock[] => {
    const lines = content.split('\n');
    const blocks: ContentBlock[] = [];
    let currentTextLines: string[] = [];
    let i = 0;

    const flushText = () => {
      if (currentTextLines.length > 0) {
        const hasContent = currentTextLines.some((l) => l.trim().length > 0);
        if (hasContent) {
          blocks.push({ type: 'text', lines: [...currentTextLines] });
        }
        currentTextLines = [];
      }
    };

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      // 1. Code Block Fence
      if (line.startsWith('```')) {
        flushText();
        const codeLang = line.replace(/^```/, '').trim() || 'code';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++;
        blocks.push({
          type: 'code',
          language: codeLang,
          code: codeLines.join('\n'),
          key: `${messageId}-code-${i}`,
        });
        continue;
      }

      // 2. Markdown Table Detection
      if (
        line.startsWith('|') &&
        line.endsWith('|') &&
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith('|') &&
        lines[i + 1].includes('---')
      ) {
        const precedingLines = [...currentTextLines];
        flushText();
        const headerCells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        i += 2;
        const dataRows: string[][] = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith('|') &&
          lines[i].trim().endsWith('|')
        ) {
          const cells = lines[i]
            .trim()
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          dataRows.push(cells);
          i++;
        }
        blocks.push({
          type: 'table',
          headers: headerCells,
          rows: dataRows,
          key: `${messageId}-table-${i}`,
          title: inferTableTitle(headerCells, precedingLines),
        });
        continue;
      }

      currentTextLines.push(rawLine);
      i++;
    }

    flushText();
    return blocks;
  };

  // Text Lines Formatter for Conversational Bubbles
  const renderTextLines = (lines: string[]) => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      // Horizontal Dividers (Connected end-to-end of the chat bubble)
      if (line === '---' || line === '***') {
        elements.push(<hr key={`hr-${i}`} className="-mx-3.5 my-2.5 border-0 border-t border-[#E8E8E6]" />);
        i++;
        continue;
      }

      // Blockquote / Callout Note
      if (line.startsWith('> ')) {
        elements.push(
          <div
            key={`quote-${i}`}
            className="my-2 pl-3.5 pr-3 py-2 border-l-2 border-zinc-900 text-xs text-zinc-700 bg-zinc-50/80 rounded-r-[6px] font-normal leading-relaxed border-y border-r border-[#E8E8E6]/60"
          >
            {renderInline(line.substring(2))}
          </div>
        );
        i++;
        continue;
      }

      // Unordered List Items
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        const bulletText = line.substring(2);
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#008069] mt-1.5 shrink-0" />
            <span className="text-xs leading-relaxed text-zinc-800 flex-1 font-normal">
              {renderInline(bulletText)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered List Items
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 my-1 pl-0.5">
            <span className="h-4.5 w-4.5 rounded-full bg-zinc-100 text-zinc-800 border border-[#E8E8E6] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
              {numMatch[1]}
            </span>
            <span className="text-xs leading-relaxed text-zinc-800 flex-1 font-normal">
              {renderInline(numMatch[2])}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={`h3-${i}`}
            className="text-xs font-bold text-zinc-950 mt-2.5 mb-1 tracking-tight flex items-center gap-1.5 uppercase"
          >
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span>{renderInline(line.substring(4))}</span>
          </h4>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={`h2-${i}`}
            className="text-xs font-extrabold text-zinc-950 mt-3 mb-1.5 tracking-wider uppercase border-b border-[#E8E8E6] pb-1"
          >
            {renderInline(line.substring(3))}
          </h3>
        );
        i++;
        continue;
      }

      // Empty lines
      if (!line) {
        elements.push(<div key={`empty-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // Standard paragraphs
      elements.push(
        <p key={`p-${i}`} className="text-xs leading-relaxed text-zinc-800 my-0.5 font-normal">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  // Helper for Action Card Type Details for the 8 Core Modules (Create & Update only)
  const getActionMeta = (action: CopilotActionData) => {
    switch (action.type) {
      // 1. Campaigns
      case 'create_campaign':
        return {
          icon: <Megaphone className="h-3.5 w-3.5 text-amber-700" />,
          iconBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          typeName: t('actions.campaign') || 'WhatsApp Campaign',
          title: action.title || t('actions.createCampaignTitle') || 'Create Campaign Draft',
          buttonLabel: t('actions.saveCampaignDraft') || 'Save Campaign Draft',
          viewLabel: t('actions.viewInCampaigns') || 'View in Campaigns',
          redirectUrl: '/campaigns',
          isDelete: false,
        };
      case 'update_campaign':
        return {
          icon: <Megaphone className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.campaignUpdate') || 'Campaign Update',
          title: action.title || t('actions.updateCampaignTitle') || 'Update Campaign Draft',
          buttonLabel: t('actions.saveCampaignUpdates') || 'Save Campaign Updates',
          viewLabel: t('actions.viewInCampaigns') || 'View in Campaigns',
          redirectUrl: '/campaigns',
          isDelete: false,
        };

      // 2. AI ChatBots
      case 'create_ai_chatbot':
        return {
          icon: <Bot className="h-3.5 w-3.5 text-purple-700" />,
          iconBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
          typeName: t('actions.chatbot') || 'AI Support ChatBot',
          title: action.title || t('actions.createChatbotTitle') || 'Create AI ChatBot Draft',
          buttonLabel: t('actions.saveChatbotDraft') || 'Save ChatBot Draft',
          viewLabel: t('actions.viewInChatbots') || 'View in ChatBots',
          redirectUrl: '/chatbot',
          isDelete: false,
        };
      case 'update_ai_chatbot':
        return {
          icon: <Bot className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.chatbotUpdate') || 'AI ChatBot Update',
          title: action.title || t('actions.updateChatbotTitle') || 'Update AI ChatBot',
          buttonLabel: t('actions.saveChatbotUpdates') || 'Save ChatBot Updates',
          viewLabel: t('actions.viewInChatbots') || 'View in ChatBots',
          redirectUrl: '/chatbot',
          isDelete: false,
        };

      // 3. Automation Flows
      case 'create_flow':
        return {
          icon: <GitBranch className="h-3.5 w-3.5 text-emerald-700" />,
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          typeName: t('actions.flow') || 'Automation Flow',
          title: action.title || t('actions.createFlowTitle') || 'Create Automation Flow Draft',
          buttonLabel: t('actions.saveFlowDraft') || 'Save Flow Draft',
          viewLabel: t('actions.openInFlowBuilder') || 'Open in Flow Builder',
          redirectUrl: action.data?.id ? `/flows/${action.data.id}/edit` : '/flows',
          isDelete: false,
        };
      case 'update_flow':
        return {
          icon: <GitBranch className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.flowUpdate') || 'Automation Flow Update',
          title: action.title || t('actions.updateFlowTitle') || 'Update Automation Flow',
          buttonLabel: t('actions.saveFlowUpdates') || 'Save Flow Updates',
          viewLabel: t('actions.openInFlowBuilder') || 'Open in Flow Builder',
          redirectUrl: action.data?.id ? `/flows/${action.data.id}/edit` : '/flows',
          isDelete: false,
        };
      case 'extend_flow':
        return {
          icon: <GitBranch className="h-3.5 w-3.5 text-teal-700" />,
          iconBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
          typeName: t('actions.flowExtend') || 'Extend Flow Architecture',
          title: action.title || t('actions.extendFlowTitle') || 'Extend Automation Flow',
          buttonLabel: t('actions.applyExtendedSteps') || 'Apply Extended Steps',
          viewLabel: t('actions.openInFlowBuilder') || 'Open in Flow Builder',
          redirectUrl: action.data?.id ? `/flows/${action.data.id}/edit` : '/flows',
          isDelete: false,
        };

      // 4. Social Posts
      case 'create_social_post':
        return {
          icon: <Share2 className="h-3.5 w-3.5 text-sky-700" />,
          iconBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
          typeName: t('actions.socialPost') || 'Social Media Post',
          title: action.title || t('actions.createSocialTitle') || 'Create Social Post Draft',
          buttonLabel: t('actions.savePostDraft') || 'Save Post Draft',
          viewLabel: t('actions.viewInSocialPosts') || 'View in Social Posts',
          redirectUrl: '/social-posts',
          isDelete: false,
        };
      case 'update_social_post':
        return {
          icon: <Share2 className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.socialPostUpdate') || 'Social Post Update',
          title: action.title || t('actions.updateSocialTitle') || 'Update Social Post',
          buttonLabel: t('actions.savePostUpdates') || 'Save Post Updates',
          viewLabel: t('actions.viewInSocialPosts') || 'View in Social Posts',
          redirectUrl: '/social-posts',
          isDelete: false,
        };

      // 5. Ad Campaigns
      case 'create_meta_campaign':
        return {
          icon: <Layers className="h-3.5 w-3.5 text-blue-700" />,
          iconBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          typeName: t('actions.metaCampaign') || 'Meta Ad Campaign (Draft)',
          title: action.title || t('actions.createMetaTitle') || 'Create Ad Campaign Draft',
          buttonLabel: t('actions.saveMetaDraft') || 'Save Campaign Draft',
          viewLabel: t('actions.openInMetaAds') || 'Open in Meta Ads',
          redirectUrl: '/meta-ads',
          isDelete: false,
        };
      case 'update_meta_campaign':
        return {
          icon: <Layers className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.metaCampaignUpdate') || 'Meta Ad Campaign Update',
          title: action.title || t('actions.updateMetaTitle') || 'Update Ad Campaign',
          buttonLabel: t('actions.saveMetaUpdates') || 'Save Campaign Updates',
          viewLabel: t('actions.openInMetaAds') || 'Open in Meta Ads',
          redirectUrl: '/meta-ads',
          isDelete: false,
        };
      case 'publish_meta_campaign':
        return {
          icon: <Zap className="h-3.5 w-3.5 text-emerald-700" />,
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          typeName: t('actions.metaPublish') || 'Publish to Meta Graph API',
          title: action.title || t('actions.publishMetaTitle') || 'Publish Campaign to Meta',
          buttonLabel: t('actions.publishToMetaNow') || 'Publish to Meta Now',
          viewLabel: t('actions.openInMetaAds') || 'Open in Meta Ads',
          redirectUrl: '/meta-ads',
          isDelete: false,
        };

      // 6. Quick Replies
      case 'create_quick_reply':
        return {
          icon: <Zap className="h-3.5 w-3.5 text-amber-600" />,
          iconBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          typeName: t('actions.quickReply') || 'Quick Reply Shortcut',
          title: action.title || t('actions.createQuickReplyTitle') || 'Create Quick Reply Draft',
          buttonLabel: t('actions.saveQuickReplyDraft') || 'Save Quick Reply Draft',
          viewLabel: t('actions.viewInQuickReplies') || 'View in Quick Replies',
          redirectUrl: '/quick-replies',
          isDelete: false,
        };
      case 'update_quick_reply':
        return {
          icon: <Zap className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.quickReplyUpdate') || 'Quick Reply Update',
          title: action.title || t('actions.updateQuickReplyTitle') || 'Update Quick Reply',
          buttonLabel: t('actions.saveQuickReplyUpdates') || 'Save Quick Reply Updates',
          viewLabel: t('actions.viewInQuickReplies') || 'View in Quick Replies',
          redirectUrl: '/quick-replies',
          isDelete: false,
        };

      // 7. Message Templates
      case 'create_message_template':
        return {
          icon: <FileText className="h-3.5 w-3.5 text-teal-700" />,
          iconBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
          typeName: t('actions.messageTemplate') || 'Official Message Template',
          title: action.title || t('actions.createTemplateTitle') || 'Create Message Template Draft',
          buttonLabel: t('actions.saveTemplateDraft') || 'Save Template Draft',
          viewLabel: t('actions.viewInTemplates') || 'View in Templates',
          redirectUrl: '/templates',
          isDelete: false,
        };
      case 'update_message_template':
        return {
          icon: <FileText className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.messageTemplateUpdate') || 'Message Template Update',
          title: action.title || t('actions.updateTemplateTitle') || 'Update Message Template',
          buttonLabel: t('actions.saveTemplateUpdates') || 'Save Template Updates',
          viewLabel: t('actions.viewInTemplates') || 'View in Templates',
          redirectUrl: '/templates',
          isDelete: false,
        };

      // 8. WhatsApp Flows
      case 'create_whatsapp_flow':
        return {
          icon: <Sparkles className="h-3.5 w-3.5 text-emerald-700" />,
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          typeName: t('actions.whatsappFlow') || 'WhatsApp Interactive Flow',
          title: action.title || t('actions.createWhatsAppFlowTitle') || 'Create WhatsApp Flow Draft',
          buttonLabel: t('actions.saveFlowFormDraft') || 'Save Flow Form Draft',
          viewLabel: t('actions.viewInWhatsAppFlows') || 'View in WhatsApp Flows',
          redirectUrl: '/whatsapp-flows',
          isDelete: false,
        };
      case 'update_whatsapp_flow':
        return {
          icon: <Sparkles className="h-3.5 w-3.5 text-indigo-700" />,
          iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          typeName: t('actions.whatsappFlowUpdate') || 'WhatsApp Flow Update',
          title: action.title || t('actions.updateWhatsAppFlowTitle') || 'Update WhatsApp Flow',
          buttonLabel: t('actions.saveFlowFormUpdates') || 'Save Flow Form Updates',
          viewLabel: t('actions.viewInWhatsAppFlows') || 'View in WhatsApp Flows',
          redirectUrl: '/whatsapp-flows',
          isDelete: false,
        };

      default:
        return null;
    }
  };

  return (
    <>
      {/* Animated AI Gradient Keyframes */}
      <style>{`
        @keyframes aiGradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .ai-gradient-animated {
          background: linear-gradient(135deg, #FED7AA 0%, #FECDD3 25%, #E0E7FF 50%, #BBF7D0 75%, #FED7AA 100%);
          background-size: 250% 250%;
          animation: aiGradientShift 7s ease infinite;
        }
      `}</style>

      {/* Hidden file input for dropzone upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />

      {/* 1A. COLLAPSED FLOATING WIDGET (CENTER BOTTOM) - EXCLUSIVELY AVAILABLE ON PRIMARY SIDEBAR PAGES (EXCEPT SHARED INBOX) */}
      <AnimatePresence>
        {!isExpanded && isSidebarPage && !isPillMinimized && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9990] select-none font-sans pointer-events-auto flex flex-col items-center">
            <motion.div
              key="copilot-collapsed-wrapper"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.8 }}
              className="relative flex flex-col items-center"
            >
              {/* Main Collapsed Field with Platform Design */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setIsExpanded(true);
                  }
                }}
                className="group relative p-[1px] rounded-full shadow-3xs hover:shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 overflow-hidden"
              >
                {/* Flowing AI Gradient Border Layer */}
                <div className="absolute inset-0 ai-gradient-animated opacity-90" />

                {/* Inner White Capsule Content with Glassmorphic Backdrop */}
                <div className="relative bg-white/95 hover:bg-white backdrop-blur-md rounded-full px-3.5 py-2 flex items-center gap-3 transition-colors border border-[#E8E8E6]/60">
                  {/* Avatar Icon */}
                  <div className="h-7 w-7 rounded-full bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-950 flex items-center justify-center shadow-3xs group-hover:scale-105 transition-transform shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-900 stroke-[2.2]" />
                  </div>

                  {/* Dynamic Animated Rotating Prompt Text */}
                  <div className="w-[160px] sm:w-[220px] overflow-hidden text-left select-none relative h-5 flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTipIndex}
                        initial={{ opacity: 0, y: 7 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -7 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 truncate flex items-center gap-1.5"
                      >
                        <span className="font-bold text-zinc-900">{COLLAPSED_TIPS[activeTipIndex].title}</span>
                        <span className="hidden sm:inline text-zinc-400 font-normal truncate">{t('clickToPrompt') || 'Click to prompt'}</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Right Tools & Shortcut Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 border-l border-[#E8E8E6] pl-2">
                    <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-500 bg-[#FAFAFA] rounded border border-[#E8E8E6] shadow-3xs">
                      ⌘K
                    </kbd>

                    {/* Circular Send Arrow Indicator */}
                    <div className="h-6 w-6 rounded-full bg-[#0A0A0A] group-hover:bg-zinc-800 text-white flex items-center justify-center shadow-3xs transition-colors">
                      <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                    </div>

                    {/* Minimize / Collapse to Corner Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPillMinimized(true);
                      }}
                      title="Minimize to corner"
                      aria-label="Minimize Copilot to corner"
                      className="h-6 w-6 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1B. FLOATING ROUND COPILOT BUTTON (BOTTOM CORNER) - ACTIVE IN SHARED INBOX, NESTED, CREATE, & EDIT PAGES OR WHEN MINIMIZED */}
      <AnimatePresence>
        {!isExpanded && (!isSidebarPage || isPillMinimized) && (
          <motion.div
            key="copilot-corner-button"
            initial={{ opacity: 0, scale: 0.7, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 14 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className={`fixed bottom-5 sm:bottom-6 ${isRtl ? 'left-5 sm:left-6' : 'right-5 sm:right-6'} z-[9990] select-none pointer-events-auto`}
          >
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="group relative flex items-center justify-center h-12 w-12 sm:h-13 sm:w-13 rounded-full cursor-pointer focus:outline-none active:scale-95 transition-all duration-300 shadow-lg hover:shadow-2xl"
                title={`${brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')} (⌘K)`}
                aria-label={brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')}
              >
                {/* Ambient Glowing Shadow with animated gradient blur */}
                <div className="absolute -inset-1 rounded-full ai-gradient-animated opacity-70 group-hover:opacity-100 blur-md transition-opacity duration-300" />

                {/* Animated Gradient Round Button with subtle border */}
                <div className="relative h-full w-full rounded-full ai-gradient-animated p-[1.5px] flex items-center justify-center border border-white/60">
                  <div className="h-full w-full rounded-full ai-gradient-animated flex items-center justify-center shadow-inner overflow-hidden relative">
                    {/* Subtle glass gloss highlight overlay */}
                    <div className="absolute inset-0 bg-white/20 group-hover:bg-white/10 transition-colors pointer-events-none" />
                    
                    {/* Centered Sparkles Icon */}
                    <Sparkles className="relative z-10 h-5 w-5 sm:h-6 sm:w-6 text-zinc-950 stroke-[2.2] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" />
                  </div>
                </div>
              </button>

              {isSidebarPage && isPillMinimized && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPillMinimized(false);
                  }}
                  title="Restore floating bar"
                  className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-white border border-[#E8E8E6] text-zinc-600 hover:text-black shadow-xs flex items-center justify-center transition-all cursor-pointer z-20"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. EXPANDED STATE: CONNECTED RIGHT-SIDE DRAWER (PLATFORM-INTEGRATED & NON-BLOCKING) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="copilot-expanded-drawer"
            ref={containerRef}
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }}
            className="pointer-events-auto fixed top-0 right-0 bottom-0 h-screen w-[420px] sm:w-[440px] max-w-full bg-white border-l border-[#E8E8E6] shadow-[-6px_0_24px_rgba(0,0,0,0.06)] z-[9990] flex flex-col font-sans select-none overflow-hidden"
          >
            {/* 1. TOP HEADER: Seamlessly blends with platform top bar divider (h-14 md:h-16, border-b #E8E8E6) */}
            <div className="h-14 md:h-16 px-4 bg-white border-b border-[#E8E8E6] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-[8px] bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center p-1 shrink-0 shadow-3xs">
                  <PlatformLogo 
                    className="h-4.5 w-auto object-contain max-h-4.5"
                    fallbackClassName="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0 select-none"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-zinc-950 text-xs tracking-tight uppercase truncate">
                    {brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium truncate">
                    {pathname.includes('/flows/') ? (t('visualWorkflowDesigner') || 'Visual Workflow Designer') : (t('workspaceAssistant') || 'Autonomous Workspace Assistant')}
                  </span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleClearHistory();
                    toast.info(t('clearChat') || 'Conversation cleared');
                  }}
                  className="h-7.5 w-7.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-500 hover:text-black flex items-center justify-center transition-colors shadow-3xs cursor-pointer"
                  title={t('clearConversation') || 'Clear conversation'}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="h-7.5 w-7.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-500 hover:text-black flex items-center justify-center transition-colors shadow-3xs cursor-pointer"
                  title={t('closeDrawer') || 'Close drawer (Esc)'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2. CHAT MESSAGES STREAM */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin select-text min-h-0 bg-[#FAFAFA]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-end select-none animate-fade-in pb-1 w-full space-y-2">
                    {/* Single Interactive Greeting Title */}
                    <div className="w-full px-1 pt-1 pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setGreetingIndex((prev) => (prev + 1) % INTERACTIVE_MESSAGES.length);
                          setCardsSeed((prev) => prev + 1);
                        }}
                        className="group flex flex-wrap items-baseline gap-x-1.5 text-left cursor-pointer focus:outline-none select-none transition-colors"
                        title="Click to cycle suggestions"
                      >
                        <span className="text-[13px] font-bold text-zinc-900 group-hover:text-black tracking-tight">
                          {dynamicGreeting}!
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={greetingIndex}
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -2 }}
                            transition={{ duration: 0.18 }}
                            className="text-[13px] font-medium text-zinc-500 group-hover:text-zinc-800 transition-colors"
                          >
                            {INTERACTIVE_MESSAGES[greetingIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>

                    {/* 4-6 Minimal & Professional Cards at Bottom */}
                    <div className="w-full space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin px-0.5">
                      {displayedCapabilities.map((cap, idx) => {
                        const Icon = cap.icon;
                        return (
                          <motion.button
                            key={`${cap.id}-${cardsSeed}`}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: idx * 0.035 }}
                            onClick={() => {
                              setInputMessage(cap.prompt);
                              setTimeout(() => {
                                if (inputRef.current) {
                                  inputRef.current.focus();
                                  const len = cap.prompt.length;
                                  inputRef.current.setSelectionRange(len, len);
                                }
                              }, 80);
                            }}
                            className="group relative w-full p-2.5 rounded-xl border border-[#E8E8E6] bg-white hover:bg-white hover:border-zinc-300 hover:shadow-2xs transition-all duration-200 cursor-pointer flex items-center justify-between text-left select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-1.5 flex-1">
                              {/* Colored Icon */}
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cap.colorScheme.bgColor} ${cap.colorScheme.iconColor} group-hover:scale-105 transition-transform shadow-3xs`}>
                                <Icon className="h-4 w-4 stroke-[2.2]" />
                              </div>

                              {/* Content with Colored Text Title */}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-[12px] font-bold ${cap.colorScheme.iconColor} tracking-tight truncate`}>
                                  {cap.title}
                                </span>
                                <p className="text-[11px] text-zinc-500 group-hover:text-zinc-800 line-clamp-1 leading-normal">
                                  {cap.prompt}
                                </p>
                              </div>
                            </div>

                            {/* Minimal Arrow Indicator */}
                            <div className="h-6 w-6 rounded-full text-zinc-300 group-hover:text-zinc-900 flex items-center justify-center shrink-0 transition-colors ml-1">
                              <ArrowRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    const meta = msg.action ? getActionMeta(msg.action) : null;
                    const actionData = (msg.action && typeof msg.action === 'object' && msg.action.data)
                      ? msg.action.data
                      : (msg.action as any) || {};
                    const blocks = !isUser ? parseMessageBlocks(msg.content, msg.id) : [];

                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex items-start justify-end gap-2.5 animate-fade-in group/user">
                          <div className="flex flex-col items-end max-w-[85%] min-w-0 space-y-1.5">
                            {/* User Header Info & Timestamp */}
                            <div className="flex items-center gap-2 mb-0.5 select-none text-[11px] justify-end">
                              {msg.timestamp && (
                                <span className="font-mono text-[10px] font-medium text-zinc-400 tracking-tight">
                                  {msg.timestamp}
                                </span>
                              )}
                              <span className="font-bold text-zinc-900 text-[11px] tracking-tight">
                                {t('you') || 'You'}
                              </span>
                            </div>

                            {/* User Attached Files Chips */}
                            {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 justify-end mb-1">
                                {msg.attachedFiles.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white text-zinc-800 border border-[#E8E8E6] text-[11px] font-semibold shadow-3xs"
                                  >
                                    <Paperclip className="h-3 w-3 text-zinc-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">{file.name}</span>
                                    <span className="text-[9.5px] text-zinc-400 font-mono">({file.size})</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Crisp User Text Bubble (WhatsOmni Deep Dark Capsule) */}
                            <div className="bg-[#0A0A0A] text-white px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-3xs text-xs font-normal leading-relaxed whitespace-pre-wrap border border-zinc-900 selection:bg-zinc-700 selection:text-white">
                              {msg.content}
                            </div>
                          </div>

                          {/* Minimalist User Avatar */}
                          <div className="h-6.5 w-6.5 rounded-[6px] bg-[#0A0A0A] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-3xs border border-zinc-800">
                            <User className="h-3.5 w-3.5 text-zinc-300 stroke-[2.2]" />
                          </div>
                        </div>
                      );
                    }

                    // Assistant Message with Avatar and Identity Header
                    return (
                      <div key={msg.id} className="flex items-start gap-2.5 w-full animate-fade-in group/assistant">
                        {/* Modern Platform Logo Avatar */}
                        <div className="h-6.5 w-6.5 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center p-0.5 shrink-0 mt-0.5 shadow-3xs overflow-hidden">
                          <PlatformLogo 
                            className="h-3.5 w-auto object-contain max-h-3.5"
                            fallbackClassName="w-5 h-5 rounded flex items-center justify-center font-black text-[9px] shadow-2xs shrink-0 select-none"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Assistant Header Info & Timestamp */}
                          <div className="flex items-center gap-2 mb-0.5 select-none text-[11px]">
                            <span className="font-bold text-zinc-950 text-xs tracking-tight">
                              {brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')}
                            </span>
                            {msg.timestamp && (
                              <span className="font-mono text-[10px] font-medium text-zinc-400 tracking-tight ml-auto">
                                {msg.timestamp}
                              </span>
                            )}
                          </div>

                          {/* Modular Content Blocks: Separating Text Bubbles, Data Tables, Code Snippets */}
                          {blocks.map((block, bIdx) => {
                            if (block.type === 'text') {
                              return (
                                <div
                                  key={`text-${bIdx}`}
                                  className="bg-white border border-[#E8E8E6] text-zinc-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed shadow-3xs hover:border-zinc-300 transition-all select-text space-y-1.5"
                                >
                                  {renderTextLines(block.lines)}
                                </div>
                              );
                            }

                            if (block.type === 'table') {
                              const tableTitle = block.title || inferTableTitle(block.headers);
                              const icon = getTableIcon(tableTitle, block.headers);

                              return (
                                <div
                                  key={block.key}
                                  className="w-full bg-white rounded-xl border border-[#E8E8E6] shadow-3xs overflow-hidden animate-fade-in text-left my-2.5"
                                >
                                  {/* Table Top Header */}
                                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF9F6] border-b border-[#E8E8E6]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="h-6 w-6 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs">
                                        {icon}
                                      </div>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-zinc-950 tracking-tight truncate">
                                          {tableTitle}
                                        </span>
                                        <span className="text-[10px] font-mono font-semibold text-zinc-500 bg-white border border-[#E8E8E6] px-1.5 py-0.5 rounded shadow-3xs shrink-0">
                                          {block.rows.length} {block.rows.length === 1 ? (t('record') || 'record') : (t('records') || 'records')}
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyTable(block.key, block.headers, block.rows)}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-white border border-[#E8E8E6] text-zinc-700 hover:text-black hover:bg-zinc-50 shadow-3xs transition-all cursor-pointer shrink-0 active:scale-95"
                                      title={t('tableCopied') || "Copy table formatted as TSV"}
                                    >
                                      {copiedTableId === block.key ? (
                                        <>
                                          <CheckCheck className="h-3 w-3 text-emerald-600" />
                                          <span className="text-emerald-700 font-bold">{t('copied') || 'Copied'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3 text-zinc-400" />
                                          <span>{t('copy') || 'Copy'}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Table Body */}
                                  <div className="overflow-x-auto max-h-72 overflow-y-auto select-text scrollbar-thin scrollbar-thumb-zinc-200">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-[#FAF9F6] sticky top-0 z-10 border-b border-[#E8E8E6]">
                                        <tr>
                                          {block.headers.map((h, hIdx) => {
                                            const cleanH = h.replace(/[*_`#]/g, '').trim();
                                            const isId = /id|#|^no$/i.test(cleanH);
                                            const isStatus = /status|state/i.test(cleanH);
                                            const isNumeric = /budget|contacts|count|price|rate|spend|revenue|delivered|read|total/i.test(cleanH);

                                            return (
                                              <th
                                                key={hIdx}
                                                className={`px-3 py-2 font-bold text-zinc-600 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                                                  isId ? 'w-16 text-center' : isStatus ? 'text-right' : isNumeric ? 'text-right' : 'text-left'
                                                }`}
                                              >
                                                {renderInline(h)}
                                              </th>
                                            );
                                          })}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E8E8E6]">
                                        {block.rows.map((row, rIdx) => (
                                          <tr
                                            key={rIdx}
                                            className="hover:bg-zinc-50/80 transition-colors odd:bg-white even:bg-[#FAF9F6]/40"
                                          >
                                            {row.map((cell, cIdx) => {
                                              const header = (block.headers[cIdx] || '').replace(/[*_`#]/g, '').trim();
                                              const isId = /id|#|^no$/i.test(header);
                                              const isStatus = /status|state/i.test(header);
                                              const isNumeric = /budget|contacts|count|price|rate|spend|revenue|delivered|read|total/i.test(header);
                                              const isName = /name|title|subject|campaign|flow|bot/i.test(header);
                                              const rawCellText = cell.replace(/[*_`#]/g, '').trim();

                                              return (
                                                <td
                                                  key={cIdx}
                                                  title={isName ? rawCellText : undefined}
                                                  className={`px-3 py-2 text-zinc-800 text-xs align-middle ${
                                                    isId ? 'w-16 text-center' : isStatus ? 'text-right shrink-0 whitespace-nowrap' : isNumeric ? 'text-right font-mono' : 'text-left'
                                                  } ${isName ? 'font-medium text-zinc-900 max-w-[170px] truncate' : ''}`}
                                                >
                                                  {renderSmartTableCell(cell)}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            }

                            if (block.type === 'code') {
                              return (
                                <div
                                  key={block.key}
                                  className="w-full bg-[#0A0A0A] rounded-xl border border-zinc-800 shadow-3xs overflow-hidden text-zinc-100 animate-fade-in text-left my-2.5 select-text"
                                >
                                  <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 font-mono select-none">
                                    <div className="flex items-center gap-2">
                                      <span className="uppercase font-semibold tracking-wider text-zinc-300 text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                                        {block.language}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(block.code)}
                                      className="hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10.5px] font-medium cursor-pointer transition-colors"
                                      title={t('copy') || "Copy code snippet"}
                                    >
                                      {copiedText === block.code ? (
                                        <>
                                          <CheckCheck className="h-3 w-3 text-emerald-400" />
                                          <span className="text-emerald-400 font-bold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3 text-zinc-400" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="p-3.5 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre text-zinc-200 selection:bg-zinc-700">
                                    {block.code}
                                  </pre>
                                </div>
                              );
                            }

                            return null;
                          })}

                          {/* INTERACTIVE FORM CARD (WHEN AI ASKS USER FOR PROPERTIES/INFORMATION) */}
                          {msg.form && (
                            <div className="mt-2.5 w-full bg-white rounded-xl border border-[#E8E8E6] shadow-3xs overflow-hidden animate-fade-in text-left font-sans select-none">
                              {/* Form Header */}
                              <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAFAFA] border-b border-[#E8E8E6]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-6 w-6 rounded-[6px] bg-[#0A0A0A] text-white flex items-center justify-center shrink-0 shadow-3xs">
                                    <SlidersHorizontal className="h-3 w-3" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-zinc-950 truncate">
                                      {msg.form.title || t('setupParameters') || 'Setup Parameters & Properties'}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-medium">
                                      {t('configParams') || 'Configuration Parameters'}
                                    </div>
                                  </div>
                                </div>
                                {msg.formSubmitted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-3xs shrink-0">
                                    <Check className="h-3 w-3 text-[#008069]" />
                                    {t('submitted') || 'Submitted'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-full shrink-0">
                                    {t('required') || 'Required'}
                                  </span>
                                )}
                              </div>

                              {/* Form Fields Body */}
                              <div className="p-3.5 space-y-3 text-xs bg-white">
                                {msg.form.description && (
                                  <p className="text-[11.5px] text-zinc-600 leading-relaxed font-normal">
                                    {msg.form.description}
                                  </p>
                                )}

                                <div className="space-y-2.5">
                                  {msg.form.fields?.map((field) => {
                                    const fieldVal =
                                      formValues[msg.id]?.[field.key] !== undefined
                                        ? formValues[msg.id][field.key]
                                        : (field.defaultValue ?? '');

                                    return (
                                      <div key={field.key} className="space-y-1">
                                        <label className="text-[11px] font-semibold text-zinc-700 flex items-center justify-between">
                                          <span>{field.label}</span>
                                          {field.required && (
                                            <span className="text-[9.5px] text-rose-500 font-normal">*{t('required') || 'Required'}</span>
                                          )}
                                        </label>

                                        {field.type === 'textarea' ? (
                                          <textarea
                                            rows={2}
                                            disabled={msg.formSubmitted}
                                            value={fieldVal}
                                            onChange={(e) => handleUpdateFormField(msg.id, field.key, e.target.value)}
                                            placeholder={field.placeholder || t('enterDetails') || 'Enter details...'}
                                            className="w-full bg-[#FAFAFA] border border-[#E8E8E6] focus:border-black focus:bg-white rounded-[6px] p-2 text-xs text-zinc-900 placeholder-zinc-400 resize-none transition-all disabled:opacity-60 shadow-3xs"
                                          />
                                        ) : field.type === 'select' && field.options ? (
                                          <select
                                            disabled={msg.formSubmitted}
                                            value={fieldVal}
                                            onChange={(e) => handleUpdateFormField(msg.id, field.key, e.target.value)}
                                            className="w-full bg-[#FAFAFA] border border-[#E8E8E6] focus:border-black focus:bg-white rounded-[6px] p-2 text-xs text-zinc-900 transition-all cursor-pointer disabled:opacity-60 shadow-3xs"
                                          >
                                            {field.options.map((opt, oIdx) => (
                                              <option key={oIdx} value={opt}>
                                                {opt}
                                              </option>
                                            ))}
                                          </select>
                                        ) : field.type === 'number' ? (
                                          <input
                                            type="number"
                                            disabled={msg.formSubmitted}
                                            value={fieldVal}
                                            onChange={(e) => handleUpdateFormField(msg.id, field.key, e.target.value)}
                                            placeholder={field.placeholder || '0'}
                                            className="w-full bg-[#FAFAFA] border border-[#E8E8E6] focus:border-black focus:bg-white rounded-[6px] p-2 text-xs text-zinc-900 placeholder-zinc-400 transition-all disabled:opacity-60 shadow-3xs"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            disabled={msg.formSubmitted}
                                            value={fieldVal}
                                            onChange={(e) => handleUpdateFormField(msg.id, field.key, e.target.value)}
                                            placeholder={field.placeholder || t('enterValue') || 'Enter value...'}
                                            className="w-full bg-[#FAFAFA] border border-[#E8E8E6] focus:border-black focus:bg-white rounded-[6px] p-2 text-xs text-zinc-900 placeholder-zinc-400 transition-all disabled:opacity-60 shadow-3xs"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Form Action Button */}
                                {!msg.formSubmitted && (
                                  <div className="-mx-3.5 -mb-3.5 mt-3 px-3.5 py-2.5 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-end rounded-b-xl">
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitFormProperties(msg.id, msg.form!)}
                                      disabled={loading}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                      <Sparkles className="h-3 w-3 text-zinc-300" />
                                      <span>{t('generateDraft') || 'Generate Draft'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ACTION PROPOSAL CARD (8 CORE CRUD MODULES) - STUNNING & STRICT PLATFORM DESIGN LANGUAGE */}
                          {msg.action && meta && (
                            <div className={`mt-2.5 w-full bg-white rounded-xl border shadow-3xs overflow-hidden animate-fade-in text-left font-sans select-none transition-all ${
                              meta.isDelete ? 'border-rose-200 hover:border-rose-300' : 'border-[#E8E8E6] hover:border-zinc-300'
                            }`}>
                              {/* Clean Card Top Header */}
                              <div className="px-3.5 py-3 bg-[#FAFAFA] border-b border-[#E8E8E6] flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`h-7.5 w-7.5 rounded-[6px] border flex items-center justify-center shrink-0 shadow-3xs ${meta.iconBg}`}>
                                    {meta.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-zinc-950 truncate tracking-tight">
                                      {actionData.name || actionData.title || msg.action?.title || meta.title}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-medium truncate flex items-center gap-1">
                                      <span>{meta.typeName}</span>
                                    </div>
                                  </div>
                                </div>

                                {msg.executed ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-3xs shrink-0">
                                    <Check className="h-3 w-3 text-[#008069] stroke-[2.5]" />
                                    <span>{meta.isDelete ? (t('deleted') || 'Deleted') : (t('created') || 'Created')}</span>
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border shadow-3xs ${
                                    meta.isDelete ? 'bg-rose-50 text-rose-800 border-rose-200/80' : 'bg-amber-50 text-amber-800 border-amber-200/80'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.isDelete ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                                    <span>{meta.isDelete ? (t('delete') || 'Delete') : (t('draft') || 'Draft')}</span>
                                  </span>
                                )}
                              </div>

                              {/* Card Details Body */}
                              <div className="px-3.5 py-3 space-y-3 bg-white">
                                {meta.isDelete ? (
                                  <p className="text-xs text-rose-700/90 leading-relaxed font-normal">
                                    {t('permanentlyRemove') || 'Permanently remove this item from your workspace.'}
                                  </p>
                                ) : (
                                  <>
                                    {/* 1. Campaigns */}
                                    {(msg.action.type === 'create_campaign' || msg.action.type === 'update_campaign') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          <div className="flex items-center gap-1 font-medium text-zinc-700">
                                            <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                            <span>{t('broadcastPreview') || 'WhatsApp Broadcast'}</span>
                                          </div>
                                          {actionData.custom_subject && (
                                            <div className="flex items-center gap-1 text-zinc-600">
                                              <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                              <span className="text-zinc-500 font-medium">{t('subjectLabel') || 'Subject:'}</span>
                                              <span className="font-semibold text-zinc-900">{actionData.custom_subject}</span>
                                            </div>
                                          )}
                                        </div>

                                        {actionData.custom_message && (
                                          <div className="bg-[#FAFAFA] border border-[#E8E8E6] border-l-2 border-l-zinc-900 rounded-r-[6px] p-2.5 text-xs text-zinc-700 leading-relaxed font-normal italic">
                                            &quot;{actionData.custom_message}&quot;
                                          </div>
                                        )}

                                        {actionData.cta_button_text && (
                                          <div className="flex items-center gap-1.5 text-xs text-zinc-700">
                                            <ArrowRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            <span className="text-zinc-500 font-medium">{t('ctaLabel') || 'CTA Button:'}</span>
                                            <span className="font-bold text-zinc-950">{actionData.cta_button_text}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* 2. AI ChatBots */}
                                    {(msg.action.type === 'create_ai_chatbot' || msg.action.type === 'update_ai_chatbot') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          {(actionData.channels || actionData.channel) && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <MessageCircle className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                              <span className="text-zinc-500 font-medium">{t('channelLabel') || 'Channel:'}</span>
                                              <span className="font-semibold text-zinc-900 capitalize">
                                                {Array.isArray(actionData.channels || actionData.channel)
                                                  ? (actionData.channels || actionData.channel).join(', ')
                                                  : String(actionData.channels || actionData.channel)}
                                              </span>
                                            </div>
                                          )}
                                          {actionData.model && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Bot className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                              <span className="font-mono text-zinc-900">{actionData.model}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 space-y-1">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                                            <Bot className="h-3 w-3 text-purple-600" />
                                            <span>{t('systemDirectives') || 'System Directives'}</span>
                                          </div>
                                          <p className="text-xs text-zinc-700 leading-relaxed line-clamp-3 font-normal">
                                            {actionData.description || actionData.system_prompt || 'Autonomous customer assistant.'}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. Automation Flows */}
                                    {(msg.action.type === 'create_flow' || msg.action.type === 'update_flow' || msg.action.type === 'extend_flow') && (
                                      <div className="space-y-2.5">
                                        {/* Key properties with colored icons and text */}
                                        <div className="flex items-center gap-3.5 text-xs flex-wrap">
                                          {actionData.channels && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                              <span className="font-semibold text-zinc-900 uppercase">
                                                {Array.isArray(actionData.channels) ? actionData.channels.join(', ') : actionData.channels}
                                              </span>
                                            </div>
                                          )}
                                          {actionData.trigger_type && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                              <span className="text-zinc-500 font-medium">{t('trigger') || 'Trigger:'}</span>
                                              <span className="font-semibold text-zinc-900">{actionData.trigger_type.replace(/_/g, ' ')}</span>
                                            </div>
                                          )}
                                          {Array.isArray(actionData.nodes) && actionData.nodes.length > 0 && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                              <span className="font-semibold text-zinc-900">{actionData.nodes.length} {t('canvasNodes') || 'Canvas Nodes'}</span>
                                            </div>
                                          )}
                                          {Array.isArray(actionData.edges) && actionData.edges.length > 0 && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <GitBranch className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                              <span>{actionData.edges.length} {t('connections') || 'Connections'}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Keywords with colored Tag icon and clean text */}
                                        {actionData.trigger_keywords?.length > 0 && (
                                          <div className="flex items-center gap-2 text-xs flex-wrap">
                                            <div className="flex items-center gap-1 font-medium text-zinc-500">
                                              <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                              <span>{t('keywords') || 'Keywords:'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {actionData.trigger_keywords.map((kw: string, kIdx: number) => (
                                                <span key={kIdx} className="font-mono text-[11px] font-semibold text-zinc-900">
                                                  #{kw}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Description */}
                                        {actionData.description && (
                                          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                                            {actionData.description}
                                          </p>
                                        )}

                                        {/* Visual Flow Node Pipeline Preview */}
                                        {Array.isArray(actionData.nodes) && actionData.nodes.length > 0 && (
                                          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 space-y-1.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                              <GitBranch className="h-3 w-3 text-[#008069]" />
                                              <span>{t('pipelineSequence') || 'Pipeline Sequence'} ({actionData.nodes.length} {t('steps') || 'steps'})</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                                              {actionData.nodes.slice(0, 8).map((node: any, nIdx: number) => {
                                                const label = node.data?.label || node.data?.title || node.type?.replace(/_/g, ' ') || `Step ${nIdx + 1}`;
                                                const NodeIcon = getFlowNodeIcon(node.type);
                                                return (
                                                  <React.Fragment key={node.id || nIdx}>
                                                    <span className="text-[10.5px] font-semibold px-2 py-1 bg-white border border-[#E8E8E6] rounded-[5px] text-zinc-800 whitespace-nowrap shadow-3xs flex items-center gap-1.5 shrink-0">
                                                      <NodeIcon className="h-3 w-3 text-[#008069] shrink-0" />
                                                      <span className="truncate max-w-[120px]">{label}</span>
                                                    </span>
                                                    {nIdx < Math.min(actionData.nodes.length, 8) - 1 && (
                                                      <ChevronRight className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                                                    )}
                                                  </React.Fragment>
                                                );
                                              })}
                                              {actionData.nodes.length > 8 && (
                                                <span className="text-[10px] font-semibold text-zinc-400 px-1 whitespace-nowrap">
                                                  +{actionData.nodes.length - 8} {t('more') || 'more'}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {actionData.initial_message && !actionData.nodes?.length && (
                                          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                                            &quot;{actionData.initial_message}&quot;
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* 4. Social Posts */}
                                    {(msg.action.type === 'create_social_post' || msg.action.type === 'update_social_post') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          {actionData.post_type && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Share2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                              <span className="font-semibold text-zinc-900 capitalize">{actionData.post_type.replace(/_/g, ' ')}</span>
                                            </div>
                                          )}
                                          {(actionData.channels || actionData.channel) && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                              <span className="text-zinc-500 font-medium">{t('platforms') || 'Platforms:'}</span>
                                              <span className="font-semibold text-zinc-900">
                                                {Array.isArray(actionData.channels || actionData.channel)
                                                  ? (actionData.channels || actionData.channel).join(', ')
                                                  : String(actionData.channels || actionData.channel)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 text-xs text-zinc-700 leading-relaxed font-normal">
                                          &quot;{actionData.content}&quot;
                                        </div>
                                      </div>
                                    )}

                                    {/* 5. Ad Campaigns */}
                                    {(msg.action.type === 'create_meta_campaign' || msg.action.type === 'update_meta_campaign') && (() => {
                                      const firstAdSet = Array.isArray(actionData.adsets) ? actionData.adsets[0] : (actionData.adset || null);
                                      const firstAd = firstAdSet?.ads?.[0] || (Array.isArray(actionData.ads) ? actionData.ads[0] : null);
                                      const totalAdSets = Array.isArray(actionData.adsets) ? actionData.adsets.length : (firstAdSet ? 1 : 1);
                                      const totalAds = Array.isArray(actionData.adsets)
                                        ? actionData.adsets.reduce((acc: number, as: any) => acc + (Array.isArray(as.ads) ? as.ads.length : 1), 0)
                                        : (Array.isArray(actionData.ads) ? actionData.ads.length : 1);
                                      const countries = firstAdSet?.targeting_spec?.geo_locations?.countries || firstAdSet?.targeting?.countries || [];
                                      const interests = firstAdSet?.targeting_spec?.interests || firstAdSet?.targeting?.interests || actionData.interests || [];
                                      const ageRange = firstAdSet?.targeting_spec?.age_min ? `${firstAdSet.targeting_spec.age_min}-${firstAdSet.targeting_spec.age_max || 65}+` : null;

                                      return (
                                        <div className="space-y-2.5">
                                          {/* Campaign Summary Properties with Colored Icons and Text */}
                                          <div className="flex items-center gap-3.5 text-xs flex-wrap">
                                            {actionData.objective && (
                                              <div className="flex items-center gap-1 font-medium text-zinc-700">
                                                <Target className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                <span className="font-semibold text-zinc-900">{actionData.objective.replace(/^OUTCOME_/i, '')}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                              <span>{firstAdSet?.destination_type || actionData.destination_type || 'WhatsApp Direct'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                              <span className="font-mono font-semibold text-zinc-900">${actionData.daily_budget || 25}/day ({actionData.budget_mode || 'ABO'})</span>
                                            </div>
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Layers className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                              <span>{totalAdSets} Ad {totalAdSets === 1 ? 'Set' : 'Sets'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Megaphone className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                              <span>{totalAds} Creative {totalAds === 1 ? 'Ad' : 'Ads'}</span>
                                            </div>
                                          </div>

                                          {/* Targeting Spec Bar with Colored Icons & Text */}
                                          {firstAdSet && (
                                            <div className="text-xs text-zinc-700 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 flex items-center gap-3 flex-wrap">
                                              {countries.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                  <span className="font-semibold text-zinc-900">{countries.slice(0, 4).join(', ')}{countries.length > 4 ? ` +${countries.length - 4}` : ''}</span>
                                                </div>
                                              )}
                                              {ageRange && (
                                                <div className="flex items-center gap-1">
                                                  <Users className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                  <span>Ages {ageRange}</span>
                                                </div>
                                              )}
                                              {interests.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                                  <span className="truncate max-w-[200px]">{interests.slice(0, 3).join(', ')}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Creative Ad Preview Card */}
                                          {firstAd && (
                                            <div className="bg-white border border-[#E8E8E6] rounded-[6px] overflow-hidden shadow-3xs">
                                              <div className="p-3 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                                                    <Megaphone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                    <span>{firstAd.name || 'Ad Creative'}</span>
                                                  </div>
                                                  <span className="text-[9.5px] text-zinc-400 font-mono font-semibold">
                                                    {firstAd.creative_type || 'IMAGE'}
                                                  </span>
                                                </div>
                                                {firstAd.headline && (
                                                  <p className="text-xs font-bold text-zinc-950 leading-snug">
                                                    {firstAd.headline}
                                                  </p>
                                                )}
                                                {firstAd.primary_text && (
                                                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                                                    {firstAd.primary_text}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="px-3 py-2 bg-[#FAFAFA]/80 border-t border-[#E8E8E6] flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#008069] shrink-0">
                                                  <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                                  <span>
                                                    {(() => {
                                                      const raw = firstAd.cta_type || 'Send WhatsApp Message';
                                                      const clean = raw.replace(/_/g, ' ').toLowerCase();
                                                      return clean.replace(/\b\w/g, (c: string) => c.toUpperCase());
                                                    })()}
                                                  </span>
                                                </div>
                                                {firstAd.welcome_message && (
                                                  <span className="text-[10px] text-zinc-400 italic truncate max-w-[170px] text-right font-normal">
                                                    &quot;{firstAd.welcome_message}&quot;
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Publish Ad Campaign */}
                                    {msg.action.type === 'publish_meta_campaign' && (
                                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-[6px] p-3 text-xs text-emerald-950 space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <Zap className="h-3.5 w-3.5 text-[#008069]" />
                                          <span>{t('publishMeta') || 'Publish Campaign to Meta Graph API'}</span>
                                        </div>
                                        <p className="text-[11px] text-emerald-800 leading-snug font-medium">
                                          Campaign: <span className="font-bold">{actionData.name || `Campaign #${actionData.id || actionData.campaign_id}`}</span> and all associated ad sets & creative ads will be published and launched live on Meta Ads Manager.
                                        </p>
                                      </div>
                                    )}

                                    {/* 6. Quick Replies */}
                                    {(msg.action.type === 'create_quick_reply' || msg.action.type === 'update_quick_reply') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          {actionData.shortcut && (
                                            <div className="flex items-center gap-1 font-mono font-bold text-amber-700">
                                              <Hash className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                              <span>{actionData.shortcut.replace(/^\//, '')}</span>
                                            </div>
                                          )}
                                          {(actionData.channels || actionData.channel) && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                              <span className="font-semibold text-zinc-900">
                                                {Array.isArray(actionData.channels || actionData.channel)
                                                  ? (actionData.channels || actionData.channel).join(', ')
                                                  : String(actionData.channels || actionData.channel)}
                                              </span>
                                            </div>
                                          )}
                                          {actionData.trigger_keywords?.length > 0 && (
                                            <div className="flex items-center gap-1 text-zinc-600">
                                              <Tag className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                              <span>{actionData.trigger_keywords.map((k: string) => `#${k}`).join(' ')}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 text-xs text-zinc-700 leading-relaxed font-normal">
                                          &quot;{actionData.body}&quot;
                                        </div>
                                      </div>
                                    )}

                                    {/* 7. Message Templates */}
                                    {(msg.action.type === 'create_message_template' || msg.action.type === 'update_message_template') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          {actionData.type && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <FileText className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                              <span className="font-semibold text-zinc-900 uppercase">{actionData.type}</span>
                                            </div>
                                          )}
                                          {actionData.category && (
                                            <div className="flex items-center gap-1 text-zinc-600">
                                              <Tag className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                              <span className="capitalize">{actionData.category}</span>
                                            </div>
                                          )}
                                          {(actionData.channels || actionData.channel) && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <MessageSquare className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                              <span className="font-semibold text-zinc-900">
                                                {Array.isArray(actionData.channels || actionData.channel)
                                                  ? (actionData.channels || actionData.channel).join(', ')
                                                  : String(actionData.channels || actionData.channel)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] p-2.5 text-xs text-zinc-700 leading-relaxed font-normal">
                                          {actionData.content?.body?.text ||
                                           actionData.content?.subject ||
                                           actionData.body?.text ||
                                           (typeof actionData.body === 'string' ? actionData.body : null) ||
                                           (actionData.content?.blocks && Array.isArray(actionData.content.blocks) ? actionData.content.blocks[0]?.content : null) ||
                                           'Official message template draft.'}
                                        </div>
                                      </div>
                                    )}

                                    {/* 8. WhatsApp Flows */}
                                    {(msg.action.type === 'create_whatsapp_flow' || msg.action.type === 'update_whatsapp_flow') && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-xs flex-wrap">
                                          {actionData.categories && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Sparkles className="h-3.5 w-3.5 text-[#008069] shrink-0" />
                                              <span className="font-semibold text-zinc-900 uppercase">
                                                {Array.isArray(actionData.categories) ? actionData.categories.join(', ') : String(actionData.categories)}
                                              </span>
                                            </div>
                                          )}
                                          {actionData.ui_schema?.screens?.length > 0 && (
                                            <div className="flex items-center gap-1 font-medium text-zinc-700">
                                              <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                              <span>
                                                {actionData.ui_schema.screens.length} Screen{actionData.ui_schema.screens.length > 1 ? 's' : ''} · {
                                                  actionData.ui_schema.screens.reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0)
                                                } Fields
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {actionData.description && (
                                          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                                            {actionData.description}
                                          </p>
                                        )}
                                        {actionData.ui_schema?.screens?.[0]?.fields?.length > 0 && (
                                          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-zinc-600">
                                            <span className="font-medium text-zinc-500">{t('fields') || 'Fields:'}</span>
                                            {actionData.ui_schema.screens[0].fields.slice(0, 4).map((f: any, fIdx: number) => (
                                              <span key={fIdx} className="font-mono text-[11px] text-zinc-800">
                                                {f.label || f.id} ({f.type})
                                              </span>
                                            ))}
                                            {actionData.ui_schema.screens[0].fields.length > 4 && (
                                              <span className="text-[10px] text-zinc-400">
                                                +{actionData.ui_schema.screens[0].fields.length - 4} {t('more') || 'more'}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Card Action Buttons Strip */}
                                <div className="-mx-3.5 -mb-3 mt-3 px-3.5 py-2.5 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-between gap-2 select-none rounded-b-xl">
                                  {msg.executed ? (
                                    <>
                                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                                        <Check className="h-3.5 w-3.5 text-[#008069] stroke-[2.5]" />
                                        <span>{meta.isDelete ? (t('deletedFromWorkspace') || 'Deleted from workspace') : (t('savedToWorkspace') || 'Saved to workspace')}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const destination = msg.executedRedirectUrl || meta.redirectUrl;
                                          router.push(destination);
                                          setIsExpanded(false);
                                          if (pathname.includes(destination)) {
                                            router.refresh();
                                            if (typeof window !== 'undefined') {
                                              window.dispatchEvent(new CustomEvent('copilot:action-executed', { detail: { action: msg.action } }));
                                            }
                                          }
                                        }}
                                        className="h-7.5 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-800 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-colors flex items-center gap-1.5"
                                      >
                                        <span>{meta.viewLabel}</span>
                                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="w-full flex items-center justify-between gap-2">
                                      <span className="text-[11px] text-zinc-500 font-medium truncate">
                                        {meta.isDelete ? (t('irreversibleAction') || 'Irreversible workspace action') : (t('readyToSave') || 'Ready to save to workspace')}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {pathname.includes('/flows/') && (msg.action?.type === 'create_flow' || msg.action?.type === 'update_flow' || msg.action?.type === 'extend_flow') && Array.isArray(actionData.nodes) && actionData.nodes.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              try {
                                                const flowStore = useFlowStore.getState();
                                                flowStore.setNodes(actionData.nodes);
                                                flowStore.setEdges(actionData.edges || []);
                                                flowStore.saveStateToHistory();
                                              } catch (e) {
                                                console.error('Error applying directly to flow store:', e);
                                              }
                                              if (typeof window !== 'undefined') {
                                                window.dispatchEvent(new CustomEvent('apply-copilot-flow-to-canvas', {
                                                  detail: {
                                                    nodes: actionData.nodes,
                                                    edges: actionData.edges,
                                                    name: actionData.name,
                                                  }
                                                }));
                                              }
                                              toast.success(t('applySuccess') || 'Workflow nodes applied directly to canvas!');
                                            }}
                                            className="h-7.5 px-3 rounded-[6px] text-xs font-bold bg-[#E8FDE8] hover:bg-[#d5fad5] text-emerald-950 border border-[#4AE54A]/50 shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                            title={t('applyToCanvasTitle') || "Apply this flow directly to your open canvas designer"}
                                          >
                                            <Sparkles className="h-3 w-3 text-[#008069]" />
                                            <span>{t('applyToCanvas') || 'Apply to Canvas'}</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleExecuteAction(msg.id, msg.action!)}
                                          disabled={executingActionId === msg.id}
                                          className={`h-7.5 px-3.5 rounded-[6px] text-xs font-bold shadow-3xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 active:scale-95 ${
                                            meta.isDelete
                                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                              : 'bg-[#0A0A0A] hover:bg-zinc-900 text-white'
                                          }`}
                                        >
                                          {executingActionId === msg.id ? (
                                            <>
                                              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                              <span>{t('saving') || 'Saving...'}</span>
                                            </>
                                          ) : (
                                            <>
                                              {meta.isDelete ? <Trash2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                                              <span>{meta.buttonLabel}</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Assistant Message Response Utility Bar */}
                          <div className="flex items-center justify-end text-zinc-400 pt-0.5 select-none px-0.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.content)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10.5px] font-semibold text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title={t('copyResponse') || "Copy response text"}
                            >
                              {copiedText === msg.content ? (
                                <>
                                  <CheckCheck className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-zinc-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Loading Indicator Aligned with Assistant Layout */}
                {loading && (
                  <div className="flex items-start gap-2.5 w-full animate-fade-in">
                    <div className="h-6.5 w-6.5 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center p-0.5 shrink-0 mt-0.5 shadow-3xs overflow-hidden">
                      <PlatformLogo 
                        className="h-3.5 w-auto object-contain max-h-3.5"
                        fallbackClassName="w-5 h-5 rounded flex items-center justify-center font-black text-[9px] shadow-2xs shrink-0 select-none"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 mb-0.5 select-none text-[11px]">
                        <span className="font-bold text-zinc-950 text-xs tracking-tight">
                          {brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')}
                        </span>
                      </div>

                      <div className="bg-white border border-[#E8E8E6] text-zinc-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed shadow-3xs flex items-center gap-2.5 w-fit">
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce" />
                        </div>
                        <span className="text-[11px] text-zinc-600 font-medium">
                          {t('reasoning') || 'Reasoning & preparing draft action...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

            {/* 3. PROMPT FIELD COMPOSER DOCK (MATCHING SCREENSHOT WITH ANIMATED GRADIENT & NO UPGRADE BUTTON) */}
            <div className="p-3.5 bg-white border-t border-[#E8E8E6] shrink-0 space-y-2">
              <div className="relative overflow-hidden rounded-[22px] p-2.5 shadow-xs border border-zinc-200/90 select-none">
                {/* Flowing AI Animated Gradient Background */}
                <div className="absolute inset-0 ai-gradient-animated opacity-95 pointer-events-none" />

                {/* Magic Wand Natural Inspiration Popover Menu */}
                {isMagicWandOpen && (
                  <div className="absolute bottom-full mb-2 left-2 right-2 z-50 bg-white rounded-xl border border-[#E8E8E6] shadow-xl p-1.5 space-y-1 animate-fade-in font-sans select-none max-h-60 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('promptInspirations') || 'Natural Prompt Inspirations'}
                    </div>
                    {[
                      t('capabilities.cmp1Prompt') || 'Draft a 20% discount broadcast campaign for all contacts',
                      t('capabilities.ana1Prompt') || 'Generate an executive summary of message volume, active chats, and conversion rates',
                      t('capabilities.cb1Prompt') || 'Create an AI support bot to answer return and shipping questions',
                      t('capabilities.wf1Prompt') || 'Create a WhatsApp Flow form for lead qualification & appointment booking',
                      t('capabilities.fl1Prompt') || 'Set up an auto-responder flow for pricing inquiries',
                      t('capabilities.ib1Prompt') || 'Summarize our active channels, audience growth, and pending tasks',
                      t('capabilities.meta1Prompt') || 'Create a Meta Click-to-WhatsApp ad campaign with $25 daily budget',
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setInputMessage(p);
                          setIsMagicWandOpen(false);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center gap-2 font-medium"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">&quot;{p}&quot;</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* More Options Menu */}
                {isMoreMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-2 z-50 w-52 bg-white rounded-xl border border-[#E8E8E6] shadow-xl p-1.5 space-y-1 animate-fade-in font-sans select-none">
                    <button
                      type="button"
                      onClick={() => {
                        handleClearHistory();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{t('clearConversation') || 'Clear Conversation'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        toast.info(t('summonHint') || 'Press ⌘K or Ctrl+K anywhere in WhatsOmni to summon Copilot.');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{t('keyboardShortcuts') || 'Keyboard Shortcuts'}</span>
                    </button>
                  </div>
                )}

                {/* Top Info Row: {t('creditsRemaining') || 'Credits Remaining'} / Mode Indicator */}
                <div className="relative z-10 flex items-center justify-between px-1.5 pb-2 text-xs select-none">
                  {operationalMode === 'byok' ? (
                    <span className="text-xs text-zinc-700 font-medium flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <strong className="text-zinc-950 font-bold">{t('unlimited') || 'Unlimited'}</strong> {t('creditsByokMode') || 'Credits (BYOK Mode)'}
                    </span>
                  ) : isUnlimitedCredits ? (
                    <span className="text-xs text-zinc-700 font-medium flex items-center gap-1.5">
                      <strong className="text-zinc-950 font-bold">{t('unlimited') || 'Unlimited'}</strong> {t('copilotCredits') || 'Copilot Credits'}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-700 font-medium flex items-center gap-1.5">
                      <strong className={`font-bold ${credits <= 0 ? 'text-red-600' : 'text-zinc-950'}`}>
                        {credits}
                      </strong>{' '}
                      {t('creditsRemaining') || 'Credits Remaining'}
                    </span>
                  )}
                </div>

                {/* Inner White Capsule (matching user design screenshot) */}
                <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[18px] p-2.5 shadow-xs border border-white/90 space-y-2">
                  {/* STATE A: VOICE RECORDING BAR */}
                  {isRecording ? (
                    <div className="flex items-center justify-between py-1 px-1 animate-fade-in select-none">
                      <button
                        type="button"
                        onClick={handleCancelRecording}
                        className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 bg-white border border-[#E8E8E6] px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-3xs"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span className="font-mono text-xs font-bold text-zinc-950 tracking-wider">
                          {formatRecordingTime(recordingSeconds)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsRecordingPaused((prev) => !prev)}
                          className="h-7 w-7 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-100 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shadow-3xs"
                          title={isRecordingPaused ? (t('resume') || 'Resume') : (t('pause') || 'Pause')}
                        >
                          {isRecordingPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmRecording}
                          className="h-7 w-7 rounded-lg bg-[#0A0A0A] hover:bg-zinc-800 text-white flex items-center justify-center transition-all shadow-3xs cursor-pointer"
                          title={t('confirmAndSend') || "Confirm and Send"}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE B: STANDARD COMPOSER CAPSULE */
                    <>
                      {/* Attached files chips */}
                      {attachedFiles.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pb-1">
                          {attachedFiles.map((file, fIdx) => (
                            <div
                              key={fIdx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-[#E8E8E6] rounded-md text-[11px] font-semibold text-zinc-800 shadow-3xs animate-fade-in"
                            >
                              <ImageIcon className="h-3 w-3 text-zinc-500" />
                              <span className="max-w-[120px] truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(fIdx)}
                                className="hover:text-red-600 ml-0.5 cursor-pointer text-zinc-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* DROPZONE ACCORDION */}
                      {isDropzoneOpen && (
                        <div className="border border-dashed border-zinc-300 bg-white rounded-xl p-3 text-center select-none animate-fade-in space-y-2 mb-1.5 shadow-3xs">
                          <div>
                            <h5 className="text-xs font-bold text-zinc-900">{t('dropFiles') || 'Drop files or select asset'}</h5>
                            <p className="text-[10px] text-zinc-500">{t('dropFilesDesc') || 'Docs, images, CSVs, audio files'}</p>
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8 px-3 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                            >
                              <Upload className="h-3.5 w-3.5 text-zinc-600" />
                              <span>{t('upload') || 'Upload'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleStartRecording}
                              className="h-8 px-3 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                            >
                              <Mic className="h-3.5 w-3.5 text-zinc-600" />
                              <span>{t('voice') || 'Voice'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = prompt(t('enterLinkUrl') || 'Enter a link or catalog URL:');
                                if (url) {
                                  setAttachedFiles((prev) => [
                                    ...prev,
                                    { name: url, size: 'Link', type: 'url' },
                                  ]);
                                  setIsDropzoneOpen(false);
                                }
                              }}
                              className="h-8 px-3 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                            >
                              <LinkIcon className="h-3.5 w-3.5 text-zinc-600" />
                              <span>{t('url') || 'URL'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* INPUT TEXTAREA */}
                      <div className="relative">
                        <textarea
                          ref={inputRef}
                          rows={2}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={t('describeProject') || t('placeholder') || 'Describe your project...'}
                          className="w-full bg-transparent text-xs focus:outline-none resize-none leading-relaxed font-medium text-zinc-900 placeholder-zinc-400"
                        />
                      </div>

                      {/* BOTTOM TOOLBAR */}
                      <div className="pt-1.5 border-t border-[#E8E8E6]/60 flex items-center justify-between select-none">
                        {/* Left Action Icons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setIsDropzoneOpen((prev) => !prev)}
                            className={`h-6.5 w-6.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                              isDropzoneOpen ? 'bg-zinc-200 text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title={t('attachFiles') || "Attach files"}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsMagicWandOpen((prev) => !prev);
                              setIsMoreMenuOpen(false);
                            }}
                            className={`h-6.5 w-6.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                              isMagicWandOpen ? 'bg-amber-100 text-amber-900 font-bold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title={t('promptInspirations') || "Prompt Inspirations"}
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={handleStartRecording}
                            className="h-6.5 w-6.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                            title={t('voiceCommand') || "Voice command"}
                          >
                            <Mic className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendMessage(t('searchRecordsPrompt') || 'Search and list all active and draft records across Campaigns, ChatBots, Flows, Social Posts, and Ad Campaigns')}
                            className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title={t('searchRecords') || "Search repository records"}
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen((prev) => !prev);
                              setIsMagicWandOpen(false);
                            }}
                            className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title={t('moreOptions') || "More options"}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Right Action: Dark Circular Send Button (Image 2 style) */}
                        <button
                          type="button"
                          onClick={() => handleSendMessage()}
                          disabled={(!inputMessage.trim() && attachedFiles.length === 0) || loading}
                          className="h-7.5 w-7.5 rounded-full bg-[#18181B] hover:bg-black disabled:opacity-30 disabled:hover:scale-100 text-white flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                          title={t('sendEnter') || "Send (Enter)"}
                        >
                          {loading ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Micro footer hint */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-1 select-none">
                <span>{t('keyboardHint') || 'Press ↵ to send · ⌘K to toggle · Esc to close'}</span>
                <span className="font-mono text-[9px] text-zinc-400">{brandingName ? `${brandingName} ${t('copilot') || 'Copilot'}` : (t('title') || 'WhatsOmni AI Copilot')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
