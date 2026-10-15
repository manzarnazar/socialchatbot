/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState, useRef, useTransition, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
  GitFork,
  Sliders,
  Search,
  Package,
  ShoppingBag,
  Boxes,
  CreditCard
} from 'lucide-react';

import { useFlowStore } from '@/app/[locale]/(panel)/flows/store/useFlowStore';
import { FlowBuilderNode, getCategoryDetails, OUT_PORTS, getNodeOutPorts } from '@/app/[locale]/(panel)/flows/[id]/edit/FlowBuilderNode';
import { FlowPropertiesPanel } from '@/app/[locale]/(panel)/flows/[id]/edit/FlowPropertiesPanel';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
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

// Draggable Accordion items definition matching tenant platform exactly
const CATALOG_GROUPS = [
  {
    name: 'Communication',
    items: [
      { type: 'send_message', label: 'Send Message', desc: 'Send text or media templates to contact', icon: MessageSquare },
      { type: 'send_template', label: 'Send Template', desc: 'Send pre-approved official Meta templates', icon: MessageSquare },
      { type: 'ask_question', label: 'Ask Question', desc: 'Send a question and save contact reply in a variable', icon: HelpCircle },
      { type: 'interactive_menu', label: 'Interactive Menu', desc: 'Send interactive choices & branch flow by selection', icon: ListFilter },
    ]
  },
  {
    name: 'Logic & Flow',
    items: [
      { type: 'condition', label: 'Condition Branch', desc: 'Branch outcomes matching tags or fields', icon: GitBranch },
      { type: 'wait_delay', label: 'Delay & Wait', desc: 'Add duration pauses or wait for messages', icon: Hourglass },
      { type: 'end_flow', label: 'End Session', desc: 'Send a final message and exit execution', icon: Square },
    ]
  },
  {
    name: 'E-Commerce',
    items: [
      { type: 'search_product', label: 'Search Product', desc: 'Search catalog by keyword or customer reply', icon: Search },
      { type: 'get_product', label: 'Get Product', desc: 'Fetch product & variant details by ID or SKU', icon: Package },
      { type: 'send_product', label: 'Send Product', desc: 'Send product showcase card with image & link', icon: ShoppingBag },
      { type: 'check_stock', label: 'Check Stock', desc: 'Verify product inventory level before ordering', icon: Boxes },
      { type: 'send_checkout_link', label: 'Send Checkout Link', desc: 'Generate & send direct checkout or recovery link', icon: CreditCard },
      { type: 'checkCartStatus', label: 'Check Cart Status', desc: 'Evaluate abandoned checkout properties', icon: ShoppingCart },
      { type: 'generateDiscountCode', label: 'Generate Discount', desc: 'Generate a dynamic checkout discount code', icon: Percent },
    ]
  },
  {
    name: 'AI Assistants',
    items: [
      { type: 'ai_condition', label: 'AI Conditional', desc: 'Binary Yes/No classification using LLM', icon: Sparkles },
      { type: 'rag_query', label: 'RAG Knowledgebase', desc: 'Answer user queries using AI and knowledgebase vectors', icon: Database },
    ]
  },
  {
    name: 'CRM Actions',
    items: [
      { type: 'tag_contact', label: 'Tag Contact', desc: 'Add or remove tagging labels on profile', icon: Tag },
      { type: 'update_contact', label: 'Update Contact', desc: 'Modify system fields or custom profiles', icon: FileEdit },
      { type: 'create_deal', label: 'Create CRM Deal', desc: 'Insert deal card into sales pipelines', icon: Briefcase },
      { type: 'create_appointment', label: 'Book Appointment', desc: 'Schedule booking in built-in calendar', icon: Calendar },
      { type: 'human_handoff', label: 'Human Handoff', desc: 'Halt bots and transfer to live operators', icon: UserCheck },
    ]
  },
  {
    name: 'Integrations',
    items: [
      { type: 'n8n', label: 'n8n Workflow', desc: 'Trigger n8n webhook workflow with flow data', icon: Workflow },
      { type: 'zapier', label: 'Zapier Hook', desc: 'Send data instantly to Zapier Catch Hook', icon: Zap },
      { type: 'webhook_dispatch', label: 'Webhook Outflow', desc: 'Trigger external APIs using JSON payloads', icon: Webhook },
    ]
  }
];

const CATEGORIES = [
  'Sales & Growth',
  'Engagement',
  'Bookings',
  'E-Commerce',
  'Customer Support',
  'Marketing',
  'General'
];

const TRIGGER_TYPES = [
  { value: 'inbound_message', label: 'Inbound Message' },
  { value: 'keyword', label: 'Keyword Match' },
  { value: 'ecommerceCheckoutAbandoned', label: 'Abandoned Cart' },
  { value: 'contact_created', label: 'Contact Created' },
  { value: 'deal_updated', label: 'Deal Stage Updated' },
  { value: 'webhook', label: 'API Webhook' },
];

function SuperadminFlowStudioInner() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;
  const t = useTranslations('Flows');

  const {
    nodes,
    edges,
    selectedNodeId,
    historyIndex,
    history,
    errors,
    initFlow,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    addNode,
    deleteNode,
    setSelectedNodeId,
    undo,
    redo,
    validateFlow,
    clearErrors,
    setTranslator
  } = useFlowStore();

  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Template State
  const [template, setTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Metadata Edit Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editSlug, setEditSlug] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTriggerType, setEditTriggerType] = useState('inbound_message');
  const [editTriggerKeywords, setEditTriggerKeywords] = useState('');

  useEffect(() => {
    setTranslator((key: string) => t(key as any));
  }, [t, setTranslator]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/admin/flow-templates/${templateId}`);
      if (!res.ok) throw new Error('Failed to load flow template.');
      const data = await res.json();
      setTemplate(data);
      setTemplateName(data.name);
      setEditSlug(data.slug);
      setEditCategory(data.category);
      setEditDescription(data.description || '');
      setEditTriggerType(data.trigger_type);
      setEditTriggerKeywords(Array.isArray(data.trigger_keywords) ? data.trigger_keywords.join(', ') : '');
      setIsPublished(data.is_published);

      const initialNodes = data.definition?.nodes || [];
      const initialEdges = data.definition?.edges || [];
      initFlow(initialNodes, initialEdges);
    } catch (err: any) {
      toast.error(err.message || 'Error loading template');
    } finally {
      setLoading(false);
    }
  };

  // Styled Edges Matching Tenant Platform Exactly
  const styledEdges = useMemo(() => {
    return edges.map((e) => {
      let strokeColor = '#D4D4D0';
      if (e.sourceHandle === 'true' || e.sourceHandle === 'opt_0') strokeColor = '#10B981';
      else if (e.sourceHandle === 'false' || e.sourceHandle === 'opt_1') strokeColor = '#EF4444';
      else if (e.sourceHandle?.startsWith('opt_')) strokeColor = '#6366F1';

      return {
        ...e,
        style: { ...e.style, stroke: strokeColor, strokeWidth: 2.5 },
      };
    });
  }, [edges]);

  // Sequential Auto-Arrange Layout Algorithm (Exact Tenant Algorithm)
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
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      }
    });

    // 2. Identify root triggers
    const rootNodes = sourceNodes.filter(
      (n) =>
        inDegree[n.id] === 0 ||
        [
          'inbound_message',
          'outbound_campaign',
          'webhook_trigger',
          'contact_created',
          'deal_updated',
          'manual',
          'ecommerceCheckoutAbandoned'
        ].includes(n.type || '')
    );

    const roots = rootNodes.length > 0 ? rootNodes : [sourceNodes[0]];

    // 3. Grid Positioning Parameters
    const HORIZONTAL_SPACING = 340;
    const VERTICAL_SPACING = 160;
    const START_X = 400;
    const START_Y = 60;

    const positions: Record<string, { x: number; y: number }> = {};
    const occupiedSlots = new Set<string>();

    const isSlotFree = (x: number, y: number) => !occupiedSlots.has(`${x},${y}`);
    const occupySlot = (x: number, y: number) => occupiedSlots.add(`${x},${y}`);

    const layoutSubtree = (
      nodeId: string,
      currentX: number,
      currentY: number,
      visitedInBranch: Set<string>
    ) => {
      if (visitedInBranch.has(nodeId)) return;
      visitedInBranch.add(nodeId);

      while (!isSlotFree(currentX, currentY)) {
        currentY += VERTICAL_SPACING;
      }

      positions[nodeId] = { x: currentX, y: currentY };
      occupySlot(currentX, currentY);

      const children = outEdges[nodeId] || [];
      if (children.length === 0) return;

      if (children.length === 1) {
        layoutSubtree(children[0].target, currentX, currentY + VERTICAL_SPACING, visitedInBranch);
      } else {
        const branchWidth = HORIZONTAL_SPACING;
        const totalSpan = (children.length - 1) * branchWidth;
        const startBranchX = currentX - totalSpan / 2;

        children.forEach((child, index) => {
          const childX = Math.round(startBranchX + index * branchWidth);
          const childY = currentY + VERTICAL_SPACING;
          layoutSubtree(child.target, childX, childY, new Set(visitedInBranch));
        });
      }
    };

    const globalVisited = new Set<string>();
    roots.forEach((root, rootIndex) => {
      const rootX = START_X + rootIndex * (HORIZONTAL_SPACING * 2);
      layoutSubtree(root.id, rootX, START_Y, globalVisited);
    });

    // 4. Place any disconnected nodes
    sourceNodes.forEach((n, idx) => {
      if (!positions[n.id]) {
        let discX = START_X + 450;
        let discY = START_Y + idx * VERTICAL_SPACING;
        while (!isSlotFree(discX, discY)) {
          discY += VERTICAL_SPACING;
        }
        positions[n.id] = { x: discX, y: discY };
        occupySlot(discX, discY);
      }
    });

    // 5. Apply positions
    const updatedNodes = sourceNodes.map((n) => ({
      ...n,
      position: positions[n.id] || n.position,
    }));

    setNodes(updatedNodes);

    if (!silent) {
      toast.success('Nodes auto-aligned sequentially!');
      setTimeout(() => {
        if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
      }, 50);
    }
  };

  const handleSaveName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }
    setTemplateName(trimmed);
    setIsEditingName(false);
  };

  const handleSaveFlow = async (publish: boolean = false) => {
    const isValid = validateFlow();
    if (!isValid && publish) {
      toast.error('Please resolve validation errors before publishing.');
      return;
    }

    if (publish) setPublishing(true);
    else setSaving(true);

    try {
      const keywordsArray = editTriggerKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const payload = {
        name: templateName.trim() || template.name,
        slug: editSlug.trim() || template.slug,
        category: editCategory || template.category,
        description: editDescription.trim() || null,
        trigger_type: editTriggerType || template.trigger_type,
        trigger_keywords: keywordsArray.length > 0 ? keywordsArray : null,
        definition: {
          nodes,
          edges,
          viewport: reactFlowInstance?.getViewport?.() || { x: 0, y: 0, zoom: 1 }
        },
        is_published: publish ? true : isPublished,
      };

      const res = await fetchWithCsrf(`/admin/flow-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save flow template.');
      }

      const updated = await res.json();
      setTemplate(updated.template);
      setIsPublished(updated.template.is_published);
      toast.success(publish ? 'Flow template published to all workspace libraries!' : 'Flow template canvas saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Error saving template');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleTogglePublishState = async () => {
    try {
      const res = await fetchWithCsrf(`/admin/flow-templates/${template.id}/toggle-publish`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublished(data.is_published);
        toast.success(data.message || 'Publish status updated.');
      } else {
        toast.error('Failed to toggle publish status.');
      }
    } catch (err: any) {
      toast.error('Error toggling publish status: ' + err.message);
    }
  };

  // Drag and Drop Node from Palette
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') || event.dataTransfer.getData('application/reactflow-type');
    if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addNode(type, position);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <SimpleLoader fullScreen={true} message="Loading Flow Canvas Studio..." />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-12 text-center bg-white">
        <p className="text-sm font-bold text-zinc-600">Flow template not found.</p>
        <Link href="/superadmin/flow-templates" className="text-xs font-bold text-black underline mt-3 block">
          Return to Flow Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-white text-left font-sans">
      
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="h-14 border-b border-[#E8E8E6] bg-white flex items-center justify-between px-4 z-30 shrink-0 shadow-3xs">
        
        {/* Left Side: Back Arrow, Editable Title, Category & Live Switch (Only Switch, No Text) */}
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/flow-templates"
            className="p-1.5 -ml-1.5 text-zinc-400 hover:text-black hover:bg-[#FAFAFA] rounded-md transition-colors flex items-center justify-center cursor-pointer"
            title="Back to Flow Templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Editable Title */}
          <div className="flex items-center">
            {isEditingName ? (
              <input
                type="text"
                autoFocus
                defaultValue={templateName}
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
                title="Click to rename flow template"
                className="flex items-center gap-1.5 cursor-pointer group"
              >
                <h1 className="font-bold text-xs text-[#0A0A0A] uppercase tracking-wider select-none truncate group-hover:underline max-w-xs sm:max-w-md">
                  {templateName}
                </h1>
                <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Category Tag */}
          <span className="hidden sm:inline-flex text-[9.5px] font-bold uppercase tracking-wider bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-[4px]">
            {editCategory || template.category}
          </span>

          {/* Template Settings Trigger */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-colors cursor-pointer"
            title="Configure Template Details & Metadata"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>

          {/* Live / Draft Switch (ONLY SWITCH - NO TEXT) */}
          <div className="flex items-center pl-3 border-l border-[#E8E8E6]">
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              onClick={handleTogglePublishState}
              title={isPublished ? 'Unpublish template (set to draft)' : 'Publish template to all workspaces'}
              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                isPublished ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
              }`}
            >
              <span
                className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                  isPublished ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right Side: Save Draft & Publish */}
        <div className="flex items-center gap-2.5">
          {/* Save Draft */}
          <button 
            onClick={() => handleSaveFlow(false)}
            disabled={saving || publishing}
            className="flex items-center gap-1.5 h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-zinc-400" />}
            <span>Save Draft</span>
          </button>

          {/* Publish Template */}
          <button 
            onClick={() => handleSaveFlow(true)}
            disabled={saving || publishing}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {publishing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" /> : <Rocket className="h-3.5 w-3.5" />}
            <span>Publish Template</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BUILDER BODY (Palette + Canvas + Properties Panel) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Side: Drag & Drop Node Catalog */}
        <aside className="w-[300px] border-r border-[#E8E8E6] bg-white flex flex-col h-full shrink-0 select-none overflow-y-auto font-sans">
          <div className="px-6 py-5 border-b border-[#E8E8E6] flex flex-col justify-center bg-white shrink-0">
            <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight">{t('nodeElementCatalog') || 'Node Catalog'}</h3>
            <p className="text-[11px] text-[#6B6B6B] font-medium mt-0.5 leading-snug">{t('dragDropBlocksDesc') || 'Drag & drop visual builder canvas blocks.'}</p>
          </div>

          <div className="flex-1 p-5 space-y-6 overflow-y-auto bg-white">
            {CATALOG_GROUPS.map((group) => (
              <div key={group.name} className="space-y-2.5">
                <h4 className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider px-1">
                  {group.name}
                </h4>

                <div className="space-y-2">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const cat = getCategoryDetails(item.type);

                    return (
                      <div 
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', item.type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="relative w-full h-[68px] rounded-lg border border-[#E8E8E6] bg-white hover:bg-[#FAFAFA] hover:border-[#0A0A0A] cursor-grab active:cursor-grabbing px-3 py-2.5 select-none transition-all duration-150 shadow-3xs hover:shadow-2xs group/card flex items-center gap-3"
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/card:scale-105 shadow-3xs ${cat.badgeClass}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-xs font-bold text-[#0A0A0A] group-hover/card:text-black tracking-tight leading-tight truncate">
                            {item.label}
                          </p>
                          <p className="text-[9.5px] text-[#6B6B6B] font-medium leading-[1.3] line-clamp-2 mt-0.5">
                            {item.desc}
                          </p>
                        </div>

                        <div className="shrink-0 text-zinc-300 group-hover/card:text-zinc-600 transition-colors pl-0.5">
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: ReactFlow Canvas */}
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
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              deleteKeyCode={['Backspace', 'Delete']}
              connectionLineStyle={{ stroke: '#D4D4D0', strokeWidth: 2.5 }}
              defaultEdgeOptions={{ style: { stroke: '#D4D4D0', strokeWidth: 2.5 } }}
            >
              <Background color="#D4D4D0" gap={18} size={1} />
              <Controls className="bg-white border border-[#E8E8E6] rounded-[6px] shadow-3xs p-1 gap-1" />
              
              {/* Floating Top-Left Canvas Action Bar */}
              <Panel position="top-left" className="flex items-center gap-1.5 bg-white border border-[#E8E8E6] rounded-lg shadow-sm p-1.5 z-50 pointer-events-auto">
                <button 
                  onClick={() => arrangeNodes()}
                  className="flex items-center gap-1.5 h-8 px-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-[11px] font-semibold transition-all cursor-pointer bg-white"
                  title="Auto arrange nodes"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Auto Arrange</span>
                </button>
                <div className="h-4 w-[1px] bg-zinc-200 mx-1" />
                <button 
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-black rounded-[6px] transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8 disabled:opacity-30"
                  title="Undo"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-black rounded-[6px] transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8 disabled:opacity-30"
                  title="Redo"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </Panel>
            </ReactFlow>
          )}
        </div>

        {/* Right: Flow Node Properties Panel */}
        {selectedNodeId && <FlowPropertiesPanel />}

      </div>

      {/* Template Metadata Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E8E6] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8E8E6] pb-3">
              <h3 className="text-sm font-bold text-zinc-955">Template Details & Metadata</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 text-zinc-400 hover:text-black cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase">Category</label>
                <DropdownSelect
                  value={editCategory}
                  onChange={(val: string) => setEditCategory(val)}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase">Trigger Type</label>
                <DropdownSelect
                  value={editTriggerType}
                  onChange={(val: string) => setEditTriggerType(val)}
                  options={TRIGGER_TYPES}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase">Trigger Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={editTriggerKeywords}
                  onChange={(e) => setEditTriggerKeywords(e.target.value)}
                  placeholder="e.g. quote, price, pricing, hire"
                  className="w-full h-8.5 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E8E6] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-3.5 h-8.5 border border-[#E8E8E6] bg-white rounded-[6px] text-xs font-bold text-zinc-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  handleSaveFlow(false);
                }}
                className="px-4 h-8.5 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold cursor-pointer"
              >
                Apply & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SuperadminFlowStudioPage() {
  return (
    <ReactFlowProvider>
      <SuperadminFlowStudioInner />
    </ReactFlowProvider>
  );
}
