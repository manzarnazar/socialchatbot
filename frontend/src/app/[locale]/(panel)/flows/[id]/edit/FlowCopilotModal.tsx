/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Send,
  Check,
  GitBranch,
  Zap,
  MessageSquare,
  ListFilter,
  Calendar,
  UserCheck,
  Clock,
  Tag,
  RotateCcw,
  Layers,
  ShoppingCart,
  Rocket,
  MessageSquareHeart,
  HelpCircle,
  Database,
  Bot,
  ArrowRight,
  Share2
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface FlowCopilotModalProps {
  flowId: string;
  isOpen: boolean;
  onClose: () => void;
  onFlowGenerated: (definition: { nodes: any[]; edges: any[] }, flowName?: string) => void;
  currentNodes?: any[];
  currentEdges?: any[];
  currentFlowName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    type: string;
    title: string;
    data: any;
  } | null;
  form?: any | null;
}

interface SuggestionChip {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    id: 'appointment',
    label: 'Appointment Booking',
    icon: Calendar,
    prompt: 'Create an automated appointment booking workflow. Greet the customer, ask for their full name, email, and preferred service date/time. Check if they are a new or returning client, book the appointment in the calendar, create a CRM deal, and send a booking confirmation summary.'
  },
  {
    id: 'lead',
    label: 'Lead Qualification',
    icon: ListFilter,
    prompt: 'Build a high-converting lead qualification flow for B2B services. Greet visitor, ask for their company size and budget range. Use AI conditional classification to evaluate if budget is above $1,000. If qualified, tag contact as "high-value-lead" and schedule a sales discovery call; otherwise, send product brochure link.'
  },
  {
    id: 'support',
    label: 'Support & Triage',
    icon: UserCheck,
    prompt: 'Create a customer support triage flow. Greet the user and display an interactive menu with 3 options: 1) Order Status & Tracking, 2) Technical Assistance, 3) Talk to Human Agent. If option 1, ask for order ID. If option 2, search knowledgebase with AI RAG. If option 3, transfer immediately to live human agent.'
  },
  {
    id: 'cart',
    label: 'Abandoned Cart',
    icon: ShoppingCart,
    prompt: 'Create an abandoned checkout recovery workflow. Evaluate the cart status, send a friendly reminder with items list, offer a 10% discount code if they complete purchase within 24 hours, and branch based on whether they click to complete order or ask a question.'
  },
  {
    id: 'onboarding',
    label: 'Customer Onboarding',
    icon: Rocket,
    prompt: 'Create a new customer onboarding sequence. Welcome the user, introduce key features of our platform, ask what goal they want to achieve first, and provide a direct guide or link tailored to their choice.'
  },
  {
    id: 'feedback',
    label: 'CSAT Survey',
    icon: MessageSquareHeart,
    prompt: 'Create a customer satisfaction (CSAT) survey flow. Thank the customer for their recent purchase or support interaction, ask them to rate experience on a scale of 1-5, and if rating is below 4, trigger an alert note and route to a senior support manager.'
  },
  {
    id: 'faq',
    label: 'Interactive FAQ',
    icon: HelpCircle,
    prompt: 'Create an interactive self-service FAQ menu for an omnichannel store. Provide list buttons for Pricing, Return Policy, Shipping Times, and Warranty. Answer each with AI knowledgebase search and offer live agent handoff if unsatisfied.'
  }
];

export function FlowCopilotModal({
  flowId,
  isOpen,
  onClose,
  onFlowGenerated,
  currentNodes = [],
  currentEdges = [],
  currentFlowName = 'Workspace Flow'
}: FlowCopilotModalProps) {
  const t = useTranslations('Flows');
  const tCommon = useTranslations('Common');
  const tCopilot = useTranslations('Copilot');

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

  const localizedChips: SuggestionChip[] = [
    {
      id: 'appointment',
      label: tCopilot('chips.appointmentLabel') || 'Appointment Booking',
      icon: Calendar,
      prompt: tCopilot('chips.appointmentPrompt') || 'Create an automated appointment booking workflow. Greet the customer, ask for their full name, email, and preferred service date/time. Check if they are a new or returning client, book the appointment in the calendar, create a CRM deal, and send a booking confirmation summary.'
    },
    {
      id: 'lead',
      label: tCopilot('chips.leadLabel') || 'Lead Qualification',
      icon: ListFilter,
      prompt: tCopilot('chips.leadPrompt') || 'Build a high-converting lead qualification flow for B2B services. Greet visitor, ask for their company size and budget range. Use AI conditional classification to evaluate if budget is above $1,000. If qualified, tag contact as "high-value-lead" and schedule a sales discovery call; otherwise, send product brochure link.'
    },
    {
      id: 'support',
      label: tCopilot('chips.supportLabel') || 'Support & Triage',
      icon: UserCheck,
      prompt: tCopilot('chips.supportPrompt') || 'Create a customer support triage flow. Greet the user and display an interactive menu with 3 options: 1) Order Status & Tracking, 2) Technical Assistance, 3) Talk to Human Agent. If option 1, ask for order ID. If option 2, search knowledgebase with AI RAG. If option 3, transfer immediately to live human agent.'
    },
    {
      id: 'cart',
      label: tCopilot('chips.cartLabel') || 'Abandoned Cart',
      icon: ShoppingCart,
      prompt: tCopilot('chips.cartPrompt') || 'Create an abandoned checkout recovery workflow. Evaluate the cart status, send a friendly reminder with items list, offer a 10% discount code if they complete purchase within 24 hours, and branch based on whether they click to complete order or ask a question.'
    },
    {
      id: 'onboarding',
      label: tCopilot('chips.onboardingLabel') || 'Customer Onboarding',
      icon: Rocket,
      prompt: tCopilot('chips.onboardingPrompt') || 'Create a new customer onboarding sequence. Welcome the user, introduce key features of our platform, ask what goal they want to achieve first, and provide a direct guide or link tailored to their choice.'
    },
    {
      id: 'feedback',
      label: tCopilot('chips.feedbackLabel') || 'CSAT Survey',
      icon: MessageSquareHeart,
      prompt: tCopilot('chips.feedbackPrompt') || 'Create a customer satisfaction (CSAT) survey flow. Thank the customer for their recent purchase or support interaction, ask them to rate experience on a scale of 1-5, and if rating is below 4, trigger an alert note and route to a senior support manager.'
    },
    {
      id: 'faq',
      label: tCopilot('chips.faqLabel') || 'Interactive FAQ',
      icon: HelpCircle,
      prompt: tCopilot('chips.faqPrompt') || 'Create an interactive self-service FAQ menu for an omnichannel store. Provide list buttons for Pricing, Return Policy, Shipping Times, and Warranty. Answer each with AI knowledgebase search and offer live agent handoff if unsatisfied.'
    }
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize or reset Copilot greeting when modal opens
  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        const hasExistingNodes = currentNodes && currentNodes.length > 1;
        const initialText = hasExistingNodes
          ? (tCopilot('welcomeExisting', { count: currentNodes.length, name: currentFlowName }) || `👋 Welcome to **Flow Copilot**! I see you have **${currentNodes.length} nodes** on your canvas for **"${currentFlowName}"**.\n\nTell me what you'd like to build, expand, or adjust in this workflow, or pick one of the quick suggestions below. I will architect the complete node hierarchy with triggers, menus, and logic branches for your canvas!`)
          : (tCopilot('welcomeNew') || `👋 Welcome to **Flow Copilot**! I can architect end-to-end automation workflows with triggers, interactive menus, AI logic conditions, appointment bookings, and agent handoffs.\n\nDescribe the customer journey you want to automate, or pick one of the popular suggestions below to get started.`);

        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            content: initialText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action: null,
          }
        ]);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!mounted || !isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setSelectedChipId(null);
    setIsLoading(true);

    try {
      // Build conversation payload for Copilot
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetchWithCsrf('/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          current_page: `/flows/${flowId}/edit`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        let action = data.action;

        // Ensure nodes and edges are valid arrays if action is create_flow or update_flow
        if (action && (action.type === 'create_flow' || action.type === 'update_flow')) {
          const actionData = action.data || {};
          if (typeof actionData.nodes === 'string') {
            try { actionData.nodes = JSON.parse(actionData.nodes); } catch { actionData.nodes = []; }
          }
          if (typeof actionData.edges === 'string') {
            try { actionData.edges = JSON.parse(actionData.edges); } catch { actionData.edges = []; }
          }
          action.data = actionData;
        }

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.message || 'Here is the workflow architecture designed for your canvas:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: action || null,
          form: data.form || null,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback to flow-specific generator if copilot was briefly rate-limited
        try {
          const fallbackRes = await fetchWithCsrf(`/flows/${flowId}/prompt-to-flow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok && fallbackData.definition) {
            const assistantMsg: ChatMessage = {
              id: `asst-${Date.now()}`,
              role: 'assistant',
              content: fallbackData.description || `I synthesized a complete ${fallbackData.definition.nodes?.length || 4}-node workflow for you based on: "${prompt}". Review the architecture below and click Apply to Canvas!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              action: {
                type: 'create_flow',
                title: fallbackData.flow_name || 'Generated Automation Flow',
                data: {
                  name: fallbackData.flow_name || 'Generated Automation Flow',
                  description: fallbackData.description || '',
                  nodes: fallbackData.definition.nodes,
                  edges: fallbackData.definition.edges,
                  trigger_type: fallbackData.definition.nodes?.[0]?.type || 'inbound_message',
                },
              },
            };
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            toast.error(data.message || 'Failed to generate flow with Copilot.');
          }
        } catch {
          toast.error(data.message || 'Failed to generate flow with Copilot.');
        }
      }
    } catch (err: any) {
      console.error('Flow Copilot error:', err);
      toast.error('Connection error occurred while communicating with Flow Copilot.');
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleChipClick = (chip: SuggestionChip) => {
    setSelectedChipId(chip.id);
    handleSendMessage(chip.prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyToCanvas = (actionData: any) => {
    if (!actionData) return;
    const nodes = actionData.nodes;
    const edges = actionData.edges;
    const flowName = actionData.name || 'AI Generated Flow';

    if (!Array.isArray(nodes) || nodes.length === 0) {
      toast.error((t.has('copilotNoNodes') ? t('copilotNoNodes') : null) || 'No nodes found in the Copilot response to apply.');
      return;
    }

    onFlowGenerated({ nodes, edges: Array.isArray(edges) ? edges : [] }, flowName);
    toast.success(t('copilotWorkflowApplied', { name: flowName }) || `Copilot workflow '${flowName}' applied to canvas successfully!`);
    onClose();
  };

  const handleResetChat = () => {
    setMessages([]);
    setSelectedChipId(null);
    setInputValue('');
  };

  const getNodeIcon = (type: string) => {
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
      case 'create_deal':
      case 'update_contact':
        return Database;
      default:
        return Layers;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 transition-all duration-300 animate-backdrop-fade select-none">
      <div
        className="bg-white border border-[#E8E8E6] rounded-xl max-w-3xl w-full shadow-2xl relative z-50 animate-modal-entry text-left font-sans flex flex-col h-[90vh] max-h-[820px] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER: Flow Copilot Brand Header Strip */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] px-5 py-3.5 bg-white shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Copilot Animated Sparkles Icon */}
            <div className="relative p-[1px] rounded-lg overflow-hidden shrink-0 shadow-3xs">
              <span className="absolute inset-[-250%] animate-border-rotate bg-[conic-gradient(from_0deg_at_50%_50%,#4AE54A_0%,#3DD43D_25%,#E8E8E6_50%,#86EFAC_75%,#4AE54A_100%)] opacity-90" />
              <div className="relative z-10 h-8 w-8 rounded-[7px] bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#4AE54A]" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  {tCopilot('flowCopilot') || 'Flow Copilot'}
                </h3>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-mono flex items-center gap-1 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-ping" />
                  <span>{tCopilot('engineBadge') || 'Qwen 3.8 Engine'}</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 truncate">
                {tCopilot('visualWorkflowDesigner') || 'Autonomous Visual Workflow Designer & Canvas Architect'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              title={tCopilot('clearConversation') || "Reset conversation"}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label={tCopilot('closeDrawer') || "Close dialog"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK SUGGESTION CHIPS STRIP */}
        {/* ========================================================================= */}
        <div className="border-b border-[#E8E8E6] bg-[#FAF9F6] px-5 py-2.5 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
            <Bot className="h-3 w-3 text-zinc-400" />
            <span>{tCopilot('templates') || 'Templates'}:</span>
          </span>
          {localizedChips.map((chip) => {
            const Icon = chip.icon;
            const isSelected = selectedChipId === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-3xs shrink-0 ${
                  isSelected
                    ? 'bg-[#E8FDE8] border-[#4AE54A]/50 text-emerald-950 font-bold ring-1 ring-[#4AE54A]/30'
                    : 'bg-white border-[#E8E8E6] text-zinc-700 hover:bg-zinc-50 hover:text-black hover:border-zinc-300'
                }`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${isSelected ? 'text-[#4AE54A]' : 'text-zinc-500'}`} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SCROLLABLE CHAT THREAD */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const action = msg.action;
            const actionData = action?.data || {};
            const hasFlowAction = action && (action.type === 'create_flow' || action.type === 'update_flow') && Array.isArray(actionData.nodes) && actionData.nodes.length > 0;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="h-7 w-7 rounded-[7px] bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#4AE54A]" />
                  </div>
                )}

                <div className={`space-y-2.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Text Message Bubble */}
                  <div
                    className={`rounded-xl px-4 py-3 text-xs leading-relaxed font-normal shadow-3xs ${
                      isUser
                        ? 'bg-[#0A0A0A] text-white rounded-br-xs'
                        : 'bg-[#FAF9F6] border border-[#E8E8E6] text-zinc-900 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>

                  {/* Flow Canvas Architecture Card (Generated {tCopilot('readyToSave') || 'Ready for Canvas'} Injection) */}
                  {hasFlowAction && (
                    <div className="bg-white border-2 border-[#4AE54A]/30 rounded-xl p-4 shadow-md space-y-3.5 animate-fade-in w-full">
                      {/* Flow Header & Summary Properties */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#E8E8E6] pb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-950 uppercase tracking-wide">
                              {actionData.name || 'Synthesized Automation Flow'}
                            </span>
                            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
                              Ready for Canvas
                            </span>
                          </div>
                          {actionData.description && (
                            <p className="text-[11px] text-zinc-600 mt-1 leading-snug line-clamp-2">
                              {actionData.description}
                            </p>
                          )}
                        </div>

                        {/* Counts Pill */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E8E8E6] text-zinc-700 shadow-3xs">
                            {actionData.nodes.length} {tCopilot('canvasNodes') || 'Nodes'}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E8E8E6] text-zinc-700 shadow-3xs">
                            {actionData.edges?.length || 0} {tCopilot('connections') || 'Connections'}
                          </span>
                        </div>
                      </div>

                      {/* Trigger & Keywords Meta Strip */}
                      <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
                        <div className="flex items-center gap-1 font-semibold text-zinc-700 bg-zinc-50 px-2 py-0.5 rounded border border-[#E8E8E6]">
                          <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="capitalize">{actionData.trigger_type?.replace(/_/g, ' ') || 'Inbound Message'}</span>
                        </div>
                        {actionData.trigger_keywords && actionData.trigger_keywords.length > 0 && (
                          <div className="flex items-center gap-1 text-zinc-600 bg-amber-50/70 border border-amber-200/70 px-2 py-0.5 rounded">
                            <Tag className="h-3 w-3 text-amber-600 shrink-0" />
                            <span className="font-mono text-[10px] font-semibold text-amber-900">
                              {Array.isArray(actionData.trigger_keywords) ? actionData.trigger_keywords.map((k: string) => `#${k}`).join(' ') : actionData.trigger_keywords}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Visual Node Sequence Pipeline */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                          <span>{tCopilot('canvasNodes') || 'Synthesized Canvas Nodes'}</span>
                          <span className="font-mono font-normal">Click apply below to draw on visual designer</span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {actionData.nodes.map((node: any, nIdx: number) => {
                            const NodeIcon = getNodeIcon(node.type);
                            const title = node.data?.title || node.type;
                            const snippet = node.data?.body || node.data?.questionText || node.data?.keyword || (node.data?.items ? `${node.data.items.length} interactive menu options` : '');

                            return (
                              <div
                                key={node.id || nIdx}
                                className="bg-[#FAF9F6] border border-[#E8E8E6] rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs hover:border-zinc-300 transition-colors"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="h-6 w-6 rounded bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                                    <NodeIcon className="h-3.5 w-3.5 text-zinc-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-zinc-900 truncate">
                                        {title}
                                      </span>
                                      <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-zinc-200/80 text-zinc-600 shrink-0">
                                        {node.type}
                                      </span>
                                    </div>
                                    {snippet && (
                                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                        &quot;{snippet}&quot;
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                  #{nIdx + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 1-Click Apply Flow to Canvas Button */}
                      <div className="pt-2 border-t border-[#E8E8E6] flex items-center justify-between gap-2.5">
                        <span className="text-[11px] text-zinc-500 font-medium">
                          {tCopilot('replaceWarning') || 'Replaces existing canvas with this architecture'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleApplyToCanvas(actionData)}
                          className="relative inline-flex items-center justify-center p-[1px] rounded-[6px] overflow-hidden group cursor-pointer shadow-sm hover:shadow-[0_0_14px_rgba(74,229,74,0.35)] transition-all duration-300 active:scale-[0.98]"
                        >
                          <span className="absolute inset-[-250%] animate-border-rotate bg-[conic-gradient(from_0deg_at_50%_50%,#4AE54A_0%,#3DD43D_25%,#E8E8E6_50%,#86EFAC_75%,#4AE54A_100%)] opacity-90 group-hover:opacity-100 transition-opacity" />
                          <span className="relative z-10 flex items-center gap-2 h-8 px-4 rounded-[5px] bg-[#0A0A0A] group-hover:bg-zinc-900 text-white text-xs font-bold transition-all duration-200">
                            <Check className="h-3.5 w-3.5 text-[#4AE54A] stroke-[3]" />
                            <span>{tCopilot('applyToCanvas') || 'Apply Flow to Canvas'}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-start animate-fade-in">
              <div className="h-7 w-7 rounded-[7px] bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center shrink-0 shadow-3xs">
                <Sparkles className="h-3.5 w-3.5 text-[#4AE54A] animate-spin" />
              </div>
              <div className="bg-[#FAF9F6] border border-[#E8E8E6] rounded-xl rounded-bl-xs px-4 py-3 shadow-3xs max-w-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#4AE54A] animate-ping" />
                  <span className="text-xs font-bold text-zinc-900">
                    {tCopilot('synthesizing') || 'Copilot is synthesizing workflow architecture...'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {tCopilot('synthesizingDesc') || 'Configuring canvas nodes, interactive branches, variable payloads, and waterfall coordinates.'}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* COMPOSER INPUT STRIP */}
        {/* ========================================================================= */}
        <div className="border-t border-[#E8E8E6] bg-[#FAF9F6] p-3.5 sm:p-4 shrink-0">
          <div className="bg-white border border-[#E8E8E6] rounded-xl p-2 shadow-3xs focus-within:border-black focus-within:ring-1 focus-within:ring-black/10 transition-all flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={tCopilot('copilotInputPlaceholder') || "Ask Copilot to build or adjust this flow... (e.g. 'Add an email collection step and 3 options menu with demo booking')"}
              className="flex-1 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 border-none outline-none resize-none p-1.5 leading-relaxed font-normal"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="h-8 w-8 rounded-lg bg-[#0A0A0A] hover:bg-zinc-900 text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-3xs active:scale-95"
              title="Send message"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-400 font-medium">
            <span>{tCopilot('copilotPressEnter') || 'Press Enter to send, Shift+Enter for newline'}</span>
            <span>{tCopilot('poweredBy') || 'Powered by Qwen 3.8 & WhatsOmni Copilot'}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
