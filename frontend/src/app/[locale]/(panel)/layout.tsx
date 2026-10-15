'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf, clearAuthSession } from '@/lib/api';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { 
  Building2, 
  Settings2, 
  Users, 
  Megaphone, 
  Workflow, 
  LogOut, 
  Briefcase,
  Radio,
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Sparkles,
  Bot,
  FileText,
  Calendar,
  HelpCircle,
  CreditCard,
  Link2,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Menu,
  X,
  Share2,
  Zap,
  FormInput,
  Target,
  Layers,
  SlidersHorizontal,
  Image as ImageIcon,
  BarChart3,
  Store,
  Package,
  Receipt,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useLocale, useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import NotificationBell from '@/components/layout/NotificationBell';
import { useBranding } from '@/components/BrandingThemeProvider';
import { PlatformLogo } from '@/components/common/PlatformLogo';
import WorkspaceSwitcher, { WorkspaceItem } from '@/components/workspace/WorkspaceSwitcher';
import dynamic from 'next/dynamic';

const CreateWorkspaceModal = dynamic(() => import('@/components/workspace/CreateWorkspaceModal'), {
  ssr: false,
});
const FloatingCopilot = dynamic(() => import('@/components/copilot/FloatingCopilot'), {
  ssr: false,
});

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brandingName, logoUrl } = useBranding();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const currentMetaTab = pathname.startsWith('/meta-ads') ? (searchParams.get('tab') || 'campaigns') : null;
  
  const t = useTranslations();
  const tNav = useTranslations('Navigation');
  const tAgents = useTranslations('Agents');
  const tSettings = useTranslations('Settings');
  const tBilling = useTranslations('Billing');
  const tHelp = useTranslations('Help');
  const tCommon = useTranslations('Common');

  const isRtl = locale === 'ar' || locale === 'he';
  const { customHeader } = useHeaderStore();
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('Workspace Console');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [userClosedGroups, setUserClosedGroups] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [stopImpersonatingLoading, setStopImpersonatingLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [operationalModel, setOperationalModel] = useState<string>('byok');

  // Multi-Workspace States
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false);
  const [workspacesLimit, setWorkspacesLimit] = useState(1);
  const [workspacesCount, setWorkspacesCount] = useState(1);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const checkAccessAndSync = async () => {
    try {
      const response = await fetchWithCsrf('/auth/me');
      if (response.ok) {
        const data = await response.json();
        const tenant = data.user?.tenant;
        setIsImpersonated(data.is_impersonated || false);
        
        // Multi-Workspace state synchronization
        if (data.workspaces && data.workspaces.length > 0) {
          setWorkspaces(data.workspaces);
          
          const storedWorkspaceId = typeof window !== 'undefined' ? localStorage.getItem('whatsomni_workspace_id') : null;
          let current: WorkspaceItem | undefined;
          
          if (storedWorkspaceId) {
            current = data.workspaces.find((w: WorkspaceItem) => String(w.id) === String(storedWorkspaceId));
          }
          if (!current) {
            current = data.workspaces.find((w: WorkspaceItem) => w.is_current) || data.workspaces[0];
          }

          setActiveWorkspace(current || null);
          if (current) {
            setTenantName(current.company_name || current.name || 'Workspace Console');
            localStorage.setItem('whatsomni_workspace_id', String(current.id));
            if (typeof document !== 'undefined') {
              document.cookie = `whatsomni_workspace_id=${current.id}; path=/; max-age=31536000; SameSite=Lax`;
            }
          }
        } else if (data.current_workspace) {
          const current = data.current_workspace;
          setWorkspaces([current]);
          setActiveWorkspace(current);
          setTenantName(current.company_name || current.name || 'Workspace Console');
          localStorage.setItem('whatsomni_workspace_id', String(current.id));
        } else if (tenant) {
          const fallback: WorkspaceItem = {
            id: tenant.id,
            company_name: tenant.company_name,
            name: tenant.company_name,
            is_owner: true,
            is_current: true,
            plan: tenant.plan,
          };
          setWorkspaces([fallback]);
          setActiveWorkspace(fallback);
          setTenantName(tenant.company_name || 'Workspace Console');
          localStorage.setItem('whatsomni_workspace_id', String(tenant.id));
        }

        setCanCreateWorkspace(!!data.can_create_workspace);
        setWorkspacesLimit(data.workspaces_limit ?? 1);
        setWorkspacesCount(data.workspaces_count ?? 1);

        if (tenant) {
          if (!activeWorkspace) {
            setTenantName(tenant.company_name || 'Workspace Console');
          }
            
            // Route guards enforcement: if currently impersonated, bypass onboarding and billing checks
            const isImpersonatingActive = Boolean(data.is_impersonated || isImpersonated);

            if (!isImpersonatingActive && tenant.onboarding_step !== 'complete' && tenant.onboarding_step !== '3') {
              router.push('/onboarding');
              return;
            }
            
            // Allow bypassing plan check if path is /settings/billing and session_id is present, or if impersonating
            const isBillingCallback = pathname.includes('/settings/billing') && typeof window !== 'undefined' && window.location.search.includes('session_id=');

            const isTrialActive = tenant.status === 'trial' && !tenant.is_trial_expired;
            const hasActivePlanOrTrial = Boolean(tenant.plan_id || isTrialActive || tenant.status === 'active');

            if (!isImpersonatingActive && !hasActivePlanOrTrial && !pathname.startsWith('/billing/plans') && !pathname.startsWith('/settings') && !isBillingCallback) {
              router.push('/billing/plans');
              return;
            }
          }

          // Fetch AI operational model
          try {
            const aiRes = await fetchWithCsrf('/settings/ai-providers');
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              if (aiData.operational_model) {
                setOperationalModel(aiData.operational_model);
              }
            }
          } catch {}

          // Dynamic User Language preference redirect
          if (data.user?.language && data.user.language !== locale) {
            document.cookie = `NEXT_LOCALE=${data.user.language}; path=/; max-age=31536000; SameSite=Lax`;
            window.location.href = `/${data.user.language}${pathname}`;
            return;
          }
      } else if (response.status === 401) {
        router.push('/login');
        return;
      }
    } catch {
      console.error('Failed to sync session contexts.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    setStopImpersonatingLoading(true);
    try {
      const response = await fetchWithCsrf('/superadmin/impersonate/stop', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const adminToken = data.token || localStorage.getItem('whatsomni_admin_token');
        if (adminToken) {
          localStorage.setItem('whatsomni_token', adminToken);
          localStorage.setItem('whatsomni_admin_token', adminToken);
        } else {
          localStorage.removeItem('whatsomni_token');
        }

        if (typeof document !== 'undefined') {
          const host = window.location.hostname;
          const cookieDomains = Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));
          cookieDomains.forEach(d => {
            document.cookie = `whatsomni_logged_in=; path=/; max-age=0; SameSite=Lax${d}`;
            document.cookie = `whatsomni_onboarding_completed=; path=/; max-age=0; SameSite=Lax${d}`;
            document.cookie = `whatsomni_plan_selected=; path=/; max-age=0; SameSite=Lax${d}`;
            document.cookie = `whatsomni_workspace_id=; path=/; max-age=0; SameSite=Lax${d}`;
            document.cookie = `whatsomni_admin_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
          });
        }

        toast.success(data.message || 'Returned to administrator session.');
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        }
      } else {
        toast.error(t('toasts.stopImpersonationFailed'));
      }
    } catch {
      toast.error(t('toasts.connectionError'));
    } finally {
      setStopImpersonatingLoading(false);
    }
  };

  useEffect(() => {
    checkAccessAndSync();
    
    if (pathname.includes('/settings') && !pathname.includes('/settings/billing') && !pathname.includes('/settings/integrations')) {
      setExpandedGroup('Settings');
    } else if (pathname.includes('/help')) {
      setExpandedGroup('Help');
    } else {
      setExpandedGroup(null);
    }
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetchWithCsrf('/auth/logout', {
        method: 'POST',
      }).catch(() => {});
    } catch {
      // Ignore network errors - session wiped locally regardless
    } finally {
      clearAuthSession('tenant');
      toast.success(t('toasts.logoutSuccess') || 'Logged out successfully');
      setShowLogoutModal(false);
      setRedirecting(true);
      
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      window.location.href = `${localePrefix}/login`;
    }
  };

  const navCategories = [
    {
      category: null,
      items: [
        {
          id: 'Dashboard',
          name: tNav('dashboard'),
          href: '/dashboard',
          icon: Building2,
        },
        {
          id: 'Inbox',
          name: tNav('inbox'),
          href: '/inbox',
          icon: MessageSquare,
        },
      ]
    },
    {
      category: 'AI & AUTOMATION',
      categoryKey: 'categoryAiAutomation',
      items: [
        {
          id: 'Chatbot',
          name: t.has('Chatbot.title') ? t('Chatbot.title') : 'AI ChatBot',
          href: '/chatbot',
          icon: Bot,
        },
        {
          id: 'Flows',
          name: tNav('flows') || 'Automation Flows',
          href: '/flows',
          icon: Workflow,
        },
        {
          id: 'Knowledge',
          name: tNav('knowledge') || 'Knowledge Base',
          href: '/knowledge-base',
          icon: BookOpen,
        },
      ]
    },
    {
      category: 'COMMUNICATION & MARKETING',
      categoryKey: 'categoryCommunication',
      items: [
        {
          id: 'Channels',
          name: tNav('channels'),
          href: '/channels',
          icon: Radio,
        },
        {
          id: 'SocialPosts',
          name: tNav('socialPosts') || 'Social Posts',
          href: '/social-posts',
          icon: Share2,
        },
        {
          id: 'Campaigns',
          name: tNav('campaigns'),
          href: '/campaigns',
          icon: Megaphone,
        },
        {
          id: 'WhatsAppFlows',
          name: tNav('whatsappFlows') || 'WhatsApp Flows',
          href: '/whatsapp-flows',
          icon: FormInput,
        },
        {
          id: 'QuickReplies',
          name: tNav('quickReplies') || 'Quick Replies',
          href: '/quick-replies',
          icon: Zap,
        },
        {
          id: 'Templates',
          name: tNav('templates'),
          href: '/templates',
          icon: FileText,
        },
      ]
    },
    {
      category: 'E-COMMERCE',
      categoryKey: 'categoryEcommerce',
      items: [
        {
          id: 'EcommerceStores',
          name: tNav.has('ecommerceStores') ? tNav('ecommerceStores') : 'Stores',
          href: '/ecommerce/stores',
          icon: Store,
        },
        {
          id: 'EcommerceProducts',
          name: tNav.has('ecommerceProducts') ? tNav('ecommerceProducts') : 'Products',
          href: '/ecommerce/products',
          icon: Package,
        },
        {
          id: 'EcommerceOrders',
          name: tNav.has('ecommerceOrders') ? tNav('ecommerceOrders') : 'Orders',
          href: '/ecommerce/orders',
          icon: Receipt,
        },
        {
          id: 'EcommerceWhatsAppCatalog',
          name: tNav.has('ecommerceWhatsAppCatalog') ? tNav('ecommerceWhatsAppCatalog') : 'WhatsApp Catalog',
          href: '/ecommerce/whatsapp-catalog',
          icon: ShoppingBag,
        },
      ]
    },
    {
      category: 'META ADS',
      categoryKey: 'categoryMetaAds',
      items: [
        {
          id: 'MetaCampaigns',
          name: tNav.has('metaAdsManager') ? tNav('metaAdsManager') : (tNav.has('metaCampaigns') ? tNav('metaCampaigns') : 'Ads Manager'),
          href: '/meta-ads',
          icon: Target,
        },
        {
          id: 'MetaAccounts',
          name: tNav.has('metaAccounts') ? tNav('metaAccounts') : 'Ad Accounts',
          href: '/meta-ads?tab=accounts',
          icon: Building2,
        },
        {
          id: 'MetaAnalytics',
          name: tNav.has('metaAnalytics') ? tNav('metaAnalytics') : 'Ad Analytics',
          href: '/meta-ads?tab=analytics',
          icon: BarChart3,
        },
        {
          id: 'MetaLeads',
          name: tNav.has('metaLeads') ? tNav('metaLeads') : 'Leads',
          href: '/meta-ads?tab=leads',
          icon: Users,
        },
      ]
    },
    {
      category: 'CRM & AUDIENCE',
      categoryKey: 'categoryCrm',
      items: [
        {
          id: 'Contacts',
          name: tNav('contacts'),
          href: '/contacts',
          icon: Users,
        },
        {
          id: 'Staff',
          name: tNav('staff') || 'Staff Directory',
          href: '/staff',
          icon: UserCheck,
        },
        {
          id: 'Deals',
          name: tNav('deals'),
          href: '/deals',
          icon: Briefcase,
        },
        {
          id: 'Calendar',
          name: tNav('calendar'),
          href: '/calendar',
          icon: Calendar,
        },
      ]
    },
    {
      category: 'SETTINGS & WORKSPACE',
      categoryKey: 'categorySettings',
      items: [
        {
          id: 'Billing',
          name: tBilling('title'),
          href: '/settings/billing',
          icon: CreditCard,
        },
        {
          id: 'Integrations',
          name: tNav('integrations'),
          href: '/settings/integrations',
          icon: Link2,
        },
        {
          id: 'Settings',
          name: tNav('settings'),
          href: '/settings/general',
          icon: Settings2,
          subItems: [
            {
              name: tSettings('generalTitle'),
              href: '/settings/general',
            },
            {
              name: tSettings('deviceSessions'),
              href: '/settings/sessions',
            },
            ...(operationalModel === 'byok' ? [
              {
                name: tSettings('aiProviders'),
                href: '/settings/ai-providers',
              }
            ] : []),
            {
              name: tSettings('teamAccess'),
              href: '/settings/team',
            },
          ]
        },
      ]
    },
    {
      category: 'SUPPORT',
      categoryKey: 'categorySupport',
      items: [
        {
          id: 'Help',
          name: tNav('help'),
          href: '/help/faq',
          icon: HelpCircle,
          subItems: [
            {
              name: tHelp('faqTitle'),
              href: '/help/faq',
            },
            {
              name: tHelp('ticketsTitle'),
              href: '/help/tickets',
            },
          ]
        },
      ]
    }
  ];

  // Render layout structure and use inline loader in page content area when loading is true

  const isEditor = pathname.includes('/flows/') && pathname.includes('/edit');

  if (isEditor) {
    return (
      <div className="h-screen w-screen bg-white font-sans text-black overflow-hidden flex flex-col relative">
        {children}
        <FloatingCopilot />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-white font-sans text-black overflow-hidden relative">
      {/* 1. Desktop Sidebar Navigation (Hidden on Mobile) */}
      <aside className={`hidden md:flex w-64 ${isRtl ? 'border-l' : 'border-r'} border-[#E8E8E6] bg-white flex-col shrink-0 select-none h-full`}>
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#E8E8E6] flex items-center gap-2.5">
          <PlatformLogo 
            className="h-5 w-auto object-contain max-h-5"
            fallbackClassName="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
            showText
            textClassName="font-black text-sm tracking-tight uppercase"
          />
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {navCategories.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.category && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    {(() => {
                      if (!group.categoryKey) return group.category;
                      const val = tNav(group.categoryKey);
                      return (val.startsWith('Navigation.') || val.startsWith('NAVIGATION.')) ? group.category : val;
                    })()}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((link: any) => {
                  const hasSub = !!link.subItems;
                  const isSettingsPath = pathname.startsWith('/settings') && !pathname.startsWith('/settings/billing') && !pathname.startsWith('/settings/integrations');
                  const isHelpPath = pathname.startsWith('/help');

                  const isMetaLink = link.href.startsWith('/meta-ads');
                  const isMetaCampaignsItem = link.id === 'MetaCampaigns';
                  const isActive = hasSub 
                    ? (link.id === 'Settings' ? isSettingsPath : isHelpPath)
                    : isMetaLink
                      ? (pathname.startsWith('/meta-ads') && (
                          isMetaCampaignsItem
                            ? (!currentMetaTab || ['campaigns', 'adsets', 'ads'].includes(currentMetaTab))
                            : (currentMetaTab ? link.href.includes(`tab=${currentMetaTab}`) : false)
                        ))
                      : (link.href === '/dashboard' ? pathname === '/dashboard' || pathname.endsWith('/dashboard') : pathname.startsWith(link.href));

                  const isGroupExpanded = expandedGroup === link.id || 
                    (userClosedGroups[link.id] !== true && ((link.id === 'Settings' && isSettingsPath) || (link.id === 'Help' && isHelpPath)));

                  const Icon = link.icon;

                  return (
                    <div key={link.id} className="space-y-1">
                      <Link 
                        href={link.href}
                        onClick={() => {
                          if (link.subItems) {
                            setUserClosedGroups(prev => ({ ...prev, [link.id]: false }));
                            setExpandedGroup(link.id);
                          } else {
                            setExpandedGroup(null);
                          }
                        }}
                        className={`flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-xs font-bold tracking-tight transition-all relative ${
                          isActive
                            ? 'bg-zinc-50 text-black font-extrabold shadow-3xs' 
                            : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-black'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-indicator"
                            className={`absolute ${isRtl ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-2 bottom-2 w-[3px] bg-primary`}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-[#6B6B6B]'}`} />
                        <span>{link.name}</span>
                      </Link>
                      
                      <AnimatePresence initial={false}>
                        {hasSub && isGroupExpanded && (
                          <motion.div
                            key={link.id}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="pl-5 space-y-1 mt-1 ml-5 relative overflow-hidden"
                          >
                            {/* Vertical track line */}
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[1.5px] bg-zinc-100" />
                            {link.subItems.map((sub: any) => {
                              const isSubActive = pathname === sub.href || pathname.endsWith(sub.href);
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => {
                                    setUserClosedGroups(prev => ({ ...prev, [link.id]: false }));
                                    setExpandedGroup(link.id);
                                  }}
                                  className={`block py-1.5 text-[11.5px] font-semibold tracking-tight transition-all relative pl-4 select-none hover:translate-x-[2px] duration-200 ${
                                    isSubActive
                                      ? 'text-zinc-950 font-bold'
                                      : 'text-zinc-500 hover:text-zinc-900'
                                  }`}
                                >
                                  {isSubActive ? (
                                    <motion.span
                                      layoutId="sub-sidebar-active-indicator"
                                      className={`absolute ${isRtl ? 'right-[-1px]' : 'left-[-1px]'} top-2 bottom-2 w-[2px] bg-primary rounded-full`}
                                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                  ) : (
                                    <span className={`absolute ${isRtl ? 'right-[-1.5px]' : 'left-[-1.5px]'} top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-zinc-200 group-hover:bg-zinc-400 transition-colors`} />
                                  )}
                                  {sub.name}
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Profile & Workspace Switcher */}
        <div className="p-4 border-t border-[#E8E8E6] bg-white space-y-2.5">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            canCreateWorkspace={canCreateWorkspace}
            workspacesLimit={workspacesLimit}
            workspacesCount={workspacesCount}
            variant="sidebar"
            onOpenCreateModal={() => setCreateWorkspaceModalOpen(true)}
            isRtl={isRtl}
          />
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-[#6B6B6B] hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {tCommon('logout')}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Slide-Over Navigation Drawer */}
      <AnimatePresence>
        {mounted && mobileMenuOpen && (
          <div className="fixed inset-0 z-[9990] md:hidden flex select-none">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Slide-over Drawer Panel */}
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className={`relative w-[285px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 ${isRtl ? 'ml-auto border-l' : 'mr-auto border-r'} border-[#E8E8E6]`}
            >
              {/* Drawer Brand Header */}
              <div className="h-14 px-4 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
                <PlatformLogo 
                  className="h-4.5 w-auto object-contain max-h-4.5"
                  fallbackClassName="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
                  showText
                  textClassName="font-black text-xs tracking-tight uppercase text-zinc-950"
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
                {navCategories.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    {group.category && (
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                          {(() => {
                            if (!group.categoryKey) return group.category;
                            const val = tNav(group.categoryKey);
                            return (val.startsWith('Navigation.') || val.startsWith('NAVIGATION.')) ? group.category : val;
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((link: any) => {
                        const hasSub = !!link.subItems;
                        const isSettingsPath = pathname.startsWith('/settings') && !pathname.startsWith('/settings/billing') && !pathname.startsWith('/settings/integrations');
                        const isHelpPath = pathname.startsWith('/help');

                        const isMetaLink = link.href.startsWith('/meta-ads');
                        const isMetaCampaignsItem = link.id === 'MetaCampaigns';
                        const isActive = hasSub 
                          ? (link.id === 'Settings' ? isSettingsPath : isHelpPath)
                          : isMetaLink
                            ? (pathname.startsWith('/meta-ads') && (
                                isMetaCampaignsItem
                                  ? (!currentMetaTab || ['campaigns', 'adsets', 'ads'].includes(currentMetaTab))
                                  : (currentMetaTab ? link.href.includes(`tab=${currentMetaTab}`) : false)
                              ))
                            : (link.href === '/dashboard' ? pathname === '/dashboard' || pathname.endsWith('/dashboard') : pathname.startsWith(link.href));

                        const isGroupExpanded = expandedGroup === link.id || 
                          (userClosedGroups[link.id] !== true && ((link.id === 'Settings' && isSettingsPath) || (link.id === 'Help' && isHelpPath)));

                        const Icon = link.icon;

                        return (
                          <div key={link.id} className="space-y-0.5">
                            <Link 
                              href={link.href}
                              onClick={() => {
                                if (link.subItems) {
                                  setUserClosedGroups(prev => ({ ...prev, [link.id]: false }));
                                  setExpandedGroup(link.id);
                                } else {
                                  setExpandedGroup(null);
                                  setMobileMenuOpen(false);
                                }
                              }}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold tracking-tight transition-all relative ${
                                isActive
                                  ? 'bg-zinc-100/80 text-black font-extrabold shadow-3xs' 
                                  : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-black'
                              }`}
                            >
                              {isActive && (
                                <span className={`absolute ${isRtl ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-2 bottom-2 w-[3px] bg-primary`} />
                              )}
                              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-[#6B6B6B]'}`} />
                              <span>{link.name}</span>
                            </Link>
                            
                            {hasSub && isGroupExpanded && (
                              <div className="pl-4 space-y-1 mt-1 ml-4 relative border-l border-zinc-200">
                                {link.subItems.map((sub: any) => {
                                  const isSubActive = pathname === sub.href || pathname.endsWith(sub.href);
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={() => {
                                        setMobileMenuOpen(false);
                                      }}
                                      className={`block py-1.5 text-[11px] font-semibold tracking-tight transition-all pl-3 select-none ${
                                        isSubActive
                                          ? 'text-zinc-950 font-bold'
                                          : 'text-zinc-500 hover:text-zinc-900'
                                      }`}
                                    >
                                      {sub.name}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Drawer Footer Profile & Workspace Switcher */}
              <div className="p-3.5 border-t border-[#E8E8E6] bg-white shrink-0 space-y-2.5">
                <WorkspaceSwitcher
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  canCreateWorkspace={canCreateWorkspace}
                  workspacesLimit={workspacesLimit}
                  workspacesCount={workspacesCount}
                  variant="mobile"
                  onOpenCreateModal={() => {
                    setMobileMenuOpen(false);
                    setCreateWorkspaceModalOpen(true);
                  }}
                  isRtl={isRtl}
                />
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border border-red-200/60 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{tCommon('logout')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
        {/* Impersonation Banner */}
        {isImpersonated && (
          <div className="bg-zinc-950 text-white px-4 sm:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold tracking-tight select-none shrink-0 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse shrink-0" />
              <span className="truncate">Impersonating <strong className="text-zinc-200">{tenantName}</strong></span>
            </div>
            <button
              onClick={handleStopImpersonation}
              disabled={stopImpersonatingLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-black hover:bg-zinc-100 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
            >
              {stopImpersonatingLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin text-black" />
              ) : (
                'Stop'
              )}
            </button>
          </div>
        )}

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
            <PlatformLogo 
              className="h-4 w-auto object-contain max-h-4"
              fallbackClassName="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0 select-none"
              showText
              textClassName="font-black text-xs tracking-tight uppercase truncate max-w-[120px] text-zinc-950"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
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
              {pathname.includes('/help/faq') ? tHelp('faqTitle') :
               pathname.includes('/help/tickets') ? tHelp('ticketsTitle') :
               pathname.includes('/settings/ai-providers') ? tSettings('aiProviders') :
               pathname.includes('/settings/integrations') ? tSettings('integrations') :
               pathname.includes('/settings/team') ? tSettings('teamAccess') :
               pathname.includes('/settings/billing') ? tBilling('title') :
               pathname.includes('/settings/sessions') ? tSettings('deviceSessions') :
               pathname.includes('/settings/general') ? tSettings('generalTitle') :
               pathname.includes('/settings') ? tNav('settings') : 
               pathname.includes('/contacts') ? tNav('contacts') : 
               pathname.includes('/deals') ? tNav('deals') :
               pathname.includes('/calendar') ? tNav('calendar') :
               pathname.includes('/staff') ? (tNav.has('staff') ? tNav('staff') : 'Staff Directory') :
               pathname.includes('/social-posts') ? (tNav.has('socialPosts') ? tNav('socialPosts') : 'Social Posts') :
               pathname.includes('/campaigns') ? tNav('campaigns') : 
               pathname.includes('/ecommerce/whatsapp-catalog') ? (tNav.has('ecommerceWhatsAppCatalog') ? tNav('ecommerceWhatsAppCatalog') : 'WhatsApp Catalog') :
               pathname.includes('/ecommerce/stores') ? (tNav.has('ecommerceStores') ? tNav('ecommerceStores') : 'Stores') :
               pathname.includes('/ecommerce/products') ? (tNav.has('ecommerceProducts') ? tNav('ecommerceProducts') : 'Products') :
               pathname.includes('/ecommerce/orders') ? (tNav.has('ecommerceOrders') ? tNav('ecommerceOrders') : 'Orders') :
               pathname.includes('/ecommerce') ? (tNav.has('ecommerce') ? tNav('ecommerce') : 'E-Commerce') :
               pathname.includes('/meta-ads') ? (
                 currentMetaTab === 'adsets' ? (tNav.has('metaAdSets') ? tNav('metaAdSets') : 'Meta Ad Sets') :
                 currentMetaTab === 'ads' ? (tNav.has('metaAdsItems') ? tNav('metaAdsItems') : 'Meta Ads & Creatives') :
                 currentMetaTab === 'accounts' ? (tNav.has('metaAccounts') ? tNav('metaAccounts') : 'Meta Ad Accounts') :
                 currentMetaTab === 'analytics' ? (tNav.has('metaAnalytics') ? tNav('metaAnalytics') : 'Meta Ad Analytics') :
                 currentMetaTab === 'leads' ? (tNav.has('metaLeads') ? tNav('metaLeads') : 'Meta Ad Leads') :
                 (tNav.has('metaAdsManager') ? tNav('metaAdsManager') : 'Meta Ads Manager')
               ) :
               pathname.includes('/channels') ? tNav('channels') :
               pathname.includes('/whatsapp-flows') ? (tNav.has('whatsappFlows') ? tNav('whatsappFlows') : 'WhatsApp Flows') :
               pathname.includes('/flows') ? tNav('flows') : 
               pathname.includes('/inbox') ? tNav('inbox') : 
               pathname.includes('/knowledge-base') ? tNav('knowledge') :
               pathname.includes('/templates') ? tNav('templates') :
               pathname.includes('/quick-replies') ? (tNav.has('quickReplies') ? tNav('quickReplies') : 'Quick Replies') :
               pathname.includes('/chatbot') ? (t.has('Chatbot.title') ? t('Chatbot.title') : 'AI ChatBot') :
               pathname.includes('/agents') ? tAgents('title') : tNav('dashboard')}
            </h2>
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                canCreateWorkspace={canCreateWorkspace}
                workspacesLimit={workspacesLimit}
                workspacesCount={workspacesCount}
                variant="header"
                onOpenCreateModal={() => setCreateWorkspaceModalOpen(true)}
                isRtl={isRtl}
              />
              <NotificationBell />
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

        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white h-full w-full select-none">
            <SimpleLoader fullScreen={false} borderless={true} message={tSettings('syncingSession') || 'Syncing workspace session...'} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden bg-white">
            {children}
          </div>
        )}
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
                    {tCommon.has('confirmLogoutTitle') ? tCommon('confirmLogoutTitle') : 'Confirm Sign-Out'}
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
                {tCommon.has('confirmLogoutText') ? tCommon('confirmLogoutText') : 'Are you sure you want to log out of your session? Any unsaved active changes may be lost.'}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="h-9 px-4 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {logoutLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : tCommon('logout')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {redirecting && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
          <div className="w-10 h-10 border-4 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-black tracking-tight animate-pulse">Logging you out securely...</p>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={createWorkspaceModalOpen}
        onClose={() => setCreateWorkspaceModalOpen(false)}
      />

      {/* Floating AI Copilot Platform Assistant */}
      <FloatingCopilot />
    </div>
  );
}
