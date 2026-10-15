'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronsUpDown, 
  Check, 
  Plus, 
  ArrowUpRight, 
  Loader2 
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

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

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  canCreateWorkspace: boolean;
  workspacesLimit: number;
  workspacesCount: number;
  variant?: 'sidebar' | 'header' | 'mobile';
  onOpenCreateModal: () => void;
  isRtl?: boolean;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  canCreateWorkspace,
  workspacesLimit,
  workspacesCount,
  variant = 'sidebar',
  onOpenCreateModal,
  isRtl = false,
}: WorkspaceSwitcherProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSwitchWorkspace = async (targetId: number) => {
    if (activeWorkspace && activeWorkspace.id === targetId) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitchingId(targetId);
      localStorage.setItem('whatsomni_workspace_id', String(targetId));
      if (typeof document !== 'undefined') {
        document.cookie = `whatsomni_workspace_id=${targetId}; path=/; max-age=31536000; SameSite=Lax`;
      }
      const res = await fetchWithCsrf(`/workspaces/${targetId}/switch`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success(
          t.has('Common.workspaceSwitched')
            ? t('Common.workspaceSwitched')
            : 'Workspace switched successfully'
        );
        setIsOpen(false);
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to switch workspace');
      }
    } catch {
      toast.error('Failed to switch workspace');
    } finally {
      setSwitchingId(null);
    }
  };

  const getWorkspaceInitials = (name?: string) => {
    if (!name) return 'WS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = activeWorkspace?.company_name || activeWorkspace?.name || 'Workspace';
  const planName = activeWorkspace?.plan?.name;
  const subtitleText = planName 
    ? `${planName} Plan`
    : (activeWorkspace?.team_size ? `${activeWorkspace.team_size} members` : 'Workspace');

  // Popover Menu Content — Minimal, refined, beautiful
  const renderDropdownMenu = (direction: 'up' | 'down') => {
    const positionClasses = direction === 'up'
      ? 'bottom-full mb-1.5 left-0 right-0'
      : `${isRtl ? 'left-0' : 'right-0'} top-full mt-1.5 w-64`;

    return (
      <div 
        className={`absolute ${positionClasses} bg-white border border-[#E8E8E6] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 select-none font-sans`}
        style={{ minWidth: '230px' }}
      >
        {/* Minimal Header Bar with Quota */}
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400">
          <span>{t.has('Common.workspaces') ? t('Common.workspaces') : 'Workspaces'}</span>
          <span className="text-[10px] font-mono font-medium text-zinc-500 bg-zinc-50 border border-zinc-200/80 px-1.5 py-0.5 rounded">
            {workspacesCount}/{workspacesLimit}
          </span>
        </div>

        {/* Workspaces List */}
        <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar mt-1">
          {workspaces.map((w) => {
            const isCurrent = activeWorkspace && activeWorkspace.id === w.id;
            const isSwitchingThis = switchingId === w.id;

            return (
              <button
                key={w.id}
                type="button"
                onClick={() => handleSwitchWorkspace(w.id)}
                disabled={switchingId !== null}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isCurrent
                    ? 'bg-zinc-50 text-zinc-900 font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-50/70 hover:text-zinc-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-7 w-7 rounded-[6px] text-[10.5px] font-bold flex items-center justify-center shrink-0 border ${
                    isCurrent 
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-2xs' 
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200/60'
                  }`}>
                    {getWorkspaceInitials(w.company_name || w.name)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate leading-tight">
                      {w.company_name || w.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal truncate mt-0.5">
                      {w.is_owner ? 'Owner' : 'Member'} • {w.plan?.name || 'Workspace'}
                    </span>
                  </div>
                </div>

                {isSwitchingThis ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500 shrink-0 ml-2" />
                ) : isCurrent ? (
                  <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 ml-2" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="border-t border-zinc-100 my-1" />

        {/* Action: Create Workspace or Upgrade */}
        {canCreateWorkspace ? (
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenCreateModal();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
          >
            <div className="h-6 w-6 rounded-[5px] border border-dashed border-zinc-300 flex items-center justify-center shrink-0 text-zinc-500">
              <Plus className="h-3 w-3" />
            </div>
            <span>{t.has('Common.createWorkspace') ? t('Common.createWorkspace') : 'Create workspace'}</span>
          </button>
        ) : (
          <Link
            href="/settings/billing"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
          >
            <span className="truncate">
              {t.has('Common.upgradeForMore') ? t('Common.upgradeForMore') : 'Upgrade for more workspaces'}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </Link>
        )}
      </div>
    );
  };

  // 1. Header Variant (Minimalist compact pill)
  if (variant === 'header') {
    return (
      <div className="relative font-sans" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`hidden sm:inline-flex items-center gap-2 h-8 px-2.5 rounded-[6px] border transition-all duration-150 cursor-pointer select-none text-xs font-medium shadow-2xs ${
            isOpen 
              ? 'bg-zinc-100 text-zinc-900 border-zinc-300' 
              : 'bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-[#E8E8E6]'
          }`}
          title={t.has('Common.switchWorkspace') ? t('Common.switchWorkspace') : 'Switch active workspace'}
        >
          <div className="h-5 w-5 rounded-[4px] bg-[#0A0A0A] text-white text-[9.5px] font-bold flex items-center justify-center shrink-0">
            {getWorkspaceInitials(displayName)}
          </div>
          <span className="truncate max-w-[120px] font-semibold text-zinc-900">{displayName}</span>
          <ChevronsUpDown className="h-3 w-3 text-zinc-400 shrink-0" />
        </button>

        {isOpen && renderDropdownMenu('down')}
      </div>
    );
  }

  // 2. Sidebar & Mobile Variant (Minimal, polished card)
  return (
    <div className="relative font-sans select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-150 cursor-pointer text-left group shadow-2xs ${
          isOpen
            ? 'bg-zinc-50/80 border-zinc-300 ring-2 ring-zinc-900/5'
            : 'bg-white hover:bg-zinc-50/60 border-[#E8E8E6]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-[6px] bg-[#0A0A0A] text-white text-[11px] font-bold flex items-center justify-center shrink-0 tracking-tight shadow-xs">
            {getWorkspaceInitials(displayName)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-zinc-900 truncate leading-snug group-hover:text-black">
              {displayName}
            </span>
            <span className="text-[11px] text-zinc-400 font-normal truncate leading-tight mt-0.5">
              {subtitleText}
            </span>
          </div>
        </div>

        <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 shrink-0 transition-colors ml-1.5" />
      </button>

      {/* Opens Upward as a Dropup */}
      {isOpen && renderDropdownMenu('up')}
    </div>
  );
}
