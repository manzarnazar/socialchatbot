'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Clock, 
  Trash2, 
  Edit, 
  RefreshCw, 
  ShieldAlert, 
  Check, 
  X,
  Phone, 
  Mail,
  CalendarDays
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface StaffMemberItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  type: 'staff';
  color: string | null;
  avatar_url: string | null;
  working_hours: Record<string, { start: string; end: string }[]> | null;
  google_calendar_id: string | null;
  google_sync_enabled: boolean;
  is_active: boolean;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  created_at: string;
}

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#EF4444', // Rose/Red
  '#64748B', // Slate
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function StaffPage() {
  const t = useTranslations('Staff');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [staffList, setStaffList] = useState<StaffMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formColor, setFormColor] = useState('#10B981');
  const [formGoogleCalendarId, setFormGoogleCalendarId] = useState('');
  const [formGoogleSyncEnabled, setFormGoogleSyncEnabled] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSchedule, setFormSchedule] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '10:00', end: '15:00' },
    sunday: { enabled: false, start: '10:00', end: '15:00' },
  });

  useEffect(() => {
    setMounted(true);
    fetchStaff();
  }, [statusFilter]);

  // Handle Escape Key to Close Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (deleteTargetId !== null) setDeleteTargetId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, deleteTargetId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      let url = '/staff?type=staff&';
      if (statusFilter === 'active') url += `is_active=1&`;
      if (statusFilter === 'inactive') url += `is_active=0&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetchWithCsrf(url);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch {
      toast.error(t('toastFetchError') || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormTitle('');
    setFormEmail('');
    setFormPhone('');
    setFormColor('#10B981');
    setFormGoogleCalendarId('');
    setFormGoogleSyncEnabled(false);
    setFormIsActive(true);
    setFormSchedule({
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '10:00', end: '15:00' },
      sunday: { enabled: false, start: '10:00', end: '15:00' },
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: StaffMemberItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormTitle(item.title || '');
    setFormEmail(item.email || '');
    setFormPhone(item.phone || '');
    setFormColor(item.color || '#10B981');
    setFormGoogleCalendarId(item.google_calendar_id || '');
    setFormGoogleSyncEnabled(!!item.google_sync_enabled);
    setFormIsActive(item.is_active);

    // Map working hours to schedule state
    const newSchedule: Record<string, { enabled: boolean; start: string; end: string }> = {};
    DAYS_OF_WEEK.forEach(day => {
      const slots = item.working_hours?.[day.key] || [];
      if (slots.length > 0) {
        newSchedule[day.key] = { enabled: true, start: slots[0].start || '09:00', end: slots[0].end || '17:00' };
      } else {
        newSchedule[day.key] = { enabled: false, start: '09:00', end: '17:00' };
      }
    });
    setFormSchedule(newSchedule);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error(t('toastNameRequired') || 'Name is required');
      return;
    }

    setSaving(true);
    try {
      // Build working hours JSON
      const formattedWorkingHours: Record<string, { start: string; end: string }[]> = {};
      Object.entries(formSchedule).forEach(([day, config]) => {
        if (config.enabled) {
          formattedWorkingHours[day] = [{ start: config.start, end: config.end }];
        } else {
          formattedWorkingHours[day] = [];
        }
      });

      const payload = {
        name: formName.trim(),
        title: formTitle.trim() || null,
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        type: 'staff',
        color: formColor,
        google_calendar_id: formGoogleCalendarId.trim() || null,
        google_sync_enabled: formGoogleSyncEnabled,
        is_active: formIsActive,
        working_hours: formattedWorkingHours,
      };

      const url = editingId ? `/staff/${editingId}` : '/staff';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingId ? (t('toastUpdated') || 'Updated successfully') : (t('toastCreated') || 'Created successfully'));
        setShowModal(false);
        resetForm();
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.message || (t('toastSaveError') || 'Failed to save staff member'));
      }
    } catch {
      toast.error(t('toastSaveError') || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/staff/${id}/toggle-status`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success(t('toastStatusUpdated') || 'Status updated');
        fetchStaff();
      }
    } catch {
      toast.error(t('toastStatusError') || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/staff/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(t('toastDeleted') || 'Deleted successfully');
        setDeleteTargetId(null);
        fetchStaff();
      } else {
        toast.error(t('toastDeleteError') || 'Failed to delete');
      }
    } catch {
      toast.error(t('toastDeleteError') || 'Failed to delete');
    }
  };

  const filteredStaff = staffList.filter(item => {
    if (statusFilter === 'active' && !item.is_active) return false;
    if (statusFilter === 'inactive' && item.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchPhone = item.phone?.toLowerCase().includes(q);
      const matchCal = item.google_calendar_id?.toLowerCase().includes(q);
      return matchName || matchTitle || matchEmail || matchPhone || matchCal;
    }
    return true;
  });

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 font-sans text-black animate-fade-in select-none flex flex-col min-h-0 flex-1 overflow-y-auto">
      
      {/* Standard Action Toolbar Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 select-none">
        
        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-lg">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder') || 'Search staff name, role, email...'}
              className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
            />
          </form>

          <DropdownSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'all', label: t('allStatus') || 'All Status' },
              { value: 'active', label: t('activeOnly') || 'Active Only' },
              { value: 'inactive', label: t('inactiveOnly') || 'Inactive' },
            ]}
            className="w-full sm:w-auto min-w-[130px]"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('addStaffBtn') || 'Add Staff Member'}</span>
          </button>
        </div>
      </div>

      {/* Staff Cards Content */}
      {loading ? (
        <div className="py-12">
          <SimpleLoader borderless={true} message={t('loadingStaff') || 'Loading staff directory...'} />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 border border-[#E8E8E6] rounded-[10px] bg-white flex flex-col items-center justify-center p-6 select-none animate-row-fade shadow-3xs">
          <div className="h-10 w-10 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center text-zinc-400 mb-3">
            <UserCheck className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t('noStaffFound') || 'No Staff Members Found'}</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4 leading-relaxed font-medium">
            {t('noStaffDesc') || 'Add staff members so customers can book appointments with them.'}
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 h-9 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('addStaffBtn') || 'Add Staff Member'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((item) => {
            const activeDaysCount = Object.values(item.working_hours || {}).filter(s => s && s.length > 0).length;

            return (
              <div 
                key={item.id}
                className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between space-y-4 text-left animate-row-fade"
              >
                <div>
                  {/* Top Bar: Color Chip, Name & Optional Google Sync Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span 
                        className="h-3 w-3 rounded-full shrink-0 shadow-3xs" 
                        style={{ backgroundColor: item.color || '#10B981' }} 
                      />
                      <h3 className="text-sm font-extrabold text-black tracking-tight truncate">
                        {item.name}
                      </h3>
                    </div>

                    {item.google_sync_enabled && item.google_calendar_id && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#E8E8E6] text-black shadow-3xs shrink-0" title={`Google Calendar: ${item.google_calendar_id}`}>
                        <img src="/google_calendar.webp" alt="Google Calendar" className="h-3 w-3 object-contain" />
                        <span>{t('googleSync')}</span>
                      </span>
                    )}
                  </div>

                  {/* Role / Designation */}
                  {item.title && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-[#6B6B6B]">
                        {item.title}
                      </p>
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600 font-medium">
                    {item.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    {item.google_calendar_id && item.google_sync_enabled && (
                      <div className="flex items-center gap-2 text-zinc-700 truncate pt-0.5">
                        <img src="/google_calendar.webp" alt="Google Calendar" className="h-3.5 w-3.5 object-contain shrink-0" />
                        <span className="truncate text-[11px] font-medium text-black">{item.google_calendar_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Working Hours Badge */}
                  <div className="mt-4 pt-3 border-t border-[#FAFAFA] flex items-center justify-between text-[11px] text-zinc-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      {t('availability') || 'Availability'}:
                    </span>
                    <span className="text-black font-bold">
                      {activeDaysCount > 0 ? `${activeDaysCount} ${t('daysPerWeek') || 'days / week'}` : (t('noSlotsSet') || 'Custom')}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="pt-3 border-t border-[#F0F0F0] flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 h-8 px-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>{tCommon('edit') || 'Edit'}</span>
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    className="h-8 px-3 border border-red-100 hover:bg-red-50 text-red-650 hover:text-red-700 rounded-[6px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                    title={tCommon('delete') || 'Delete'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal Dialog — Strict WhatsOmni Design System Guidelines */}
      {showModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowModal(false)}
        >
          <form 
            onSubmit={handleSave}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Connected End-to-End Divider) */}
            <div className="px-6 py-5 border-b border-[#E8E8E6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <UserCheck className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {editingId ? (t('editTitle') || 'Edit Staff Member') : (t('createTitle') || 'Add Staff Member')}
                  </h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">
                    {t('modalSubtitle') || 'Configure staff availability, Google Calendar sync, and contact details.'}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body — Clean, uncropped, zero inner padding conflict */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
              
              {/* Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('staffNameLabel') || 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('staffTitleLabel') || 'Role / Designation'}
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Consultant / Representative"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('emailLabel') || 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('phoneLabel') || 'Phone / WhatsApp'}
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Google Calendar Sync Integration Card with Official Logo */}
              <div className="p-4 bg-white border border-[#E8E8E6] rounded-xl space-y-3 shadow-3xs hover:border-[#D0D0CE] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white border border-[#E8E8E6] flex items-center justify-center p-1.5 shrink-0 shadow-3xs">
                      <img src="/google_calendar.webp" alt="Google Calendar" className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-black flex items-center gap-1.5">
                        <span>{t('googleCalendarIntegration') || 'Google Calendar Sync'}</span>
                      </div>
                      <div className="text-[11px] text-[#6B6B6B] font-medium mt-0.5">
                        {t('enableGoogleSync') || 'Sync with Google Calendar'}
                      </div>
                    </div>
                  </div>

                  {/* iOS / shadcn Style Animated Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formGoogleSyncEnabled}
                    onClick={() => setFormGoogleSyncEnabled(!formGoogleSyncEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formGoogleSyncEnabled ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E5]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formGoogleSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formGoogleSyncEnabled && (
                  <div className="pt-3 border-t border-[#F0F0F0] space-y-2.5 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
                        {t('googleCalendarIdLabel') || 'Staff Google Calendar ID / Email'}
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 flex items-center pointer-events-none">
                          <img src="/google_calendar.webp" alt="" className="h-4 w-4 object-contain opacity-80" />
                        </div>
                        <input
                          type="text"
                          value={formGoogleCalendarId}
                          onChange={(e) => setFormGoogleCalendarId(e.target.value)}
                          placeholder="e.g. primary or sarah@company.com"
                          className="w-full h-9 pl-9 pr-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#6B6B6B] leading-relaxed font-medium">
                      {t('googleSyncHelper') || 'Appointments booked for this staff member will automatically sync to their Google Calendar, and conflicting events will block overlapping time slots.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Calendar Identification Color */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                  {t('calendarColorLabel') || 'Calendar Badge Color'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`h-7 w-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        formColor === c 
                          ? 'ring-2 ring-black ring-offset-2 scale-110 shadow-3xs' 
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {formColor === c && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Working Schedule — Professional Day-by-Day Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">
                    {t('scheduleTitle') || 'Weekly Working Hours Availability'}
                  </label>
                </div>
                
                <div className="border border-[#E8E8E6] rounded-xl overflow-hidden divide-y divide-[#F0F0F0] bg-white shadow-3xs">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayConfig = formSchedule[day.key] || { enabled: false, start: '09:00', end: '17:00' };

                    return (
                      <div key={day.key} className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-[#FAFAFA]/50 transition-colors">
                        
                        {/* Day Checkbox & Label */}
                        <div className="flex items-center gap-2.5 min-w-[130px]">
                          <input
                            type="checkbox"
                            id={`day-${day.key}`}
                            checked={dayConfig.enabled}
                            onChange={(e) => {
                              setFormSchedule(prev => ({
                                ...prev,
                                [day.key]: { ...dayConfig, enabled: e.target.checked }
                              }));
                            }}
                            className="h-4 w-4 rounded border-[#E8E8E6] text-black focus:ring-black cursor-pointer"
                          />
                          <label
                            htmlFor={`day-${day.key}`}
                            className={`text-xs font-bold cursor-pointer transition-colors ${dayConfig.enabled ? 'text-black' : 'text-zinc-400'}`}
                          >
                            {day.label}
                          </label>
                        </div>

                        {/* Working Hours Input Fields */}
                        {dayConfig.enabled ? (
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center">
                              <input
                                type="time"
                                value={dayConfig.start}
                                onChange={(e) => {
                                  setFormSchedule(prev => ({
                                    ...prev,
                                    [day.key]: { ...dayConfig, start: e.target.value }
                                  }));
                                }}
                                className="h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors"
                              />
                            </div>
                            <span className="text-zinc-400 text-xs font-bold">-</span>
                            <div className="relative flex items-center">
                              <input
                                type="time"
                                value={dayConfig.end}
                                onChange={(e) => {
                                  setFormSchedule(prev => ({
                                    ...prev,
                                    [day.key]: { ...dayConfig, end: e.target.value }
                                  }));
                                }}
                                className="h-8 px-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-50 border border-zinc-100">
                            {t('dayOff') || 'Unavailable'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer Action Strip — Fixed, uncropped, standard WhatsOmni design */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E6] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-9 px-4 text-xs font-medium text-[#6B6B6B] hover:text-black bg-white border border-[#E8E8E6] rounded-[6px] transition-all cursor-pointer shadow-3xs hover:bg-zinc-50"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-5 bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-bold rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (editingId ? (tCommon('save') || 'Save Changes') : (t('addBtn') || 'Add Staff Member'))}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal — Consistent Standard Design */}
      {deleteTargetId !== null && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteTargetId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-650" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{tCommon('delete') || 'Delete'}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('confirmDelete') || 'Are you sure you want to remove this staff member? Associated past appointments will remain in your history.'}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetId !== null) {
                    handleDelete(deleteTargetId);
                  }
                }}
                className="h-9 px-4 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {tCommon('delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
