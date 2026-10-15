'use client';

import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Dialog, Input, DropdownSelect } from '@/ui-components-library';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newWorkspace: any) => void;
}

const INDUSTRIES = [
  'E-Commerce',
  'SaaS / Technology',
  'Healthcare',
  'Real Estate',
  'Education',
  'Agency / Marketing',
  'Retail / Services',
  'Other',
];

const TEAM_SIZES = [
  'Just me (1)',
  '2-10',
  '11-50',
  '51-200',
  '200+',
];

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const t = useTranslations();
  const [companyName, setCompanyName] = useState('');
  const [industryCategory, setIndustryCategory] = useState('E-Commerce');
  const [teamSize, setTeamSize] = useState('2-10');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCompanyName('');
    setIndustryCategory('E-Commerce');
    setTeamSize('2-10');
    setNameError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = companyName.trim();
    if (!trimmed) {
      setNameError(
        t.has('Common.enterWorkspaceName')
          ? t('Common.enterWorkspaceName')
          : 'Please enter a workspace name'
      );
      return;
    }

    try {
      setLoading(true);
      setNameError('');
      const res = await fetchWithCsrf('/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: trimmed,
          industry_category: industryCategory,
          team_size: teamSize,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          t.has('Common.workspaceCreatedSuccess')
            ? t('Common.workspaceCreatedSuccess')
            : 'Workspace created successfully!'
        );
        if (data.workspace?.id) {
          localStorage.setItem('whatsomni_workspace_id', String(data.workspace.id));
          if (typeof document !== 'undefined') {
            document.cookie = `whatsomni_workspace_id=${data.workspace.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
        }
        handleClose();
        if (onSuccess) {
          onSuccess(data.workspace);
        } else {
          window.location.reload();
        }
      } else {
        toast.error(data.message || 'Failed to create workspace');
      }
    } catch {
      toast.error('Network error creating workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t.has('Common.createWorkspace') ? t('Common.createWorkspace') : 'Create New Workspace'}
      subtitle={
        t.has('Common.createWorkspaceDesc')
          ? t('Common.createWorkspaceDesc')
          : 'Add a new workspace to organize teams, channels, and campaigns.'
      }
      icon={<Building2 className="h-4 w-4 text-zinc-900" />}
      iconBoxClassName="bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-700"
      maxWidth="md"
      asForm
      onSubmit={handleSubmit}
      primaryAction={{
        label: t.has('Common.create') ? t('Common.create') : 'Create Workspace',
        loading,
        disabled: loading,
        type: 'submit',
        variant: 'primary',
      }}
      secondaryAction={{
        label: t.has('Common.cancel') ? t('Common.cancel') : 'Cancel',
        onClick: handleClose,
        disabled: loading,
      }}
    >
      <div className="space-y-4">
        <Input
          label={t.has('Common.workspaceName') ? t('Common.workspaceName') : 'Workspace Name'}
          placeholder="e.g. Acme Corp Marketing"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            if (nameError) setNameError('');
          }}
          error={nameError}
          maxLength={100}
          required
          autoFocus
          helperText="Give your workspace a recognizable name for your team."
        />

        <div className="grid grid-cols-2 gap-3 pt-1">
          <DropdownSelect
            label={t.has('Common.industry') ? t('Common.industry') : 'Industry'}
            value={industryCategory}
            onChange={(val) => setIndustryCategory(val)}
            options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
          />

          <DropdownSelect
            label={t.has('Common.teamSize') ? t('Common.teamSize') : 'Team Size'}
            value={teamSize}
            onChange={(val) => setTeamSize(val)}
            options={TEAM_SIZES.map((sz) => ({ value: sz, label: sz }))}
          />
        </div>
      </div>
    </Dialog>
  );
}
