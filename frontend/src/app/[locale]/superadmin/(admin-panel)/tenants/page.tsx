'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Building2, 
  Search, 
  Plus, 
  CreditCard, 
  RefreshCw, 
  Settings2, 
  Trash2, 
  ExternalLink, 
  ArrowLeft, 
  ShieldAlert, 
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useHeaderStore } from '@/store/useHeaderStore';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { useTranslations } from 'next-intl';

interface Plan {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
}

interface Tenant {
  id: number;
  company_name: string;
  team_size: string;
  industry_category: string;
  status: string; // active, suspended, trial
  plan_id: number | null;
  currency_id: number | null;
  created_at: string;
  plan?: Plan | null;
  currency?: Currency | null;
  owner?: TenantUser | null;
}

interface TenantUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

export default function TenantsPage() {
  const t = useTranslations('Superadmin');
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // Impersonate transition
  const [, startTransition] = useTransition();

  // Page View state: list, create, manage
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');

  // Create Form State
  const [createLoading, setCreateLoading] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTeamSize, setNewTeamSize] = useState('1');
  const [newIndustry, setNewIndustry] = useState('E-Commerce');
  const [newPlanId, setNewPlanId] = useState('');
  const [newCurrencyId, setNewCurrencyId] = useState('');
  const [newStatus, setNewStatus] = useState('trial');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Selected Tenant Details State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedTenantUsers, setSelectedTenantUsers] = useState<TenantUser[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Edit Form State (for full screen view)
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editCurrencyId, setEditCurrencyId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Impersonate state per tenant id
  const [impersonateLoadingId, setImpersonateLoadingId] = useState<number | null>(null);

  // Delete state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { setCustomHeader } = useHeaderStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, plansRes, currenciesRes] = await Promise.all([
        fetchWithCsrf('/admin/tenants'),
        fetchWithCsrf('/admin/plans'),
        fetchWithCsrf('/admin/currencies'),
      ]);

      if (tenantsRes.ok && plansRes.ok && currenciesRes.ok) {
        const tenantsData = await tenantsRes.json();
        const plansData = await plansRes.json();
        const currenciesData = await currenciesRes.json();

        setTenants(tenantsData.tenants || []);
        setPlans(plansData.plans || []);
        setCurrencies(currenciesData.currencies || []);
      }
    } catch {
      toast.error(t('dashboard.messages.syncLedgerFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('search');
      if (query) {
        setSearch(query);
      }
    }
    fetchData();
  }, []);

  // Header switcher matching AI agent screen
  useEffect(() => {
    if (view === 'list') {
      setCustomHeader(null);
    } else {
      const headerTitle = view === 'create' 
        ? t('dashboard.createTenant')
        : `${t('dashboard.manage')}: ${selectedTenant?.company_name || ''}`;

      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => {
                setView('list');
                setSelectedTenant(null);
              }}
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {headerTitle}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setSelectedTenant(null);
              }}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {t('dashboard.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('form.tenant-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={createLoading || editLoading}
              className="h-9 px-4 bg-zinc-955 hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {(createLoading || editLoading) && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>{view === 'manage' ? t('dashboard.saveChanges') : t('dashboard.createTenant')}</span>
            </button>
          </div>
        </header>
      );
    }

    return () => {
      setCustomHeader(null);
    };
  }, [
    view,
    createLoading,
    editLoading,
    selectedTenant,
  ]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const response = await fetchWithCsrf('/admin/tenants', {
        method: 'POST',
        body: JSON.stringify({
          company_name: newCompanyName,
          team_size: newTeamSize,
          industry_category: newIndustry,
          plan_id: newPlanId ? Number(newPlanId) : null,
          currency_id: newCurrencyId ? Number(newCurrencyId) : null,
          status: newStatus,
          first_name: newFirstName,
          last_name: newLastName,
          email: newEmail,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('dashboard.messages.registerSuccess'));
        setView('list');
        // Reset form fields
        setNewCompanyName('');
        setNewTeamSize('1');
        setNewIndustry('E-Commerce');
        setNewPlanId('');
        setNewCurrencyId('');
        setNewStatus('trial');
        setNewFirstName('');
        setNewLastName('');
        setNewEmail('');
        setNewPassword('');
        fetchData();
      } else {
        throw new Error(data.message || t('dashboard.messages.registerFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard.messages.registerFailed');
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenDetail = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditCompanyName(tenant.company_name);
    setEditPlanId(tenant.plan_id ? String(tenant.plan_id) : '');
    setEditCurrencyId(tenant.currency_id ? String(tenant.currency_id) : '');
    setEditStatus(tenant.status);
    setSelectedTenantUsers([]);
    setView('manage');
    setDetailLoading(true);

    try {
      const response = await fetchWithCsrf(`/admin/tenants/${tenant.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTenantUsers(data.users || []);
      }
    } catch {
      toast.error(t('dashboard.messages.syncUsersFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setEditLoading(true);

    try {
      const response = await fetchWithCsrf(`/admin/tenants/${selectedTenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          company_name: editCompanyName,
          plan_id: editPlanId ? Number(editPlanId) : null,
          currency_id: editCurrencyId ? Number(editCurrencyId) : null,
          status: editStatus,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('dashboard.messages.syncSuccess'));
        setView('list');
        setSelectedTenant(null);
        fetchData();
      } else {
        throw new Error(data.message || t('dashboard.messages.syncFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard.messages.updateFailed');
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetchWithCsrf(`/admin/tenants/${selectedTenant.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('dashboard.messages.deleteSuccess'));
        setIsDeleteConfirmOpen(false);
        setView('list');
        setSelectedTenant(null);
        fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.message || t('dashboard.messages.deleteRejected'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard.messages.deleteFailed');
      toast.error(msg);
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

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.company_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shadow-[0_0_6px_#4AE54A] animate-pulse shrink-0" />
            <span>{t('dashboard.active')}</span>
          </div>
        );
      case 'trial':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 select-none">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{t('dashboard.trial')}</span>
          </div>
        );
      case 'suspended':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 select-none">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span>{t('dashboard.suspended')}</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
            <span className="capitalize">{status}</span>
          </div>
        );
    }
  };

  if (loading) {
    return <SimpleLoader message={t('dashboard.loading')} />;
  }

  return (
    <div className="w-full text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1">
      {/* 1. TABLE LIST & VIEW ALL */}
      {view === 'list' && (
        <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
          
          {/* Search and Action Header Row (Styled exactly like Users) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 select-none">
            
            {/* Left Search / Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-lg">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('dashboard.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                />
              </div>

              <DropdownSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                placeholder={t('dashboard.allStatuses')}
                options={[
                  { value: '', label: t('dashboard.allStatuses') },
                  { value: 'active', label: t('dashboard.active') },
                  { value: 'trial', label: t('dashboard.trial') },
                  { value: 'suspended', label: t('dashboard.suspended') }
                ]}
                className="w-full sm:w-auto min-w-[145px]"
              />
            </div>

            {/* Right Action Button */}
            <button
              onClick={() => setView('create')}
              className="flex items-center gap-1.5 px-4 h-9 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('dashboard.createTenant')}</span>
            </button>
          </div>

          {/* Tenants Registry Datatable */}
          {filteredTenants.length === 0 ? (
            <div className="p-16 text-center space-y-3 border border-[#E8E8E6] rounded-[10px] bg-white shadow-3xs">
              <Building2 className="h-10 w-10 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-405 font-semibold">{t('dashboard.noWorkspacesFound')}</p>
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
              <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                        <th className="px-6 py-3.5">{t('dashboard.tenantDetails')}</th>
                        <th className="px-6 py-3.5">{t('dashboard.activePlan')}</th>
                        <th className="px-6 py-3.5">{t('dashboard.status')}</th>
                        <th className="px-6 py-3.5">{t('dashboard.createdDate')}</th>
                        <th className="px-6 py-3.5 text-right">{t('dashboard.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6] text-zinc-850">
                      {filteredTenants.map((tenant) => (
                        <tr 
                          key={tenant.id}
                          onClick={() => handleOpenDetail(tenant)}
                          className="hover:bg-[#FAFAFA]/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-zinc-955 text-xs">
                                {tenant.company_name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 font-mono">
                                #{tenant.id} • {tenant.industry_category} • {tenant.team_size}{tenant.owner ? ` • ${tenant.owner.email}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                              <CreditCard className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span>{tenant.plan?.name || t('dashboard.noPlan')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{getStatusIndicator(tenant.status)}</td>
                          <td className="px-6 py-4 text-zinc-455 font-semibold text-[10px] font-mono">
                            {new Date(tenant.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {/* Manage Details View Trigger */}
                              <button
                                onClick={() => handleOpenDetail(tenant)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center"
                                title={t('dashboard.manage')}
                              >
                                <Settings2 className="h-4 w-4" />
                              </button>

                              {/* Impersonate Session Trigger */}
                              <button
                                onClick={() => handleImpersonate(tenant.id)}
                                disabled={impersonateLoadingId !== null}
                                className="p-1.5 text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-[6px] transition-all cursor-pointer inline-flex items-center justify-center"
                                title={t('dashboard.impersonate')}
                              >
                                {impersonateLoadingId === tenant.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-4 w-4" />
                                )}
                              </button>

                              {/* Delete Tenant Trigger */}
                              <button
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={t('dashboard.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          )}
        </div>
      )}

      {/* 2. CREATE VIEW (FULL SCREEN GRID LAYOUT) */}
      {view === 'create' && (
        <form onSubmit={handleCreateTenant} className="tenant-form w-full bg-white animate-fade-in select-none">
          <div className="w-full">
            
            {/* Company Info section */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('dashboard.companyProfile')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('dashboard.companyProfileDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.companyName')}</label>
                  <input 
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.teamSize')}</label>
                    <DropdownSelect
                      value={newTeamSize}
                      onChange={(val) => setNewTeamSize(val)}
                      options={[
                        { value: '1', label: t('dashboard.options.member_1') },
                        { value: '2-5', label: t('dashboard.options.members_2_5') },
                        { value: '6-15', label: t('dashboard.options.members_6_15') },
                        { value: '16-50', label: t('dashboard.options.members_16_50') },
                        { value: '50+', label: t('dashboard.options.members_50_plus') }
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.industryCategory')}</label>
                    <DropdownSelect
                      value={newIndustry}
                      onChange={(val) => setNewIndustry(val)}
                      options={[
                        { value: 'E-Commerce', label: t('dashboard.options.ecommerce') },
                        { value: 'Real Estate', label: t('dashboard.options.realestate') },
                        { value: 'SaaS / Software', label: t('dashboard.options.saas') },
                        { value: 'Healthcare', label: t('dashboard.options.healthcare') },
                        { value: 'Education', label: t('dashboard.options.education') },
                        { value: 'Other', label: t('dashboard.options.other') }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.assignedPlan')}</label>
                    <DropdownSelect
                      value={newPlanId}
                      onChange={(val) => setNewPlanId(val)}
                      placeholder={t('dashboard.options.defaultFreePlan')}
                      options={[
                        { value: '', label: t('dashboard.options.defaultFreePlan') },
                        ...plans.map(p => ({ value: String(p.id), label: p.name }))
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.workspaceCurrency')}</label>
                    <DropdownSelect
                      value={newCurrencyId}
                      onChange={(val) => setNewCurrencyId(val)}
                      placeholder={t('dashboard.options.defaultUsdCurrency')}
                      options={[
                        { value: '', label: t('dashboard.options.defaultUsdCurrency') },
                        ...currencies.map(c => ({ value: String(c.id), label: `${c.code} (${c.symbol})` }))
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.initialStatus')}</label>
                    <DropdownSelect
                      value={newStatus}
                      onChange={(val) => setNewStatus(val)}
                      options={[
                        { value: 'trial', label: t('dashboard.trial') },
                        { value: 'active', label: t('dashboard.active') },
                        { value: 'suspended', label: t('dashboard.suspended') }
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Owner Details Section */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('dashboard.administratorAccount')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('dashboard.administratorAccountDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.firstName')}</label>
                    <input 
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Alice"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.lastName')}</label>
                    <input 
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Smith"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.emailAddress')}</label>
                    <input 
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="alice@acme.org"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.initialPassword')}</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* 3. MANAGE VIEW (FULL SCREEN VIEW FOR TENANT DETAILS) */}
      {view === 'manage' && selectedTenant && (
        <form onSubmit={handleUpdateTenant} className="tenant-form w-full bg-white animate-fade-in select-none">
          <div className="w-full">
            
            {/* Section 1: Tenant Information */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('dashboard.workspaceSettings')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('dashboard.workspaceSettingsDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.companyName')}</label>
                  <input 
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.activePlan')}</label>
                    <DropdownSelect
                      value={editPlanId}
                      onChange={(val) => setEditPlanId(val)}
                      placeholder={t('dashboard.noPlan')}
                      options={[
                        { value: '', label: t('dashboard.noPlan') },
                        ...plans.map(p => ({ value: String(p.id), label: p.name }))
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.workspaceCurrency')}</label>
                    <DropdownSelect
                      value={editCurrencyId}
                      onChange={(val) => setEditCurrencyId(val)}
                      placeholder={t('dashboard.noCurrency')}
                      options={[
                        { value: '', label: t('dashboard.noCurrency') },
                        ...currencies.map(c => ({ value: String(c.id), label: `${c.code} (${c.symbol})` }))
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{t('dashboard.subscriptionStatus')}</label>
                    <DropdownSelect
                      value={editStatus}
                      onChange={(val) => setEditStatus(val)}
                      options={[
                        { value: 'active', label: t('dashboard.active') },
                        { value: 'trial', label: t('dashboard.trial') },
                        { value: 'suspended', label: t('dashboard.suspended') }
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Workspace Users */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('dashboard.workspaceUsers')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('dashboard.workspaceUsersDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                {detailLoading ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-400 mx-auto" />
                  </div>
                ) : selectedTenantUsers.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-semibold">{t('dashboard.noUsersRegistered')}</p>
                ) : (
                  <div className="border border-[#E8E8E6] rounded-[8px] overflow-hidden bg-white shadow-3xs">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-555 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-2.5">{t('dashboard.userProfile')}</th>
                          <th className="px-4 py-2.5">{t('dashboard.emailAddress')}</th>
                          <th className="px-4 py-2.5 text-right">{t('dashboard.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] text-zinc-700 font-semibold">
                        {selectedTenantUsers.map(user => (
                          <tr key={user.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-900 font-bold">{user.first_name} {user.last_name}</td>
                            <td className="px-4 py-3 font-mono text-zinc-500">{user.email}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                user.status === 'active' 
                                  ? 'bg-[#E8FDE8] border-[#4AE54A]/25 text-emerald-800' 
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                              }`}>
                                {user.status === 'active' ? t('dashboard.active') : user.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Operations & Danger Zone */}
            <div className="px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">{t('dashboard.operations')}</h3>
                <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">{t('dashboard.operationsDesc')}</p>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleImpersonate(selectedTenant.id)}
                    disabled={impersonateLoadingId !== null}
                    className="flex items-center gap-1.5 h-9 px-4 bg-[#E8FDE8] text-emerald-800 hover:bg-[#d8fcd8] border border-[#4AE54A]/30 text-xs font-bold rounded-[6px] transition-all cursor-pointer disabled:opacity-50 select-none shadow-3xs"
                  >
                    {impersonateLoadingId === selectedTenant.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <>
                        <span>{t('dashboard.impersonate')}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex items-center gap-1.5 h-9 px-4 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-[6px] transition-all cursor-pointer select-none shadow-3xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>{t('dashboard.deleteTenant')}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* DELETE CONFIRMATION DIALOG PORTAL */}
      {isDeleteConfirmOpen && selectedTenant && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div className="fixed inset-0" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('dashboard.deleteConfirmTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('dashboard.deleteConfirmText', { name: selectedTenant.company_name })}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteTenant}
                className="bg-red-650 hover:bg-red-700 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('dashboard.yesDelete')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
