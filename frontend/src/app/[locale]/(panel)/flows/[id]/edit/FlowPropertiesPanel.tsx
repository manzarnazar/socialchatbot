/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'isomorphic-dompurify';
import { useFlowStore } from '../../store/useFlowStore';
import { OUT_PORTS, NODE_ICONS, ROTATING_PORT_COLORS } from './FlowBuilderNode';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  X, 
  Trash2, 
  Plus, 
  Sparkles, 
  Info, 
  HelpCircle, 
  Ticket, 
  Unlink, 
  Lock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Code2,
  Braces,
  RefreshCw,
  Zap,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Search,
  Workflow,
  FormInput
} from 'lucide-react';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { toast } from 'sonner';
import { fetchWithCsrf, getBackendUrl } from '@/lib/api';
import { useTranslations } from 'next-intl';

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

// Clean real variable options based on flow type
const INBOUND_VARIABLES = [
  { value: '{{ inbound_message_body }}', label: 'Customer Message Body', category: 'Conversation' },
  { value: '{{ contact.first_name }}', label: 'Contact First Name', category: 'Contact Profile' },
  { value: '{{ contact.last_name }}', label: 'Contact Last Name', category: 'Contact Profile' },
  { value: '{{ contact.email }}', label: 'Contact Email', category: 'Contact Profile' },
  { value: '{{ contact.phone }}', label: 'Contact Phone Number', category: 'Contact Profile' },
  { value: '{{ system.current_date }}', label: 'Current Date', category: 'System' },
  { value: '{{ system.current_time }}', label: 'Current Time', category: 'System' },
];

const OUTBOUND_VARIABLES = [
  { value: '{{ contact.first_name }}', label: 'Contact First Name', category: 'Contact Profile' },
  { value: '{{ contact.last_name }}', label: 'Contact Last Name', category: 'Contact Profile' },
  { value: '{{ contact.email }}', label: 'Contact Email', category: 'Contact Profile' },
  { value: '{{ contact.phone }}', label: 'Contact Phone Number', category: 'Contact Profile' },
  { value: '{{ deal.name }}', label: 'CRM Deal Name', category: 'CRM Deal' },
  { value: '{{ deal.value }}', label: 'CRM Deal Value', category: 'CRM Deal' },
  { value: '{{ deal.stage }}', label: 'CRM Deal Stage', category: 'CRM Deal' },
  { value: '{{ system.current_date }}', label: 'Current Date', category: 'System' },
  { value: '{{ system.current_time }}', label: 'Current Time', category: 'System' },
];

const insertHTMLAtCursor = (html: string) => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    
    const el = document.createElement('div');
    el.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['contenteditable', 'data-variable'] });
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    
    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
};

interface RichVariableEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiLine?: boolean;
  minHeight?: string;
  className?: string;
  fieldId?: string;
}

const RichVariableEditor = ({
  value,
  onChange,
  placeholder = '',
  multiLine = true,
  minHeight = '72px',
  className = '',
  fieldId
}: RichVariableEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const nodes = useFlowStore((state) => state.nodes);

  const getDynamicVariableLabel = (varName: string) => {
    if (VARIABLE_LABELS[varName]) return VARIABLE_LABELS[varName];
    // Find Ask Question node that defines this variable name
    const askQuestionNode = nodes.find(
      (n) => n.type === 'ask_question' && n.data?.saveVariable === varName
    );
    if (askQuestionNode) {
      return askQuestionNode.data?.saveVariableLabel || `Reply: ${varName}`;
    }
    // Dynamic formatting: e.g. age_range -> Age Range
    return varName
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toHTML = (text: string) => {
    if (!text) return '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (match, varName) => {
      const cleanVar = varName.trim();
      const display = getDynamicVariableLabel(cleanVar);
      return `<span contenteditable="false" class="font-bold text-blue-600 select-none mx-0.5" data-variable="${cleanVar}">${display}</span>`;
    });
  };

  const toRawText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let result = '';
    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' && el.hasAttribute('data-variable')) {
          const varName = el.getAttribute('data-variable');
          result += `{{ ${varName} }}`;
        } else if (el.tagName === 'BR') {
          result += '\n';
        } else if (el.tagName === 'DIV' || el.tagName === 'P') {
          if (result && !result.endsWith('\n')) {
            result += '\n';
          }
          for (let i = 0; i < el.childNodes.length; i++) {
            traverse(el.childNodes[i]);
          }
        } else {
          for (let i = 0; i < el.childNodes.length; i++) {
            traverse(el.childNodes[i]);
          }
        }
      }
    };
    
    for (let i = 0; i < tempDiv.childNodes.length; i++) {
      traverse(tempDiv.childNodes[i]);
    }
    
    return result.replace(/\u00a0/g, ' ');
  };

  useEffect(() => {
    if (editorRef.current && !isTypingRef.current) {
      const htmlContent = toHTML(value);
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isTypingRef.current = true;
      const rawVal = toRawText(editorRef.current.innerHTML);
      onChange(rawVal);
      setTimeout(() => {
        isTypingRef.current = false;
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiLine && e.key === 'Enter') {
      e.preventDefault();
    }
    if (e.key === 'Backspace' && editorRef.current) {
      setTimeout(() => {
        if (editorRef.current && (editorRef.current.innerHTML === '<br>' || editorRef.current.innerText.trim() === '')) {
          editorRef.current.innerHTML = '';
          onChange('');
        }
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      const newRange = range.cloneRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    handleInput();
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-field-id={fieldId}
      {...({ placeholder } as any)}
      style={{ minHeight: multiLine ? minHeight : '36px' }}
      className={`rich-input bg-white border border-[#E8E8E6] rounded-lg text-black outline-none focus:border-black focus:ring-1 focus:ring-black px-3 py-2 text-xs font-medium shadow-3xs overflow-y-auto break-words empty:before:content-[attr(placeholder)] empty:before:text-zinc-400 empty:before:font-medium cursor-text select-text ${className}`}
    />
  );
};

const extractJsonPaths = (jsonStr: string): string[] => {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const paths: string[] = [];

    const recurse = (current: any, path: string) => {
      if (current === null || current === undefined) {
        if (path) paths.push(path);
        return;
      }
      if (Array.isArray(current)) {
        if (path) paths.push(path);
        if (current.length > 0 && typeof current[0] === 'object' && current[0] !== null) {
          recurse(current[0], `${path ? path + '.' : ''}0`);
        }
      } else if (typeof current === 'object') {
        const keys = Object.keys(current);
        if (keys.length === 0 && path) {
          paths.push(path);
        }
        for (const k of keys) {
          const nextPath = path ? `${path}.${k}` : k;
          paths.push(nextPath);
          if (typeof current[k] === 'object' && current[k] !== null) {
            recurse(current[k], nextPath);
          }
        }
      } else if (path) {
        paths.push(path);
      }
    };

    recurse(parsed, '');
    return Array.from(new Set(paths));
  } catch {
    return [];
  }
};

const WebhookConfigurationForm = ({
  data,
  type,
  nodeId,
  handleUpdate,
  renderUseVariablesButton,
  t,
}: {
  data: any;
  type: string;
  nodeId: string;
  handleUpdate: (field: string, val: any) => void;
  renderUseVariablesButton: (fieldId: string) => React.ReactNode;
  t: any;
}) => {
  const params = useParams();
  const flowId = params?.id as string | undefined;
  const [showHeaders, setShowHeaders] = useState(false);
  const [rawExampleJson, setRawExampleJson] = useState(data.example_response || '');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const val = data.example_response || '';
    setRawExampleJson(val);
    if (val.trim()) {
      try {
        const paths = extractJsonPaths(val);
        setDetectedKeys(paths);
        setJsonError(null);
      } catch (err: any) {
        setDetectedKeys([]);
        setJsonError(err.message || 'Invalid JSON');
      }
    } else {
      setDetectedKeys([]);
      setJsonError(null);
    }
  }, [data.example_response]);

  const handleExampleChange = (val: string) => {
    setRawExampleJson(val);
    handleUpdate('example_response', val);
    if (!val.trim()) {
      setDetectedKeys([]);
      setJsonError(null);
      return;
    }
    try {
      const paths = extractJsonPaths(val);
      setDetectedKeys(paths);
      setJsonError(null);
    } catch (err: any) {
      setDetectedKeys([]);
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleFormatJson = () => {
    if (!rawExampleJson.trim()) return;
    try {
      const parsed = JSON.parse(rawExampleJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setRawExampleJson(formatted);
      handleUpdate('example_response', formatted);
      const paths = extractJsonPaths(formatted);
      setDetectedKeys(paths);
      setJsonError(null);
      toast.success((t.has('jsonFormatted') ? t('jsonFormatted') : null) || `Formatted JSON (${paths.length})`);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON');
      toast.error('Invalid JSON: ' + (err.message || 'Check syntax'));
    }
  };

  const mappings: any[] = Array.isArray(data.variable_mappings) ? data.variable_mappings : [];

  const handleAddMapping = (jsonPath = '', variableName = '') => {
    const updated = [...mappings, { jsonPath, variableName, fallback: '' }];
    handleUpdate('variable_mappings', updated);
  };

  const handleUpdateMapping = (idx: number, field: 'jsonPath' | 'variableName' | 'fallback', val: string) => {
    const updated = [...mappings];
    updated[idx] = { ...updated[idx], [field]: val };
    handleUpdate('variable_mappings', updated);
  };

  const handleRemoveMapping = (idx: number) => {
    const updated = mappings.filter((_, i) => i !== idx);
    handleUpdate('variable_mappings', updated);
  };

  const handleAutoMapAll = () => {
    if (detectedKeys.length === 0) {
      toast.error('Please paste a valid JSON example response first');
      return;
    }
    const currentMappings = [...mappings];
    const existingPaths = new Set(currentMappings.map(m => m.jsonPath || m.json_path));
    let added = 0;

    detectedKeys.forEach(keyPath => {
      if (!existingPaths.has(keyPath)) {
        const sanitized = keyPath
          .replace(/\.0\./g, '_')
          .replace(/\.0$/g, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();
        currentMappings.push({
          jsonPath: keyPath,
          variableName: sanitized,
          fallback: '',
        });
        existingPaths.add(keyPath);
        added++;
      }
    });

    handleUpdate('variable_mappings', currentMappings);
    toast.success((t.has('autoMappedVars') ? t('autoMappedVars') : null) || `Auto-mapped ${added} variables`);
  };

  const handleKeyBadgeClick = (keyPath: string) => {
    if (mappings.some(m => (m.jsonPath || m.json_path) === keyPath)) {
      toast.info(`"${keyPath}" is already mapped in the table`);
      return;
    }
    const sanitized = keyPath
      .replace(/\.0\./g, '_')
      .replace(/\.0$/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();

    handleAddMapping(keyPath, sanitized);
    toast.success(`Mapped "${keyPath}" to {{ ${sanitized} }}`);
  };

  const headersList: any[] = Array.isArray(data.headers) ? data.headers : [];
  const handleAddHeader = (key = '', value = '') => {
    handleUpdate('headers', [...headersList, { key, value }]);
  };
  const handleUpdateHeader = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...headersList];
    updated[idx] = { ...updated[idx], [field]: val };
    handleUpdate('headers', updated);
  };
  const handleRemoveHeader = (idx: number) => {
    handleUpdate('headers', headersList.filter((_, i) => i !== idx));
  };

  const isOutflow = ['webhook_dispatch', 'n8n', 'zapier'].includes(type);
  const isN8n = type === 'n8n';
  const isZapier = type === 'zapier';

  return (
    <div className="space-y-6">
      {isOutflow ? (
        <>
          {/* Executive Integration Hero Card */}
          {isN8n && (
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-3xs space-y-2.5 relative overflow-hidden">
              <div className="h-[2.5px] w-full bg-[#EA4B71] absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-rose-50 text-[#EA4B71] border border-rose-200/60 flex items-center justify-center shrink-0">
                    <Workflow className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#0A0A0A]">n8n Automation Workflow</span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-rose-50 text-[#EA4B71] border border-rose-200/70 rounded-md">
                  Webhook
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] font-medium leading-relaxed">
                Trigger an automated n8n workflow by dispatching contact attributes and conversation payloads to your n8n <strong>Webhook</strong> node.
              </p>
            </div>
          )}

          {isZapier && (
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-3xs space-y-2.5 relative overflow-hidden">
              <div className="h-[2.5px] w-full bg-[#FF4A00] absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-orange-50 text-[#FF4A00] border border-orange-200/60 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#0A0A0A]">Zapier Catch Hook</span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-orange-50 text-[#FF4A00] border border-orange-200/70 rounded-md">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] font-medium leading-relaxed">
                Instantly trigger your Zap by sending customer leads and event payloads to your <strong>Catch Hook in Webhooks by Zapier</strong> trigger.
              </p>
            </div>
          )}

          {/* Method & URL Section — Spacious Layout with No Truncation */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
              {isN8n ? 'n8n Webhook Endpoint' : isZapier ? 'Zapier Hook Endpoint' : (t('urlEndpointLabel') || 'API URL Endpoint')}
            </label>

            <div className="flex items-center gap-2">
              <div className="w-[100px] shrink-0">
                <DropdownSelect 
                  value={data.method || 'POST'}
                  onChange={(val) => handleUpdate('method', val)}
                  options={[
                    { value: 'POST', label: 'POST' },
                    { value: 'GET', label: 'GET' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'PATCH', label: 'PATCH' },
                    { value: 'DELETE', label: 'DELETE' }
                  ]}
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={
                    isN8n 
                      ? 'https://n8n.domain.com/webhook/...' 
                      : isZapier 
                      ? 'https://hooks.zapier.com/hooks/catch/...' 
                      : 'https://api.domain.com/v1/resource'
                  }
                  value={data.url || data.webhook_url || ''}
                  onChange={(e) => {
                    handleUpdate('url', e.target.value);
                    handleUpdate('webhook_url', e.target.value);
                  }}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-[6px] text-[#0A0A0A] placeholder:text-[#A0A0A0] focus:border-[#0A0A0A] outline-none transition-all font-mono text-[11px] shadow-3xs"
                />
              </div>
            </div>
          </div>

          {/* Authentication Section */}
          {(isN8n || type === 'webhook_dispatch') && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                  Authentication
                </label>
                <span className="text-[9.5px] font-mono font-bold text-[#8C8C88] uppercase">
                  {data.authType || 'none'}
                </span>
              </div>
              <DropdownSelect
                value={data.authType || 'none'}
                onChange={(val) => handleUpdate('authType', val)}
                options={[
                  { value: 'none', label: 'None (Public / No Authentication)' },
                  { value: 'header', label: 'Header Auth (API Key / Token)' },
                  { value: 'bearer', label: 'Bearer Token' },
                  { value: 'basic', label: 'Basic Auth (Username / Password)' },
                ]}
              />

              {data.authType === 'header' && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#8C8C88] uppercase">Header Name</span>
                    <input
                      type="text"
                      placeholder="e.g. X-N8N-API-KEY"
                      value={data.authHeaderName || ''}
                      onChange={(e) => handleUpdate('authHeaderName', e.target.value)}
                      className="w-full h-9 px-3 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#8C8C88] uppercase">Header Value / Key</span>
                    <input
                      type="text"
                      placeholder="API Key / Secret"
                      value={data.authHeaderValue || ''}
                      onChange={(e) => handleUpdate('authHeaderValue', e.target.value)}
                      className="w-full h-9 px-3 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                    />
                  </div>
                </div>
              )}

              {data.authType === 'bearer' && (
                <div className="space-y-1 pt-1 animate-fade-in">
                  <span className="text-[9px] font-bold text-[#8C8C88] uppercase">Bearer Token</span>
                  <input
                    type="text"
                    placeholder="e.g. {{ api_token }} or eyJhbGciOi..."
                    value={data.authToken || ''}
                    onChange={(e) => handleUpdate('authToken', e.target.value)}
                    className="w-full h-9 px-3 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                  />
                </div>
              )}

              {data.authType === 'basic' && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#8C8C88] uppercase">Username</span>
                    <input
                      type="text"
                      placeholder="Username"
                      value={data.authUser || ''}
                      onChange={(e) => handleUpdate('authUser', e.target.value)}
                      className="w-full h-9 px-3 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#8C8C88] uppercase">Password</span>
                    <input
                      type="password"
                      placeholder="Password"
                      value={data.authPassword || ''}
                      onChange={(e) => handleUpdate('authPassword', e.target.value)}
                      className="w-full h-9 px-3 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HTTP Headers Accordion */}
          <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white shadow-3xs">
            <div 
              onClick={() => setShowHeaders(!showHeaders)}
              className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAFAFA] hover:bg-zinc-100/70 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5 text-[#8C8C88]" />
                <span className="text-xs font-bold text-[#0A0A0A]">HTTP Custom Headers</span>
                {headersList.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#E8E8E6] text-[#0A0A0A] rounded-md">
                    {headersList.length}
                  </span>
                )}
              </div>
              {showHeaders ? <ChevronUp className="h-3.5 w-3.5 text-[#8C8C88]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#8C8C88]" />}
            </div>

            {showHeaders && (
              <div className="p-3.5 space-y-3 bg-white border-t border-[#E8E8E6] animate-overlay-fade">
                {headersList.length > 0 && (
                  <div className="space-y-2">
                    {headersList.map((header, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Header Key (e.g. Content-Type)"
                          value={header.key || ''}
                          onChange={(e) => handleUpdateHeader(idx, 'key', e.target.value)}
                          className="flex-1 h-8.5 px-2.5 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                        />
                        <input
                          type="text"
                          placeholder="Header Value"
                          value={header.value || ''}
                          onChange={(e) => handleUpdateHeader(idx, 'value', e.target.value)}
                          className="flex-1 h-8.5 px-2.5 text-[11px] font-mono bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] focus:border-[#0A0A0A] outline-none shadow-3xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHeader(idx)}
                          className="p-1.5 text-[#8C8C88] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddHeader('', '')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0A0A0A] hover:text-zinc-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Header
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddHeader('Authorization', 'Bearer {{ api_token }}')}
                      className="px-2 py-1 text-[9.5px] font-semibold bg-[#F5F5F5] hover:bg-zinc-200 text-[#0A0A0A] rounded-md cursor-pointer transition-colors border border-[#E8E8E6]"
                    >
                      + Bearer Token
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddHeader('Content-Type', 'application/json')}
                      className="px-2 py-1 text-[9.5px] font-semibold bg-[#F5F5F5] hover:bg-zinc-200 text-[#0A0A0A] rounded-md cursor-pointer transition-colors border border-[#E8E8E6]"
                    >
                      + JSON Type
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Payload Presets & JSON Body (when not GET) */}
          {data.method !== 'GET' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                  {t('requestJsonPayloadLabel') || 'Request JSON Payload'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!data.body) return;
                      const parsed = JSON.parse(data.body);
                      handleUpdate('body', JSON.stringify(parsed, null, 2));
                      toast.success('Formatted request JSON!');
                    } catch {
                      toast.error('Invalid JSON syntax');
                    }
                  }}
                  className="text-[10.5px] font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Braces className="h-3 w-3" />
                  Format JSON
                </button>
              </div>

              {/* Quick Template Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] font-bold text-[#8C8C88] uppercase">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    const payload = JSON.stringify({
                      contact: {
                        first_name: "{{ contact.first_name }}",
                        last_name: "{{ contact.last_name }}",
                        phone: "{{ contact.phone }}",
                        email: "{{ contact.email }}"
                      },
                      message: "{{ inbound_message_body }}",
                      timestamp: "{{ system.current_date }} {{ system.current_time }}"
                    }, null, 2);
                    handleUpdate('body', payload);
                    toast.success('Applied full contact payload preset');
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-[#F5F5F5] hover:bg-zinc-200 text-[#0A0A0A] rounded-md cursor-pointer transition-colors shadow-3xs border border-[#E8E8E6]"
                >
                  Full Contact & Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const payload = JSON.stringify({
                      first_name: "{{ contact.first_name }}",
                      phone: "{{ contact.phone }}",
                      email: "{{ contact.email }}"
                    }, null, 2);
                    handleUpdate('body', payload);
                    toast.success('Applied minimal lead payload preset');
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-[#F5F5F5] hover:bg-zinc-200 text-[#0A0A0A] rounded-md cursor-pointer transition-colors shadow-3xs border border-[#E8E8E6]"
                >
                  Minimal Lead
                </button>
              </div>

              <RichVariableEditor
                fieldId="webhook_dispatch_body"
                multiLine={true}
                minHeight="100px"
                placeholder='{\n  "contact_email": "{{ contact.email }}",\n  "amount": 100\n}'
                value={data.body || ''}
                onChange={(val) => handleUpdate('body', val)}
                className="font-mono text-[11px]"
              />
              <div className="flex justify-end">
                {renderUseVariablesButton('webhook_dispatch_body')}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Inbound Webhook Trigger sandbox info */
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
            {t('sandboxApiUrlPath') || 'Webhook URL Path'}
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly
              value={`${getBackendUrl()}/api/v1/webhooks/flows/${flowId || nodeId || 'trigger_1'}`}
              className="flex-1 h-9 px-3 text-xs bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-zinc-800 select-all outline-none font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={() => {
                const webhookUrl = `${getBackendUrl()}/api/v1/webhooks/flows/${flowId || nodeId || 'trigger_1'}`;
                navigator.clipboard.writeText(webhookUrl);
                toast.success('Copied full webhook URL to clipboard!');
              }}
              className="h-9 px-3 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold rounded-md text-zinc-700 shrink-0 transition-colors cursor-pointer"
            >
              Copy
            </button>
          </div>
          <p className="text-[10.5px] text-[#6B6B6B]">
            External systems can trigger this automation by sending HTTP POST JSON payloads to this endpoint.
          </p>
        </div>
      )}

      {/* SAMPLE / EXAMPLE RESPONSE & SCHEMA PARSER */}
      <div className="space-y-2 pt-2 border-t border-[#E8E8E6]">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
            {isOutflow ? (t('exampleApiResponse') || 'Example API Response (JSON)') : (t('exampleInboundPayload') || 'Example Inbound Payload (JSON)')}
          </label>
          <button
            type="button"
            onClick={handleFormatJson}
            disabled={!rawExampleJson.trim()}
            className="px-2 py-0.5 bg-white border border-[#E8E8E6] hover:border-black text-[10px] font-bold text-[#0A0A0A] rounded-md transition-colors cursor-pointer shadow-3xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-2.5 w-2.5 text-[#8C8C88]" />
            Format JSON
          </button>
        </div>

        <textarea
          value={rawExampleJson}
          onChange={(e) => handleExampleChange(e.target.value)}
          placeholder={`{\n  "status": "success",\n  "data": {\n    "lead_score": 95,\n    "company": "Acme Corp"\n  }\n}`}
          rows={5}
          className="w-full p-2.5 font-mono text-[11px] bg-[#FAFAFA] focus:bg-white border border-[#E8E8E6] focus:border-[#0A0A0A] rounded-lg text-[#0A0A0A] placeholder:text-[#A0A0A0] outline-none transition-all resize-y shadow-3xs leading-relaxed"
        />

        <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-tight">
          Paste a sample JSON response to auto-detect properties for mapping.
        </p>

        {/* Validation & Detected Keys */}
        {jsonError ? (
          <div className="flex items-center gap-1.5 text-[10.5px] text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{jsonError}</span>
          </div>
        ) : detectedKeys.length > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Detected Properties ({detectedKeys.length}):
              </span>
              <span className="text-[9.5px] text-[#8C8C88] font-medium">
                Click property to map
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg">
              {detectedKeys.map((keyPath) => {
                const isMapped = mappings.some(m => (m.jsonPath || m.json_path) === keyPath);
                return (
                  <button
                    key={keyPath}
                    type="button"
                    onClick={() => handleKeyBadgeClick(keyPath)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                      isMapped
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-3xs'
                        : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-[#E8E8E6] text-[#0A0A0A]'
                    }`}
                  >
                    <span>{keyPath}</span>
                    {isMapped ? (
                      <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Plus className="h-2.5 w-2.5 opacity-60 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* VARIABLE MAPPINGS TABLE */}
      <div className="space-y-2.5 pt-4 border-t border-[#E8E8E6]">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
            {t('variableMappings') || 'Variable Mappings'}
          </label>
          {detectedKeys.length > 0 && (
            <button
              type="button"
              onClick={handleAutoMapAll}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-md transition-colors cursor-pointer shadow-3xs"
            >
              <Zap className="h-2.5 w-2.5" />
              Auto-Map All
            </button>
          )}
        </div>

        <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-tight">
          Map JSON properties to flow variables accessible across all nodes.
        </p>

        {mappings.length === 0 ? (
          <div className="p-4 border border-dashed border-[#E8E8E6] rounded-xl text-center bg-[#FAFAFA] space-y-2.5">
            <p className="text-[11px] text-[#6B6B6B] font-medium">
              No variables mapped yet. Add a mapping manually or use an example response above.
            </p>
            <button
              type="button"
              onClick={() => handleAddMapping('', '')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E8E6] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-bold rounded-lg shadow-3xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Variable Mapping
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping, idx) => (
              <div key={idx} className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-xl space-y-2 shadow-3xs">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="block text-[9px] font-bold text-[#8C8C88] uppercase tracking-wider">JSON Path</label>
                    <input
                      type="text"
                      list={`detected-paths-${idx}`}
                      placeholder="e.g. data.lead_score"
                      value={mapping.jsonPath || mapping.json_path || ''}
                      onChange={(e) => handleUpdateMapping(idx, 'jsonPath', e.target.value)}
                      className="w-full h-8 px-2.5 text-[11px] font-mono bg-white border border-[#E8E8E6] focus:border-[#0A0A0A] rounded-md text-[#0A0A0A] outline-none shadow-3xs"
                    />
                    <datalist id={`detected-paths-${idx}`}>
                      {detectedKeys.map(k => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-[#8C8C88] shrink-0 mt-4" />

                  <div className="flex-1 space-y-1">
                    <label className="block text-[9px] font-bold text-[#8C8C88] uppercase tracking-wider">Flow Variable</label>
                    <input
                      type="text"
                      placeholder="e.g. lead_score"
                      value={mapping.variableName || mapping.variable_name || ''}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                        handleUpdateMapping(idx, 'variableName', cleaned);
                      }}
                      className="w-full h-8 px-2.5 text-[11px] font-mono font-bold text-indigo-700 bg-white border border-[#E8E8E6] focus:border-[#0A0A0A] rounded-md outline-none shadow-3xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMapping(idx)}
                    className="p-1.5 text-[#8C8C88] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer mt-4"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#E8E8E6]">
                  <span className="text-[9.5px] text-[#8C8C88] font-medium">
                    Usage: <code className="text-indigo-600 font-bold font-mono">{`{{ ${mapping.variableName || 'var_name'} }}`}</code>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[9px] font-bold text-[#8C8C88] uppercase">Default:</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={mapping.fallback || ''}
                      onChange={(e) => handleUpdateMapping(idx, 'fallback', e.target.value)}
                      className="h-6 px-1.5 text-[10px] bg-white border border-[#E8E8E6] rounded text-[#0A0A0A] outline-none w-20"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => handleAddMapping('', '')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A0A0A] hover:text-zinc-700 cursor-pointer pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Mapping
            </button>
          </div>
        )}
      </div>

      {/* FULL RAW RESPONSE KEY */}
      {isOutflow && (
        <div className="space-y-1.5 pt-4 border-t border-[#E8E8E6]">
          <label className="block text-[10px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
            {t('saveResponseContextKeyLabel') || 'Save Full Response Object Key (Optional)'}
          </label>
          <input 
            type="text" 
            value={data.saveKey || ''}
            onChange={(e) => handleUpdate('saveKey', e.target.value)}
            placeholder={isN8n ? 'n8n_response' : isZapier ? 'zapier_response' : 'webhook_response'}
            className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] placeholder:text-[#A0A0A0] focus:border-[#0A0A0A] outline-none transition-all font-medium font-mono text-[11px] shadow-3xs"
          />
        </div>
      )}
    </div>
  );
};

export const FlowPropertiesPanel = ({ channelType = 'omnichannel' }: { channelType?: string }) => {
  const t = useTranslations('Flows');
  const tCommon = useTranslations('Common');
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const setEdges = useFlowStore((state) => state.setEdges);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const changeNodeType = useFlowStore((state) => state.changeNodeType);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId);
  const aiProviders = useFlowStore((state) => state.aiProviders);
  const aiModels = useFlowStore((state) => state.aiModels);

  const isEcommerceConnected = useFlowStore((state) => state.isEcommerceConnected);
  const setIsEcommerceConnected = useFlowStore((state) => state.setIsEcommerceConnected);

  const [templates, setTemplates] = useState<any[]>([]);
  const [storeCoupons, setStoreCoupons] = useState<string[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<{ value: string; label: string }[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ value: string; label: string }[]>([]);
  const [whatsAppFlows, setWhatsAppFlows] = useState<any[]>([]);

  const [ecommerceProducts, setEcommerceProducts] = useState<any[]>([]);
  const [ecommerceStores, setEcommerceStores] = useState<any[]>([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetchWithCsrf('/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data || []);
        }
      } catch (err) {
        console.error('Failed to load templates in properties drawer', err);
      }
    };
    const loadWhatsAppFlows = async () => {
      try {
        const res = await fetchWithCsrf('/whatsapp-flows');
        if (res.ok) {
          const data = await res.json();
          setWhatsAppFlows(Array.isArray(data) ? data : (data.flows || data.data || []));
        }
      } catch (err) {
        console.error('Failed to load WhatsApp Flows in properties drawer', err);
      }
    };
    const loadCoupons = async () => {
      try {
        const [statusRes, productsRes, storesRes] = await Promise.all([
          fetchWithCsrf('/integrations/ecommerce/status'),
          fetchWithCsrf('/ecommerce/products?per_page=100'),
          fetchWithCsrf('/ecommerce/stores'),
        ]);

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const list = Array.isArray(statusData) ? statusData : [];
          const active = list.some((c: any) => (c.status === 'active' || c.status === 'connected') && ['shopify', 'woocommerce'].includes(c.platform || c.provider));
          setIsEcommerceConnected(active);
          if (active) {
            const res = await fetchWithCsrf('/integrations/ecommerce/coupons');
            if (res.ok) {
              const data = await res.json();
              setStoreCoupons(data || []);
            }
          } else {
            setStoreCoupons([]);
          }
        }

        if (storesRes.ok) {
          const storesData = await storesRes.json();
          const storesList = Array.isArray(storesData) ? storesData : (storesData.connections || storesData.data || []);
          setEcommerceStores(storesList);
          if (storesList.length > 0) {
            setIsEcommerceConnected(true);
          }
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const prods = Array.isArray(productsData) ? productsData : (productsData.products?.data || productsData.data || []);
          setEcommerceProducts(prods);
        }
      } catch (err) {
        console.error('Failed to load store coupons in properties drawer', err);
        setStoreCoupons([]);
      }
    };
    const loadKnowledgeBases = async () => {
      try {
        const res = await fetchWithCsrf('/knowledge-bases');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data || [];
          setKnowledgeBases(list.map((kb: any) => ({
            value: kb.id.toString(),
            label: kb.name || `Knowledge Base #${kb.id}`
          })));
        }
      } catch (err) {
        console.error('Failed to load Knowledge Bases in properties drawer', err);
      }
    };
    const loadStaffMembers = async () => {
      try {
        const res = await fetchWithCsrf('/staff');
        if (res.ok) {
          const data = await res.json();
          const list = data.staff || [];
          setStaffMembers(list.map((s: any) => ({
            value: s.id.toString(),
            label: `${s.name} (${s.title || 'Specialist'})`
          })));
        }
      } catch (err) {
        console.error('Failed to load staff in properties drawer', err);
      }
    };
    loadTemplates();
    loadCoupons();
    loadKnowledgeBases();
    loadStaffMembers();
    loadWhatsAppFlows();
  }, []);

  // Track the last focused input, textarea, or contenteditable editor element
  const activeInputRef = useRef<HTMLElement | null>(null);

  // Dialog states
  const [dialogFieldId, setDialogFieldId] = useState<string | null>(null);
  const [dialogSearchQuery, setDialogSearchQuery] = useState('');
  const [activeCouponsFieldId, setActiveCouponsFieldId] = useState<string | null>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        activeInputRef.current = target;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  useEffect(() => {
    if (!dialogFieldId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialogFieldId(null);
        setDialogSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogFieldId]);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) return null;
  const data = (node.data || {}) as any;
  const type = node.type || '';
  const isTriggerNode = ['inbound_message', 'webhook_trigger', 'contact_created', 'deal_updated', 'manual', 'ecommerceCheckoutAbandoned', 'outbound_campaign'].includes(type) || node.id === 'trigger_1' || !!data.is_root_trigger;

  // Determine if flow has inbound vs outbound trigger type
  const triggerNode = nodes.find(n => 
    ['inbound_message', 'webhook_trigger', 'contact_created', 'deal_updated', 'manual', 'ecommerceCheckoutAbandoned', 'outbound_campaign'].includes(n.type || '')
  );
  const isInbound = !triggerNode || ['inbound_message', 'webhook_trigger', 'ecommerceCheckoutAbandoned', 'outbound_campaign'].includes(triggerNode.type || '');

  const getDynamicVariableLabel = (varName: string) => {
    const baseVarName = varName.split('||')[0].trim();
    
    // Localized variables lookups
    const localLabels: Record<string, string> = {
      'contact.first_name': tCommon('firstName') || 'First Name',
      'contact.last_name': tCommon('lastName') || 'Last Name',
      'contact.email': tCommon('email') || 'Email',
      'contact.phone': tCommon('phone') || 'Phone',
      'inbound_message_body': t('messageBody') || 'Message Body',
      'system.current_date': t('currentDate') || 'Current Date',
      'system.current_time': t('currentTime') || 'Current Time',
      'deal.name': t('dealName') || 'Deal Name',
      'deal.value': t('dealValue') || 'Deal Value',
      'deal.stage': t('dealStage') || 'Deal Stage',
      'checkout_url': t('checkoutUrlLabel') || 'Checkout URL',
      'cart_total': t('cartTotalLabel') || 'Cart Total',
      'items_summary': t('itemsSummaryLabel') || 'Items Summary',
      'discount.code': t('discountCodeLabel') || 'Discount Code',
      'discount.expiry': t('discountExpiryLabel') || 'Discount Expiry',
    };

    if (localLabels[baseVarName]) return localLabels[baseVarName];
    const askQuestionNode = nodes.find(n => n.type === 'ask_question' && n.data?.saveVariable === baseVarName);
    if (askQuestionNode) {
      return `Reply: ${askQuestionNode.data?.saveVariableLabel || baseVarName.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
    }

    const webhookNode = nodes.find(n => {
      const d = n.data || {};
      if (d.saveKey === baseVarName) return true;
      if (Array.isArray(d.variable_mappings)) {
        return d.variable_mappings.some((m: any) => (m.variableName || m.variable_name) === baseVarName);
      }
      return false;
    });
    if (webhookNode) {
      return `API: ${baseVarName}`;
    }

    return baseVarName
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Collect Flow Variables (from Ask Question nodes)
  const customVariables = nodes
    .filter((n) => n.type === 'ask_question' && n.data?.saveVariable && typeof n.data.saveVariable === 'string')
    .map((n) => {
      const clean = String(n.data?.saveVariable || '').trim();
      const label = (n.data?.saveVariableLabel as string) || clean
        .split(/[._-]/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { value: `{{ ${clean} }}`, label: `Reply: ${label}`, category: 'Flow Responses' };
    });

  // Collect Mapped Webhook Variables across the flow
  const webhookNodes = nodes.filter(n => ['webhook_dispatch', 'webhook_trigger', 'n8n', 'zapier'].includes(n.type || ''));
  const webhookVariables: { value: string; label: string; category: string }[] = [];
  webhookNodes.forEach(n => {
    const d = n.data || {};
    const nodeTitle = d.title || (n.type === 'n8n' ? 'n8n' : n.type === 'zapier' ? 'Zapier' : n.type === 'webhook_dispatch' ? 'API Call' : 'API Webhook');
    if (Array.isArray(d.variable_mappings)) {
      d.variable_mappings.forEach((m: any) => {
        const varName = (m.variableName || m.variable_name || '').trim();
        const jsonPath = (m.jsonPath || m.json_path || '').trim();
        if (varName) {
          webhookVariables.push({
            value: `{{ ${varName} }}`,
            label: `${nodeTitle}: ${varName}${jsonPath ? ` (${jsonPath})` : ''}`,
            category: 'API & Webhooks'
          });
        }
      });
    }
    if (d.saveKey && typeof d.saveKey === 'string' && d.saveKey.trim()) {
      const k = d.saveKey.trim();
      webhookVariables.push({
        value: `{{ ${k} }}`,
        label: `${nodeTitle} Response: ${k}`,
        category: 'API & Webhooks'
      });
    }
  });

  const localInboundVariables = [
    { value: '{{ inbound_message_body }}', label: t('messageBody') || 'Customer Message Body', category: 'Conversation' },
    { value: '{{ contact.first_name }}', label: tCommon('firstName') || 'Contact First Name', category: 'Contact Profile' },
    { value: '{{ contact.last_name }}', label: tCommon('lastName') || 'Contact Last Name', category: 'Contact Profile' },
    { value: '{{ contact.email }}', label: tCommon('email') || 'Contact Email', category: 'Contact Profile' },
    { value: '{{ contact.phone }}', label: tCommon('phone') || 'Contact Phone Number', category: 'Contact Profile' },
    { value: '{{ system.current_date }}', label: t('currentDate') || 'Current Date', category: 'System' },
    { value: '{{ system.current_time }}', label: t('currentTime') || 'Current Time', category: 'System' },
  ];

  if (nodes.some(n => n.type === 'ecommerceCheckoutAbandoned')) {
    localInboundVariables.push(
      { value: '{{ checkout_url }}', label: t('checkoutUrlLabel') || 'Checkout URL', category: 'E-Commerce' },
      { value: '{{ cart_total }}', label: t('cartTotalLabel') || 'Cart Total', category: 'E-Commerce' },
      { value: '{{ items_summary }}', label: t('itemsSummaryLabel') || 'Items Summary', category: 'E-Commerce' }
    );
  }

  if (nodes.some(n => n.type === 'generateDiscountCode')) {
    localInboundVariables.push(
      { value: '{{ discount.code }}', label: t('discountCodeLabel') || 'Discount Code', category: 'E-Commerce' },
      { value: '{{ discount.expiry }}', label: t('discountExpiryLabel') || 'Discount Expiry', category: 'E-Commerce' }
    );
  }

  const localOutboundVariables = [
    { value: '{{ contact.first_name }}', label: tCommon('firstName') || 'Contact First Name', category: 'Contact Profile' },
    { value: '{{ contact.last_name }}', label: tCommon('lastName') || 'Contact Last Name', category: 'Contact Profile' },
    { value: '{{ contact.email }}', label: tCommon('email') || 'Contact Email', category: 'Contact Profile' },
    { value: '{{ contact.phone }}', label: tCommon('phone') || 'Contact Phone Number', category: 'Contact Profile' },
    { value: '{{ deal.name }}', label: t('dealName') || 'CRM Deal Name', category: 'CRM Deal' },
    { value: '{{ deal.value }}', label: t('dealValue') || 'CRM Deal Value', category: 'CRM Deal' },
    { value: '{{ deal.stage }}', label: t('dealStage') || 'CRM Deal Stage', category: 'CRM Deal' },
    { value: '{{ system.current_date }}', label: t('currentDate') || 'Current Date', category: 'System' },
    { value: '{{ system.current_time }}', label: t('currentTime') || 'Current Time', category: 'System' },
  ];

  const baseVariables = isInbound ? localInboundVariables : localOutboundVariables;
  const variablesList: { value: string; label: string; category?: string }[] = [...baseVariables, ...customVariables, ...webhookVariables];

  const handleUpdate = (field: string, val: any) => {
    updateNodeData(node.id, { [field]: val });
  };

  const handleDialogVariableSelect = (varName: string) => {
    if (!dialogFieldId) return;
    const inputEl = document.querySelector(`[data-field-id="${dialogFieldId}"]`) as HTMLElement;
    if (inputEl) {
      if (inputEl.getAttribute('contenteditable') === 'true') {
        inputEl.focus();
        const display = getDynamicVariableLabel(varName);
        const html = `<span contenteditable="false" class="font-bold text-blue-600 select-none mx-0.5" data-variable="${varName}">${display}</span>&nbsp;`;
        insertHTMLAtCursor(html);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const start = (inputEl as any).selectionStart || 0;
        const end = (inputEl as any).selectionEnd || 0;
        const value = (inputEl as any).value || '';
        const inserted = `{{ ${varName} }}`;
        const newValue = value.substring(0, start) + inserted + value.substring(end);

        const setter = (inputEl as any).tagName === 'TEXTAREA'
          ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
          : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

        setter?.call(inputEl, newValue);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => {
          (inputEl as any).focus();
          (inputEl as any).setSelectionRange(start + inserted.length, start + inserted.length);
        }, 50);
      }
    } else {
      navigator.clipboard.writeText(`{{ ${varName} }}`);
      toast.success(t('toasts.copiedToClipboard', { varName: `{{ ${varName} }}` }));
    }
    setDialogFieldId(null);
    setDialogSearchQuery('');
  };

  const insertCouponCode = (fieldId: string, coupon: string) => {
    const inputEl = document.querySelector(`[data-field-id="${fieldId}"]`) as HTMLElement;
    if (inputEl) {
      if (inputEl.getAttribute('contenteditable') === 'true') {
        inputEl.focus();
        const textNode = document.createTextNode(coupon + ' ');
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(textNode);
          
          const newRange = range.cloneRange();
          newRange.setStartAfter(textNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const start = (inputEl as any).selectionStart || 0;
        const end = (inputEl as any).selectionEnd || 0;
        const value = (inputEl as any).value || '';
        const newValue = value.substring(0, start) + coupon + ' ' + value.substring(end);

        const setter = (inputEl as any).tagName === 'TEXTAREA'
          ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
          : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

        setter?.call(inputEl, newValue);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const renderStoreCouponsDropdown = (fieldId: string) => {
    if (!isEcommerceConnected || !storeCoupons || storeCoupons.length === 0) return null;
    const isOpen = activeCouponsFieldId === fieldId;
    return (
      <div className="relative inline-block text-right">
        <button
          type="button"
          onClick={() => setActiveCouponsFieldId(isOpen ? null : fieldId)}
          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer flex items-center gap-1.5 select-none"
        >
          <Ticket className="h-3.5 w-3.5 text-amber-600" />
          {t('insertCoupon') || 'Insert Coupon'}
        </button>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setActiveCouponsFieldId(null)} 
            />
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg shadow-md bg-white border border-[#E8E8E6] focus:outline-none z-50 p-1.5 max-h-44 overflow-y-auto animate-overlay-fade">
              {storeCoupons.map((coupon) => (
                <button
                  key={coupon}
                  type="button"
                  onClick={() => {
                    insertCouponCode(fieldId, coupon);
                    setActiveCouponsFieldId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#0A0A0A] hover:bg-[#FAFAFA] rounded-md cursor-pointer transition-colors flex items-center gap-1.5 font-semibold"
                >
                  <Ticket className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{coupon}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderUseVariablesButton = (fieldId: string, showCoupon: boolean = false) => {
    return (
      <div className={`flex items-center ${showCoupon ? 'justify-between' : 'justify-start'} w-full mt-2 pt-0.5`}>
        <button
          type="button"
          onClick={() => {
            setDialogFieldId(fieldId);
            setDialogSearchQuery('');
          }}
          className="text-[11px] font-bold text-zinc-700 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 select-none"
        >
          <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
          {t('useVariables') || 'Use Context Variables'}
        </button>
        {showCoupon && renderStoreCouponsDropdown(fieldId)}
      </div>
    );
  };

  const getLocalNodeTitle = (title: string) => {
    const defaultTitles: Record<string, string> = {
      'Inbound Message': 'node_inbound_message_title',
      'Outbound Broadcast': 'node_outbound_campaign_title',
      'API Webhook': 'node_webhook_trigger_title',
      'Contact Created': 'node_contact_created_title',
      'Deal Stage Updated': 'node_deal_updated_title',
      'Manual Trigger': 'node_manual_title',
      'Send Message': 'node_send_message_title',
      'Send Template': 'node_send_template_title',
      'WhatsApp Flow Form': 'node_whatsapp_flow_title',
      'Ask Question': 'node_ask_question_title',
      'Condition Branch': 'node_condition_title',
      'AI Binary Decision': 'node_ai_condition_title',
      'Delay & Wait': 'node_wait_delay_title',
      'Tag Contact': 'node_tag_contact_title',
      'Update Contact': 'node_update_contact_title',
      'Create Deal': 'node_create_deal_title',
      'Book Appointment': 'node_create_appointment_title',
      'Human Handoff': 'node_human_handoff_title',
      'Webhook Outflow': 'node_webhook_dispatch_title',
      'n8n Workflow': 'node_n8n_title',
      'Zapier Hook': 'node_zapier_title',
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
      return t(defaultTitles[title]) || title;
    }
    return title;
  };

  return (
    <div className="w-[380px] border-l border-[#E8E8E6] bg-white flex flex-col h-full shrink-0 select-none animate-slide-in relative z-40 font-sans">
      {/* Panel Header */}
      <div className="px-6 py-5 border-b border-[#E8E8E6] flex flex-col bg-white shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <input 
            type="text" 
            value={getLocalNodeTitle(data.title || '')}
            onChange={(e) => handleUpdate('title', e.target.value)}
            className="w-full text-base font-bold text-[#0A0A0A] focus:outline-none border-b border-transparent focus:border-[#0A0A0A] py-0.5 bg-transparent transition-colors tracking-tight"
            placeholder={t('untitledNode') || 'Untitled Node'}
          />
          <button 
            onClick={() => setSelectedNodeId(null)}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Node Identifier Input — Full 100% Width */}
        <div className="relative w-full">
          <input 
            type="text" 
            value={data.node_identifier || selectedNodeId || ''}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
              handleUpdate('node_identifier', cleaned);
            }}
            placeholder="Node Identifier (e.g. ask_patient_name)"
            className="w-full h-8 px-3 text-[11px] font-mono font-semibold bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-[#0A0A0A] focus:border-[#0A0A0A] focus:bg-white outline-none transition-all shadow-3xs"
          />
        </div>

        <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-snug">
          {isTriggerNode 
            ? 'This starting root trigger fires when incoming events match the flow conditions.'
            : (t('nodeConfigDesc') || 'Configure action settings, validation rules, and outputs.')}
        </p>
      </div>

      {/* Property Forms Panel */}
      <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-5 bg-white">
        
        {/* TRIGGER SELECTION & CONFIGURATION (Cardless & Clean Standard) */}
        {isTriggerNode && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  Trigger Event Type
                </label>
                <span className="text-[9.5px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                  Root Trigger
                </span>
              </div>
              <DropdownSelect
                options={[
                  { value: 'inbound_message', label: 'Inbound Customer Message' },
                  { value: 'webhook_trigger', label: 'API Webhook Inflow' },
                  { value: 'contact_created', label: 'New Contact Created (CRM)' },
                  { value: 'deal_updated', label: 'Deal Stage Updated (CRM)' },
                  { value: 'ecommerceCheckoutAbandoned', label: 'Abandoned Cart Recovery' },
                  { value: 'outbound_campaign', label: 'Outbound Broadcast Campaign' },
                  { value: 'manual', label: 'Manual Agent Trigger' },
                ]}
                value={type}
                onChange={(val) => {
                  if (selectedNodeId && val !== type) {
                    changeNodeType(selectedNodeId, val);
                  }
                }}
                className="w-full"
              />
              <p className="text-[10.5px] text-[#6B6B6B] leading-relaxed mt-1.5">
                {type === 'inbound_message' && 'Flow starts automatically when an incoming message is received on connected channels.'}
                {type === 'webhook_trigger' && 'Flow starts externally when an incoming HTTP POST payload is delivered to the webhook endpoint.'}
                {type === 'contact_created' && 'Flow starts automatically whenever a new contact profile is created or imported in CRM.'}
                {type === 'deal_updated' && 'Flow starts automatically whenever a CRM deal card transitions into a pipeline stage.'}
                {type === 'ecommerceCheckoutAbandoned' && 'Flow starts automatically when a customer leaves an unfinished shopping cart checkout.'}
                {type === 'outbound_campaign' && 'Flow triggers as the automated conversation tree for outbound broadcast campaigns.'}
                {type === 'manual' && 'Flow does not fire on automated events; agents trigger it manually from Inbox or Contact profiles.'}
              </p>
            </div>

            {/* INBOUND TRIGGER SETTINGS */}
            {type === 'inbound_message' && (
              <div className="border-t border-[#E8E8E6] pt-4 space-y-3.5">
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                    Trigger Condition
                  </label>
                  <DropdownSelect
                    options={[
                      { value: 'any_message', label: 'Any Incoming Message (Default)' },
                      { value: 'keyword_match', label: 'Match Specific Keywords / Phrases' },
                    ]}
                    value={data.matchType || (data.keyword ? 'keyword_match' : 'any_message')}
                    onChange={(val) => handleUpdate('matchType', val)}
                    className="w-full"
                  />
                </div>

                {(data.matchType === 'keyword_match' || !!data.keyword) && (
                  <div>
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                      Trigger Keywords
                    </label>
                    <input
                      type="text"
                      value={data.keyword || ''}
                      onChange={(e) => handleUpdate('keyword', e.target.value)}
                      placeholder="e.g. quote, pricing, hire, demo, book, support"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-800 focus:outline-none focus:border-black transition-colors"
                    />
                    <p className="text-[10.5px] text-[#6B6B6B] mt-1">
                      Separate multiple keywords with commas. Flow executes when incoming message matches any keyword.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* DEAL UPDATED SETTINGS */}
            {type === 'deal_updated' && (
              <div className="border-t border-[#E8E8E6] pt-4 space-y-3.5">
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                    Target Pipeline Stage
                  </label>
                  <DropdownSelect
                    options={[
                      { value: 'all', label: 'Any Stage Change (Default)' },
                      { value: 'lead', label: 'New Lead' },
                      { value: 'contacted', label: 'Contacted' },
                      { value: 'qualified', label: 'Qualified Lead' },
                      { value: 'proposal', label: 'Proposal Sent' },
                      { value: 'negotiation', label: 'Negotiation' },
                      { value: 'won', label: 'Closed Won' },
                      { value: 'lost', label: 'Closed Lost' },
                    ]}
                    value={data.stageId || 'all'}
                    onChange={(val) => handleUpdate('stageId', val)}
                    className="w-full"
                  />
                  <p className="text-[10.5px] text-[#6B6B6B] mt-1">
                    Triggers when a CRM deal transitions into the chosen stage.
                  </p>
                </div>
              </div>
            )}

            {/* ECOMMERCE ABANDONED CART SETTINGS */}
            {type === 'ecommerceCheckoutAbandoned' && (
              <div className="border-t border-[#E8E8E6] pt-4 space-y-3.5">
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">
                    Recovery Wait Delay
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      value={data.delayMinutes !== undefined ? data.delayMinutes : 30}
                      onChange={(e) => handleUpdate('delayMinutes', Number(e.target.value))}
                      className="w-24 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-800 focus:outline-none focus:border-black"
                    />
                    <span className="text-xs text-[#6B6B6B] font-medium">Minutes after abandonment</span>
                  </div>
                  <p className="text-[10.5px] text-[#6B6B6B] mt-1">
                    Wait duration before dispatching the recovery message sequence.
                  </p>
                </div>
              </div>
            )}

            {/* WEBHOOK TRIGGER */}
            {type === 'webhook_trigger' && (
              <div className="border-t border-[#E8E8E6] pt-4">
                <WebhookConfigurationForm
                  data={data}
                  type={type}
                  nodeId={selectedNodeId || 'trigger_1'}
                  handleUpdate={handleUpdate}
                  renderUseVariablesButton={renderUseVariablesButton}
                  t={t}
                />
              </div>
            )}
          </div>
        )}

        {/* CHECK CART STATUS CONDITION */}
        {type === 'checkCartStatus' && (
          <div className="space-y-4">
            {!isEcommerceConnected && (
              <div className="p-3.5 bg-[#FAFAFA] border border-amber-300/80 rounded-xl space-y-2 text-left animate-fade-in shadow-3xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Store Connection Required</span>
                </div>
                <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                  Connect your Shopify or WooCommerce store in Settings to evaluate live checkout carts.
                </p>
                <Link
                  href="/ecommerce/stores"
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0A0A0A] hover:underline pt-0.5"
                >
                  <span>Connect Store in Settings &rarr;</span>
                </Link>
              </div>
            )}

            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Target Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Auto (All Connected Stores)' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('cartPropertyLabel') || 'Cart Property'}
              </label>
              <DropdownSelect
                options={[
                  { value: 'total_price', label: t('totalPrice') || 'Total Price' },
                  { value: 'items_count', label: t('itemsCount') || 'Item Count' },
                ]}
                value={data.cartProperty || 'total_price'}
                onChange={(val) => handleUpdate('cartProperty', val)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('operatorLabel') || 'Operator'}
              </label>
              <DropdownSelect
                options={[
                  { value: 'gt', label: t('greaterThan') || 'Greater Than' },
                  { value: 'lt', label: t('lessThan') || 'Less Than' },
                  { value: 'eq', label: t('equals') || 'Equals' },
                ]}
                value={data.operator || 'gt'}
                onChange={(val) => handleUpdate('operator', val)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('valueLabel') || 'Value'}
              </label>
              <input
                type="number"
                value={data.value !== undefined ? data.value : 100}
                onChange={(e) => handleUpdate('value', Number(e.target.value))}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        {/* GENERATE DISCOUNT CODE */}
        {type === 'generateDiscountCode' && (
          <div className="space-y-4">
            {!isEcommerceConnected && (
              <div className="p-3.5 bg-[#FAFAFA] border border-amber-300/80 rounded-xl space-y-2 text-left animate-fade-in shadow-3xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Store Connection Required</span>
                </div>
                <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                  Connect your Shopify or WooCommerce store in Settings to generate live discount codes.
                </p>
                <Link
                  href="/ecommerce/stores"
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0A0A0A] hover:underline pt-0.5"
                >
                  <span>Connect Store &rarr;</span>
                </Link>
              </div>
            )}

            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Target Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Primary / Active Connected Store' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('discountTypeLabel') || 'Discount Type'}
              </label>
              <DropdownSelect
                options={[
                  { value: 'percentage', label: t('percentage') || 'Percentage (%)' },
                  { value: 'fixed_amount', label: t('fixedAmount') || 'Fixed Amount ($)' },
                ]}
                value={data.discountType || 'percentage'}
                onChange={(val) => handleUpdate('discountType', val)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('discountValueLabel') || 'Discount Value'}
              </label>
              <input
                type="number"
                value={data.discountValue !== undefined ? data.discountValue : 15}
                onChange={(e) => handleUpdate('discountValue', Number(e.target.value))}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('codePrefixLabel') || 'Code Prefix'}
              </label>
              <input
                type="text"
                value={data.codePrefix || 'SAVE'}
                onChange={(e) => handleUpdate('codePrefix', e.target.value.toUpperCase())}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
                placeholder="SAVE"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('expiryDaysLabel') || 'Expires In (Days)'}
              </label>
              <input
                type="number"
                value={data.expiryDays !== undefined ? data.expiryDays : 7}
                onChange={(e) => handleUpdate('expiryDays', Number(e.target.value))}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        {/* SEARCH PRODUCT NODE */}
        {type === 'search_product' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Search Query / Variable
              </label>
              <RichVariableEditor
                fieldId="search_product_query"
                multiLine={false}
                minHeight="36px"
                value={data.query ?? '{{last_message}}'}
                onChange={(val) => handleUpdate('query', val)}
                placeholder="e.g. {{last_message}} or shoes"
              />
              <p className="text-[10px] text-zinc-400">
                Searches product title, SKU, handle, and description. You can pass customer reply variable like <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded font-mono">{'{{last_message}}'}</code> or <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded font-mono">{'{{question_response}}'}</code>.
              </p>
            </div>

            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Filter by Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'All Connected Stores' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Max Results
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={data.limit !== undefined ? data.limit : 3}
                  onChange={(e) => handleUpdate('limit', Number(e.target.value))}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  In-Stock Only
                </label>
                <DropdownSelect
                  options={[
                    { value: 'false', label: 'All Products' },
                    { value: 'true', label: 'In-Stock Only' },
                  ]}
                  value={data.in_stock_only ? 'true' : 'false'}
                  onChange={(val) => handleUpdate('in_stock_only', val === 'true')}
                />
              </div>
            </div>

            <div className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-1.5 text-[11px]">
              <span className="font-bold text-zinc-800 text-[10.5px] block">Saved Context Variables:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-zinc-500 font-mono">
                <li><code>{'{{product_title}}'}</code> - Top matched product title</li>
                <li><code>{'{{product_price}}'}</code> - Product price</li>
                <li><code>{'{{product_url}}'}</code> - Storefront purchase link</li>
                <li><code>{'{{product_image_url}}'}</code> - Image URL</li>
                <li><code>{'{{products_list}}'}</code> - Numbered list of matched products</li>
              </ul>
            </div>
          </div>
        )}

        {/* GET PRODUCT NODE */}
        {type === 'get_product' && (
          <div className="space-y-4">
            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Filter by Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'All Connected Stores' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Lookup Method
              </label>
              <DropdownSelect
                options={[
                  { value: 'select', label: 'Select Specific Product from Catalog' },
                  { value: 'variable', label: 'Dynamic Variable (e.g. {{product_id}})' },
                  { value: 'sku', label: 'By SKU' },
                  { value: 'handle', label: 'By Handle / Slug' },
                ]}
                value={data.lookup_by || 'select'}
                onChange={(val) => handleUpdate('lookup_by', val)}
              />
            </div>

            {(!data.lookup_by || data.lookup_by === 'select') && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Choose Catalog Product
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: '-- Select a Product --' },
                    ...ecommerceProducts
                      .filter((p) => !data.connection_id || String(p.ecommerce_connection_id) === String(data.connection_id))
                      .map((p) => ({
                        value: String(p.id),
                        label: `${p.title} (${p.price} ${p.currency || 'USD'})`,
                      })),
                  ]}
                  value={data.product_id ? String(data.product_id) : ''}
                  onChange={(val) => {
                    handleUpdate('product_id', val);
                    const prod = ecommerceProducts.find((p) => String(p.id) === String(val));
                    if (prod) {
                      handleUpdate('product_title', prod.title);
                      handleUpdate('product_price', prod.price);
                    }
                  }}
                />
              </div>
            )}

            {data.lookup_by === 'variable' && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Product ID Variable / Value
                </label>
                <RichVariableEditor
                  fieldId="get_product_var"
                  multiLine={false}
                  minHeight="36px"
                  value={data.product_id ?? '{{product_id}}'}
                  onChange={(val) => handleUpdate('product_id', val)}
                  placeholder="e.g. {{product_id}}"
                />
              </div>
            )}

            {data.lookup_by === 'sku' && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Product SKU
                </label>
                <RichVariableEditor
                  fieldId="get_product_sku"
                  multiLine={false}
                  minHeight="36px"
                  value={data.sku ?? ''}
                  onChange={(val) => handleUpdate('sku', val)}
                  placeholder="e.g. {{sku}} or TSHIRT-BLK-M"
                />
              </div>
            )}

            {data.lookup_by === 'handle' && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Product Handle / URL Slug
                </label>
                <RichVariableEditor
                  fieldId="get_product_handle"
                  multiLine={false}
                  minHeight="36px"
                  value={data.handle ?? ''}
                  onChange={(val) => handleUpdate('handle', val)}
                  placeholder="e.g. classic-leather-jacket"
                />
              </div>
            )}

            <div className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-1.5 text-[11px]">
              <span className="font-bold text-zinc-800 text-[10.5px] block">Extracted Output Variables:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-zinc-500 font-mono">
                <li><code>{'{{product_title}}'}</code>, <code>{'{{product_price}}'}</code></li>
                <li><code>{'{{product_description}}'}</code>, <code>{'{{product_url}}'}</code></li>
                <li><code>{'{{product_stock}}'}</code>, <code>{'{{product_sku}}'}</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* SEND PRODUCT NODE */}
        {type === 'send_product' && (
          <div className="space-y-4">
            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Filter by Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Auto (From Product / All Stores)' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Product Source
              </label>
              <DropdownSelect
                options={[
                  { value: 'variable', label: 'From Variable (e.g. {{product_id}} from Search/Get)' },
                  { value: 'select', label: 'Select Specific Product from Catalog' },
                ]}
                value={data.source_mode || 'variable'}
                onChange={(val) => handleUpdate('source_mode', val)}
              />
            </div>

            {data.source_mode === 'select' ? (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Catalog Product
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: '-- Choose a Product --' },
                    ...ecommerceProducts
                      .filter((p) => !data.connection_id || String(p.ecommerce_connection_id) === String(data.connection_id))
                      .map((p) => ({
                        value: String(p.id),
                        label: `${p.title} (${p.price} ${p.currency || 'USD'})`,
                      })),
                  ]}
                  value={data.product_id ? String(data.product_id) : ''}
                  onChange={(val) => {
                    handleUpdate('product_id', val);
                    const prod = ecommerceProducts.find((p) => String(p.id) === String(val));
                    if (prod) {
                      handleUpdate('product_title', prod.title);
                      handleUpdate('media_url', prod.image_url || '');
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Product ID Variable
                </label>
                <RichVariableEditor
                  fieldId="send_prod_id"
                  multiLine={false}
                  minHeight="36px"
                  value={data.product_id ?? '{{product_id}}'}
                  onChange={(val) => handleUpdate('product_id', val)}
                  placeholder="{{product_id}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Custom Message / Caption (Optional)
              </label>
              <RichVariableEditor
                fieldId="send_product_caption"
                multiLine={true}
                minHeight="80px"
                value={data.caption || ''}
                onChange={(val) => handleUpdate('caption', val)}
                placeholder="Leave blank for automatic smart showcase layout (image + title + price + buy link), or customize here..."
              />
            </div>
          </div>
        )}

        {/* CHECK STOCK NODE */}
        {type === 'check_stock' && (
          <div className="space-y-4">
            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Filter by Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Auto (All Connected Stores)' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Target Product
              </label>
              <DropdownSelect
                options={[
                  { value: 'variable', label: 'From Variable (e.g. {{product_id}})' },
                  { value: 'select', label: 'Select Specific Product from Catalog' },
                ]}
                value={data.source_mode || 'variable'}
                onChange={(val) => handleUpdate('source_mode', val)}
              />
            </div>

            {data.source_mode === 'select' ? (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Catalog Product
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: '-- Choose a Product --' },
                    ...ecommerceProducts
                      .filter((p) => !data.connection_id || String(p.ecommerce_connection_id) === String(data.connection_id))
                      .map((p) => ({
                        value: String(p.id),
                        label: `${p.title} (${p.stock_quantity} in stock)`,
                      })),
                  ]}
                  value={data.product_id ? String(data.product_id) : ''}
                  onChange={(val) => {
                    handleUpdate('product_id', val);
                    const prod = ecommerceProducts.find((p) => String(p.id) === String(val));
                    if (prod) {
                      handleUpdate('product_title', prod.title);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Product ID Variable
                </label>
                <RichVariableEditor
                  fieldId="check_stock_id"
                  multiLine={false}
                  minHeight="36px"
                  value={data.product_id ?? '{{product_id}}'}
                  onChange={(val) => handleUpdate('product_id', val)}
                  placeholder="{{product_id}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Condition Operator
              </label>
              <DropdownSelect
                options={[
                  { value: 'in_stock', label: 'Is In Stock (Stock > 0)' },
                  { value: 'gte', label: 'Stock Quantity ≥ Threshold' },
                  { value: 'out_of_stock', label: 'Is Out of Stock (Stock ≤ 0)' },
                ]}
                value={data.operator || 'in_stock'}
                onChange={(val) => handleUpdate('operator', val)}
              />
            </div>

            {data.operator === 'gte' && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Minimum Stock Threshold
                </label>
                <input
                  type="number"
                  min={1}
                  value={data.threshold !== undefined ? data.threshold : 1}
                  onChange={(e) => handleUpdate('threshold', Number(e.target.value))}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
                />
              </div>
            )}
          </div>
        )}

        {/* SEND CHECKOUT LINK NODE */}
        {type === 'send_checkout_link' && (
          <div className="space-y-4">
            {ecommerceStores.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Target Store
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Auto (From Product / Primary Store)' },
                    ...ecommerceStores.map((s) => ({
                      value: String(s.id),
                      label: `${(s.platform || s.provider) === 'shopify' ? 'Shopify' : 'WooCommerce'}: ${s.store_url}`,
                    })),
                  ]}
                  value={data.connection_id || ''}
                  onChange={(val) => handleUpdate('connection_id', val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Link Type
              </label>
              <DropdownSelect
                options={[
                  { value: 'product_checkout', label: 'Instant Product Checkout Link (Cart Permalink)' },
                  { value: 'abandoned_cart', label: 'Abandoned Cart Recovery Link ({{checkout_url}})' },
                  { value: 'product_url', label: 'Storefront Product Page ({{product_url}})' },
                ]}
                value={data.link_type || 'product_checkout'}
                onChange={(val) => handleUpdate('link_type', val)}
              />
            </div>

            {(!data.link_type || data.link_type === 'product_checkout' || data.link_type === 'product_url') && (
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Target Product
                </label>
                <DropdownSelect
                  options={[
                    { value: '', label: 'Use Dynamic Variable ({{product_id}})' },
                    ...ecommerceProducts
                      .filter((p) => !data.connection_id || String(p.ecommerce_connection_id) === String(data.connection_id))
                      .map((p) => ({
                        value: String(p.id),
                        label: `${p.title} (${p.price} ${p.currency || 'USD'})`,
                      })),
                  ]}
                  value={data.product_id ? String(data.product_id) : ''}
                  onChange={(val) => handleUpdate('product_id', val)}
                />
              </div>
            )}

            {(!data.link_type || data.link_type === 'product_checkout') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={data.quantity !== undefined ? data.quantity : 1}
                    onChange={(e) => handleUpdate('quantity', Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={data.discount_code || ''}
                    onChange={(e) => handleUpdate('discount_code', e.target.value.toUpperCase())}
                    placeholder="e.g. {{discount_code}}"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-zinc-700 focus:outline-none focus:border-black font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                Message Body (Optional)
              </label>
              <RichVariableEditor
                fieldId="checkout_link_msg"
                multiLine={true}
                minHeight="72px"
                value={data.message || ''}
                onChange={(val) => handleUpdate('message', val)}
                placeholder="Leave blank for standard checkout message, or customize with {{checkout_url}}..."
              />
            </div>
          </div>
        )}

        {/* ASK QUESTION */}
        {type === 'ask_question' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('questionText') || 'Question Text'}</label>
              <RichVariableEditor
                fieldId="ask_question_text"
                multiLine={true}
                minHeight="72px"
                value={data.question || data.questionText || data.body || ''}
                onChange={(val) => {
                  handleUpdate('question', val);
                  handleUpdate('questionText', val);
                }}
              />
              {renderUseVariablesButton('ask_question_text')}
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('storeReplyInVariable') || 'Store Reply In Variable'}</label>
              <input 
                type="text" 
                placeholder={t('variableNamePlaceholder') || 'e.g. company_name'}
                value={data.saveVariable || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  handleUpdate('saveVariable', cleaned);
                }}
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium font-mono shadow-3xs"
              />
              <span className="text-[8px] text-zinc-400 font-semibold leading-relaxed block mt-1">
                {t('variableFormattingRules') || 'Lowercase alphanumeric and underscores only. This will create variable'} <b>{`{{ ${data.saveVariable || 'company_name'} }}`}</b>.
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('variableDisplayLabel') || 'Variable Display Label'}</label>
              <input 
                type="text" 
                placeholder={t('variableDisplayLabel') || 'e.g. Company Name'}
                value={data.saveVariableLabel || ''}
                onChange={(e) => handleUpdate('saveVariableLabel', e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">Variable Data Type</label>
              <DropdownSelect 
                value={data.variableDataType || 'text'}
                onChange={(val) => handleUpdate('variableDataType', val)}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'date', label: 'Date' },
                  { value: 'time', label: 'Time' },
                  { value: 'datetime', label: 'Date & Time' },
                  { value: 'number', label: 'Number' },
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                ]}
              />
            </div>
          </div>
        )}

        {/* INTERACTIVE MENU NODE */}
        {type === 'interactive_menu' && (() => {
          const items = Array.isArray(data.items) ? data.items : [];

          const handleAddOption = () => {
            const nextIdx = items.length + 1;
            const newId = `opt_${Date.now()}`;
            const nextItems = [
              ...items,
              {
                id: newId,
                title: `Option ${nextIdx}`,
                description: '',
                keywords: `${nextIdx}`,
                value: `option_${nextIdx}`
              }
            ];
            handleUpdate('items', nextItems);
          };

          const handleRemoveOption = (optId: string, optIdx: number) => {
            const nextItems = items.filter((_: any, i: number) => i !== optIdx);
            handleUpdate('items', nextItems);
            if (selectedNodeId) {
              const state = useFlowStore.getState();
              const nextEdges = state.edges.filter(
                (e) => !(e.source === selectedNodeId && e.sourceHandle === optId)
              );
              state.setEdges(nextEdges);
            }
          };

          return (
            <div className="space-y-4">
              {/* Message Header (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  {t('menuHeaderOptional') || 'Header Title (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={t('menuHeaderPlaceholder') || 'e.g. Select Specialist or Department'}
                  value={data.header || ''}
                  onChange={(e) => handleUpdate('header', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                />
              </div>

              {/* Message Body (Required) */}
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  {t('menuMessageBody') || 'Main Message Body'}
                </label>
                <RichVariableEditor
                  fieldId="menu_message_body"
                  multiLine={true}
                  minHeight="84px"
                  placeholder={t('menuBodyPlaceholder') || 'Please choose an option from the menu below:'}
                  value={data.body || ''}
                  onChange={(val) => handleUpdate('body', val)}
                />
                {renderUseVariablesButton('menu_message_body', true)}
              </div>

              {/* List Button CTA Label (Optional / Channel Supported) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  {t('listButtonLabel') || 'Menu CTA Button Label'}
                </label>
                <input
                  type="text"
                  maxLength={24}
                  placeholder="e.g. Select Option"
                  value={data.buttonText || ''}
                  onChange={(e) => handleUpdate('buttonText', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                />
                <span className="text-[8px] text-zinc-400 font-medium">Button title for channels supporting interactive menu CTA.</span>
              </div>

              {/* Footer Text (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  {t('menuFooterOptional') || 'Footer Note (Optional)'}
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Reply with option number or keyword"
                  value={data.footer || ''}
                  onChange={(e) => handleUpdate('footer', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                />
              </div>

              {/* Menu Items List - Same UI as Update Contact / Map Fields */}
              <div className="space-y-2.5 pt-5 border-t border-[#E8E8E6] -mx-6 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider block">
                      {t('menuChoicesList') || 'Menu Choices & Branches'}
                    </label>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Configure options and matching keywords. Each choice forms a canvas branch.
                    </p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="p-4 bg-[#FAFAFA] border border-dashed border-[#E8E8E6] rounded-lg text-center space-y-2">
                    <p className="text-xs font-semibold text-zinc-500">No menu options added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E8E6] hover:border-black text-zinc-800 text-xs font-bold rounded-lg shadow-3xs transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t('addChoice') || 'Add Option'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((item: any, idx: number) => {
                      const handleUpdateItem = (key: string, val: string) => {
                        const copy = [...items];
                        copy[idx] = { ...copy[idx], [key]: val };
                        handleUpdate('items', copy);
                      };

                      return (
                        <div
                          key={item.id || idx}
                          className="p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md space-y-2.5 relative shadow-3xs hover:border-zinc-300 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(item.id || `opt_${idx + 1}`, idx)}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors p-1"
                            title="Remove option"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${ROTATING_PORT_COLORS[idx % ROTATING_PORT_COLORS.length]}`} />
                            <span className="text-[9.5px] font-black text-zinc-800 uppercase tracking-wider">
                              Option {idx + 1}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">
                              {t('choiceTitle') || 'Option Title'}
                            </span>
                            <input
                              type="text"
                              maxLength={32}
                              placeholder={`e.g. Option ${idx + 1}`}
                              value={item.title || ''}
                              onChange={(e) => handleUpdateItem('title', e.target.value)}
                              className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">
                              {t('triggerKeywords') || 'Matching Keywords (comma separated)'}
                            </span>
                            <input
                              type="text"
                              placeholder={`e.g. ${idx + 1}, option ${idx + 1}, keyword1, keyword2`}
                              value={item.keywords || ''}
                              onChange={(e) => handleUpdateItem('keywords', e.target.value)}
                              className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">
                              {t('choiceDescription') || 'Description (Optional)'}
                            </span>
                            <input
                              type="text"
                              maxLength={72}
                              placeholder="e.g. Brief description of this option"
                              value={item.description || ''}
                              onChange={(e) => handleUpdateItem('description', e.target.value)}
                              className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddOption}
                      disabled={items.length >= 10}
                      className="w-full py-2.5 bg-white border border-dashed border-[#E8E8E6] hover:border-black rounded-lg text-xs font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t('addChoice') || 'Add Option'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Store Reply in Variable */}
              <div className="space-y-2 pt-5 border-t border-[#E8E8E6] -mx-6 px-6">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  {t('storeSelectionInVariable') || 'Store Choice in Variable'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. selected_menu_option or chosen_staff"
                  value={data.saveVariable || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    handleUpdate('saveVariable', cleaned);
                  }}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono font-medium shadow-3xs"
                />
                <span className="text-[8px] text-zinc-400 font-medium block">
                  Saves selected option title to variable <b>{`{{ ${data.saveVariable || 'selected_menu_option'} }}`}</b>.
                </span>
              </div>

              {/* Retry & Invalid Input Settings */}
              <div className="space-y-3 pt-5 border-t border-[#E8E8E6] -mx-6 px-6">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  {t('retrySettings') || 'Invalid Input & Fallback Settings'}
                </label>
                
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">
                    {t('retryMessage') || 'Retry Prompt on Invalid Reply'}
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Please reply with a valid option from the menu above."
                    value={data.retryMessage || ''}
                    onChange={(e) => handleUpdate('retryMessage', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">
                    {t('maxRetryAttempts') || 'Max Retries Before Fallback'}
                  </span>
                  <DropdownSelect
                    value={String(data.maxRetries ?? 2)}
                    onChange={(val) => handleUpdate('maxRetries', parseInt(val) || 2)}
                    options={[
                      { value: '1', label: '1 Attempt' },
                      { value: '2', label: '2 Attempts' },
                      { value: '3', label: '3 Attempts' },
                    ]}
                  />
                  <p className="text-[8.5px] text-zinc-400 font-medium mt-1">
                    If user exceeds retry limit, the flow continues down the <b>Fallback / Other</b> branch.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SEND MESSAGE */}
        {type === 'send_message' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('plainTextBody') || 'Plain text body'}</label>
              <RichVariableEditor
                fieldId="send_message_body"
                multiLine={true}
                minHeight="88px"
                placeholder={t('plainTextPlaceholder') || 'Hello {{ contact.first_name }}, thanks for checking options!'}
                value={data.body || ''}
                onChange={(val) => handleUpdate('body', val)}
              />
              {renderUseVariablesButton('send_message_body', true)}
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('attachmentMediaUrl') || 'Attachment Media URL'}</label>
              <RichVariableEditor
                fieldId="send_message_mediaUrl"
                multiLine={false}
                placeholder="https://yourbucket.s3.amazonaws.com/image.png"
                value={data.mediaUrl || ''}
                onChange={(val) => handleUpdate('mediaUrl', val)}
                className="font-mono text-[10px]"
              />
              {renderUseVariablesButton('send_message_mediaUrl')}
            </div>
          </div>
        )}

        {/* SEND TEMPLATE */}
        {type === 'send_template' && (() => {
          const compatibleTemplates = templates.filter(t => {
            if (channelType === 'omnichannel' || !channelType) return true;
            if (channelType === 'email') return t.type === 'email';
            return t.type === 'whatsapp';
          });
          return (
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('selectTemplate') || 'Select Template'}</label>
                <DropdownSelect 
                  value={data.templateId || ''}
                  onChange={(val) => {
                    const selectedTpl = compatibleTemplates.find(t => t.id.toString() === val);
                    handleUpdate('templateId', val);
                    handleUpdate('templateName', selectedTpl ? selectedTpl.name : '');
                  }}
                  placeholder={t('chooseTemplate') || 'Choose a template...'}
                  options={compatibleTemplates.map(t => ({
                    value: t.id.toString(),
                    label: `${t.name.toUpperCase()} (${t.type.toUpperCase()})`
                  }))}
                />
                {compatibleTemplates.length === 0 && (
                  <p className="text-[10px] text-zinc-400 font-semibold select-none mt-1">
                    {t('noTemplatesMatching') || "No templates matching the flow's target channel scope found."}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* WHATSAPP FLOW FORM */}
        {(type === 'whatsapp_flow' || type === 'send_whatsapp_flow') && (() => {
          return (
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Select WhatsApp Flow Form <span className="text-red-500">*</span>
                </label>
                <DropdownSelect 
                  value={data.flowId ? String(data.flowId) : ''}
                  onChange={(val) => {
                    const selected = whatsAppFlows.find(f => String(f.id) === val);
                    handleUpdate('flowId', val);
                    handleUpdate('flowName', selected ? selected.name : '');
                    if (selected && !data.body) {
                      handleUpdate('body', `Please complete our ${selected.name} form to proceed.`);
                    }
                  }}
                  placeholder="Choose a WhatsApp Flow..."
                  options={whatsAppFlows.map(f => ({
                    value: String(f.id),
                    label: `${f.name} (${f.status || 'DRAFT'} • ${f.category})`
                  }))}
                />
                {whatsAppFlows.length === 0 && (
                  <p className="text-[10px] text-zinc-400 font-semibold select-none mt-1">
                    No WhatsApp Flows configured. Create one in the WhatsApp Flows panel first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Header Text (Optional)
                </label>
                <RichVariableEditor
                  fieldId="whatsapp_flow_header"
                  multiLine={false}
                  placeholder="e.g. Service Booking Request"
                  value={data.header || ''}
                  onChange={(val) => handleUpdate('header', val)}
                />
                {renderUseVariablesButton('whatsapp_flow_header')}
              </div>

              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <RichVariableEditor
                  fieldId="whatsapp_flow_body"
                  multiLine={true}
                  minHeight="88px"
                  placeholder="Please complete this brief questionnaire so our team can process your request."
                  value={data.body || ''}
                  onChange={(val) => handleUpdate('body', val)}
                />
                {renderUseVariablesButton('whatsapp_flow_body', true)}
              </div>

              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Button CTA Label
                </label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Open Form"
                  value={data.flowCta || 'Open Form'}
                  onChange={(e) => handleUpdate('flowCta', e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-[#FAF9F6] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Footer Text (Optional)
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Powered by WhatsOmni"
                  value={data.footer || ''}
                  onChange={(e) => handleUpdate('footer', e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-[#FAF9F6] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium transition-all"
                />
              </div>

              {/* Wait for submission toggle */}
              <div className="bg-[#FAF9F6] border border-[#E8E8E6] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Wait for Customer Submission</span>
                    <span className="text-[10px] text-zinc-500 block">
                      Pause flow until form is submitted on WhatsApp
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.waitForSubmission !== false}
                      onChange={(e) => handleUpdate('waitForSubmission', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {data.waitForSubmission !== false && (
                  <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 font-medium">
                    When submitted, responses will be injected into <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-900">&#123;&#123; flow_answers &#125;&#125;</code> and the automation will resume from the <strong>Form Submitted</strong> branch.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* WAIT / DELAY */}
        {type === 'wait_delay' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('delayEventType') || 'Delay Event Type'}</label>
              <DropdownSelect 
                value={data.delayType || 'duration'}
                onChange={(val) => handleUpdate('delayType', val)}
                options={[
                  { value: 'duration', label: t('exactDuration') || 'Wait for exact duration (time delay)' },
                  { value: 'event_trigger', label: t('untilResponse') || 'Wait until customer replies (reply event)' }
                ]}
              />
            </div>

            {data.delayType === 'duration' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('delayDuration') || 'Delay duration'}</label>
                  <input 
                    type="number" 
                    min={1}
                    value={data.value || 5}
                    onChange={(e) => handleUpdate('value', parseInt(e.target.value) || 1)}
                    className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('unit') || 'Unit'}</label>
                  <DropdownSelect 
                    value={data.unit || 'minutes'}
                    onChange={(val) => handleUpdate('unit', val)}
                    options={[
                      { value: 'milliseconds', label: t('milliseconds') || 'Milliseconds' },
                      { value: 'seconds', label: t('seconds') || 'Seconds' },
                      { value: 'minutes', label: t('minutes') || 'Minutes' },
                      { value: 'hours', label: t('hours') || 'Hours' },
                      { value: 'days', label: t('days') || 'Days' }
                    ]}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-50/50 border border-[#E8E8E6] rounded-md text-[10px] text-zinc-600 leading-relaxed shadow-3xs">
                {t('flowPausedDesc') || 'Flow execution pauses here. It will resume once the customer sends a new message on the active chat thread.'}
              </div>
            )}
          </div>
        )}

        {/* TAG CONTACT */}
        {type === 'tag_contact' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('action') || 'Action'}</label>
              <DropdownSelect 
                value={data.tagAction || 'add_tag'}
                onChange={(val) => handleUpdate('tagAction', val)}
                options={[
                  { value: 'add_tag', label: t('addTagLabel') || 'Add tag label to profile' },
                  { value: 'remove_tag', label: t('removeTagLabel') || 'Remove tag from profile' }
                ]}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('targetTagLabel') || 'Target Tag Label'}</label>
              <input 
                type="text" 
                value={data.targetTag || ''}
                onChange={(e) => handleUpdate('targetTag', e.target.value)}
                placeholder={t('targetTagPlaceholder') || 'e.g. Lead, Inbound, Warm'}
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* CONDITION / BRANCH */}
        {type === 'condition' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                {t('evaluatorLogicalRule') || 'Evaluator Logical Rule'}
              </label>
              <DropdownSelect 
                value={data.operator || 'AND'}
                onChange={(val) => handleUpdate('operator', val)}
                options={[
                  { value: 'AND', label: t('matchesAll') || 'Matches ALL criteria (AND)' },
                  { value: 'OR', label: t('matchesAny') || 'Matches ANY criteria (OR)' }
                ]}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                {t('conditionalMatrix') || 'Conditional Matrix'}
              </label>
              
              {(data.conditions || []).map((cond: any, idx: number) => {
                const handleUpdateCondition = (key: string, value: any) => {
                  const copy = [...(data.conditions || [])];
                  copy[idx] = { ...copy[idx], [key]: value };
                  handleUpdate('conditions', copy);
                };

                const handleRemoveCondition = () => {
                  const copy = (data.conditions || []).filter((_: any, i: number) => i !== idx);
                  handleUpdate('conditions', copy);
                };

                return (
                  <div key={idx} className="p-4 bg-white border border-[#E8E8E6] rounded-lg space-y-3.5 shadow-3xs hover:border-zinc-300 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E6]">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Rule #{idx + 1}
                      </span>
                      {(data.conditions || []).length > 1 && (
                        <button 
                          type="button" 
                          onClick={handleRemoveCondition}
                          className="text-zinc-400 hover:text-red-500 cursor-pointer transition-colors p-0.5"
                          title="Remove condition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                        {t('targetField') || 'Target Field'}
                      </span>
                      <DropdownSelect 
                        value={cond.field || 'contact.tags'}
                        onChange={(val) => handleUpdateCondition('field', val)}
                        options={[
                          { value: 'contact.tags', label: t('contactTagList') || 'Contact tag list' },
                          { value: 'contact.email', label: t('contactEmailAddress') || 'Contact email Address' },
                          { value: 'contact.first_name', label: t('contactFirstName') || 'Contact First Name' },
                          { value: 'inbound_message_body', label: t('customerMessageText') || 'Customer message text' }
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                        {t('operator') || 'Operator'}
                      </span>
                      <DropdownSelect 
                        value={cond.operator || 'equals'}
                        onChange={(val) => handleUpdateCondition('operator', val)}
                        options={[
                          { value: 'equals', label: t('equals') || 'Equals' },
                          { value: 'contains', label: t('contains') || 'Contains' },
                          { value: 'is_empty', label: t('isEmpty') || 'Is Empty' },
                          { value: 'starts_with', label: t('startsWith') || 'Starts with' }
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                          {t('value') || 'Value'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogFieldId(`condition_value_${idx}`);
                            setDialogSearchQuery('');
                          }}
                          className="text-[10px] font-bold text-zinc-500 hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-zinc-400 hover:text-black" />
                          <span>Insert Variable</span>
                        </button>
                      </div>
                      <RichVariableEditor
                        fieldId={`condition_value_${idx}`}
                        multiLine={false}
                        placeholder={t('targetTagPlaceholder') || 'e.g. Lead, VIP, Inbound'}
                        value={cond.value || ''}
                        onChange={(val) => handleUpdateCondition('value', val)}
                        className="h-9 py-1 text-xs"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const copy = [...(data.conditions || [])];
                  copy.push({ field: 'contact.tags', operator: 'contains', value: '' });
                  handleUpdate('conditions', copy);
                }}
                className="w-full flex items-center justify-center gap-1.5 h-9 border border-dashed border-[#E8E8E6] text-xs font-bold text-zinc-700 hover:bg-[#FAFAFA] rounded-lg transition-colors cursor-pointer shadow-3xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('addConditionRow') || 'Add Condition Row'}
              </button>
            </div>
          </div>
        )}

        {/* AI CONDITION */}
        {type === 'ai_condition' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('questionPromptToSend') || 'Question Prompt to Send'}
              </label>
              <RichVariableEditor
                fieldId="ai_condition_prompt_message"
                placeholder="e.g. Would you like to schedule an appointment with our specialist today?"
                value={data.prompt_message !== undefined ? data.prompt_message : (data.question || '')}
                onChange={(val) => handleUpdate('prompt_message', val)}
                minHeight="72px"
              />
              {renderUseVariablesButton('ai_condition_prompt_message')}
              <span className="text-[9px] text-[#6B6B6B] font-medium leading-relaxed block mt-1">
                Sent to the customer to collect their reply before evaluating.
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                {t('yesNoCondition') || 'Yes / No Classification Rule'}
              </label>
              <textarea 
                rows={2}
                placeholder={t('conditionPlaceholder') || 'e.g. Is the user agreeing, confirming, or showing positive interest?'}
                value={data.question || ''}
                onChange={(e) => handleUpdate('question', e.target.value)}
                className="w-full p-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#0A0A0A] placeholder:text-[#A0A0A0] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] outline-none transition-all resize-none font-medium shadow-3xs"
              />
              <span className="text-[9px] text-[#6B6B6B] font-medium leading-relaxed block mt-1">
                AI evaluates the customer&apos;s incoming reply against this rule to route through Yes or No.
              </span>
            </div>
          </div>
        )}

        {/* WEBHOOK DISPATCH, N8N, ZAPIER */}
        {['webhook_dispatch', 'n8n', 'zapier'].includes(type) && (
          <WebhookConfigurationForm
            data={data}
            type={type}
            nodeId={selectedNodeId || ''}
            handleUpdate={handleUpdate}
            renderUseVariablesButton={renderUseVariablesButton}
            t={t}
          />
        )}

        {/* RAG KNOWLEDGEBASE */}
        {type === 'rag_query' && (
          <div className="space-y-5">
            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                Execution Mode
              </label>
              
              <div className="grid grid-cols-2 p-1 bg-[#F5F5F5] border border-[#E8E8E6] rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => handleUpdate('mode', 'loop')}
                  className={`py-2 px-2.5 rounded-md text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 ${
                    (data.mode || 'loop') === 'loop'
                      ? 'bg-white text-[#0A0A0A] font-bold text-xs shadow-3xs border border-[#E8E8E6]'
                      : 'text-[#6B6B6B] hover:text-[#0A0A0A] font-medium text-xs'
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Continuous Loop</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('mode', 'single')}
                  className={`py-2 px-2.5 rounded-md text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 ${
                    data.mode === 'single'
                      ? 'bg-white text-[#0A0A0A] font-bold text-xs shadow-3xs border border-[#E8E8E6]'
                      : 'text-[#6B6B6B] hover:text-[#0A0A0A] font-medium text-xs'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  <span>Single Answer</span>
                </button>
              </div>
              <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-relaxed">
                {(data.mode || 'loop') === 'loop'
                  ? 'Continuously answers customer questions from Knowledge Base until an exit keyword is received, then advances to next node.'
                  : 'Answers incoming question once and immediately proceeds to the downstream connected node.'}
              </p>
            </div>

            {/* Loop Exit Keywords Configuration */}
            {(data.mode || 'loop') === 'loop' && (
              <div className="pt-5 -mx-6 px-6 border-t border-[#E8E8E6] space-y-1.5">
                <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                  Loop Exit Keywords
                </label>
                <input
                  type="text"
                  value={data.exit_keywords || ''}
                  onChange={(e) => handleUpdate('exit_keywords', e.target.value)}
                  placeholder="exit, bye, quit, end, stop, thanks, thank you, no, nothing"
                  className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-md text-[#0A0A0A] placeholder:text-[#A0A0A0] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] outline-none transition-all font-medium shadow-3xs"
                />
                <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-relaxed">
                  Comma-separated keywords that exit the continuous Q&A session and move to the next node.
                </p>
              </div>
            )}

            {/* Single Answer Mode Direct Send Toggle */}
            {data.mode === 'single' && (
              <div className="pt-5 -mx-6 px-6 border-t border-[#E8E8E6]">
                <div 
                  onClick={() => handleUpdate('send_answer', data.send_answer === false ? true : false)}
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg cursor-pointer select-none transition-all group shadow-3xs"
                >
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-[#0A0A0A] group-hover:text-black transition-colors">
                      Send Answer Directly to Chat
                    </span>
                    <span className="block text-[10.5px] text-[#6B6B6B] font-medium leading-tight">
                      Send generated reply before executing next node
                    </span>
                  </div>
                  <div 
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      data.send_answer !== false ? 'bg-[#0A0A0A]' : 'bg-[#E8E8E6]'
                    }`}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        data.send_answer !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Output Variable Key */}
            <div className="pt-5 -mx-6 px-6 border-t border-[#E8E8E6] space-y-1.5">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">{t('saveResponseVariable') || 'Save Output Variable'}</label>
              <input
                type="text"
                value={data.saveKey || 'rag_results'}
                onChange={(e) => handleUpdate('saveKey', e.target.value)}
                placeholder="rag_results"
                className="w-full h-9 px-3 rounded-md border border-[#E8E8E6] bg-white text-xs font-mono font-semibold text-[#0A0A0A] placeholder:text-[#A0A0A0] outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-all shadow-3xs"
              />
              <p className="text-[10.5px] text-[#6B6B6B] font-medium leading-relaxed">
                Access the generated answer in downstream nodes with <code className="text-[#0A0A0A] bg-[#F5F5F5] border border-[#E8E8E6] px-1 py-0.5 rounded font-bold font-mono text-[10px]">{`{{ ${data.saveKey || 'rag_results'} }}`}</code>.
              </p>
            </div>
          </div>
        )}

        {/* AI MODEL PROMPT */}
        {type === 'ai_prompt' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('systemInstructionsLabel') || 'System Role Instructions'}</label>
              <RichVariableEditor
                fieldId="ai_prompt_systemInstructions"
                multiLine={true}
                minHeight="70px"
                placeholder="You are a helpful customer support agent for WhatsOmni."
                value={data.systemInstructions || ''}
                onChange={(val) => handleUpdate('systemInstructions', val)}
                className="text-xs"
              />
              {renderUseVariablesButton('ai_prompt_systemInstructions')}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('systemInstructionsLabel') || 'System Role Instructions'}</label>
              <RichVariableEditor
                fieldId="ai_prompt_systemInstructions"
                multiLine={true}
                minHeight="70px"
                placeholder="You are a helpful customer support agent for WhatsOmni."
                value={data.systemInstructions || ''}
                onChange={(val) => handleUpdate('systemInstructions', val)}
                className="text-xs"
              />
              {renderUseVariablesButton('ai_prompt_systemInstructions')}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('userPromptInstruction') || 'User Prompt Instruction'}</label>
              <RichVariableEditor
                fieldId="ai_prompt_prompt"
                multiLine={true}
                minHeight="90px"
                placeholder="Summarize customer request: {{ inbound_message_body }}"
                value={data.prompt || ''}
                onChange={(val) => handleUpdate('prompt', val)}
                className="text-xs"
              />
              {renderUseVariablesButton('ai_prompt_prompt')}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('saveResponseContextKeyLabel') || 'Save Response context key'}</label>
              <input 
                type="text" 
                value={data.saveKey || 'ai_response'}
                onChange={(e) => handleUpdate('saveKey', e.target.value)}
                placeholder="ai_response"
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium font-mono text-[10px] shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* HUMAN HANDOFF */}
        {type === 'human_handoff' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('assignToAgent') || 'Assign to Agent'}</label>
              <DropdownSelect 
                value={data.agentId || 'unassigned'}
                onChange={(val) => handleUpdate('agentId', val)}
                options={[
                  { value: 'unassigned', label: t('leaveUnassigned') || 'Leave Unassigned (Queue Routing)' },
                  { value: 'john_doe', label: t('johnDoeSupport') || 'John Doe (Support Specialist)' },
                  { value: 'jane_smith', label: t('janeSmithSales') || 'Jane Smith (Sales Specialist)' },
                  { value: 'neeraj_yadav', label: t('neerajYadavAdmin') || 'Neeraj Yadav (Administrator)' }
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('transferInboxTarget') || 'Transfer Inbox Target'}</label>
              <DropdownSelect 
                value={data.queueTarget || 'unassigned_inbox'}
                onChange={(val) => handleUpdate('queueTarget', val)}
                options={[
                  { value: 'unassigned_inbox', label: t('unassignedInboxQueue') || 'Unassigned Inbox Queue' },
                  { value: 'billing_team', label: t('billingSupportTeam') || 'Billing Support Team' },
                  { value: 'tech_support', label: t('technicalOperationsTeam') || 'Technical Operations Team' }
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('internalAssigneeNote') || 'Internal Assignee Agent Note'}</label>
              <textarea 
                rows={3}
                placeholder={t('handoffPlaceholder') || 'Handoff due to customer requesting manual enterprise pricing details.'}
                value={data.internalNote || ''}
                onChange={(e) => handleUpdate('internalNote', e.target.value)}
                className="w-full p-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none font-medium shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* END FLOW */}
        {type === 'end_flow' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider mb-1.5">{t('finalGoodbyeOptional') || 'Final Goodbye Message (Optional)'}</label>
              <RichVariableEditor
                fieldId="end_flow_body"
                multiLine={true}
                minHeight="88px"
                placeholder={t('goodbyePlaceholder') || 'e.g. Thank you for chatting with us. Goodbye!'}
                value={data.body || ''}
                onChange={(val) => handleUpdate('body', val)}
              />
              {renderUseVariablesButton('end_flow_body', true)}
              <p className="text-[10px] text-[#6B6B6B] font-medium leading-normal mt-1">
                {t('goodbyeExplanation') || 'If specified, this message will be sent to the customer before the conversation session terminates.'}
              </p>
            </div>
          </div>
        )}
        {type === 'create_deal' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('dealTitleName') || 'Deal title name'}</label>
              <RichVariableEditor
                fieldId="create_deal_dealName"
                multiLine={false}
                placeholder={t('dealTitlePlaceholder') || 'e.g. {{ contact.first_name }} - Enterprise License'}
                value={data.dealName || ''}
                onChange={(val) => handleUpdate('dealName', val)}
              />
              {renderUseVariablesButton('create_deal_dealName')}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('dealValueAmount') || 'Deal Value Amount'}</label>
              <input 
                type="number" 
                value={data.dealValue || ''}
                onChange={(e) => handleUpdate('dealValue', parseFloat(e.target.value) || 0)}
                placeholder="1500"
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('pipelineTargetStage') || 'Pipeline Target Stage'}</label>
              <DropdownSelect 
                value={data.stageId || 'new'}
                onChange={(val) => handleUpdate('stageId', val)}
                options={[
                  { value: 'new', label: t('newFreshLead') || 'New / Fresh Lead Stage' },
                  { value: 'contacted', label: t('contactedStage') || 'Contacted Stage' },
                  { value: 'demo_scheduled', label: t('demoScheduled') || 'Demo Booked / Scheduled' },
                  { value: 'won', label: t('dealWonClosed') || 'Deal Won / Closed Successful' }
                ]}
              />
            </div>
          </div>
        )}

        {/* BOOK APPOINTMENT */}
        {type === 'create_appointment' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('assignedStaff') || 'Assigned Staff Member'}</label>
              <DropdownSelect 
                value={data.staff_id || data.user_id || data.userId || ''}
                onChange={(val) => {
                  handleUpdate('staff_id', val);
                  handleUpdate('user_id', val);
                }}
                options={[
                  { value: '', label: t('anyAvailableStaff') || 'Any Available / Auto Round-Robin' },
                  ...staffMembers
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{t('customStaffVariable') || 'Dynamic Staff Variable'}</label>
              <input 
                id="resource_name"
                type="text"
                placeholder="e.g. {{selected_staff}} or Staff Name / Email"
                disabled={Boolean(data.staff_id || data.user_id || data.userId)}
                value={Boolean(data.staff_id || data.user_id || data.userId) ? '' : (data.resource_name || '')}
                onChange={(e) => handleUpdate('resource_name', e.target.value)}
                className={`w-full h-10 px-3 text-xs border rounded-lg outline-none transition-all font-medium shadow-3xs ${
                  Boolean(data.staff_id || data.user_id || data.userId)
                    ? 'bg-zinc-100/80 text-zinc-400 border-[#E8E8E6] cursor-not-allowed placeholder-zinc-300'
                    : 'bg-white text-black border-[#E8E8E6] focus:border-black focus:ring-1 focus:ring-black placeholder-[#A3A3A3]'
                }`}
              />
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                {Boolean(data.staff_id || data.user_id || data.userId)
                  ? (t('dynamicStaffDisabledHint') || 'Disabled because a specific staff member is assigned above.')
                  : (t('dynamicStaffHint') || 'Use a flow variable (e.g. selected_staff) or staff email when assigned dynamically.')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('calendarProvider') || 'Calendar Provider'}</label>
              <DropdownSelect 
                value={data.calendarProvider || 'built_in'}
                onChange={(val) => handleUpdate('calendarProvider', val)}
                options={[
                  { value: 'built_in', label: t('builtInCalendar') || 'WhatsOmni Calendar (Built-in)' },
                  { value: 'google_calendar', label: t('googleCalendar') || 'Google Calendar' }
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('meetingProvider') || 'Meeting Provider'}</label>
              <DropdownSelect 
                value={data.conferenceProvider || 'none'}
                onChange={(val) => handleUpdate('conferenceProvider', val)}
                options={[
                  { value: 'none', label: t('noneInPersonPhone') || 'None (In-Person / Phone)' },
                  { value: 'google_meet', label: t('googleMeet') || 'Google Meet' },
                  { value: 'zoom', label: t('zoomVideo') || 'Zoom Video' },
                  { value: 'teams', label: t('teamsVideo') || 'Microsoft Teams' }
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('dateVariable') || 'Date Variable'}</label>
              <DropdownSelect 
                value={data.dateVariable || ''}
                onChange={(val) => handleUpdate('dateVariable', val)}
                options={[
                  { value: '', label: t('selectDateVariable') || 'Select Date Variable...' },
                  ...variablesList.map(v => ({ value: v.value, label: v.label }))
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('timeVariable') || 'Time Variable'}</label>
              <DropdownSelect 
                value={data.timeVariable || ''}
                onChange={(val) => handleUpdate('timeVariable', val)}
                options={[
                  { value: '', label: t('selectTimeVariable') || 'Select Time Variable...' },
                  ...variablesList.map(v => ({ value: v.value, label: v.label }))
                ]}
              />
            </div>

            <div className="space-y-1.5">
              {/* @ts-ignore */}
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('bookingDurationMinutes') || 'Booking duration (minutes)'}</label>
              <input 
                type="number" 
                value={data.bookingDuration || 30}
                onChange={(e) => handleUpdate('bookingDuration', parseInt(e.target.value) || 30)}
                className="w-full h-10 px-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-black focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* UPDATE CONTACT */}
        {type === 'update_contact' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('updatesMapping') || 'Updates Mapping'}</label>
              
              {(data.updates || []).map((upd: any, idx: number) => {
                const handleUpdateRow = (key: string, value: any) => {
                  const copy = [...(data.updates || [])];
                  copy[idx] = { ...copy[idx], [key]: value };
                  handleUpdate('updates', copy);
                };

                const handleRemoveRow = () => {
                  const copy = (data.updates || []).filter((_: any, i: number) => i !== idx);
                  handleUpdate('updates', copy);
                };

                return (
                  <div key={idx} className="p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-md space-y-2.5 relative shadow-3xs hover:border-zinc-300 transition-all">
                    <button 
                      type="button" 
                      onClick={handleRemoveRow}
                      className="absolute right-2 top-2 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">{t('targetColumnField') || 'Target Column / Field'}</span>
                      <DropdownSelect 
                        value={upd.field || 'first_name'}
                        onChange={(val) => handleUpdateRow('field', val)}
                        options={[
                          { value: 'first_name', label: tCommon('firstName') || 'First Name' },
                          { value: 'last_name', label: tCommon('lastName') || 'Last Name' },
                          { value: 'email', label: tCommon('email') || 'Email Address' },
                          { value: 'phone', label: tCommon('phone') || 'Phone Number' },
                          { value: 'custom_fields.company', label: t('customFieldCompany') || 'Custom Field: Company' },
                          { value: 'custom_fields.role', label: t('customFieldRole') || 'Custom Field: Job Role' }
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">{t('valuePayload') || 'Value payload'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogFieldId(`update_value_${idx}`);
                            setDialogSearchQuery('');
                          }}
                          className="text-[10px] font-bold text-zinc-500 hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-zinc-400 hover:text-black" />
                          <span>Insert Variable</span>
                        </button>
                      </div>
                      <RichVariableEditor
                        fieldId={`update_value_${idx}`}
                        multiLine={false}
                        placeholder={t('targetTagPlaceholder') || 'e.g. Lead, Inbound, Warm'}
                        value={upd.value || ''}
                        onChange={(val) => handleUpdateRow('value', val)}
                        className="h-9 py-1 text-xs"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const copy = [...(data.updates || [])];
                  copy.push({ field: 'first_name', value: '' });
                  handleUpdate('updates', copy);
                }}
                className="w-full flex items-center justify-center gap-1.5 h-9 border border-dashed border-[#E8E8E6] text-xs font-bold text-zinc-700 hover:bg-[#FAFAFA] rounded-lg transition-colors cursor-pointer shadow-3xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('addFieldMappingRow') || 'Add Field Mapping Row'}
              </button>
            </div>
          </div>
        )}

        {/* KEYWORD TRIGGER FOR NODE (AVAILABLE ON ACTION / LOGIC NODES ONLY, NOT TRIGGER NODES) */}
        {!isTriggerNode && (
          <div className="pt-5 border-t border-[#E8E8E6] -mx-6 px-6 space-y-3.5">
            <div 
              onClick={() => handleUpdate('enable_trigger_words', !data.enable_trigger_words)}
              className="flex items-center justify-between p-3.5 bg-white hover:bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg cursor-pointer select-none transition-all group shadow-3xs"
            >
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-[#0A0A0A] group-hover:text-black transition-colors flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
                  Trigger Node by Keyword
                </span>
                <span className="block text-[10.5px] text-[#6B6B6B] font-medium leading-tight">
                  Jump directly to this node when a user matches specific keywords
                </span>
              </div>
              <div 
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  data.enable_trigger_words ? 'bg-[#0A0A0A]' : 'bg-[#E8E8E6]'
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    data.enable_trigger_words ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {data.enable_trigger_words && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-3.5 mt-2.5 animate-overlay-fade shadow-3xs">
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider block">
                    Trigger Words / Keywords
                  </label>
                  <input
                    type="text"
                    value={data.trigger_words || ''}
                    onChange={(e) => handleUpdate('trigger_words', e.target.value)}
                    placeholder="e.g. book, appointment, schedule, doctor"
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E8E8E6] rounded-md text-[#0A0A0A] placeholder:text-[#A0A0A0] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] outline-none transition-all font-medium shadow-3xs"
                  />
                  <p className="text-[10px] text-[#6B6B6B] font-medium leading-normal">
                    Separate multiple keywords with commas. If a user types any of these words in chat, the flow will instantly jump to execute this node.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider block">
                    Match Type
                  </label>
                  <DropdownSelect
                    value={data.trigger_words_match_type || 'contains'}
                    onChange={(val) => handleUpdate('trigger_words_match_type', val)}
                    options={[
                      { value: 'contains', label: 'Contains Keyword (e.g. "I want to book")' },
                      { value: 'exact', label: 'Exact Match Only (e.g. "book")' }
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connecting Node Routing Selectors */}
        {(() => {
          const outPorts = OUT_PORTS[type] || [];
          if (outPorts.length === 0) return null;

          return (
            <div className="pt-5 border-t border-[#E8E8E6] -mx-6 px-6 space-y-3.5">
              <div className="space-y-3.5">
                {outPorts.map((port: any) => {
                  const portId = port.id;
                  const currentEdge = edges.find((e) => 
                    e.source === selectedNodeId && 
                    (e.sourceHandle === portId || (!e.sourceHandle && portId === 'out'))
                  );
                  const currentTargetId = currentEdge ? currentEdge.target : '';

                  const nodeOptions = [
                    { 
                      value: '', 
                      label: '-- Disconnected --',
                      icon: <Unlink className="h-3.5 w-3.5 text-zinc-400" />
                    },
                    ...nodes
                      .filter((n) => n.id !== selectedNodeId)
                      .map((n) => {
                        const IconComp = (n.type && NODE_ICONS[n.type]) || HelpCircle;
                        return {
                          value: n.id,
                          label: `${getLocalNodeTitle((n.data?.title as string) || n.type || '')} (#${n.data?.node_identifier || n.id})`,
                          icon: (
                            <div className="h-5 w-5 rounded-md bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center text-[#0A0A0A] shrink-0">
                              <IconComp className="h-3 w-3 text-zinc-700" />
                            </div>
                          )
                        };
                      })
                  ];

                  const isConnected = !!currentTargetId;

                  return (
                    <div key={portId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9.5px] font-extrabold text-[#0A0A0A] uppercase tracking-wider">
                          {port.label}
                        </label>
                        {isConnected ? (
                          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">
                            Connected
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Unlinked
                          </span>
                        )}
                      </div>

                      <DropdownSelect
                        value={currentTargetId}
                        onChange={(targetId) => {
                          if (!targetId) {
                            const updatedEdges = edges.filter((e) => 
                              !(e.source === selectedNodeId && (e.sourceHandle === portId || (!e.sourceHandle && portId === 'out')))
                            );
                            setEdges(updatedEdges);
                            toast.success((t.has('portDisconnected') ? t('portDisconnected') : null) || `Disconnected ${port.label}`);
                          } else {
                            const existingEdge = edges.find((e) => 
                              e.source === selectedNodeId && (e.sourceHandle === portId || (!e.sourceHandle && portId === 'out'))
                            );

                            if (existingEdge) {
                              const updatedEdges = edges.map((e) => 
                                e.id === existingEdge.id ? { ...e, target: targetId } : e
                              );
                              setEdges(updatedEdges);
                            } else {
                              const newEdge: any = {
                                id: `e_${selectedNodeId}_${portId}_${targetId}_${Date.now()}`,
                                source: selectedNodeId || '',
                                sourceHandle: portId === 'out' ? undefined : portId,
                                target: targetId,
                                targetHandle: 'in',
                              };
                              setEdges([...edges, newEdge]);
                            }
                            toast.success((t.has('portConnected') ? t('portConnected') : null) || `Connected ${port.label}`);
                          }
                        }}
                        options={nodeOptions}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Delete / Actions strip */}
      <div className="p-6 bg-white border-t border-[#E8E8E6] shrink-0 flex items-center justify-center">
        {isTriggerNode ? (
          <div className="flex items-center justify-center gap-1.5 text-zinc-400 font-semibold text-xs select-none">
            <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>Starting root trigger cannot be deleted</span>
          </div>
        ) : (
          <button 
            onClick={() => {
              deleteNode(node.id);
              setSelectedNodeId(null);
              toast.success(t('deleteNodeSuccess') || 'Node deleted from canvas.');
            }}
            className="w-full flex items-center justify-center gap-2 h-10 px-4 bg-white border border-red-150 hover:bg-red-50/40 hover:border-red-200 text-red-600 transition-all font-semibold text-xs rounded-lg shadow-3xs cursor-pointer active:scale-[0.98]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteNode') || 'Delete Node from Canvas'}
          </button>
        )}
      </div>

      {/* Select Context Variable Dialog Modal Portal */}
      {dialogFieldId && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDialogFieldId(null);
              setDialogSearchQuery('');
            }
          }}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade"
        >
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-50 animate-modal-box text-left flex flex-col max-h-[85vh] overflow-hidden font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-[#0A0A0A]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('selectContextVariable') || 'Select Context Variable'}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setDialogFieldId(null);
                  setDialogSearchQuery('');
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="space-y-4 pt-4 flex-1 flex flex-col min-h-0">
              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1.5">{t('searchVariables') || 'Search Variables'}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={t('searchVariablesPlaceholder') || 'Search variables...'}
                    value={dialogSearchQuery}
                    onChange={(e) => setDialogSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Categorized Variable Grid */}
              <div className="flex-1 overflow-y-auto min-h-[180px] max-h-[340px] pr-1 space-y-4">
                {(() => {
                  const filtered = variablesList.filter(v => {
                    const varName = v.value.replace('{{ ', '').replace(' }}', '').trim();
                    const displayLabel = getDynamicVariableLabel(varName);
                    const q = dialogSearchQuery.toLowerCase();
                    return (
                      displayLabel.toLowerCase().includes(q) ||
                      varName.toLowerCase().includes(q) ||
                      (v.category && v.category.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-zinc-400 font-medium">
                        {t('noMatchingVariables') || 'No matching variables found'}
                      </div>
                    );
                  }

                  // Group by category
                  const categories = Array.from(new Set(filtered.map(v => v.category || 'General')));

                  return categories.map(cat => {
                    const catItems = filtered.filter(v => (v.category || 'General') === cat);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <h4 className="text-[9px] font-extrabold text-[#6B6B6B] uppercase tracking-wider px-0.5">
                          {cat}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catItems.map(v => {
                            const varName = v.value.replace('{{ ', '').replace(' }}', '').trim();
                            const displayLabel = getDynamicVariableLabel(varName);
                            return (
                              <button
                                key={v.value}
                                type="button"
                                onClick={() => handleDialogVariableSelect(varName)}
                                className="p-2.5 rounded-lg border border-[#E8E8E6] bg-white hover:bg-[#FAFAFA] hover:border-[#0A0A0A] cursor-pointer transition-all duration-150 shadow-3xs group/var flex flex-col text-left justify-between gap-1.5 select-none"
                              >
                                <div className="flex items-center justify-between gap-1.5 w-full">
                                  <span className="text-xs font-bold text-[#0A0A0A] group-hover/var:text-black tracking-tight truncate">
                                    {displayLabel}
                                  </span>
                                  <Plus className="h-3.5 w-3.5 text-zinc-400 group-hover/var:text-black shrink-0 transition-colors" />
                                </div>
                                <span className="text-[10px] font-mono text-[#6B6B6B] truncate font-medium">
                                  {`{{ ${varName} }}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Footer Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none shrink-0">
              <span className="text-[9px] text-[#6B6B6B] font-semibold">
                {variablesList.filter(v => {
                  const varName = v.value.replace('{{ ', '').replace(' }}', '').trim();
                  const displayLabel = getDynamicVariableLabel(varName);
                  const q = dialogSearchQuery.toLowerCase();
                  return (
                    displayLabel.toLowerCase().includes(q) ||
                    varName.toLowerCase().includes(q) ||
                    (v.category && v.category.toLowerCase().includes(q))
                  );
                }).length}  {t('variablesMatchingLabel') || 'variables matching'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDialogFieldId(null);
                  setDialogSearchQuery('');
                }}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {tCommon('close') || 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
