'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from '@/i18n/routing';
import { fetchWithCsrf, clearAuthSession } from '@/lib/api';
import { 
  LayoutDashboard,
  Building2, 
  Coins, 
  CreditCard, 
  LogOut, 
  Settings2,
  Zap,
  Brain,
  Puzzle,
  LifeBuoy,
  Users,
  ShieldAlert,
  RefreshCw,
  BarChart3,
  FileText,
  GitFork,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AdminNotificationBell from '@/components/layout/AdminNotificationBell';
import { useBranding } from '@/components/BrandingThemeProvider';
import { PlatformLogo } from '@/components/common/PlatformLogo';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brandingName, logoUrl } = useBranding();
  const pathname = usePathname();
  const router = useRouter();
  const { customHeader } = useHeaderStore();
  const t = useTranslations('Superadmin');

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Verify Super Admin session validity on mount
    const verifyAdminSession = async () => {
      try {
        const res = await fetchWithCsrf('/admin/me');
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('whatsomni_admin_token');
          const host = window.location.hostname;
          const domains = Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));
          domains.forEach(d => {
            document.cookie = `whatsomni_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${d};`;
          });
          router.push('/superadmin/login');
        }
      } catch (e) {
        console.debug('Failed to verify admin session:', e);
      }
    };

    verifyAdminSession();
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (pathname.includes('/superadmin/settings')) {
      setExpandedGroup('Settings');
    } else {
      setExpandedGroup(null);
    }
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetchWithCsrf('/admin/logout', {
        method: 'POST',
      }).catch(() => {});
    } catch {
      // Ignore
    } finally {
      clearAuthSession('admin');
      toast.success(t('messages.loggedOut') || 'Logged out successfully');
      setShowLogoutModal(false);
      setRedirecting(true);

      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      window.location.href = `${localePrefix}/superadmin/login`;
    }
  };

  const navLinks = [
    {
      id: 'Dashboard',
      name: 'Dashboard',
      translationKey: 'dashboard',
      href: '/superadmin/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'Tenants',
      name: 'Tenants',
      translationKey: 'tenants',
      href: '/superadmin/tenants',
      icon: Building2,
    },
    {
      id: 'Users',
      name: 'Users',
      translationKey: 'users',
      href: '/superadmin/users',
      icon: Users,
    },
    {
      id: 'Plans',
      name: 'Plans',
      translationKey: 'plans',
      href: '/superadmin/plans',
      icon: CreditCard,
    },
    {
      id: 'Currencies',
      name: 'Currencies',
      translationKey: 'currencies',
      href: '/superadmin/currencies',
      icon: Coins,
    },
    {
      id: 'Channels',
      name: 'Channels',
      translationKey: 'channels',
      href: '/superadmin/channels',
      icon: Zap,
    },
    {
      id: 'AIProviders',
      name: 'AI Providers',
      translationKey: 'aiProviders',
      href: '/superadmin/ai-providers',
      icon: Brain,
    },
    {
      id: 'Integrations',
      name: 'Integrations',
      translationKey: 'integrations',
      href: '/superadmin/integrations',
      icon: Puzzle,
    },
    {
      id: 'FlowTemplates',
      name: 'Flow Templates',
      translationKey: 'flowTemplates',
      href: '/superadmin/flow-templates',
      icon: GitFork,
    },
    {
      id: 'SupportTickets',
      name: 'Support Tickets',
      translationKey: 'tickets',
      href: '/superadmin/tickets',
      icon: LifeBuoy,
    },
    {
      id: 'Analytics',
      name: 'Analytics & Reports',
      translationKey: 'analytics',
      href: '/superadmin/analytics',
      icon: BarChart3,
    },
    {
      id: 'CustomPages',
      name: 'Legal & Pages',
      translationKey: 'customPages',
      href: '/superadmin/pages',
      icon: FileText,
    },
    {
      id: 'Settings',
      name: 'Settings',
      translationKey: 'settings',
      href: '/superadmin/settings/general',
      icon: Settings2,
      subItems: [
        {
          name: 'General',
          translationKey: 'subGeneral',
          href: '/superadmin/settings/general',
        },
        {
          name: 'Customization',
          translationKey: 'subCustomization',
          href: '/superadmin/settings/customization',
        },
        {
          name: 'Teams',
          translationKey: 'subTeams',
          href: '/superadmin/settings/team',
        },
        {
          name: 'Mail Settings',
          translationKey: 'subMail',
          href: '/superadmin/settings/mail',
        },
        {
          name: 'Payment Gateways',
          translationKey: 'subPaymentGateways',
          href: '/superadmin/settings/payment-gateways',
        },
        {
          name: 'Meta Settings',
          translationKey: 'subMeta',
          href: '/superadmin/settings/meta',
        },
      ]
    },
  ];

  return (
    <div className="h-screen w-screen flex bg-white font-sans text-black overflow-hidden relative">
      {/* 1. Desktop Sidebar Navigation (Hidden on Mobile) */}
      <aside className="hidden md:flex w-64 border-r border-[#E8E8E6] bg-white flex-col shrink-0 select-none h-full">
        {/* Logo Brand Header */}
        <div className="h-16 px-6 border-b border-[#E8E8E6] flex items-center gap-2.5">
          <PlatformLogo 
            className="h-5 w-auto object-contain max-h-5"
            fallbackClassName="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
            showText
            textClassName="text-xs font-black uppercase tracking-wider text-black"
          />
          <span className="bg-black text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">SaaS</span>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const hasSub = !!link.subItems;
            const isActive = hasSub 
              ? pathname.startsWith('/superadmin/settings')
              : pathname.startsWith(link.href);
            const isGroupExpanded = expandedGroup === link.id || isActive;
            const Icon = link.icon;

            return (
              <div key={link.id} className="space-y-1">
                <Link 
                  href={link.href}
                  onClick={() => {
                    if (link.subItems) {
                      setExpandedGroup(link.id);
                    } else {
                      setExpandedGroup(null);
                    }
                  }}
                  className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-xs font-bold tracking-tight transition-all relative ${
                    isActive 
                      ? 'bg-zinc-50 text-black font-extrabold shadow-3xs' 
                      : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-black'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="admin-sidebar-active-indicator"
                      className="absolute left-0 rounded-r-full top-2.5 bottom-2.5 w-[3px] bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-[#6B6B6B]'}`} />
                  <span>{t(`sidebar.${link.translationKey}`)}</span>
                </Link>

                <AnimatePresence initial={false}>
                  {hasSub && isGroupExpanded && (
                    <motion.div
                      key={link.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="pl-6 space-y-1 mt-1 ml-6 relative overflow-hidden"
                    >
                      {/* Vertical track line */}
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[1.5px] bg-zinc-100" />
                      {link.subItems.map((sub) => {
                        const isSubActive = pathname.endsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block py-1.5 text-[11.5px] font-semibold tracking-tight transition-all relative pl-5 select-none hover:translate-x-[2px] duration-200 ${
                              isSubActive
                                ? 'text-zinc-950 font-bold'
                                : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                          >
                            {/* Tree node dot / sliding indicator */}
                            {isSubActive ? (
                              <motion.span
                                layoutId="admin-sub-sidebar-active-indicator"
                                className="absolute left-[-1px] top-2 bottom-2 w-[2px] bg-primary rounded-full"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            ) : (
                              <span className="absolute left-[-1.5px] top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-zinc-200 group-hover:bg-zinc-400 transition-colors" />
                            )}
                            {t.has(`sidebar.${sub.translationKey}`) ? t(`sidebar.${sub.translationKey}`) : sub.name}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-5 border-t border-[#E8E8E6] bg-white">
          <div className="px-3 py-1.5 mb-3 bg-zinc-50 rounded-lg border border-[#E8E8E6]/60">
            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
              {t('sidebar.securityLevel')}
            </p>
            <p className="text-[10px] font-bold text-black truncate max-w-[170px]">{t('sidebar.superAdmin')}</p>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#6B6B6B] hover:bg-red-50 hover:text-red-650 transition-colors border border-transparent cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {t('sidebar.signOut')}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Slide-Over Navigation Drawer */}
      <AnimatePresence>
        {mounted && mobileMenuOpen && (
          <div className="fixed inset-0 z-[9990] md:hidden flex select-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-[280px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 mr-auto border-r border-[#E8E8E6]"
            >
              <div className="h-14 px-4 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <PlatformLogo 
                    className="h-4.5 w-auto object-contain max-h-4.5"
                    fallbackClassName="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
                    showText
                    textClassName="text-xs font-black uppercase tracking-wider text-black"
                  />
                  <span className="bg-black text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">SaaS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const hasSub = !!link.subItems;
                  const isActive = hasSub 
                    ? pathname.startsWith('/superadmin/settings')
                    : pathname.startsWith(link.href);
                  const isGroupExpanded = expandedGroup === link.id || isActive;
                  const Icon = link.icon;

                  return (
                    <div key={link.id} className="space-y-0.5">
                      <Link 
                        href={link.href}
                        onClick={() => {
                          if (link.subItems) {
                            setExpandedGroup(prev => prev === link.id ? null : link.id);
                          } else {
                            setExpandedGroup(null);
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold tracking-tight transition-all relative ${
                          isActive 
                            ? 'bg-zinc-100 text-black font-extrabold shadow-3xs' 
                            : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-black'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 rounded-r-full top-2 bottom-2 w-[3px] bg-primary" />
                        )}
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-[#6B6B6B]'}`} />
                        <span>{t(`sidebar.${link.translationKey}`)}</span>
                      </Link>

                      {hasSub && isGroupExpanded && (
                        <div className="pl-4 space-y-1 mt-1 ml-4 relative border-l border-zinc-200">
                          {link.subItems.map((sub) => {
                            const isSubActive = pathname.endsWith(sub.href);
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block py-1.5 text-[11px] font-semibold tracking-tight transition-all pl-3 select-none ${
                                  isSubActive
                                    ? 'text-zinc-950 font-bold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                {t.has(`sidebar.${sub.translationKey}`) ? t(`sidebar.${sub.translationKey}`) : sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="p-3.5 border-t border-[#E8E8E6] bg-white shrink-0 space-y-2">
                <div className="px-3 py-1.5 bg-zinc-50 rounded-lg border border-[#E8E8E6]/60">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                    {t('sidebar.securityLevel')}
                  </p>
                  <p className="text-[10px] font-bold text-black truncate">{t('sidebar.superAdmin')}</p>
                </div>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border border-red-200/60 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('sidebar.signOut')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
        {/* Mobile Header Bar (< md) */}
        <header className="h-14 border-b border-[#E8E8E6] px-3.5 flex md:hidden items-center justify-between bg-white select-none shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="h-8.5 w-8.5 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 transition-colors shadow-3xs cursor-pointer"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <PlatformLogo 
                className="h-4 w-auto object-contain max-h-4"
                fallbackClassName="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0 select-none"
                showText
                textClassName="text-xs font-black uppercase tracking-wider text-black truncate max-w-[110px]"
              />
              <span className="bg-black text-white text-[7.5px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">SaaS</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <AdminNotificationBell />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Desktop Header Bar (>= md) */}
        {customHeader ? (
          <div className="hidden md:block">
            {customHeader}
          </div>
        ) : (
          <header className="h-16 border-b border-[#E8E8E6] px-6 lg:px-8 hidden md:flex items-center justify-between bg-white select-none shrink-0">
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase truncate">
              {pathname.includes('/dashboard') ? t('headers.dashboard') : 
               pathname.includes('/tenants') ? t('headers.tenantsDirectory') : 
               pathname.includes('/users') ? t('headers.usersConfig') : 
               pathname.includes('/plans') ? t('headers.planOfferings') : 
               pathname.includes('/currencies') ? t('headers.systemCurrencies') : 
               pathname.includes('/channels') ? t('headers.channelsConfig') :
               pathname.includes('/pages') ? t('headers.customPages') :
               pathname.includes('/ai-providers') ? t('headers.aiConfig') :
               pathname.includes('/integrations') ? t('headers.integrationsConfig') :
               pathname.includes('/tickets') ? t('headers.ticketsConfig') :
               pathname.includes('/analytics') ? t('headers.analytics') :
               pathname.includes('/settings/general') ? t('headers.generalSettings') :
               pathname.includes('/settings/customization') ? t('headers.customizationSettings') :
               pathname.includes('/settings/team') ? t('headers.teamsSettings') :
               pathname.includes('/settings/mail') ? t('headers.mailSettings') :
               pathname.includes('/settings/payment-gateways') ? (t('headers.paymentGateways') || 'Payment Gateways') :
               pathname.includes('/settings') ? t('headers.globalConfig') : t('headers.adminPanel')}
            </h2>
            <div className="flex items-center gap-3">
              <AdminNotificationBell />
              <LanguageSwitcher />
            </div>
          </header>
        )}

        {/* Custom Header on Mobile (< md) */}
        {customHeader && (
          <div className="md:hidden border-b border-[#E8E8E6] bg-white">
            {customHeader}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden bg-white">
          {children}
        </div>
      </main>

      {/* LOGOUT CONFIRMATION DIALOG PORTAL */}
      {showLogoutModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t.has('sidebar.confirmSignOutTitle') ? t('sidebar.confirmSignOutTitle') : 'Confirm Sign-Out'}
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowLogoutModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t.has('sidebar.confirmSignOutText') ? t('sidebar.confirmSignOutText') : 'Are you sure you want to log out of your session? Any unsaved active changes may be lost.'}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {t.has('sidebar.cancel') ? t('sidebar.cancel') : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="h-9 px-4 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {logoutLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : (t.has('sidebar.signOut') ? t('sidebar.signOut') : 'Sign Out')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {redirecting && (
        <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-white tracking-tight animate-pulse">Logging you out securely...</p>
        </div>
      )}
    </div>
  );
}
