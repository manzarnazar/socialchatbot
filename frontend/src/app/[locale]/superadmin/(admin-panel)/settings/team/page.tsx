'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Users, 
  RefreshCw, 
  X, 
  Loader2, 
  Check, 
  AlertCircle,
  Pencil,
  Lock,
  Inbox,
  ShieldAlert,
  Search,
  LayoutDashboard,
  Building2,
  CreditCard,
  Coins,
  Zap,
  Brain,
  Puzzle,
  GitFork,
  LifeBuoy,
  BarChart3,
  FileText,
  Settings2,
  Send
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface AdminRole {
  id: number;
  name: string;
  display_name: string;
  permissions?: Record<string, string[]> | string[] | null;
}

interface AdminMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role?: AdminRole;
}

interface SaasAdminInvitation {
  id: number;
  email: string;
  role?: AdminRole;
}

export interface SuperadminModuleDef {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AVAILABLE_MODULES: readonly SuperadminModuleDef[] = [
  { id: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { id: 'tenants', labelKey: 'sidebar.tenants', icon: Building2 },
  { id: 'users', labelKey: 'sidebar.users', icon: Users },
  { id: 'plans', labelKey: 'sidebar.plans', icon: CreditCard },
  { id: 'currencies', labelKey: 'sidebar.currencies', icon: Coins },
  { id: 'channels', labelKey: 'sidebar.channels', icon: Zap },
  { id: 'ai_providers', labelKey: 'sidebar.aiProviders', icon: Brain },
  { id: 'integrations', labelKey: 'sidebar.integrations', icon: Puzzle },
  { id: 'flow_templates', labelKey: 'sidebar.flowTemplates', icon: GitFork },
  { id: 'tickets', labelKey: 'sidebar.tickets', icon: LifeBuoy },
  { id: 'analytics', labelKey: 'sidebar.analytics', icon: BarChart3 },
  { id: 'custom_pages', labelKey: 'sidebar.customPages', icon: FileText },
  { id: 'settings', labelKey: 'sidebar.settings', icon: Settings2 },
];

const getDefaultRolePerms = (): Record<string, string[]> => {
  const perms: Record<string, string[]> = {};
  AVAILABLE_MODULES.forEach(m => {
    perms[m.id] = m.id === 'dashboard' ? ['read'] : [];
  });
  return perms;
};

export default function TeamSettingsPage() {
  const t = useTranslations('Superadmin');

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [invitations, setInvitations] = useState<SaasAdminInvitation[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

  // Updating member role state
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    member: AdminMember;
    newRoleId: number;
    newRoleName: string;
  } | null>(null);

  // Invite Admin form modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Custom Role form modal (Create & Edit)
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(getDefaultRolePerms());
  const [submittingRole, setSubmittingRole] = useState(false);
  const [roleModuleSearch, setRoleModuleSearch] = useState('');

  // Revoke / Delete confirmation alert dialog
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    type: 'member' | 'invite' | 'role';
    title: string;
    name: string;
    subtitle?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetchWithCsrf('/admin/settings/team');
      if (res.ok) {
        const d = await res.json();
        setMembers(d.members || []);
        setInvitations(d.invitations || []);
        setRoles(d.roles || []);
      }
    } catch {
      toast.error(t('settings.messages.syncTeamFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInviteOpen(false);
        setRoleModalOpen(false);
        setDeleteTarget(null);
        setPendingRoleChange(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId || inviting) return;

    setInviting(true);
    try {
      const res = await fetchWithCsrf('/admin/settings/team/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role_id: Number(inviteRoleId)
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('settings.saveSuccess'));
        setInviteOpen(false);
        setInviteEmail('');
        setInviteRoleId('');
        await loadData();
      } else {
        toast.error(data.message || t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setInviting(false);
    }
  };

  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);

  const handleResendInvite = async (inviteId: number) => {
    setResendingInviteId(inviteId);
    try {
      const res = await fetchWithCsrf(`/admin/settings/team/invite/${inviteId}/resend`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || t('settings.saveSuccess'));
      } else {
        toast.error(data.message || t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setResendingInviteId(null);
    }
  };

  const openCreateRoleModal = () => {
    setEditingRoleId(null);
    setRoleDisplayName('');
    setRolePerms(getDefaultRolePerms());
    setRoleModuleSearch('');
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: AdminRole) => {
    setEditingRoleId(role.id);
    setRoleDisplayName(role.display_name || role.name);
    setRoleModuleSearch('');
    
    // Parse permissions for all 13 modules
    const perms: Record<string, string[]> = {};
    AVAILABLE_MODULES.forEach(m => {
      let scopes: string[] = [];
      if (Array.isArray(role.permissions)) {
        if (role.permissions.includes('*')) {
          scopes = ['read', 'write'];
        } else if (role.permissions.includes(m.id) || role.permissions.includes(m.id.replace('_', ''))) {
          scopes = ['read', 'write'];
        }
      } else if (typeof role.permissions === 'object' && role.permissions) {
        scopes = (role.permissions as Record<string, string[]>)[m.id] || (role.permissions as Record<string, string[]>)[m.id.replace('_', '')] || [];
      }
      perms[m.id] = scopes;
    });

    setRolePerms(perms);
    setRoleModalOpen(true);
  };

  const handleClearAll = () => {
    const empty: Record<string, string[]> = {};
    AVAILABLE_MODULES.forEach(m => {
      empty[m.id] = [];
    });
    setRolePerms(empty);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleDisplayName.trim() || submittingRole) return;

    setSubmittingRole(true);
    try {
      const isEdit = editingRoleId !== null;
      const url = isEdit ? `/admin/settings/team/roles/${editingRoleId}` : '/admin/settings/team/roles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify({
          name: roleDisplayName.trim(),
          permissions: rolePerms,
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? t('settings.messages.updateRoleSuccess') : t('settings.messages.createRoleSuccess'));
        setRoleModalOpen(false);
        setEditingRoleId(null);
        setRoleDisplayName('');
        setRolePerms(getDefaultRolePerms());
        await loadData();
      } else {
        toast.error(data.message || (isEdit ? t('settings.messages.updateRoleFailed') : t('settings.messages.createRoleFailed')));
      }
    } catch {
      toast.error(t('settings.messages.networkError'));
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: number, roleId: number) => {
    setUpdatingMemberId(memberId);
    try {
      const res = await fetchWithCsrf(`/admin/settings/team/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({
          role_id: roleId,
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('settings.messages.updateMemberRoleSuccess'));
        await loadData();
      } else {
        toast.error(data.message || t('settings.messages.updateMemberRoleFailed'));
      }
    } catch {
      toast.error(t('settings.messages.networkError'));
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const togglePermission = (module: string, scope: 'read' | 'write') => {
    setRolePerms(prev => {
      const current = prev[module] || [];
      let next: string[];
      if (current.includes(scope)) {
        next = current.filter(s => s !== scope);
      } else {
        next = [...current, scope];
      }
      return { ...prev, [module]: next };
    });
  };

  const executeDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      let url = '';
      if (deleteTarget.type === 'invite') {
        url = `/admin/settings/team/invite/${deleteTarget.id}`;
      } else if (deleteTarget.type === 'role') {
        url = `/admin/settings/team/roles/${deleteTarget.id}`;
      } else {
        url = `/admin/settings/team/members/${deleteTarget.id}`;
      }

      const res = await fetchWithCsrf(url, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('settings.saveSuccess'));
        setDeleteTarget(null);
        await loadData();
      } else {
        toast.error(data.message || t('settings.saveFailed'));
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <SimpleLoader message={t('settings.loadingTeam')} />;
  }

  const roleOptions = roles.map((r) => ({
    value: r.id.toString(),
    label: r.display_name
  }));

  const systemRoles = ['super_admin', 'support_agent', 'Super Admin', 'Support Agent'];

  const getAssignedCount = (roleId: number) => {
    return members.filter(m => m.role?.id === roleId).length;
  };

  const getActiveScopesCount = (role: AdminRole, isSystem: boolean) => {
    if (isSystem && role.name === 'super_admin') return 13;
    if (!role.permissions) return 0;
    let count = 0;
    AVAILABLE_MODULES.forEach(m => {
      if (Array.isArray(role.permissions)) {
        if (role.permissions.includes('*') || role.permissions.includes(m.id) || role.permissions.includes(m.id.replace('_', ''))) {
          count++;
        }
      } else if (typeof role.permissions === 'object') {
        const perms = (role.permissions as Record<string, string[]>)[m.id] || (role.permissions as Record<string, string[]>)[m.id.replace('_', '')] || [];
        if (perms.length > 0) count++;
      }
    });
    return count;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 text-left select-none animate-fade-in font-sans flex-1 overflow-y-auto pb-16">
      
      {/* 2-Column Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Seats */}
        <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between transition-all hover:shadow-[var(--shadow-card-hover)] relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-555 uppercase tracking-wider">
                <Users className="h-4 w-4 text-zinc-400 group-hover:text-zinc-650 transition-colors" />
                <span>{t('settings.adminSeats')}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black leading-none tracking-tighter text-zinc-955">
                {members.length + invitations.length}
              </span>
            </div>
          </div>
          <div className="mt-5 border-t border-[#F0F0F0] pt-4 text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse shrink-0" />
            <span>{members.length} {t('settings.activeAccountsSub')} • {invitations.length} {t('settings.pendingInvitesHeading')}</span>
          </div>
        </div>

        {/* Card 2: Security Groups */}
        <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between transition-all hover:shadow-[var(--shadow-card-hover)] relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-555 uppercase tracking-wider">
                <Shield className="h-4 w-4 text-zinc-400 group-hover:text-zinc-650 transition-colors" />
                <span>{t('settings.securityClasses')}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black leading-none tracking-tighter text-zinc-955">
                {roles.length}
              </span>
            </div>
          </div>
          <div className="mt-5 border-t border-[#F0F0F0] pt-4 text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shrink-0" />
            <span>13 {t('settings.activeModules')}</span>
          </div>
        </div>
      </div>

      {/* Main Tab bar toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E8E6] pb-4 select-none">
        <div className="flex items-center gap-1 border border-[#E8E8E6] bg-[#F5F5F5] p-1 rounded-[8px] select-none shrink-0 shadow-3xs w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members' 
                ? 'bg-white text-zinc-955 shadow-3xs' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('settings.membersTab')}</span>
            <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 bg-zinc-100 rounded-full text-zinc-600">
              {members.length + invitations.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'roles' 
                ? 'bg-white text-zinc-955 shadow-3xs' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('settings.rolesTab')}</span>
            <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 bg-zinc-100 rounded-full text-zinc-600">
              {roles.length}
            </span>
          </button>
        </div>

        <div>
          {activeTab === 'members' ? (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all border border-transparent"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('settings.inviteAdmin')}</span>
            </button>
          ) : (
            <button
              onClick={openCreateRoleModal}
              className="flex items-center gap-1.5 px-4 h-9 bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-bold shadow-3xs cursor-pointer transition-all border border-transparent"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{t('settings.addRole')}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-8">
          {/* Directory Table */}
          <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">{t('settings.thTeammate')}</th>
                  <th className="px-6 py-3.5">{t('settings.thEmail')}</th>
                  <th className="px-6 py-3.5">{t('settings.thRole')}</th>
                  <th className="px-6 py-3.5 text-right">{t('settings.thActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-800 select-none shrink-0">
                        {((member.first_name?.[0] || '') + (member.last_name?.[0] || '')).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-zinc-955">{member.first_name} {member.last_name}</div>
                        <div className="text-[10px] text-zinc-400 font-medium">{t('settings.activeAccount')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-650">{member.email}</td>
                    <td className="px-6 py-4">
                      <div className="w-48 relative">
                        <DropdownSelect 
                          options={roleOptions}
                          value={member.role?.id?.toString() || ''}
                          onChange={(val) => {
                            const newRoleId = parseInt(val, 10);
                            if (member.role?.id === newRoleId) return;
                            const targetRole = roles.find(r => r.id === newRoleId);
                            setPendingRoleChange({
                              member,
                              newRoleId,
                              newRoleName: targetRole?.display_name || targetRole?.name || t('settings.customAdminRole'),
                            });
                          }}
                          placeholder={t('settings.chooseRole')}
                          className="w-full"
                        />
                        {updatingMemberId === member.id && (
                          <div className="absolute right-8 top-2.5 flex items-center pointer-events-none">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTarget({
                          id: member.id,
                          type: 'member',
                          title: t('settings.removeMemberTitle'),
                          name: `${member.first_name} ${member.last_name}`,
                          subtitle: member.email
                        })}
                        className="p-1.5 text-zinc-400 hover:text-red-655 hover:bg-red-50 rounded-[6px] transition-colors inline-flex items-center justify-center cursor-pointer"
                        title={t('settings.revokeAdminTitle')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div className="space-y-4 animate-row-fade pt-4">
              <div className="border-b border-[#E8E8E6] pb-2">
                <h3 className="text-xs font-extrabold text-black uppercase tracking-wider pl-1">{t('settings.pendingInvitesHeading')}</h3>
              </div>
              
              <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5">{t('settings.thEmail')}</th>
                      <th className="px-6 py-3.5">{t('settings.assignedRole')}</th>
                      <th className="px-6 py-3.5 text-right font-bold">{t('settings.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                    {invitations.map((invite) => (
                      <tr key={invite.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-955 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 shrink-0 select-none">
                            @
                          </div>
                          <span>{invite.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded text-[10px] font-bold tracking-tight bg-zinc-50 border-zinc-200 text-zinc-700 select-none uppercase">
                            <Shield className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{invite.role?.display_name}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
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
                              onClick={() => setDeleteTarget({
                                id: invite.id,
                                type: 'invite',
                                title: t('settings.revokeInviteTitle'),
                                name: invite.email,
                                subtitle: invite.role?.display_name
                              })}
                              className="px-3 py-1 text-red-650 hover:bg-red-50 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-[6px] border border-transparent hover:border-red-150 transition-all cursor-pointer"
                            >
                              {t('settings.revokeInvite')}
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

      {/* TAB 2: PREDEFINED & CUSTOM SECURITY ROLES */}
      {activeTab === 'roles' && (
        <div className="space-y-6 font-sans animate-fade-in">
          {roles.length === 0 ? (
            <div className="p-16 text-center space-y-3 border border-[#E8E8E6] rounded-[10px] bg-white shadow-3xs">
              <Inbox className="h-10 w-10 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-400 font-semibold">{t('settings.noRolesFound')}</p>
            </div>
          ) : (
            <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-[#E8E8E6] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5">{t('settings.thRoleName')}</th>
                      <th className="px-6 py-3.5">{t('settings.thRoleType')}</th>
                      <th className="px-6 py-3.5">{t('settings.thAssignedMembers')}</th>
                      <th className="px-6 py-3.5">{t('settings.thPermissionsScope')}</th>
                      <th className="px-6 py-3.5 text-right font-bold">{t('settings.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-xs font-semibold text-zinc-700">
                    {roles.map((role) => {
                      const isSystem = systemRoles.includes(role.name) || systemRoles.includes(role.display_name);
                      const assignedCount = getAssignedCount(role.id);
                      const activeScopesCount = getActiveScopesCount(role, isSystem);
                      const isSuperAdmin = isSystem && role.name === 'super_admin';

                      return (
                        <tr key={role.id} className="hover:bg-neutral-50/50 transition-colors">
                          {/* Role Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center text-zinc-700 shadow-3xs shrink-0">
                                {isSystem ? <Lock className="h-3.5 w-3.5 text-zinc-500" /> : <Shield className="h-3.5 w-3.5 text-zinc-700" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-zinc-950 text-xs">{role.display_name}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                  {role.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Type */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-bold text-xs select-none">
                              {isSystem ? (
                                <>
                                  <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                  <span className="text-zinc-600">{t('settings.systemCoreRole')}</span>
                                </>
                              ) : (
                                <>
                                  <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="text-emerald-700">{t('settings.customAdminRole')}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Assigned Admins */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
                              <Users className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="font-mono text-zinc-900 font-bold">{assignedCount}</span>
                              <span className="text-zinc-400 text-[11px]">{assignedCount === 1 ? t('settings.memberAssigned') : t('settings.membersAssigned')}</span>
                            </div>
                          </td>

                          {/* Permissions Scope */}
                          <td className="px-6 py-4">
                            {isSuperAdmin ? (
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#FAFAFA] border border-[#E8E8E6] text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] animate-pulse shrink-0" />
                                <span className="font-bold text-zinc-900">{t('settings.fullSystemAccess')}</span>
                                <span className="text-[10px] text-zinc-400 font-medium">({t('settings.allModulesAccessible')})</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded-[4px] text-[10px] font-extrabold text-zinc-800">
                                  <span>{activeScopesCount} / 13 {t('settings.activeModules')}</span>
                                </span>
                                <div className="hidden lg:flex items-center gap-1">
                                  {AVAILABLE_MODULES.filter(mod => {
                                    if (Array.isArray(role.permissions)) {
                                      return role.permissions.includes('*') || role.permissions.includes(mod.id) || role.permissions.includes(mod.id.replace('_', ''));
                                    }
                                    if (typeof role.permissions === 'object' && role.permissions) {
                                      const scopes = (role.permissions as Record<string, string[]>)[mod.id] || (role.permissions as Record<string, string[]>)[mod.id.replace('_', '')] || [];
                                      return scopes.length > 0;
                                    }
                                    return false;
                                  }).slice(0, 3).map(mod => (
                                    <span key={mod.id} className="text-[9px] font-semibold text-zinc-600 bg-[#FAFAFA] border border-zinc-200 px-1.5 py-0.5 rounded">
                                      {t(mod.labelKey as any)}
                                    </span>
                                  ))}
                                  {activeScopesCount > 3 && (
                                    <span className="text-[9px] font-bold text-zinc-400">
                                      +{activeScopesCount - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            {!isSystem ? (
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  type="button"
                                  onClick={() => openEditRoleModal(role)}
                                  className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-[6px] transition-all cursor-pointer border border-transparent shadow-none hover:shadow-3xs"
                                  title={t('settings.editRole')}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setDeleteTarget({
                                    id: role.id,
                                    type: 'role',
                                    title: t('settings.deleteRoleTitle'),
                                    name: role.display_name,
                                    subtitle: `${getAssignedCount(role.id)} ${getAssignedCount(role.id) === 1 ? t('settings.memberAssigned') : t('settings.membersAssigned')}`
                                  })}
                                  className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-[6px] transition-all cursor-pointer border border-transparent shadow-none hover:shadow-3xs"
                                  title={t('settings.deleteRoleTitle')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded-[4px] inline-flex items-center gap-1 select-none">
                                <Lock className="h-2.5 w-2.5 text-zinc-400" />
                                {t('settings.systemRole')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Administrator Modal Portal */}
      {mounted && inviteOpen && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="fixed inset-0" onClick={() => setInviteOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('settings.inviteAdmin')}</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setInviteOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('settings.inviteEmailLabel')}</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black text-black font-medium transition-colors text-left"
                />
              </div>

              <div className="space-y-1.5 font-semibold text-zinc-750">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('settings.selectAdminRole')}</label>
                <DropdownSelect
                  value={inviteRoleId}
                  onChange={setInviteRoleId}
                  options={roleOptions}
                  placeholder={t('settings.chooseRole')}
                />
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim() || !inviteRoleId}
                  className="bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center min-w-[100px] disabled:opacity-50"
                >
                  {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('settings.sendInvite')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Configure Role Modal Portal */}
      {mounted && roleModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="fixed inset-0" onClick={() => setRoleModalOpen(false)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-xl w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[8px] bg-[#FAFAFA] border border-[#E8E8E6] p-1.5 flex items-center justify-center shrink-0">
                  {editingRoleId ? <Pencil className="h-4 w-4 text-[#6B6B6B]" /> : <Shield className="h-4 w-4 text-[#6B6B6B]" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {editingRoleId ? t('settings.editRoleTitle') : t('settings.configureCustomRole')}
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

            <form onSubmit={handleSaveRole} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('settings.roleDisplayName')}</label>
                <input
                  type="text"
                  required
                  value={roleDisplayName}
                  onChange={(e) => setRoleDisplayName(e.target.value)}
                  placeholder={t('settings.roleDisplayNamePlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-[6px] text-xs focus:outline-none focus:border-black text-black font-medium transition-colors text-left"
                />
              </div>

              {/* Scope selectors */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block shrink-0">
                    {t('settings.accessScopeControl')}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Search bar */}
                    <div className="relative w-44 sm:w-52">
                      <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={roleModuleSearch}
                        onChange={(e) => setRoleModuleSearch(e.target.value)}
                        placeholder={t('settings.searchModulesPlaceholder')}
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
                      {t('settings.clearAll')}
                    </button>
                  </div>
                </div>

                {/* Module list with icons */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(() => {
                    const searchLower = roleModuleSearch.trim().toLowerCase();
                    const filtered = AVAILABLE_MODULES.filter(m => {
                      if (!searchLower) return true;
                      const label = t(m.labelKey as any).toLowerCase();
                      return label.includes(searchLower) || m.id.toLowerCase().includes(searchLower);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-[#E8E8E6] rounded-[6px]">
                          No platform modules match "{roleModuleSearch}"
                        </div>
                      );
                    }

                    return filtered.map((modObj) => {
                      const mod = modObj.id;
                      const ModuleIcon = modObj.icon;
                      const scopes = rolePerms[mod] || [];
                      const isRead = scopes.includes('read');
                      const isWrite = scopes.includes('write');
                      const moduleLabel = t(modObj.labelKey as any);

                      return (
                        <div key={mod} className="border border-[#E8E8E6] rounded-[6px] p-2.5 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-[6px] bg-white border border-[#E8E8E6] flex items-center justify-center shrink-0">
                              <ModuleIcon className="h-3.5 w-3.5 text-zinc-700" />
                            </div>
                            <span className="text-xs font-bold text-zinc-900 truncate">{moduleLabel}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isRead}
                                onChange={() => togglePermission(mod, 'read')}
                                className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4 cursor-pointer accent-black"
                              />
                              <span>{t('settings.read')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isWrite}
                                onChange={() => togglePermission(mod, 'write')}
                                className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4 cursor-pointer accent-black"
                              />
                              <span>{t('settings.write')}</span>
                            </label>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between gap-3 select-none">
                <span className="text-[11px] font-bold text-zinc-500">
                  {Object.values(rolePerms).filter(s => s.length > 0).length} / {AVAILABLE_MODULES.length} {t('settings.activeModules')}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleModalOpen(false)}
                    className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs"
                  >
                    {t('dashboard.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRole || !roleDisplayName.trim()}
                    className="bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center min-w-[100px] disabled:opacity-50"
                  >
                    {submittingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (editingRoleId ? t('settings.updateRole') : t('settings.createRole'))}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Revoke / Delete Alert Confirmation Dialog Portal */}
      {mounted && deleteTarget && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="fixed inset-0" onClick={() => !deleting && setDeleteTarget(null)} />
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-red-50 border border-red-100 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {deleteTarget.title}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-medium">
                {deleteTarget.type === 'invite'
                  ? t('settings.revokeInviteConfirmText')
                  : deleteTarget.type === 'role'
                  ? t('settings.deleteRoleConfirmText')
                  : t('settings.removeMemberConfirmText')}
              </p>

              {/* Target Highlight Box */}
              <div className="p-3 bg-red-50/40 border border-red-100 rounded-lg flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-white border border-red-150 flex items-center justify-center text-red-600 shrink-0 font-bold shadow-3xs">
                  {deleteTarget.type === 'role' ? (
                    <Shield className="h-4 w-4" />
                  ) : deleteTarget.type === 'invite' ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-950 truncate">
                    {deleteTarget.name}
                  </div>
                  {deleteTarget.subtitle && (
                    <div className="text-[11px] text-zinc-500 font-medium truncate">
                      {deleteTarget.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                className="bg-red-650 hover:bg-red-700 text-white h-9 px-4 text-xs font-bold rounded-[6px] shadow-3xs transition-all cursor-pointer flex items-center justify-center min-w-[100px] gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <span>{t('dashboard.yesDelete')}</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role Change Confirmation Modal Portal */}
      {mounted && pendingRoleChange && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none">
          <div className="fixed inset-0" onClick={() => !updatingMemberId && setPendingRoleChange(null)} />
          <div className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left">
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-[#6B6B6B]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('settings.changeRoleModalTitle')}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                disabled={!!updatingMemberId}
                onClick={() => setPendingRoleChange(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-medium">
                {t('settings.changeRoleConfirmText')}{' '}
                <strong className="text-black font-bold">
                  {pendingRoleChange.member.first_name} {pendingRoleChange.member.last_name}
                </strong>?
              </p>

              {/* Role transition card */}
              <div className="p-3.5 bg-[#FAFAFA] border border-[#E8E8E6] rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    {t('settings.currentRole')}
                  </span>
                  <span className="font-semibold text-zinc-700 truncate block">
                    {pendingRoleChange.member.role?.display_name || t('settings.systemRole')}
                  </span>
                </div>

                <div className="shrink-0 text-zinc-400 font-bold px-2">→</div>

                <div className="space-y-1 min-w-0 text-right">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    {t('settings.newRole')}
                  </span>
                  <span className="font-bold text-emerald-700 truncate block">
                    {pendingRoleChange.newRoleName}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-450 leading-normal">
                {t('settings.permissionsUpdateNotice')}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                disabled={!!updatingMemberId}
                onClick={() => setPendingRoleChange(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-medium rounded-[6px] transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                disabled={!!updatingMemberId}
                onClick={async () => {
                  await handleUpdateMemberRole(pendingRoleChange.member.id, pendingRoleChange.newRoleId);
                  setPendingRoleChange(null);
                }}
                className="bg-black hover:bg-neutral-800 text-white rounded-[6px] text-xs font-semibold shadow-3xs transition-all cursor-pointer h-9 px-4 flex items-center justify-center min-w-[100px] disabled:opacity-50"
              >
                {updatingMemberId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t('settings.confirmChangeRole')
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
