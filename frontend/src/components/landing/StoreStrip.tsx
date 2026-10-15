'use client';

import Image from 'next/image';

export function StoreStrip() {
  const stores = [
    { 
      name: 'Shopify', 
      logo: '/shopify.webp',
    },
    { 
      name: 'WooCommerce', 
      logo: '/woocommerce.webp',
    }
  ];

  return (
    <section id="stores-strip" className="relative bg-white pt-6 pb-8 border-b border-[#E8E8E6]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-6">
          
          <div className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
            Supported E-Commerce & Store Platforms
          </div>

          {/* Store Logos & Names Row */}
          <div className="w-full flex flex-wrap items-center justify-center sm:justify-around gap-6 sm:gap-8">
            {stores.map((store) => (
              <div 
                key={store.name}
                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAFAFA] transition-all duration-200 cursor-pointer"
              >
                <div className="relative w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image 
                    src={store.logo}
                    alt={`${store.name} Logo`}
                    width={32}
                    height={32}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <span className="text-base sm:text-lg font-black tracking-tight text-[#0A0A0A]">
                  {store.name}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
