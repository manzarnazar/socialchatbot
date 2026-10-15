/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useTranslations } from 'next-intl';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  Package,
  Settings2,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  LayoutGrid,
  List as ListIcon,
  Store,
  Check,
  Info,
  ShoppingBag,
  Unlink,
  Plus,
  X,
  Building2,
} from 'lucide-react';

interface CatalogProduct {
  id: string;
  product_retailer_id: string;
  title: string;
  description: string | null;
  price: number | string;
  currency: string;
  image_url: string | null;
  stock_quantity: number;
  in_stock: boolean;
  whatsapp_status: 'approved' | 'review' | 'rejected' | string;
  store_url?: string;
  platform?: string;
  external_url?: string | null;
}

interface CatalogSettings {
  catalog_id: string;
  cart_enabled: boolean;
  catalog_enabled: boolean;
  auto_sync: boolean;
  catalog_name: string;
  last_synced_at: string | null;
}

interface WhatsAppConnectionInfo {
  id?: number | string;
  name?: string;
  status?: string;
  waba_id?: string;
  phone_number_id?: string;
}

export default function WhatsAppCatalogPage() {
  const t = useTranslations('Ecommerce');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');

  const [settings, setSettings] = useState<CatalogSettings>({
    catalog_id: '',
    cart_enabled: true,
    catalog_enabled: true,
    auto_sync: true,
    catalog_name: '',
    last_synced_at: null,
  });

  const [connection, setConnection] = useState<WhatsAppConnectionInfo | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  // Meta Commerce Binding Dialog states
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindCatalogId, setBindCatalogId] = useState('');
  const [bindCatalogName, setBindCatalogName] = useState('');
  const [isBinding, setIsBinding] = useState(false);

  // Unlink confirmation dialog states
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Products Tab Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isSyncing, setIsSyncing] = useState(false);

  // Settings saving
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load Status from API
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const cat = json.catalog || json.data?.catalog || json.data?.settings || {};
          setSettings({
            catalog_id: cat.catalog_id || '',
            cart_enabled: cat.cart_enabled !== undefined ? Boolean(cat.cart_enabled) : true,
            catalog_enabled: cat.catalog_enabled !== undefined ? Boolean(cat.catalog_enabled) : true,
            auto_sync: cat.auto_sync !== undefined ? Boolean(cat.auto_sync) : true,
            catalog_name: cat.catalog_name || '',
            last_synced_at: cat.last_synced_at || null,
          });
          const prodList = json.products || json.data?.products || [];
          setProducts(prodList);
          setConnection(json.connection || json.data?.connection || null);
        }
      } else {
        toast.error(t('syncError'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setMounted(true);
    fetchStatus();
  }, [fetchStatus]);

  // Sync Products with WhatsApp Catalog
  const handleSyncCatalog = async () => {
    setIsSyncing(true);
    try {
      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('syncDispatched'));
        fetchStatus();
      } else {
        toast.error(data.message || t('syncFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('settingsSaved'));
        fetchStatus();
      } else {
        toast.error(data.message || t('settingsSaveFailed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Bind Dialog
  const handleOpenBindModal = () => {
    setBindCatalogId(settings.catalog_id || '');
    setBindCatalogName(settings.catalog_name || '');
    setShowBindModal(true);
  };

  // Submit Bind Dialog (Meta Ad Account style)
  const handleSaveBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = bindCatalogId.trim();
    const cleanName = bindCatalogName.trim();
    if (!cleanId) {
      toast.error(t('validCatalogIdRequired'));
      return;
    }
    setIsBinding(true);
    try {
      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          catalog_id: cleanId,
          catalog_name: cleanName || t('mainBrandCatalog'),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('catalogBoundSuccess'));
        setShowBindModal(false);
        fetchStatus();
      } else {
        toast.error(data.message || t('catalogBindFailed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setIsBinding(false);
    }
  };

  // Confirm Unlink
  const handleConfirmUnlink = async () => {
    setIsUnlinking(true);
    try {
      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          catalog_id: '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t('catalogUnlinkedSuccess'));
        setShowUnlinkModal(false);
        fetchStatus();
      } else {
        toast.error(data.message || t('catalogUnlinkFailed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('syncError'));
    } finally {
      setIsUnlinking(false);
    }
  };

  // Filter products for Tab 1
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_retailer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'in_stock'
          ? p.in_stock
          : !p.in_stock;

      return matchesSearch && matchesStock;
    });
  }, [products, searchQuery, stockFilter]);

  // Price formatter
  const formatPrice = (price: number | string, currency = 'USD') => {
    const num = Number(price);
    if (isNaN(num)) return `${currency} ${price}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col flex-1">
      {/* LOADING OVERLAY SPINNER */}
      {loading && (
        <div className="p-8">
          <SimpleLoader message={t('loadingWhatsAppCatalog')} />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      {!loading && (
        <div className="w-full flex flex-col flex-1">
          {/* 1. SIGNATURE PLATFORM SEGMENT SWITCHER TABS */}
          <div className="w-full px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-1 bg-white flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'products', label: t('tabProducts'), count: products.length, icon: <Package className="h-3.5 w-3.5" /> },
                { id: 'settings', label: t('tabSettings'), icon: <Settings2 className="h-3.5 w-3.5" /> },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                      isActive
                        ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span className={isActive ? 'text-zinc-955' : 'text-zinc-400'}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                          isActive
                            ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80'
                            : 'bg-zinc-200/60 text-zinc-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. TAB 1: CATALOG PRODUCTS (CONNECTED END-TO-END) */}
          {activeTab === 'products' && (
            <div className="w-full px-4 sm:px-6 md:px-8 py-5 space-y-6 flex flex-col flex-1 pb-16">
              {/* STANDARD ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder={t('searchProductsPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                    />
                  </div>

                  <DropdownSelect
                    value={stockFilter}
                    onChange={(val) => setStockFilter(val as any)}
                    options={[
                      { value: 'all', label: `${t('allStock')} (${products.length})` },
                      { value: 'in_stock', label: t('inStock') },
                      { value: 'out_of_stock', label: t('outOfStock') },
                    ]}
                    placeholder={t('allStock')}
                    className="w-full sm:w-auto min-w-[145px]"
                  />

                  <button
                    type="button"
                    onClick={fetchStatus}
                    className="h-9 w-9 flex items-center justify-center rounded-md border border-[#E8E8E6] bg-[#F5F5F5] text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer shrink-0 shadow-3xs"
                    title={t('refreshCatalog')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Right Action Triggers */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  {/* View Mode Segment Switcher */}
                  <div className="flex items-center p-0.5 bg-zinc-100/90 rounded-[6px] border border-[#E8E8E6] select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                        viewMode === 'table'
                          ? 'bg-white text-zinc-950 shadow-3xs font-bold border border-[#E8E8E6]/60'
                          : 'text-zinc-500 hover:text-zinc-900 font-medium'
                      }`}
                      title={t('viewTable')}
                    >
                      <ListIcon className="h-3.5 w-3.5" />
                      <span>{t('viewTable')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                        viewMode === 'grid'
                          ? 'bg-white text-zinc-950 shadow-3xs font-bold border border-[#E8E8E6]/60'
                          : 'text-zinc-500 hover:text-zinc-900 font-medium'
                      }`}
                      title={t('viewGrid')}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>{t('viewGrid')}</span>
                    </button>
                  </div>

                  {!settings.catalog_id ? (
                    <button
                      type="button"
                      onClick={handleOpenBindModal}
                      className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{t('bindMetaCatalog')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSyncCatalog}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? t('syncing') : t('syncWhatsAppCatalog')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CATALOG DATATABLE OR EMPTY STATE */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-fade-in shadow-3xs">
                  <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                    <Package className="h-5 w-5 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 mb-1">
                    {searchQuery || stockFilter !== 'all'
                      ? t('noMatchingCatalogProducts')
                      : !settings.catalog_id
                      ? t('noCatalogConnectedTitle')
                      : t('noCatalogProductsFound')}
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs mb-4">
                    {searchQuery || stockFilter !== 'all'
                      ? t('noMatchingCatalogProductsDesc')
                      : !settings.catalog_id
                      ? t('noCatalogConnectedDesc')
                      : t('noCatalogProductsDesc')}
                  </p>
                  {searchQuery || stockFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStockFilter('all');
                      }}
                      className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                    >
                      <span>{t('resetFilters')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!settings.catalog_id ? (
                        <button
                          type="button"
                          onClick={handleOpenBindModal}
                          className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                        >
                          <Plus className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('bindMetaCatalog')}</span>
                        </button>
                      ) : (
                        <Link
                          href={`/${locale}/ecommerce/stores`}
                          className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                        >
                          <Store className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('goToStores')}</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* Table View */
                <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs select-none min-w-[760px]">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                          <th className="px-6 py-3.5">{t('colProduct')}</th>
                          <th className="px-6 py-3.5">{t('skuOrId')}</th>
                          <th className="px-6 py-3.5">{t('colPrice')}</th>
                          <th className="px-6 py-3.5">{t('colInventory')}</th>
                          <th className="px-6 py-3.5">{t('whatsappStatus')}</th>
                          <th className="px-6 py-3.5 text-right">{t('storeLink')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                        {filteredProducts.map((product) => {
                          return (
                            <tr key={product.id} className="hover:bg-[#FAFAFA]/60 transition-all font-semibold">
                              {/* Product info */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-[6px] bg-zinc-100 border border-[#E8E8E6] overflow-hidden shrink-0 flex items-center justify-center">
                                    {product.image_url ? (
                                      <img
                                        src={product.image_url}
                                        alt={product.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Package className="h-4 w-4 text-zinc-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-xs">
                                    <h4 className="text-xs font-bold text-zinc-950 truncate leading-snug">
                                      {product.title}
                                    </h4>
                                    <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                                      {product.platform ? t('sourcePlatform', { platform: product.platform }) : t('directCatalog')}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Retailer ID */}
                              <td className="px-6 py-4">
                                <span className="font-mono text-[11px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-[#E8E8E6]">
                                  {product.product_retailer_id}
                                </span>
                              </td>

                              {/* Price */}
                              <td className="px-6 py-4 font-bold text-zinc-900">
                                {formatPrice(product.price, product.currency)}
                              </td>

                              {/* Stock */}
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  product.in_stock
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${product.in_stock ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                                  {product.in_stock ? t('inStockBadge', { count: product.stock_quantity }) : t('outOfStock')}
                                </span>
                              </td>

                              {/* WhatsApp Status */}
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="capitalize">{product.whatsapp_status ? (t(product.whatsapp_status) || product.whatsapp_status) : t('approvedCount')}</span>
                                </span>
                              </td>

                              {/* Actions / Store Link */}
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {product.external_url ? (
                                    <a
                                      href={product.external_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="h-8 px-2.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-600 hover:text-black flex items-center gap-1.5 text-xs font-semibold transition-all shadow-3xs cursor-pointer"
                                      title={t('viewOnStore')}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                                      <span>{t('viewStore')}</span>
                                    </a>
                                  ) : (
                                    <span className="text-zinc-300 text-xs">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => {
                    return (
                      <div
                        key={product.id}
                        className="p-3.5 border border-[#E8E8E6] hover:border-zinc-300 rounded-[10px] bg-white transition-all shadow-3xs flex flex-col justify-between group"
                      >
                        <div>
                          {/* Image */}
                          <div className="w-full aspect-square rounded-[8px] bg-zinc-100 border border-[#E8E8E6] overflow-hidden flex items-center justify-center relative mb-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-zinc-300" />
                            )}
                            <div className="absolute top-2 right-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                product.in_stock ? 'bg-white/95 text-zinc-900 shadow-3xs' : 'bg-red-600/90 text-white'
                              }`}>
                                {product.in_stock ? t('leftInStock', { count: product.stock_quantity }) : t('outOfStock')}
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <h4 className="text-xs font-bold text-zinc-950 truncate leading-snug" title={product.title}>
                            {product.title}
                          </h4>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs font-extrabold text-black">
                              {formatPrice(product.price, product.currency)}
                            </span>
                            <span className="font-mono text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-[#E8E8E6]">
                              {product.product_retailer_id}
                            </span>
                          </div>
                        </div>

                        {/* Store link if available */}
                        {product.external_url && (
                          <div className="mt-3 pt-2.5 border-t border-[#E8E8E6]">
                            <a
                              href={product.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full h-8 px-2 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-700 hover:text-black text-[11px] font-bold rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3 text-zinc-500" />
                              <span>{t('viewInStore')}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. TAB 2: SETTINGS & INTEGRATION (CONNECTED END-TO-END PLATFORM LAYOUT) */}
          {activeTab === 'settings' && (
            <div className="w-full select-none animate-fade-in flex flex-col flex-1 pb-16">
              <form onSubmit={handleSaveSettings} className="w-full space-y-0 text-left">
                {/* SECTION 1: Meta Catalog Binding */}
                <div className="w-full px-4 sm:px-6 md:px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="col-span-1 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-tight mb-1">
                        {t('metaCatalogBinding')}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                        {t('metaCatalogBindingDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-3">
                    {settings.catalog_id ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F5F5F5] rounded-lg border border-[#E8E8E6] gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-md bg-white border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-4 w-4 text-zinc-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-950 truncate">
                                {settings.catalog_name || t('metaCommerceCatalog')}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('linked')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 font-mono">
                              <span>{t('catalogId', { id: settings.catalog_id })}</span>
                              {settings.last_synced_at && (
                                <>
                                  <span>•</span>
                                  <span>{t('syncedDate', { date: new Date(settings.last_synced_at).toLocaleDateString() })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={handleOpenBindModal}
                            className="h-8 px-3 rounded-[6px] border border-[#E8E8E6] bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 text-xs font-semibold transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                          >
                            {t('editBinding')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUnlinkModal(true)}
                            className="h-8 px-2.5 rounded-[6px] border border-red-200 text-red-650 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                            title={t('unlinkCatalog')}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            <span>{t('unlink')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#F5F5F5] rounded-lg border border-[#E8E8E6] gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-900 block">{t('noCatalogLinked')}</span>
                          <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                            {t('noCatalogLinkedDesc')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenBindModal}
                          className="flex items-center gap-1.5 px-3.5 h-8.5 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black hover:bg-zinc-50 rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{t('bindMetaCatalog')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: WhatsApp Storefront Features */}
                <div className="w-full px-4 sm:px-6 md:px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="col-span-1 space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-tight mb-1">
                        {t('storefrontFeatures')}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                        {t('storefrontFeaturesDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-0">
                    {/* Toggle 1: Shopping Cart */}
                    <div className="flex items-center justify-between py-4 select-none">
                      <div className="space-y-0.5 text-left pr-4">
                        <span className="text-xs font-bold text-zinc-900 block">
                          {t('cartEnabled')}
                        </span>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                          {t('cartEnabledDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.cart_enabled}
                        onClick={() => setSettings({ ...settings, cart_enabled: !settings.cart_enabled })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.cart_enabled ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E5]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            settings.cart_enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 2: Profile Catalog Button */}
                    <div className="flex items-center justify-between py-4 border-t border-[#E8E8E6] select-none">
                      <div className="space-y-0.5 text-left pr-4">
                        <span className="text-xs font-bold text-zinc-900 block">
                          {t('catalogEnabled')}
                        </span>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                          {t('catalogEnabledDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.catalog_enabled}
                        onClick={() => setSettings({ ...settings, catalog_enabled: !settings.catalog_enabled })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.catalog_enabled ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E5]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            settings.catalog_enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 3: Automated Sync */}
                    <div className="flex items-center justify-between py-4 border-t border-[#E8E8E6] select-none">
                      <div className="space-y-0.5 text-left pr-4">
                        <span className="text-xs font-bold text-zinc-900 block">
                          {t('autoSyncCatalog')}
                        </span>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                          {t('autoSyncCatalogDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.auto_sync}
                        onClick={() => setSettings({ ...settings, auto_sync: !settings.auto_sync })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.auto_sync ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E5]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            settings.auto_sync ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Setup Instructions (Non-card layout) */}
                <div className="w-full px-4 sm:px-6 md:px-8 py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="col-span-1 space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight mb-1">
                        {t('setupInstructions')}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                        {t('setupInstructionsDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="space-y-3">
                      {[
                        {
                          step: '1',
                          title: t('step1Title'),
                          desc: t('step1Desc'),
                        },
                        {
                          step: '2',
                          title: t('step2Title'),
                          desc: t('step2Desc'),
                        },
                        {
                          step: '3',
                          title: t('step3Title'),
                          desc: t('step3Desc'),
                        },
                        {
                          step: '4',
                          title: t('step4Title'),
                          desc: t('step4Desc'),
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3 text-left">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-[#E8E8E6] text-[10px] font-bold text-zinc-700">
                            {item.step}
                          </span>
                          <div className="space-y-0.5 pt-0.5">
                            <span className="text-xs font-bold text-zinc-900 block">{item.title}</span>
                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 bg-zinc-50 rounded-md border border-[#E8E8E6] flex items-start gap-2.5 text-left text-zinc-600 text-[11px] leading-relaxed">
                      <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                      <span>
                        {t('sharedInboxNotice', {
                          inboxLink: '',
                        }).split('{inboxLink}')[0]}
                        <Link href={`/${locale}/inbox`} className="underline font-semibold hover:text-black">
                          {t('sharedInbox')}
                        </Link>
                        {t('sharedInboxNotice', {
                          inboxLink: '',
                        }).split('{inboxLink}')[1] || ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Settings Action Bar */}
                <div className="w-full px-4 sm:px-6 md:px-8 py-6 flex items-center justify-between select-none">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {settings.last_synced_at
                      ? t('settingsUpdatedOn', { date: new Date(settings.last_synced_at).toLocaleDateString() })
                      : t('settingsImmediate')}
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{isSavingSettings ? t('savingSettings') : t('saveSettings')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 1. BIND META COMMERCE CATALOG MODAL (MATCHING META ADS CONNECTION DIALOG) */}
      {showBindModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 bg-white rounded-t-xl">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-zinc-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('bindMetaCatalogTitle')}
                  </h3>
                  <span className="text-[10px] text-zinc-500 block mt-0.5 truncate font-medium">
                    {t('bindMetaCatalogDesc')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBindModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBinding} className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('catalogIdLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bindCatalogId}
                  onChange={(e) => setBindCatalogId(e.target.value)}
                  placeholder={t('catalogIdPlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black font-mono placeholder-zinc-400 transition-colors"
                />
                <span className="text-[10px] text-zinc-400 block font-medium">
                  {t('catalogIdDesc')}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('catalogNameLabel')}
                </label>
                <input
                  type="text"
                  value={bindCatalogName}
                  onChange={(e) => setBindCatalogName(e.target.value)}
                  placeholder={t('catalogNamePlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black placeholder-zinc-400 transition-colors"
                />
                <span className="text-[10px] text-zinc-400 block font-medium">
                  {t('catalogNameDesc')}
                </span>
              </div>

              {/* Action Buttons Footer Strip (Connected End-to-End Divider) */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-6 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                <button
                  type="button"
                  onClick={() => setShowBindModal(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isBinding || !bindCatalogId.trim()}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
                >
                  {isBinding ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  ) : (
                    <span>{t('bindCatalogBtn')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 2. UNLINK CONFIRMATION MODAL (MATCHING META ADS MODAL) */}
      {showUnlinkModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6 bg-white rounded-t-xl">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-200 p-1 flex items-center justify-center shrink-0">
                  <Unlink className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {t('unlinkCatalogTitle')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnlinkModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-2">
              <p className="text-xs text-zinc-600 leading-relaxed">
                {t('unlinkCatalogDesc', { name: settings.catalog_name || settings.catalog_id })}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {t('unlinkCatalogWarning')}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setShowUnlinkModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={isUnlinking}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[120px] cursor-pointer disabled:opacity-50"
              >
                {isUnlinking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <span>{t('unlinkCatalog')}</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
