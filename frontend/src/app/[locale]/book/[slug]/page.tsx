'use client';

import React, { useEffect, useState, use } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  User, 
  Mail, 
  Phone, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface Props {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

interface BookingLinkDetails {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  tenant_name: string;
  staff?: { id: number; name: string; title?: string | null; email?: string | null; color?: string | null };
  assign_mode?: string;
  available_staff?: { id: number; name: string; title?: string | null; email?: string | null; color?: string | null }[];
}

export default function PublicBookingPage({ params }: Props) {
  const { slug } = use(params);
  const t = useTranslations('Calendar');
  const tCommon = useTranslations('Common');

  const [loading, setLoading] = useState(true);
  const [linkDetails, setLinkDetails] = useState<BookingLinkDetails | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  // Date selection states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Slots states
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Step navigation
  const [step, setStep] = useState<'datetime' | 'form' | 'success'>('datetime');
  
  // User Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchLinkDetails();
  }, [slug]);

  const fetchLinkDetails = async () => {
    try {
      const res = await fetchWithCsrf(`/public/booking-links/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setLinkDetails(data.booking_link);
        if (data.booking_link?.staff) {
          setSelectedStaffId(data.booking_link.staff.id.toString());
        } else if (data.booking_link?.available_staff?.length > 0) {
          setSelectedStaffId(data.booking_link.available_staff[0].id.toString());
        }
      } else {
        toast.error(t('toastLinkInactive'));
      }
    } catch {
      toast.error(t('toastFetchPrefsError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (date: Date, staffId?: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const dateString = date.toISOString().split('T')[0];
      const targetStaff = staffId !== undefined ? staffId : selectedStaffId;
      const staffQuery = targetStaff ? `&staff_id=${targetStaff}` : '';
      const res = await fetchWithCsrf(`/public/booking-links/${slug}?date=${dateString}${staffQuery}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      toast.error(t('toastLoadSlotsFailed'));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchSlots(date, selectedStaffId);
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (selectedDate) {
      fetchSlots(selectedDate, staffId);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBooking(true);
    try {
      const res = await fetchWithCsrf(`/public/booking-links/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          start_time: selectedSlot,
          staff_id: selectedStaffId ? parseInt(selectedStaffId) : undefined,
          notes
        })
      });

      if (res.ok) {
        setStep('success');
      } else {
        const err = await res.json();
        toast.error(err.message || t('toastBookingOverlap'));
      }
    } catch {
      toast.error(t('toastBookingError'));
    } finally {
      setBooking(false);
    }
  };

  // Simple Month Helper
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = new Date(year, month, 1).getDay();

    const arr = [];
    // padding for offsets
    for (let i = 0; i < firstDayIndex; i++) {
      arr.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(year, month, i));
    }
    return arr;
  };

  const navigateMonth = (direction: 'next' | 'prev') => {
    const temp = new Date(currentMonth);
    if (direction === 'next') {
      temp.setMonth(temp.getMonth() + 1);
    } else {
      temp.setMonth(temp.getMonth() - 1);
    }
    setCurrentMonth(temp);
  };

  const getFormatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-xs text-[#6B6B6B]">
        <RefreshCw className="h-4 w-4 animate-spin text-zinc-400 mr-2" /> {t('loadSchedulePrefs')}
      </div>
    );
  }

  if (!linkDetails) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-center p-6">
        <div className="max-w-md space-y-4">
          <h2 className="text-sm font-bold text-black uppercase tracking-wider">{t('invalidBookingLink')}</h2>
          <p className="text-xs text-[#6B6B6B] font-semibold leading-relaxed">
            {t('linkDisabledDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-sans text-black relative flex flex-col items-center justify-center py-12 px-4 selection:bg-[#E8FDE8] selection:text-emerald-800">
      
      {/* Background Spotlight Glow strictly following design guidelines */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(74,229,74,0.05)_0%,transparent_70%)] pointer-events-none select-none z-0" />

      <div className="max-w-4xl w-full bg-white border border-[#E8E8E6] rounded-2xl shadow-xl relative z-10 overflow-hidden flex flex-col md:flex-row min-h-[550px] animate-modal-box">
        
        {/* Left Side Metadata Panel */}
        <div className="md:w-2/5 bg-[#FAFAFA] border-b md:border-b-0 md:border-r border-[#E8E8E6] p-8 flex flex-col justify-between select-none">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                {linkDetails.tenant_name}
              </span>
              <h1 className="text-lg font-extrabold text-black leading-tight uppercase tracking-wider">
                {linkDetails.name}
              </h1>
            </div>

            <div className="space-y-3.5">
              {linkDetails.staff && (
                <div className="flex items-center gap-2.5 bg-white border border-[#E8E8E6] p-2.5 rounded-lg shadow-3xs">
                  <div 
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-3xs"
                    style={{ backgroundColor: linkDetails.staff.color || '#10B981' }}
                  >
                    {linkDetails.staff.name?.[0] || 'S'}
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{t('hostSpecialist')}</div>
                    <div className="text-xs font-bold text-black">{linkDetails.staff.name}</div>
                    {linkDetails.staff.title && <div className="text-[10px] text-zinc-500 font-medium">{linkDetails.staff.title}</div>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-xs text-zinc-650 font-semibold">
                <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>{t('durationMinutes', { duration: linkDetails.duration })}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-650 font-semibold">
                <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>{t('timezoneScheduling')}</span>
              </div>
            </div>

            {linkDetails.description && (
              <p className="text-xs text-[#6B6B6B] leading-relaxed border-t border-[#E8E8E6]/60 pt-4 font-semibold">
                {linkDetails.description}
              </p>
            )}
          </div>

          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider pt-6 md:pt-0">
            {t('poweredBy')}
          </div>
        </div>

        {/* Right Side Interactivity Slot Panels */}
        <div className="flex-1 p-8 flex flex-col justify-between min-h-[480px]">
          
          {step === 'datetime' && (
            <div className="h-full flex flex-col justify-between gap-6">
              
              {/* Select Staff if multiple staff are available */}
              {linkDetails.assign_mode === 'select_resource' && linkDetails.available_staff && linkDetails.available_staff.length > 0 && (
                <div className="space-y-2 border-b border-[#E8E8E6] pb-4">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{t('selectSpecialist')}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {linkDetails.available_staff.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleStaffChange(staff.id.toString())}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          selectedStaffId === staff.id.toString()
                            ? 'border-black bg-zinc-900 text-white shadow-3xs'
                            : 'border-[#E8E8E6] bg-white hover:bg-zinc-50 text-zinc-800'
                        }`}
                      >
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-3xs shrink-0"
                          style={{ backgroundColor: staff.color || (selectedStaffId === staff.id.toString() ? '#374151' : '#10B981') }}
                        >
                          {staff.name?.[0] || 'S'}
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="text-xs font-bold truncate">{staff.name}</div>
                          {staff.title && <div className="text-[9px] opacity-75 truncate">{staff.title}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Date Picker Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black uppercase tracking-wider">
                      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1.5 border border-[#E8E8E6] rounded-md hover:bg-zinc-50 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4 text-zinc-650" />
                      </button>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1.5 border border-[#E8E8E6] rounded-md hover:bg-zinc-50 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4 text-zinc-650" />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#6B6B6B] select-none">
                    <div>{t('su')}</div><div>{t('mo')}</div><div>{t('tu')}</div><div>{t('we')}</div><div>{t('th')}</div><div>{t('fr')}</div><div>{t('sa')}</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {generateDays().map((d, idx) => {
                      if (!d) return <div key={`empty-${idx}`} />;
                      
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isSelected = selectedDate?.toDateString() === d.toDateString();
                      const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <button
                          key={d.getTime()}
                          onClick={() => !isPast && handleDateSelect(d)}
                          disabled={isPast}
                          type="button"
                          className={`aspect-square w-full rounded-[6px] font-bold transition-all text-center flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            isSelected 
                              ? 'bg-black text-white' 
                              : isToday 
                              ? 'border border-[#4AE54A] text-zinc-950 font-extrabold'
                              : 'hover:bg-zinc-50 text-zinc-800'
                          }`}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Slots Column */}
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-bold text-black uppercase tracking-wider block">
                    {t('availableSlots')}
                  </span>

                  {selectedDate ? (
                    loadingSlots ? (
                      <div className="text-xs text-[#6B6B6B] flex items-center justify-center gap-2 py-12">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" /> {t('slotAudit')}
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-xs text-[#6B6B6B] py-12 text-center font-semibold">
                        {t('noSlotsOnDate')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                        {slots.map((slot) => {
                          const isSelSlot = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`w-full py-2 border rounded-[6px] text-xs font-semibold text-center cursor-pointer transition-all ${
                                isSelSlot 
                                  ? 'bg-black border-black text-white' 
                                  : 'border-[#E8E8E6] bg-[#FAFAFA]/50 hover:border-zinc-400 text-zinc-800'
                              }`}
                            >
                              {getFormatTime(slot)}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-[#6B6B6B] py-12 text-center font-semibold select-none">
                      {t('selectDateToView')}
                    </div>
                  )}
                </div>

              </div>

              {/* Step 1 Next Action Trigger */}
              <div className="border-t border-[#F0F0F0] pt-5 flex items-center justify-end select-none">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={!selectedSlot}
                  className="bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed px-5 h-9 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  {t('continueBtn')}
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleBookAppointment} className="h-full flex flex-col justify-between gap-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setStep('datetime')}
                    className="p-1 hover:bg-zinc-50 rounded text-zinc-650 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-black uppercase tracking-wider">
                    {t('confirmDetails')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('firstNameRequired')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('lastNameRequired')}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('emailRequired')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('phoneRequired')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('phonePlaceholderBook')}
                    className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider block">{t('meetingNotes')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('meetingNotesPlaceholder')}
                    className="w-full min-h-[60px] p-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Form Submission Footer Actions */}
              <div className="border-t border-[#F0F0F0] pt-5 flex items-center justify-between select-none">
                <div className="text-[11px] font-bold text-zinc-650">
                  {selectedDate && getFormatTime(selectedSlot!)} on {selectedDate ? selectedDate.toLocaleDateString() : ''}
                </div>
                <button
                  type="submit"
                  disabled={booking}
                  className="bg-black text-white hover:bg-neutral-800 px-6 h-9 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  {booking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('confirmReservation')}
                </button>
              </div>

            </form>
          )}

          {step === 'success' && (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-6 animate-fade-in py-12">
              <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">{t('reservationConfirmed')}</h3>
                <p className="text-xs text-[#6B6B6B] font-semibold max-w-sm mx-auto leading-relaxed">
                  {t('reservationSuccessDesc', { time: selectedSlot ? getFormatTime(selectedSlot) : '', date: selectedDate ? selectedDate.toLocaleDateString() : '' })}
                </p>
              </div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {t('confirmationSaved')}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
