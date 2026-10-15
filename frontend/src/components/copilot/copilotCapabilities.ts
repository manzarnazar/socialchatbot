/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Calendar,
  ListFilter,
  Headphones,
  ShoppingCart,
  Rocket,
  Star,
  HelpCircle,
  Megaphone,
  Clock,
  GitBranch,
  Tag,
  MessageSquare,
  UserCheck,
  Share2,
  Zap,
  Layers,
  Bot,
  Globe,
  DollarSign,
  ShoppingBag,
  BookOpen,
  Inbox,
  BarChart3,
  FileText,
  Hash,
  Target,
  Sparkles,
  Users,
} from 'lucide-react';
import { FlowPromptTemplate, CopilotCapability } from './copilotTypes';

export const FLOW_PROMPT_TEMPLATES: FlowPromptTemplate[] = [
  {
    id: 'appointment',
    label: 'Appointment Booking',
    badge: 'Calendar & CRM',
    icon: Calendar,
    prompt: 'Create an automated appointment booking workflow. Greet the customer, ask for their full name, email, and preferred service date/time. Check if they are a new or returning client, book the appointment in the calendar, create a CRM deal, and send a booking confirmation summary.',
    description: 'Lead capture, calendar sync, deal creation, and confirmation.'
  },
  {
    id: 'lead',
    label: 'Lead Qualification',
    badge: 'B2B & Scoring',
    icon: ListFilter,
    prompt: 'Build a high-converting lead qualification flow for B2B services. Greet visitor, ask for their company size and budget range. Use AI conditional classification to evaluate if budget is above $1,000. If qualified, tag contact as "high-value-lead" and schedule a sales discovery call; otherwise, send product brochure link.',
    description: 'AI intent condition, lead tagging, and sales routing.'
  },
  {
    id: 'support',
    label: 'Support & Triage',
    badge: 'Live Handoff',
    icon: Headphones,
    prompt: 'Create a customer support triage flow. Greet the user and display an interactive menu with 3 options: 1) Order Status & Tracking, 2) Technical Assistance, 3) Talk to Human Agent. If option 1, ask for order ID. If option 2, search knowledgebase with AI RAG. If option 3, transfer immediately to live human agent.',
    description: 'Interactive 3-option menu, AI answers, and human queue.'
  },
  {
    id: 'cart',
    label: 'Abandoned Cart',
    badge: 'E-commerce',
    icon: ShoppingCart,
    prompt: 'Create an abandoned checkout recovery workflow. Evaluate the cart status, send a friendly reminder with items list, offer a 10% discount code if they complete purchase within 24 hours, and branch based on whether they click to complete order or ask a question.',
    description: 'Discount generation, cart reminder, and conversion branch.'
  },
  {
    id: 'onboarding',
    label: 'Customer Onboarding',
    badge: 'Nurture',
    icon: Rocket,
    prompt: 'Create a new customer onboarding sequence. Welcome the user, introduce key features of our platform, ask what goal they want to achieve first, and provide a direct guide or link tailored to their choice.',
    description: 'Multi-path feature walkthrough tailored to user goals.'
  },
  {
    id: 'csat',
    label: 'CSAT Survey',
    badge: 'Feedback',
    icon: Star,
    prompt: 'Create a customer satisfaction (CSAT) survey flow. Thank the customer for their recent purchase or support interaction, ask them to rate experience on a scale of 1-5, and if rating is below 4, trigger an alert note and route to a senior support manager.',
    description: '1-5 scale rating, sentiment analysis, and manager alert.'
  },
  {
    id: 'faq',
    label: 'Interactive FAQ',
    badge: 'Self-Service',
    icon: HelpCircle,
    prompt: 'Create an interactive self-service FAQ menu for an omnichannel store. Provide list buttons for Pricing, Return Policy, Shipping Times, and Warranty. Answer each with AI knowledgebase search and offer live agent handoff if unsatisfied.',
    description: 'List buttons, AI knowledge base search, and live chat option.'
  },
  {
    id: 'outbound',
    label: 'Campaign Auto-Reply',
    badge: 'Outbound',
    icon: Megaphone,
    prompt: 'Build an outbound broadcast campaign auto-responder workflow. When user replies to our promotional campaign, thank them, offer an interactive menu to view catalog or claim promo code, tag them with "promo-responder", and notify sales agent.',
    description: 'Campaign trigger, promo redemption, and sales notification.'
  },
];

export const FLOW_UPDATE_TEMPLATES: FlowPromptTemplate[] = [
  {
    id: 'update-delay',
    label: 'Add Follow-Up Delay',
    badge: 'Timing & Delay',
    icon: Clock,
    prompt: 'Update this workflow on canvas: add a 2-hour delay after the initial welcome or inquiry message, followed by a friendly follow-up check asking if the customer still needs assistance.',
    description: 'Insert timed delay and follow-up node.'
  },
  {
    id: 'update-sentiment',
    label: 'AI Sentiment Escalation',
    badge: 'AI Classification',
    icon: GitBranch,
    prompt: 'Modify this flow by adding an AI condition node before the resolution step. Analyze the customer conversation sentiment: if negative or frustrated, immediately escalate to human handoff; otherwise proceed normally.',
    description: 'Insert AI sentiment branching and human handoff.'
  },
  {
    id: 'update-tagging',
    label: 'VIP Lead Tagging',
    badge: 'CRM Segments',
    icon: Tag,
    prompt: 'Update this flow: when the user confirms interest or budget above $1,000, tag the contact with "VIP-Client" and "Q4-Prospect", and notify our sales team via webhook.',
    description: 'Add contact tags and webhook alert.'
  },
  {
    id: 'update-multichannel',
    label: 'Multi-Channel Fallback',
    badge: 'WhatsApp + SMS',
    icon: MessageSquare,
    prompt: 'Update this flow to support multi-channel communication: send response via WhatsApp, and if undelivered or no phone number, route to email template.',
    description: 'Add channel branching and email fallback.'
  },
  {
    id: 'update-agent-button',
    label: 'Agent Escalation Button',
    badge: 'Live Support',
    icon: UserCheck,
    prompt: 'Update the interactive menu or question nodes to include a "Talk to Human Agent" quick option that routes directly to an urgent human handoff step.',
    description: 'Add human escalation button and queue.'
  }
];

export const FLOW_EXTEND_TEMPLATES: FlowPromptTemplate[] = [
  {
    id: 'extend-csat',
    label: 'Append CSAT Survey',
    badge: 'Customer Rating',
    icon: Star,
    prompt: 'Extend this workflow: at the end of the current flow, add a 15-minute delay and an interactive 1-5 star CSAT feedback survey asking "How was your experience today?". Save their rating as a tag.',
    description: 'Append CSAT survey after final step.'
  },
  {
    id: 'extend-calendar',
    label: 'Append Booking Step',
    badge: 'Schedule Meeting',
    icon: Calendar,
    prompt: 'Extend the affirmative branch of this flow by adding an automated appointment booking node, asking for their preferred slot and confirming the booking.',
    description: 'Append appointment node to qualified path.'
  },
  {
    id: 'extend-google-review',
    label: 'Append Review Request',
    badge: 'Reputation',
    icon: Rocket,
    prompt: 'Extend this workflow with an automated reputation follow-up: 24 hours after resolution, send a thank you note with our Google Business review link.',
    description: 'Append 24h delay and Google review link.'
  },
  {
    id: 'extend-webhook',
    label: 'Append CRM Webhook',
    badge: 'External Sync',
    icon: Share2,
    prompt: 'Extend the completion of this flow with a webhook dispatch node to send the captured contact details and conversation transcript to our external CRM.',
    description: 'Append webhook sync at flow end.'
  },
  {
    id: 'extend-inactivity',
    label: 'Append Inactivity Ping',
    badge: 'Re-engagement',
    icon: Clock,
    prompt: 'Extend this flow with an inactivity reminder: if the user does not respond within 30 minutes, send a gentle reminder message before closing the interaction.',
    description: 'Append timeout reminder branch.'
  }
];


export const getFlowNodeIcon = (type: string) => {
  switch (type) {
    case 'inbound_message':
    case 'webhook_trigger':
    case 'contact_created':
    case 'deal_updated':
    case 'manual':
    case 'outbound_campaign':
    case 'ecommerceCheckoutAbandoned':
      return Zap;
    case 'send_message':
    case 'send_template':
      return MessageSquare;
    case 'ask_question':
    case 'interactive_menu':
      return ListFilter;
    case 'condition':
    case 'ai_condition':
      return GitBranch;
    case 'wait_delay':
      return Clock;
    case 'tag_contact':
      return Tag;
    case 'create_appointment':
      return Calendar;
    case 'human_handoff':
      return UserCheck;
    case 'webhook_dispatch':
    case 'n8n':
    case 'zapier':
      return Share2;
    default:
      return Layers;
  }
};


export const COPILOT_CAPABILITIES: CopilotCapability[] = [
  // 1. AI ChatBots
  {
    id: 'cb-1',
    moduleKey: 'chatbot',
    categoryName: 'AI ChatBots',
    title: 'Customer Support Bot',
    prompt: 'Create a 24/7 customer support bot for returns, refunds, and order tracking',
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
    categoryName: 'AI ChatBots',
    title: 'Fine-tune Bot Prompt',
    prompt: 'Update the customer support bot prompt to be polite, concise, and helpful',
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
    categoryName: 'AI ChatBots',
    title: 'Audit Active Bots',
    prompt: 'List all my configured AI chatbots with their active models and status',
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
    categoryName: 'AI ChatBots',
    title: 'E-Commerce Sales Bot',
    prompt: 'Create an autonomous sales assistant chatbot for product recommendations and discounts',
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
    categoryName: 'Automation Flows',
    title: 'Auto-Reply Keyword Flow',
    prompt: 'Create an auto-reply workflow when customers send "price" or "catalog"',
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
    categoryName: 'Automation Flows',
    title: 'Lead Qualification Flow',
    prompt: 'Build a lead qualification workflow with conditional logic and contact tagging',
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
    categoryName: 'Automation Flows',
    title: 'After-Hours Auto Reply',
    prompt: 'Set up an after-hours automatic reply with working hours and ticket link',
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
    categoryName: 'Automation Flows',
    title: 'Audit Flow Keywords',
    prompt: 'Show all my automation flows and active keyword trigger rules',
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
    categoryName: 'Broadcast Campaigns',
    title: 'Weekend Flash Sale',
    prompt: 'Draft a 20% off weekend promotional broadcast campaign for all contacts',
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
    categoryName: 'Broadcast Campaigns',
    title: 'VIP Re-Engagement',
    prompt: 'Create a VIP customer re-engagement broadcast with coupon code FLASH20',
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
    categoryName: 'Broadcast Campaigns',
    title: 'Broadcast Analytics',
    prompt: 'Show me all active and draft marketing campaigns with delivery rates',
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
    categoryName: 'Social Media',
    title: 'Product Launch Post',
    prompt: 'Draft a scheduled post announcing our new collection launch with viral hashtags',
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
    categoryName: 'Social Media',
    title: 'Cross-Channel Scheduling',
    prompt: 'Schedule weekend promotional content across Facebook and Instagram channels',
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
    categoryName: 'Social Media',
    title: 'Scheduled Post Calendar',
    prompt: 'Show me my scheduled and draft social media posts for this month',
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
    categoryName: 'Meta Ads',
    title: 'Click-to-WhatsApp Ad',
    prompt: 'Draft a Click-to-WhatsApp Meta ad campaign with $25 daily budget',
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
    categoryName: 'Meta Ads',
    title: 'Ad Budget Optimization',
    prompt: 'Update the Meta ad campaign daily budget to $50 and review lead targets',
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
    categoryName: 'Meta Ads',
    title: 'Ad Campaigns Review',
    prompt: 'List all my Meta ad campaigns and their daily budgets and lead counts',
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
    categoryName: 'WhatsApp Flows',
    title: 'Consultation Booking Flow',
    prompt: 'Create a WhatsApp Flow form for lead qualification and consultation booking',
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
    categoryName: 'WhatsApp Flows',
    title: 'NPS Feedback Survey Flow',
    prompt: 'Draft a customer satisfaction NPS survey flow with interactive star ratings',
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
    categoryName: 'Quick Replies',
    title: 'Order Tracking Shortcut',
    prompt: 'Create an order tracking quick reply with keyboard shortcut /track',
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
    categoryName: 'Quick Replies',
    title: 'Greeting & Support Reply',
    prompt: 'Draft a friendly greeting quick reply for WhatsApp and live chat support',
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
    categoryName: 'Templates',
    title: 'Order Shipping Template',
    prompt: 'Draft a WhatsApp order confirmation template with customer variables',
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
    categoryName: 'Templates',
    title: 'Template Status Review',
    prompt: 'Show me all my message templates and their WhatsApp approval status',
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
    categoryName: 'E-Commerce',
    title: 'Sync WhatsApp Catalog',
    prompt: 'Sync catalog products and verify stock availability on WhatsApp store',
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
    categoryName: 'E-Commerce',
    title: 'Abandoned Cart Sequence',
    prompt: 'Draft an abandoned cart recovery sequence for customers with pending checkouts',
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
    categoryName: 'CRM & Contacts',
    title: 'Segment VIP Customers',
    prompt: 'Segment contacts who ordered more than 3 times into a VIP broadcast list',
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
    categoryName: 'Knowledge Base',
    title: 'Index Store Policies',
    prompt: 'Index store return policies and shipping guides for grounded chatbot answers',
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
    categoryName: 'Shared Inbox',
    title: 'Summarize Unresolved Chats',
    prompt: 'Summarize unresolved customer conversations and priority inquiries from today',
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
    categoryName: 'Analytics',
    title: 'Executive KPI Summary',
    prompt: 'Generate an executive summary of message volume, active chats, and conversion rates',
    icon: BarChart3,
    colorScheme: {
      iconColor: 'text-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200/70',
      tagBg: 'bg-violet-100/60',
      tagText: 'text-violet-700',
    },
  },
];

export const getActiveModuleKey = (path: string): string => {
  if (path.includes('/chatbot')) return 'chatbot';
  if (path.includes('/flows')) return 'flows';
  if (path.includes('/campaigns')) return 'campaigns';
  if (path.includes('/social-posts')) return 'social-posts';
  if (path.includes('/meta-ads')) return 'meta-ads';
  if (path.includes('/whatsapp-flows')) return 'whatsapp-flows';
  if (path.includes('/quick-replies')) return 'quick-replies';
  if (path.includes('/templates')) return 'templates';
  if (path.includes('/ecommerce')) return 'ecommerce';
  if (path.includes('/contacts') || path.includes('/staff') || path.includes('/deals')) return 'contacts';
  if (path.includes('/knowledge-base')) return 'knowledge-base';
  if (path.includes('/inbox')) return 'inbox';
  return 'dashboard';
};

export const getContextTitle = (moduleKey: string): string => {
  switch (moduleKey) {
    case 'chatbot': return 'AI ChatBots';
    case 'flows': return 'Automation Flows';
    case 'campaigns': return 'Broadcast Campaigns';
    case 'social-posts': return 'Social Media';
    case 'meta-ads': return 'Meta Ads';
    case 'whatsapp-flows': return 'WhatsApp Flows';
    case 'quick-replies': return 'Quick Replies';
    case 'templates': return 'Message Templates';
    case 'ecommerce': return 'E-Commerce Store';
    case 'contacts': return 'CRM & Contacts';
    case 'knowledge-base': return 'Knowledge Base';
    case 'inbox': return 'Shared Inbox';
    default: return 'Workspace Dashboard';
  }
};


