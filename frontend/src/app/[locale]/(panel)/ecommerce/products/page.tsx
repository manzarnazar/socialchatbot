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
  Package,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Store,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';

interface ProductVariant {
  id?: string | number;
  title?: string;
  price?: number | string;
  sku?: string;
  inventory_quantity?: number;
  stock_quantity?: number;
  options?: any;
}

interface EcommerceProduct {
  id: string;
  tenant_id: string;
  ecommerce_connection_id: string;
  external_product_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  currency: string;
  sku: string | null;
  stock_quantity: number;
  status: string;
  image_url: string | null;
  images: string[] | null;
  variants: ProductVariant[] | null;
  categories: string[] | null;
  external_url: string | null;
  metadata: any;
  created_at: string;
  connection?: {
    id: string;
    platform?: 'shopify' | 'woocommerce' | string;
    provider?: 'shopify' | 'woocommerce' | string;
    store_url: string;
  };
}

interface CatalogMeta {
  total_products: number;
  in_stock: number;
  out_of_stock: number;
  total_stores: number;
}

function EcommerceProductsContent() {
  const t = useTranslations('Ecommerce');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const initialStoreId = searchParams.get('store') || '';

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 24,
    total: 0,
  });
  const [meta, setMeta] = useState<CatalogMeta>({
    total_products: 0,
    in_stock: 0,
    out_of_stock: 0,
    total_stores: 0,
  });
  const [stores, setStores] = useState<Array<{ id: string; platform?: string; provider?: string; store_url: string }>>([]);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState(initialStoreId);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Selected Product for Preview Modal
  const [previewProduct, setPreviewProduct] = useState<EcommerceProduct | null>(null);

  // Product Deletion State
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
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

  // Fetch Products with pagination and filters
  const fetchProducts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: String(page),
          per_page: '24',
        });
        if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
        if (selectedStore) queryParams.set('connection_id', selectedStore);
        if (statusFilter !== 'all') queryParams.set('status', statusFilter);

        const res = await fetchWithCsrf(`/ecommerce/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products?.data || []);
          setPagination({
            current_page: data.products?.current_page || 1,
            last_page: data.products?.last_page || 1,
            per_page: data.products?.per_page || 24,
            total: data.products?.total || 0,
          });
          if (data.meta || data.metrics) {
            setMeta(data.meta || data.metrics);
          }
        } else {
          toast.error(t('noProductsFound'));
        }
      } catch (err) {
        console.error(err);
        toast.error(t('syncError'));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedStore, statusFilter, t]
  );

  useEffect(() => {
    setMounted(true);
    fetchStores();
  }, []);

  // Debounced search / filter change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchProducts]);

  // Sync Products across stores
  const handleSyncAllProducts = async () => {
    try {
      setIsSyncingAll(true);
      const res = await fetchWithCsrf('/ecommerce/products/sync', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: selectedStore || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success(data.message || t('syncCatalogSuccess'));
        fetchProducts(pagination.current_page);
      } else {
        toast.error(data.message || t('syncFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('syncError'));
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    try {
      setIsDeleting(true);
      const res = await fetchWithCsrf(`/ecommerce/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t('productRemoved'));
        setDeleteProductId(null);
        if (previewProduct?.id === id) setPreviewProduct(null);
        fetchProducts(pagination.current_page);
      } else {
        toast.error(data.message || t('productRemoveFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('productRemoveError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Format price helper
  const formatPrice = (price: number | string, currency = 'USD') => {
    const num = Number(price);
    if (isNaN(num)) return `${currency} ${price}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Store options for DropdownSelect
  const storeOptions = useMemo(() => {
    return [
      { value: '', label: t('allStoresCount', { count: stores.length }) },
      ...stores.map((s) => ({
        value: s.id,
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
          <SimpleLoader message={t('syncingProducts')} />
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
                  placeholder={t('searchProductsPlaceholder')}
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
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: t('allStock') },
                  { value: 'in_stock', label: t('inStock') },
                  { value: 'out_of_stock', label: t('outOfStock') },
                ]}
                placeholder={t('allStock')}
                className="w-full sm:w-auto min-w-[130px]"
              />

              <button
                type="button"
                onClick={() => fetchProducts(pagination.current_page)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-[#E8E8E6] bg-[#F5F5F5] text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                title={t('refreshProducts')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
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
                      ? 'bg-white text-zinc-955 shadow-3xs font-bold border border-[#E8E8E6]/60'
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
                      ? 'bg-white text-zinc-955 shadow-3xs font-bold border border-[#E8E8E6]/60'
                      : 'text-zinc-500 hover:text-zinc-900 font-medium'
                  }`}
                  title={t('viewGrid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>{t('viewGrid')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSyncAllProducts}
                disabled={isSyncingAll}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>{isSyncingAll ? t('syncing') : t('syncCatalog')}</span>
              </button>
            </div>
          </div>

          {/* 2. CATALOG DATATABLE OR EMPTY STATE */}
          {products.length === 0 ? (
            <div className="text-center py-16 px-8 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center select-none animate-fade-in shadow-3xs">
              <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <Package className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">
                {searchQuery || selectedStore || statusFilter !== 'all'
                  ? t('noMatchingProducts')
                  : t('noProductsFound')}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {searchQuery || selectedStore || statusFilter !== 'all'
                  ? t('noMatchingProductsDesc')
                  : t('noProductsDesc')}
              </p>
              {searchQuery || selectedStore || statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStore('');
                    setStatusFilter('all');
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
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs animate-row-fade">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs select-none min-w-[760px]">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] tracking-tight uppercase">
                      <th className="px-6 py-3.5">{t('colProduct')}</th>
                      <th className="px-6 py-3.5">{t('colStorefront')}</th>
                      <th className="px-6 py-3.5">{t('colSku')}</th>
                      <th className="px-6 py-3.5">{t('colPrice')}</th>
                      <th className="px-6 py-3.5">{t('colInventory')}</th>
                      <th className="px-6 py-3.5 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E6] text-zinc-750 font-semibold">
                    {products.map((product, index) => {
                      const isInStock = product.stock_quantity > 0;
                      const isShopify = (product.connection?.platform || product.connection?.provider) === 'shopify';

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-[#FAFAFA]/40 transition-all font-semibold animate-row-fade"
                          style={{ animationDelay: `${index * 20}ms` }}
                        >
                          {/* 1. Thumbnail & Title */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200 shrink-0 overflow-hidden flex items-center justify-center">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0 max-w-sm">
                                <span
                                  className="text-xs font-black text-zinc-955 hover:underline cursor-pointer truncate block"
                                  onClick={() => setPreviewProduct(product)}
                                >
                                  {product.title}
                                </span>
                                {product.handle && (
                                  <span className="text-[10px] text-zinc-400 truncate block font-mono">
                                    /{product.handle}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Store */}
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

                          {/* 3. SKU */}
                          <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            {product.sku || '—'}
                          </td>

                          {/* 4. Price */}
                          <td className="px-6 py-4 font-black text-zinc-955 whitespace-nowrap">
                            <div>
                              <span>{formatPrice(product.price, product.currency)}</span>
                              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                                <span className="text-[10px] text-zinc-400 line-through block font-medium">
                                  {formatPrice(product.compare_at_price, product.currency)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Inventory (Colored text with icon) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isInStock ? (
                              <div className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>{t('inStockCountUnit', { count: product.stock_quantity })}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>{t('outOfStock')}</span>
                              </div>
                            )}
                          </td>

                          {/* 6. Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(product)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                title={t('viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {product.external_url && (
                                <a
                                  href={product.external_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                                  title={t('storefrontLink')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteProductId(product.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={t('removeProduct')}
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
                    {t('showingProducts', {
                      start: (pagination.current_page - 1) * pagination.per_page + 1,
                      end: Math.min(pagination.current_page * pagination.per_page, pagination.total),
                      total: pagination.total,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.current_page <= 1}
                      onClick={() => fetchProducts(pagination.current_page - 1)}
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
                      onClick={() => fetchProducts(pagination.current_page + 1)}
                      className="border border-[#E8E8E6] bg-white px-3 py-1.5 rounded-[6px] text-zinc-700 hover:text-black hover:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:hover:bg-white text-[10px] font-bold uppercase select-none shadow-3xs transition-all cursor-pointer"
                    >
                      {t('next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => {
                  const isInStock = product.stock_quantity > 0;
                  const isShopify = (product.connection?.platform || product.connection?.provider) === 'shopify';

                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-[#E8E8E6] rounded-[10px] overflow-hidden shadow-3xs hover:shadow-2xs transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Image Preview */}
                        <div className="relative aspect-square w-full bg-[#FAFAFA] border-b border-[#E8E8E6] overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-300">
                              <ShoppingBag className="h-8 w-8 stroke-1 mb-1" />
                              <span className="text-[10px] font-semibold text-zinc-400">{t('noImage')}</span>
                            </div>
                          )}

                          {/* Provider Pill */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/90 border border-[#E8E8E6] text-[10px] font-bold shadow-3xs">
                            <img
                              src={isShopify ? '/shopify.webp' : '/woocommerce.webp'}
                              alt="platform"
                              className="h-3 w-3 object-contain"
                            />
                            <span className="text-zinc-700">{isShopify ? t('shopify') : t('woocommerce')}</span>
                          </div>

                          {/* Stock Status Indicator */}
                          <div className="absolute top-2.5 right-2.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs border border-[#E8E8E6] text-[10px] font-bold shadow-3xs">
                              <span className={`h-1.5 w-1.5 rounded-full ${isInStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className={isInStock ? 'text-emerald-600' : 'text-rose-600'}>
                                {isInStock ? t('inStockCountUnit', { count: product.stock_quantity }) : t('outOfStock')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-3.5 space-y-1.5">
                          {product.sku && (
                            <span className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                              {t('colSku')}: {product.sku}
                            </span>
                          )}
                          <h3
                            className="text-xs font-bold text-zinc-955 line-clamp-2 hover:underline cursor-pointer"
                            onClick={() => setPreviewProduct(product)}
                            title={product.title}
                          >
                            {product.title}
                          </h3>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="p-3.5 pt-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-zinc-955">
                            {formatPrice(product.price, product.currency)}
                          </div>
                          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                            <div className="text-[10px] text-zinc-400 line-through">
                              {formatPrice(product.compare_at_price, product.currency)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewProduct(product)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                            title={t('viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {product.external_url && (
                            <a
                              href={product.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-zinc-400 hover:text-zinc-955 hover:bg-zinc-50 rounded-[6px] transition-all inline-flex items-center justify-center cursor-pointer"
                              title={t('storefrontLink')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteProductId(product.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                            title={t('removeProduct')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Pagination Footer */}
              {pagination.last_page > 1 && (
                <div className="bg-white border border-[#E8E8E6] rounded-[10px] px-6 py-3.5 flex items-center justify-between text-xs text-[#6B6B6B] select-none font-semibold shadow-3xs">
                  <span>
                    {t('showingProducts', {
                      start: (pagination.current_page - 1) * pagination.per_page + 1,
                      end: Math.min(pagination.current_page * pagination.per_page, pagination.total),
                      total: pagination.total,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.current_page <= 1}
                      onClick={() => fetchProducts(pagination.current_page - 1)}
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
                      onClick={() => fetchProducts(pagination.current_page + 1)}
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

      {/* 4. PRODUCT DETAIL MODAL */}
      <DialogModal
        isOpen={Boolean(previewProduct)}
        onClose={() => setPreviewProduct(null)}
        title={previewProduct?.title}
        subtitle={previewProduct?.external_product_id ? `${t('colProduct')} ID: ${previewProduct.external_product_id}` : undefined}
        icon={<Package className="h-4 w-4 text-zinc-700" />}
        maxWidth="2xl"
        secondaryAction={{
          label: t('close'),
          onClick: () => setPreviewProduct(null),
        }}
        leftFooterAction={
          previewProduct?.external_url ? (
            <a
              href={previewProduct.external_url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black rounded-[6px] text-xs font-bold shadow-3xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t('openInStorefront')}</span>
            </a>
          ) : null
        }
      >
        {previewProduct && (
          <div className="space-y-4 text-xs font-sans">
            {/* Images */}
            {previewProduct.images && previewProduct.images.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {previewProduct.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="h-20 w-20 rounded-lg border border-[#E8E8E6] overflow-hidden shrink-0 bg-[#FAFAFA]"
                  >
                    <img
                      src={img}
                      alt={`Product preview ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : previewProduct.image_url ? (
              <div className="h-32 w-full rounded-lg border border-[#E8E8E6] overflow-hidden bg-[#FAFAFA]">
                <img
                  src={previewProduct.image_url}
                  alt={previewProduct.title}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAFAFA] p-3 rounded-lg border border-[#E8E8E6]">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colPrice')}
                </span>
                <span className="text-sm font-bold text-zinc-955">
                  {formatPrice(previewProduct.price, previewProduct.currency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colInventory')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`h-2 w-2 rounded-full ${previewProduct.stock_quantity > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-sm font-bold ${previewProduct.stock_quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {previewProduct.stock_quantity > 0 ? t('inStockCountUnit', { count: previewProduct.stock_quantity }) : t('outOfStock')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('colSku')}
                </span>
                <span className="text-sm font-mono font-bold text-zinc-955">
                  {previewProduct.sku || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('storeSource')}
                </span>
                <span className="text-sm font-bold text-zinc-955 capitalize">
                  {(previewProduct.connection?.platform || previewProduct.connection?.provider) === 'shopify' ? t('shopify') : t('woocommerce')}
                </span>
              </div>
            </div>

            {/* Description */}
            {previewProduct.description && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('productDescription')}
                </label>
                <div className="bg-[#F5F5F5] p-3 rounded-md border border-[#E8E8E6] text-zinc-700 leading-relaxed text-xs max-h-36 overflow-y-auto">
                  {previewProduct.description}
                </div>
              </div>
            )}

            {/* Variants Table */}
            {previewProduct.variants && previewProduct.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('productVariants')} ({previewProduct.variants.length})
                </label>
                <div className="border border-[#E8E8E6] rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] text-[10px] font-bold text-zinc-500 uppercase border-b border-[#E8E8E6]">
                      <tr>
                        <th className="py-2 px-3">{t('variantName')}</th>
                        <th className="py-2 px-3">{t('colSku')}</th>
                        <th className="py-2 px-3">{t('colPrice')}</th>
                        <th className="py-2 px-3">{t('colInventory')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {previewProduct.variants.map((v, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-semibold text-zinc-800">
                            {v.title || 'Default'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-zinc-500">
                            {v.sku || '—'}
                          </td>
                          <td className="py-2 px-3 font-bold text-zinc-955">
                            {formatPrice(v.price ?? previewProduct.price, previewProduct.currency)}
                          </td>
                          <td className="py-2 px-3">
                            {v.inventory_quantity ?? v.stock_quantity ?? '—'}
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
      </DialogModal>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <DialogModal
        isOpen={Boolean(deleteProductId)}
        onClose={() => setDeleteProductId(null)}
        title={t('removeProductTitle')}
        icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        iconBoxClassName="bg-red-50 border border-red-100 text-red-600"
        maxWidth="sm"
        primaryAction={{
          label: isDeleting ? t('removing') : t('remove'),
          loading: isDeleting,
          variant: 'danger',
          onClick: () => deleteProductId && handleDeleteProduct(deleteProductId),
        }}
        secondaryAction={{
          label: t('cancel'),
          onClick: () => setDeleteProductId(null),
        }}
      >
        <p className="text-xs text-zinc-650 leading-relaxed font-normal">
          {t('removeProductWarning')}
        </p>
      </DialogModal>
    </div>
  );
}

export default function EcommerceProductsPage() {
  const t = useTranslations('Ecommerce');
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <SimpleLoader message={t('loadingProducts')} />
        </div>
      }
    >
      <EcommerceProductsContent />
    </Suspense>
  );
}
