'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/BrandingThemeProvider';
import { BRANDING_CONFIG } from '@/config/branding';
import { ShoppingCart } from 'lucide-react';
import { PlatformLogo } from '@/components/common/PlatformLogo';

interface PreviewNavbarProps {
  brandName?: string;
  logoSrc?: string;
}

export function PreviewNavbar({
  brandName,
  logoSrc,
}: PreviewNavbarProps) {
  const { brandingName, logoUrl } = useBranding();
  const finalBrandName = brandName || brandingName || BRANDING_CONFIG.defaultName;
  const finalLogoSrc = logoSrc || logoUrl || BRANDING_CONFIG.defaultLogo;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 sm:px-6 lg:px-8 pointer-events-none">
      {/* Translucent Capsule Navbar */}
      <header className="max-w-[1240px] mx-auto h-14 bg-white/85 backdrop-blur-xl border border-[#E8E8E6] rounded-full px-5 lg:px-7 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-auto">
        
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none group">
          <PlatformLogo
            className="h-7 w-auto object-contain max-h-7 transition-transform duration-200 group-hover:scale-105"
            fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
          />
          <span className="text-lg font-black tracking-tight text-[#0A0A0A] flex items-center gap-1">
            {finalBrandName}
            <span className="text-xs font-bold text-[#6B6B6B] align-super">™</span>
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse ml-1"
              style={{
                backgroundColor: 'var(--accent-green, #4AE54A)',
                boxShadow: '0 0 8px var(--accent-green, #4AE54A)'
              }}
            />
          </span>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#0A0A0A]">
          <Link href="/" className="hover:text-[#6B6B6B] transition-colors">
            Live Preview
          </Link>
          <a href="#features" className="hover:text-[#6B6B6B] transition-colors">
            Features
          </a>
          <a href="#screenshots" className="hover:text-[#6B6B6B] transition-colors">
            Screenshots
          </a>
          <a href="#changelog" className="hover:text-[#6B6B6B] transition-colors">
            Changelog
          </a>
          <a href="#support" className="hover:text-[#6B6B6B] transition-colors">
            Support
          </a>
        </nav>

        {/* Right: Buy Now CTA Button */}
        <div className="flex items-center gap-3">
          <a href="https://codecanyon.net" target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="h-9 px-4 rounded-full bg-[#0A0A0A] hover:bg-[#262626] text-white font-extrabold text-xs shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center gap-1.5 border-0 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Buy Now — $59</span>
            </Button>
          </a>
        </div>
      </header>
    </div>
  );
}
