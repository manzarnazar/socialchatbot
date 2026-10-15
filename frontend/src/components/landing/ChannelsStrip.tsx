'use client';

import Image from 'next/image';

export function ChannelsStrip() {
  const row1Channels = [
    { 
      name: 'WhatsApp', 
      logo: '/channels/whatsapp.webp',
    },
    { 
      name: 'Instagram', 
      logo: '/channels/instagram.svg',
    },
    { 
      name: 'Messenger', 
      logo: '/channels/messenger.webp',
    },
    { 
      name: 'Telegram', 
      logo: '/channels/telegram.webp',
    },
  ];

  const row2Channels = [
    { 
      name: 'TikTok', 
      logo: '/channels/tiktok.webp',
    },
    { 
      name: 'LinkedIn', 
      logo: '/channels/linkedin.png',
    },
    { 
      name: 'Email', 
      logo: '/channels/email.svg',
    },
    { 
      name: 'SMS', 
      logo: '/channels/sms.svg',
    },
  ];

  return (
    <section id="channels" className="relative bg-white pt-10 pb-12 border-t border-[#E8E8E6]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-6">
          
          <div className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
            Supported Communication Channels
          </div>

          <div className="w-full flex flex-col items-center gap-3 sm:gap-5">
            {/* Row 1: WhatsApp, Instagram, Messenger, Telegram */}
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-center sm:justify-around gap-6 sm:gap-8">
              {row1Channels.map((channel) => (
                <div 
                  key={channel.name}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAFAFA] transition-all duration-200 cursor-pointer min-w-[140px]"
                >
                  <div className="relative w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Image 
                      src={channel.logo}
                      alt={`${channel.name} Logo`}
                      width={32}
                      height={32}
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#0A0A0A]">
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Row 2: TikTok, LinkedIn, Email, SMS */}
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-center sm:justify-around gap-6 sm:gap-8">
              {row2Channels.map((channel) => (
                <div 
                  key={channel.name}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAFAFA] transition-all duration-200 cursor-pointer min-w-[140px]"
                >
                  <div className="relative w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Image 
                      src={channel.logo}
                      alt={`${channel.name} Logo`}
                      width={32}
                      height={32}
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#0A0A0A]">
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
