'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Coins, 
  Plus, 
  Trash2, 
  X, 
  RefreshCw, 
  Search, 
  Star, 
  Building2, 
  Inbox,
  Pencil,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
  payment_gateway?: string;
  is_active: boolean;
  is_default: boolean;
  pricing_count?: number;
  tenant_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface SupportedGateway {
  slug: string;
  name: string;
  logo: string;
  is_configured: boolean;
  enabled: boolean;
  supported_currencies?: string[] | null;
}

const defaultGateways: SupportedGateway[] = [
  { slug: 'stripe', name: 'Stripe', logo: '/payments/stripe.png', is_configured: true, enabled: true },
  { slug: 'razorpay', name: 'Razorpay', logo: '/payments/razorpay.png', is_configured: true, enabled: true },
  { slug: 'paystack', name: 'Paystack', logo: '/payments/paystack.png', is_configured: true, enabled: true, supported_currencies: ['NGN', 'GHS', 'ZAR', 'KES', 'USD'] },
  { slug: 'flutterwave', name: 'Flutterwave', logo: '/payments/flutterwave.png', is_configured: true, enabled: false },
  { slug: 'paypal', name: 'PayPal', logo: '/payments/paypal.svg', is_configured: true, enabled: false, supported_currencies: ['AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'] },
  { slug: 'paddle', name: 'Paddle', logo: '/payments/paddle.png', is_configured: true, enabled: true, supported_currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'JPY', 'NZD', 'SGD', 'SEK', 'DKK', 'NOK', 'PLN', 'BRL', 'INR'] },
  { slug: 'mercadopago', name: 'Mercado Pago', logo: '/payments/mercadopago.png', is_configured: true, enabled: false, supported_currencies: ['ARS', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU', 'USD'] },
  { slug: 'myfatoorah', name: 'MyFatoorah', logo: '/payments/myfatoorah.png', is_configured: true, enabled: false, supported_currencies: ['KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'USD', 'EUR', 'GBP'] },
];

export default function CurrenciesPage() {
  const t = useTranslations('Superadmin');

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [supportedGateways, setSupportedGateways] = useState<SupportedGateway[]>(defaultGateways);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Add Currency Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newPaymentGateway, setNewPaymentGateway] = useState('stripe');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Edit Currency Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currencyToEdit, setCurrencyToEdit] = useState<Currency | null>(null);
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [editPaymentGateway, setEditPaymentGateway] = useState('stripe');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Switch Primary Currency Modal state
  const [isSwitchPrimaryModalOpen, setIsSwitchPrimaryModalOpen] = useState(false);
  const [targetPrimaryCurrency, setTargetPrimaryCurrency] = useState<Currency | null>(null);
  const [switchLoading, setSwitchLoading] = useState(false);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/admin/currencies');
      if (res.ok) {
        const data = await res.json();
        setCurrencies(data.currencies || []);
        if (data.supported_gateways && Array.isArray(data.supported_gateways)) {
          setSupportedGateways(data.supported_gateways);
        }
      } else {
        toast.error(t('currencies.loadFailed'));
      }
    } catch {
      toast.error(t('currencies.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleToggleActive = async (currency: Currency) => {
    if (currency.is_default && currency.is_active) {
      toast.error(t('currencies.cannotDeactivatePrimary'));
      return;
    }

    setActionLoadingId(currency.id);
    try {
      const res = await fetchWithCsrf(`/admin/currencies/${currency.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_active: !currency.is_active,
        }),
      });

      if (res.ok) {
        toast.success(t('currencies.updateSuccess'));
        fetchCurrencies();
      } else {
        const err = await res.json();
        toast.error(err.message || t('currencies.updateFailed'));
      }
    } catch {
      toast.error(t('currencies.updateFailed'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInitiateSetDefault = (currency: Currency) => {
    if (currency.is_default) return;
    setTargetPrimaryCurrency(currency);
    setIsSwitchPrimaryModalOpen(true);
  };

  const handleConfirmSwitchPrimary = async () => {
    if (!targetPrimaryCurrency) return;

    setSwitchLoading(true);
    try {
      const res = await fetchWithCsrf(`/admin/currencies/${targetPrimaryCurrency.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_default: true,
          is_active: true,
        }),
      });

      if (res.ok) {
        toast.success(t('currencies.primaryUpdated'));
        setIsSwitchPrimaryModalOpen(false);
        setTargetPrimaryCurrency(null);
        fetchCurrencies();
      } else {
        const err = await res.json();
        toast.error(err.message || t('currencies.updateFailed'));
      }
    } catch {
      toast.error(t('currencies.updateFailed'));
    } finally {
      setSwitchLoading(false);
    }
  };

  const gatewayList = supportedGateways.length > 0 ? supportedGateways : defaultGateways;
  const gatewayOptions = gatewayList.map((gw) => ({
    value: gw.slug,
    label: gw.name,
    icon: (
      <div className="w-5 h-5 rounded-[4px] overflow-hidden flex items-center justify-center bg-white border border-[#E8E8E6] shrink-0 shadow-3xs p-0.5">
        <img src={gw.logo} alt={gw.name} className="w-full h-full object-contain" />
      </div>
    ),
    disabled: !gw.is_configured,
    badge: !gw.is_configured ? t('currencies.notConfigured') : undefined,
  }));

  const isEditGatewayIncompatible = useMemo(() => {
    if (!currencyToEdit) return false;
    const gw = gatewayList.find((g) => g.slug === editPaymentGateway);
    if (gw?.supported_currencies && Array.isArray(gw.supported_currencies)) {
      return !gw.supported_currencies.includes(currencyToEdit.code.toUpperCase());
    }
    return false;
  }, [currencyToEdit, editPaymentGateway, gatewayList]);

  const isAddGatewayIncompatible = useMemo(() => {
    if (!newCode.trim()) return false;
    const gw = gatewayList.find((g) => g.slug === newPaymentGateway);
    if (gw?.supported_currencies && Array.isArray(gw.supported_currencies)) {
      return !gw.supported_currencies.includes(newCode.trim().toUpperCase());
    }
    return false;
  }, [newCode, newPaymentGateway, gatewayList]);

  const handleOpenAdd = () => {
    const firstConfigured = gatewayList.find((g) => g.is_configured)?.slug || 'stripe';
    setNewPaymentGateway(firstConfigured);
    setNewCode('');
    setNewSymbol('');
    setNewName('');
    setNewIsActive(true);
    setNewIsDefault(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (curr: Currency) => {
    setCurrencyToEdit(curr);
    setEditName(curr.name);
    setEditSymbol(curr.symbol);
    setEditPaymentGateway(curr.payment_gateway || 'stripe');
    setEditIsActive(curr.is_active);
    setIsEditModalOpen(true);
  };

  const handleUpdateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currencyToEdit) return;
    if (!editName.trim() || !editSymbol.trim()) {
      toast.error(t('currencies.enterNameAndSymbol'));
      return;
    }

    const targetGw = gatewayList.find((g) => g.slug === editPaymentGateway);
    if (targetGw && !targetGw.is_configured) {
      toast.error(`"${targetGw.name}" is not configured. Please select a configured payment gateway.`);
      return;
    }

    if (isEditGatewayIncompatible) {
      toast.error(
        editPaymentGateway === 'paypal'
          ? `PayPal Subscriptions does not support ${currencyToEdit.code}. Please select Razorpay or Stripe.`
          : `"${targetGw?.name}" does not support recurring subscriptions in ${currencyToEdit.code}.`
      );
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetchWithCsrf(`/admin/currencies/${currencyToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          symbol: editSymbol.trim(),
          payment_gateway: editPaymentGateway,
          is_active: editIsActive,
        }),
      });

      if (res.ok) {
        toast.success(t('currencies.updateSuccess'));
        setIsEditModalOpen(false);
        setCurrencyToEdit(null);
        fetchCurrencies();
      } else {
        const err = await res.json();
        toast.error(err.message || t('currencies.updateFailed'));
      }
    } catch {
      toast.error(t('currencies.updateFailed'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newSymbol.trim() || !newName.trim()) {
      toast.error(t('currencies.fillAllFields'));
      return;
    }

    const targetGw = gatewayList.find((g) => g.slug === newPaymentGateway);
    if (targetGw && !targetGw.is_configured) {
      toast.error(`"${targetGw.name}" is not configured. Please select a configured payment gateway.`);
      return;
    }

    if (isAddGatewayIncompatible) {
      toast.error(
        newPaymentGateway === 'paypal'
          ? `PayPal Subscriptions does not support ${newCode.toUpperCase()}. Please select Razorpay or Stripe.`
          : `"${targetGw?.name}" does not support recurring subscriptions in ${newCode.toUpperCase()}.`
      );
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetchWithCsrf('/admin/currencies', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          symbol: newSymbol.trim(),
          name: newName.trim(),
          payment_gateway: newPaymentGateway,
          is_active: newIsActive,
          is_default: newIsDefault,
        }),
      });

      if (res.ok) {
        toast.success(t('currencies.createSuccess'));
        setIsAddModalOpen(false);
        setNewCode('');
        setNewSymbol('');
        setNewName('');
        const firstConfigured = gatewayList.find((g) => g.is_configured)?.slug || 'stripe';
        setNewPaymentGateway(firstConfigured);
        setNewIsActive(true);
        setNewIsDefault(false);
        fetchCurrencies();
      } else {
        const err = await res.json();
        toast.error(err.message || t('currencies.updateFailed'));
      }
    } catch {
      toast.error(t('currencies.updateFailed'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteCurrency = async () => {
    if (!currencyToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetchWithCsrf(`/admin/currencies/${currencyToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('currencies.deleteSuccess'));
        setIsDeleteModalOpen(false);
        setCurrencyToDelete(null);
        fetchCurrencies();
      } else {
        const err = await res.json();
        toast.error(err.message || t('currencies.deleteFailed'));
      }
    } catch {
      toast.error(t('currencies.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCurrencies = currencies.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = 
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return c.is_active;
    if (statusFilter === 'disabled') return !c.is_active;
    if (statusFilter === 'default') return c.is_default;
    return true;
  });

  if (loading) {
    return <SimpleLoader message={t('dashboard.loading')} />;
  }

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-zinc-750 selection:bg-zinc-100 select-none animate-fade-in flex flex-col min-h-0 flex-1 overflow-y-auto">
      
      {/* Search and Action Header Row (Strictly aligned with Design Guidelines & Contacts CRM) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 select-none">
        
        {/* Left Search / Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap flex-1 max-w-2xl">
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
            placeholder={t('currencies.allStatuses')}
            options={[
              { value: '', label: t('currencies.allStatuses') },
              { value: 'active', label: t('currencies.active') },
              { value: 'disabled', label: t('currencies.disabled') },
              { value: 'default', label: t('currencies.defaultBadge') },
            ]}
            className="w-full sm:w-auto min-w-[145px]"
          />
        </div>

        {/* Right Action Button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs hover:shadow-xs cursor-pointer transition-all self-start sm:self-auto shrink-0 active:scale-99"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('currencies.addCurrency')}</span>
        </button>
      </div>

      {/* Currencies Datatable */}
      {filteredCurrencies.length === 0 ? (
        <div className="p-16 text-center space-y-3 border border-[#E8E8E6] rounded-[10px] bg-white shadow-3xs flex flex-col items-center justify-center select-none animate-row-fade">
          <Inbox className="h-10 w-10 text-zinc-300 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('currencies.noCurrencies')}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">{t('currencies.noCurrenciesDesc')}</p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-3xs hover:shadow-xs cursor-pointer transition-all active:scale-99"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('currencies.addCurrency')}</span>
          </button>
        </div>
      ) : (
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                    <th className="px-6 py-3.5">{t('currencies.code')}</th>
                    <th className="px-6 py-3.5">{t('currencies.name')}</th>
                    <th className="px-6 py-3.5">{t('currencies.symbol')}</th>
                    <th className="px-6 py-3.5">{t('currencies.paymentGateway')}</th>
                    <th className="px-6 py-3.5">{t('currencies.tenants')}</th>
                    <th className="px-6 py-3.5 text-center">{t('currencies.primary')}</th>
                    <th className="px-6 py-3.5 text-center">{t('currencies.active')}</th>
                    <th className="px-6 py-3.5 text-right">{t('currencies.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E6]">
                  {filteredCurrencies.map((curr) => (
                    <tr
                      key={curr.id}
                      className={`transition-colors group animate-row-fade ${
                        curr.is_default
                          ? 'bg-amber-50/50 hover:bg-amber-50/80'
                          : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-xs text-zinc-900 tracking-wider">
                          {curr.code}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-[#FAFAFA] border border-[#E8E8E6] flex items-center justify-center shrink-0">
                            <span className="font-mono text-xs font-bold text-zinc-700">{curr.symbol}</span>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-zinc-900">
                              {curr.name}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">ISO {curr.code}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-50 border border-[#E8E8E6] px-2 py-1 rounded-[4px]">
                          {curr.symbol}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {(() => {
                          const gwObj = gatewayList.find(g => g.slug === (curr.payment_gateway || 'stripe'));
                          return (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-[5px] overflow-hidden shrink-0 border border-[#E8E8E6] bg-white flex items-center justify-center shadow-3xs p-0.5">
                                {gwObj?.logo ? (
                                  <img src={gwObj.logo} alt={gwObj.name} className="h-full w-full object-contain" />
                                ) : (
                                  <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-zinc-900">
                                {gwObj?.name || curr.payment_gateway || 'Stripe'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-650 font-semibold">
                          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-mono text-zinc-900 font-bold">{curr.tenant_count ?? 0}</span>
                          <span className="text-zinc-400 text-[11px]">{t('currencies.workspacesUnit')}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {curr.is_default ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-955">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span>{t('currencies.primary')}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInitiateSetDefault(curr)}
                            disabled={actionLoadingId === curr.id}
                            className="text-xs font-bold text-zinc-700 hover:text-black border border-[#E8E8E6] bg-white rounded-[6px] px-2.5 py-1 transition-all shadow-3xs hover:bg-zinc-50 cursor-pointer active:scale-99"
                          >
                            {t('currencies.setDefault')}
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={curr.is_active}
                            disabled={actionLoadingId === curr.id || curr.is_default}
                            onClick={() => handleToggleActive(curr)}
                            title={
                              curr.is_default 
                                ? t('currencies.primaryCannotBeDisabled') 
                                : curr.is_active 
                                  ? t('currencies.disabled') 
                                  : t('currencies.active')
                            }
                            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                              curr.is_active ? 'bg-[#0A0A0A]' : 'bg-zinc-200'
                            }`}
                          >
                            <span
                              className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                                curr.is_active ? 'translate-x-3.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[11px] font-bold ${
                            curr.is_active ? 'text-zinc-900' : 'text-zinc-400'
                          }`}>
                            {curr.is_active ? t('currencies.active') : t('currencies.disabled')}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(curr)}
                            className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer inline-flex items-center justify-center active:scale-99"
                            title={t('currencies.editCurrency')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!curr.is_default && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrencyToDelete(curr);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-[4px] transition-colors cursor-pointer inline-flex items-center justify-center active:scale-99"
                              title={t('currencies.deleteCurrency')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* 1. ADD CURRENCY MODAL */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Coins className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('currencies.addCurrencyModalTitle')}</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCurrency} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                    {t('currencies.code')}
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EUR"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono font-bold focus:outline-none focus:border-black uppercase transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                    {t('currencies.symbol')}
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="e.g. €"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  {t('currencies.name')}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Euro"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  {t('currencies.paymentGateway')}
                </label>
                <DropdownSelect
                  value={newPaymentGateway}
                  onChange={(val) => setNewPaymentGateway(val)}
                  options={gatewayOptions}
                  className="w-full"
                />
                <p className="text-[10px] text-zinc-400 font-medium">
                  {t('currencies.gatewayHelpText')}
                </p>
                {isAddGatewayIncompatible && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-md text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {newPaymentGateway === 'paypal'
                        ? `PayPal Subscriptions does not support ${newCode.toUpperCase() || 'this currency'}. Supported currencies: USD, EUR, GBP, CAD, AUD, etc. For INR, please select Razorpay or Stripe.`
                        : `${gatewayList.find((g) => g.slug === newPaymentGateway)?.name} does not support recurring subscriptions in ${newCode.toUpperCase()}.`}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="accent-black h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-zinc-700">{t('currencies.enableForBilling')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={(e) => {
                      setNewIsDefault(e.target.checked);
                      if (e.target.checked) setNewIsActive(true);
                    }}
                    className="accent-black h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-zinc-700">{t('currencies.makeDefault')}</span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-bold rounded-[6px] shadow-3xs hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  {t('currencies.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addLoading || isAddGatewayIncompatible}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span>{t('currencies.registerCurrency')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 2. EDIT CURRENCY MODAL */}
      {isEditModalOpen && currencyToEdit && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade">
          <div className="fixed inset-0" onClick={() => !editLoading && setIsEditModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Pencil className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('currencies.editCurrencyModalTitle')}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !editLoading && setIsEditModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCurrency} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                      {t('currencies.code')}
                    </label>
                    <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 uppercase tracking-wider">
                      {t('currencies.immutable')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currencyToEdit.code}
                    disabled
                    className="w-full h-9 px-3 bg-zinc-100 border border-[#E8E8E6] rounded-md text-xs font-mono font-bold text-zinc-500 cursor-not-allowed uppercase"
                    title="Currency ISO code cannot be changed once created"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                    {t('currencies.symbol')}
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={editSymbol}
                    onChange={(e) => setEditSymbol(e.target.value)}
                    placeholder="e.g. €"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono font-bold focus:outline-none focus:border-black transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  {t('currencies.name')}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Euro"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  {t('currencies.paymentGateway')}
                </label>
                <DropdownSelect
                  value={editPaymentGateway}
                  onChange={(val) => setEditPaymentGateway(val)}
                  options={gatewayOptions}
                  className="w-full"
                />
                <p className="text-[10px] text-zinc-400 font-medium">
                  {t('currencies.gatewayHelpText')}
                </p>
                {isEditGatewayIncompatible && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-md text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {editPaymentGateway === 'paypal'
                        ? `PayPal Subscriptions does not support ${currencyToEdit.code}. Supported currencies: USD, EUR, GBP, CAD, AUD, etc. For INR, please select Razorpay or Stripe.`
                        : `${gatewayList.find((g) => g.slug === editPaymentGateway)?.name} does not support recurring subscriptions in ${currencyToEdit.code}.`}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <label className={`flex items-center gap-2 ${currencyToEdit.is_default ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    disabled={currencyToEdit.is_default}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="accent-black h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-zinc-700">
                    {t('currencies.enableForBilling')} {currencyToEdit.is_default && t('currencies.primaryCannotBeDisabled')}
                  </span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                  className="h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-bold rounded-[6px] shadow-3xs hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  {t('currencies.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={editLoading || isEditGatewayIncompatible}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span>{editLoading ? t('currencies.saving') : t('currencies.saveCurrency')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 3. DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && currencyToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade">
          <div className="fixed inset-0" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4 text-red-650" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('currencies.deleteConfirmTitle')}</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                {t('currencies.deleteConfirmText', { code: `${currencyToDelete.name} (${currencyToDelete.code})` })}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {t('currencies.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrency}
                disabled={deleteLoading}
                className="h-9 px-4 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99 disabled:opacity-50"
              >
                {deleteLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{t('currencies.confirmDelete')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. SWITCH PRIMARY CONFIRMATION MODAL */}
      {isSwitchPrimaryModalOpen && targetPrimaryCurrency && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 select-none animate-overlay-fade">
          <div className="fixed inset-0" onClick={() => !switchLoading && setIsSwitchPrimaryModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-amber-50 border border-amber-200/60 p-1 flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('currencies.switchPrimaryModalTitle', { code: targetPrimaryCurrency.code })}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !switchLoading && setIsSwitchPrimaryModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-600 font-semibold leading-relaxed">
                {t('currencies.switchPrimaryConfirmText', {
                  name: targetPrimaryCurrency.name,
                  code: targetPrimaryCurrency.code,
                  symbol: targetPrimaryCurrency.symbol,
                })}
              </p>

              <div className="p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[8px] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <Coins className="h-3.5 w-3.5 text-zinc-600" />
                  <span>{t('currencies.pricingPreservedTitle')}</span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                  {t('currencies.pricingPreservedDesc', { code: targetPrimaryCurrency.code })}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-5 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsSwitchPrimaryModalOpen(false)}
                disabled={switchLoading}
                className="h-9 px-4 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {t('currencies.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchPrimary}
                disabled={switchLoading}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-3xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-99 disabled:opacity-50"
              >
                {switchLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{switchLoading ? t('currencies.updatingPrimary') : t('currencies.confirmSwitchPrimary')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
