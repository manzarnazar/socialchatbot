/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, Link } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { useTranslations } from 'next-intl';
import {
  Workflow,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  MessageSquare,
  Radio,
  Sliders,
  ShoppingCart,
  Target,
  X
} from 'lucide-react';

interface FlowTemplate {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  trigger_type: string;
  trigger_keywords: string[] | null;
  definition: {
    nodes: any[];
    edges: any[];
  };
  nodes_count: number;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'Sales & Growth',
  'Engagement',
  'Bookings',
  'E-Commerce',
  'Customer Support',
  'Marketing',
  'General'
];

const getTriggerBadge = (type: string) => {
  switch (type) {
    case 'inbound_message':
      return { label: 'Inbound Message', color: 'text-blue-600', icon: MessageSquare };
    case 'keyword':
      return { label: 'Keyword Match', color: 'text-emerald-600', icon: Target };
    case 'ecommerceCheckoutAbandoned':
      return { label: 'Abandoned Cart', color: 'text-amber-600', icon: ShoppingCart };
    case 'contact_created':
      return { label: 'Contact Created', color: 'text-purple-600', icon: Layers };
    case 'deal_updated':
      return { label: 'Deal Updated', color: 'text-indigo-600', icon: Activity };
    case 'webhook_trigger':
    case 'webhook':
      return { label: 'API Webhook', color: 'text-cyan-600', icon: Radio };
    default:
      return { label: 'Inbound Message', color: 'text-zinc-600', icon: Zap };
  }
};

const STARTER_BLUEPRINT = {
  nodes: [
    {
      id: 'trigger_1',
      type: 'inbound_message',
      position: { x: 380, y: 50 },
      data: { title: 'Inbound Message Trigger', channel: 'all', is_root_trigger: true }
    },
    {
      id: 'msg_welcome',
      type: 'send_message',
      position: { x: 380, y: 180 },
      data: { title: 'Welcome Greeting', body: 'Hello! 👋 How can we help you today?' }
    },
    {
      id: 'end_node',
      type: 'end_flow',
      position: { x: 380, y: 320 },
      data: { title: 'End Flow', body: 'Conversation completed.' }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'msg_welcome', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e2', source: 'msg_welcome', target: 'end_node', sourceHandle: 'out', targetHandle: 'in' }
  ]
};

export default function AdminFlowTemplatesPage() {
  const router = useRouter();
  const t = useTranslations('Superadmin');

  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FlowTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<FlowTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Sales & Growth');
  const [description, setNewDescription] = useState('');
  const [triggerType, setTriggerType] = useState('inbound_message');
  const [triggerKeywordsText, setTriggerKeywordsText] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/admin/flow-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      } else {
        toast.error('Failed to load flow templates');
      }
    } catch (err: any) {
      toast.error('Error fetching flow templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Toggle Publish State
  const handleTogglePublish = async (tpl: FlowTemplate) => {
    try {
      const res = await fetchWithCsrf(`/admin/flow-templates/${tpl.id}/toggle-publish`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update template publish status.');
      }
      const data = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === tpl.id ? { ...t, is_published: data.is_published } : t))
      );
      toast.success(
        data.is_published
          ? (t('flowTemplates.publishedSuccess', { name: tpl.name }) || `Template "${tpl.name}" published`)
          : (t('flowTemplates.unpublishedSuccess', { name: tpl.name }) || `Template "${tpl.name}" unpublished`)
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setName('');
    setSlug('');
    setCategory('Sales & Growth');
    setNewDescription('');
    setTriggerType('inbound_message');
    setTriggerKeywordsText('');
    setIsPublished(true);
    setShowCreateModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (tpl: FlowTemplate) => {
    setEditingTemplate(tpl);
    setName(tpl.name);
    setSlug(tpl.slug);
    setCategory(tpl.category);
    setNewDescription(tpl.description || '');
    setTriggerType(tpl.trigger_type);
    setTriggerKeywordsText(Array.isArray(tpl.trigger_keywords) ? tpl.trigger_keywords.join(', ') : '');
    setIsPublished(tpl.is_published);
    setShowCreateModal(true);
  };

  // Handle Save (Create / Update)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('flowTemplates.nameRequired') || 'Please provide a template name.');
      return;
    }

    setActionLoading(true);
    try {
      const keywordsArray = triggerKeywordsText
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        category,
        description: description.trim() || null,
        trigger_type: triggerType,
        trigger_keywords: keywordsArray.length > 0 ? keywordsArray : null,
        is_published: isPublished
      };

      if (!editingTemplate) {
        payload.definition = STARTER_BLUEPRINT;
      }

      const url = editingTemplate
        ? `/admin/flow-templates/${editingTemplate.id}`
        : '/admin/flow-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save flow template.');
      }

      const data = await res.json();
      setShowCreateModal(false);

      if (!editingTemplate && data.template?.id) {
        toast.success(t('flowTemplates.createdSuccess', { name: data.template.name }) || `Template "${data.template.name}" created! Opening Canvas Studio...`);
        router.push(`/superadmin/flow-templates/${data.template.id}/edit`);
      } else {
        toast.success(t('flowTemplates.updatedSuccess') || 'Template updated successfully!');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Template
  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    setActionLoading(true);
    try {
      const res = await fetchWithCsrf(`/admin/flow-templates/${deleteConfirmTemplate.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete flow template.');
      }
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirmTemplate.id));
      toast.success(t('flowTemplates.deletedSuccess', { name: deleteConfirmTemplate.name }) || `Template "${deleteConfirmTemplate.name}" deleted.`);
      setDeleteConfirmTemplate(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.trigger_keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTrigger = triggerFilter === 'all' || tpl.trigger_type === triggerFilter;
    const matchesCategory = categoryFilter === 'all' || tpl.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && tpl.is_published) ||
      (statusFilter === 'draft' && !tpl.is_published);

    return matchesSearch && matchesTrigger && matchesCategory && matchesStatus;
  });

  const triggerOptions = [
    { value: 'all', label: t('flowTemplates.allTriggers') || 'All Triggers' },
    { value: 'inbound_message', label: 'Inbound Message' },
    { value: 'keyword', label: 'Keyword Match' },
    { value: 'ecommerceCheckoutAbandoned', label: 'Abandoned Cart' },
    { value: 'contact_created', label: 'Contact Created' },
    { value: 'deal_updated', label: 'Deal Updated' },
    { value: 'webhook', label: 'API Webhook' }
  ];

  const categoryOptions = [
    { value: 'all', label: t('flowTemplates.allCategories') || 'All Categories' },
    ...CATEGORIES.map((c) => ({ value: c, label: c }))
  ];

  const statusOptions = [
    { value: 'all', label: t('flowTemplates.allStatus') || 'All Status' },
    { value: 'published', label: t('flowTemplates.publishedOnly') || 'Published Only' },
    { value: 'draft', label: t('flowTemplates.draftsOnly') || 'Drafts Only' }
  ];

  return (
    <div className="w-full p-8 space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto text-left">
      
      {/* Search and Action Header Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
        {/* Left Search / Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('flowTemplates.searchPlaceholder') || 'Search templates by name, keywords...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
            />
          </div>

          <DropdownSelect
            options={categoryOptions}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            placeholder={t('flowTemplates.allCategories') || 'All Categories'}
            className="w-auto min-w-[145px]"
          />

          <DropdownSelect
            options={triggerOptions}
            value={triggerFilter}
            onChange={(val) => setTriggerFilter(val)}
            placeholder={t('flowTemplates.allTriggers') || 'All Triggers'}
            className="w-auto min-w-[140px]"
          />

          <DropdownSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            placeholder={t('flowTemplates.allStatus') || 'All Status'}
            className="w-auto min-w-[130px]"
          />

          <button
            onClick={loadData}
            title={t('flowTemplates.refreshTitle') || 'Refresh Templates'}
            className="flex items-center justify-center h-9 w-9 border border-[#E8E8E6] hover:bg-zinc-50 rounded-[6px] text-zinc-700 cursor-pointer shadow-3xs transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('flowTemplates.createTemplate') || 'Create Flow Template'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Table Area */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader message={t('flowTemplates.loading') || 'Loading Flow Templates...'} />
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-row-fade shadow-3xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">
            {searchQuery || triggerFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
              ? (t('flowTemplates.noMatching') || 'No matching Flow Templates')
              : (t('flowTemplates.noCreated') || 'No Flow Templates Created Yet')}
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">
            {searchQuery || triggerFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
              ? (t('flowTemplates.noMatchingDesc') || 'Try adjusting your search criteria or clear the filters to view all templates.')
              : (t('flowTemplates.noCreatedDesc') || 'Design prebuilt visual automation blueprints that tenant workspaces can deploy in 1-click.')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('flowTemplates.createTemplate') || 'Create Flow Template'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Data Table */
        <div className="space-y-4">
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5 w-64 max-w-[260px]">{t('flowTemplates.tableNameInfo') || 'Template Name & Info'}</th>
                    <th className="px-6 py-3.5">{t('flowTemplates.tableTrigger') || 'Trigger Type'}</th>
                    <th className="px-6 py-3.5">{t('flowTemplates.tableCategory') || 'Category'}</th>
                    <th className="px-6 py-3.5">{t('flowTemplates.tableCanvasSteps') || 'Canvas Steps'}</th>
                    <th className="px-6 py-3.5">{t('flowTemplates.tablePublishStatus') || 'Publish Status'}</th>
                    <th className="px-6 py-3.5 text-right">{t('flowTemplates.tableActions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {filteredTemplates.map((tpl) => {
                    const triggerInfo = getTriggerBadge(tpl.trigger_type);
                    const TriggerIcon = triggerInfo.icon;
                    const nodeCount = tpl.nodes_count || tpl.definition?.nodes?.length || 0;

                    return (
                      <tr
                        key={tpl.id}
                        className="hover:bg-[#FAFAFA]/70 transition-colors"
                      >
                        {/* Template Name & Description */}
                        <td className="px-6 py-4 w-64 max-w-[260px]">
                          <div className="flex flex-col text-left overflow-hidden">
                            <Link
                              href={`/superadmin/flow-templates/${tpl.id}/edit`}
                              title={tpl.name}
                              className="font-bold text-zinc-955 text-xs hover:underline inline-flex items-center gap-1.5 group cursor-pointer truncate max-w-full"
                            >
                              <span className="truncate">{tpl.name}</span>
                              <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                            {tpl.description && (
                              <span title={tpl.description} className="text-[10px] text-zinc-400 font-semibold mt-0.5 truncate block max-w-full">
                                {tpl.description}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 truncate max-w-full text-zinc-500">
                              <span className="text-[9px] font-mono font-semibold text-zinc-400 truncate">
                                {t('flowTemplates.slugLabel') || 'slug:'} {tpl.slug}
                              </span>
                              {tpl.trigger_keywords && tpl.trigger_keywords.length > 0 && (
                                <>
                                  <span className="text-zinc-300">•</span>
                                  <span className="text-[9px] font-mono font-semibold text-zinc-600 truncate">
                                    {t('flowTemplates.keywordsLabel') || 'KW:'} {tpl.trigger_keywords.join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Trigger Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1.5 font-bold text-xs ${triggerInfo.color}`}>
                            <TriggerIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{triggerInfo.label}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase bg-zinc-100 border border-zinc-200 text-zinc-650 px-2 py-0.5 rounded-[4px] tracking-wide inline-flex items-center">
                            {tpl.category}
                          </span>
                        </td>

                        {/* Canvas Steps Count */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-955 text-xs font-mono">
                              {nodeCount} {nodeCount === 1 ? (t('flowTemplates.nodeUnit') || 'node') : (t('flowTemplates.nodesUnit') || 'nodes')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                              {tpl.definition?.edges?.length || 0} {t('flowTemplates.connectionsUnit') || 'connections'}
                            </span>
                          </div>
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={tpl.is_published}
                            onClick={() => handleTogglePublish(tpl)}
                            title={tpl.is_published ? (t('flowTemplates.unpublishTitle') || 'Unpublish template') : (t('flowTemplates.publishTitle') || 'Publish template')}
                            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 ${
                              tpl.is_published ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                            }`}
                          >
                            <span
                              className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                                tpl.is_published ? 'translate-x-3.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/superadmin/flow-templates/${tpl.id}/edit`}
                              className="h-8 px-2.5 border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black rounded-[6px] text-xs font-semibold shadow-3xs inline-flex items-center gap-1.5 transition-all"
                              title={t('flowTemplates.openStudioTitle') || 'Open Visual Canvas Studio'}
                            >
                              <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                              <span>{t('flowTemplates.editCanvas') || 'Edit Canvas'}</span>
                            </Link>

                            <button
                              onClick={() => handleOpenEditModal(tpl)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              title={t('flowTemplates.editDetailsTitle') || 'Edit Template Details'}
                            >
                              <Sliders className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmTemplate(tpl)}
                              className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                              title={t('flowTemplates.deleteTitle') || 'Delete Flow Template'}
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

          {/* Footer summary */}
          <div className="flex items-center justify-between text-xs text-zinc-500 select-none px-1">
            <span>
              {t('flowTemplates.showingSummary', { count: filteredTemplates.length, total: templates.length }) || `Showing ${filteredTemplates.length} of ${templates.length} templates`}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              {t('flowTemplates.liveInLibrary') || 'Live in Workspace Flow Library'}
            </span>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FLOW TEMPLATE MODAL */}
      {mounted &&
        showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
          >
            <div
              className="bg-white border border-[#E8E8E6] rounded-xl max-w-lg w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section (Connected End-to-End Divider) */}
              <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                    <Workflow className="h-4 w-4 text-[#4AE54A]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-black uppercase tracking-wider">
                      {editingTemplate ? (t('flowTemplates.editModalTitle') || 'Edit Flow Template Details') : (t('flowTemplates.createModalTitle') || 'Create Flow Template')}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
                {/* Template Name */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowTemplates.nameLabel') || 'Template Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('flowTemplates.namePlaceholder') || 'e.g., Smart Lead Qualification & CRM Sync'}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowTemplates.slugInputLabel') || 'URL Slug (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={t('flowTemplates.slugPlaceholder') || 'e.g. vip-onboarding-concierge'}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-mono transition-colors"
                  />
                </div>

                {/* Category & Trigger Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                      {t('flowTemplates.categoryLabel') || 'Category'} <span className="text-red-500">*</span>
                    </label>
                    <DropdownSelect
                      value={category}
                      onChange={(val: string) => setCategory(val)}
                      options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                      {t('flowTemplates.triggerTypeLabel') || 'Trigger Type'} <span className="text-red-500">*</span>
                    </label>
                    <DropdownSelect
                      value={triggerType}
                      onChange={(val: string) => setTriggerType(val)}
                      options={[
                        { value: 'inbound_message', label: 'Inbound Message' },
                        { value: 'keyword', label: 'Keyword Match' },
                        { value: 'ecommerceCheckoutAbandoned', label: 'Abandoned Cart' },
                        { value: 'contact_created', label: 'Contact Created' },
                        { value: 'deal_updated', label: 'Deal Updated' },
                        { value: 'webhook', label: 'API Webhook' }
                      ]}
                    />
                  </div>
                </div>

                {/* Trigger Keywords */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowTemplates.keywordsInputLabel') || 'Trigger Keywords (Optional, comma separated)'}
                  </label>
                  <input
                    type="text"
                    value={triggerKeywordsText}
                    onChange={(e) => setTriggerKeywordsText(e.target.value)}
                    placeholder={t('flowTemplates.keywordsPlaceholder') || 'e.g. quote, price, hire'}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    {t('flowTemplates.descriptionLabel') || 'Description (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={t('flowTemplates.descriptionPlaceholder') || 'Brief description of what this workflow accomplishes for users...'}
                    className="w-full p-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                  />
                </div>

                {/* Publish Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="publishCheckbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4 accent-black rounded cursor-pointer"
                  />
                  <label htmlFor="publishCheckbox" className="text-xs font-bold text-zinc-900 cursor-pointer">
                    {t('flowTemplates.publishDirectly') || 'Publish immediately to workspace library'}
                  </label>
                </div>

                {/* Footer Action Strip */}
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer"
                  >
                    {t('flowTemplates.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !name.trim()}
                    className="bg-black text-white hover:bg-neutral-800 h-9 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingTemplate ? (t('flowTemplates.saveChanges') || 'Save Changes') : (t('flowTemplates.createAndOpen') || 'Create & Open Studio')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRMATION MODAL */}
      {mounted &&
        deleteConfirmTemplate &&
        createPortal(
          <div
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteConfirmTemplate(null);
            }}
          >
            <div
              className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section (Connected End-to-End Divider) */}
              <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                      {t('flowTemplates.deleteConfirmTitle') || 'Delete Flow Template?'}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTemplate(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  {t('flowTemplates.deleteConfirmText', { name: deleteConfirmTemplate.name }) || `Are you sure you want to delete "${deleteConfirmTemplate.name}"? Workspace users will no longer be able to clone or deploy this template.`}
                </p>
              </div>

              {/* Action Buttons Footer Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTemplate(null)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer"
                >
                  {t('flowTemplates.cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{t('flowTemplates.deleteButton') || 'Delete Template'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
