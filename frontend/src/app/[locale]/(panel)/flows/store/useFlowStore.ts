/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import { toast } from 'sonner';
import { OUT_PORTS, getNodeOutPorts } from '../[id]/edit/FlowBuilderNode';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;
  errors: Record<string, string>;
  aiProviders: { value: string; label: string }[];
  aiModels: Record<string, { value: string; label: string }[]>;
  isEcommerceConnected: boolean;
  setIsEcommerceConnected: (status: boolean) => void;
  translator: ((key: string) => string) | null;
  setTranslator: (tFn: (key: string) => string) => void;
  setAIConfig: (providers: { value: string; label: string }[], models: Record<string, { value: string; label: string }[]>) => void;

  // Initializer
  initFlow: (nodes: Node[], edges: Edge[]) => void;

  // React Flow integration
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;

  // Selectors
  setSelectedNodeId: (id: string | null) => void;

  // Actions
  addNode: (type: string, position: { x: number; y: number }) => void;
  changeNodeType: (id: string, newType: string) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, any>) => void;

  // History Undo/Redo
  saveStateToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Client Validation Engine
  validateFlow: () => boolean;
  clearErrors: () => void;
}

const DEFAULT_AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' }
];

const DEFAULT_AI_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
    { value: 'gpt-4o', label: 'GPT-4o Standard' },
    { value: 'o1-mini', label: 'o1 Mini' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' }
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek-V3' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' }
  ]
};

const DEFAULT_NODE_DATA: Record<string, any> = {
  inbound_message: { title: 'Inbound Message', channel: 'all', keyword: '', matchType: 'any_message' },
  outbound_campaign: { title: 'Outbound Broadcast', description: 'Fires when launched from Outbound Campaigns' },
  webhook_trigger: { title: 'API Webhook', url: '/api/v1/webhooks/flows/webhook_1', authRequired: false },
  contact_created: { title: 'Contact Created', description: 'Fires when a new contact is added to CRM' },
  deal_updated: { title: 'Deal Stage Updated', description: 'Fires when CRM deal stage changes in pipeline' },
  manual: { title: 'Manual Trigger', description: 'Fires when initiated manually by agent' },
  send_message: { title: 'Send Message', body: '', mediaUrl: '' },
  send_template: { title: 'Send Template', templateName: '' },
  ask_question: { title: 'Ask Question', questionText: '', saveKey: 'user_response' },
  interactive_menu: {
    title: 'Interactive Menu',
    menuType: 'list',
    buttonText: 'Select Option',
    body: 'Please select an option from the menu below:',
    footer: '',
    saveVariable: 'selected_menu_option',
    items: [
      { id: 'opt_1', title: 'Option 1', description: '', keywords: '1', value: '' },
      { id: 'opt_2', title: 'Option 2', description: '', keywords: '2', value: '' },
      { id: 'opt_3', title: 'Option 3', description: '', keywords: '3', value: '' },
    ],
    retryMessage: 'Please reply with a valid option from the menu above.',
    maxRetries: 2,
  },
  condition: { title: 'Condition Branch', operator: 'AND', conditions: [{ field: 'contact.tags', operator: 'contains', value: '' }] },
  ai_condition: { title: 'AI Binary Decision', question: '', contentKey: '{{ inbound_message_body }}', model: 'gpt-4o-mini' },
  wait_delay: { title: 'Delay & Wait', delayType: 'duration', value: 5, unit: 'minutes' },
  tag_contact: { title: 'Tag Contact', tagAction: 'add_tag', targetTag: '' },
  update_contact: { title: 'Update Contact', updates: [{ field: '', value: '' }] },
  create_deal: { title: 'Create Deal', dealName: '', dealValue: 0.0, stageId: 'new' },
  create_appointment: { title: 'Book Appointment', bookingDuration: 30, conferenceProvider: 'google_meet' },
  human_handoff: { title: 'Human Handoff', queueTarget: 'unassigned_inbox', internalNote: 'Transferring to human agent' },
  webhook_dispatch: { title: 'Webhook Outflow', url: '', method: 'POST', body: '{}', saveKey: 'webhook_response' },
  n8n: { 
    title: 'n8n Workflow', 
    url: '', 
    method: 'POST', 
    body: '{\n  "contact": {\n    "first_name": "{{ contact.first_name }}",\n    "last_name": "{{ contact.last_name }}",\n    "phone": "{{ contact.phone }}",\n    "email": "{{ contact.email }}"\n  },\n  "message": "{{ inbound_message_body }}"\n}', 
    authType: 'none', 
    headers: [], 
    saveKey: 'n8n_response', 
    variableMappings: [] 
  },
  zapier: { 
    title: 'Zapier Hook', 
    url: '', 
    method: 'POST', 
    body: '{\n  "contact": {\n    "first_name": "{{ contact.first_name }}",\n    "last_name": "{{ contact.last_name }}",\n    "phone": "{{ contact.phone }}",\n    "email": "{{ contact.email }}"\n  },\n  "message": "{{ inbound_message_body }}"\n}', 
    headers: [], 
    saveKey: 'zapier_response', 
    variableMappings: [] 
  },
  ai_prompt: { title: 'AI Model Prompt', prompt: '', saveKey: 'ai_response', systemInstructions: 'You are a helpful assistant.' },
  rag_query: { title: 'Vector RAG Query', query: '', saveKey: 'rag_results' },
  end_flow: { title: 'End Session', body: 'Thank you for chatting, goodbye!' },
  ecommerceCheckoutAbandoned: { title: 'Checkout Abandoned' },
  checkCartStatus: { title: 'Check Cart Status', cartProperty: 'total_price', operator: 'gt', value: 100 },
  generateDiscountCode: { title: 'Generate Discount', discountType: 'percentage', discountValue: 15, codePrefix: 'SAVE', expiryDays: 7 },
  search_product: { title: 'Search Product', query: '{{last_message}}', connection_id: '', limit: 3, in_stock_only: false },
  get_product: { title: 'Get Product', product_id: '', sku: '', handle: '', lookup_by: 'id' },
  send_product: { title: 'Send Product', product_id: '', caption: '', media_url: '', include_image: true, include_price: true, include_url: true },
  check_stock: { title: 'Check Stock', product_id: '', operator: 'in_stock', threshold: 1 },
  send_checkout_link: { title: 'Send Checkout Link', link_type: 'product_checkout', product_id: '', quantity: 1, discount_code: '', message: '' },
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  history: [],
  historyIndex: -1,
  errors: {},
  aiProviders: [],
  aiModels: {},
  isEcommerceConnected: false,
  setIsEcommerceConnected: (isEcommerceConnected) => set({ isEcommerceConnected }),
  translator: null,
  setTranslator: (tFn) => set({ translator: tFn }),
  setAIConfig: (aiProviders, aiModels) => set({ aiProviders, aiModels }),

  initFlow: (nodes, edges) => {
    set({
      nodes,
      edges,
      selectedNodeId: null,
      history: [{ nodes, edges }],
      historyIndex: 0,
      errors: {},
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set((state) => {
      const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
      const filteredChanges = changes.filter((change) => {
        if (change.type === 'remove') {
          const targetNode = state.nodes.find((n) => n.id === change.id);
          if (targetNode && (TRIGGER_TYPES.includes(targetNode.type || '') || targetNode.id === 'trigger_1' || (targetNode.data as any)?.is_root_trigger)) {
            toast.error('The trigger node is fixed by the AI Agent and cannot be deleted.');
            return false;
          }
        }
        return true;
      });
      const nextNodes = applyNodeChanges(filteredChanges, state.nodes);
      return { nodes: nextNodes };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const nextEdges = applyEdgeChanges(changes, state.edges);
      return { edges: nextEdges };
    });
  },

  onConnect: (connection) => {
    const t = get().translator;
    // 1. Prevent self-connection
    if (connection.source === connection.target) {
      toast.error(t ? t('toasts.cannotConnectSelf') : 'Cannot connect a node to itself.');
      return;
    }

    // 2. Prevent duplicate identical edge between exact same handles
    const duplicateEdge = get().edges.some(
      (edge) =>
        edge.source === connection.source &&
        (edge.sourceHandle || 'out') === (connection.sourceHandle || 'out') &&
        edge.target === connection.target &&
        (edge.targetHandle || 'in') === (connection.targetHandle || 'in')
    );
    if (duplicateEdge) {
      return;
    }

    // 3. Source node output handle check: Replace existing edge from this specific output handle
    const sourceNode = get().nodes.find((n) => n.id === connection.source);
    const sourceOutPorts = sourceNode ? getNodeOutPorts(sourceNode) : [];
    const sourcePortId = connection.sourceHandle || (sourceOutPorts[0]?.id || 'out');

    const filteredEdges = get().edges.filter((edge) => {
      if (edge.source !== connection.source) return true;
      if (sourceOutPorts.length <= 1) return false;
      const sh = edge.sourceHandle || 'out';
      if (sh === sourcePortId) return false;
      if (sourcePortId === 'item_0' && (sh === 'opt_1' || sh === 'item_0')) return false;
      if (sourcePortId === 'opt_1' && (sh === 'item_0' || sh === 'opt_1')) return false;
      if (sourcePortId === 'item_1' && (sh === 'opt_2' || sh === 'item_1')) return false;
      if (sourcePortId === 'opt_2' && (sh === 'item_1' || sh === 'opt_2')) return false;
      return true;
    });

    set((state) => {
      const nextEdges = addEdge(connection, filteredEdges);
      // Push event history
      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: state.nodes, edges: nextEdges });
      return {
        edges: nextEdges,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    const t = get().translator;
    if (newConnection.source === newConnection.target) {
      toast.error(t ? t('toasts.cannotConnectSelf') : 'Cannot connect a node to itself.');
      return;
    }

    const sourceNode = get().nodes.find((n) => n.id === newConnection.source);
    const sourceOutPorts = sourceNode ? getNodeOutPorts(sourceNode) : [];
    const sourcePortId = newConnection.sourceHandle || (sourceOutPorts[0]?.id || 'out');

    const sourceAlreadyConnected = get().edges.some((edge) => {
      if (edge.id === oldEdge.id || edge.source !== newConnection.source) return false;
      if (sourceOutPorts.length <= 1) return true;
      return (edge.sourceHandle || 'out') === sourcePortId;
    });

    if (sourceAlreadyConnected) {
      toast.error(t ? t('toasts.outputPortConnected') : 'This output port is already connected.');
      return;
    }

    set((state) => {
      const nextEdges = state.edges.map((e) =>
        e.id === oldEdge.id ? { ...e, ...newConnection } : e
      );
      
      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: state.nodes, edges: nextEdges });

      return {
        edges: nextEdges,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addNode: (type, position) => {
    const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
    if (TRIGGER_TYPES.includes(type)) {
      const existingTrigger = get().nodes.find((n) => TRIGGER_TYPES.includes(n.type || '') || n.id === 'trigger_1' || (n.data as any)?.is_root_trigger);
      if (existingTrigger) {
        get().changeNodeType(existingTrigger.id, type);
        get().setSelectedNodeId(existingTrigger.id);
        toast.info(`Root trigger converted to "${DEFAULT_NODE_DATA[type]?.title || type}"`);
        return;
      }
    }

    const id = `${type}_${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position,
      data: {
        ...DEFAULT_NODE_DATA[type],
        title: DEFAULT_NODE_DATA[type]?.title || 'Custom Action',
        node_identifier: id,
        ...(TRIGGER_TYPES.includes(type) ? { is_root_trigger: true } : {}),
      },
    };

    set((state) => {
      const nextNodes = [...state.nodes, newNode];
      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: nextNodes, edges: state.edges });
      return {
        nodes: nextNodes,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        selectedNodeId: id,
      };
    });
  },

  changeNodeType: (id, newType) => {
    const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
    const targetNode = get().nodes.find((n) => n.id === id);
    if (!targetNode) return;

    const isTrigger = TRIGGER_TYPES.includes(targetNode.type || '') || targetNode.id === 'trigger_1' || !!(targetNode.data as any)?.is_root_trigger;
    const defaultData = DEFAULT_NODE_DATA[newType] || {};

    set((state) => {
      const nextNodes = state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            type: newType,
            data: {
              ...defaultData,
              ...node.data,
              title: defaultData.title || node.data?.title || 'Custom Action',
              ...(isTrigger ? { is_root_trigger: true } : {}),
            },
          };
        }
        return node;
      });

      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: nextNodes, edges: state.edges });

      return {
        nodes: nextNodes,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    });
  },

  deleteNode: (id) => {
    const TRIGGER_TYPES = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
    const targetNode = get().nodes.find((n) => n.id === id);
    if (targetNode && (TRIGGER_TYPES.includes(targetNode.type || '') || targetNode.id === 'trigger_1' || (targetNode.data as any)?.is_root_trigger)) {
      toast.error('The starting root trigger node cannot be deleted.');
      return;
    }

    set((state) => {
      const nextNodes = state.nodes.filter((node) => node.id !== id);
      const nextEdges = state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      );

      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: nextNodes, edges: nextEdges });

      return {
        nodes: nextNodes,
        edges: nextEdges,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  },

  updateNodeData: (id, data) => {
    set((state) => {
      const nextNodes = state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      });

      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      nextHistory.push({ nodes: nextNodes, edges: state.edges });

      return {
        nodes: nextNodes,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    });
  },

  saveStateToHistory: () => {
    const state = get();
    const nextHistory = state.history.slice(0, state.historyIndex + 1);
    nextHistory.push({ nodes: state.nodes, edges: state.edges });
    set({
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const { nodes, edges } = history[nextIndex];
      set({
        nodes,
        edges,
        historyIndex: nextIndex,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const { nodes, edges } = history[nextIndex];
      set({
        nodes,
        edges,
        historyIndex: nextIndex,
      });
    }
  },

  validateFlow: () => {
    const { nodes, edges } = get();
    const errors: Record<string, string> = {};
    let isValid = true;

    // 1. Self-Loop Check (Cannot connect a node to itself)
    edges.forEach((edge) => {
      if (edge.source === edge.target) {
        errors[edge.source] = 'A node cannot connect to itself.';
        isValid = false;
      }
    });

    // 2. Trigger Node Check
    const VALID_TRIGGERS = [
      'inbound_message',
      'webhook_trigger',
      'webhook',
      'contact_created',
      'deal_updated',
      'manual',
      'outbound_campaign',
      'ecommerceCheckoutAbandoned',
      'keyword',
    ];
    const triggerNodes = nodes.filter((n) =>
      VALID_TRIGGERS.includes(n.type || '')
    );
    if (triggerNodes.length < 1) {
      isValid = false;
      errors['global'] = 'A flow must contain at least one trigger entry node.';
    }

    // Map edges
    const incomingMap: Record<string, Edge[]> = {};
    const outgoingMap: Record<string, Edge[]> = {};

    edges.forEach((edge) => {
      if (!incomingMap[edge.target]) incomingMap[edge.target] = [];
      incomingMap[edge.target].push(edge);

      if (!outgoingMap[edge.source]) outgoingMap[edge.source] = [];
      outgoingMap[edge.source].push(edge);
    });

    // 3. Orphan check (except trigger nodes)
    nodes.forEach((node) => {
      const isTriggerNode = VALID_TRIGGERS.includes(node.type || '');
      if (!isTriggerNode && (!incomingMap[node.id] || incomingMap[node.id].length === 0)) {
        errors[node.id] = 'Node has no incoming connections.';
        isValid = false;
      }
    });

    // 4. Conditional Outcome branch checks
    nodes.forEach((node) => {
      const type = node.type || '';
      if (['condition', 'ai_condition', 'webhook_dispatch', 'ai_prompt', 'rag_query'].includes(type)) {
        const outEdges = outgoingMap[node.id] || [];
        if (outEdges.length === 0) {
          errors[node.id] = 'outcome branches must be connected to outgoing paths.';
          isValid = false;
        }
      }
    });

    // 5. Config validation checks (Empty required fields)
    nodes.forEach((node) => {
      const type = node.type || '';
      const data = (node.data || {}) as any;
      
      if (type === 'send_message' && !data.body?.trim()) {
        errors[node.id] = 'Message body text is required.';
        isValid = false;
      } else if (type === 'send_template' && !data.templateName?.trim()) {
        errors[node.id] = 'Template selection is required.';
        isValid = false;
      } else if (type === 'ai_condition' && !data.question?.trim()) {
        errors[node.id] = 'AI binary question is required.';
        isValid = false;
      } else if (type === 'tag_contact' && !data.targetTag?.trim()) {
        errors[node.id] = 'Target tag is required.';
        isValid = false;
      } else if (type === 'webhook_dispatch' && !data.url?.trim()) {
        errors[node.id] = 'Webhook destination URL is required.';
        isValid = false;
      } else if (type === 'n8n' && !data.url?.trim() && !data.webhook_url?.trim()) {
        errors[node.id] = 'n8n Webhook URL is required.';
        isValid = false;
      } else if (type === 'zapier' && !data.url?.trim() && !data.webhook_url?.trim()) {
        errors[node.id] = 'Zapier Webhook URL is required.';
        isValid = false;
      } else if (type === 'ai_prompt' && !data.prompt?.trim()) {
        errors[node.id] = 'AI response prompt template is required.';
        isValid = false;
      } else if (type === 'create_deal' && !data.dealName?.trim()) {
        errors[node.id] = 'Deal name prefix is required.';
        isValid = false;
      } else if (type === 'interactive_menu') {
        if (!data.body?.trim()) {
          errors[node.id] = 'Menu message body text is required.';
          isValid = false;
        } else if (!Array.isArray(data.items) || data.items.length === 0 || !data.items.some((it: any) => it.title?.trim())) {
          errors[node.id] = 'At least one menu option is required.';
          isValid = false;
        }
      }
    });

    set({ errors });
    return isValid;
  },

  clearErrors: () => set({ errors: {} }),
}));
