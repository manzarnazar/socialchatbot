'use client';

import Image from 'next/image';
import { useBranding } from '@/components/BrandingThemeProvider';
import { BRANDING_CONFIG } from '@/config/branding';
import { PlatformLogo } from '@/components/common/PlatformLogo';

interface LandingFooterProps {
  brandName?: string;
  logoSrc?: string;
  supportEmail?: string;
  domain?: string;
}

export function LandingFooter({ 
  brandName,
  logoSrc,
  supportEmail,
  domain
}: LandingFooterProps) {
  const { brandingName, logoUrl } = useBranding();
  const currentYear = new Date().getFullYear();

  const finalBrandName = brandName || brandingName || BRANDING_CONFIG.defaultName;
  const finalLogoSrc = logoSrc || logoUrl || BRANDING_CONFIG.defaultLogo;
  const finalDomain = domain || finalBrandName.toLowerCase().replace(/\s+/g, '') + '.com';
  const finalSupportEmail = supportEmail || `support@${finalDomain}`;

  return (
    <footer className="relative bg-white border-t border-[#E8E8E6] pt-16 pb-12 overflow-hidden z-10 text-sans text-left">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-40" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Footer columns grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-12 mb-12">
          
          {/* Brand Col (Spans 2 columns on desktop) */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <PlatformLogo 
                className="w-7 h-7 object-contain max-h-7"
                fallbackClassName="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
                showText
                textClassName="text-base font-black tracking-tight text-black"
              />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-semibold leading-relaxed max-w-[280px]">
              Bring every conversation into one place. Unified inbox, visual automations, AI chatbots, and CRM sync.
            </p>
          </div>

          {/* Product Links Col */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-black tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs font-bold text-zinc-500">
              <li>
                <a href="#inbound-message" className="hover:text-black transition-colors">Features</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
              </li>
              <li>
                <a href="/login" className="hover:text-black transition-colors">Log In</a>
              </li>
              <li>
                <a href="/register" className="hover:text-black transition-colors">Start Free Trial</a>
              </li>
            </ul>
          </div>

          {/* Support Links Col */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-black tracking-wider">Support</h4>
            <ul className="space-y-2 text-xs font-bold text-zinc-500">
              <li>
                <a href={`mailto:${finalSupportEmail}`} className="hover:text-black transition-colors block truncate max-w-[200px]">
                  {finalSupportEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Company Links Col */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-black tracking-wider">Company & Legal</h4>
            <ul className="space-y-2 text-xs font-bold text-zinc-500">
              <li>
                <a href="/about" className="hover:text-black transition-colors">About Us</a>
              </li>
              <li>
                <a href="/terms" className="hover:text-black transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-black transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="/security" className="hover:text-black transition-colors">Security & Trust</a>
              </li>
              <li>
                <a href="/sla" className="hover:text-black transition-colors">SLA & Uptime Guarantee</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright segment */}
        <div className="pt-8 border-t border-[#E8E8E6] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-zinc-400">
          <p>© {currentYear} {finalBrandName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-black transition-colors select-none">{finalDomain}</span>
            <span>•</span>
            <span className="hover:text-black transition-colors select-none">Secure SSL Encrypted</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
