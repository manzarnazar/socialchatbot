'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface TenantShort {
  id: number;
  company_name: string;
}

interface RoleShort {
  id: number;
  name: string;
  display_name: string;
}

interface TenantUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  tenant_id: number;
  role_id: number;
  tenant?: TenantShort;
  role?: RoleShort;
}

interface PaginatedUsers {
  current_page: number;
  data: TenantUser[];
  last_page: number;
  per_page: number;
  total: number;
}

export default function UsersPage() {
  const t = useTranslations('Superadmin');
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Core State
  const [usersData, setUsersData] = useState<PaginatedUsers | null>(null);
  const [roles, setRoles] = useState<RoleShort[]>([]);
  const [tenants, setTenants] = useState<TenantShort[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'pending' | 'suspended'>('active');

  // Deletion Dialog State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<TenantUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Impersonate state
  const [impersonateLoadingId, setImpersonateLoadingId] = useState<number | null>(null);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
        tenant_id: tenantFilter,
      });

      const response = await fetchWithCsrf(`/admin/users?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setUsersData(data.users);
        setRoles(data.roles || []);
        setTenants(data.tenants || []);
        setCurrentPage(page);
      } else {
        throw new Error('Failed to load users');
      }
    } catch {
      toast.error(t('users.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [search, statusFilter, tenantFilter]);

  const openCreateModal = () => {
    setFormType('create');
    setSelectedUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setSelectedTenantId(tenants[0]?.id?.toString() || '');
    setSelectedRoleId(roles[0]?.id?.toString() || '');
    setSelectedStatus('active');
    setShowFormModal(true);
  };

  const openEditModal = (user: TenantUser) => {
    setFormType('edit');
    setSelectedUser(user);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
    setPassword('');
    setSelectedTenantId(user.tenant_id?.toString() || (tenants[0]?.id?.toString() || ''));
    setSelectedRoleId(user.role_id?.toString() || (roles[0]?.id?.toString() || ''));
    setSelectedStatus(user.status || 'active');
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenantId) {
      toast.error(t('users.fields.selectTenant'));
      return;
    }
    if (!selectedRoleId) {
      toast.error(t('users.fields.selectRole'));
      return;
    }

    setFormLoading(true);

    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        tenant_id: parseInt(selectedTenantId),
        role_id: parseInt(selectedRoleId),
        status: selectedStatus,
      };

      if (formType === 'create') {
        payload.password = password;
      } else if (password.trim() !== '') {
        payload.password = password;
      }

      const url = formType === 'create' ? '/admin/users' : `/admin/users/${selectedUser?.id}`;
      const method = formType === 'create' ? 'POST' : 'PUT';

      const response = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(t('users.saveSuccess'));
        setShowFormModal(false);
        fetchUsers(currentPage);
      } else {
        const d = await response.json();
        const errMap = d.errors || {};
        const firstErr = Object.values(errMap)[0] as string[];
        throw new Error(firstErr?.[0] || d.error || d.message || t('users.saveFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('users.saveFailed');
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (user: TenantUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);

    try {
      const response = await fetchWithCsrf(`/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('users.deleteSuccess'));
        setShowDeleteModal(false);
        fetchUsers(currentPage);
      } else {
        const d = await response.json().catch(() => ({}));
        throw new Error(d.message || d.error || t('users.deleteFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('users.deleteFailed');
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
      setUserToDelete(null);
    }
  };

  const handleImpersonate = (tenantId: number) => {
    setImpersonateLoadingId(tenantId);
    startTransition(async () => {
      try {
        const response = await fetchWithCsrf(`/admin/tenants/${tenantId}/impersonate`, {
          method: 'POST',
        });

        const data = await response.json();
        if (response.ok && data.redirect_url) {
          if (data.token) {
            localStorage.setItem('whatsomni_token', data.token);
          }
          const wId = data.user?.tenant_id || tenantId;
          if (wId) {
            localStorage.setItem('whatsomni_workspace_id', String(wId));
          }

          if (typeof document !== 'undefined') {
            const host = window.location.hostname;
            const cookieDomains = Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));
            cookieDomains.forEach(d => {
              document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
              document.cookie = `whatsomni_onboarding_completed=1; path=/; max-age=31536000; SameSite=Lax${d}`;
              document.cookie = `whatsomni_plan_selected=1; path=/; max-age=31536000; SameSite=Lax${d}`;
              if (wId) {
                document.cookie = `whatsomni_workspace_id=${wId}; path=/; max-age=31536000; SameSite=Lax${d}`;
              }
            });
          }

          toast.success(t('dashboard.messages.sessionStart'));
          window.location.href = data.redirect_url;
        } else {
          throw new Error(data.message || t('dashboard.messages.sessionStartFailed'));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('dashboard.messages.impersonateFailed');
        toast.error(msg);
      } finally {
        setImpersonateLoadingId(null);
      }
    });
  };

  // Custom styling mappings
  const statusOptions = [
    { value: '', label: t('users.allStatuses') },
    { value: 'active', label: t('users.statuses.active') },
    { value: 'pending', label: t('users.statuses.pending') },
    { value: 'suspended', label: t('users.statuses.suspended') }
  ];

  const tenantOptions = [
    { value: '', label: t('users.allWorkspaces') },
    ...tenants.map(tOpt => ({ value: tOpt.id.toString(), label: tOpt.company_name }))
  ];

  // Options mapping inside form modal selects
  const workspaceSelectOptions = tenants.map(tOpt => ({
    value: tOpt.id.toString(),
    label: tOpt.company_name
  }));

  const roleSelectOptions = roles.map(rOpt => ({
    value: rOpt.id.toString(),
    label: rOpt.display_name
  }));

  const modalStatusOptions = [
    { value: 'active', label: t('users.statuses.active') },
    { value: 'pending', label: t('users.statuses.pending') },
    { value: 'suspended', label: t('users.statuses.suspended') }
  ];

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto">

      {/* Search and Action Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 select-none">
        
        {/* Left Search / Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap flex-1 max-w-2xl">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
            />
          </div>

          <DropdownSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder={t('users.allStatuses')}
            options={statusOptions}
            className="w-full sm:w-auto min-w-[145px]"
          />

          <DropdownSelect
            value={tenantFilter}
            onChange={(val) => setTenantFilter(val)}
            placeholder={t('users.allWorkspaces')}
            options={tenantOptions}
            className="w-full sm:w-auto min-w-[180px]"
          />
        </div>

        {/* Right Action Button */}
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 h-9 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('users.addUser')}</span>
        </button>
      </div>

      {/* Users Directory Table Card Area */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader message={t('users.loading')} />
        </div>
      ) : !usersData || usersData.data.length === 0 ? (
        <div className="text-center py-20 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center p-6 select-none shadow-3xs animate-row-fade">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('users.noUsers')}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">{t('users.noUsersSub')}</p>
        </div>
      ) : (
        <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
          <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-550 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5">{t('users.userDetails')}</th>
                    <th className="px-6 py-3.5">{t('users.associatedWorkspace')}</th>
                    <th className="px-6 py-3.5">{t('users.role')}</th>
                    <th className="px-6 py-3.5">{t('users.status')}</th>
                    <th className="px-6 py-3.5">{t('users.createdDate')}</th>
                    <th className="px-6 py-3.5 text-right">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6] text-zinc-800">
                  {usersData.data.map((user) => {
                    return (
                      <tr key={user.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                        
                        {/* Name Details */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-zinc-955 text-xs">
                              {user.first_name} {user.last_name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 font-mono">
                              {user.email}
                            </span>
                          </div>
                        </td>

                        {/* Workspace (Tenant) */}
                        <td className="px-6 py-4 font-bold text-black">
                          {user.tenant?.company_name || '—'}
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${
                            user.role?.name === 'owner' 
                              ? 'bg-black border-black text-white' 
                              : 'bg-zinc-100 border-[#E8E8E6] text-zinc-650'
                          }`}>
                            {user.role?.display_name || t('users.operator')}
                          </span>
                        </td>

                        {/* Status dot */}
                        <td className="px-6 py-4 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              user.status === 'active' 
                                ? 'bg-emerald-500' 
                                : user.status === 'pending'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-rose-500'
                            }`} />
                            <span className="capitalize">{t(`users.statuses.${user.status}`)}</span>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 text-zinc-400 font-semibold text-[10px] font-mono">
                          {new Date(user.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            
                            {/* Impersonate */}
                            <button
                              onClick={() => handleImpersonate(user.tenant_id)}
                              disabled={impersonateLoadingId !== null}
                              title={t('users.impersonate')}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              {impersonateLoadingId === user.tenant_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center"
                              title={t('users.editDetails')}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => openDeleteDialog(user)}
                              className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                              title={t('users.deleteAccount')}
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

            {/* Pagination Controls */}
            {usersData.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-[#E8E8E6] px-6 py-3.5 bg-[#FAFAFA] select-none">
                <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">
                  {t('users.pageOf', { current: usersData.current_page, total: usersData.last_page, count: usersData.total })}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fetchUsers(usersData.current_page - 1)}
                    disabled={usersData.current_page === 1}
                    className="h-8 w-8 border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-600 hover:text-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => fetchUsers(usersData.current_page + 1)}
                    disabled={usersData.current_page === usersData.last_page}
                    className="h-8 w-8 border border-[#E8E8E6] rounded-[6px] bg-white hover:bg-zinc-50 text-zinc-600 hover:text-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-3xs"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* CREATE & EDIT FORM MODAL PORTAL */}
      {showFormModal && mounted && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="fixed inset-0" onClick={() => setShowFormModal(false)} />
          <form onSubmit={handleFormSubmit} className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {formType === 'create' ? t('users.addUser') : t('users.editUser')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Form Body */}
            <div className="space-y-4 pt-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('users.fields.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('users.placeholders.firstName')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('users.fields.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('users.placeholders.lastName')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('users.fields.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('users.placeholders.email')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('users.fields.password')}
                </label>
                <input
                  type="password"
                  required={formType === 'create'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('users.fields.passwordPlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors font-mono"
                />
                {formType === 'edit' && (
                  <span className="text-[9px] text-[#6B6B6B]/80 font-semibold leading-relaxed block mt-0.5">
                    {t('users.fields.passwordHelp')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Associated Workspace select */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('users.fields.tenant')}
                  </label>
                  <DropdownSelect
                    value={selectedTenantId}
                    onChange={(val) => setSelectedTenantId(val)}
                    placeholder={t('users.fields.selectTenant')}
                    options={workspaceSelectOptions}
                  />
                </div>

                {/* Access Role select */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('users.fields.role')}
                  </label>
                  <DropdownSelect
                    value={selectedRoleId}
                    onChange={(val) => setSelectedRoleId(val)}
                    placeholder={t('users.fields.selectRole')}
                    options={roleSelectOptions}
                  />
                </div>
              </div>

              {/* Account Status select */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('users.fields.status')}
                </label>
                <DropdownSelect
                  value={selectedStatus}
                  onChange={(val) => setSelectedStatus(val as 'active' | 'pending' | 'suspended')}
                  placeholder={t('users.fields.selectStatus')}
                  options={modalStatusOptions}
                />
              </div>

            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('users.cancel')}
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-md shadow-sm transition-all flex items-center justify-center min-w-[120px]"
              >
                {formLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : (formType === 'create' ? t('users.registerAccount') : t('users.saveProfiles'))}
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION DIALOG PORTAL */}
      {showDeleteModal && userToDelete && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="fixed inset-0" onClick={() => setShowDeleteModal(false)} />
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('users.deleteConfirmTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('users.deleteConfirmText', { name: `${userToDelete.first_name} ${userToDelete.last_name}` })}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer"
              >
                {t('users.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="h-9 px-4 bg-red-600 hover:bg-red-750 text-white font-semibold text-xs rounded-[6px] shadow-3xs transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {deleteLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : t('users.yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

