/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState, useRef, useTransition, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DesktopSafeguardBanner from '@/components/ui/DesktopSafeguardBanner';

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
  ArrowLeft,
  Save,
  Rocket,
  RotateCcw,
  RotateCw,
  Terminal,
  RefreshCw,
  X,
  Square,
  User,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  GripVertical,
  ShoppingCart,
  Percent,
  Megaphone,
  Info,
  CheckCircle2,
  Plus,
  Workflow,
  Zap,
  Lock,
  ListFilter,
  Edit3,
  Check,
  Radio,
  Activity,
  FormInput,
  Search,
  Package,
  ShoppingBag,
  Boxes,
  CreditCard
} from 'lucide-react';

const getChannelIcon = (type: string) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('whatsapp') || normalized.includes('baileys')) return '/channels/whatsapp.webp';
  if (normalized.includes('telegram')) return '/channels/telegram.webp';
  if (normalized.includes('messenger') || normalized.includes('facebook')) return '/channels/messenger.webp';
  if (normalized.includes('instagram')) return '/channels/instagram.svg';
  if (normalized.includes('twilio') || normalized.includes('vonage') || normalized.includes('plivo') || normalized.includes('sms')) return '/channels/sms.svg';
  if (normalized.includes('email') || normalized.includes('smtp') || normalized.includes('resend')) return '/channels/email.svg';
  return '/channels/whatsapp.webp';
};

import { useFlowStore } from '../../store/useFlowStore';
import { FlowBuilderNode, getCategoryDetails, OUT_PORTS, getNodeOutPorts } from './FlowBuilderNode';
import dynamic from 'next/dynamic';

const FlowPropertiesPanel = dynamic(
  () => import('./FlowPropertiesPanel').then((mod) => mod.FlowPropertiesPanel),
  { ssr: false }
);
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { DropdownSelect } from '@/components/ui/dropdown-select';

// Custom node mapping
const nodeTypes = {
  inbound_message: FlowBuilderNode,
  outbound_campaign: FlowBuilderNode,
  webhook_trigger: FlowBuilderNode,
  contact_created: FlowBuilderNode,
  deal_updated: FlowBuilderNode,
  manual: FlowBuilderNode,
  send_message: FlowBuilderNode,
  send_template: FlowBuilderNode,
  whatsapp_flow: FlowBuilderNode,
  send_whatsapp_flow: FlowBuilderNode,
  ask_question: FlowBuilderNode,
  interactive_menu: FlowBuilderNode,
  condition: FlowBuilderNode,
  ai_condition: FlowBuilderNode,
  wait_delay: FlowBuilderNode,
  tag_contact: FlowBuilderNode,
  update_contact: FlowBuilderNode,
  create_deal: FlowBuilderNode,
  create_appointment: FlowBuilderNode,
  human_handoff: FlowBuilderNode,
  webhook_dispatch: FlowBuilderNode,
  n8n: FlowBuilderNode,
  zapier: FlowBuilderNode,
  rag_query: FlowBuilderNode,
  end_flow: FlowBuilderNode,
  ecommerceCheckoutAbandoned: FlowBuilderNode,
  checkCartStatus: FlowBuilderNode,
  generateDiscountCode: FlowBuilderNode,
  search_product: FlowBuilderNode,
  get_product: FlowBuilderNode,
  send_product: FlowBuilderNode,
  check_stock: FlowBuilderNode,
  send_checkout_link: FlowBuilderNode,
};

// Draggable Accordion items definition (Trigger nodes are configured via root trigger node in Properties Panel)
const CATALOG_GROUPS = [
  {
    name: 'Communication',
    items: [
      { type: 'send_message', label: 'Send Message', desc: 'Send text or media templates to contact', icon: MessageSquare, color: 'bg-blue-500' },
      { type: 'send_template', label: 'Send Template', desc: 'Send pre-approved official Meta templates', icon: MessageSquare, color: 'bg-blue-500' },
      { type: 'whatsapp_flow', label: 'WhatsApp Flow Form', desc: 'Send interactive native WhatsApp form & collect responses', icon: FormInput, color: 'bg-emerald-600' },
      { type: 'ask_question', label: 'Ask Question', desc: 'Send a question and save contact reply in a variable', icon: HelpCircle, color: 'bg-blue-500' },
      { type: 'interactive_menu', label: 'Interactive Menu', desc: 'Send interactive choices & branch flow by selection', icon: ListFilter, color: 'bg-emerald-500' },
    ]
  },
  {
    name: 'Logic & Flow',
    items: [
      { type: 'condition', label: 'Condition Branch', desc: 'Branch outcomes matching tags or fields', icon: GitBranch, color: 'bg-amber-500' },
      { type: 'wait_delay', label: 'Delay & Wait', desc: 'Add duration pauses or wait for messages', icon: Hourglass, color: 'bg-zinc-500' },
      { type: 'end_flow', label: 'End Session', desc: 'Send a final message and exit execution', icon: Square, color: 'bg-red-500' },
    ]
  },
  {
    name: 'E-Commerce',
    items: [
      { type: 'search_product', label: 'Search Product', desc: 'Search catalog by keyword or customer reply', icon: Search, color: 'bg-emerald-600' },
      { type: 'get_product', label: 'Get Product', desc: 'Fetch product & variant details by ID or SKU', icon: Package, color: 'bg-teal-600' },
      { type: 'send_product', label: 'Send Product', desc: 'Send product showcase card with image & link', icon: ShoppingBag, color: 'bg-blue-600' },
      { type: 'check_stock', label: 'Check Stock', desc: 'Verify product inventory level before ordering', icon: Boxes, color: 'bg-amber-600' },
      { type: 'send_checkout_link', label: 'Send Checkout Link', desc: 'Generate & send direct checkout or recovery link', icon: CreditCard, color: 'bg-purple-600' },
      { type: 'checkCartStatus', label: 'Check Cart Status', desc: 'Evaluate abandoned checkout properties', icon: ShoppingCart, color: 'bg-amber-500' },
      { type: 'generateDiscountCode', label: 'Generate Discount', desc: 'Generate a dynamic checkout discount code', icon: Percent, color: 'bg-green-500' },
    ]
  },
  {
    name: 'AI Assistants',
    items: [
      { type: 'ai_condition', label: 'AI Conditional', desc: 'Binary Yes/No classification using LLM', icon: Sparkles, color: 'bg-purple-500' },
      { type: 'rag_query', label: 'RAG Knowledgebase', desc: 'Answer user queries using AI and knowledgebase vectors', icon: Database, color: 'bg-purple-500' },
    ]
  },
  {
    name: 'CRM Actions',
    items: [
      { type: 'tag_contact', label: 'Tag Contact', desc: 'Add or remove tagging labels on profile', icon: Tag, color: 'bg-teal-500' },
      { type: 'update_contact', label: 'Update Contact', desc: 'Modify system fields or custom profiles', icon: FileEdit, color: 'bg-teal-500' },
      { type: 'create_deal', label: 'Create CRM Deal', desc: 'Insert deal card into sales pipelines', icon: Briefcase, color: 'bg-orange-500' },
      { type: 'create_appointment', label: 'Book Appointment', desc: 'Schedule booking in built-in calendar', icon: Calendar, color: 'bg-indigo-500' },
      { type: 'human_handoff', label: 'Human Handoff', desc: 'Halt bots and transfer to live operators', icon: UserCheck, color: 'bg-rose-500' },
    ]
  },
  {
    name: 'Integrations',
    items: [
      { type: 'n8n', label: 'n8n Workflow', desc: 'Trigger n8n webhook workflow with flow data', icon: Workflow, color: 'bg-[#EA4B71]' },
      { type: 'zapier', label: 'Zapier Hook', desc: 'Send data instantly to Zapier Catch Hook', icon: Zap, color: 'bg-[#FF4A00]' },
      { type: 'webhook_dispatch', label: 'Webhook Outflow', desc: 'Trigger external APIs using JSON payloads', icon: Webhook, color: 'bg-sky-500' },
    ]
  }
];


export default function FlowBuilderPageWrapper() {
  return (
    <ReactFlowProvider>
      <FlowBuilderEditor />
    </ReactFlowProvider>
  );
}

function FlowBuilderEditor() {
  const t = useTranslations('Flows');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const flowId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [triggerType, setTriggerType] = useState('inbound_message');
  const [channelType, setChannelType] = useState('omnichannel');
  const [attachedChannels, setAttachedChannels] = useState<any[]>([]);
  const [allChannels, setAllChannels] = useState<any[]>([]);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [flowCredits, setFlowCredits] = useState<{ remaining_credits: number; max_credits: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Zustand Store variables
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const onNodesChange = useFlowStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
  const onConnect = useFlowStore((state) => state.onConnect);
  const onReconnect = useFlowStore((state) => state.onReconnect);
  const initFlow = useFlowStore((state) => state.initFlow);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId);
  const addNode = useFlowStore((state) => state.addNode);
  const undo = useFlowStore((state) => state.undo);
  const redo = useFlowStore((state) => state.redo);
  const saveStateToHistory = useFlowStore((state) => state.saveStateToHistory);
  const validateFlow = useFlowStore((state) => state.validateFlow);
  const clearErrors = useFlowStore((state) => state.clearErrors);
  const storeErrors = useFlowStore((state) => state.errors);
  const setAIConfig = useFlowStore((state) => state.setAIConfig);
  const isEcommerceConnected = useFlowStore((state) => state.isEcommerceConnected);
  const setIsEcommerceConnected = useFlowStore((state) => state.setIsEcommerceConnected);

  const { fitView } = useReactFlow();

  // Professional Sequential Auto-Arrange Layout Algorithm
  const arrangeNodes = (customNodes?: any[], customEdges?: any[], silent: boolean = false) => {
    const safeCustomNodes = Array.isArray(customNodes) ? customNodes : undefined;
    const safeCustomEdges = Array.isArray(customEdges) ? customEdges : undefined;
    const sourceNodes = safeCustomNodes || useFlowStore.getState().nodes;
    const sourceEdges = safeCustomEdges || useFlowStore.getState().edges;
    if (!sourceNodes || sourceNodes.length === 0) return;

    // 1. Build adjacency maps with handle order tracking
    const outEdges: Record<string, { target: string; handle: string }[]> = {};
    const inEdges: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    sourceNodes.forEach((n) => {
      outEdges[n.id] = [];
      inEdges[n.id] = [];
      inDegree[n.id] = 0;
    });

    sourceEdges.forEach((e) => {
      if (outEdges[e.source]) {
        outEdges[e.source].push({ target: e.target, handle: e.sourceHandle || 'out' });
      }
      if (inEdges[e.target]) {
        inEdges[e.target].push(e.source);
      }
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target]++;
      }
    });

    // 2. Identify root nodes (in-degree === 0 or trigger nodes)
    let roots = sourceNodes.filter((n) => inDegree[n.id] === 0 || ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'contact_created', 'deal_updated', 'manual', 'ecommerceCheckoutAbandoned'].includes(n.type || '')).map((n) => n.id);
    if (roots.length === 0 && sourceNodes.length > 0) {
      roots = [sourceNodes[0].id];
    }

    // 3. Compute levels (X coordinate columns)
    const levels: Record<string, number> = {};
    const queue: string[] = [...roots];
    roots.forEach((r) => {
      levels[r] = 0;
    });

    const visitedLevels = new Set<string>();
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visitedLevels.has(curr)) continue;
      visitedLevels.add(curr);

      const currLevel = levels[curr] || 0;
      (outEdges[curr] || []).forEach((edge) => {
        const target = edge.target;
        levels[target] = Math.max(levels[target] || 0, currLevel + 1);
        queue.push(target);
      });
    }

    // Assign level 0 for any unvisited nodes
    sourceNodes.forEach((n) => {
      if (levels[n.id] === undefined) {
        levels[n.id] = 0;
      }
    });

    // 4. Compute Y positions based on parent positions & branch offsets
    const positions: Record<string, { x: number; y: number }> = {};
    const horizSpacing = 360; // Clean horizontal gap
    const vertSpacing = 160;  // Clean vertical gap
    const startX = 100;
    const startY = 250;

    // Place roots
    roots.forEach((r, idx) => {
      positions[r] = { x: startX, y: startY + idx * 240 };
    });

    // Process nodes column by column
    const maxLevel = Math.max(...Object.values(levels));
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const levelNodeIds = sourceNodes.filter((n) => levels[n.id] === lvl).map((n) => n.id);

      levelNodeIds.forEach((nodeId) => {
        // If position not set yet, compute based on parents
        if (!positions[nodeId]) {
          const parents = inEdges[nodeId] || [];
          const parentPositions = parents.map((pId) => positions[pId]).filter(Boolean);

          if (parentPositions.length > 0) {
            // Average Y of parents for smooth convergence
            const avgY = parentPositions.reduce((acc, p) => acc + p.y, 0) / parentPositions.length;
            positions[nodeId] = { x: lvl * horizSpacing + startX, y: avgY };
          } else {
            positions[nodeId] = { x: lvl * horizSpacing + startX, y: startY };
          }
        }

        // Now calculate offsets for children of this node
        const children = outEdges[nodeId] || [];
        if (children.length === 1) {
          const childId = children[0].target;
          if (levels[childId] === lvl + 1 && !positions[childId]) {
            positions[childId] = { x: (lvl + 1) * horizSpacing + startX, y: positions[nodeId].y };
          }
        } else if (children.length > 1) {
          // Multi-branch node (e.g. yes/no, scheduled/unavailable/error)
          const totalHeight = (children.length - 1) * vertSpacing;
          const startBranchY = positions[nodeId].y - totalHeight / 2;

          children.forEach((childEdge, bIdx) => {
            const childId = childEdge.target;
            if (levels[childId] === lvl + 1 && !positions[childId]) {
              positions[childId] = {
                x: (lvl + 1) * horizSpacing + startX,
                y: startBranchY + bIdx * vertSpacing
              };
            }
          });
        }
      });

      // Prevent Y overlap within the same level
      const placedInLevel = levelNodeIds.map((id) => ({ id, pos: positions[id] })).filter((item) => item.pos);
      placedInLevel.sort((a, b) => a.pos.y - b.pos.y);

      for (let i = 1; i < placedInLevel.length; i++) {
        const prev = placedInLevel[i - 1].pos;
        const curr = placedInLevel[i].pos;
        if (curr.y < prev.y + vertSpacing) {
          curr.y = prev.y + vertSpacing;
        }
      }
    }

    // 5. Update nodes with clean new positions
    const newNodes = sourceNodes.map((node) => {
      const pos = positions[node.id] || { x: (levels[node.id] || 0) * horizSpacing + startX, y: startY };
      return {
        ...node,
        position: { x: Math.round(pos.x), y: Math.round(pos.y) },
      };
    });

    setNodes(newNodes);
    if (customEdges) {
      setEdges(customEdges);
    }
    saveStateToHistory();
    if (!silent) {
      toast.success(t('toasts.autoArrangeSuccess'));
    }
    setTimeout(() => {
      try {
        fitView({ padding: 0.25, duration: 400 });
      } catch {
        // Ignored
      }
    }, 80);
  };

  // Left Accordion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Communication': true,
    'Logic & Flow': true,
    'E-Commerce': true,
    'AI Assistants': true,
    'CRM Actions': true,
    'Integrations': true,
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Simulator Drawer State
  const [simOpen, setSimOpen] = useState(false);
  const [simContacts, setSimContacts] = useState<any[]>([]);
  const [simContactId, setSimContactId] = useState<string>('');
  const [simMessageInput, setSimMessageInput] = useState<string>('');
  const [simRunning, setSimRunning] = useState(false);
  const [simLogs, setSimLogs] = useState<any[]>([]);
  const [simSentMessages, setSimSentMessages] = useState<any[]>([]);
  const [simVariables, setSimVariables] = useState<Record<string, any>>({});
  const [simError, setSimError] = useState<string | null>(null);

  // Highlight traversed steps on simulation complete
  const [traversedNodeIds, setTraversedNodeIds] = useState<string[]>([]);

  // Drag & drop reference coordinates
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const setTranslator = useFlowStore((state) => state.setTranslator);

  useEffect(() => {
    setTranslator(t);
  }, [t, setTranslator]);

  useEffect(() => {
    setMounted(true);
    loadFlowDetails();
    loadContactsForSimulator();
    loadAIConfig();
    loadEcommerceStatus();
    loadFlowCredits();
  }, [flowId]);

  const loadFlowCredits = async () => {
    try {
      const res = await fetchWithCsrf('/flows/flow-credits');
      if (res.ok) {
        const data = await res.json();
        setFlowCredits({ remaining_credits: data.remaining_credits, max_credits: data.max_credits });
      }
    } catch (e) {}
  };

  const loadFlowDetails = async () => {
    try {
      const [flowRes, channelsRes] = await Promise.all([
        fetchWithCsrf(`/flows/${flowId}`),
        fetchWithCsrf('/channels')
      ]);

      if (channelsRes.ok) {
        const chanData = await channelsRes.json();
        const rawList = Array.isArray(chanData) ? chanData : (chanData.connections || chanData.data || []);
        const filtered = rawList.filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const type = (c.channel_type || '').toLowerCase();
          return !name.includes('mock') && !name.includes('simulated') && type !== 'mock';
        });
        setAllChannels(filtered);
      }

      if (flowRes.ok) {
        const data = await flowRes.json();
        setFlowName(data.name?.trim() || 'Untitled Flow');
        setTriggerType(data.trigger_type || 'inbound_message');
        setChannelType(data.channel_type || 'omnichannel');
        setIsActive(data.is_active);
        setAttachedChannels(data.channels || []);

        // Load latest version definition if exists, else init default trigger node
        const latestVer = data.versions?.[0];
        const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
        const TRIGGER_TITLES: Record<string, string> = {
          inbound_message: 'Inbound Message',
          outbound_campaign: 'Outbound Broadcast',
          webhook_trigger: 'API Webhook',
          ecommerceCheckoutAbandoned: 'Checkout Abandoned',
          contact_created: 'Contact Created Event',
          deal_updated: 'Deal Stage Updated',
          manual: 'Manual Inbound Trigger',
        };
        const effectiveTriggerType = data.trigger_type || 'inbound_message';
        const effectiveTriggerTitle = TRIGGER_TITLES[effectiveTriggerType] || 'Start Trigger';
        
        if (latestVer && latestVer.definition) {
          let nodesList: any[] = latestVer.definition.nodes || [];
          const rootTriggerIndex = nodesList.findIndex((n: any) => TRIGGER_TYPES.includes(n.type) || n.id === 'trigger_1' || n.data?.is_root_trigger);
          
          if (rootTriggerIndex === -1) {
            nodesList = [
              {
                id: 'trigger_1',
                type: effectiveTriggerType,
                position: { x: 250, y: 150 },
                deletable: false,
                data: {
                  title: effectiveTriggerTitle,
                  description: 'Starting root trigger for flow',
                  is_root_trigger: true,
                }
              },
              ...nodesList
            ];
          } else {
            nodesList = nodesList.map((node: any, idx: number) => {
              if (idx === rootTriggerIndex || TRIGGER_TYPES.includes(node.type) || node.id === 'trigger_1') {
                return {
                  ...node,
                  type: effectiveTriggerType,
                  deletable: false,
                  data: {
                    ...node.data,
                    title: effectiveTriggerTitle,
                    is_root_trigger: true,
                  }
                };
              }
              return node;
            });
          }
          initFlow(nodesList, latestVer.definition.edges || []);
        } else {
          initFlow([
            {
              id: 'trigger_1',
              type: effectiveTriggerType,
              position: { x: 250, y: 150 },
              deletable: false,
              data: { 
                title: effectiveTriggerTitle, 
                description: 'Starting root trigger for flow',
                is_root_trigger: true,
              }
            }
          ], []);
        }
      } else {
        toast.error(t('toasts.loadFlowFailed'));
      }
    } catch {
      toast.error(t('toasts.loadFlowNetworkError'));
    }
  };

  const loadContactsForSimulator = async () => {
    try {
      const res = await fetchWithCsrf('/contacts');
      if (res.ok) {
        const data = await res.json();
        const contactList = data.contacts || [];
        setSimContacts(contactList);
        if (contactList.length > 0) {
          setSimContactId(contactList[0].id.toString());
        }
      }
    } catch {
      // Ignored non-blocking
    }
  };

  const loadAIConfig = async () => {
    try {
      const res = await fetchWithCsrf('/settings/ai-providers');
      if (res.ok) {
        const data = await res.json();
        const providersData = data.providers || {};

        const activeProviders: { value: string; label: string }[] = [];
        const activeModels: Record<string, { value: string; label: string }[]> = {};

        Object.entries(providersData).forEach(([slug, provider]: [string, any]) => {
          if (provider.is_configured && provider.is_active) {
            const enabledList = provider.enabled_models || [];
            if (enabledList.length > 0) {
              activeProviders.push({ value: slug, label: provider.name || slug });
              activeModels[slug] = enabledList.map((m: string) => ({
                value: m,
                label: m
              }));
            }
          }
        });

        setAIConfig(activeProviders, activeModels);
      }
    } catch (err) {
      console.error('Failed to load tenant AI providers config', err);
    }
  };

  const loadEcommerceStatus = async () => {
    try {
      const [statusRes, storesRes] = await Promise.all([
        fetchWithCsrf('/integrations/ecommerce/status'),
        fetchWithCsrf('/ecommerce/stores'),
      ]);
      let isConnected = false;
      if (statusRes.ok) {
        const data = await statusRes.json();
        const list = Array.isArray(data) ? data : (data?.connections || data?.data || []);
        isConnected = list.some((c: any) => (c.status === 'active' || c.status === 'connected') && ['shopify', 'woocommerce'].includes(c.platform || c.provider)) || list.length > 0;
      }
      if (!isConnected && storesRes.ok) {
        const storesData = await storesRes.json();
        const storesList = Array.isArray(storesData) ? storesData : (storesData?.connections || storesData?.data || []);
        isConnected = storesList.length > 0;
      }
      setIsEcommerceConnected(isConnected);
    } catch {
      setIsEcommerceConnected(false);
    }
  };

  // Keyboard undo/redo listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        toast.success(t('toasts.undoAction'));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        toast.success(t('toasts.redoAction'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, t]);

  // Listen for Copilot Flow Apply from FloatingCopilot or external trigger
  useEffect(() => {
    const handleCopilotApply = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const flowNodes = detail.nodes;
      const flowEdges = detail.edges;
      if (Array.isArray(flowNodes) && flowNodes.length > 0) {
        initFlow(flowNodes, Array.isArray(flowEdges) ? flowEdges : []);
        if (detail.name && (flowName === 'Workspace Flow' || flowName === 'Untitled Flow' || !flowName)) {
          setFlowName(detail.name);
        }
        arrangeNodes(flowNodes, Array.isArray(flowEdges) ? flowEdges : [], true);
        const actionVerb = detail.mode === 'extend' ? 'extended' : (detail.mode === 'update' ? 'updated' : 'applied');
        toast.success(t('copilotWorkflowApplied', { name: detail.name || flowName || 'Workflow' }) || `Copilot flow applied to canvas!`);
      }
    };

    window.addEventListener('apply-copilot-flow-to-canvas', handleCopilotApply);
    return () => window.removeEventListener('apply-copilot-flow-to-canvas', handleCopilotApply);
  }, [flowName, initFlow, arrangeNodes]);

  // Sync Copilot Open/Close visibility with topbar and canvas panels
  useEffect(() => {
    const handleCopilotVisibility = (e: any) => {
      const open = !!e?.detail?.isOpen;
      setIsCopilotOpen(open);
      if (open) {
        setSelectedNodeId(null);
        setSimOpen(false);
      }
    };

    window.addEventListener('copilot:visibility-changed', handleCopilotVisibility);
    return () => window.removeEventListener('copilot:visibility-changed', handleCopilotVisibility);
  }, [setSelectedNodeId]);

  const isValidConnection = React.useCallback(
    (connection: Connection | Edge) => {
      // Prevent self-connection
      return connection.source !== connection.target;
    },
    []
  );

  const handleSaveDraft = async () => {
    const isValid = validateFlow();
    if (!isValid) {
      toast.error(t('toasts.canvasValidationErrors'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/flows/${flowId}/versions`, {
          method: 'POST',
          body: JSON.stringify({
            definition: { nodes, edges }
          })
        });

        if (res.ok) {
          toast.success(t('toasts.draftSaved'));
          clearErrors();
        } else {
          toast.error(t('toasts.saveDraftFailed'));
        }
      } catch {
        toast.error(t('toasts.saveDraftNetworkError'));
      }
    });
  };

  const handlePublishFlow = () => {
    // Client-side validation checks
    const isValid = validateFlow();
    if (!isValid) {
      toast.error(t('toasts.publishValidationErrors'));
      return;
    }
    setPublishConfirmOpen(true);
  };

  const executePublishFlow = async () => {
    setPublishConfirmOpen(false);
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/flows/${flowId}/publish`, {
          method: 'POST',
          body: JSON.stringify({
            definition: { nodes, edges }
          })
        });

        if (res.ok) {
          toast.success(t('toasts.flowPublished'));
          setIsActive(true);
          clearErrors();
        } else {
          const err = await res.json();
          toast.error(err.message || 'Publish operation failed.');
        }
      } catch {
        toast.error(t('toasts.publishNetworkError'));
      }
    });
  };

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!reactFlowWrapper.current || !reactFlowInstance) return;

    const type = e.dataTransfer.getData('application/reactflow');
    if (typeof type === 'undefined' || !type) return;

    const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
    if (TRIGGER_TYPES.includes(type)) {
      const existingTrigger = nodes.find((n) => TRIGGER_TYPES.includes(n.type || '') || n.id === 'trigger_1' || (n.data as any)?.is_root_trigger);
      if (existingTrigger) {
        toast.error('This flow already has a starting root trigger.');
        return;
      }
    }

    const ECOMMERCE_NODES = ['checkCartStatus', 'generateDiscountCode', 'search_product', 'get_product', 'send_product', 'check_stock', 'send_checkout_link'];
    if (ECOMMERCE_NODES.includes(type) && !isEcommerceConnected) {
      toast.error('Connect Shopify or WooCommerce in Stores section to use this node.');
      return;
    }

    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    addNode(type, position);
  };

  // Start visual dry-run simulator execution sandbox
  const handleStartSimulation = async () => {
    if (!simContactId) {
      toast.error(t('toasts.selectContactFirst'));
      return;
    }

    setSimRunning(true);
    setSimError(null);
    setSimLogs([]);
    setSimSentMessages([]);
    setSimVariables({});
    setTraversedNodeIds([]);

    try {
      const res = await fetchWithCsrf(`/flows/${flowId}/simulator`, {
        method: 'POST',
        body: JSON.stringify({
          contact_id: parseInt(simContactId),
          definition: { nodes, edges },
          variables: {
            inbound_message_body: simMessageInput,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSimLogs(data.logs || []);
        setSimSentMessages(data.simulated_messages || []);
        setSimVariables(data.variables || {});
        setSimError(data.last_error || null);

        // Map traversed nodes to trigger glowing styles
        const traversedIds = (data.logs || []).map((l: any) => l.node_id);
        setTraversedNodeIds(traversedIds);

        toast.success(t('toasts.simulationSuccess'));
      } else {
        const err = await res.json();
        setSimError(err.message || 'Simulation execution failed.');
      }
    } catch (e: any) {
      setSimError(e.message || 'Connection check failed.');
    } finally {
      setSimRunning(false);
    }
  };

  // Traversed edges highlight matching traversed node pairs
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const srcTraversedIdx = traversedNodeIds.indexOf(edge.source);
      const tgtTraversedIdx = traversedNodeIds.indexOf(edge.target);

      // Edge has been traversed in path sequence
      const isTraversed = srcTraversedIdx !== -1 && tgtTraversedIdx !== -1 && srcTraversedIdx < tgtTraversedIdx;
      const isSelected = !!edge.selected;

      if (isSelected) {
        return {
          ...edge,
          style: { stroke: '#4AE54A', strokeWidth: 3.5 },
          animated: false,
        };
      }

      if (isTraversed) {
        return {
          ...edge,
          style: { stroke: '#10B981', strokeWidth: 3 },
          animated: true,
        };
      }

      return {
        ...edge,
        style: { stroke: '#D4D4D0', strokeWidth: 2.5 },
        animated: false,
      };
    });
  }, [edges, traversedNodeIds]);

  const getLogTypeLabel = (nodeType: string) => {
    const mapping: Record<string, string> = {
      inbound_message: 'Trigger',
      webhook_trigger: 'API Inflow',
      send_message: 'Outbound Chat',
      send_template: 'Send Template',
      whatsapp_flow: 'WhatsApp Flow Form',
      ask_question: 'Ask Question',
      wait_delay: 'Wait Pause',
      condition: 'Branch Logic',
      tag_contact: 'CRM Tag',
      update_contact: 'CRM Update',
      create_deal: 'CRM Deal',
      webhook_dispatch: 'API Call',
      n8n: 'n8n Workflow',
      zapier: 'Zapier Hook',
      rag_query: 'RAG Search'
    };
    return mapping[nodeType] || nodeType.toUpperCase();
  };

  const handleToggleActiveState = async () => {
    try {
      const res = await fetchWithCsrf(`/flows/${flowId}/toggle-active`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Cannot activate flow without a published version.');
      }
      const updated = await res.json();
      setIsActive(updated.is_active);
      toast.success(updated.is_active ? 'Flow activated on connected channels' : 'Flow deactivated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveName = async (nameVal: string) => {
    const clean = nameVal.trim();
    if (!clean) return;
    setFlowName(clean);
    setIsEditingName(false);
    try {
      await fetchWithCsrf(`/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      });
      toast.success('Flow renamed');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleChannelBinding = async (chanId: number) => {
    const isAttached = attachedChannels.some((c) => c.id === chanId);
    const nextIds = isAttached
      ? attachedChannels.filter((c) => c.id !== chanId).map((c) => c.id)
      : [...attachedChannels.map((c) => c.id), chanId];

    try {
      const res = await fetchWithCsrf(`/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_ids: nextIds })
      });
      if (res.ok) {
        const updated = await res.json();
        setAttachedChannels(updated.channels || []);
        toast.success('Channel connections synchronized');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-black select-none font-sans overflow-hidden relative">
      <DesktopSafeguardBanner 
        title="Desktop Recommended for Flow Builder"
        description="The Visual Flow Graph canvas is best experienced with a mouse/trackpad and desktop screen for connecting automation nodes and configuring logic trees."
        backUrl="/flows"
        backLabel="Back to Flows"
      />
      {/* Top Header Controls Panel */}
      <header className="h-14 sm:h-16 border-b border-[#E8E8E6] px-3.5 sm:px-6 flex items-center justify-between bg-white shrink-0 relative z-50 shadow-3xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link 
            href="/flows"
            title="Back to Automation Flows"
            className="p-1.5 -ml-1 text-zinc-400 hover:text-black hover:bg-[#FAFAFA] rounded-md transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Editable Title (Without 'Automation Flows' prefix) */}
          <div className="flex items-center">
            {isEditingName ? (
              <input
                type="text"
                autoFocus
                defaultValue={flowName}
                onBlur={(e) => handleSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName((e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="h-7 px-2 border border-[#0A0A0A] rounded-[6px] text-xs font-bold text-[#0A0A0A] focus:outline-none bg-white"
              />
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                title="Click to rename flow"
                className="flex items-center gap-1.5 cursor-pointer group"
              >
                <h1 className="font-bold text-xs text-[#0A0A0A] uppercase tracking-wider select-none truncate group-hover:underline">
                  {flowName}
                </h1>
                <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Channel Binding Selector Dropdown */}
          <div className="relative pl-3 border-l border-[#E8E8E6]">
            <button
              type="button"
              onClick={() => setShowChannelDropdown(!showChannelDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer shadow-3xs transition-all"
            >
              {attachedChannels.length > 0 ? (
                <div className="flex items-center -space-x-1">
                  {attachedChannels.slice(0, 3).map((ch) => (
                    <div
                      key={ch.id}
                      className="h-4 w-4 rounded-full bg-white border border-zinc-200 p-0.2 flex items-center justify-center shrink-0"
                    >
                      <Image
                        src={getChannelIcon(ch.channel_type)}
                        alt={ch.name}
                        width={12}
                        height={12}
                        className="rounded-full object-contain"
                      />
                    </div>
                  ))}
                  {attachedChannels.length > 3 && (
                    <span className="text-[9px] text-zinc-500 pl-1.5 font-bold">
                      +{attachedChannels.length - 3}
                    </span>
                  )}
                </div>
              ) : (
                <Radio className="h-3 w-3 text-zinc-400" />
              )}
              <span className="text-[11px]">
                {attachedChannels.length > 0
                  ? t('attachedChannelsCount', { count: attachedChannels.length })
                  : t('omnichannelAll')}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {/* Channels Popup */}
            {showChannelDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowChannelDropdown(false)}
                />
                <div className="absolute left-3 top-full mt-1.5 w-60 bg-white border border-[#E8E8E6] rounded-xl shadow-xl p-3 z-50 animate-modal-box">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">
                    {t('bindChannelsTitle')}
                  </div>
                  {allChannels.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 py-2 text-center">
                      {t('noConnectedChannelsFound')}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {allChannels.map((ch) => {
                        const isAttached = attachedChannels.some((c) => c.id === ch.id);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => handleToggleChannelBinding(ch.id)}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                              isAttached
                                ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                                : 'bg-[#F9F9F8] border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="h-5 w-5 rounded-full bg-white border border-zinc-200 p-0.5 flex items-center justify-center shrink-0">
                                <Image
                                  src={getChannelIcon(ch.channel_type)}
                                  alt={ch.name}
                                  width={14}
                                  height={14}
                                  className="rounded-full object-contain"
                                />
                              </div>
                              <span className="font-semibold truncate text-[11px]">{ch.name}</span>
                            </div>
                            {isAttached && <Check className="h-3.5 w-3.5 text-[#4AE54A] shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Active Switch */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#E8E8E6]">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={handleToggleActiveState}
              title={isActive 
                ? (t.has('deactivateFlowTitle') ? t('deactivateFlowTitle') : 'Deactivate flow') 
                : (t.has('activateFlowTitle') ? t('activateFlowTitle') : 'Activate flow')}
              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                isActive ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
              }`}
            >
              <span
                className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                  isActive ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              {isActive ? t('liveStatus') : t('draftStatus')}
            </span>
          </div>
        </div>

        {/* Action Toggles Strip */}
        <div className="flex items-center gap-2.5">
          {/* Platform Copilot AI Designer Button */}
          <button 
            onClick={() => {
              setSelectedNodeId(null);
              setSimOpen(false);
              window.dispatchEvent(new CustomEvent('toggle-copilot'));
            }}
            className={`relative inline-flex items-center justify-center p-[1px] rounded-[6px] overflow-hidden group cursor-pointer shadow-3xs hover:shadow-[0_0_14px_rgba(74,229,74,0.3)] transition-all duration-300 active:scale-[0.98] ${
              isCopilotOpen ? 'ring-2 ring-zinc-950/20' : ''
            }`}
            title={t('openCopilotTitle') || 'Open Copilot Flow Designer (Generate, Update, Extend)'}
          >
            {/* Continuously Rotating Conic Gradient Animated Border (Green & Light Theme Tones) */}
            <span className="absolute inset-[-250%] animate-border-rotate bg-[conic-gradient(from_0deg_at_50%_50%,#4AE54A_0%,#3DD43D_25%,#E8E8E6_50%,#86EFAC_75%,#4AE54A_100%)] opacity-90 group-hover:opacity-100 transition-opacity" />
            
            {/* Inner Content Surface adhering to design guidelines */}
            <span className={`relative z-10 flex items-center gap-2 h-[34px] px-3.5 rounded-[5px] text-xs font-bold transition-all duration-200 ${
              isCopilotOpen ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900 group-hover:bg-[#FAF9F6]'
            }`}>
              <Sparkles className={`h-3.5 w-3.5 transition-transform duration-300 shrink-0 ${
                isCopilotOpen ? 'text-amber-400 scale-110' : 'text-[#4AE54A] group-hover:scale-110 group-hover:rotate-12'
              }`} />
              <span className="tracking-tight">{t('copilotBtn') || 'Copilot'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                isCopilotOpen ? 'bg-zinc-800 text-amber-300 border border-zinc-700' : 'bg-zinc-100 border border-[#E8E8E6] text-zinc-800 group-hover:border-zinc-300'
              }`}>
                AI
              </span>
            </span>
          </button>

          {/* Simulator Toggle */}
          <button 
            onClick={() => {
              setSimOpen(!simOpen);
              setSelectedNodeId(null);
            }}
            className={`flex items-center gap-1.5 h-9 px-4 rounded-[6px] text-xs font-semibold transition-all cursor-pointer border ${
              simOpen 
                ? 'bg-[#E8FDE8] text-emerald-700 border-[#4AE54A]/30 hover:bg-[#E8FDE8]/80' 
                : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 shadow-3xs bg-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 shrink-0" />
            <span>{t('dryRunSimulator') || 'Simulator'}</span>
          </button>

          {/* Save & Publish */}
          <button 
            onClick={handleSaveDraft}
            disabled={isPending}
            className="flex items-center gap-1.5 h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 text-zinc-400" />
            <span>{t('saveDraft') || 'Save Draft'}</span>
          </button>
          <button 
            onClick={handlePublishFlow}
            disabled={isPending}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>{t('publishLive') || 'Publish Live'}</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Accordion Palette Drawer */}
        <aside className="w-[300px] border-r border-[#E8E8E6] bg-white flex flex-col h-full shrink-0 select-none overflow-y-auto font-sans">
          <div className="px-6 py-5 border-b border-[#E8E8E6] flex flex-col justify-center bg-white shrink-0">
            <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight">{t('nodeElementCatalog') || 'Node Catalog'}</h3>
            <p className="text-[11px] text-[#6B6B6B] font-medium mt-0.5 leading-snug">{t('dragDropBlocksDesc') || 'Drag & drop visual builder canvas blocks.'}</p>
          </div>

          <div className="flex-1 p-5 space-y-6 overflow-y-auto bg-white">
            {CATALOG_GROUPS.map((group) => (
              <div key={group.name} className="space-y-2.5">
                <h4 className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider px-1">
                  {group.name === 'Triggers' ? t('group_triggers') :
                   group.name === 'Communication' ? t('group_communication') :
                   group.name === 'Logic & Flow' ? t('group_logic_flow') :
                   group.name === 'E-Commerce' ? t('group_ecommerce') :
                   group.name === 'AI Assistants' ? t('group_ai_assistants') :
                   group.name === 'CRM Actions' ? t('group_crm_actions') :
                   group.name === 'Integrations' ? t('group_integrations') :
                   group.name}
                </h4>

                <div className="space-y-2">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const cat = getCategoryDetails(item.type);
                    const isEcomNode = ['checkCartStatus', 'generateDiscountCode'].includes(item.type);
                    const isLocked = isEcomNode && !isEcommerceConnected;

                    return (
                      <div 
                        key={item.type}
                        draggable={!isLocked}
                        onDragStart={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                            toast.error(t('connectEcommerceIntegrationError') || 'Connect Shopify or WooCommerce in Settings > Integrations to use this node.');
                            return;
                          }
                          e.dataTransfer.setData('application/reactflow', item.type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => {
                          if (isLocked) {
                            toast.error(t('connectEcommerceIntegrationError') || 'Connect Shopify or WooCommerce in Settings > Integrations to use this node.');
                          }
                        }}
                        className={`relative w-full h-[68px] rounded-lg border border-[#E8E8E6] bg-white hover:bg-[#FAFAFA] ${isLocked ? 'opacity-75 hover:border-amber-400 cursor-not-allowed' : 'hover:border-[#0A0A0A] cursor-grab active:cursor-grabbing'} px-3 py-2.5 select-none transition-all duration-150 shadow-3xs hover:shadow-2xs group/card flex items-center gap-3`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/card:scale-105 shadow-3xs ${cat.badgeClass}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-xs font-bold text-[#0A0A0A] group-hover/card:text-black tracking-tight leading-tight truncate">
                            {t.has(`node_${item.type}_title`) ? t(`node_${item.type}_title`) : item.label}
                          </p>
                          <p className="text-[9.5px] text-[#6B6B6B] font-medium leading-[1.3] line-clamp-2 mt-0.5">
                            {t.has(`node_${item.type}_desc`) ? t(`node_${item.type}_desc`) : item.desc}
                          </p>
                        </div>

                        <div className="shrink-0 text-zinc-300 group-hover/card:text-zinc-600 transition-colors pl-0.5">
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <GripVertical className="h-3.5 w-3.5" />
                          )}
                        </div>

                        {/* Animated Tooltip on Hover when Locked */}
                        {isLocked && (
                          <div className="absolute left-1/2 -top-10 -translate-x-1/2 hidden group-hover/card:flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] text-white text-[9.5px] font-semibold rounded-lg shadow-xl border border-zinc-800 pointer-events-none z-50 whitespace-nowrap animate-fade-in font-sans">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>{t('connectEcommerceIntegrationTooltip') || 'Connect Shopify or WooCommerce first'}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#0A0A0A]"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <div 
          ref={reactFlowWrapper}
          className="flex-1 h-full relative bg-[#F8F8F7]"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA] pointer-events-none">
              <RefreshCw className="h-6 w-6 animate-spin text-zinc-300" />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={styledEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              isValidConnection={isValidConnection}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSimOpen(false);
              }}
              onPaneClick={() => setSelectedNodeId(null)}
              deleteKeyCode={['Backspace', 'Delete']}
              connectionLineStyle={{ stroke: '#D4D4D0', strokeWidth: 2.5 }}
              defaultEdgeOptions={{ style: { stroke: '#D4D4D0', strokeWidth: 2.5 } }}
            >
              <Background color="#D4D4D0" gap={18} size={1} />
              <Controls className="bg-white border border-[#E8E8E6] rounded-[6px] shadow-3xs p-1 gap-1" />
              <Panel position="top-left" className="flex items-center gap-1.5 bg-white border border-[#E8E8E6] rounded-lg shadow-sm p-1.5 z-50 pointer-events-auto">
                <button 
                  onClick={() => arrangeNodes()}
                  className="flex items-center gap-1.5 h-8 px-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-[11px] font-semibold transition-all cursor-pointer bg-white"
                  title="Auto arrange nodes"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t('autoArrange') || 'Auto Arrange'}</span>
                </button>
                <div className="h-4 w-[1px] bg-zinc-200 mx-1" />
                <button 
                  onClick={undo}
                  className="p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-black rounded-[6px] transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8"
                  title="Undo (CMD+Z)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={redo}
                  className="p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-black rounded-[6px] transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8"
                  title="Redo (CMD+Y)"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </Panel>
            </ReactFlow>
          )}


        </div>

        {/* Right configuration sidebars */}
        {selectedNodeId && <FlowPropertiesPanel channelType={channelType} />}

        {/* Simulator Sandbox Drawer */}
        {mounted && simOpen && (
          <div className="w-[380px] border-l border-[#E8E8E6] bg-white flex flex-col h-full shrink-0 select-none animate-slide-in relative z-40 font-sans">
            {/* Drawer Header */}
            <div className="h-16 px-6 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#4AE54A]" />
                <div>
                  <h3 className="text-xs font-black text-black uppercase tracking-wider">{t('dryRunSimulator') || 'Dry-Run Simulator'}</h3>
                  <p className="text-[8.5px] text-[#6B6B6B] font-bold uppercase tracking-widest mt-0.5">{t('sandboxConsole') || 'Sandbox console'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSimOpen(false)}
                className="h-7 w-7 rounded-[6px] flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Config & Console Output */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Contact selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('mockContactProfile') || 'Mock Contact profile'}</label>
                <DropdownSelect 
                  value={simContactId}
                  onChange={setSimContactId}
                  options={simContacts.map(c => ({
                    value: c.id.toString(),
                    label: `${c.first_name || ''} ${c.last_name || ''} (${c.phone || c.email || 'No ID'})`
                  }))}
                />
              </div>

              {/* Message text input (simulates message trigger) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('mockCustomerInputMessage') || 'Mock Customer input message'}</label>
                <input 
                  type="text"
                  value={simMessageInput}
                  onChange={(e) => setSimMessageInput(e.target.value)}
                  placeholder={t('pricingDetailsPlaceholder') || 'e.g. pricing, details'}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-[#A0A0A0] focus:ring-1 focus:ring-black outline-none transition-all font-semibold shadow-3xs"
                />
              </div>

              {/* Run Trigger */}
              <button
                onClick={handleStartSimulation}
                disabled={simRunning || !simContactId}
                className="w-full h-10 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-3xs"
              >
                {simRunning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Terminal className="h-4 w-4 text-[#4AE54A]" />
                )}
                {t('runSimulation') || 'Run Simulation'}</button>

              {/* Error box */}
              {simError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-[10px] leading-relaxed flex gap-2 font-semibold select-none">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>Simulation Error: {simError}</span>
                </div>
              )}

              {/* Logs vertical tree */}
              {simLogs.length > 0 && (
                <div className="space-y-3.5 select-none">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('executionPathSteps') || 'Execution Path steps'}</p>
                  
                  <div className="relative border-l-2 border-zinc-100 pl-4 ml-2.5 space-y-4">
                    {simLogs.map((log, idx) => {
                      const isFailed = log.status === 'failed';
                      
                      return (
                        <div key={idx} className="relative select-none">
                          {/* Dot indicator */}
                          <div className={`absolute left-[-22px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                            isFailed ? 'bg-red-500' : 'bg-[#4AE54A]'
                          }`} />

                          <div>
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider bg-zinc-100 border border-[#E8E8E6] px-1.5 py-0.5 rounded">
                              {getLogTypeLabel(log.node_type)}
                            </span>
                            <p className="text-xs font-bold text-black mt-1 leading-tight">{log.node_title}</p>
                            <p className="text-[9px] text-[#6B6B6B] mt-0.5">
                              Status: <span className={isFailed ? 'text-red-500' : 'text-[#4AE54A] font-bold'}>{log.status}</span> • {log.execution_time_ms}ms
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Messages Sent Preview */}
              {simSentMessages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('simulatedOutboundMessages') || 'Simulated Outbound Messages'}</p>
                  <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-xl p-4 space-y-3">
                    {simSentMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-[9px] text-white shrink-0">
                          AI
                        </div>
                        <div className="bg-white border border-[#E8E8E6] p-2.5 rounded-lg text-[10.5px] leading-relaxed shadow-3xs max-w-[240px]">
                          <p className="font-semibold text-black">{msg.body}</p>
                          {msg.media_url && (
                            <span className="text-[8px] text-[#6B6B6B] block mt-1 underline truncate select-all">{msg.media_url}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      {mounted && publishConfirmOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Rocket className="h-4 w-4 text-[#4AE54A]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('publishFlowLive') || 'Publish Flow Live'}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setPublishConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label={tCommon('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('details.publishConfirm') || t('publishConfirm')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                onClick={executePublishFlow}
                disabled={isPending}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
              >
                {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('publishFlowLive') || 'Publish Flow'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      </div>
    </div>
  );
}
