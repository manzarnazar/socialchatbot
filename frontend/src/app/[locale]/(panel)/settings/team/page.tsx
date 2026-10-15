'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  RefreshCw, 
  X,
  Users,
  Globe,
  Lock,
  Radio,
  Check,
  Plus,
  LayoutDashboard,
  MessageSquare,
  Bot,
  Zap,
  BookOpen,
  Sparkles,
  Share2,
  Megaphone,
  FileText,
  UserCheck,
  Target,
  Calendar,
  Database,
  CreditCard,
  Settings as SettingsIcon,
  HelpCircle,
  Search,
  CheckCheck,
  Send
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export interface PlatformModuleDef {
  key: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PlatformCategoryDef {
  id: string;
  name: string;
  modules: PlatformModuleDef[];
}

const PLATFORM_CATEGORIES: PlatformCategoryDef[] = [
  {
    id: 'analyze',
    name: 'Analyze & Core',
    modules: [
      { key: 'dashboard', name: 'Overview Dashboard', desc: 'KPI telemetry, real-time analytics & workspace overview', icon: LayoutDashboard },
      { key: 'inbox', name: 'Shared Inbox', desc: 'Omnichannel customer conversations & realtime messaging', icon: MessageSquare },
    ],
  },
  {
    id: 'ai_automation',
    name: 'AI & Automation',
    modules: [
      { key: 'chatbot', name: 'AI ChatBot', desc: 'Automated conversational AI bots & qualification flows', icon: Bot },
      { key: 'flows', name: 'Automation Flows', desc: 'Visual workflow canvas, branching logic & event triggers', icon: Zap },
      { key: 'knowledge_base', name: 'Knowledge Base', desc: 'Document ingestion, AI training data & semantic vector search', icon: BookOpen },
      { key: 'agents', name: 'AI Agents', desc: 'Autonomous execution agents & task dispatchers', icon: Sparkles },
    ],
  },
  {
    id: 'communication',
    name: 'Communication & Marketing',
    modules: [
      { key: 'channels', name: 'Channels Connect', desc: 'WhatsApp, Telegram, IG, TikTok, FB Messenger, SMS, Email, LinkedIn', icon: Radio },
      { key: 'social_posts', name: 'Social Posts', desc: 'Cross-platform content composer, media publisher & scheduler', icon: Share2 },
      { key: 'campaigns', name: 'Campaigns', desc: 'Outbound bulk broadcasts, drip campaigns & audience blasts', icon: Megaphone },
      { key: 'templates', name: 'Message Templates', desc: 'Pre-approved message blueprints & interactive WhatsApp templates', icon: FileText },
    ],
  },
  {
    id: 'crm_audience',
    name: 'CRM & Audience',
    modules: [
      { key: 'contacts', name: 'Contacts Directory', desc: 'Customer CRM records, custom attributes & audience segments', icon: Users },
      { key: 'staff', name: 'Staff Directory', desc: 'Staff members, departments & shift scheduling', icon: UserCheck },
      { key: 'deals', name: 'CRM Pipeline & Deals', desc: 'Sales pipeline stages, deal values & status tracking', icon: Target },
      { key: 'calendar', name: 'Calendar & Bookings', desc: 'Appointment schedules, staff availability & public booking links', icon: Calendar },
    ],
  },
  {
    id: 'settings_workspace',
    name: 'Settings & Workspace',
    modules: [
      { key: 'integrations', name: 'Integrations', desc: 'E-commerce stores (Shopify, WooCommerce), webhooks & external APIs', icon: Database },
      { key: 'team', name: 'Team & Role Access', desc: 'Teammates directory, seat allocations & channel assignments', icon: UserPlus },
      { key: 'billing', name: 'Billing & Plans', desc: 'Subscription tier, payment methods & invoice history', icon: CreditCard },
      { key: 'settings', name: 'Workspace Settings', desc: 'General profile, branding theme & active device sessions', icon: SettingsIcon },
      { key: 'help', name: 'Help & Tickets', desc: 'Knowledge documentation, helpdesk & support tickets', icon: HelpCircle },
    ],
  },
];

const ALL_MODULES_LIST: PlatformModuleDef[] = PLATFORM_CATEGORIES.flatMap(c => c.modules);
const ALL_MODULE_KEYS = ALL_MODULES_LIST.map(m => m.key);

const MODULE_NAME_MAP: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {};
ALL_MODULES_LIST.forEach(m => {
  MODULE_NAME_MAP[m.key] = { name: m.name, icon: m.icon };
});

const getInitialRolePerms = (): Record<string, string[]> => {
  const initial: Record<string, string[]> = {};
  ALL_MODULE_KEYS.forEach(key => {
    initial[key] = key === 'dashboard' ? ['read'] : [];
  });
  return initial;
};

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function CustomSelect({ options, value, onChange, placeholder = 'Select...' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className="relative inline-block w-full text-left font-sans text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs h-9 px-3 bg-[#FAFAFA]/50 border border-[#E8E8E6] rounded-[6px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-full rounded-md bg-white border border-[#E8E8E6] shadow-lg z-40 max-h-60 overflow-y-auto">
            <div className="p-1 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-xs font-medium ${
                    opt.value.toString() === value.toString()
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ChannelConnectionBrief {
  id: number;
  tenant_id: number;
  name: string;
  channel_type: string;
  status: string;
}

interface UserPermission {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  channel_access_type?: 'all' | 'custom';
  channel_connections?: ChannelConnectionBrief[];
  role: {
    id: number;
    name: string;
    display_name: string;
    permissions: Record<string, string[]>;
  };
}

interface Invitation {
  id: number;
  email: string;
  role: {
    display_name: string;
  };
  channel_access_type?: string;
  assigned_channel_ids?: number[];
  token: string;
}

interface CustomRole {
  id: number;
  name: string;
  display_name: string;
  permissions: Record<string, string[]>;
  tenant_id?: number | null;
}

export default function TeamSettingsPage() {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');

  const [members, setMembers] = useState<UserPermission[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [allTenantChannels, setAllTenantChannels] = useState<ChannelConnectionBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState('Trial');
  const [seatLimit, setSeatLimit] = useState(3);
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

  // Channel Access Modal State
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [selectedMemberForChannels, setSelectedMemberForChannels] = useState<UserPermission | null>(null);
  const [memberChannelAccessType, setMemberChannelAccessType] = useState<'all' | 'custom'>('all');
  const [memberSelectedChannelIds, setMemberSelectedChannelIds] = useState<number[]>([]);
  const [submittingChannels, setSubmittingChannels] = useState(false);

  // Invite Form State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteChannelAccessType, setInviteChannelAccessType] = useState<'all' | 'custom'>('all');
  const [inviteSelectedChannelIds, setInviteSelectedChannelIds] = useState<number[]>([]);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Custom Role Form State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [roleModuleSearch, setRoleModuleSearch] = useState('');
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(getInitialRolePerms);
  const [submittingRole, setSubmittingRole] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Member editing dropdown states
  const [activeEditingMemberId, setActiveEditingMemberId] = useState<number | null>(null);

  const renderChannelIcon = (type: string, className = "h-4 w-4") => {
    const clean = (type || '').toLowerCase();
    if (clean === 'whatsapp') return <img src="/channels/whatsapp.webp" className={`${className} object-contain`} alt="WhatsApp" />;
    if (clean === 'telegram') return <img src="/channels/telegram.webp" className={`${className} object-contain`} alt="Telegram" />;
    if (clean === 'instagram') return <img src="/channels/instagram.svg" className={`${className} object-contain`} alt="Instagram" />;
    if (clean === 'tiktok') return <img src="/channels/tiktok.webp" className={`${className} object-contain`} alt="TikTok" />;
    if (clean === 'messenger' || clean === 'facebook') return <img src="/channels/messenger.webp" className={`${className} object-contain`} alt="Messenger" />;
    if (clean === 'sms' || clean === 'twilio') return <img src="/channels/twilio.svg" className={`${className} object-contain`} alt="SMS" />;
    if (clean === 'email') return <img src="/channels/email.svg" className={`${className} object-contain`} alt="Email" />;
    if (clean === 'linkedin') return <img src="/channels/linkedin.svg" className={`${className} object-contain`} alt="LinkedIn" />;
    return (
      <Radio className={`${className} text-zinc-400`} />
    );
  };

  const loadAllData = async () => {
    try {
      const [membersRes, invitesRes, rolesRes, meRes, channelsRes] = await Promise.all([
        fetchWithCsrf('/members'),
        fetchWithCsrf('/invitations'),
        fetchWithCsrf('/roles'),
        fetchWithCsrf('/auth/me'),
        fetchWithCsrf('/channels?all_for_management=1'),
      ]);

      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members || []);
      }
      if (invitesRes.ok) {
        const d = await invitesRes.json();
        setInvitations(d.invitations || []);
      }
      if (rolesRes.ok) {
        const d = await rolesRes.json();
        setRoles(d.roles || []);
      }
      if (channelsRes.ok) {
        const d = await channelsRes.json();
        const list = Array.isArray(d) ? d : (d.channels || []);
        const filtered = list.filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const type = (c.channel_type || '').toLowerCase();
          return !name.includes('mock') && !name.includes('simulated') && type !== 'mock';
        });
        setAllTenantChannels(filtered);
      }
      if (meRes.ok) {
        const d = await meRes.json();
        const tenant = d.user?.tenant;
        if (tenant) {
          setPlanName(tenant.plan?.name || 'Trial');
          // Match trial or plan limit seats
          setSeatLimit(tenant.plan?.max_team_members || 3);
        }
      }
    } catch {
      toast.error(t('toasts.reloadContextFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAllData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInviteModalOpen(false);
        setRoleModalOpen(false);
        setChannelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setInviteModalOpen(false);
      setRoleModalOpen(false);
      setChannelModalOpen(false);
    }
  };

  const totalSeatsUsed = members.length + invitations.length;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) {
      toast.error(t('toasts.completeRequiredFields'));
      return;
    }

    setSubmittingInvite(true);
    try {
      const res = await fetchWithCsrf('/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role_id: parseInt(inviteRoleId, 10),
          channel_access_type: inviteChannelAccessType,
          assigned_channel_ids: inviteChannelAccessType === 'custom' ? inviteSelectedChannelIds : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.inviteSent'), {
          description: `An invite link was dispatched to ${inviteEmail}.`,
        });
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteRoleId('');
        setInviteChannelAccessType('all');
        setInviteSelectedChannelIds([]);
        loadAllData();
      } else {
        throw new Error(data.message || 'Invitation failed.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invite.';
      toast.error(msg);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleOpenChannelModal = (member: UserPermission) => {
    setSelectedMemberForChannels(member);
    setMemberChannelAccessType(member.channel_access_type || 'all');
    const ids = (member.channel_connections || []).map(c => c.id);
    setMemberSelectedChannelIds(ids);
    setChannelModalOpen(true);
  };

  const handleSaveChannelAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForChannels) return;

    setSubmittingChannels(true);
    try {
      const res = await fetchWithCsrf(`/members/${selectedMemberForChannels.id}/channels`, {
        method: 'POST',
        body: JSON.stringify({
          channel_access_type: memberChannelAccessType,
          channel_ids: memberChannelAccessType === 'custom' ? memberSelectedChannelIds : [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('channelAccessUpdated'));
        setChannelModalOpen(false);
        setSelectedMemberForChannels(null);
        loadAllData();
      } else {
        throw new Error(data.message || 'Failed to update channel access.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update channel access.';
      toast.error(msg);
    } finally {
      setSubmittingChannels(false);
    }
  };

  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);

  const handleResendInvite = async (id: number) => {
    setResendingInviteId(id);
    try {
      const res = await fetchWithCsrf(`/invitations/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || t('toasts.inviteSent'));
      } else {
        toast.error(data.message || 'Failed to resend invitation email.');
      }
    } catch {
      toast.error('Failed to resend invitation.');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCancelInvite = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/invitations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toasts.inviteCancelled'));
        loadAllData();
      } else {
        toast.error(t('toasts.cancelInviteFailed'));
      }
    } catch {
      toast.error(t('toasts.cancelInviteReqFailed'));
    }
  };

  const handleRemoveMember = async (id: number) => {
    if (!confirm('Are you sure you want to remove this member? they will lose access instantly.')) return;
    try {
      const res = await fetchWithCsrf(`/members/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.memberRemoved'));
        loadAllData();
      } else {
        toast.error(data.message || 'Failed to remove member.');
      }
    } catch {
      toast.error(t('toasts.requestFailed'));
    }
  };

  const handleUpdateMemberRole = async (memberId: number, roleId: number) => {
    try {
      const res = await fetchWithCsrf(`/members/${memberId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role_id: roleId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.memberRoleUpdated'));
        setActiveEditingMemberId(null);
        loadAllData();
      } else {
        toast.error(data.message || t('toasts.changeRoleFailed'));
      }
    } catch {
      toast.error(t('toasts.changeRoleFailed'));
    }
  };


  const handleGrantAll = () => {
    const updated: Record<string, string[]> = {};
    ALL_MODULE_KEYS.forEach(key => {
      updated[key] = ['read', 'write'];
    });
    setRolePerms(updated);
  };

  const handleReadOnlyAll = () => {
    const updated: Record<string, string[]> = {};
    ALL_MODULE_KEYS.forEach(key => {
      updated[key] = ['read'];
    });
    setRolePerms(updated);
  };

  const handleClearAll = () => {
    const updated: Record<string, string[]> = {};
    ALL_MODULE_KEYS.forEach(key => {
      updated[key] = [];
    });
    setRolePerms(updated);
  };

  const handleToggleCategory = (category: PlatformCategoryDef, action: 'read' | 'write') => {
    setRolePerms(prev => {
      const next = { ...prev };
      const allHaveAction = category.modules.every(m => (next[m.key] || []).includes(action));
      category.modules.forEach(m => {
        const current = next[m.key] || [];
        if (allHaveAction) {
          next[m.key] = current.filter(a => a !== action);
        } else {
          if (!current.includes(action)) {
            next[m.key] = [...current, action];
          }
        }
      });
      return next;
    });
  };

  const togglePermission = (module: string, action: string) => {
    setRolePerms(prev => {
      const current = prev[module] || [];
      const updated = current.includes(action) 
        ? current.filter(a => a !== action) 
        : [...current, action];
      return { ...prev, [module]: updated };
    });
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleDisplayName) {
      toast.error(t('toasts.roleNameRequired'));
      return;
    }

    setSubmittingRole(true);
    try {
      const res = await fetchWithCsrf('/roles', {
        method: 'POST',
        body: JSON.stringify({
          display_name: roleDisplayName,
          permissions: rolePerms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('toasts.roleCreated'));
        setRoleModalOpen(false);
        setRoleDisplayName('');
        setRoleModuleSearch('');
        setRolePerms(getInitialRolePerms());
        loadAllData();
      } else {
        throw new Error(data.message || 'Failed to create role.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Create role failed.';
      toast.error(msg);
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom role? Associated members will be downgraded to Agents.')) return;
    try {
      const res = await fetchWithCsrf(`/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('toasts.roleDeleted'));
        loadAllData();
      } else {
        toast.error(t('toasts.deleteRoleFailed'));
      }
    } catch {
      toast.error(t('toasts.deleteRoleReqFailed'));
    }
  };

  if (loading) {
    return <SimpleLoader message={t('syncingTeam')} />;
  }

  return (
    <div className="w-full p-8 space-y-8 select-none font-sans text-black flex-1 overflow-y-auto">
      
      {/* Upper Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch animate-fade-in">
        
        {/* Workspace Seat Allocation Card */}
        <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between transition-all hover:shadow-[var(--shadow-card-hover)] relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-550 uppercase tracking-wider">
                <UserPlus className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                <span>{t('teammateSeats')}</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded-md uppercase">
                {t('seatsPlanName', { plan: planName })}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none tracking-tighter text-zinc-955">
                {t('seatsUsedOfLimit', { used: totalSeatsUsed, limit: seatLimit })}
              </span>
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider ml-1">{t('seatsFilled')}</span>
            </div>
            
            {/* Visual slots progress track */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>{t('seatUtilization')}</span>
                <span>{t('seatUsedPercentage', { percentage: Math.round((totalSeatsUsed / seatLimit) * 100) })}</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: seatLimit }).map((_, idx) => {
                  const isFilled = idx < totalSeatsUsed;
                  return (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-sm transition-all duration-350 ${
                        isFilled ? 'bg-[#4AE54A] shadow-[0_0_8px_rgba(74,229,74,0.6)]' : 'bg-zinc-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-5 border-t border-[#F0F0F0] pt-4 text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse" />
            <span>{t('seatLimitNotice')}</span>
          </div>
        </div>

        {/* Access Security Configuration Card */}
        <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between transition-all hover:shadow-[var(--shadow-card-hover)] relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-550 uppercase tracking-wider">
                <Shield className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                <span>{t('accessSecurityMatrix')}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-605 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md uppercase">
                {t('rbacEnabled')}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none tracking-tighter text-zinc-955">
                {roles.length}
              </span>
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider ml-1">{t('definedClasses')}</span>
            </div>

            {/* Visual list of defined roles tags */}
            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {t('activeSecurityGroups')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roles.slice(0, 4).map(r => (
                  <span
                    key={r.id}
                    className="text-[9px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-600 uppercase"
                  >
                    {r.display_name}
                  </span>
                ))}
                {roles.length > 4 && (
                  <span className="text-[10px] font-bold text-zinc-400 self-center">
                    {t('moreRoles', { count: roles.length - 4 })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#F0F0F0] pt-4 text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span>{t('roleSecurityGroupsNotice')}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation & Action Toolbar */}
      <div className="border border-[#E8E8E6] bg-white rounded-[10px] shadow-[var(--shadow-card)] overflow-hidden font-sans">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#E8E8E6] bg-[#FAFAFA] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'members' 
                  ? 'bg-white text-zinc-950 shadow-3xs' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('membersDirectoryTitle', { count: members.length })}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'roles' 
                  ? 'bg-white text-zinc-950 shadow-3xs' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('securityRolesTitle', { count: roles.length })}</span>
            </button>
          </div>

          <div>
            {activeTab === 'members' ? (
              <button
                disabled={totalSeatsUsed >= seatLimit}
                onClick={() => setInviteModalOpen(true)}
                className={`px-4 h-9 rounded-[6px] text-xs font-bold transition-all select-none shadow-sm cursor-pointer flex items-center gap-2 ${
                  totalSeatsUsed >= seatLimit
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-[#0A0A0A] hover:bg-zinc-900 text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>{t('inviteMember')}</span>
              </button>
            ) : (
              <button
                onClick={() => setRoleModalOpen(true)}
                className="bg-[#0A0A0A] hover:bg-zinc-900 text-white px-4 h-9 rounded-[6px] text-xs font-bold transition-all select-none shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                <span>{t('addCustomRole')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Panel Body Content */}
        <div className="p-6">
          
          {/* TAB 1: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              
              {/* Active Workspace Directory */}
              <div className="space-y-3">
                <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                        <th className="p-4 pl-6">{t('teammate')}</th>
                        <th className="p-4">{t('email')}</th>
                        <th className="p-4">{t('permissionRole')}</th>
                        <th className="p-4">{t('channelAccess')}</th>
                        <th className="p-4 pr-6 text-right">{tCommon('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-neutral-50/50">
                          {/* Teammate Identity */}
                          <td className="p-4 pl-6 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-800 select-none shrink-0">
                              {((member.first_name?.[0] || '') + (member.last_name?.[0] || '')).toUpperCase() || 'M'}
                            </div>
                            <div>
                              <div className="text-xs font-extrabold text-zinc-950">{member.first_name} {member.last_name}</div>
                              <div className="text-[10px] text-zinc-400 font-medium">{t('activeSeat')}</div>
                            </div>
                          </td>
                          <td className="p-4 text-zinc-550 font-medium">{member.email}</td>
                          <td className="p-4">
                            {activeEditingMemberId === member.id ? (
                              <div className="absolute z-20 bg-white border border-[#E8E8E6] rounded-lg shadow-md p-1.5 flex items-center gap-1.5 w-48 mt-[-18px]">
                                <CustomSelect 
                                  options={roles.map(r => ({ value: r.id.toString(), label: r.display_name }))}
                                  value={member.role?.id?.toString() || ''}
                                  onChange={(val) => handleUpdateMemberRole(member.id, parseInt(val, 10))}
                                />
                                <button 
                                  onClick={() => setActiveEditingMemberId(null)}
                                  className="p-1.5 hover:bg-neutral-100 rounded text-zinc-400 cursor-pointer shrink-0 border border-transparent"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={member.role?.name === 'owner'}
                                onClick={() => setActiveEditingMemberId(member.id)}
                                className={`px-2.5 py-0.5 border rounded text-[10px] font-bold tracking-tight select-none transition-all flex items-center gap-1 ${
                                  member.role?.name === 'owner' 
                                    ? 'bg-emerald-50/50 border-emerald-250 text-emerald-700 font-extrabold' 
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-955 cursor-pointer'
                                }`}
                              >
                                <span>{member.role?.display_name || t('noRole')}</span>
                                {member.role?.name !== 'owner' && (
                                  <svg className="h-3 w-3 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </td>
                          {/* Channel Access */}
                          <td className="p-4">
                            {member.role?.name === 'owner' || member.role?.name === 'admin' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-bold bg-zinc-100/70 border border-zinc-200 text-zinc-700 select-none">
                                <Globe className="h-3 w-3 text-zinc-500" />
                                <span>{t('allChannels')}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenChannelModal(member)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-bold border transition-all cursor-pointer select-none bg-white border-[#E8E8E6] text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50/80 shadow-3xs"
                                title={t('manageChannelAccess')}
                              >
                                {member.channel_access_type === 'custom' ? (
                                  (member.channel_connections && member.channel_connections.length > 0) ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                                        {member.channel_connections.slice(0, 3).map(ch => (
                                          <span key={ch.id} className="inline-block ring-1 ring-white rounded-full bg-white p-0.5" title={ch.name}>
                                            {renderChannelIcon(ch.channel_type, "h-3.5 w-3.5")}
                                          </span>
                                        ))}
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-700">
                                        {member.channel_connections.length === 1 
                                          ? member.channel_connections[0].name 
                                          : t('channelsAssignedCount', { count: member.channel_connections.length })}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-amber-700">
                                      <Lock className="h-3 w-3 text-amber-600" />
                                      <span className="text-[10px] font-bold">{t('noChannelsAssigned')}</span>
                                    </div>
                                  )
                                ) : (
                                  <div className="flex items-center gap-1.5 text-zinc-700">
                                    <Globe className="h-3 w-3 text-zinc-500" />
                                    <span>{t('allChannels')}</span>
                                  </div>
                                )}
                                <Radio className="h-3 w-3 text-zinc-400 ml-0.5 group-hover:text-zinc-700 transition-colors" />
                              </button>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              disabled={member.role?.name === 'owner'}
                              onClick={() => handleRemoveMember(member.id)}
                              className={`p-1.5 rounded-[6px] transition-colors inline-flex items-center justify-center ${
                                member.role?.name === 'owner'
                                  ? 'text-zinc-200 cursor-not-allowed'
                                  : 'text-zinc-400 hover:text-red-655 hover:bg-red-50 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Invites List */}
              {invitations.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-[#F0F0F0] font-sans">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block pl-1">{t('pendingInvitations')}</span>
                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                          <th className="p-4 pl-6">{t('email')}</th>
                          <th className="p-4">{t('assignedRole')}</th>
                          <th className="p-4">{t('channelAccess')}</th>
                          <th className="p-4">{t('status')}</th>
                          <th className="p-4 pr-6 text-right">{tCommon('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                        {invitations.map(invite => (
                          <tr key={invite.id} className="hover:bg-neutral-50/50">
                            <td className="p-4 pl-6 text-zinc-950 font-extrabold flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 shrink-0">
                                @
                              </div>
                              <span>{invite.email}</span>
                            </td>
                            <td className="p-4">
                              <span className="bg-zinc-50 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {invite.role.display_name}
                              </span>
                            </td>
                            <td className="p-4">
                              {invite.channel_access_type === 'custom' && invite.assigned_channel_ids && invite.assigned_channel_ids.length > 0 ? (
                                <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                  <Radio className="h-2.5 w-2.5 text-zinc-400" />
                                  <span>{t('channelsAssignedCount', { count: invite.assigned_channel_ids.length })}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                  <Globe className="h-2.5 w-2.5 text-zinc-400" />
                                  <span>{t('allChannels')}</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="bg-amber-50 border border-amber-250 text-amber-700 px-2.5 py-0.5 rounded text-[10px] font-bold select-none">
                                {t('pendingVerification')}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleResendInvite(invite.id)}
                                  disabled={resendingInviteId === invite.id}
                                  className="px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 text-[10px] font-bold uppercase tracking-wider rounded-[6px] border border-zinc-200 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Send className="h-3 w-3 text-zinc-500" />
                                  {resendingInviteId === invite.id ? 'Sending...' : 'Resend'}
                                </button>
                                <button
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="px-3 py-1 border border-red-100 hover:bg-red-50/50 text-red-650 hover:text-red-700 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer"
                                >
                                  {t('cancelInvitation')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* TAB 2: ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(role => {
                  const isSystemRole = !role.tenant_id;
                  return (
                    <div key={role.id} className="border border-[#E8E8E6] rounded-xl p-6 bg-white flex flex-col justify-between shadow-[var(--shadow-card)] space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h5 className="font-black text-sm text-zinc-950 uppercase tracking-wider">{role.display_name}</h5>
                           <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            isSystemRole 
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-500' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold'
                          }`}>
                            {isSystemRole ? t('systemBaseRole') : t('customWorkspaceRole')}
                          </span>
                        </div>
                        {!isSystemRole && (
                          <button 
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-2 text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="border-t border-[#F0F0F0] pt-4 space-y-3 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('accessScopeControl')}</span>
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
                            {t('modulesConfigured', {
                              count: Object.entries(role.permissions || {}).filter(([_, p]) => p && p.length > 0).length,
                              total: ALL_MODULE_KEYS.length
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium text-zinc-700 max-h-60 overflow-y-auto pr-1">
                          {Object.entries(role.permissions || {}).map(([module, perms]) => {
                            const hasRead = perms.includes('read') || perms.includes('view');
                            const hasWrite = perms.includes('write');
                            const modInfo = MODULE_NAME_MAP[module];
                            const ModIcon = modInfo?.icon || Shield;
                            const modName = modInfo?.name || module;
                            
                            return (
                              <div key={module} className="bg-[#FAFAFA]/70 border border-[#E8E8E6] rounded-lg p-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ModIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                  <span className="font-bold text-zinc-900 truncate text-[11px]">{modName}</span>
                                </div>
                                <div className="flex items-center gap-1 font-bold shrink-0">
                                  {perms.length === 0 ? (
                                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-150 px-1.5 py-0.5 rounded">{t('noAccess')}</span>
                                  ) : (
                                    <>
                                      {hasRead && (
                                        <span className="text-[9px] font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">{t('read')}</span>
                                      )}
                                      {hasWrite && (
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded">{t('write')}</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. INVITE MEMBER MODAL */}
      {mounted && inviteModalOpen && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('inviteWorkspaceTeammate')}</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSendInvite} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('teammateEmail')}</label>
                <input 
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5 font-semibold text-zinc-700 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('assignedAccessRole')}</label>
                <CustomSelect 
                  options={roles.map(r => ({ value: r.id.toString(), label: r.display_name }))}
                  value={inviteRoleId}
                  onChange={(val) => {
                    setInviteRoleId(val);
                    const selectedRole = roles.find(r => r.id.toString() === val);
                    if (selectedRole?.name === 'admin' || selectedRole?.name === 'owner') {
                      setInviteChannelAccessType('all');
                    }
                  }}
                  placeholder={t('selectRolePlaceholder')}
                />
              </div>

              {/* Channel Access Selector for New Teammate */}
              <div className="space-y-2 pt-1 font-semibold text-zinc-700 text-left">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('channelAccess')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteChannelAccessType('all')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer select-none ${
                      inviteChannelAccessType === 'all'
                        ? 'border-black bg-zinc-50 font-bold text-black shadow-3xs'
                        : 'border-[#E8E8E6] bg-white text-zinc-600 hover:bg-zinc-50/60'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                    <span className="text-xs">{t('allChannels')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannelAccessType('custom')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer select-none ${
                      inviteChannelAccessType === 'custom'
                        ? 'border-black bg-zinc-50 font-bold text-black shadow-3xs'
                        : 'border-[#E8E8E6] bg-white text-zinc-600 hover:bg-zinc-50/60'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                    <span className="text-xs">{t('specificChannels')}</span>
                  </button>
                </div>

                {inviteChannelAccessType === 'custom' && (
                  <div className="space-y-1.5 pt-1 animate-fade-in">
                    <span className="text-[10px] text-zinc-400 font-medium block">
                      {t('selectChannelsToAssign')}
                    </span>
                    {allTenantChannels.length === 0 ? (
                      <div className="p-3 border border-dashed border-zinc-200 rounded-md text-center text-[11px] text-zinc-400">
                        {t('noChannelsAssigned')}
                      </div>
                    ) : (
                      <div className="border border-[#E8E8E6] rounded-md divide-y divide-[#E8E8E6] max-h-36 overflow-y-auto bg-white">
                        {allTenantChannels.map(ch => {
                          const isChecked = inviteSelectedChannelIds.includes(ch.id);
                          return (
                            <label
                              key={ch.id}
                              className={`flex items-center justify-between p-2 px-2.5 hover:bg-zinc-50 cursor-pointer transition-colors ${
                                isChecked ? 'bg-zinc-50/60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setInviteSelectedChannelIds(prev => [...prev, ch.id]);
                                    } else {
                                      setInviteSelectedChannelIds(prev => prev.filter(id => id !== ch.id));
                                    }
                                  }}
                                  className="rounded border-[#E8E8E6] text-black focus:ring-black h-3.5 w-3.5 cursor-pointer accent-black"
                                />
                                {renderChannelIcon(ch.channel_type, "h-3.5 w-3.5")}
                                <span className="text-xs font-semibold text-zinc-900 truncate max-w-[170px]">{ch.name}</span>
                              </div>
                              <span className="text-[9px] text-zinc-400 uppercase font-medium">
                                {ch.channel_type}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingInvite ? t('dispatching') : t('invite')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 2. CONFIGURE ROLE MODAL */}
      {mounted && roleModalOpen && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[8px] bg-[#FAFAFA] border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('createCustomRole')}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('roleClassLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={roleDisplayName}
                  onChange={(e) => setRoleDisplayName(e.target.value)}
                  placeholder={t('roleClassPlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-[6px] text-xs focus:outline-none focus:border-black text-black font-medium transition-colors text-left"
                />
              </div>

              {/* Scope selectors */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block shrink-0">
                    {t('accessScopeControl')}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Search bar */}
                    <div className="relative w-44 sm:w-52">
                      <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={roleModuleSearch}
                        onChange={(e) => setRoleModuleSearch(e.target.value)}
                        placeholder={t('searchModulesPlaceholder')}
                        className="w-full h-7 pl-8 pr-7 bg-[#FAFAFA] border border-[#E8E8E6] rounded-[5px] text-[11px] focus:outline-none focus:border-black font-medium transition-colors"
                      />
                      {roleModuleSearch && (
                        <button
                          type="button"
                          onClick={() => setRoleModuleSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {/* Clear All */}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-0.5 rounded-[4px] bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-black transition-colors cursor-pointer text-[10px] font-bold shrink-0"
                    >
                      {t('clearAll')}
                    </button>
                  </div>
                </div>

                {/* Module list with icons in tenant */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(() => {
                    const searchLower = roleModuleSearch.trim().toLowerCase();
                    const filtered = ALL_MODULES_LIST.filter(m => 
                      !searchLower || 
                      m.name.toLowerCase().includes(searchLower) || 
                      m.key.toLowerCase().includes(searchLower) || 
                      m.desc.toLowerCase().includes(searchLower)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-[#E8E8E6] rounded-[6px]">
                          No platform modules match "{roleModuleSearch}"
                        </div>
                      );
                    }

                    return filtered.map((m) => {
                      const ModuleIcon = m.icon;
                      const scopes = rolePerms[m.key] || [];
                      const isRead = scopes.includes('read');
                      const isWrite = scopes.includes('write');

                      return (
                        <div key={m.key} className="border border-[#E8E8E6] rounded-[6px] p-2.5 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0">
                              <ModuleIcon className="h-3.5 w-3.5 text-zinc-700" />
                            </div>
                            <span className="text-xs font-bold text-zinc-900 truncate">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isRead}
                                onChange={() => togglePermission(m.key, 'read')}
                                className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4 cursor-pointer accent-black"
                              />
                              <span>{t('read')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isWrite}
                                onChange={() => togglePermission(m.key, 'write')}
                                className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4 cursor-pointer accent-black"
                              />
                              <span>{t('write')}</span>
                            </label>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Action Buttons Footer Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between gap-3 select-none">
                <span className="text-[11px] font-bold text-zinc-500">
                  {Object.values(rolePerms).filter(s => s.length > 0).length} / {ALL_MODULES_LIST.length} {t('modulesConfigured', { count: Object.values(rolePerms).filter(s => s.length > 0).length, total: ALL_MODULES_LIST.length })}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleModalOpen(false)}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRole || !roleDisplayName.trim()}
                    className="bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center min-w-[100px] disabled:opacity-50"
                  >
                    {submittingRole ? t('saving') : t('register')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 3. MANAGE CHANNEL ACCESS MODAL */}
      {mounted && channelModalOpen && selectedMemberForChannels && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
        >
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Radio className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('manageChannelAccess')}</h3>
                  <p className="text-[10px] text-zinc-400 font-medium truncate max-w-[280px]">
                    {selectedMemberForChannels.first_name} {selectedMemberForChannels.last_name} ({selectedMemberForChannels.email})
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChannelAccess} className="space-y-4 pt-4">
              {/* Access Type Segmented Cards */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('channelAccess')}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* All Channels Option */}
                  <div
                    onClick={() => setMemberChannelAccessType('all')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                      memberChannelAccessType === 'all'
                        ? 'border-black bg-zinc-50/70 shadow-3xs'
                        : 'border-[#E8E8E6] bg-white hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        memberChannelAccessType === 'all' ? 'border-black bg-black' : 'border-zinc-300'
                      }`}>
                        {memberChannelAccessType === 'all' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-zinc-700" />
                        <span className="text-xs font-bold text-zinc-900">{t('allChannels')}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed font-normal">
                        {t('allChannelsDesc')}
                      </p>
                    </div>
                  </div>

                  {/* Specific Channels Option */}
                  <div
                    onClick={() => setMemberChannelAccessType('custom')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                      memberChannelAccessType === 'custom'
                        ? 'border-black bg-zinc-50/70 shadow-3xs'
                        : 'border-[#E8E8E6] bg-white hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        memberChannelAccessType === 'custom' ? 'border-black bg-black' : 'border-zinc-300'
                      }`}>
                        {memberChannelAccessType === 'custom' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-zinc-700" />
                        <span className="text-xs font-bold text-zinc-900">{t('specificChannels')}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed font-normal">
                        {t('specificChannelsDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Channel Selection List (when custom) */}
              {memberChannelAccessType === 'custom' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                      {t('selectChannelsToAssign')}
                    </label>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {memberSelectedChannelIds.length} / {allTenantChannels.length}
                    </span>
                  </div>

                  {allTenantChannels.length === 0 ? (
                    <div className="p-4 border border-dashed border-zinc-200 rounded-lg text-center text-xs text-zinc-400 font-medium">
                      {t('noChannelsAssigned')}
                    </div>
                  ) : (
                    <div className="border border-[#E8E8E6] rounded-lg divide-y divide-[#E8E8E6] max-h-48 overflow-y-auto bg-white">
                      {allTenantChannels.map(ch => {
                        const isChecked = memberSelectedChannelIds.includes(ch.id);
                        return (
                          <label
                            key={ch.id}
                            className={`flex items-center justify-between p-2.5 px-3 hover:bg-zinc-50/70 cursor-pointer transition-colors ${
                              isChecked ? 'bg-zinc-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMemberSelectedChannelIds(prev => [...prev, ch.id]);
                                  } else {
                                    setMemberSelectedChannelIds(prev => prev.filter(id => id !== ch.id));
                                  }
                                }}
                                className="rounded border-[#E8E8E6] text-black focus:ring-black h-3.5 w-3.5 cursor-pointer accent-black"
                              />
                              {renderChannelIcon(ch.channel_type, "h-4 w-4")}
                              <div>
                                <span className="text-xs font-semibold text-zinc-900">{ch.name}</span>
                                <span className="text-[9px] text-zinc-400 ml-1.5 uppercase font-medium">({ch.channel_type})</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              {ch.status || 'Active'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons Footer Strip */}
              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
                <button
                  type="button"
                  onClick={() => setChannelModalOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingChannels}
                  className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingChannels ? t('saving') : t('saveChannelAccess')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
