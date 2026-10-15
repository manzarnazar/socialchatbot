'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { fetchWithCsrf, clearAuthSession } from '@/lib/api';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { 
  Users, 
  LogOut,
  Target,
  LayoutDashboard,
  Radio,
  Bot,
  Database,
  MessageSquare,
  Zap,
  Megaphone,
  Settings,
  Key,
  CreditCard,
  Activity,
  BookOpen,
  FileText,
  Calendar,
  UserCheck,
  ShieldAlert,
  Menu,
  X,
  ChevronsUpDown,
  Check,
  Plus,
  Building2
} from 'lucide-react';
import { useBranding } from '@/components/BrandingThemeProvider';
import { PlatformLogo } from '@/components/common/PlatformLogo';

export interface WorkspaceItem {
  id: number;
  name?: string;
  company_name: string;
  team_size?: string;
  industry_category?: string;
  is_owner?: boolean;
  is_current?: boolean;
  plan?: {
    id?: number;
    name?: string;
    max_workspaces?: number;
  } | null;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
}

interface ShellLayoutProps {
  children: React.ReactNode;
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  const { brandingName, logoUrl } = useBranding();
  const router = useRouter();
  const pathname = usePathname();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false);
  const [workspacesLimit, setWorkspacesLimit] = useState(1);
  const [workspacesCount, setWorkspacesCount] = useState(1);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  // Form states for creating workspace
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newIndustryCategory, setNewIndustryCategory] = useState('E-Commerce');
  const [newTeamSize, setNewTeamSize] = useState('1-10');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(pathname.startsWith('/settings'));
  const [operationalModel, setOperationalModel] = useState<string>('byok');

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith('/settings')) {
      setSettingsExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    async function loadOperationalModel() {
      try {
        const res = await fetchWithCsrf('/settings/ai-providers');
        if (res.ok) {
          const data = await res.json();
          if (data.operational_model) setOperationalModel(data.operational_model);
        }
      } catch {}
    }
    loadOperationalModel();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLogoutModalOpen(false);
        setCreateWorkspaceModalOpen(false);
        setWorkspaceDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };
    if (workspaceDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [workspaceDropdownOpen]);

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const response = await fetchWithCsrf('/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);

          // Onboarding Wizard redirect guard
          if (data.user && data.user.tenant && data.user.tenant.onboarding_step !== 'complete') {
            router.push('/onboarding');
            return;
          }

          const isTrialActive = data.user.tenant.status === 'trial' && !data.user.tenant.is_trial_expired;
          const hasActivePlanOrTrial = Boolean(data.user.tenant.plan_id || isTrialActive || data.user.tenant.status === 'active');

          if (data.user && data.user.tenant && data.user.tenant.onboarding_step === 'complete' && !hasActivePlanOrTrial) {
            router.push('/billing/plans');
            return;
          }

          // Multi-Workspace state synchronization
          if (data.workspaces && data.workspaces.length > 0) {
            setWorkspaces(data.workspaces);
            const current = data.workspaces.find((w: WorkspaceItem) => w.is_current) || data.workspaces[0];
            setActiveWorkspace(current);
            if (current) {
              localStorage.setItem('whatsomni_workspace_id', String(current.id));
            }
          } else if (data.current_workspace) {
            const current = data.current_workspace;
            setWorkspaces([current]);
            setActiveWorkspace(current);
            localStorage.setItem('whatsomni_workspace_id', String(current.id));
          } else if (data.user?.tenant) {
            const fallback: WorkspaceItem = {
              id: data.user.tenant.id,
              company_name: data.user.tenant.company_name,
              name: data.user.tenant.company_name,
              is_owner: true,
              is_current: true,
              plan: data.user.tenant.plan,
            };
            setWorkspaces([fallback]);
            setActiveWorkspace(fallback);
            localStorage.setItem('whatsomni_workspace_id', String(fallback.id));
          }

          setCanCreateWorkspace(!!data.can_create_workspace);
          setWorkspacesLimit(data.workspaces_limit ?? 1);
          setWorkspacesCount(data.workspaces_count ?? 1);
        }
      } catch (err) {
        console.error('Failed to load user workspace data', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceData();
  }, []);

  const handleSwitchWorkspace = async (targetId: number) => {
    if (activeWorkspace && activeWorkspace.id === targetId) {
      setWorkspaceDropdownOpen(false);
      return;
    }
    try {
      setIsSwitchingWorkspace(true);
      const res = await fetchWithCsrf(`/workspaces/${targetId}/switch`, {
        method: 'POST',
      });
      if (res.ok) {
        localStorage.setItem('whatsomni_workspace_id', String(targetId));
        toast.success('Workspace switched successfully');
        setWorkspaceDropdownOpen(false);
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to switch workspace');
      }
    } catch {
      toast.error('Failed to switch workspace');
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    try {
      setIsCreatingWorkspace(true);
      const res = await fetchWithCsrf('/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: newWorkspaceName.trim(),
          industry_category: newIndustryCategory,
          team_size: newTeamSize,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Workspace created successfully!');
        if (data.workspace?.id) {
          localStorage.setItem('whatsomni_workspace_id', String(data.workspace.id));
        }
        setCreateWorkspaceModalOpen(false);
        setNewWorkspaceName('');
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to create workspace');
      }
    } catch {
      toast.error('Network error creating workspace');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchWithCsrf('/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {
      // Ignore
    } finally {
      clearAuthSession('tenant');
      setLogoutModalOpen(false);
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      window.location.href = `${localePrefix}/login`;
    }
  };

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    subitems?: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Analyze',
      items: [
        { name: 'Overview Panel', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Shared Inbox', href: '/inbox', icon: MessageSquare },
      ]
    },
    {
      title: 'AI & Automation',
      items: [
        { name: 'AI Agents', href: '/agents', icon: Bot },
        { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
      ]
    },
    {
      title: 'Communication & Marketing',
      items: [
        { name: 'Channels Connect', href: '/channels', icon: Radio },
        { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
        { name: 'Templates', href: '/templates', icon: FileText },
      ]
    },
    {
      title: 'CRM & Audience',
      items: [
        { name: 'Contacts Directory', href: '/contacts', icon: Users },
        { name: 'Staff Directory', href: '/staff', icon: UserCheck },
        { name: 'CRM Pipeline', href: '/crm', icon: Target },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
      ]
    },
    {
      title: 'Administration',
      items: [
        {
          name: 'Workspace Settings',
          href: '/settings',
          icon: Settings,
          subitems: [
            ...(operationalModel === 'byok' ? [
              { name: 'AI Providers', href: '/settings/ai-providers', icon: Key }
            ] : []),
            { name: 'Integrations', href: '/settings/integrations', icon: Database },
            { name: 'Team Members', href: '/settings/team', icon: Users },
            { name: 'Billing & Usage', href: '/settings/billing', icon: CreditCard },
            { name: 'Active Sessions', href: '/settings/sessions', icon: Activity },
          ]
        }
      ]
    }
  ];

  const getInitials = () => {
    if (!user) return 'WF';
    const f = user.first_name ? user.first_name[0] : '';
    const l = user.last_name ? user.last_name[0] : '';
    return (f + l).toUpperCase() || 'U';
  };

  if (loading) {
    return <SimpleLoader fullScreen={true} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col md:flex-row relative">
      {/* Mobile Header Bar */}
      <header className="h-14 border-b border-[#E8E8E6] px-4 flex md:hidden items-center justify-between bg-white select-none shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="h-8.5 w-8.5 rounded-lg border border-[#E8E8E6] bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 transition-colors shadow-3xs cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <PlatformLogo 
            className="h-4.5 w-auto object-contain max-h-4.5"
            fallbackClassName="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0 select-none"
            showText
            textClassName="text-xs font-black tracking-tight text-zinc-950 uppercase truncate max-w-[130px]"
          />
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mounted && mobileMenuOpen && (
        <div className="fixed inset-0 z-[9990] md:hidden flex select-none">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[285px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 border-r border-[#E8E8E6]">
            <div className="h-14 px-4 border-b border-[#E8E8E6] flex items-center justify-between">
              <PlatformLogo 
                className="h-4.5 w-auto object-contain max-h-4.5"
                fallbackClassName="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0 select-none"
                showText
                textClassName="text-xs font-black tracking-tight text-zinc-950 uppercase"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Workspace Context */}
            <div className="px-3.5 pt-3 pb-1 border-b border-[#E8E8E6]">
              <div className="p-2 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                    {getInitials()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-zinc-900 truncate">
                      {activeWorkspace?.company_name || activeWorkspace?.name || 'Workspace'}
                    </span>
                    <span className="text-[8px] text-[#3DD43D] font-black uppercase tracking-tight">Active Workspace</span>
                  </div>
                </div>
                {canCreateWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCreateWorkspaceModalOpen(true);
                    }}
                    className="p-1.5 rounded-md hover:bg-zinc-200/60 text-zinc-600 cursor-pointer border border-[#E8E8E6] bg-white shadow-3xs"
                    title="Create Workspace"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 p-3.5 space-y-3 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block px-1 mt-2 mb-1 first:mt-0">
                    {group.title}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const hasSubitems = !!item.subitems;
                      const isActive = hasSubitems
                        ? pathname === item.href || pathname.startsWith('/settings/')
                        : pathname === item.href || pathname?.startsWith(item.href + '/');

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all relative ${
                            isActive
                              ? 'bg-zinc-100 text-zinc-950 font-extrabold shadow-3xs'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3.5 border-t border-[#E8E8E6] bg-white space-y-2">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLogoutModalOpen(true);
                }}
                className="w-full h-9 hover:bg-red-50 text-red-600 border border-red-200/60 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Navigation Sidebar Wrapper (Desktop) */}
      <aside className="hidden md:block sticky top-0 h-screen w-68 bg-[#F4F4F2] border-r border-[#E8E8E6] shrink-0">
        {/* Floating Card Design System */}
        <div className="m-4 p-6 bg-white border border-[#E8E8E6] rounded-[16px] h-[calc(100vh-32px)] shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          
          <div className="space-y-4">
            {/* Brand Logo Header block */}
            <div className="flex items-center gap-3 px-1 py-0.5">
              <PlatformLogo 
                className="h-4.5 w-auto object-contain max-h-4.5"
                fallbackClassName="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none"
                showText
                textClassName="text-sm font-black tracking-tight text-zinc-950 uppercase"
              />
            </div>

            {/* User Profile & Workspace Switcher Context at Top */}
            <div className="relative" ref={workspaceDropdownRef}>
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="w-full p-2.5 bg-[#FAFAFA] hover:bg-[#F5F5F3] border border-[#E8E8E6]/80 rounded-[8px] flex items-center justify-between shadow-3xs shrink-0 min-w-0 transition-all cursor-pointer select-none group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7.5 w-7.5 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-3xs select-none">
                    {getInitials()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-zinc-800 truncate leading-tight select-none">
                      {user ? `${user.first_name} ${user.last_name}` : `${brandingName || 'WhatsOmni'} User`}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] shrink-0 shadow-[0_0_4px_var(--accent-green-glow)]" />
                      <span className="text-[8.5px] text-[var(--accent-green)] font-extrabold truncate tracking-tight uppercase">
                        {activeWorkspace?.company_name || activeWorkspace?.name || 'Workspace'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 shrink-0 transition-colors ml-1" />
              </button>

              {/* Workspace Switcher Dropdown Menu */}
              {workspaceDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E8E8E6] rounded-xl shadow-xl z-50 p-2 animate-fade-in select-none">
                  <div className="flex items-center justify-between px-2 py-1 text-[9px] font-black uppercase text-[#6B6B6B] tracking-wider border-b border-[#E8E8E6] pb-1.5 mb-1.5">
                    <span>Workspaces</span>
                    <span className="font-mono font-bold bg-[#F5F5F5] border border-[#E8E8E6] px-1.5 py-0.2 rounded text-zinc-600 text-[8.5px]">
                      {workspacesCount}/{workspacesLimit} Used
                    </span>
                  </div>

                  {/* Workspaces List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                    {workspaces.map((w) => {
                      const isCurrent = activeWorkspace && activeWorkspace.id === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleSwitchWorkspace(w.id)}
                          disabled={isSwitchingWorkspace}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                            isCurrent
                              ? 'bg-zinc-100/80 text-zinc-950 font-bold'
                              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded bg-[#FAFAFA] border border-[#E8E8E6] text-[9px] font-black flex items-center justify-center shrink-0 text-zinc-700">
                              {w.company_name ? w.company_name.substring(0, 2).toUpperCase() : 'WS'}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold truncate">
                                {w.company_name || w.name}
                              </span>
                              {w.is_owner && (
                                <span className="text-[8px] text-zinc-400 uppercase font-semibold">
                                  Owner
                                </span>
                              )}
                            </div>
                          </div>
                          {isCurrent && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#E8E8E6] my-1.5" />

                  {/* Dropdown Action: Create or Upgrade */}
                  {canCreateWorkspace ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceDropdownOpen(false);
                        setCreateWorkspaceModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold text-zinc-800 hover:text-black hover:bg-zinc-50 border border-dashed border-[#E8E8E6] hover:border-zinc-400 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <span>Create Workspace</span>
                    </button>
                  ) : (
                    <div className="px-2 py-1.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500 font-medium">Plan limit reached</span>
                      <Link
                        href="/billing/plans"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="text-black font-bold hover:underline"
                      >
                        Upgrade
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Menu Links list */}
            <div className="space-y-3 flex-1 min-h-0 flex flex-col">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block px-1 shrink-0">
                Workspace Menu
              </span>
              
              <nav className="space-y-3 overflow-y-auto flex-1 pr-1 select-none scrollbar-none min-h-0">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block px-1 mt-3.5 mb-1 first:mt-0">
                      {group.title}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const hasSubitems = !!item.subitems;
                        const isActive = hasSubitems
                          ? pathname === item.href || pathname.startsWith('/settings/')
                          : pathname === item.href || pathname?.startsWith(item.href + '/');

                        if (hasSubitems) {
                          return (
                            <div key={item.name} className="space-y-0.5">
                              <button
                                onClick={() => setSettingsExpanded(!settingsExpanded)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[11px] font-extrabold transition-all cursor-pointer select-none border ${
                                  isActive
                                    ? 'bg-zinc-50 border-[#E8E8E6] text-zinc-950 font-extrabold shadow-3xs'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/70'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-zinc-950 font-bold' : 'text-zinc-400'}`} />
                                  <span>{item.name}</span>
                                </div>
                                <svg 
                                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${settingsExpanded ? 'rotate-180 text-zinc-550' : ''}`}
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {settingsExpanded && item.subitems && (
                                <div className="pl-4 ml-4.5 space-y-1 mt-1 border-l border-zinc-200 relative">
                                  {item.subitems.map((sub) => {
                                    const SubIcon = sub.icon;
                                    const isSubActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={sub.name}
                                        href={sub.href}
                                        className={`group flex items-center justify-between py-1.5 text-[10px] font-bold transition-all relative ${
                                          isSubActive
                                            ? 'text-zinc-950 font-extrabold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          {/* Custom tree dot */}
                                          <span className={`absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white transition-all duration-200 ${
                                            isSubActive ? 'bg-primary scale-110 shadow-[0_0_6px_var(--primary,#4AE54A)]' : 'bg-zinc-300 group-hover:bg-zinc-400'
                                          }`} />
                                          <SubIcon className={`h-3.5 w-3.5 shrink-0 ${isSubActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
                                          <span>{sub.name}</span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-[8px] text-[11px] font-extrabold transition-all relative border ${
                              isActive
                                ? 'bg-zinc-50 border-[#E8E8E6] text-zinc-950 font-extrabold shadow-3xs pl-4'
                                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/70'
                            }`}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-[2px] bg-primary shadow-[0_0_6px_var(--primary,#4AE54A)]" />
                            )}
                            <Icon className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'scale-105 text-zinc-950' : 'text-zinc-400'}`} />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Account Actions at bottom */}
          <div className="space-y-4 pt-4 border-t border-[#E8E8E6] shrink-0">
            {/* Logout button */}
            <button 
              onClick={() => setLogoutModalOpen(true)}
              className="w-full h-9 hover:bg-red-50/50 hover:border-red-100 border border-[#E8E8E6] rounded-[8px] text-[11px] font-extrabold flex items-center justify-center gap-2 text-red-600 hover:text-red-700 transition-all cursor-pointer shadow-2xs select-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout Account</span>
            </button>

            {/* App Footer Tag */}
            <div className="text-[8px] text-zinc-400 font-black flex items-center justify-between px-1 tracking-wider uppercase pt-1">
              <span>{brandingName || 'WhatsOmni'} v1.0.0</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] shadow-[0_0_4px_var(--accent-green-glow)]" />
            </div>
          </div>

        </div>
      </aside>

      {/* CONFIRM LOGOUT MODAL */}
      {mounted && logoutModalOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="absolute inset-0" onClick={() => setLogoutModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">Confirm Logout</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setLogoutModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                Are you sure you want to log out of your {brandingName || 'platform'} account? Any unsaved changes in active sessions will be lost.
              </p>
            </div>

            {/* Footer Action Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 px-4 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE NEW WORKSPACE MODAL (Section 24.3 Design Guidelines) */}
      {mounted && createWorkspaceModalOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setCreateWorkspaceModalOpen(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setCreateWorkspaceModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors text-xs font-semibold cursor-pointer"
            >
              ✕
            </button>

            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">Create Workspace</h3>
                </div>
              </div>
            </div>

            {/* Body Content */}
            <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-4">
              <div>
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                  Workspace / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Retail or Global Branch"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    Industry
                  </label>
                  <select
                    value={newIndustryCategory}
                    onChange={(e) => setNewIndustryCategory(e.target.value)}
                    className="w-full h-9 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors cursor-pointer"
                  >
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Finance & Banking">Finance & Banking</option>
                    <option value="Education">Education</option>
                    <option value="Marketing Agency">Marketing Agency</option>
                    <option value="Hospitality & Travel">Hospitality & Travel</option>
                    <option value="Technology & SaaS">Technology & SaaS</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block mb-1">
                    Team Size
                  </label>
                  <select
                    value={newTeamSize}
                    onChange={(e) => setNewTeamSize(e.target.value)}
                    className="w-full h-9 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors cursor-pointer"
                  >
                    <option value="1-5">1-5 members</option>
                    <option value="6-20">6-20 members</option>
                    <option value="21-50">21-50 members</option>
                    <option value="50+">50+ members</option>
                  </select>
                </div>
              </div>

              {/* Plan Quota Indicator */}
              <div className="bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg p-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Plan Allowance</span>
                  <span className="text-xs text-zinc-900 font-semibold mt-0.5">
                    {activeWorkspace?.plan?.name || 'Active Plan'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {workspacesCount} of {workspacesLimit}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">workspaces used</span>
                </div>
              </div>

              {/* Footer Action Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none">
                <button
                  type="button"
                  onClick={() => setCreateWorkspaceModalOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                  className="bg-black text-white hover:bg-neutral-800 h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingWorkspace ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Dynamic Page Content Wrapper */}
      <div className="flex-1 relative overflow-x-hidden min-h-screen bg-[#F4F4F2]">
        {children}
      </div>

    </div>
  );
}
