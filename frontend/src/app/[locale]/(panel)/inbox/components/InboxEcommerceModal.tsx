/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { fetchWithCsrf } from '@/lib/api';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import {
  ShoppingBag,
  Layers3,
  Tag,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Send,
  CornerDownLeft,
  CheckCircle2,
  Package,
  Check,
  Percent,
  Copy,
  X
} from 'lucide-react';

export interface InboxEcommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConvId: number | null;
  activeConv: any;
  isWhatsAppActive: boolean;
  initialTab?: 'products' | 'whatsapp_catalog' | 'discounts';
  onSendDirectOutbound: (text: string, mediaUrl: string | null) => void;
  onInsertIntoComposer: (text: string) => void;
  onRefreshMessages: () => void;
}

export default function InboxEcommerceModal({
  isOpen,
  onClose,
  activeConvId,
  activeConv,
  isWhatsAppActive,
  initialTab = 'products',
  onSendDirectOutbound,
  onInsertIntoComposer,
  onRefreshMessages
}: InboxEcommerceModalProps) {
  const t = useTranslations('Inbox');
  const tCommon = useTranslations('Common');

  // E-Commerce Catalog & Special Offer Actions State
  const [ecommerceModalTab, setEcommerceModalTab] = useState<'products' | 'whatsapp_catalog' | 'discounts'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setEcommerceModalTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'in_stock'>('all');
  const [existingCoupons, setExistingCoupons] = useState<string[]>([]);
  const [selectedProductCoupon, setSelectedProductCoupon] = useState<string>('');

  // WhatsApp Interactive Catalog Composer State
  const [waSendType, setWaSendType] = useState<'catalog' | 'single' | 'collection'>('catalog');
  const [waSendHeader, setWaSendHeader] = useState('');
  const [waSendBody, setWaSendBody] = useState('');
  const [waSendFooter, setWaSendFooter] = useState('');
  const [waSelectedProductId, setWaSelectedProductId] = useState<string>('');
  const [waSelectedCollectionIds, setWaSelectedCollectionIds] = useState<string[]>([]);
  const [waCollectionTitle, setWaCollectionTitle] = useState('');
  const [isSendingWaInteractive, setIsSendingWaInteractive] = useState(false);
  const [waProductSearch, setWaProductSearch] = useState('');

  // Discount Generator Form State
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountDurationDays, setDiscountDurationDays] = useState<number>(7);
  const [isGeneratingDiscount, setIsGeneratingDiscount] = useState(false);
  const [generatedDiscountResult, setGeneratedDiscountResult] = useState<any | null>(null);
  const [recentDiscounts, setRecentDiscounts] = useState<any[]>([]);

  // Load catalog products from backend API
  const loadCatalogProducts = async (searchQuery?: string) => {
    setCatalogLoading(true);
    try {
      const q = typeof searchQuery === 'string' ? searchQuery : catalogSearch;
      const res = await fetchWithCsrf(`/ecommerce/products?per_page=40&search=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const prods = data.products?.data || data.products || [];
        setCatalogProducts(prods);
        if (prods.length > 0) {
          setWaSelectedProductId(prev => prev || prods[0].sku || prods[0].external_product_id || String(prods[0].id));
          setWaSelectedCollectionIds(prev => prev.length > 0 ? prev : prods.slice(0, 3).map((p: any) => p.sku || p.external_product_id || String(p.id)));
        }
      }
    } catch (err) {
      console.error('Failed to load catalog products', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Load existing coupon promo codes
  const loadExistingCoupons = async () => {
    try {
      const res = await fetchWithCsrf('/ecommerce/coupons?details=1');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setExistingCoupons(data);
        } else if (data.codes) {
          setExistingCoupons(data.codes);
          if (data.coupons) {
            setRecentDiscounts(data.coupons);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load coupons', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCatalogProducts();
      loadExistingCoupons();
    }
  }, [isOpen]);

  // Custom dropdown options for discount promo code selector
  const couponDropdownOptions = useMemo(() => {
    const opts: { value: string; label: string; icon?: React.ReactNode; badge?: string }[] = [
      { value: '', label: t('noPromoDiscount') || 'No promo discount' },
    ];
    const seen = new Set<string>();
    for (const code of existingCoupons) {
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const match = recentDiscounts.find((d: any) => d.code === code);
      opts.push({
        value: code,
        label: code,
        icon: <Tag className="h-3.5 w-3.5 text-zinc-400 shrink-0" />,
        badge: match
          ? (match.discount_type === 'percentage' ? `${match.value}% OFF` : `$${match.value} OFF`)
          : undefined,
      });
    }
    for (const d of recentDiscounts) {
      if (!d?.code || seen.has(d.code)) continue;
      seen.add(d.code);
      opts.push({
        value: d.code,
        label: d.code,
        icon: <Tag className="h-3.5 w-3.5 text-zinc-400 shrink-0" />,
        badge: d.discount_type === 'percentage' ? `${d.value}% OFF` : `$${d.value} OFF`,
      });
    }
    return opts;
  }, [existingCoupons, recentDiscounts, t]);

  const waSelectedProductObj = useMemo(() => {
    return catalogProducts.find(
      (p: any) => (p.sku || p.external_product_id || String(p.id)) === waSelectedProductId || String(p.id) === String(waSelectedProductId)
    );
  }, [catalogProducts, waSelectedProductId]);

  const waFilteredCollectionProducts = useMemo(() => {
    if (!waProductSearch.trim()) return catalogProducts;
    const q = waProductSearch.toLowerCase();
    return catalogProducts.filter((p: any) =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.product_retailer_id && p.product_retailer_id.toLowerCase().includes(q))
    );
  }, [catalogProducts, waProductSearch]);

  // Build product message text and checkout link
  const buildProductMessage = (product: any, promoCode?: string) => {
    const currency = product.currency || '$';
    const priceFormatted = `${currency}${Number(product.price || 0).toFixed(2)}`;
    let checkoutUrl = product.external_url || '';
    if (promoCode && checkoutUrl) {
      const sep = checkoutUrl.includes('?') ? '&' : '?';
      checkoutUrl += `${sep}discount=${encodeURIComponent(promoCode)}`;
    }

    let text = `🛍️ **${product.title}**\nPrice: ${priceFormatted}`;
    if (product.sku) {
      text += ` • SKU: ${product.sku}`;
    }
    if (product.description) {
      const cleanDesc = product.description.replace(/<[^>]*>/g, '').trim().slice(0, 160);
      if (cleanDesc) {
        text += `\n\n${cleanDesc}...`;
      }
    }
    if (promoCode) {
      text += `\n\n🎉 Promo Applied: **${promoCode}**`;
    }
    if (checkoutUrl) {
      text += `\n\n🔗 Order Link: ${checkoutUrl}`;
    }
    return { text, checkoutUrl, mediaUrl: product.image_url || null };
  };

  // Send product directly to customer in active chat
  const handleSendProductToChat = (product: any) => {
    if (!activeConvId) {
      toast.error(t('toastSelectActiveConv'));
      return;
    }
    const { text, mediaUrl } = buildProductMessage(product, selectedProductCoupon);
    onSendDirectOutbound(text, mediaUrl);
    onClose();
    toast.success(t('toastProductSent'));
  };

  // Insert product recommendation into composer
  const handleInsertProductIntoComposer = (product: any) => {
    const { text } = buildProductMessage(product, selectedProductCoupon);
    onInsertIntoComposer(text);
    onClose();
    toast.success(t('toastProductInserted'));
  };

  // Send WhatsApp interactive catalog message (SPM or Catalog Message)
  const handleSendWhatsAppInteractive = async (
    type: 'product' | 'catalog_message',
    product?: any
  ) => {
    if (!activeConvId || !activeConv) {
      toast.error(t('toastSelectActiveConv'));
      return;
    }
    const retailerId = product?.sku || product?.external_product_id || product?.id;
    if (type === 'product' && !retailerId) {
      toast.error(t('toastNoSkuForCatalog'));
      return;
    }

    try {
      const payload: any = {
        conversation_id: activeConvId,
        channel_id: activeConv.channel_connection_id,
        recipient_phone: activeConv.contact?.phone || activeConv.external_chat_id,
        interactive_type: type,
        body_text: type === 'product'
          ? (product?.title ? `Check out ${product.title} from our store!` : 'Check out this item!')
          : 'Browse our full product catalog and shop directly on WhatsApp!',
        footer_text: type === 'product' ? 'Tap to view details and order' : 'Tap View Catalog to explore items'
      };
      if (type === 'product') {
        payload.product_retailer_id = retailerId;
      }

      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/send-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(type === 'product' ? t('toastWaProductDispatched') : t('toastWaCatalogLinkDispatched'));
        onClose();
        onRefreshMessages();
      } else {
        toast.error(data.message || t('toastWaCatalogFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('toastWaCatalogNetworkError'));
    }
  };

  // Send customized WhatsApp Interactive message from the dedicated WhatsApp Catalog tab
  const handleSendWaCatalogFromModal = async () => {
    if (!activeConvId || !activeConv) {
      toast.error(t('toastSelectActiveConv'));
      return;
    }
    const phone = activeConv.contact?.phone || activeConv.external_chat_id;
    if (!phone) {
      toast.error(t('toastNoPhoneForChat'));
      return;
    }

    if (waSendType === 'single' && !waSelectedProductId) {
      toast.error(t('toastSelectProduct'));
      return;
    }

    if (waSendType === 'collection' && waSelectedCollectionIds.length < 2) {
      toast.error(t('toastMin2ProductsCollection'));
      return;
    }

    setIsSendingWaInteractive(true);
    try {
      const payload: any = {
        conversation_id: activeConvId,
        channel_id: activeConv.channel_connection_id,
        recipient_phone: phone,
        message_type: waSendType === 'catalog' ? 'catalog_message' : waSendType === 'single' ? 'product' : 'product_list',
        interactive_type: waSendType === 'catalog' ? 'catalog_message' : waSendType === 'single' ? 'product' : 'product_list',
        body: waSendBody.trim() || undefined,
        body_text: waSendBody.trim() || undefined,
        footer: waSendFooter.trim() || undefined,
        footer_text: waSendFooter.trim() || undefined,
      };

      if (waSendType === 'single') {
        payload.product_retailer_id = waSelectedProductId;
      } else if (waSendType === 'collection') {
        payload.header = waSendHeader.trim() || 'Featured Collection';
        payload.header_text = waSendHeader.trim() || 'Featured Collection';
        payload.section_title = waCollectionTitle.trim() || 'Top Recommendations';
        payload.product_retailer_ids = waSelectedCollectionIds;
      }

      const res = await fetchWithCsrf('/ecommerce/whatsapp-catalog/send-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          waSendType === 'catalog'
            ? t('toastWaCatalogInvitationDispatched')
            : waSendType === 'single'
            ? t('toastWaProductDispatched')
            : t('toastWaCollectionDispatched', { count: waSelectedCollectionIds.length })
        );
        onClose();
        onRefreshMessages();
      } else {
        toast.error(data.message || t('toastWaCatalogFailed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('toastWaCatalogNetworkError'));
    } finally {
      setIsSendingWaInteractive(false);
    }
  };

  // Generate a new promo discount code
  const handleCreateDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (discountValue <= 0) {
      toast.error(t('toastInvalidDiscountValue'));
      return;
    }
    setIsGeneratingDiscount(true);
    try {
      const res = await fetchWithCsrf('/ecommerce/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput.trim() || undefined,
          discount_type: discountType,
          value: Number(discountValue),
          duration_days: Number(discountDurationDays),
          customer_email: activeConv?.contact?.email || undefined,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedDiscountResult(data.discount);
        if (data.discount?.code) {
          setExistingCoupons(prev => [data.discount.code, ...prev.filter(c => c !== data.discount.code)]);
          setSelectedProductCoupon(data.discount.code);
          setRecentDiscounts(prev => [data.discount, ...(prev || [])]);
        }
        toast.success(t('discountCreated'));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || t('toastDiscountCreateFailed'));
      }
    } catch {
      toast.error(t('toastDiscountNetworkError'));
    } finally {
      setIsGeneratingDiscount(false);
    }
  };

  // Send discount promo directly to active conversation
  const handleSendDiscountToChat = (discount: any) => {
    if (!activeConvId) {
      toast.error(t('toastSelectActiveConv'));
      return;
    }
    const message = discount.message_template || `I'm happy to offer you a special ${discount.formatted_discount || `${discount.value}% OFF`} discount! Use promo code **${discount.code}** at checkout${discount.formatted_expiry ? ` (valid until ${discount.formatted_expiry})` : ''}. Let me know if you would like any help completing your purchase!`;
    onSendDirectOutbound(message, null);
    onClose();
    toast.success(t('toastDiscountSent'));
  };

  // Insert discount promo into composer
  const handleInsertDiscountIntoComposer = (discount: any) => {
    const message = discount.message_template || `I'm happy to offer you a special ${discount.formatted_discount || `${discount.value}% OFF`} discount! Use promo code **${discount.code}** at checkout${discount.formatted_expiry ? ` (valid until ${discount.formatted_expiry})` : ''}. Let me know if you would like any help completing your purchase!`;
    onInsertIntoComposer(message);
    onClose();
    toast.success(t('toastDiscountInserted'));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 transition-all duration-300 animate-backdrop-fade select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#E8E8E6] rounded-xl max-w-2xl sm:max-w-3xl w-full shadow-xl relative z-50 animate-modal-box text-left font-sans flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] px-6 py-4 shrink-0 bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded bg-white border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0 shadow-3xs text-zinc-700">
              <ShoppingBag className="h-3.5 w-3.5 text-zinc-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                  {t('ecommerceCatalog')}
                </h3>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                {isWhatsAppActive
                  ? t('ecommerceModalSubtitleWa')
                  : t('ecommerceModalSubtitle')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Consistent Platform Segmented Tab Bar */}
        <div className="px-6 py-3 border-b border-[#E8E8E6] bg-white shrink-0">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar">
            <button
              type="button"
              onClick={() => setEcommerceModalTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                ecommerceModalTab === 'products'
                  ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <ShoppingBag className={`h-3.5 w-3.5 shrink-0 ${ecommerceModalTab === 'products' ? 'text-zinc-950' : 'text-zinc-500'}`} />
              <span>{t('productCatalog')}</span>
              {catalogProducts.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  ecommerceModalTab === 'products'
                    ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80'
                    : 'bg-zinc-200/60 text-zinc-600'
                }`}>
                  {catalogProducts.length}
                </span>
              )}
            </button>

            {isWhatsAppActive && (
              <button
                type="button"
                onClick={() => setEcommerceModalTab('whatsapp_catalog')}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                  ecommerceModalTab === 'whatsapp_catalog'
                    ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Layers3 className={`h-3.5 w-3.5 shrink-0 ${ecommerceModalTab === 'whatsapp_catalog' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                <span>{t('whatsappCatalog')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setEcommerceModalTab('discounts')}
              className={`flex-1 flex items-center justify-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                ecommerceModalTab === 'discounts'
                  ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Tag className={`h-3.5 w-3.5 shrink-0 ${ecommerceModalTab === 'discounts' ? 'text-zinc-950' : 'text-zinc-500'}`} />
              <span>{t('createDiscount')}</span>
              {existingCoupons.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  ecommerceModalTab === 'discounts'
                    ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/80'
                    : 'bg-zinc-200/60 text-zinc-600'
                }`}>
                  {existingCoupons.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {ecommerceModalTab === 'products' && (
            /* TAB 1: STORE PRODUCTS */
            <div className="space-y-4">
              {/* Search, Filter & Promo Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t('searchProductPlaceholder')}
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      loadCatalogProducts(e.target.value);
                    }}
                    className="w-full h-8.5 pl-8 pr-3 text-xs bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all shadow-3xs placeholder:text-zinc-400"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Filter In Stock */}
                  <div className="flex border border-[#E8E8E6] rounded-[6px] p-0.5 bg-zinc-100/90 select-none">
                    <button
                      type="button"
                      onClick={() => setCatalogFilter('all')}
                      className={`px-2.5 py-1 rounded-[4px] text-[10px] font-semibold transition-all cursor-pointer ${
                        catalogFilter === 'all' ? 'bg-white text-zinc-950 shadow-3xs font-bold border border-[#E8E8E6]/60' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {t('all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter('in_stock')}
                      className={`px-2.5 py-1 rounded-[4px] text-[10px] font-semibold transition-all cursor-pointer ${
                        catalogFilter === 'in_stock' ? 'bg-white text-zinc-950 shadow-3xs font-bold border border-[#E8E8E6]/60' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {t('inStock')}
                    </button>
                  </div>

                  {/* Custom Dropdown Selector for Discount Coupons */}
                  <div className="w-[190px] sm:w-[210px]">
                    <DropdownSelect
                      value={selectedProductCoupon}
                      onChange={setSelectedProductCoupon}
                      options={couponDropdownOptions}
                      placeholder={t('attachPromoDiscount')}
                    />
                  </div>

                  {/* Refresh / Sync Catalog Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      loadCatalogProducts();
                      loadExistingCoupons();
                    }}
                    className="h-9 px-2.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-600 hover:text-black flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs shrink-0"
                    title={t('syncStoreTitle')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${catalogLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline text-[11px]">{t('syncStore')}</span>
                  </button>

                  {isWhatsAppActive && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppInteractive('catalog_message')}
                        className="h-9 px-2.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-900 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs shrink-0"
                        title={t('sendFullCatalogTitle')}
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="hidden sm:inline text-[11px]">{t('sendFullCatalog')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEcommerceModalTab('whatsapp_catalog')}
                        className="h-9 px-2.5 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-900 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs shrink-0"
                        title={t('catalogHubTitle')}
                      >
                        <Layers3 className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="hidden sm:inline text-[11px]">{t('catalogHub')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Discount Indicator */}
              {selectedProductCoupon && (
                <div className="p-2.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg flex items-center justify-between text-xs text-zinc-800 shadow-3xs">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-zinc-500" />
                    <span>
                      {t('applyingPromo', { code: selectedProductCoupon })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProductCoupon('')}
                    className="text-[10px] font-bold text-zinc-500 hover:text-black transition-colors"
                  >
                    {t('clear')}
                  </button>
                </div>
              )}

              {/* Products Grid */}
              {catalogLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                  <span className="text-xs font-semibold">{t('loadingProducts')}</span>
                </div>
              ) : catalogProducts.filter(p => catalogFilter === 'all' || (p.stock_quantity ?? 0) > 0).length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <ShoppingBag className="h-8 w-8 text-zinc-300 mb-2 stroke-1" />
                  <h4 className="text-xs font-bold text-zinc-700 mb-0.5">{t('noProductsFound')}</h4>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    {catalogSearch ? t('noProductsMatch', { query: catalogSearch }) : t('catalogEmptySyncing')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {catalogProducts
                    .filter(p => catalogFilter === 'all' || (p.stock_quantity ?? 0) > 0)
                    .map((product) => {
                      const inStock = (product.stock_quantity ?? 0) > 0;
                      return (
                        <div 
                          key={product.id}
                          className="p-3 border border-[#E8E8E6] hover:border-zinc-300 rounded-xl bg-white transition-all shadow-3xs flex flex-col justify-between group hover:shadow-xs"
                        >
                          <div className="flex gap-3">
                            {/* Thumbnail Image */}
                            <div className="h-16 w-16 rounded-lg bg-zinc-100 border border-[#E8E8E6] overflow-hidden shrink-0 flex items-center justify-center relative">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.title} 
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                                />
                              ) : (
                                <ShoppingBag className="h-6 w-6 text-zinc-300" />
                              )}
                              {!inStock && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="text-[8px] font-extrabold uppercase text-white bg-red-600/90 px-1 rounded">{t('outOfStockBadge')}</span>
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="text-xs font-bold text-zinc-900 truncate leading-snug" title={product.title}>
                                  {product.title}
                                </h4>
                                {product.external_url && (
                                  <a
                                    href={product.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-zinc-400 hover:text-black shrink-0"
                                    title={t('viewInStore')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-extrabold text-black">
                                  {product.currency || '$'}{Number(product.price || 0).toFixed(2)}
                                </span>
                                {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                                  <span className="text-[10px] text-zinc-400 line-through">
                                    {product.currency || '$'}{Number(product.compare_at_price).toFixed(2)}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  {inStock ? t('inStockCount', { count: product.stock_quantity }) : t('outOfStock')}
                                </span>
                              </div>

                              {product.sku && (
                                <p className="text-[9px] font-mono text-zinc-400 truncate mt-0.5">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons Strip */}
                          <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-[#E8E8E6]">
                            {isWhatsAppActive && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppInteractive('product', product)}
                                className="w-full h-7 px-2 bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-900 border border-[#E8E8E6] text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                                title={t('sendAsWaProductTitle')}
                              >
                                <ShoppingBag className="h-3 w-3 text-zinc-600" />
                                <span>{t('sendAsWaProduct')}</span>
                              </button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSendProductToChat(product)}
                                className="h-7.5 px-2 bg-zinc-950 hover:bg-black text-white text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                                title={t('sendToChatTitle')}
                              >
                                <Send className="h-3 w-3" />
                                <span>{t('sendToChat')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertProductIntoComposer(product)}
                                className="h-7.5 px-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-[#E8E8E6] hover:border-zinc-300 text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                                title={t('insertInReplyTitle')}
                              >
                                <CornerDownLeft className="h-3 w-3 text-zinc-500" />
                                <span>{t('insertInReply')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHATSAPP INTERACTIVE CATALOG & COLLECTIONS */}
          {ecommerceModalTab === 'whatsapp_catalog' && isWhatsAppActive && (
            <div className="space-y-4">
              {/* Active WhatsApp Recipient Banner */}
              <div className="flex items-center justify-between p-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-zinc-900 truncate">
                    {t('recipientLabel', {
                      name: activeConv?.contact?.first_name
                        ? `${activeConv.contact.first_name} ${activeConv.contact.last_name || ''}`.trim()
                        : 'Customer'
                    })}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-600 bg-white px-1.5 py-0.5 rounded border border-[#E8E8E6] shrink-0">
                    {activeConv?.contact?.phone || activeConv?.external_chat_id || 'No phone'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{t('whatsappChannelActive')}</span>
                </div>
              </div>

              {/* Format Selector Cards */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {t('chooseCatalogFormat')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setWaSendType('catalog');
                      setWaSendBody('');
                      setWaSendFooter('');
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      waSendType === 'catalog'
                        ? 'border-zinc-950 bg-zinc-50/80 shadow-3xs'
                        : 'border-[#E8E8E6] bg-white hover:border-zinc-300'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 text-zinc-900 mb-1.5" />
                    <div className="text-xs font-bold text-zinc-950">{t('fullCatalog')}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                      {t('fullCatalogDesc')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWaSendType('single');
                      const targetProd = waSelectedProductObj || catalogProducts[0];
                      if (targetProd) {
                        setWaSendBody(`Check out ${targetProd.title} from our store!`);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      waSendType === 'single'
                        ? 'border-zinc-950 bg-zinc-50/80 shadow-3xs'
                        : 'border-[#E8E8E6] bg-white hover:border-zinc-300'
                    }`}
                  >
                    <Package className="h-4 w-4 text-zinc-900 mb-1.5" />
                    <div className="text-xs font-bold text-zinc-950">{t('specificProduct')}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                      {t('specificProductDesc')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWaSendType('collection');
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      waSendType === 'collection'
                        ? 'border-zinc-950 bg-zinc-50/80 shadow-3xs'
                        : 'border-[#E8E8E6] bg-white hover:border-zinc-300'
                    }`}
                  >
                    <Layers3 className="h-4 w-4 text-zinc-900 mb-1.5" />
                    <div className="text-xs font-bold text-zinc-950">{t('productCollection')}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                      {t('productCollectionDesc')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Form & WhatsApp Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left (7 cols): Form Controls */}
                <div className="md:col-span-7 space-y-3.5">
                  {/* Single Product Selector */}
                  {waSendType === 'single' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {t('selectProduct')} <span className="text-red-500">*</span>
                      </label>
                      {catalogProducts.length === 0 ? (
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md text-xs text-zinc-500">
                          {t('noProductsInCatalogSync')}
                        </div>
                      ) : (
                        <DropdownSelect
                          value={waSelectedProductId}
                          onChange={(val) => {
                            setWaSelectedProductId(val);
                            const prod = catalogProducts.find((p: any) => (p.sku || p.external_product_id || String(p.id)) === val || String(p.id) === String(val));
                            if (prod) {
                              setWaSendBody(`Check out ${prod.title} from our store!`);
                            }
                          }}
                          options={catalogProducts.map((p: any) => ({
                            value: p.sku || p.external_product_id || String(p.id),
                            label: `${p.title} (${p.currency || '$'}${Number(p.price || 0).toFixed(2)})`,
                            badge: p.sku ? `SKU: ${p.sku}` : undefined,
                          }))}
                          placeholder={t('chooseProductPlaceholder')}
                        />
                      )}
                    </div>
                  )}

                  {/* Collection Controls */}
                  {waSendType === 'collection' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            {t('headerTitle')}
                          </label>
                          <input
                            type="text"
                            value={waSendHeader}
                            onChange={(e) => setWaSendHeader(e.target.value)}
                            placeholder={t('headerTitlePlaceholder')}
                            className="w-full h-8.5 px-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            {t('sectionName')}
                          </label>
                          <input
                            type="text"
                            value={waCollectionTitle}
                            onChange={(e) => setWaCollectionTitle(e.target.value)}
                            placeholder={t('sectionNamePlaceholder')}
                            className="w-full h-8.5 px-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                      </div>

                      {/* Collection Product Picker */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {t('pickItemsCount', { selected: waSelectedCollectionIds.length })}
                          </label>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {t('itemsInCatalogCount', { count: catalogProducts.length })}
                          </span>
                        </div>

                        {/* Search filter for picker */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder={t('filterProductsPlaceholder')}
                            value={waProductSearch}
                            onChange={(e) => setWaProductSearch(e.target.value)}
                            className="w-full pl-8 pr-3 h-7.5 bg-zinc-50 border border-[#E8E8E6] rounded-[6px] text-[11px] font-medium focus:outline-none focus:border-black"
                          />
                        </div>

                        <div className="max-h-36 overflow-y-auto border border-[#E8E8E6] rounded-[6px] divide-y divide-[#E8E8E6] bg-[#FAFAFA] p-1">
                          {waFilteredCollectionProducts.length === 0 ? (
                            <div className="p-3 text-center text-xs text-zinc-400">{t('noProductsMatchSearch')}</div>
                          ) : (
                            waFilteredCollectionProducts.map((prod: any) => {
                              const id = prod.sku || prod.external_product_id || String(prod.id);
                              const isSelected = waSelectedCollectionIds.includes(id);
                              return (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setWaSelectedCollectionIds((prev) => prev.filter((i) => i !== id));
                                    } else {
                                      if (waSelectedCollectionIds.length >= 30) {
                                        toast.error(t('toastMax30Products'));
                                        return;
                                      }
                                      setWaSelectedCollectionIds((prev) => [...prev, id]);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between p-1.5 rounded-[4px] text-left transition-colors cursor-pointer ${
                                    isSelected ? 'bg-white shadow-3xs font-bold' : 'hover:bg-zinc-100 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isSelected ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                                    }`}>
                                      {isSelected && <Check className="h-2.5 w-2.5" />}
                                    </div>
                                    <span className="text-xs text-zinc-900 truncate">
                                      {prod.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-zinc-600 shrink-0 ml-2">
                                    {prod.currency || '$'}{Number(prod.price || 0).toFixed(2)}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      {t('messageTextLabel')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={waSendBody}
                      onChange={(e) => setWaSendBody(e.target.value)}
                      placeholder={t('messageTextPlaceholder')}
                      className="w-full p-2.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold focus:outline-none focus:border-black transition-colors resize-none"
                    />
                  </div>

                  {/* Footer Text */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      {t('footerTextOptional')}
                    </label>
                    <input
                      type="text"
                      value={waSendFooter}
                      onChange={(e) => setWaSendFooter(e.target.value)}
                      placeholder={t('footerTextPlaceholder')}
                      className="w-full h-8.5 px-3 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[6px] text-xs font-semibold focus:outline-none focus:border-black transition-colors"
                    />
                  </div>

                  {/* Submit Send Button */}
                  <button
                    type="button"
                    onClick={handleSendWaCatalogFromModal}
                    disabled={isSendingWaInteractive || (waSendType === 'collection' && waSelectedCollectionIds.length < 2)}
                    className="w-full h-9 bg-zinc-950 hover:bg-black text-white text-xs font-bold rounded-[6px] flex items-center justify-center gap-2 transition-all shadow-3xs cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {isSendingWaInteractive 
                        ? t('dispatchingToCustomer') 
                        : waSendType === 'catalog'
                        ? t('sendCatalogInvitation')
                        : waSendType === 'single'
                        ? t('sendWaProductSpm')
                        : t('sendWaCollectionBtn', { count: waSelectedCollectionIds.length })}
                    </span>
                  </button>
                </div>

                {/* Right (5 cols): WhatsApp Interactive Preview */}
                <div className="md:col-span-5 flex flex-col items-center select-none sticky top-2">
                  <div className="w-full border border-[#E8E8E6] rounded-xl overflow-hidden bg-[#efeae2] p-3 shadow-3xs select-none gap-2.5 flex flex-col">
                    {/* Header indicator */}
                    <div className="bg-white/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[9px] font-semibold text-zinc-600 mx-auto border border-zinc-200/60 flex items-center gap-1 shadow-3xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{t('interactivePreview')}</span>
                    </div>

                    {/* Outbound Bubble */}
                    <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-xs flex flex-col transition-all text-left">
                      {/* Header for collection */}
                      {waSendType === 'collection' && waSendHeader && (
                        <div className="px-3 py-2 text-xs font-bold text-zinc-950 border-b border-zinc-100 bg-[#FAFAFA]">
                          {waSendHeader}
                        </div>
                      )}

                      {/* Single Product Card */}
                      {waSendType === 'single' && (
                        <div className="p-2 border-b border-zinc-100 bg-zinc-50">
                          <div className="h-28 w-full rounded-md bg-zinc-100 overflow-hidden flex items-center justify-center relative">
                            {waSelectedProductObj?.image_url ? (
                              <img
                                src={waSelectedProductObj.image_url}
                                alt="Product"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-7 w-7 text-zinc-300" />
                            )}
                          </div>
                          <div className="mt-1.5 flex items-start justify-between gap-1 px-1">
                            <span className="text-[11px] font-bold text-zinc-900 truncate">
                              {waSelectedProductObj?.title || 'Selected Product'}
                            </span>
                            <span className="text-[11px] font-extrabold text-zinc-950 shrink-0">
                              {waSelectedProductObj ? `${waSelectedProductObj.currency || '$'}${Number(waSelectedProductObj.price || 0).toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Body */}
                      <div className="p-3 text-[11px] font-medium text-zinc-800 leading-relaxed whitespace-pre-wrap">
                        {waSendBody || (waSendType === 'catalog' ? 'Explore our store catalog and order directly on WhatsApp!' : 'Message body text')}
                      </div>

                      {/* Footer */}
                      {waSendFooter && (
                        <div className="px-3 pb-2 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                          {waSendFooter}
                        </div>
                      )}

                      {/* Action CTA Button */}
                      <div className="border-t border-zinc-100">
                        {waSendType === 'catalog' && (
                          <div className="py-2.5 px-3 text-center text-xs font-bold text-[#008069] bg-white hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>{t('viewCatalogBtn')}</span>
                          </div>
                        )}

                        {waSendType === 'single' && (
                          <div className="py-2.5 px-3 text-center text-xs font-bold text-[#008069] bg-white hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                            <Package className="h-3.5 w-3.5" />
                            <span>{t('viewItemBtn')}</span>
                          </div>
                        )}

                        {waSendType === 'collection' && (
                          <div className="py-2.5 px-3 text-center text-xs font-bold text-[#008069] bg-white hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                            <Layers3 className="h-3.5 w-3.5" />
                            <span>{t('viewItemsCountBtn', { count: waSelectedCollectionIds.length })}</span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="px-3 py-1 bg-zinc-50/50 border-t border-zinc-100/80 flex items-center justify-end gap-1 text-[8px] text-zinc-400 font-semibold">
                        <span>{t('justNow')}</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISCOUNT CODE GENERATION */}
          {ecommerceModalTab === 'discounts' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Form Controls (7 cols) */}
                <form onSubmit={handleCreateDiscountCode} className="lg:col-span-7 space-y-4">
                  {/* Discount Type */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      {t('discountType')}
                    </label>
                    <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-full">
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer leading-none ${
                          discountType === 'percentage'
                            ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Percent className={`h-3.5 w-3.5 shrink-0 ${discountType === 'percentage' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                        <span>{t('percentageOff')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed_amount')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer leading-none ${
                          discountType === 'fixed_amount'
                            ? 'bg-white text-zinc-950 shadow-3xs font-bold'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Tag className={`h-3.5 w-3.5 shrink-0 ${discountType === 'fixed_amount' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                        <span>{t('fixedAmountOff')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Value Presets + Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {t('discountValueLabel')} {discountType === 'percentage' ? '(%)' : '($)'}
                      </label>
                      <span className="text-xs font-mono font-bold text-zinc-900">
                        {discountType === 'percentage' ? `${discountValue}% OFF` : `$${discountValue} OFF`}
                      </span>
                    </div>

                    {discountType === 'percentage' && (
                      <div className="flex gap-1.5 mb-2">
                        {[5, 10, 15, 20, 25, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className={`flex-1 h-7.5 rounded-[6px] text-[10px] font-semibold border transition-all cursor-pointer ${
                              discountValue === pct
                                ? 'bg-zinc-950 text-white border-zinc-950 font-bold shadow-3xs'
                                : 'bg-white hover:bg-zinc-50 border-[#E8E8E6] text-zinc-700'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="number"
                      min="1"
                      max={discountType === 'percentage' ? "100" : "5000"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full h-8.5 px-3 text-xs bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono font-semibold transition-all shadow-3xs"
                      required
                    />
                  </div>

                  {/* Promo Code Name */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      {t('promoCodeOptional')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('promoCodePlaceholder', { value: discountValue })}
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      className="w-full h-8.5 px-3 text-xs bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono font-bold uppercase transition-all shadow-3xs placeholder:font-normal placeholder:text-zinc-400"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">{t('promoCodesSyncNote')}</p>
                  </div>

                  {/* Duration / Expiry */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      {t('validityDuration')}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { days: 1, label: t('duration24Hours') },
                        { days: 3, label: t('duration3Days') },
                        { days: 7, label: t('duration7Days') },
                        { days: 30, label: t('duration30Days') },
                      ].map((item) => (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => setDiscountDurationDays(item.days)}
                          className={`h-7.5 rounded-[6px] text-[10px] font-semibold border transition-all cursor-pointer ${
                            discountDurationDays === item.days
                              ? 'bg-zinc-950 text-white border-zinc-950 font-bold shadow-3xs'
                              : 'bg-white hover:bg-zinc-50 border-[#E8E8E6] text-zinc-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isGeneratingDiscount || discountValue <= 0}
                    className="w-full h-9 bg-zinc-950 hover:bg-black text-white text-xs font-bold rounded-[6px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {isGeneratingDiscount ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('creatingDiscount')}</span>
                      </>
                    ) : (
                      <>
                        <Tag className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{t('createDiscountPromoCode')}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Right: Active Generated Result Card & Recent History (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Generated Success Card */}
                  {generatedDiscountResult && (
                    <div className="p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-xl space-y-3 animate-in fade-in zoom-in-95 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-900 text-xs font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>{t('promoCodeReady')}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-[6px] border border-[#E8E8E6] flex items-center justify-between">
                        <span className="font-mono font-extrabold text-sm text-black tracking-wider">
                          {generatedDiscountResult.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedDiscountResult.code);
                            toast.success(t('copied'));
                          }}
                          className="text-[10px] font-bold text-zinc-600 hover:text-black flex items-center gap-1 bg-[#FAFAFA] hover:bg-zinc-100 border border-[#E8E8E6] px-2 py-1 rounded-[4px] transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{t('copy')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendDiscountToChat(generatedDiscountResult)}
                          className="h-8 bg-zinc-950 hover:bg-black text-white text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1 transition-all shadow-3xs cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>{t('sendToChat')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInsertDiscountIntoComposer(generatedDiscountResult)}
                          className="h-8 bg-white hover:bg-zinc-50 text-zinc-800 border border-[#E8E8E6] hover:border-zinc-300 text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1 transition-all shadow-3xs cursor-pointer"
                        >
                          <CornerDownLeft className="h-3 w-3 text-zinc-500" />
                          <span>{t('insertInReply')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent Promo Codes History */}
                  <div className="p-3.5 bg-white border border-[#E8E8E6] rounded-xl space-y-3 shadow-3xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {t('recentPromoCodes')}
                      </span>
                    </div>

                    {recentDiscounts.length === 0 ? (
                      <div className="py-6 text-center text-zinc-400 text-xs">
                        <Tag className="h-6 w-6 text-zinc-300 mx-auto mb-1.5 stroke-1" />
                        <p className="text-[11px] text-zinc-500 font-medium">{t('noRecentPromoCodes')}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{t('noRecentPromoCodesDesc')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {recentDiscounts.slice(0, 8).map((disc: any) => (
                          <div 
                            key={disc.id || disc.code}
                            className="p-2 border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] bg-[#FAFAFA] flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="min-w-0 pr-1">
                              <span className="font-mono font-bold text-zinc-900 text-xs">{disc.code}</span>
                              <span className="ml-1.5 text-[10px] text-zinc-500 font-semibold">
                                ({disc.discount_type === 'percentage' ? `${disc.value}% OFF` : `$${disc.value} OFF`})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSendDiscountToChat(disc)}
                                className="h-6 px-2 bg-zinc-950 hover:bg-black text-white text-[9px] font-bold rounded-[4px] flex items-center gap-1 cursor-pointer transition-colors shadow-3xs"
                                title={t('sendToChatTitle')}
                              >
                                <Send className="h-2.5 w-2.5" />
                                <span>{t('send')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertDiscountIntoComposer(disc)}
                                className="h-6 px-2 bg-white hover:bg-zinc-50 border border-[#E8E8E6] text-zinc-700 text-[9px] font-bold rounded-[4px] flex items-center gap-1 cursor-pointer transition-colors"
                                title={t('insertInReplyTitle')}
                              >
                                <CornerDownLeft className="h-2.5 w-2.5 text-zinc-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Strip */}
        <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] px-6 py-3.5 shrink-0 flex items-center justify-between text-xs">
          <span className="text-[10px] text-zinc-500 font-medium">
            {t('ecommerceFooterNote')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-white border border-[#E8E8E6] hover:bg-zinc-50 text-zinc-700 hover:text-black text-xs font-bold rounded-[6px] transition-colors cursor-pointer shadow-3xs"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
