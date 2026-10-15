/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useTranslations } from 'next-intl';
import { DialogModal } from '@/components/ui/DialogModal';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  Receipt,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  Trash2,
  Store,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Truck,
  CreditCard,
  MapPin,
  ShoppingBag,
} from 'lucide-react';

interface OrderLineItem {
  id?: string | number;
  product_id?: string | number;
  title: string;
  variant_title?: string | null;
  sku?: string | null;
  quantity: number;
  price: number | string;
  total?: number | string;
}

interface AddressData {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

interface EcommerceOrder {
  id: string | number;
  tenant_id: string | number;
  ecommerce_connection_id: string | number;
  external_order_id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_price: number | string;
  subtotal_price?: number | string | null;
  total_tax?: number | string | null;
  total_discounts?: number | string | null;
  currency: string;
  financial_status: 'paid' | 'pending' | 'refunded' | 'authorized' | 'voided' | string;
  fulfillment_status: 'fulfilled' | 'unfulfilled' | 'processing' | 'partial' | 'cancelled' | string;
  status: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  items_count: number;
  items_summary?: any[];
  line_items?: OrderLineItem[];
  shipping_address?: AddressData | null;
  billing_address?: AddressData | null;
  external_created_at: string;
  created_at: string;
  connection?: {
    id: string | number;
    platform?: 'shopify' | 'woocommerce' | string;
    provider?: 'shopify' | 'woocommerce' | string;
    store_url: string;
  };
  contact?: {
    id: string | number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface OrderMetrics {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  fulfilled_orders: number;
  total_revenue: number;
}

function EcommerceOrdersContent() {
  const t = useTranslations('Ecommerce');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const initialStoreId = searchParams.get('store') || '';

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [metrics, setMetrics] = useState<OrderMetrics>({
    total_orders: 0,
    paid_orders: 0,
    pending_orders: 0,
    fulfilled_orders: 0,
    total_revenue: 0,
  });
  const [stores, setStores] = useState<Array<{ id: string; platform?: string; provider?: string; store_url: string }>>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState(initialStoreId);
  const [financialFilter, setFinancialFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected Order for Modal
  const [previewOrder, setPreviewOrder] = useState<EcommerceOrder | null>(null);

  // Delete State
  const [deleteOrderId, setDeleteOrderId] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Connected Stores
  const fetchStores = async () => {
    try {
      const res = await fetchWithCsrf('/ecommerce/stores');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.connections || data.data || []);
        setStores(list);
      }
    } catch (e) {
      console.error('Failed to fetch stores', e);
    }
  };

  // Fetch Orders
  const fetchOrders = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: String(page),
          per_page: '20',
        });
        if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
        if (selectedStore) queryParams.set('connection_id', selectedStore);
        if (financialFilter !== 'all') queryParams.set('financial_status', financialFilter);
        if (fulfillmentFilter !== 'all') queryParams.set('fulfillment_status', fulfillmentFilter);

        const res = await fetchWithCsrf(`/ecommerce/orders?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders?.data || []);
          setPagination({
            current_page: data.orders?.current_page || 1,
            last_page: data.orders?.last_page || 1,
            per_page: data.orders?.per_page || 20,
            total: data.orders?.total || 0,
          });
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        } else {
          toast.error(t('noOrdersFound'));
        }
      } catch (err) {
        console.error(err);
        toast.error(t('syncOrdersError'));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedStore, financialFilter, fulfillmentFilter, t]
  );

  useEffect(() => {
    setMounted(true);
    fetchStores();
  }, []);

  // Debounced search / filter change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchOrders]);

  // Sync Orders
  const handleSyncOrders = async () => {
    try {
      setIsSyncing(true);
      const res = await fetchWithCsrf('/ecommerce/orders/sync', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: selectedStore || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || t('ordersSynchronized'));
        fetchOrders(pagination.current_page);
      } else {
        toast.error(data.message || t('syncOrdersFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('syncOrdersError'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete order
  const handleDeleteOrder = async (id: string | number) => {
    try {
      setIsDeleting(true);
      const res = await fetchWithCsrf(`/ecommerce/orders/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t('orderRemoved'));
        setDeleteOrderId(null);
        if (previewOrder?.id === id) setPreviewOrder(null);
        fetchOrders(pagination.current_page);
      } else {
        toast.error(data.message || t('orderRemoveFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('orderRemoveError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Price
  const formatPrice = (price: number | string, currency = 'USD') => {
    const num = Number(price);
    if (isNaN(num)) return `${currency} ${price}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format Date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Store options for DropdownSelect
  const storeOptions = useMemo(() => {
    return [
      { value: '', label: t('allStoresCount', { count: stores.length }) },
      ...stores.map((s) => ({
        value: String(s.id),
        label: `${(s.platform || s.provider) === 'shopify' ? t('shopify') : t('woocommerce')}: ${s.store_url}`,
      })),
    ];
  }, [stores, t]);

  if (!mounted) return null;

  return (
    <div className="w-full animate-fade-in font-sans text-black bg-white flex flex-col flex-1">
      {/* LOADING OVERLAY SPINNER */}
      {loading && (
        <div className="p-8">
          <SimpleLoader message={t('syncingOrders')} />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      {!loading && (
        <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col flex-1 pb-16">
          {/* 1. STANDARD ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('searchOrdersPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-9 w-full sm:w-64 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-semibold transition-colors"
                />
              </div>

              {stores.length > 0 && (
                <DropdownSelect
                  value={selectedStore}
                  onChange={(val) => setSelectedStore(val)}
                  options={storeOptions}
                  placeholder={t('allStores')}
                  className="w-full sm:w-auto min-w-[145px]"
                />
              )}

              <DropdownSelect
                value={financialFilter}
                onChange={(val) => setFinancialFilter(val)}
                options={[
                  { value: 'all', label: t('allFinancial') },
                  { value: 'paid', label: t('financialPaid') },
                  { value: 'pending', label: t('financialPending') },
                  { value: 'refunded', label: t('financialRefunded') },
                ]}
                placeholder={t('colPayment')}
                className="w-full sm:w-auto min-w-[130px]"
              />

              <DropdownSelect
                value={fulfillmentFilter}
                onChange={(val) => setFulfillmentFilter(val)}
                options={[
                  { value: 'all', label: t('allFulfillment') },
                  { value: 'fulfilled', label: t('fulfillmentFulfilled') },
                  { value: 'processing', label: t('fulfillmentProcessing') },
                  { value: 'unfulfilled', label: t('fulfillmentUnfulfilled') },
                ]}
                placeholder={t('colFulfillment')}
                className="w-full sm:w-auto min-w-[140px]"
              />

              <button
                type="button"
                onClick={() => fetchOrders(pagination.current_page)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-[#E8E8E6] bg-[#F5F5F5] text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                title={t('refreshOrders')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Right Action Triggers */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleSyncOrders}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t('syncing') : t('syncOrders')}</span>
              </button>
            </div>
          </div>

          {/* 2. ORDERS DATATABLE OR EMPTY STATE */}
          {orders.length === 0 ? (
            <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-fade-in shadow-3xs">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <Receipt className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">
                {searchQuery || selectedStore || financialFilter !== 'all' || fulfillmentFilter !== 'all'
                  ? t('noMatchingOrders')
                  : t('noOrdersFound')}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {searchQuery || selectedStore || financialFilter !== 'all' || fulfillmentFilter !== 'all'
                  ? t('noMatchingOrdersDesc')
                  : t('noOrdersDesc')}
              </p>
              {searchQuery || selectedStore || financialFilter !== 'all' || fulfillmentFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStore('');
                    setFinancialFilter('all');
                    setFulfillmentFilter('all');
                  }}
                  className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                >
                  <span>{t('resetFilters')}</span>
                </button>
              ) : (
                <Link
                  href={`/${locale}/ecommerce/stores`}
                  className="flex items-center gap-1.5 px-3.5 h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>{t('goToStores')}</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs select-none min-w-[850px]">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                      <th className="px-6 py-3.5">{t('colOrder')}</th>
                      <th className="px-6 py-3.5">{t('colCustomer')}</th>
                      <th className="px-6 py-3.5">{t('colStorefront')}</th>
                      <th className="px-6 py-3.5">{t('colItems')}</th>
                      <th className="px-6 py-3.5">{t('colTotal')}</th>
                      <th className="px-6 py-3.5">{t('colPayment')}</th>
                      <th className="px-6 py-3.5">{t('colFulfillment')}</th>
                      <th className="px-6 py-3.5 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                    {orders.map((order, index) => {
                      const isShopify = (order.connection?.platform || order.connection?.provider) === 'shopify';
                      const isPaid = order.financial_status === 'paid';
                      const isPending = order.financial_status === 'pending' || order.financial_status === 'authorized';
                      const isRefunded = order.financial_status === 'refunded';

                      const isFulfilled = order.fulfillment_status === 'fulfilled';
                      const isProcessing = order.fulfillment_status === 'processing';

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[#FAFAFA]/40 transition-all font-semibold animate-row-fade"
                          style={{ animationDelay: `${index * 20}ms` }}
                        >
                          {/* 1. Order Number & Date */}
                          <td className="px-6 py-4">
                            <div className="min-w-0">
                              <span
                                className="text-xs font-black text-zinc-955 hover:underline cursor-pointer block"
                                onClick={() => setPreviewOrder(order)}
                              >
                                {order.order_number}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                                {formatDate(order.external_created_at || order.created_at)}
                              </span>
                            </div>
                          </td>

                          {/* 2. Customer */}
                          <td className="px-6 py-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-zinc-900 truncate block">
                                  {order.customer_name || t('guestCustomer')}
                                </span>
                                {order.contact && (
                                  <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1 py-0.2 rounded border border-zinc-200" title={t('crmMatchedContact')}>
                                    CRM
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5">
                                {order.customer_email || order.customer_phone || '—'}
                              </span>
                            </div>
                          </td>

                          {/* 3. Storefront */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-zinc-850 select-none">
                              <img
                                src={isShopify ? '/shopify.webp' : '/woocommerce.webp'}
                                alt="store"
                                className="h-4 w-4 object-contain shrink-0"
                              />
                              <span className="capitalize text-[11px] font-semibold">
                                {isShopify ? t('shopify') : t('woocommerce')}
                              </span>
                            </div>
                          </td>

                          {/* 4. Items */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                {(order.items_count || order.line_items?.length || 1) === 1
                                  ? t('itemsCountUnit', { count: 1 })
                                  : t('itemsCountUnitPlural', { count: order.items_count || order.line_items?.length || 1 })}
                              </span>
                            </div>
                          </td>

                          {/* 5. Total Price */}
                          <td className="px-6 py-4 font-black text-zinc-955 whitespace-nowrap">
                            {formatPrice(order.total_price, order.currency)}
                          </td>

                          {/* 6. Payment Status (Colored text with icon) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isPaid ? (
                              <div className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{t('financialPaid')}</span>
                              </div>
                            ) : isPending ? (
                              <div className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>{order.financial_status ? (t(`financial${order.financial_status.charAt(0).toUpperCase() + order.financial_status.slice(1)}`) || order.financial_status) : t('financialPending')}</span>
                              </div>
                            ) : isRefunded ? (
                              <div className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                <span>{t('financialRefunded')}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-zinc-500 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                <span className="capitalize">{order.financial_status || 'Unknown'}</span>
                              </div>
                            )}
                          </td>

                          {/* 7. Fulfillment Status (Colored text with icon) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isFulfilled ? (
                              <div className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span>{t('fulfillmentFulfilled')}</span>
                              </div>
                            ) : isProcessing ? (
                              <div className="inline-flex items-center gap-1.5 text-purple-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                <span>{t('fulfillmentProcessing')}</span>
                              </div>
                            ) : order.fulfillment_status === 'unfulfilled' || !order.fulfillment_status ? (
                              <div className="inline-flex items-center gap-1.5 text-zinc-500 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                <span>{t('fulfillmentUnfulfilled')}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-zinc-600 font-bold text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                <span className="capitalize">{order.fulfillment_status}</span>
                              </div>
                            )}
                          </td>

                          {/* 8. Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewOrder(order)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                title={t('viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {order.tracking_url && (
                                <a
                                  href={order.tracking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                  title={t('trackingDetails')}
                                >
                                  <Truck className="h-4 w-4" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteOrderId(order.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={t('removeOrder')}
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

              {/* PAGINATION FOOTER */}
              {pagination.last_page > 1 && (
                <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-3.5 flex items-center justify-between text-xs text-[#6B6B6B] select-none font-semibold">
                  <span>
                    {t('showingOrders', {
                      start: (pagination.current_page - 1) * pagination.per_page + 1,
                      end: Math.min(pagination.current_page * pagination.per_page, pagination.total),
                      total: pagination.total,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.current_page <= 1}
                      onClick={() => fetchOrders(pagination.current_page - 1)}
                      className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:hover:bg-white text-[10px] font-bold uppercase select-none shadow-3xs transition-all cursor-pointer"
                    >
                      {t('prev')}
                    </button>
                    <span className="px-2 text-zinc-600 font-medium text-xs">
                      {pagination.current_page} / {pagination.last_page}
                    </span>
                    <button
                      type="button"
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() => fetchOrders(pagination.current_page + 1)}
                      className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:hover:bg-white text-[10px] font-bold uppercase select-none shadow-3xs transition-all cursor-pointer"
                    >
                      {t('next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. ORDER DETAIL MODAL */}
      <DialogModal
        isOpen={Boolean(previewOrder)}
        onClose={() => setPreviewOrder(null)}
        title={t('orderNumberTitle', { number: previewOrder?.order_number ?? '' })}
        subtitle={t('placedOn', { date: formatDate(previewOrder?.external_created_at || previewOrder?.created_at) })}
        icon={<Receipt className="h-4 w-4 text-zinc-700" />}
        maxWidth="2xl"
        secondaryAction={{
          label: t('close'),
          onClick: () => setPreviewOrder(null),
        }}
        leftFooterAction={
          previewOrder?.tracking_url ? (
            <a
              href={previewOrder.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>{t('trackShipment')}</span>
            </a>
          ) : null
        }
      >
        {previewOrder && (
          <div className="space-y-4 text-xs font-sans">
            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAFAFA] p-3 rounded-lg border border-[#E8E8E6]">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colTotal')}
                </span>
                <span className="text-sm font-bold text-zinc-955">
                  {formatPrice(previewOrder.total_price, previewOrder.currency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colPayment')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs capitalize">
                  <span className={`h-1.5 w-1.5 rounded-full ${previewOrder.financial_status === 'paid'
                      ? 'bg-emerald-500'
                      : previewOrder.financial_status === 'refunded'
                        ? 'bg-rose-500'
                        : previewOrder.financial_status === 'pending' || previewOrder.financial_status === 'authorized'
                          ? 'bg-amber-500'
                          : 'bg-zinc-400'
                    }`} />
                  <span className={
                    previewOrder.financial_status === 'paid'
                      ? 'text-emerald-600'
                      : previewOrder.financial_status === 'refunded'
                        ? 'text-rose-600'
                        : previewOrder.financial_status === 'pending' || previewOrder.financial_status === 'authorized'
                          ? 'text-amber-600'
                          : 'text-zinc-600'
                  }>
                    {previewOrder.financial_status ? (t(`financial${previewOrder.financial_status.charAt(0).toUpperCase() + previewOrder.financial_status.slice(1)}`) || previewOrder.financial_status) : t('financialPending')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colFulfillment')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs capitalize">
                  <span className={`h-1.5 w-1.5 rounded-full ${previewOrder.fulfillment_status === 'fulfilled'
                      ? 'bg-blue-500'
                      : previewOrder.fulfillment_status === 'processing'
                        ? 'bg-purple-500'
                        : 'bg-zinc-400'
                    }`} />
                  <span className={
                    previewOrder.fulfillment_status === 'fulfilled'
                      ? 'text-blue-600'
                      : previewOrder.fulfillment_status === 'processing'
                        ? 'text-purple-600'
                        : 'text-zinc-600'
                  }>
                    {previewOrder.fulfillment_status ? (t(`fulfillment${previewOrder.fulfillment_status.charAt(0).toUpperCase() + previewOrder.fulfillment_status.slice(1)}`) || previewOrder.fulfillment_status) : t('fulfillmentUnfulfilled')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colStorefront')}
                </span>
                <span className="text-xs font-bold capitalize text-zinc-900 block mt-0.5">
                  {(previewOrder.connection?.platform || previewOrder.connection?.provider) === 'shopify' ? t('shopify') : t('woocommerce')}
                </span>
              </div>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Card */}
              <div className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-[11px] mb-1">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('customerInfo')}</span>
                </div>
                <p className="text-xs font-bold text-zinc-900">
                  {previewOrder.customer_name || t('guestCustomer')}
                </p>
                {previewOrder.customer_email && (
                  <p className="text-[11px] text-zinc-600 font-mono">
                    {previewOrder.customer_email}
                  </p>
                )}
                {previewOrder.customer_phone && (
                  <p className="text-[11px] text-zinc-600 font-mono">
                    {previewOrder.customer_phone}
                  </p>
                )}
              </div>

              {/* Shipping Address Card */}
              <div className="p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-[11px] mb-1">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('shippingAddress')}</span>
                </div>
                {previewOrder.shipping_address ? (
                  <div className="text-[11px] text-zinc-700 leading-relaxed">
                    {previewOrder.shipping_address.name && (
                      <p className="font-semibold">{previewOrder.shipping_address.name}</p>
                    )}
                    <p>{previewOrder.shipping_address.address1}</p>
                    {previewOrder.shipping_address.address2 && <p>{previewOrder.shipping_address.address2}</p>}
                    <p>
                      {[
                        previewOrder.shipping_address.city,
                        previewOrder.shipping_address.province,
                        previewOrder.shipping_address.zip,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {previewOrder.shipping_address.country && (
                      <p className="font-medium text-zinc-500">{previewOrder.shipping_address.country}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">{t('noShippingAddress')}</p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                {t('orderedItems', { count: previewOrder.line_items?.length || previewOrder.items_count || 1 })}
              </label>
              <div className="border border-[#E8E8E6] rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] text-[10px] font-bold text-zinc-500 uppercase border-b border-[#E8E8E6]">
                    <tr>
                      <th className="py-2 px-3">{t('item')}</th>
                      <th className="py-2 px-3">{t('colSku')}</th>
                      <th className="py-2 px-3">{t('colPrice')}</th>
                      <th className="py-2 px-3 text-center">{t('qty')}</th>
                      <th className="py-2 px-3 text-right">{t('colTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(previewOrder.line_items && previewOrder.line_items.length > 0
                      ? previewOrder.line_items
                      : previewOrder.items_summary || []
                    ).map((item: any, i: number) => {
                      const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                      return (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-semibold text-zinc-900">
                            <div>
                              <span>{item.title || item.name || 'Product'}</span>
                              {item.variant_title && (
                                <span className="text-[10px] text-zinc-400 block font-normal">
                                  {item.variant_title}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">
                            {item.sku || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-zinc-800">
                            {formatPrice(item.price, previewOrder.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {item.quantity || 1}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-zinc-955">
                            {formatPrice(item.total || itemTotal, previewOrder.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-zinc-200 pt-3 space-y-1.5 text-xs">
              {previewOrder.subtotal_price && (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>{t('subtotal')}</span>
                  <span className="font-semibold">
                    {formatPrice(previewOrder.subtotal_price, previewOrder.currency)}
                  </span>
                </div>
              )}
              {previewOrder.total_tax ? (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>{t('tax')}</span>
                  <span className="font-semibold">
                    {formatPrice(previewOrder.total_tax, previewOrder.currency)}
                  </span>
                </div>
              ) : null}
              {previewOrder.total_discounts ? (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>{t('discounts')}</span>
                  <span className="font-semibold">
                    -{formatPrice(previewOrder.total_discounts, previewOrder.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-zinc-955 font-black text-sm pt-1 border-t border-zinc-100">
                <span>{t('totalAmount')}</span>
                <span>{formatPrice(previewOrder.total_price, previewOrder.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <DialogModal
        isOpen={Boolean(deleteOrderId)}
        onClose={() => setDeleteOrderId(null)}
        title={t('removeOrderTitle')}
        icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        iconBoxClassName="bg-red-50 border border-red-100 text-red-600"
        maxWidth="sm"
        primaryAction={{
          label: isDeleting ? t('removing') : t('removeOrder'),
          loading: isDeleting,
          variant: 'danger',
          onClick: () => deleteOrderId && handleDeleteOrder(deleteOrderId),
        }}
        secondaryAction={{
          label: t('cancel'),
          onClick: () => setDeleteOrderId(null),
        }}
      >
        <p className="text-xs text-zinc-650 leading-relaxed font-normal">
          {t('removeOrderWarning')}
        </p>
      </DialogModal>
    </div>
  );
}

export default function EcommerceOrdersPage() {
  const t = useTranslations('Ecommerce');
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <SimpleLoader message={t('loadingOrders')} />
        </div>
      }
    >
      <EcommerceOrdersContent />
    </Suspense>
  );
}
