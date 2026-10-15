'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Store,
  Bot,
  ShoppingCart,
  Zap,
  TrendingUp,
  CheckCheck
} from 'lucide-react';

interface StoreIntegrationsSectionProps {
  brandName?: string;
}

export function StoreIntegrationsSection({ brandName = 'WhatsOmni' }: StoreIntegrationsSectionProps) {
  const [selectedProduct, setSelectedProduct] = useState<number>(1);

  const sampleProducts = [
    {
      id: 1,
      title: 'AeroGlide Pro Marathon',
      sku: 'SKU-RUN-902',
      price: '$139.00',
      origPrice: '$170.00',
      stock: 14,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
      status: 'Catalog Synced'
    },
    {
      id: 2,
      title: 'CloudVelocity Sprint 2.0',
      sku: 'SKU-VEL-401',
      price: '$119.00',
      origPrice: '$145.00',
      stock: 8,
      image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&auto=format&fit=crop&q=80',
      status: 'Catalog Synced'
    }
  ];

  const features = [
    {
      icon: Store,
      title: 'Real-Time Catalog & Store Sync',
      desc: 'Connect Shopify, WooCommerce, or custom stores in one click. Products, stock levels, variants, and order status sync automatically.'
    },
    {
      icon: Bot,
      title: '24/7 AI Salesman & Recommendations',
      desc: 'AI consults shoppers in real time across your inbox, answers spec and size questions, suggests relevant upsells, and closes sales.'
    },
    {
      icon: ShoppingCart,
      title: '1-Click Cart Link Creation',
      desc: 'Generate pre-filled checkout cart links directly inside conversations across WhatsApp, Instagram DMs, and live chat for instant payment.'
    },
    {
      icon: TrendingUp,
      title: 'Automated Cart Recovery',
      desc: 'Detect abandoned checkouts and trigger automated, personalized recovery nudges across your messaging channels with dynamic discount codes.'
    }
  ];

  return (
    <section id="store-integrations" className="relative bg-white pt-16 sm:pt-20 pb-16 sm:pb-20 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous Soft Neon Green Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.14) 0%, rgba(0,128,255,0.06) 50%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Centered Section Header (Title & Description) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4"
        >
          {/* Shopify & WooCommerce Standalone Logos Above Title */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mb-4 sm:mb-6 select-none">
            <div className="transition-transform duration-300 hover:scale-110 cursor-pointer">
              <img 
                src="/shopify.webp" 
                alt="Shopify" 
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-xs" 
              />
            </div>

            <div className="transition-transform duration-300 hover:scale-110 cursor-pointer">
              <img 
                src="/woocommerce.webp" 
                alt="WooCommerce" 
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-xs" 
              />
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0A0A0A] tracking-tight leading-[1.15]">
            Turn Your Inbox into Your <br className="hidden sm:inline" />
            <span className="relative inline-block text-[#4AE54A]">
              Highest-Converting
              <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#4AE54A] rounded-full shadow-[0_0_8px_rgba(74,229,74,0.6)]" />
            </span>{' '}
            Store
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed font-normal max-w-2xl mx-auto">
            Connect your Shopify and WooCommerce stores. Your AI chatbot consults shoppers 24/7, searches live inventory, sends product cards, and creates 1-click checkout links directly in chat.
          </p>
        </motion.div>

        {/* Centered Authentic WhatsApp Chat Showcase with Product Cards (Positioned Directly Below Header) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="flex flex-col gap-3.5 w-full max-w-[580px] mx-auto mb-12 sm:mb-16 select-none"
        >
          
          {/* 1. Customer Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[85%] mr-auto"
          >
            {/* Customer Avatar */}
            <div className="relative shrink-0 mt-0.5">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Customer"
                className="w-8 h-8 rounded-full object-cover border border-[#E9EDEF] shadow-xs"
              />
            </div>

            {/* Chat Bubble with Left Tail */}
            <div className="relative">
              <svg
                viewBox="0 0 8 13"
                className="absolute -left-2 top-0 w-2 h-3.5 text-white fill-current pointer-events-none drop-shadow-[-1px_1px_1px_rgba(0,0,0,0.04)]"
              >
                <path d="M1.533 3.568 8 12.193V0H2.812C1.042 0 .474 2.156 1.533 3.568z" />
              </svg>

              <div className="px-3.5 py-2.5 rounded-2xl shadow-[0_1px_1px_rgba(11,20,26,0.12)] bg-white text-[#111B21] rounded-tl-none border border-black/[0.04] text-left">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-[#128C7E] leading-tight">Shopper</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#111B21] font-normal">
                  Hi! I need marathon running shoes with arch support under $150. Any in stock?
                </p>
                <div className="mt-1 flex items-center justify-start text-[10px] text-[#667781] font-medium leading-none">
                  <span>10:14 AM</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. AI Salesman Message with Embedded 2-Card Product Grid & 1-Click Cart Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-start gap-2.5 max-w-[98%] sm:max-w-[95%] ml-auto flex-row-reverse"
          >
            {/* Bot Avatar with Green Online Dot */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center shadow-xs border border-white">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#25D366] border-2 border-white rounded-full" />
            </div>

            {/* Chat Bubble with Right Tail */}
            <div className="relative w-full">
              <svg
                viewBox="0 0 8 13"
                className="absolute -right-2 top-0 w-2 h-3.5 text-[#D9FDD3] fill-current pointer-events-none drop-shadow-[1px_1px_1px_rgba(0,0,0,0.04)]"
              >
                <path d="M5.188 0H0v12.193l6.467-8.625C7.526 2.156 6.958 0 5.188 0z" />
              </svg>

              <div className="px-3.5 py-2.5 rounded-2xl shadow-[0_1px_1px_rgba(11,20,26,0.12)] bg-[#D9FDD3] text-[#111B21] rounded-tr-none border border-[#C5EDB7]/70 text-left space-y-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-[#008069] leading-tight">AI Store Assistant</span>
                </div>

                <p className="text-xs sm:text-[13px] leading-relaxed text-[#111B21] font-normal">
                  Yes! Here are our top-rated marathon pairs in stock with <strong className="font-bold text-[#008069]">10% OFF (SAVE10)</strong>:
                </p>

                {/* Exact Platform Product Cards 2-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  {sampleProducts.map((product) => {
                    const isSelected = selectedProduct === product.id;
                    return (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product.id)}
                        className={`p-2.5 border rounded-[10px] bg-white transition-all shadow-3xs flex flex-col justify-between cursor-pointer group ${
                          isSelected ? 'border-[#008069] ring-2 ring-[#008069]/15' : 'border-[#E8E8E6] hover:border-zinc-300'
                        }`}
                      >
                        <div>
                          {/* Image Thumbnail with In-Stock Badge */}
                          <div className="w-full aspect-[4/3] rounded-[6px] bg-zinc-100 border border-[#E8E8E6] overflow-hidden flex items-center justify-center relative mb-2">
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-1.5 right-1.5">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-white/95 text-zinc-900 border border-zinc-200/80 shadow-3xs">
                                In Stock ({product.stock})
                              </span>
                            </div>
                          </div>

                          {/* Title & SKU */}
                          <h4 className="text-[11px] font-bold text-zinc-950 truncate leading-tight">
                            {product.title}
                          </h4>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-black text-black">{product.price}</span>
                              <span className="text-[9px] text-zinc-400 line-through">{product.origPrice}</span>
                            </div>
                            <span className="font-mono text-[8px] bg-zinc-100 text-zinc-600 px-1 py-0.2 rounded border border-[#E8E8E6]">
                              {product.sku}
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Action */}
                        <div className="mt-2 pt-1.5 border-t border-[#F4F4F5]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product.id);
                            }}
                            className="w-full h-7 rounded-[5px] bg-[#008069] hover:bg-[#00705c] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-3xs transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            <span>1-Click Cart Link</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-1 flex items-center justify-end gap-1 select-none">
                  <span className="text-[10px] text-[#667781] font-medium leading-none">10:14 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] stroke-[2.4]" />
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>

        {/* 4-Column Feature Grid (Matching Clean Design System) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left pt-4 sm:pt-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className="space-y-2.5 p-2 hover:translate-y-[-2px] transition-transform duration-300"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FAF9F6] border border-[#E8E8E6] flex items-center justify-center text-[#0A0A0A] shadow-2xs">
                  <Icon className="w-4 h-4 stroke-[1.8] text-[#0A0A0A]" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-[#0A0A0A] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#4B4B4B] leading-relaxed font-normal">
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
