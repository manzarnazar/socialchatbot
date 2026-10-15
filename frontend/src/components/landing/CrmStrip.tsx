'use client';

import Image from 'next/image';

export function CrmStrip() {
  const crms = [
    { 
      name: 'HubSpot', 
      logo: '/hubspot.png',
    },
    { 
      name: 'Salesforce', 
      logo: '/salesforce.webp',
    },
    { 
      name: 'Zoho CRM', 
      logo: '/zoho_crm.png',
    }
  ];

  return (
    <section id="crms-strip" className="relative bg-white pt-6 pb-8 border-b border-[#E8E8E6]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-6">
          
          <div className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
            Supported CRM Providers
          </div>

          {/* CRM Logos & Names Row (Exact matching ChannelsStrip layout) */}
          <div className="w-full flex flex-wrap items-center justify-center sm:justify-around gap-6 sm:gap-8">
            {crms.map((crm) => (
              <div 
                key={crm.name}
                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAFAFA] transition-all duration-200 cursor-pointer"
              >
                <div className="relative w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image 
                    src={crm.logo}
                    alt={`${crm.name} Logo`}
                    width={32}
                    height={32}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <span className="text-base sm:text-lg font-black tracking-tight text-[#0A0A0A]">
                  {crm.name}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
