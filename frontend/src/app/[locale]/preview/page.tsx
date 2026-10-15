'use client';

import { useBranding } from '@/components/BrandingThemeProvider';
import { BRANDING_CONFIG } from '@/config/branding';
import { PreviewNavbar } from '@/components/preview/PreviewNavbar';
import { PreviewHero } from '@/components/preview/PreviewHero';

export default function CodeCanyonPreviewPage() {
  const { brandingName, logoUrl } = useBranding();
  const finalBrandName = brandingName || BRANDING_CONFIG.defaultName;
  const domain = finalBrandName.toLowerCase().replace(/\s+/g, '') + '.com';
  const supportEmail = `support@${domain}`;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col selection:bg-[#4AE54A] selection:text-[#0A0A0A]">
      {/* Sticky Navigation Capsule Header for CodeCanyon Preview */}
      <PreviewNavbar brandName={finalBrandName} logoSrc={logoUrl} />

      {/* Main Sections Wrapper */}
      <main className="flex-1">
        {/* CodeCanyon Hero Section */}
        <PreviewHero />
        
        {/* Placeholder sections for next stages */}
        <section id="features" className="py-16 text-center text-[#6B6B6B] border-b border-[#E8E8E6] text-xs font-semibold">
          Features deep dive section will follow here...
        </section>
        <section id="screenshots" className="py-16 text-center text-[#6B6B6B] border-b border-[#E8E8E6] text-xs font-semibold">
          Screenshots gallery section will follow here...
        </section>
        <section id="changelog" className="py-16 text-center text-[#6B6B6B] border-b border-[#E8E8E6] text-xs font-semibold">
          Changelog logs section will follow here...
        </section>
        <section id="support" className="py-16 text-center text-[#6B6B6B] text-xs font-semibold">
          Support policies section will follow here...
        </section>
      </main>

      {/* Footer bar */}
      <footer className="py-8 border-t border-[#E8E8E6] bg-white text-center">
        <div className="max-w-[1240px] mx-auto px-4 text-xs font-semibold text-[#A0A0A0]">
          © {new Date().getFullYear()} {finalBrandName}. Distributed on CodeCanyon. All rights reserved. Support: {supportEmail}
        </div>
      </footer>
    </div>
  );
}
