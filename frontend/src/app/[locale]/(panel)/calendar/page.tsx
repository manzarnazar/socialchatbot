'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithCsrf } from '@/lib/api';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Link as LinkIcon,
  X
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { DropdownSelect } from '@/components/ui/dropdown-select';

interface StaffMemberItem {
  id: number;
  name: string;
  email: string | null;
  title: string | null;
  type: 'staff' | 'resource';
  color: string | null;
}

interface BookingLink {
  id: number;
  name: string;
  slug: string;
  staff_id?: number | null;
  user_id?: number | null;
  assign_mode?: 'single' | 'round_robin' | 'collective' | 'select_resource';
  description: string | null;
  duration: number;
  buffer_before: number;
  buffer_after: number;
  is_active: boolean;
  location_type?: 'none' | 'google_meet' | 'zoom' | 'teams' | 'custom';
  custom_location?: string;
  staff?: StaffMemberItem;
}

interface Appointment {
  id: number;
  contact_id: number;
  booking_link_id: number | null;
  staff_id?: number | null;
  user_id?: number | null;
  resource_name?: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes: string | null;
  contact?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  staff?: StaffMemberItem;
  booking_link?: BookingLink;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export default function CalendarPage() {
  const t = useTranslations('Calendar');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<'view' | 'appointments' | 'links'>('view');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberItem[]>([]);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');

  // Month navigation in Calendar View tab
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedViewDate, setSelectedViewDate] = useState<Date>(new Date());

  // Modals state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [deleteTargetLinkId, setDeleteTargetLinkId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form states: New Appointment
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [appStartTime, setAppStartTime] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [savingApp, setSavingApp] = useState(false);

  // Form states: New Booking Link
  const [linkId, setLinkId] = useState<number | null>(null);
  const [linkName, setLinkName] = useState('');
  const [linkSlug, setLinkSlug] = useState('');
  const [linkStaffId, setLinkStaffId] = useState('');
  const [linkAssignMode, setLinkAssignMode] = useState('single');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkDuration, setLinkDuration] = useState(30);
  const [linkBufferBefore, setLinkBufferBefore] = useState(0);
  const [linkBufferAfter, setLinkBufferAfter] = useState(0);
  const [savingLink, setSavingLink] = useState(false);
  const [linkLocationType, setLinkLocationType] = useState('none');
  const [linkCustomLocation, setLinkCustomLocation] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const appRes = await fetchWithCsrf('/appointments');
      if (appRes.ok) {
        const data = await appRes.json();
        setAppointments(data.appointments || []);
        if (data.staff_members) {
          setStaffMembers(data.staff_members);
        }
      }

      const linkRes = await fetchWithCsrf('/booking-links');
      if (linkRes.ok) {
        const data = await linkRes.json();
        setBookingLinks(data.booking_links || []);
        if (data.staff_members && (!staffMembers || staffMembers.length === 0)) {
          setStaffMembers(data.staff_members);
        }
      }

      const staffRes = await fetchWithCsrf('/staff');
      if (staffRes.ok) {
        const data = await staffRes.json();
        if (data.staff) {
          setStaffMembers(data.staff);
        }
      }

      const contactRes = await fetchWithCsrf('/contacts');
      if (contactRes.ok) {
        const data = await contactRes.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('toastLoadCalendarDetailsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (slug: string) => {
    const publicUrl = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedSlug(slug);
    toast.success(t('toastLinkCopied'));
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !appStartTime) {
      toast.error(t('toastSpecifyContactAndDateTime'));
      return;
    }

    setSavingApp(true);
    try {
      const res = await fetchWithCsrf('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: selectedContactId,
          booking_link_id: selectedLinkId || null,
          staff_id: selectedStaffId ? parseInt(selectedStaffId) : null,
          start_time: appStartTime,
          notes: appNotes
        })
      });

      if (res.ok) {
        toast.success(t('toastAppointmentBooked'));
        setShowAppointmentModal(false);
        // Reset
        setSelectedContactId('');
        setSelectedLinkId('');
        setSelectedStaffId('');
        setAppStartTime('');
        setAppNotes('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastReserveConflict'));
      }
    } catch {
      toast.error(t('toastReserveError'));
    } finally {
      setSavingApp(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/appointments/${id}/cancel`, {
        method: 'PUT'
      });
      if (res.ok) {
        toast.success(t('toastAppointmentCancelled'));
        fetchData();
      } else {
        toast.error(t('toastCancelFailed'));
      }
    } catch {
      toast.error(t('toastCancelError'));
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName || !linkSlug) {
      toast.error(t('toastCompleteFields'));
      return;
    }

    setSavingLink(true);
    try {
      const res = await fetchWithCsrf('/booking-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: linkId,
          name: linkName,
          slug: linkSlug,
          staff_id: linkStaffId ? parseInt(linkStaffId) : null,
          assign_mode: linkAssignMode,
          description: linkDesc,
          duration: linkDuration,
          buffer_before: linkBufferBefore,
          buffer_after: linkBufferAfter,
          location_type: linkLocationType,
          custom_location: linkCustomLocation,
        })
      });

      if (res.ok) {
        toast.success(t('toastConfigSaved'));
        setShowLinkModal(false);
        // Reset
        setLinkId(null);
        setLinkName('');
        setLinkSlug('');
        setLinkStaffId('');
        setLinkAssignMode('single');
        setLinkDesc('');
        setLinkDuration(30);
        setLinkBufferBefore(0);
        setLinkBufferAfter(0);
        setLinkLocationType('none');
        setLinkCustomLocation('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastSaveConfigError'));
      }
    } catch {
      toast.error(t('toastSaveConfigError'));
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/booking-links/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(t('toastDeleteConfigSuccess'));
        fetchData();
      } else {
        toast.error(t('toastDeleteConfigFailed'));
      }
    } catch {
      toast.error(t('toastDeleteConfigError'));
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateDays = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = new Date(year, month, 1).getDay();

    const arr = [];
    for (let i = 0; i < firstDayIndex; i++) {
      arr.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(year, month, i));
    }
    return arr;
  };

  const navigateMonth = (direction: 'next' | 'prev') => {
    const temp = new Date(viewMonth);
    if (direction === 'next') {
      temp.setMonth(temp.getMonth() + 1);
    } else {
      temp.setMonth(temp.getMonth() - 1);
    }
    setViewMonth(temp);
  };

  const filteredAppointments = appointments.filter(app => {
    if (selectedStaffFilter === 'all') return true;
    return app.staff_id?.toString() === selectedStaffFilter || app.user_id?.toString() === selectedStaffFilter;
  });

  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(app => {
      const d = new Date(app.start_time);
      return d.getDate() === date.getDate() &&
             d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear() &&
             app.status === 'scheduled';
    });
  };

  return (
    <div className="w-full font-sans text-black animate-fade-in select-none flex flex-col min-h-0 flex-1">
      
      {/* Navigation Toolbar & Segment Switcher */}
      <div className="px-8 py-4 border-b border-[#E8E8E6] flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none bg-white shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-lg border border-[#E8E8E6] select-none w-fit shrink-0 overflow-x-auto overflow-y-hidden max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('view')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'view'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('calendarView')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'appointments'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('appointmentsTab', { count: filteredAppointments.filter(a => a.status === 'scheduled').length })}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${
                activeTab === 'links'
                  ? 'bg-white text-zinc-950 shadow-3xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>{t('schedulingLinksTab', { count: bookingLinks.length })}</span>
            </button>
          </div>

          {/* Staff Filter Selector */}
          {activeTab !== 'links' && staffMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {t('filterStaff') || 'Staff'}:
              </span>
              <div className="w-48">
                <DropdownSelect
                  value={selectedStaffFilter}
                  onChange={(val) => setSelectedStaffFilter(val)}
                  options={[
                    { value: 'all', label: t('allStaff') || 'All Staff Members' },
                    ...staffMembers.map(m => ({ 
                      value: m.id.toString(), 
                      label: `${m.name}${m.title ? ` (${m.title})` : ''}` 
                    }))
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          {activeTab === 'links' ? (
            <button
              onClick={() => {
                setLinkId(null);
                setLinkName('');
                setLinkSlug('');
                setLinkStaffId('');
                setLinkAssignMode('single');
                setLinkDesc('');
                setLinkDuration(30);
                setLinkBufferBefore(0);
                setLinkBufferAfter(0);
                setShowLinkModal(true);
              }}
              className="bg-[#0A0A0A] hover:bg-zinc-900 text-white text-xs font-bold px-4 h-9 rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> {t('newLink')}
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedStaffId('');
                setShowAppointmentModal(true);
              }}
              className="bg-[#0A0A0A] hover:bg-zinc-900 text-white text-xs font-bold px-4 h-9 rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> {t('bookAppointment')}
            </button>
          )}
        </div>
      </div>

      {/* Tab body content directly rendered */}
      <div className="p-8 flex-1 overflow-y-auto space-y-6">
        {loading ? (
          <SimpleLoader message={t('syncing') || 'Syncing calendar states...'} />
        ) : (
            <>
              {/* 1. CALENDAR VIEW TAB */}
              {activeTab === 'view' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Side: Monthly Calendar Board */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E8E8E6] pb-3 select-none">
                      <span className="text-xs font-bold text-black uppercase tracking-wider">
                        {viewMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigateMonth('prev')}
                          className="p-1.5 border border-[#E8E8E6] rounded-md bg-white hover:bg-zinc-50 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4 text-zinc-650" />
                        </button>
                        <button
                          onClick={() => navigateMonth('next')}
                          className="p-1.5 border border-[#E8E8E6] rounded-md bg-white hover:bg-zinc-50 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4 text-zinc-650" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-extrabold text-[#6B6B6B] uppercase tracking-wider py-1 select-none">
                      {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, dIdx) => {
                        const dayDate = new Date(2026, 6, 12 + dIdx); // July 12, 2026 is a Sunday
                        return (
                          <div key={day}>{dayDate.toLocaleDateString(locale, { weekday: 'short' })}</div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {generateDays().map((d, idx) => {
                        if (!d) return <div key={`empty-${idx}`} className="aspect-square bg-[#FAFAFA]/40 border border-[#E8E8E6]/40 rounded-[8px]" />;

                        const dateApps = getAppointmentsForDate(d);
                        const isSelected = selectedViewDate.toDateString() === d.toDateString();
                        const isToday = d.toDateString() === new Date().toDateString();

                        return (
                          <button
                            key={d.getTime()}
                            onClick={() => setSelectedViewDate(d)}
                            type="button"
                            className={`aspect-square w-full rounded-[8px] border text-left p-2 flex flex-col justify-between transition-all cursor-pointer relative ${
                              isSelected 
                                ? 'border-zinc-950 bg-zinc-955 text-white shadow-sm' 
                                : isToday
                                ? 'border-[#4AE54A] bg-[#E8FDE8]/30 hover:bg-[#E8FDE8]/50 text-zinc-955'
                                : 'border-[#E8E8E6] bg-white hover:bg-[#FAFAFA] text-zinc-800'
                            }`}
                          >
                            <span className="text-[11px] font-bold">{d.getDate()}</span>
                            {dateApps.length > 0 && (
                              <span className={`h-1.5 w-1.5 rounded-full self-end ${
                                isSelected ? 'bg-white' : 'bg-[#4AE54A]'
                              }`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Side: Selected Date Daily Timeline details */}
                  <div className="lg:col-span-4 border border-[#E8E8E6] rounded-xl bg-[#FAFAFA]/40 p-5 space-y-4">
                    <div className="border-b border-[#E8E8E6] pb-2.5">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                        {t('scheduleDetails')}
                      </span>
                      <h4 className="text-xs font-bold text-black uppercase mt-1">
                        {selectedViewDate.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </h4>
                    </div>

                    {(() => {
                      const dayApps = getAppointmentsForDate(selectedViewDate);
                      if (dayApps.length === 0) {
                        return (
                          <div className="py-12 text-center text-[10px] text-[#6B6B6B] font-semibold">
                            {t('noReservations')}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {dayApps.map((app) => (
                            <div key={app.id} className="border border-[#E8E8E6] bg-white rounded-lg p-3.5 space-y-2.5 relative shadow-3xs">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-bold text-zinc-950 text-xs">
                                    {app.contact ? `${app.contact.first_name} ${app.contact.last_name}` : 'Unknown Contact'}
                                  </div>
                                  <div className="text-[10px] text-[#6B6B6B]">
                                    {app.contact?.email || 'No email info'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setCancelTargetId(app.id)}
                                  className="text-red-650 hover:text-red-750 transition-colors p-1"
                                  title={t('cancelAppointment')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-550 font-bold border-t border-[#FAFAFA] pt-2 justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-zinc-400" />
                                  <span>
                                    {new Date(app.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(app.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {app.staff && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-zinc-650 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: app.staff.color || '#10B981' }} />
                                    <span>{app.staff.name}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              )}

              {/* 2. APPOINTMENTS TAB */}
              {activeTab === 'appointments' && (
                <div className="space-y-4">
                  {filteredAppointments.length === 0 ? (
                    <div className="w-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('noAppointmentsBooked')}</h3>
                        <p className="text-[10px] text-[#6B6B6B] max-w-xs mx-auto mt-1 font-semibold leading-relaxed">
                          {t('noAppointmentsDesc')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E8E8E6] rounded-2xl overflow-hidden shadow-3xs">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="bg-[#FAFAFA] border-b border-[#E8E8E6] text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                            <th className="p-4">{t('contactHeader')}</th>
                            <th className="p-4">{t('staffHeader') || 'Assigned Staff'}</th>
                            <th className="p-4">{t('typeHeader')}</th>
                            <th className="p-4">{t('startsAtHeader')}</th>
                            <th className="p-4">{t('endsAtHeader')}</th>
                            <th className="p-4">{t('statusHeader')}</th>
                            <th className="p-4 text-right">{tCommon('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E6]">
                          {filteredAppointments.map((app) => (
                            <tr key={app.id} className="hover:bg-neutral-50/50">
                              <td className="p-4">
                                <div className="font-semibold text-zinc-955">
                                  {app.contact ? `${app.contact.first_name} ${app.contact.last_name}` : t('unknownContact')}
                                </div>
                                <div className="text-[10px] text-[#6B6B6B]">
                                  {app.contact?.email || t('noEmailTab')}
                                </div>
                              </td>
                              <td className="p-4 text-zinc-700 font-medium">
                                {app.staff ? (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: app.staff.color || '#10B981' }} />
                                    <span>{app.staff.name}</span>
                                    {app.staff.title && <span className="text-zinc-400 text-[10px]">({app.staff.title})</span>}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 text-[10px] italic">
                                    {app.resource_name || t('unassignedStaff') || 'General / Unassigned'}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-zinc-650 font-medium">
                                {app.booking_link ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {app.booking_link.name}
                                  </span>
                                ) : (
                                  t('manualReservation')
                                )}
                              </td>
                              <td className="p-4 font-semibold text-zinc-700">
                                {new Date(app.start_time).toLocaleString(locale)}
                              </td>
                              <td className="p-4 text-zinc-500">
                                {new Date(app.end_time).toLocaleString(locale)}
                              </td>
                              <td className="p-4">
                                {app.status === 'scheduled' && (
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 rounded text-[9px] font-bold uppercase tracking-wider">
                                    {t('active')}
                                  </span>
                                )}
                                {app.status === 'cancelled' && (
                                  <span className="bg-red-50 text-red-700 px-2 py-0.5 border border-red-200 rounded text-[9px] font-bold uppercase tracking-wider">
                                    {t('cancelled')}
                                  </span>
                                )}
                                {app.status === 'completed' && (
                                  <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 border border-zinc-200 rounded text-[9px] font-bold uppercase tracking-wider">
                                    {t('done')}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                {app.status === 'scheduled' && (
                                  <button
                                    onClick={() => setCancelTargetId(app.id)}
                                    className="px-2.5 py-1 border border-red-100 hover:bg-red-50 text-red-650 hover:text-red-700 rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center"
                                  >
                                    {tCommon('cancel')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. SCHEDULING LINKS TAB */}
              {activeTab === 'links' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingLinks.length === 0 ? (
                    <div className="col-span-full border border-dashed border-[#E8E8E6] rounded-2xl p-12 text-center bg-white space-y-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mx-auto text-zinc-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('noSchedulingLinks')}</h3>
                        <p className="text-[10px] text-[#6B6B6B] max-w-xs mx-auto mt-1 font-semibold leading-relaxed">
                          {t('noSchedulingLinksDesc')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    bookingLinks.map((link) => (
                      <div key={link.id} className="border border-[#E8E8E6] rounded-2xl p-5 bg-white text-left flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-[#E8E8E6] p-2 flex items-center justify-center shrink-0">
                              <Clock className="h-4 w-4 text-zinc-650" />
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              link.is_active 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                            }`}>
                              {link.is_active ? t('activeStatus') : t('mutedStatus')}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-extrabold text-xs text-black uppercase tracking-wider">{link.name}</h4>
                            <p className="text-[10px] text-[#6B6B6B] leading-relaxed line-clamp-2">
                              {link.description || t('noCustomDescription')}
                            </p>
                          </div>

                          {link.staff && (
                            <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: link.staff.color || '#10B981' }} />
                              <span>{t('hostLabel')}: {link.staff.name} {link.staff.title ? `(${link.staff.title})` : ''}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-semibold text-zinc-550 border-t border-[#FAFAFA] pt-3">
                            <div>{t('durationMinLabel')}: <span className="text-zinc-950 font-bold">{link.duration}m</span></div>
                            <div>{tCommon('buffers')}: <span className="text-zinc-950 font-bold">{link.buffer_before}m / {link.buffer_after}m</span></div>
                          </div>
                        </div>

                        <div className="border-t border-[#F0F0F0] pt-4 mt-5 flex gap-2">
                          <button
                            onClick={() => handleCopy(link.slug)}
                            className="flex-1 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                          >
                            {copiedSlug === link.slug ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> {t('copied')}
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> {t('copyLink')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setLinkId(link.id);
                              setLinkName(link.name);
                              setLinkSlug(link.slug);
                              setLinkStaffId(link.staff_id ? link.staff_id.toString() : '');
                              setLinkAssignMode(link.assign_mode || 'single');
                              setLinkDesc(link.description || '');
                              setLinkDuration(link.duration);
                              setLinkBufferBefore(link.buffer_before);
                              setLinkBufferAfter(link.buffer_after);
                              setLinkLocationType(link.location_type || 'none');
                              setLinkCustomLocation(link.custom_location || '');
                              setShowLinkModal(true);
                            }}
                            className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => setDeleteTargetLinkId(link.id)}
                            className="px-2 py-1.5 border border-red-100 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-[6px] transition-all cursor-pointer text-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

      {/* Manual Appointment Modal */}
      {showAppointmentModal && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowAppointmentModal(false)}
        >
          <form 
            onSubmit={handleCreateAppointment}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <CalendarIcon className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('bookManualAppointment')}</h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">{t('reserveSlotDesc')}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAppointmentModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('selectContactLabel')}</label>
                <DropdownSelect
                  value={selectedContactId}
                  onChange={(val) => setSelectedContactId(val)}
                  options={[
                    { value: '', label: t('selectContactPlaceholder') },
                    ...contacts.map(c => ({ value: c.id.toString(), label: `${c.first_name} ${c.last_name} (${c.email || c.phone})` }))
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('assignedStaff') || 'Assigned Staff Member'}</label>
                <DropdownSelect
                  value={selectedStaffId}
                  onChange={(val) => setSelectedStaffId(val)}
                  options={[
                    { value: '', label: t('autoAssignStaff') || 'Auto Assign / Current User' },
                    ...staffMembers.map(m => ({ 
                      value: m.id.toString(), 
                      label: `${m.name}${m.title ? ` (${m.title})` : ''}` 
                    }))
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('serviceTypeLabel')}</label>
                <DropdownSelect
                  value={selectedLinkId}
                  onChange={(val) => setSelectedLinkId(val)}
                  options={[
                    { value: '', label: t('manualBlockOption') },
                    ...bookingLinks.map(l => ({ value: l.id.toString(), label: `${l.name} (${l.duration} mins)` }))
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('startDateLabel')}</label>
                <input
                  type="datetime-local"
                  value={appStartTime}
                  onChange={(e) => setAppStartTime(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('internalNotesLabel')}</label>
                <textarea
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  className="w-full min-h-[70px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                  placeholder={t('notesPlaceholder')}
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setShowAppointmentModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingApp}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
              >
                {savingApp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('confirmBooking')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Booking Link Modal */}
      {showLinkModal && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setShowLinkModal(false)}
        >
          <form 
            onSubmit={handleCreateLink}
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    {linkId ? t('configureBookingPage') : t('createBookingPage')}
                  </h3>
                  <p className="text-[10px] text-[#6B6B6B] font-semibold mt-0.5">{t('customizePropertiesDesc')}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowLinkModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('meetingNameLabel')}</label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder={t('meetingNamePlaceholder')}
                  className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('pathUrlSlugLabel')}</label>
                <div className="flex items-center">
                  <span className="bg-[#FAFAFA] border border-[#E8E8E6] border-r-0 h-9 px-2 text-[10px] text-zinc-400 flex items-center font-mono rounded-l-md select-none">
                    /book/
                  </span>
                  <input
                    type="text"
                    value={linkSlug}
                    onChange={(e) => setLinkSlug(e.target.value)}
                    placeholder="consultation"
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-r-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('assignedHost') || 'Assigned Host / Staff Member'}</label>
                <DropdownSelect
                  value={linkStaffId}
                  onChange={(val) => setLinkStaffId(val)}
                  options={[
                    { value: '', label: t('allStaffRoundRobin') || 'Team / Round Robin Pool' },
                    ...staffMembers.map(m => ({ 
                      value: m.id.toString(), 
                      label: `${m.name}${m.title ? ` (${m.title})` : ''}` 
                    }))
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('assignmentMode') || 'Assignment Mode'}</label>
                <DropdownSelect
                  value={linkAssignMode}
                  onChange={(val) => setLinkAssignMode(val)}
                  options={[
                    { value: 'single', label: t('singleHost') || 'Single Assigned Host' },
                    { value: 'round_robin', label: t('roundRobinMode') || 'Round Robin (Auto Distribute)' },
                    { value: 'select_resource', label: t('selectResourceMode') || 'Customer Selects Staff Member' }
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('descriptionLabel')}</label>
                <textarea
                  value={linkDesc}
                  onChange={(e) => setLinkDesc(e.target.value)}
                  placeholder={t('agendaPlaceholder')}
                  className="w-full min-h-[50px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('locationTypeLabel')}</label>
                <DropdownSelect
                  value={linkLocationType}
                  onChange={(val) => setLinkLocationType(val)}
                  options={[
                    { value: 'none', label: t('offlineAddressOption') },
                    { value: 'google_meet', label: t('googleMeetOption') },
                    { value: 'zoom', label: t('zoomOption') },
                    { value: 'teams', label: t('teamsOption') },
                    { value: 'custom', label: t('customLocationOption') }
                  ]}
                />
              </div>

              {linkLocationType === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('customLocationLabel')}</label>
                  <input
                    type="text"
                    value={linkCustomLocation}
                    onChange={(e) => setLinkCustomLocation(e.target.value)}
                    placeholder={t('customLocationPlaceholder')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('durationMinLabel')}</label>
                  <input
                    type="number"
                    value={linkDuration}
                    onChange={(e) => setLinkDuration(parseInt(e.target.value))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    min="5"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('bufferBeforeLabel')}</label>
                  <input
                    type="number"
                    value={linkBufferBefore}
                    onChange={(e) => setLinkBufferBefore(parseInt(e.target.value))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('bufferAfterLabel')}</label>
                  <input
                    type="number"
                    value={linkBufferAfter}
                    onChange={(e) => setLinkBufferAfter(parseInt(e.target.value))}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none font-bold">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingLink}
                className="h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
              >
                {savingLink ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('saveConfigurations')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Cancel Appointment Confirmation Dialog */}
      {cancelTargetId !== null && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setCancelTargetId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-650" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('cancelAppointment')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('confirmCancelAppointment')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelTargetId !== null) {
                    handleCancelAppointment(cancelTargetId);
                    setCancelTargetId(null);
                  }
                }}
                className="h-9 px-4 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {t('cancelAppointment')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Booking Link Confirmation Dialog */}
      {deleteTargetLinkId !== null && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteTargetLinkId(null)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-md w-full p-6 shadow-xl relative z-50 animate-modal-box text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
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
                onClick={() => setDeleteTargetLinkId(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('confirmDeleteConfig')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteTargetLinkId(null)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetLinkId !== null) {
                    handleDeleteLink(deleteTargetLinkId);
                    setDeleteTargetLinkId(null);
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
