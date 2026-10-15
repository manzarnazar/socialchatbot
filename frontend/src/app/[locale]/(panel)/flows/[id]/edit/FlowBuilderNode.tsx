import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

type CustomNode = Node<{
  title?: string;
  channel?: string;
  keyword?: string;
  matchType?: string;
  body?: string;
  mediaUrl?: string;
  tagAction?: string;
  targetTag?: string;
  question?: string;
  method?: string;
  url?: string;
  prompt?: string;
  query?: string;
  [key: string]: any;
}>;
import { 
  Play, 
  MessageSquare, 
  Settings, 
  Calendar, 
  UserCheck, 
  Tag, 
  FileEdit, 
  GitBranch, 
  Hourglass, 
  Briefcase, 
  Webhook, 
  Sparkles, 
  Database,
  AlertTriangle,
  AlertCircle,
  LogOut,
  HelpCircle,
  ShoppingCart,
  Percent,
  Megaphone,
  Lock,
  ListFilter,
  Workflow,
  Zap,
  FormInput,
  Search,
  Package,
  ShoppingBag,
  Boxes,
  CreditCard
} from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { useTranslations } from 'next-intl';

// Map icon classes per node types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NODE_ICONS: Record<string, any> = {
  inbound_message: Play,
  outbound_campaign: Megaphone,
  webhook_trigger: Webhook,
  contact_created: Play,
  deal_updated: Play,
  manual: Play,
  send_message: MessageSquare,
  send_template: MessageSquare,
  whatsapp_flow: FormInput,
  send_whatsapp_flow: FormInput,
  ask_question: HelpCircle,
  interactive_menu: ListFilter,
  condition: GitBranch,
  ai_condition: Sparkles,
  wait_delay: Hourglass,
  tag_contact: Tag,
  update_contact: FileEdit,
  create_deal: Briefcase,
  create_appointment: Calendar,
  human_handoff: UserCheck,
  webhook_dispatch: Webhook,
  n8n: Workflow,
  zapier: Zap,
  rag_query: Database,
  end_flow: LogOut,
  ecommerceCheckoutAbandoned: ShoppingCart,
  checkCartStatus: ShoppingCart,
  generateDiscountCode: Percent,
  search_product: Search,
  get_product: Package,
  send_product: ShoppingBag,
  check_stock: Boxes,
  send_checkout_link: CreditCard,
};

// Colors mapping
const NODE_COLORS: Record<string, string> = {
  inbound_message: 'border-emerald-200 bg-[#E8FDE8]/50 text-emerald-700',
  outbound_campaign: 'border-emerald-200 bg-[#E8FDE8]/50 text-emerald-700',
  webhook_trigger: 'border-teal-200 bg-teal-50/40 text-teal-700',
  contact_created: 'border-green-200 bg-green-50/40 text-green-700',
  deal_updated: 'border-lime-200 bg-lime-50/40 text-lime-700',
  manual: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  send_message: 'border-blue-200 bg-blue-50/40 text-blue-700',
  send_template: 'border-sky-200 bg-sky-50/40 text-sky-700',
  whatsapp_flow: 'border-emerald-200 bg-[#E8FDE8]/50 text-emerald-700',
  send_whatsapp_flow: 'border-emerald-200 bg-[#E8FDE8]/50 text-emerald-700',
  ask_question: 'border-cyan-200 bg-cyan-50/40 text-cyan-700',
  interactive_menu: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
  condition: 'border-amber-200 bg-amber-50/40 text-amber-700',
  ai_condition: 'border-purple-200 bg-purple-50/40 text-purple-700',
  wait_delay: 'border-zinc-300 bg-zinc-50 text-zinc-650',
  tag_contact: 'border-indigo-200 bg-indigo-50/40 text-indigo-700',
  update_contact: 'border-violet-200 bg-violet-50/40 text-violet-700',
  create_deal: 'border-orange-200 bg-orange-50/40 text-orange-700',
  create_appointment: 'border-fuchsia-200 bg-fuchsia-50/40 text-fuchsia-700',
  human_handoff: 'border-rose-200 bg-rose-50/40 text-rose-700',
  webhook_dispatch: 'border-[#BAE6FD] bg-[#F0F9FF]/40 text-[#0369A1]',
  n8n: 'border-rose-200 bg-rose-50/50 text-[#EA4B71]',
  zapier: 'border-orange-200 bg-orange-50/40 text-[#FF4A00]',
  rag_query: 'border-pink-200 bg-pink-50/40 text-pink-700',
  end_flow: 'border-red-200 bg-red-50/40 text-red-700',
  ecommerceCheckoutAbandoned: 'border-green-200 bg-[#E8FDE8]/50 text-green-700',
  checkCartStatus: 'border-amber-200 bg-amber-50/40 text-amber-700',
  generateDiscountCode: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
  search_product: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
  get_product: 'border-teal-200 bg-teal-50/40 text-teal-700',
  send_product: 'border-blue-200 bg-blue-50/40 text-blue-700',
  check_stock: 'border-amber-200 bg-amber-50/40 text-amber-700',
  send_checkout_link: 'border-purple-200 bg-purple-50/40 text-purple-700',
};

export const ROTATING_PORT_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-violet-500',
];

export const OUT_PORTS: Record<string, { id: string; label: string; colorClass?: string }[]> = {
  inbound_message: [{ id: 'out', label: 'Trigger' }],
  outbound_campaign: [{ id: 'out', label: 'Trigger' }],
  webhook_trigger: [{ id: 'out', label: 'Trigger' }],
  contact_created: [{ id: 'out', label: 'Trigger' }],
  deal_updated: [{ id: 'out', label: 'Trigger' }],
  manual: [{ id: 'out', label: 'Trigger' }],
  send_message: [{ id: 'out', label: 'Next' }],
  send_template: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  whatsapp_flow: [{ id: 'out', label: 'Next' }, { id: 'on_submit', label: 'Form Submitted', colorClass: 'bg-emerald-500' }],
  send_whatsapp_flow: [{ id: 'out', label: 'Next' }, { id: 'on_submit', label: 'Form Submitted', colorClass: 'bg-emerald-500' }],
  ask_question: [{ id: 'out', label: 'Reply Received' }],
  interactive_menu: [], // Handled dynamically by getNodeOutPorts
  condition: [{ id: 'true', label: 'True', colorClass: 'bg-emerald-500' }, { id: 'false', label: 'False', colorClass: 'bg-red-500' }],
  ai_condition: [{ id: 'yes', label: 'Yes', colorClass: 'bg-emerald-500' }, { id: 'no', label: 'No', colorClass: 'bg-red-500' }],
  wait_delay: [{ id: 'resume', label: 'Resume', colorClass: 'bg-zinc-600' }, { id: 'timeout', label: 'Timeout', colorClass: 'bg-amber-500' }],
  tag_contact: [{ id: 'out', label: 'Next' }],
  update_contact: [{ id: 'out', label: 'Next' }],
  create_deal: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  create_appointment: [{ id: 'scheduled', label: 'Scheduled', colorClass: 'bg-emerald-500' }, { id: 'unavailable', label: 'Unavailable', colorClass: 'bg-red-500' }, { id: 'error', label: 'Error', colorClass: 'bg-zinc-400' }],
  human_handoff: [], // Terminating
  webhook_dispatch: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  n8n: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  zapier: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  rag_query: [{ id: 'out', label: 'Next' }],
  end_flow: [], // Terminating
  ecommerceCheckoutAbandoned: [{ id: 'out', label: 'Trigger' }],
  checkCartStatus: [{ id: 'true', label: 'True', colorClass: 'bg-emerald-500' }, { id: 'false', label: 'False', colorClass: 'bg-red-500' }],
  generateDiscountCode: [{ id: 'success', label: 'Success', colorClass: 'bg-emerald-500' }, { id: 'error', label: 'Error', colorClass: 'bg-red-500' }],
  search_product: [{ id: 'found', label: 'Found', colorClass: 'bg-emerald-500' }, { id: 'not_found', label: 'Not Found', colorClass: 'bg-zinc-400' }],
  get_product: [{ id: 'found', label: 'Found', colorClass: 'bg-emerald-500' }, { id: 'not_found', label: 'Not Found', colorClass: 'bg-zinc-400' }],
  send_product: [{ id: 'sent', label: 'Sent', colorClass: 'bg-emerald-500' }, { id: 'failed', label: 'Failed', colorClass: 'bg-red-500' }],
  check_stock: [{ id: 'in_stock', label: 'In Stock', colorClass: 'bg-emerald-500' }, { id: 'out_of_stock', label: 'Out of Stock', colorClass: 'bg-red-500' }],
  send_checkout_link: [{ id: 'sent', label: 'Sent', colorClass: 'bg-emerald-500' }, { id: 'failed', label: 'Failed', colorClass: 'bg-red-500' }],
};

export const getNodeOutPorts = (node: { type?: string; data?: any }): { id: string; label: string; colorClass?: string }[] => {
  if (!node || !node.type) return [];

  if (node.type === 'interactive_menu') {
    const items = Array.isArray(node.data?.items) ? node.data.items : [];
    if (items.length === 0) {
      return [
        { id: 'opt_1', label: 'Option 1', colorClass: 'bg-emerald-500' },
        { id: 'opt_2', label: 'Option 2', colorClass: 'bg-blue-500' },
        { id: 'fallback', label: 'Fallback / Other', colorClass: 'bg-zinc-400' }
      ];
    }
    const ports = items.map((item: any, idx: number) => ({
      id: item.id || `opt_${idx + 1}`,
      label: item.title || `Option ${idx + 1}`,
      colorClass: ROTATING_PORT_COLORS[idx % ROTATING_PORT_COLORS.length]
    }));
    ports.push({
      id: 'fallback',
      label: 'Fallback / Other',
      colorClass: 'bg-zinc-400'
    });
    return ports;
  }

  return OUT_PORTS[node.type] || [];
};


// Left accent bar color mapping
const NODE_ACCENTS: Record<string, string> = {
  inbound_message: 'bg-emerald-500',
  outbound_campaign: 'bg-emerald-500',
  webhook_trigger: 'bg-teal-500',
  contact_created: 'bg-green-500',
  deal_updated: 'bg-lime-500',
  manual: 'bg-zinc-500',
  send_message: 'bg-blue-500',
  send_template: 'bg-sky-500',
  whatsapp_flow: 'bg-emerald-500',
  send_whatsapp_flow: 'bg-emerald-500',
  ask_question: 'bg-cyan-500',
  interactive_menu: 'bg-emerald-500',
  condition: 'bg-amber-500',
  ai_condition: 'bg-purple-500',
  wait_delay: 'bg-zinc-500',
  tag_contact: 'bg-indigo-500',
  update_contact: 'bg-violet-500',
  create_deal: 'bg-orange-500',
  create_appointment: 'bg-fuchsia-500',
  human_handoff: 'bg-rose-500',
  webhook_dispatch: 'bg-[#0369A1]',
  n8n: 'bg-[#EA4B71]',
  zapier: 'bg-[#FF4A00]',
  rag_query: 'bg-pink-500',
  end_flow: 'bg-red-500',
  ecommerceCheckoutAbandoned: 'bg-[#4AE54A]',
  checkCartStatus: 'bg-amber-500',
  generateDiscountCode: 'bg-[#4AE54A]',
};

const NODE_ACCENTS_DARK: Record<string, string> = {
  inbound_message: 'bg-emerald-700',
  webhook_trigger: 'bg-teal-700',
  contact_created: 'bg-green-700',
  deal_updated: 'bg-lime-700',
  manual: 'bg-zinc-700',
  send_message: 'bg-blue-700',
  send_template: 'bg-sky-700',
  whatsapp_flow: 'bg-emerald-700',
  send_whatsapp_flow: 'bg-emerald-700',
  ask_question: 'bg-cyan-700',
  interactive_menu: 'bg-emerald-700',
  condition: 'bg-amber-700',
  ai_condition: 'bg-purple-700',
  wait_delay: 'bg-zinc-700',
  tag_contact: 'bg-indigo-700',
  update_contact: 'bg-violet-750',
  create_deal: 'bg-orange-700',
  create_appointment: 'bg-fuchsia-700',
  human_handoff: 'bg-rose-700',
  webhook_dispatch: 'bg-[#0369A1]',
  n8n: 'bg-[#BE123C]',
  zapier: 'bg-orange-700',
  rag_query: 'bg-pink-700',
  end_flow: 'bg-red-700',
  ecommerceCheckoutAbandoned: 'bg-green-700',
  checkCartStatus: 'bg-amber-700',
  generateDiscountCode: 'bg-emerald-700',
};

const ACCENT_HEX_COLORS: Record<string, string> = {
  inbound_message: '#057857',
  webhook_trigger: '#0F766E',
  contact_created: '#15803D',
  deal_updated: '#4D7C0F',
  manual: '#3F3F46',
  send_message: '#1D4ED8',
  send_template: '#0369A1',
  whatsapp_flow: '#057857',
  send_whatsapp_flow: '#057857',
  ask_question: '#0E7490',
  interactive_menu: '#057857',
  condition: '#B45309',
  ai_condition: '#6D28D9',
  wait_delay: '#3F3F46',
  tag_contact: '#4338CA',
  update_contact: '#6D28D9',
  create_deal: '#C2410C',
  create_appointment: '#A21CAF',
  human_handoff: '#BE123C',
  webhook_dispatch: '#0369A1',
  n8n: '#EA4B71',
  zapier: '#FF4A00',
  rag_query: '#BE185D',
  end_flow: '#BE123C',
  ecommerceCheckoutAbandoned: '#4AE54A',
  checkCartStatus: '#B45309',
  generateDiscountCode: '#057857',
};

const VARIABLE_LABELS: Record<string, string> = {
  'contact.first_name': 'Contact First Name',
  'contact.last_name': 'Contact Last Name',
  'contact.email': 'Contact Email',
  'contact.phone': 'Contact Phone',
  'inbound_message_body': 'Customer Message Body',
  'system.current_date': 'Current Date',
  'system.current_time': 'Current Time',
  'deal.name': 'CRM Deal Name',
  'deal.value': 'CRM Deal Value',
  'deal.stage': 'CRM Deal Stage',
  'checkout_url': 'Checkout URL',
  'cart_total': 'Cart Total',
  'items_summary': 'Items Summary',
  'discount.code': 'Discount Code',
  'discount.expiry': 'Discount Expiry',
};

const renderTextWithVariables = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\{\{[\s\S]*?\}\})/g);
  return parts.map((part, index) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const varName = part.replace('{{', '').replace('}}', '').trim();
      const getDynamicLabel = (vName: string) => {
        if (VARIABLE_LABELS[vName]) return VARIABLE_LABELS[vName];
        const nodes = useFlowStore.getState().nodes;
        const qNode = nodes.find((n) => (n.type === 'ask_question' || n.type === 'interactive_menu') && (n.data?.saveVariable === vName || n.data?.saveKey === vName));
        if (qNode) {
          return qNode.data?.saveVariableLabel || vName.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        return vName.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      };
      const readableLabel = getDynamicLabel(varName);
      return (
        <span 
          key={index} 
          className="font-bold text-blue-600 select-none mx-0.5"
        >
          {String(readableLabel)}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const getCategoryDetails = (type: string) => {
  const mapping: Record<string, { label: string; bgClass: string; badgeClass: string; borderColorClass: string }> = {
    inbound_message: {
      label: 'Trigger',
      bgClass: 'bg-[#E8FDE8]/50',
      badgeClass: 'bg-emerald-50 border border-emerald-250 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    outbound_campaign: {
      label: 'Trigger',
      bgClass: 'bg-blue-50/40',
      badgeClass: 'bg-blue-50 border border-blue-200 text-blue-700',
      borderColorClass: 'border-blue-500 ring-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    },
    webhook_trigger: {
      label: 'Trigger',
      bgClass: 'bg-teal-50/40',
      badgeClass: 'bg-teal-50 border border-teal-200 text-teal-700',
      borderColorClass: 'border-teal-500 ring-teal-100 shadow-[0_0_12px_rgba(15,118,110,0.15)]',
    },
    contact_created: {
      label: 'Trigger',
      bgClass: 'bg-green-50/40',
      badgeClass: 'bg-green-50 border border-green-200 text-green-700',
      borderColorClass: 'border-green-500 ring-green-100 shadow-[0_0_12px_rgba(21,128,61,0.15)]',
    },
    deal_updated: {
      label: 'Trigger',
      bgClass: 'bg-lime-50/40',
      badgeClass: 'bg-lime-50 border border-lime-200 text-lime-750',
      borderColorClass: 'border-lime-500 ring-lime-100 shadow-[0_0_12px_rgba(77,124,15,0.15)]',
    },
    manual: {
      label: 'Trigger',
      bgClass: 'bg-zinc-100/50',
      badgeClass: 'bg-zinc-50 border border-zinc-200 text-zinc-700',
      borderColorClass: 'border-zinc-500 ring-zinc-100 shadow-[0_0_12px_rgba(63,63,70,0.15)]',
    },
    send_message: {
      label: 'Message',
      bgClass: 'bg-blue-50/40',
      badgeClass: 'bg-blue-50 border border-blue-200 text-blue-700',
      borderColorClass: 'border-blue-500 ring-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    },
    send_template: {
      label: 'Template',
      bgClass: 'bg-sky-50/40',
      badgeClass: 'bg-sky-50 border border-sky-200 text-sky-700',
      borderColorClass: 'border-sky-500 ring-sky-100 shadow-[0_0_12px_rgba(3,105,161,0.15)]',
    },
    whatsapp_flow: {
      label: 'WhatsApp Flow',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    send_whatsapp_flow: {
      label: 'WhatsApp Flow',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    ask_question: {
      label: 'Question',
      bgClass: 'bg-cyan-50/40',
      badgeClass: 'bg-cyan-50 border border-cyan-200 text-cyan-700',
      borderColorClass: 'border-cyan-500 ring-cyan-100 shadow-[0_0_12px_rgba(14,116,144,0.15)]',
    },
    interactive_menu: {
      label: 'Menu Choice',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    condition: {
      label: 'Logic',
      bgClass: 'bg-amber-50/40',
      badgeClass: 'bg-amber-50 border border-amber-200 text-amber-700',
      borderColorClass: 'border-amber-500 ring-amber-100 shadow-[0_0_12px_rgba(180,83,9,0.15)]',
    },
    ai_condition: {
      label: 'AI Logic',
      bgClass: 'bg-purple-50/40',
      badgeClass: 'bg-purple-50 border border-purple-200 text-purple-700',
      borderColorClass: 'border-purple-500 ring-purple-100 shadow-[0_0_12px_rgba(109,40,217,0.15)]',
    },
    wait_delay: {
      label: 'Delay',
      bgClass: 'bg-zinc-100/50',
      badgeClass: 'bg-zinc-50 border border-zinc-250 text-zinc-650',
      borderColorClass: 'border-zinc-500 ring-zinc-100 shadow-[0_0_12px_rgba(113,113,122,0.15)]',
    },
    tag_contact: {
      label: 'CRM Tag',
      bgClass: 'bg-indigo-50/40',
      badgeClass: 'bg-indigo-50 border border-indigo-200 text-indigo-700',
      borderColorClass: 'border-indigo-500 ring-indigo-100 shadow-[0_0_12px_rgba(67,56,202,0.15)]',
    },
    update_contact: {
      label: 'CRM Update',
      bgClass: 'bg-violet-50/40',
      badgeClass: 'bg-violet-50 border border-violet-200 text-violet-700',
      borderColorClass: 'border-violet-500 ring-violet-100 shadow-[0_0_12px_rgba(109,40,217,0.15)]',
    },
    create_deal: {
      label: 'CRM Deal',
      bgClass: 'bg-orange-50/40',
      badgeClass: 'bg-orange-50 border border-orange-200 text-orange-700',
      borderColorClass: 'border-orange-500 ring-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
    },
    create_appointment: {
      label: 'Calendar',
      bgClass: 'bg-fuchsia-50/40',
      badgeClass: 'bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700',
      borderColorClass: 'border-fuchsia-500 ring-fuchsia-100 shadow-[0_0_12px_rgba(162,28,175,0.15)]',
    },
    human_handoff: {
      label: 'Inbox Handoff',
      bgClass: 'bg-rose-50/40',
      badgeClass: 'bg-rose-50 border border-rose-200 text-rose-700',
      borderColorClass: 'border-rose-500 ring-rose-100 shadow-[0_0_12px_rgba(190,18,60,0.15)]',
    },
    webhook_dispatch: {
      label: 'API Outflow',
      bgClass: 'bg-[#F0F9FF]/40',
      badgeClass: 'bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1]',
      borderColorClass: 'border-[#0284C7] ring-sky-100 shadow-[0_0_12px_rgba(3,105,161,0.15)]',
    },
    n8n: {
      label: 'n8n Workflow',
      bgClass: 'bg-rose-50/40',
      badgeClass: 'bg-rose-50 border border-rose-200 text-[#EA4B71]',
      borderColorClass: 'border-[#EA4B71] ring-rose-100 shadow-[0_0_12px_rgba(234,75,113,0.15)]',
    },
    zapier: {
      label: 'Zapier Hook',
      bgClass: 'bg-orange-50/40',
      badgeClass: 'bg-orange-50 border border-orange-200 text-[#FF4A00]',
      borderColorClass: 'border-[#FF4A00] ring-orange-100 shadow-[0_0_12px_rgba(255,74,0,0.15)]',
    },
    rag_query: {
      label: 'AI Search',
      bgClass: 'bg-pink-50/40',
      badgeClass: 'bg-pink-50 border border-pink-200 text-pink-700',
      borderColorClass: 'border-pink-500 ring-pink-100 shadow-[0_0_12px_rgba(190,24,93,0.15)]',
    },
    end_flow: {
      label: 'End Session',
      bgClass: 'bg-red-50/40',
      badgeClass: 'bg-red-50 border border-red-200 text-red-700',
      borderColorClass: 'border-red-500 ring-red-100 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    },
    ecommerceCheckoutAbandoned: {
      label: 'E-Commerce',
      bgClass: 'bg-[#E8FDE8]/50',
      badgeClass: 'bg-green-50 border border-green-250 text-green-700',
      borderColorClass: 'border-green-500 ring-green-100 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    },
    checkCartStatus: {
      label: 'E-Commerce',
      bgClass: 'bg-amber-50/40',
      badgeClass: 'bg-amber-50 border border-amber-200 text-amber-700',
      borderColorClass: 'border-amber-500 ring-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
    generateDiscountCode: {
      label: 'E-Commerce',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-50 border border-emerald-250 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    search_product: {
      label: 'E-Commerce',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      borderColorClass: 'border-emerald-500 ring-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    get_product: {
      label: 'E-Commerce',
      bgClass: 'bg-teal-50/40',
      badgeClass: 'bg-teal-50 border border-teal-200 text-teal-700',
      borderColorClass: 'border-teal-500 ring-teal-100 shadow-[0_0_12px_rgba(20,184,166,0.15)]',
    },
    send_product: {
      label: 'E-Commerce',
      bgClass: 'bg-blue-50/40',
      badgeClass: 'bg-blue-50 border border-blue-200 text-blue-700',
      borderColorClass: 'border-blue-500 ring-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    },
    check_stock: {
      label: 'E-Commerce',
      bgClass: 'bg-amber-50/40',
      badgeClass: 'bg-amber-50 border border-amber-200 text-amber-700',
      borderColorClass: 'border-amber-500 ring-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
    send_checkout_link: {
      label: 'E-Commerce',
      bgClass: 'bg-purple-50/40',
      badgeClass: 'bg-purple-50 border border-purple-200 text-purple-700',
      borderColorClass: 'border-purple-500 ring-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
    },
  };

  return mapping[type] || {
    label: 'Action',
    bgClass: 'bg-orange-50/30',
    badgeClass: 'bg-orange-50 border border-orange-200 text-orange-700',
    borderColorClass: 'border-orange-500 ring-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
  };
};

export const FlowBuilderNode = ({ id, type, data, selected }: NodeProps<CustomNode>) => {
  const t = useTranslations('Flows');
  const tCommon = useTranslations('Common');

  const getLocalNodeTitle = (title: string) => {
    const defaultTitles: Record<string, string> = {
      'Inbound Message': 'node_inbound_message_title',
      'Outbound Broadcast': 'node_outbound_campaign_title',
      'API Webhook': 'node_webhook_trigger_title',
      'Send Message': 'node_send_message_title',
      'Send Template': 'node_send_template_title',
      'WhatsApp Flow Form': 'node_whatsapp_flow_title',
      'Ask Question': 'node_ask_question_title',
      'Interactive Menu': 'node_interactive_menu_title',
      'Condition Branch': 'node_condition_title',
      'AI Binary Decision': 'node_ai_condition_title',
      'Delay & Wait': 'node_wait_delay_title',
      'Tag Contact': 'node_tag_contact_title',
      'Update Contact': 'node_update_contact_title',
      'Create Deal': 'node_create_deal_title',
      'Book Appointment': 'node_create_appointment_title',
      'Human Handoff': 'node_human_handoff_title',
      'Webhook Outflow': 'node_webhook_dispatch_title',
      'AI Model Prompt': 'node_ai_prompt_title',
      'Vector RAG Query': 'node_rag_query_title',
      'End Session': 'node_end_flow_title',
      'Start Trigger': 'node_inbound_message_title',
      'Checkout Abandoned': 'node_ecommerceCheckoutAbandoned_title',
      'Check Cart Status': 'node_checkCartStatus_title',
      'Generate Discount': 'node_generateDiscountCode_title',
      'Search Product': 'node_search_product_title',
      'Get Product': 'node_get_product_title',
      'Send Product': 'node_send_product_title',
      'Check Stock': 'node_check_stock_title',
      'Send Checkout Link': 'node_send_checkout_link_title',
    };

    if (defaultTitles[title] && t.has(defaultTitles[title])) {
      try {
        const res = t(defaultTitles[title]);
        if (res && !res.startsWith('Flows.')) return res;
      } catch {}
    }
    
    // Type-based fallback
    const typeKey = `node_${type}_title`;
    if (t.has(typeKey)) {
      try {
        const res = t(typeKey);
        if (res && !res.startsWith('Flows.')) return res;
      } catch {}
    }

    return title;
  };
  const errors = useFlowStore((state) => state.errors);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const edges = useFlowStore((state) => state.edges);
  const isEcommerceConnected = useFlowStore((state) => state.isEcommerceConnected);
  const isSelected = selected || selectedNodeId === id;
  const nodeError = errors[id];

  const IconComponent = NODE_ICONS[type] || Settings;
  const themeClass = NODE_COLORS[type] || 'border-zinc-200 bg-white text-zinc-700';

  const isTrigger = ['inbound_message', 'webhook_trigger', 'contact_created', 'deal_updated', 'manual', 'outbound_campaign', 'ecommerceCheckoutAbandoned'].includes(type);
  const outPorts = getNodeOutPorts({ type, data });

  const accentColorDarkClass = NODE_ACCENTS_DARK[type] || 'bg-zinc-700';
  const accentHexColor = ACCENT_HEX_COLORS[type] || '#71717A';

  const cat = getCategoryDetails(type);

  // Connection validation checks for connectability of ports
  const isInputConnected = edges.some((edge) => edge.target === id);
  const isSourceConnected = (portId: string) => {
    if (outPorts.length <= 1) {
      return edges.some((edge) => edge.source === id);
    }
    return edges.some((edge) => {
      if (edge.source !== id) return false;
      const sh = edge.sourceHandle || 'out';
      if (sh === portId) return true;
      if (portId === 'item_0' && (sh === 'opt_1' || sh === 'item_0')) return true;
      if (portId === 'opt_1' && (sh === 'item_0' || sh === 'opt_1')) return true;
      if (portId === 'item_1' && (sh === 'opt_2' || sh === 'item_1')) return true;
      if (portId === 'opt_2' && (sh === 'item_1' || sh === 'opt_2')) return true;
      if (portId === 'item_2' && (sh === 'opt_3' || sh === 'item_2')) return true;
      if (portId === 'opt_3' && (sh === 'item_2' || sh === 'opt_3')) return true;
      return false;
    });
  };

  return (
    <div 
      className={`relative w-[220px] rounded-xl border bg-white shadow-3xs transition-all duration-200 font-sans ${
        nodeError 
          ? isSelected
            ? 'border-[#FF4444] ring-1 ring-[#FF4444] bg-[#FF4444]/5 shadow-md'
            : 'border-[#FF4444]/40 bg-[#FF4444]/5 shadow-[0_2px_8px_rgba(255,68,68,0.06)]' 
          : isSelected 
            ? `border-black ring-1 ring-black shadow-md` 
            : 'border-[#E8E8E6] hover:border-zinc-450 hover:shadow-2xs'
      }`}
    >
      {/* Top Danger Accent Bar */}
      {nodeError && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FF4444] rounded-t-xl z-55" />
      )}

      {/* Node Header Block with Category Styling */}
      <div className={`flex items-center gap-2.5 px-3.5 py-3 border-b border-[#E8E8E6] select-none rounded-t-xl ${cat.bgClass}`}>
        <div className={`p-1.5 rounded-[6px] shrink-0 flex items-center justify-center ${cat.badgeClass}`}>
          <IconComponent className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-xs font-bold text-zinc-900 tracking-tight leading-normal truncate pb-0.5">
            {getLocalNodeTitle(data?.title || type || 'Custom Action')}
          </p>
          <p className="text-[8.5px] font-mono font-semibold text-zinc-400 truncate leading-normal" title={data?.node_identifier || id}>
            #{data?.node_identifier || id}
          </p>
        </div>
        
        {isTrigger && (
          <div className="shrink-0 flex items-center justify-center text-zinc-400" title="Starting root trigger for flow">
            <Lock className="h-3 w-3" />
          </div>
        )}

        {!isTrigger && data?.enable_trigger_words && (
          <div className="shrink-0 flex items-center justify-center bg-amber-50 border border-amber-200 text-amber-600 p-1 rounded-md ml-1 shadow-3xs" title={`Keyword Trigger: ${data.trigger_words}`}>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </div>
        )}

        {nodeError && (
          <div className="group relative shrink-0 ml-1 flex items-center justify-center">
            <AlertCircle className="h-3.5 w-3.5 text-[#FF4444] cursor-help" />
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2.5 hidden group-hover:block w-[190px] p-2.5 bg-[#0A0A0A] text-white font-medium text-[10px] leading-relaxed rounded-[6px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] text-left z-50 pointer-events-none border border-zinc-800 animate-fade-in font-sans">
              <div className="text-[8.5px] font-black text-red-400 uppercase tracking-widest mb-0.5 select-none">{t('configurationError') || 'Configuration Error'}</div>
              {nodeError}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#0A0A0A]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Node Details Preview */}
      <div className="px-3.5 py-3 select-none">
        {type === 'send_message' && (
          <div className="flex flex-col gap-1.5">
            {data.mediaUrl && (
              <div className="bg-white border border-[#E8E8E6] rounded-[6px] overflow-hidden p-1 flex items-center gap-1.5 mb-0.5 shadow-3xs">
                <div className="h-6 w-6 bg-[#FAFAFA] flex items-center justify-center border border-[#E8E8E6] rounded shrink-0">
                  <Play className="h-3 w-3 text-blue-500" />
                </div>
                <span className="text-[8.5px] font-mono text-zinc-400 truncate flex-1">{data.mediaUrl}</span>
              </div>
            )}
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-800 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[72px] overflow-y-auto">
              {data.body ? renderTextWithVariables(data.body) : <span className="text-zinc-400">{t('composeMessageBody') || 'Compose message body...'}</span>}
            </div>
          </div>
        )}
        {(type === 'whatsapp_flow' || type === 'send_whatsapp_flow') && (
          <div className="flex flex-col gap-1.5">
            <div className="bg-[#FAF9F6] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#E8E8E6]">
                <span className="text-[8.5px] font-bold text-zinc-700 truncate max-w-[130px]">
                  {data.flowName || (data.flowId ? `Flow #${data.flowId}` : 'Select Flow Form')}
                </span>
                <span className="text-[7.5px] font-extrabold uppercase px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {data.waitForSubmission !== false ? 'Wait for Reply' : 'Send & Next'}
                </span>
              </div>
              <p className="text-[8.5px] text-zinc-500 line-clamp-2">
                {data.body || 'Please complete this form to continue.'}
              </p>
              <div className="mt-1.5 pt-1 border-t border-zinc-100 flex items-center justify-between text-[8px] text-emerald-700 font-bold">
                <span>CTA: {data.flowCta || 'Open Form'}</span>
                <span className="flex items-center gap-1"><FormInput className="h-2.5 w-2.5" /> Flow Form</span>
              </div>
            </div>
          </div>
        )}
        {type === 'wait_delay' && (
          <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2 shadow-3xs">
            <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 border border-[#E8E8E6]">
              <Hourglass className="h-3 w-3 text-zinc-500 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('waitDelay') || 'Wait Delay'}</p>
              <p className="text-[10px] font-bold text-zinc-850 mt-0.5">
                {data.delayType === 'duration' ? `${data.value} ${data.unit}` : (t('untilCustomerResponse') || 'Until customer response')}
              </p>
            </div>
          </div>
        )}
        {type === 'tag_contact' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[8.5px]">
              <span className="text-zinc-400 font-bold uppercase text-[7.5px]">{t('action') || 'Action'}:</span>
              <span className={`font-black uppercase tracking-tight text-[7.5px] px-1 rounded-[3px] ${data.tagAction === 'add_tag' ? 'bg-[#E8FDE8] text-[#4AE54A] border border-[#E8E8E6]' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {data.tagAction === 'add_tag' ? (t('addTag') || 'Add Tag') : (t('removeTag') || 'Remove Tag')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-1.5 shadow-3xs">
              <Tag className="h-3 w-3 text-teal-500" />
              <span className="text-[10px] font-bold text-zinc-850 truncate flex-1">
                {data.targetTag || tCommon('none') || 'None'}
              </span>
            </div>
          </div>
        )}
        {type === 'inbound_message' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase">
              <span>{data.matchType === 'keyword_match' || !!data.keyword ? 'Keyword Match' : 'Any Message'}</span>
              <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">
                Root
              </span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              {data.matchType === 'keyword_match' || !!data.keyword ? (
                <div className="space-y-1">
                  <span className="text-[8px] text-zinc-400 font-bold uppercase">Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {(data.keyword || 'quote, pricing, support').split(',').slice(0, 3).map((kw: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white border border-[#E8E8E6] text-zinc-700 text-[8.5px] font-semibold rounded">
                        {kw.trim()}
                      </span>
                    ))}
                    {(data.keyword || '').split(',').length > 3 && (
                      <span className="text-[8px] font-bold text-zinc-400 self-center">
                        +{(data.keyword || '').split(',').length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[9.5px] font-bold text-zinc-800">
                  Starts on any incoming customer message
                </span>
              )}
            </div>
          </div>
        )}
        {type === 'contact_created' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase">
              <span>CRM Directory</span>
              <span className="text-[7.5px] font-black uppercase text-purple-600 bg-purple-50 border border-purple-100 px-1 py-0.5 rounded">
                Root
              </span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              <span className="text-[9.5px] font-bold text-zinc-800">
                Starts when new contact is created or imported
              </span>
            </div>
          </div>
        )}
        {type === 'deal_updated' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase">
              <span>Sales Pipeline</span>
              <span className="text-[7.5px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded">
                Root
              </span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              <span className="text-[9.5px] font-bold text-zinc-800">
                Stage: {data.stageId && data.stageId !== 'all' ? data.stageId : 'Any Stage Transition'}
              </span>
            </div>
          </div>
        )}
        {type === 'manual' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase">
              <span>On-Demand</span>
              <span className="text-[7.5px] font-black uppercase text-zinc-600 bg-zinc-100 border border-zinc-200 px-1 py-0.5 rounded">
                Root
              </span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              <span className="text-[9.5px] font-bold text-zinc-800">
                Dispatched manually by agents from Inbox/CRM
              </span>
            </div>
          </div>
        )}
        {type === 'ai_condition' && (
          <div className="flex flex-col gap-1.5">
            <div className="bg-purple-50 border border-purple-100 text-purple-800 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[72px] overflow-y-auto">
              {data.prompt_message || data.question ? (
                renderTextWithVariables(data.prompt_message || data.question)
              ) : (
                <span className="text-purple-400">{t('evaluateQuery') || 'Ask question & evaluate...'}</span>
              )}
            </div>
          </div>
        )}
        {(type === 'webhook_dispatch' || type === 'webhook_trigger' || type === 'n8n' || type === 'zapier') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-1.5 shadow-3xs">
              <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-[4px] border ${
                type === 'n8n'
                  ? 'bg-rose-50 border-rose-100 text-[#EA4B71]'
                  : type === 'zapier'
                  ? 'bg-orange-50 border-orange-100 text-[#FF4A00]'
                  : (data.method || 'POST') === 'GET' 
                  ? 'bg-blue-50 border-blue-100 text-blue-700' 
                  : (data.method || 'POST') === 'PUT' 
                  ? 'bg-purple-50 border-purple-100 text-purple-700'
                  : (data.method || 'POST') === 'PATCH'
                  ? 'bg-amber-50 border-amber-100 text-amber-700'
                  : (data.method || 'POST') === 'DELETE'
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : 'bg-sky-50 border-sky-100 text-sky-600'
              }`}>
                {type === 'n8n' ? (data.method || 'POST (n8n)') : type === 'zapier' ? (data.method || 'POST (Zapier)') : (data.method || (type === 'webhook_trigger' ? 'POST (Inbound)' : 'POST'))}
              </span>
              <span className="text-[9px] font-mono text-zinc-450 truncate max-w-[110px] font-semibold" title={data.url || data.webhook_url || (type === 'webhook_trigger' ? `/api/v1/webhooks/flows/${id}` : type === 'n8n' ? 'n8n Webhook URL' : type === 'zapier' ? 'Zapier Hook URL' : 'API Endpoint')}>
                {data.url || data.webhook_url || (type === 'webhook_trigger' ? `/api/v1/webhooks/...` : type === 'n8n' ? 'n8n Webhook' : type === 'zapier' ? 'Zapier Hook' : t('apiEndpoint') || 'API Endpoint')}
              </span>
            </div>

            {Array.isArray(data.variable_mappings) && data.variable_mappings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {data.variable_mappings.slice(0, 2).map((m: any, idx: number) => (
                  <span key={idx} className="inline-flex items-center text-[7.5px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-1 py-0.5 rounded">
                    {`{{ ${m.variableName || m.variable_name} }}`}
                  </span>
                ))}
                {data.variable_mappings.length > 2 && (
                  <span className="text-[7.5px] font-bold text-zinc-400 self-center">
                    +{data.variable_mappings.length - 2}
                  </span>
                )}
              </div>
            )}
            {data.saveKey && (
              <div className="flex items-center gap-1 text-[8.5px] pl-1 mt-0.5">
                <span className="text-zinc-400 font-bold uppercase text-[7.5px]">{t('saveResponse') || 'Save Response'}:</span>
                <span className="text-sky-600 font-mono font-bold">{`{{ ${data.saveKey} }}`}</span>
              </div>
            )}
          </div>
        )}
        {type === 'rag_query' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8.5px]">
              <span className="text-zinc-400 font-bold uppercase text-[7.5px]">Execution Mode:</span>
              <span className="font-extrabold uppercase tracking-tight text-[7.5px] px-1.5 py-0.5 rounded-[3px] bg-zinc-100 border border-[#E8E8E6] text-zinc-800">
                {data.mode === 'single' ? 'Single Answer' : 'Continuous Loop'}
              </span>
            </div>

            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-md p-2 shadow-3xs">
              <p className="text-[9.5px] text-zinc-700 font-medium leading-relaxed">
                {data.mode === 'single'
                  ? 'Answers incoming query once and advances to next node.'
                  : (data.exit_keywords
                      ? `Exits on: ${data.exit_keywords.split(',').slice(0, 3).map((k: string) => k.trim()).join(', ')}${data.exit_keywords.split(',').length > 3 ? '...' : ''}`
                      : 'Answers repeatedly until customer sends exit keyword.')}
              </p>
            </div>

            {data.saveKey && (
              <div className="flex items-center gap-1 text-[8.5px] pl-0.5">
                <span className="text-zinc-400 font-bold uppercase text-[7.5px]">{t('saveResponse') || 'Save'}:</span>
                <span className="text-zinc-800 font-mono font-bold text-[8.5px]">{`{{ ${data.saveKey} }}`}</span>
              </div>
            )}
          </div>
        )}
        {type === 'end_flow' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('goodbyeMessage') || 'Goodbye Message'}</span>
            <p className="text-[10px] text-zinc-700 font-semibold leading-relaxed line-clamp-3">
              {data.body || (t('noMessageConfigured') || 'No message configured. Exits flow immediately.')}
            </p>
          </div>
        )}
        {type === 'create_deal' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between shadow-3xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('crmDealValue') || 'CRM Deal Value'}</p>
              <p className="text-xs font-black text-orange-600 truncate mt-0.5">
                {data.value || data.dealValue ? `$${Number(data.value || data.dealValue).toLocaleString()}` : '$0.00'}
              </p>
            </div>
            <Briefcase className="h-4 w-4 text-orange-500 shrink-0" />
          </div>
        )}
        {type === 'create_appointment' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1.5 shadow-3xs">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">
                  {data.calendarProvider === 'google_calendar' ? (t('googleCalendar') || 'Google Calendar') : (t('whatsomniCalendar') || 'WhatsOmni Calendar')}
                </p>
                <p className="text-[10px] font-black text-indigo-600 mt-0.5">
                  {data.bookingDuration || '30'} {t('minsSlot') || 'mins slot'}
                </p>
              </div>
              <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
            
            {(data.dateVariable || data.timeVariable) && (
              <div className="flex flex-col gap-1 border-t border-[#E8E8E6]/60 pt-1.5 mt-0.5">
                {data.dateVariable && (
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-400 font-bold uppercase">
                    <span>{t('date') || 'Date'}:</span>
                    <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-mono font-bold max-w-[90px] truncate">
                      {data.dateVariable}
                    </span>
                  </div>
                )}
                {data.timeVariable && (
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-400 font-bold uppercase">
                    <span>{t('time') || 'Time'}:</span>
                    <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-mono font-bold max-w-[90px] truncate">
                      {data.timeVariable}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {type === 'ask_question' && (
          <div className="flex flex-col gap-1.5">
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[72px] overflow-y-auto">
              {(data.question || data.questionText || data.body) ? renderTextWithVariables(data.question || data.questionText || data.body) : <span className="text-blue-400">{t('composeQuestion') || 'Compose question...'}</span>}
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-[#E8E8E6] rounded-md p-1.5 shadow-3xs">
              <span className="text-zinc-400 font-bold uppercase text-[7.5px] shrink-0">{t('storeReply') || 'Store Reply'}:</span>
              <span className="font-bold text-zinc-800 bg-[#F0F0EE] border border-[#E8E8E6] px-1.5 py-0.5 rounded-[4px] text-[8.5px] truncate flex-1 font-mono">
                {data.saveVariableLabel || data.saveVariable || (t('selectVariable') || 'Select Variable')}
              </span>
            </div>
          </div>
        )}
        {type === 'send_template' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('selectTemplate') || 'Template'}</span>
            <p className="text-[10px] font-bold text-sky-700 truncate">
              {data.templateName || (t('chooseTemplate') || 'Select pre-approved template')}
            </p>
          </div>
        )}
        {type === 'outbound_campaign' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Outbound Broadcast</span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between shadow-3xs">
              <span className="text-[9.5px] font-bold text-zinc-850 truncate max-w-[120px]">
                Mass Outbound Trigger
              </span>
              <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 rounded shrink-0">{t('triggerLabel') || 'Trigger'}</span>
            </div>
          </div>
        )}
        {type === 'ecommerceCheckoutAbandoned' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Cart Abandonment</span>
            </div>
            <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between shadow-3xs">
              <span className="text-[9.5px] font-bold text-zinc-850 truncate max-w-[120px]">
                Shopify / WooCommerce
              </span>
              <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 rounded shrink-0">{t('triggerLabel') || 'Trigger'}</span>
            </div>
          </div>
        )}
        {type === 'checkCartStatus' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('cartPropertyLabel') || 'Cart Property'}</span>
            <p className="text-[10px] font-bold text-zinc-800">
              {data.cartProperty === 'items_count' ? (t('itemsCount') || 'Item Count') : (t('totalPrice') || 'Total Price')}{' '}
              {data.operator === 'lt' ? '<' : data.operator === 'eq' ? '=' : '>'}{' '}
              {data.value !== undefined ? data.value : 100}
            </p>
          </div>
        )}
        {type === 'generateDiscountCode' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{t('discountCodeLabel') || 'Discount Code'}</span>
            <p className="text-[10px] font-bold text-emerald-700 font-mono">
              {data.codePrefix || 'SAVE'}-XXXX ({data.discountValue || 15}{data.discountType === 'fixed_amount' ? '$' : '%'})
            </p>
          </div>
        )}
        {type === 'search_product' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Search Catalog</span>
            <p className="text-[10px] font-bold text-emerald-700 truncate font-mono">
              {data.query || '{{last_message}}'}
            </p>
            <div className="flex items-center justify-between text-[9px] text-zinc-400 font-medium">
              <span>Limit: {data.limit || 3} items</span>
              {data.in_stock_only && <span className="text-emerald-600 font-bold">In-Stock Only</span>}
            </div>
          </div>
        )}
        {type === 'get_product' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Product Lookup</span>
            <p className="text-[10px] font-bold text-teal-700 truncate">
              {data.product_title || data.product_id || data.sku || '{{product_id}}'}
            </p>
          </div>
        )}
        {type === 'send_product' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Product Showcase</span>
            <p className="text-[10px] font-bold text-blue-700 truncate">
              {data.product_title || (data.product_id ? `Product: ${data.product_id}` : 'Dynamic {{product_title}}')}
            </p>
            {data.caption && (
              <p className="text-[9px] text-zinc-500 line-clamp-1 italic">
                {data.caption}
              </p>
            )}
          </div>
        )}
        {type === 'check_stock' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Stock Verification</span>
            <p className="text-[10px] font-bold text-amber-700 truncate">
              {data.operator === 'out_of_stock'
                ? 'Check Out of Stock (≤ 0)'
                : data.operator === 'gte'
                ? `Stock ≥ ${data.threshold || 1}`
                : 'In Stock (> 0)'}
            </p>
          </div>
        )}
        {type === 'send_checkout_link' && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-2.5 flex flex-col gap-1 shadow-3xs">
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Checkout Dispatch</span>
            <p className="text-[10px] font-bold text-purple-700 truncate">
              {data.link_type === 'abandoned_cart' ? 'Abandoned Cart Recovery' : data.link_type === 'product_url' ? 'Product Store URL' : 'Direct Cart Checkout'}
            </p>
            {data.discount_code && (
              <span className="text-[9px] text-emerald-600 font-mono font-bold">
                Promo: {data.discount_code}
              </span>
            )}
          </div>
        )}
        {type === 'interactive_menu' && (
          <div className="flex flex-col gap-1.5">
            <div className="bg-emerald-50/60 border border-emerald-100 text-emerald-900 text-[9.5px] p-2.5 rounded-lg rounded-tl-none font-medium leading-normal shadow-3xs max-h-[80px] overflow-y-auto">
              {data.body ? renderTextWithVariables(data.body) : <span className="text-emerald-500 italic">{t('composeMenuBody') || 'Please select an option from the menu below:'}</span>}
            </div>
          </div>
        )}
        {!['send_message', 'send_template', 'whatsapp_flow', 'send_whatsapp_flow', 'wait_delay', 'tag_contact', 'inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'checkCartStatus', 'generateDiscountCode', 'search_product', 'get_product', 'send_product', 'check_stock', 'send_checkout_link', 'ai_condition', 'webhook_dispatch', 'n8n', 'zapier', 'rag_query', 'create_deal', 'create_appointment', 'human_handoff', 'ask_question', 'interactive_menu', 'end_flow'].includes(type) && (
          <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-[8px] p-2.5 text-[10px] text-zinc-500 font-medium italic truncate shadow-3xs">
            {t('readyToRun') || 'Ready to run'}
          </div>
        )}
      </div>

      {/* INPUT HANDLE (Except Triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          isConnectable={true}
          className="rounded-full shadow-3xs cursor-pointer z-50 transition-all hover:scale-120 animate-fade-in shrink-0 !left-[-5px] !top-1/2 !-translate-y-1/2 !translate-x-0"
          style={{ 
            left: '-5px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '10px', 
            height: '10px', 
            backgroundColor: '#4AE54A',
            border: '2px solid #FFFFFF',
            boxShadow: '0 0 0 0.5px #C8C8C6'
          }}
        />
      )}

      {/* Single Output Handle */}
      {outPorts.length === 1 && (
        <Handle
          type="source"
          position={Position.Right}
          id={outPorts[0].id}
          isConnectable={true}
          className="rounded-full shadow-3xs cursor-pointer z-50 transition-all hover:scale-120 shrink-0 !right-[-5px] !top-1/2 !-translate-y-1/2 !translate-x-0"
          style={{ 
            right: '-5px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '10px', 
            height: '10px', 
            backgroundColor: '#4AE54A',
            border: '2px solid #FFFFFF',
            boxShadow: '0 0 0 0.5px #C8C8C6'
          }}
        />
      )}

      {/* Multiple Outputs List Rows */}
      {outPorts.length > 1 && (
        <div className="border-t border-[#E8E8E6] bg-[#FAFAFA]/30 rounded-b-xl divide-y divide-[#E8E8E6] select-none">
          {outPorts.map((port, idx) => {
            const isLast = idx === outPorts.length - 1;
            return (
              <div 
                key={port.id} 
                className={`relative flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50/50 transition-colors select-none ${isLast ? 'rounded-b-xl' : ''}`}
              >
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className={`h-1.5 w-1.5 rounded-full ${port.colorClass || 'bg-zinc-400'}`} />
                  <span className="text-[9.5px] uppercase tracking-wider text-zinc-700 font-bold font-sans">
                    {port.label}
                  </span>
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.id}
                  isConnectable={true}
                  className="rounded-full shadow-3xs cursor-pointer z-50 transition-all hover:scale-120 shrink-0 !right-[-5px] !top-1/2 !-translate-y-1/2 !translate-x-0"
                  style={{ 
                    right: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#4AE54A',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 0 0 0.5px #C8C8C6'
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
