/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useTranslations } from 'next-intl';
import { DialogModal } from '@/components/ui/DialogModal';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  Store,
  Plus,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface EcommerceConnection {
  id: string;
  provider?: 'shopify' | 'woocommerce';
  platform?: 'shopify' | 'woocommerce';
  store_url: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  sync_status?: 'idle' | 'syncing' | 'failed' | 'completed';
  products_count?: number;
  orders_count?: number;
  abandoned_carts_count?: number;
  last_synced_at?: string | null;
  webhook_url?: string;
  webhook_secret?: string;
  api_key_masked?: string;
  has_credentials?: boolean;
  created_at?: string;
}

function EcommerceStoresContent() {
  const t = useTranslations('Ecommerce');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<EcommerceConnection[]>([]);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Connect Store 2-Step Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<'shopify' | 'woocommerce'>('shopify');
  const [storeUrlInput, setStoreUrlInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Edit / Credentials Modal State
  const [editStore, setEditStore] = useState<EcommerceConnection | null>(null);
  const [editApiKey, setEditApiKey] = useState('');
  const [editApiSecret, setEditApiSecret] = useState('');
  const [editAccessToken, setEditAccessToken] = useState('');
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  // Disconnect Confirmation Modal State
  const [disconnectStore, setDisconnectStore] = useState<EcommerceConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch Store Status
  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await fetchWithCsrf('/ecommerce/stores');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.connections || data.data || []);
        setStores(list);
      } else {
        toast.error(t('noStoresFound'));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStores();
  }, []);

  // Intercept OAuth Redirect Responses
  useEffect(() => {
    if (!searchParams) return;

    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    const provider = searchParams.get('provider');
    const shop = searchParams.get('shop') || searchParams.get('store');

    if (oauthSuccess === 'true') {
      const providerLabel = provider === 'shopify' ? t('shopify') : provider === 'woocommerce' ? t('woocommerce') : t('storeSource');
      toast.success(t('statusConnected') + ` (${shop || providerLabel})`);
      fetchStores();
      // Clean query parameters from URL
      router.replace(pathname);
    } else if (oauthError) {
      toast.error(t('syncError') + `: ${decodeURIComponent(oauthError)}`);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router, t]);

  // Sync Store Catalog
  const handleSyncStore = async (storeId: string) => {
    try {
      setSyncingStoreId(storeId);
      const res = await fetchWithCsrf(`/ecommerce/stores/${storeId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('syncDispatched'));
        fetchStores();
      } else {
        toast.error(data.message || t('syncFailed'));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setSyncingStoreId(null);
    }
  };

  // Open Connect Modal
  const handleOpenConnectModal = (provider: 'shopify' | 'woocommerce' = 'shopify') => {
    setSelectedProvider(provider);
    setConnectStep(1);
    setStoreUrlInput('');
    setConnectModalOpen(true);
  };

  // Step 2: Start Authentication
  const handleStartAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!storeUrlInput.trim()) {
      toast.error(
        selectedProvider === 'shopify'
          ? t('enterShopifyUrlError')
          : t('enterWooUrlError')
      );
      return;
    }

    try {
      setIsConnecting(true);
      const endpoint =
        selectedProvider === 'shopify'
          ? '/ecommerce/oauth/shopify/authorize'
          : '/ecommerce/oauth/woocommerce/authorize';

      const res = await fetchWithCsrf(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          shop_domain: storeUrlInput.trim(),
          store_url: storeUrlInput.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        toast.loading(t('connecting'));
        window.location.href = data.url;
      } else {
        toast.error(data.message || t('startAuthFailed'));
        setIsConnecting(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('startAuthNetworkError'));
      setIsConnecting(false);
    }
  };

  // Update Credentials Handler
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStore) return;

    try {
      setIsUpdatingCredentials(true);
      const credentials: Record<string, any> = {};
      if (editApiKey.trim()) {
        credentials.api_key = editApiKey.trim();
        credentials.consumer_key = editApiKey.trim();
      }
      if (editApiSecret.trim()) {
        credentials.api_secret = editApiSecret.trim();
        credentials.consumer_secret = editApiSecret.trim();
      }
      if (editAccessToken.trim()) {
        credentials.access_token = editAccessToken.trim();
      }

      const payload = {
        credentials,
        ...credentials,
      };

      const res = await fetchWithCsrf(`/ecommerce/stores/${editStore.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && (data.success || data.connection)) {
        toast.success(t('credentialsUpdated'));
        setEditStore(null);
        setEditApiKey('');
        setEditApiSecret('');
        setEditAccessToken('');
        fetchStores();
      } else {
        toast.error(data.message || t('updateCredentialsFailed'));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('updateCredentialsError'));
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // {t('confirmDisconnect')} Handler
  const handleDisconnect = async () => {
    if (!disconnectStore) return;
    try {
      setIsDisconnecting(true);
      const res = await fetchWithCsrf(`/ecommerce/stores/${disconnectStore.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('storeDisconnected'));
        setDisconnectStore(null);
        fetchStores();
      } else {
        toast.error(data.message || t('disconnectFailed'));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('disconnectFailed'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(t('copied'));
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchesSearch =
        s.store_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.provider || s.platform || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter ? s.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [stores, searchQuery, statusFilter]);

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col flex-1">
      {/* LOADING OVERLAY SPINNER */}
      {loading && (
        <div className="p-8">
          <SimpleLoader message={t('syncingStores')} />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      {!loading && (
        <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col flex-1 pb-16">
          {/* 1. STANDARD ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('shopifyUrlPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                />
              </div>

              <DropdownSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: '', label: t('allStatuses') },
                  { value: 'connected', label: t('statusConnected') },
                  { value: 'syncing', label: t('statusSyncing') },
                  { value: 'error', label: t('statusError') },
                ]}
                className="w-full sm:w-auto min-w-[145px]"
              />

              <button
                type="button"
                onClick={fetchStores}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-[#E8E8E6] bg-[#F5F5F5] text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                title={t('refreshStores')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Right Action Triggers */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleOpenConnectModal('shopify')}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('connectStore')}</span>
              </button>
            </div>
          </div>

          {/* 2. ACTIVE STORES DATATABLE */}
          {filteredStores.length === 0 ? (
            <div className="text-center py-20 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-row-fade shadow-3xs">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3 border border-zinc-200">
                <Store className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">
                {searchQuery || statusFilter ? t('noMatchingStores') : t('noStoresFound')}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {searchQuery || statusFilter
                  ? t('noMatchingStoresDesc')
                  : t('noStoresDesc')}
              </p>
              {searchQuery || statusFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                  }}
                  className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                >
                  <span>{t('resetFilters')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenConnectModal('shopify')}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('connectStore')}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs select-none min-w-[640px]">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                      <th className="px-6 py-3.5">{t('colStorefront')}</th>
                      <th className="px-6 py-3.5">{t('colProducts')}</th>
                      <th className="px-6 py-3.5">{t('colOrders')}</th>
                      <th className="px-6 py-3.5">{t('colLastSynced')}</th>
                      <th className="px-6 py-3.5">{t('colStatus')}</th>
                      <th className="px-6 py-3.5 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                    {filteredStores.map((store, index) => {
                      const isShopify = (store.platform || store.provider) === 'shopify';
                      const isSyncing = syncingStoreId === store.id || store.status === 'syncing';

                      return (
                        <tr
                          key={store.id}
                          className="hover:bg-[#FAFAFA]/40 transition-all font-semibold animate-row-fade"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          {/* 1. Storefront */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-lg p-1 shrink-0 select-none">
                                <img
                                  src={isShopify ? '/shopify.webp' : '/woocommerce.webp'}
                                  alt={store.provider || 'Store'}
                                  className="h-5 w-5 object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-zinc-955 truncate">
                                    {isShopify ? t('shopifyStore') : t('woocommerceStore')}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                                    #{store.id}
                                  </span>
                                </div>
                                <a
                                  href={store.store_url.startsWith('http') ? store.store_url : `https://${store.store_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-zinc-500 hover:text-black hover:underline flex items-center gap-1 mt-0.5 font-medium transition-colors"
                                >
                                  {store.store_url}
                                  <ExternalLink className="h-2.5 w-2.5 text-zinc-400" />
                                </a>
                              </div>
                            </div>
                          </td>

                          {/* 2. Products */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-zinc-900">
                              {store.products_count || 0}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-normal ml-1">
                              {t('productsUnit')}
                            </span>
                          </td>

                          {/* 3. Orders */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div>
                                <span className="text-xs font-bold text-zinc-900">
                                  {store.orders_count || 0}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-normal ml-1">
                                  {t('ordersUnit')}
                                </span>
                              </div>
                              {typeof store.abandoned_carts_count === 'number' && store.abandoned_carts_count > 0 && (
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  {t('abandonedCartsUnit', { count: store.abandoned_carts_count })}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Last Synced */}
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-500 font-medium text-[11px]">
                            {store.last_synced_at ? (
                              new Date(store.last_synced_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            ) : (
                              <span className="text-zinc-400">{t('neverSynced')}</span>
                            )}
                          </td>

                          {/* 5. Status (Clean colored text with icon) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {store.status === 'connected' ? (
                              <div className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{t('statusConnected')}</span>
                              </div>
                            ) : store.status === 'syncing' ? (
                              <div className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                <span>{t('statusSyncing')}</span>
                              </div>
                            ) : store.status === 'error' ? (
                              <div className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>{t('statusError')}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-zinc-400 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-zinc-300" />
                                <span>{t('statusDisconnected')}</span>
                              </div>
                            )}
                          </td>

                          {/* 6. Action Buttons */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSyncStore(store.id)}
                                disabled={isSyncing}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                title={t('syncCatalog')}
                              >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-black' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditStore(store);
                                  setEditApiKey('');
                                  setEditApiSecret('');
                                  setEditAccessToken('');
                                }}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                title={t('manageCredentials')}
                              >
                                <Settings className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDisconnectStore(store)}
                                className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={t('confirmDisconnect')}
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
          )}
        </div>
      )}

      {/* 5. SIMPLE 2-STEP CONNECT STORE MODAL */}
      <DialogModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={t('connectStoreTitle')}
        subtitle={
          connectStep === 1
            ? t('selectPlatformDesc')
            : selectedProvider === 'shopify'
            ? t('shopifyDesc')
            : t('woocommerceDesc')
        }
        icon={<Store className="h-4 w-4 text-zinc-700" />}
        maxWidth="md"
        primaryAction={
          connectStep === 1
            ? {
                label: t('continue'),
                onClick: () => setConnectStep(2),
              }
            : {
                label: isConnecting ? t('connecting') : t('connectStore'),
                loading: isConnecting,
                onClick: () => handleStartAuth(),
              }
        }
        secondaryAction={
          connectStep === 1
            ? {
                label: t('cancel'),
                onClick: () => setConnectModalOpen(false),
              }
            : {
                label: t('back'),
                onClick: () => setConnectStep(1),
              }
        }
      >
        <div className="font-sans text-xs">
          {/* STEP 1: SELECT PROVIDER */}
          {connectStep === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shopify Card */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('shopify')}
                  className={`p-4 border rounded-[10px] text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedProvider === 'shopify'
                      ? 'border-black bg-zinc-50/70 ring-1 ring-black shadow-3xs'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-200 rounded-lg p-1.5 shadow-3xs">
                      <img src="/shopify.webp" alt="Shopify" className="h-6 w-6 object-contain" />
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        selectedProvider === 'shopify'
                          ? 'border-black bg-black text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {selectedProvider === 'shopify' && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-955">{t('shopify')}</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-normal leading-relaxed">
                      {t('shopifyDesc')}
                    </p>
                  </div>
                </button>

                {/* WooCommerce Card */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('woocommerce')}
                  className={`p-4 border rounded-[10px] text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedProvider === 'woocommerce'
                      ? 'border-black bg-zinc-50/70 ring-1 ring-black shadow-3xs'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-200 rounded-lg p-1.5 shadow-3xs">
                      <img src="/woocommerce.webp" alt="WooCommerce" className="h-6 w-6 object-contain" />
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        selectedProvider === 'woocommerce'
                          ? 'border-black bg-black text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {selectedProvider === 'woocommerce' && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-955">{t('woocommerce')}</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-normal leading-relaxed">
                      {t('woocommerceDesc')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ENTER STORE URL & CONNECT */}
          {connectStep === 2 && (
            <div className="space-y-4">
              {/* Provider Summary Badge */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 flex items-center justify-center bg-white border border-zinc-200 rounded-md p-1">
                    <img
                      src={selectedProvider === 'shopify' ? '/shopify.webp' : '/woocommerce.webp'}
                      alt={selectedProvider}
                      className="h-4 w-4 object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">
                      {selectedProvider === 'shopify' ? t('shopify') : t('woocommerce')}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">{t('readyToConnect')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectStep(1)}
                  className="text-[11px] text-zinc-500 hover:text-black font-semibold cursor-pointer underline transition-colors"
                >
                  {t('change')}
                </button>
              </div>

              {/* Store URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {selectedProvider === 'shopify' ? t('storeUrlDomain') : t('storeUrl')}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={
                    selectedProvider === 'shopify'
                      ? t('shopifyUrlPlaceholder')
                      : t('woocommerceUrlPlaceholder')
                  }
                  value={storeUrlInput}
                  onChange={(e) => setStoreUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStartAuth();
                    }
                  }}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                />
                <p className="text-[10px] text-zinc-400">
                  {selectedProvider === 'shopify'
                    ? t('storeUrlDescShopify')
                    : t('storeUrlDescWoo')}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogModal>

      {/* 6. EDIT CREDENTIALS MODAL */}
      <DialogModal
        isOpen={Boolean(editStore)}
        onClose={() => setEditStore(null)}
        title={t('credentialsTitle')}
        subtitle={editStore?.store_url}
        icon={<Settings className="h-4 w-4 text-zinc-700" />}
        maxWidth="md"
        asForm={true}
        onSubmit={handleUpdateCredentials}
        primaryAction={{
          label: isUpdatingCredentials ? t('updating') : t('saveCredentials'),
          loading: isUpdatingCredentials,
          type: 'submit',
        }}
        secondaryAction={{
          label: t('cancel'),
          onClick: () => setEditStore(null),
        }}
      >
        <div className="space-y-4 font-sans text-xs">
          {(editStore?.platform || editStore?.provider) === 'shopify' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('newAccessToken')}
                </label>
                <input
                  type="password"
                  placeholder={t('keepCurrentToken')}
                  value={editAccessToken}
                  onChange={(e) => setEditAccessToken(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('apiKey')}
                  </label>
                  <input
                    type="text"
                    placeholder={editStore?.api_key_masked || t('enterApiKey')}
                    value={editApiKey}
                    onChange={(e) => setEditApiKey(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('apiSecret')}
                  </label>
                  <input
                    type="password"
                    placeholder={t('keepCurrent')}
                    value={editApiSecret}
                    onChange={(e) => setEditApiSecret(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('wooConsumerKey')}
                </label>
                <input
                  type="text"
                  placeholder={editStore?.api_key_masked || t('enterConsumerKey')}
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('wooConsumerSecret')}
                </label>
                <input
                  type="password"
                  placeholder={t('keepCurrentSecret')}
                  value={editApiSecret}
                  onChange={(e) => setEditApiSecret(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </>
          )}

          {/* Webhook Ingress Details */}
          {editStore?.webhook_url && (
            <div className="pt-3 border-t border-[#E8E8E6] space-y-2.5">
              <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                {t('webhookIngress')}
              </label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-medium">{t('webhookUrl')}</span>
                  <div className="flex items-center justify-between gap-2 bg-[#F5F5F5] border border-[#E8E8E6] px-2.5 py-1.5 rounded-md">
                    <span className="font-mono text-zinc-800 text-[11px] truncate select-all">
                      {editStore.webhook_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editStore.webhook_url || '', `wh_${editStore.id}`)}
                      className="text-zinc-400 hover:text-black cursor-pointer shrink-0"
                      title={t('copyWebhook')}
                    >
                      {copiedKey === `wh_${editStore.id}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {editStore.webhook_secret && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-medium">{t('webhookSecret')}</span>
                    <div className="flex items-center justify-between gap-2 bg-[#F5F5F5] border border-[#E8E8E6] px-2.5 py-1.5 rounded-md">
                      <span className="font-mono text-zinc-800 text-[11px] truncate select-all">
                        {revealedSecrets[editStore.id] ? editStore.webhook_secret : '••••••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSecrets((prev) => ({
                              ...prev,
                              [editStore.id]: !prev[editStore.id],
                            }))
                          }
                          className="text-zinc-400 hover:text-black cursor-pointer p-0.5"
                          title={revealedSecrets[editStore.id] ? t('hide') : t('reveal')}
                        >
                          {revealedSecrets[editStore.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(editStore.webhook_secret || '', `sec_${editStore.id}`)}
                          className="text-zinc-400 hover:text-black cursor-pointer p-0.5"
                          title={t('copySecret')}
                        >
                          {copiedKey === `sec_${editStore.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogModal>

      {/* 7. DISCONNECT CONFIRMATION MODAL */}
      <DialogModal
        isOpen={Boolean(disconnectStore)}
        onClose={() => setDisconnectStore(null)}
        title={t('confirmDisconnectTitle')}
        subtitle={disconnectStore?.store_url}
        icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        iconBoxClassName="bg-red-50 border border-red-100 text-red-600"
        maxWidth="sm"
        primaryAction={{
          label: isDisconnecting ? t('disconnect') + '...' : t('disconnect'),
          loading: isDisconnecting,
          variant: 'danger',
          onClick: handleDisconnect,
        }}
        secondaryAction={{
          label: t('keepConnected'),
          onClick: () => setDisconnectStore(null),
        }}
      >
        <p className="text-xs text-zinc-650 leading-relaxed font-normal">
          {t('disconnectWarning', { count: disconnectStore?.products_count || 0 })}
        </p>
      </DialogModal>
    </div>
  );
}

export default function EcommerceStoresPage() {
  const t = useTranslations('Ecommerce');
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <SimpleLoader message={t('loadingStores')} />
        </div>
      }
    >
      <EcommerceStoresContent />
    </Suspense>
  );
}
