'use client';

import { useState, useEffect } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  ChevronDown, 
  ArrowRight,
  MessageSquare, 
  Bot, 
  Workflow, 
  Users, 
  Megaphone, 
  Calendar, 
  ShoppingBag, 
  BookOpen, 
  Share2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/BrandingThemeProvider';
import { BRANDING_CONFIG } from '@/config/branding';
import { PlatformLogo } from '@/components/common/PlatformLogo';

function MetaIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M17.225 4.026c-1.968 0-3.506 1.482-4.899 3.365-1.914-2.437-3.514-3.365-5.429-3.365C2.992 4.026,0,9.107,0,14.486c0 3.366 1.628 5.489 4.356 5.489c1.963,0,3.375-.925,5.885-5.313c0 0 1.046-1.848 1.766-3.12.252.407.517.845.797 1.316l1.177 1.98c2.293 3.836 3.57 5.137 5.885 5.137 2.657 0 4.136-2.152 4.136-5.588C24 8.755 20.941 4.026 17.225 4.026zm-8.899 9.448c-2.035 3.19-2.739 3.905-3.872 3.905-1.166 0-1.859-1.024-1.859-2.849 0-3.905 1.947-7.897 4.268-7.897 1.257 0 2.307.726 3.916 3.029C9.252 12.004 8.326 13.474 8.326 13.474zm11.593 3.905c-1.159 0-1.713-.765-3.913-4.306l-1.407-2.347c-.381-.619-.746-1.188-1.098-1.71 1.268-1.957 2.314-2.933 3.559-2.933 2.585 0 4.653 3.806 4.653 8.48 0 .825-.583 1.859-1.794 1.859z" />
    </svg>
  );
}

function WhatsAppIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.36 9.72 14.81 12.16 15.86C12.74 16.11 13.19 16.26 13.55 16.37C14.13 16.56 14.67 16.53 15.09 16.47C15.56 16.4 16.53 15.88 16.73 15.31C16.94 14.74 16.94 14.25 16.88 14.15C16.82 14.05 16.66 13.99 16.42 13.87C16.18 13.75 15 13.17 14.78 13.09C14.56 13.01 14.4 12.97 14.24 13.21C14.08 13.45 13.62 13.99 13.48 14.15C13.34 14.31 13.2 14.33 12.96 14.21C12.72 14.09 11.95 13.84 11.03 13.02C10.31 12.38 9.83 11.59 9.69 11.35C9.55 11.11 9.67 10.98 9.79 10.86C9.9 10.75 10.04 10.57 10.16 10.43C10.28 10.29 10.32 10.19 10.4 10.03C10.48 9.87 10.44 9.73 10.38 9.61C10.32 9.49 9.86 8.35 9.67 7.89C9.48 7.44 9.29 7.5 9.15 7.49C9.02 7.49 8.86 7.48 8.7 7.48C8.54 7.48 8.53 7.33 8.53 7.33Z" />
    </svg>
  );
}

interface LandingNavbarProps {
  brandName?: string;
  logoSrc?: string;
  forceTheme?: 'dark' | 'light' | 'auto';
}

export function LandingNavbar({
  brandName,
  logoSrc,
  forceTheme = 'auto',
}: LandingNavbarProps) {
  const { brandingName, logoUrl } = useBranding();
  const finalBrandName = brandName || brandingName || BRANDING_CONFIG.defaultName;
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  // Determine if home page with dark hero section
  const isHomePage = pathname === '/' || pathname === '';

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setScrolled(window.scrollY > 30);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Transparent hero top state vs scrolled state
  const isTransparentTop = forceTheme !== 'light' && isHomePage && !scrolled;
  const isDark = forceTheme === 'dark' || isTransparentTop;

  // Feature items matching sections on the landing page
  const featureItems = [
    { title: 'Shared Inbox', desc: 'Unified 6-channel inbox', icon: MessageSquare, href: '#unified-inbox' },
    { title: 'Meta Ads', desc: 'Click-to-Chat ads & attribution', icon: MetaIcon, href: '#meta-ads' },
    { title: 'WhatsApp Catalog', desc: 'In-chat catalog & carts', icon: WhatsAppIcon, href: '#features' },
    { title: 'AI ChatBots', desc: 'Inbound & outbound smart bots', icon: Bot, href: '#ai-agents' },
    { title: 'Knowledge Base', desc: 'AI dynamic context & RAG sources', icon: BookOpen, href: '#knowledge-base' },
    { title: 'Meta Ads Suite', desc: 'Click-to-WhatsApp conversions', icon: MetaIcon, href: '#meta-ads' },
    { title: 'Flow Builder', desc: 'Visual conversation canvas', icon: Workflow, href: '#flow-builder' },
    { title: 'Social Media Posting', desc: 'AI generated & scheduled posts', icon: Share2, href: '#social-posting' },
    { title: 'CRM & Pipelines', desc: 'Lead deals & pipelines', icon: Users, href: '#crm-pipeline' },
    { title: 'Campaigns & Broadcasts', desc: 'Bulk messaging & triggers', icon: Megaphone, href: '#campaigns' },
    { title: 'Appointment Booking', desc: 'Meeting scheduling calendar', icon: Calendar, href: '#appointment-booking' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 sm:px-6 lg:px-8 pointer-events-none">
      {/* Floating Capsule Navbar: Transparent background at top, adaptive frosted glass when scrolled */}
      <header 
        className={`max-w-[1240px] mx-auto h-14 rounded-full px-5 lg:px-7 flex items-center justify-between pointer-events-auto transition-all duration-300 ${
          isTransparentTop
            ? 'bg-transparent border border-white/10 backdrop-blur-xs text-white shadow-none'
            : isDark
              ? 'bg-[#0D0D0D]/85 border border-white/[0.08] text-white backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)]'
              : 'bg-white/90 border border-black/[0.06] text-[#0A0A0A] backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
        }`}
      >
        
        {/* Left: Brand Logo & Trademark */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none group">
          <PlatformLogo
            className="h-7 w-auto object-contain max-h-7 transition-transform duration-200 group-hover:scale-105"
            fallbackClassName="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
            invertOnDark={isDark}
          />
          <span className={`text-lg font-black tracking-tight flex items-center gap-1 transition-colors duration-200 ${
            isDark ? 'text-white' : 'text-[#0A0A0A]'
          }`}>
            {finalBrandName}
            <span className={`text-xs font-bold align-super transition-colors ${
              isDark ? 'text-neutral-300' : 'text-[#6B6B6B]'
            }`}>™</span>
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse ml-1"
              style={{
                backgroundColor: 'var(--accent-green, #4AE54A)',
                boxShadow: '0 0 8px var(--accent-green, #4AE54A)'
              }}
            />
          </span>
        </Link>

        {/* Center: Desktop Navigation Text Links with Dropdown Chevrons */}
        <nav className={`hidden md:flex items-center gap-6 text-xs font-semibold transition-colors duration-200 ${
          isDark ? 'text-white/90' : 'text-[#2A2A2A]'
        }`}>
          {/* Features Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setFeaturesDropdownOpen(true)}
            onMouseLeave={() => setFeaturesDropdownOpen(false)}
          >
            <button className={`flex items-center gap-1.5 py-2 transition-colors cursor-pointer ${
              isDark ? 'hover:text-white' : 'hover:text-[#0A0A0A]'
            }`}>
              <span>Features</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                featuresDropdownOpen ? 'rotate-180' : ''
              } ${isDark ? 'text-white/70' : 'text-[#6B6B6B]'}`} />
            </button>

            <AnimatePresence>
              {featuresDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[540px] rounded-2xl p-4 grid grid-cols-2 gap-2 z-50 text-left backdrop-blur-2xl transition-all ${
                    isDark
                      ? 'bg-[#121212]/95 border border-white/10 text-white shadow-[0_16px_48px_rgba(0,0,0,0.75)]'
                      : 'bg-white/95 border border-black/[0.06] text-[#0A0A0A] shadow-[0_16px_48px_rgba(0,0,0,0.1)]'
                  }`}
                >
                  {featureItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        onClick={() => setFeaturesDropdownOpen(false)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                          isDark
                            ? 'hover:bg-white/10 text-white'
                            : 'hover:bg-[#F5F5F5] text-[#0A0A0A]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-neutral-800/90 border border-white/10 text-[#4AE54A]'
                            : 'bg-[#E8FDE8] border border-[#4AE54A]/20 text-[#0A0A0A]'
                        }`}>
                          <Icon className={`w-4 h-4 ${isDark ? 'text-[#4AE54A]' : 'text-[#0A0A0A]'}`} />
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                            {item.title}
                          </div>
                          <div className={`text-[10px] mt-0.5 leading-tight ${
                            isDark ? 'text-neutral-400' : 'text-[#6B6B6B]'
                          }`}>
                            {item.desc}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a href="#ai-agents" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-[#0A0A0A]'}`}>
            AI ChatBots
          </a>
          <a href="#pricing" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-[#0A0A0A]'}`}>
            Pricing
          </a>
          <a href="#faq" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-[#0A0A0A]'}`}>
            FAQ
          </a>
        </nav>

        {/* Right: Rounded Pill Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-4 rounded-full font-semibold text-xs transition-all ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-[#0A0A0A] border border-black/[0.06]'
              }`}
            >
              Log In
            </Button>
          </Link>

          <Link href="/register">
            <Button
              size="sm"
              className={`h-8 px-4.5 rounded-full font-bold text-xs border-0 flex items-center gap-1 group transition-all duration-200 shadow-none ${
                isDark
                  ? 'bg-[#4AE54A] hover:bg-[#3EDB3E] text-[#0A0A0A] font-bold'
                  : 'bg-[#0A0A0A] hover:bg-[#262626] text-white'
              }`}
            >
              <span>Start Free</span>
              <ArrowRight className={`w-3 h-3 transition-transform group-hover:translate-x-0.5 ${
                isDark ? 'text-[#0A0A0A]' : 'text-white'
              }`} />
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/register">
            <Button 
              size="sm" 
              className={`h-7 px-3 rounded-full font-bold text-[11px] ${
                isDark
                  ? 'bg-[#4AE54A] text-[#0A0A0A] font-black'
                  : 'bg-[#0A0A0A] text-white'
              }`}
            >
              Start Free
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
              isDark
                ? 'text-white hover:bg-white/10 border-white/15'
                : 'text-[#0A0A0A] hover:bg-[#F5F5F5] border-black/[0.06]'
            }`}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden max-w-[1240px] mx-auto mt-2 rounded-2xl p-4 shadow-2xl space-y-3 backdrop-blur-2xl pointer-events-auto border ${
              isDark
                ? 'bg-[#121212]/95 border-white/10 text-white'
                : 'bg-white/95 border-black/[0.06] text-[#0A0A0A]'
            }`}
          >
            <div className={`flex flex-col space-y-1 text-xs font-semibold text-left ${
              isDark ? 'text-neutral-200' : 'text-[#0A0A0A]'
            }`}>
              <a href="#unified-inbox" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Shared Inbox</a>
              <a href="#ai-agents" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>AI ChatBots</a>
              <a href="#knowledge-base" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Knowledge Base</a>
              <a href="#meta-ads" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Meta Ads Suite</a>
              <a href="#flow-builder" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Flow Builder</a>
              <a href="#social-posting" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Social Media Posting</a>
              <a href="#crm-pipeline" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>CRM & Pipelines</a>
              <a href="#campaigns" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Campaigns & Broadcasts</a>
              <a href="#appointment-booking" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Appointment Booking</a>
              <a href="#store-integrations" onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F5F5F5]'}`}>Store Integrations</a>
            </div>
            <div className={`pt-2 border-t flex flex-col gap-2 ${isDark ? 'border-white/10' : 'border-black/[0.06]'}`}>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant="outline" 
                  className={`w-full h-9 rounded-full text-xs font-semibold ${
                    isDark 
                      ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' 
                      : 'border-black/[0.06] text-[#0A0A0A] hover:bg-[#F5F5F5]'
                  }`}
                >
                  Log In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  className={`w-full h-9 rounded-full text-xs font-bold ${
                    isDark
                      ? 'bg-[#4AE54A] hover:bg-[#3EDB3E] text-[#0A0A0A] font-black'
                      : 'bg-[#0A0A0A] text-white hover:bg-[#262626]'
                  }`}
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
