'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Video,
  Check
} from 'lucide-react';

interface AppointmentBookingSectionProps {
  brandName?: string;
}

export function AppointmentBookingSection({ brandName = 'WhatsOmni' }: AppointmentBookingSectionProps) {
  const [selectedSlot, setSelectedSlot] = useState<string>('03:00 PM');
  const [selectedDate, setSelectedDate] = useState<number>(15);
  const [isBooked, setIsBooked] = useState<boolean>(false);

  const bullets = [
    'Share a simple public link — no back-and-forth scheduling required',
    'Syncs with Google Calendar automatically to prevent double-bookings',
    'Video links (Zoom, Google Meet, Microsoft Teams) attached to every booking'
  ];

  const calendarDays = [
    { day: 29, isOtherMonth: true, isAvailable: false },
    { day: 30, isOtherMonth: true, isAvailable: false },
    { day: 1, isOtherMonth: false, isAvailable: true },
    { day: 2, isOtherMonth: false, isAvailable: true },
    { day: 3, isOtherMonth: false, isAvailable: true },
    { day: 4, isOtherMonth: false, isAvailable: false },
    { day: 5, isOtherMonth: false, isAvailable: false },
    { day: 6, isOtherMonth: false, isAvailable: true },
    { day: 7, isOtherMonth: false, isAvailable: true },
    { day: 8, isOtherMonth: false, isAvailable: true },
    { day: 9, isOtherMonth: false, isAvailable: true },
    { day: 10, isOtherMonth: false, isAvailable: true },
    { day: 11, isOtherMonth: false, isAvailable: false },
    { day: 12, isOtherMonth: false, isAvailable: false },
    { day: 13, isOtherMonth: false, isAvailable: true },
    { day: 14, isOtherMonth: false, isAvailable: true },
    { day: 15, isOtherMonth: false, isAvailable: true },
    { day: 16, isOtherMonth: false, isAvailable: true },
    { day: 17, isOtherMonth: false, isAvailable: true },
    { day: 18, isOtherMonth: false, isAvailable: false },
    { day: 19, isOtherMonth: false, isAvailable: false },
    { day: 20, isOtherMonth: false, isAvailable: true },
    { day: 21, isOtherMonth: false, isAvailable: true },
    { day: 22, isOtherMonth: false, isAvailable: true },
    { day: 23, isOtherMonth: false, isAvailable: true },
    { day: 24, isOtherMonth: false, isAvailable: true },
    { day: 25, isOtherMonth: false, isAvailable: false },
    { day: 26, isOtherMonth: false, isAvailable: false },
    { day: 27, isOtherMonth: false, isAvailable: true },
    { day: 28, isOtherMonth: false, isAvailable: true },
    { day: 29, isOtherMonth: false, isAvailable: true },
    { day: 30, isOtherMonth: false, isAvailable: true },
    { day: 31, isOtherMonth: false, isAvailable: true },
    { day: 1, isOtherMonth: true, isAvailable: false },
    { day: 2, isOtherMonth: true, isAvailable: false },
  ];

  const timeSlots = [
    { time: '09:30 AM', period: 'Morning' },
    { time: '10:30 AM', period: 'Morning' },
    { time: '11:45 AM', period: 'Morning' },
    { time: '01:15 PM', period: 'Afternoon' },
    { time: '02:30 PM', period: 'Afternoon' },
    { time: '03:00 PM', period: 'Afternoon' },
    { time: '04:30 PM', period: 'Evening' },
    { time: '05:15 PM', period: 'Evening' },
  ];

  return (
    <section id="appointment-booking" className="relative bg-white py-14 sm:py-16 overflow-hidden">
      
      {/* Subtle Premium Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous, Soft Neon Green Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full opacity-45"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Professional Interactive Scheduling Widget (7 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-stretch justify-start w-full text-sans text-left"
          >
            {/* Widget Container Card with End-to-End Connected Dividers */}
            <div className="w-full bg-white rounded-2xl border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
              
              {/* Left Column: Interactive Calendar Panel */}
              <div className="flex flex-col justify-between divide-y divide-zinc-200 select-none">
                
                {/* Header: Full Bleed End-to-End */}
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black">
                      <CalendarIcon className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-black block leading-tight">July 2026</span>
                      <span className="text-[10.5px] text-zinc-500 font-medium">Select a date</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      aria-label="Previous month"
                      className="w-7 h-7 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer border border-zinc-200"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      aria-label="Next month"
                      className="w-7 h-7 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer border border-zinc-200"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Matrix: Full Bleed Container */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                      <span key={day} className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((item, idx) => {
                      const isSelected = !item.isOtherMonth && item.day === selectedDate;
                      const isAvailable = item.isAvailable;
                      const isOtherMonth = item.isOtherMonth;
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isOtherMonth || !isAvailable}
                          onClick={() => {
                            if (!isOtherMonth && isAvailable) {
                              setSelectedDate(item.day);
                              setIsBooked(false);
                            }
                          }}
                          className={`h-7.5 sm:h-8.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all ${
                            isSelected
                              ? 'bg-black text-white font-black shadow-xs ring-1 ring-black'
                              : isOtherMonth
                              ? 'text-zinc-300 cursor-default'
                              : !isAvailable
                              ? 'text-zinc-350 cursor-not-allowed opacity-40'
                              : 'text-zinc-800 hover:bg-zinc-100 hover:text-black font-bold cursor-pointer'
                          }`}
                        >
                          <span>{item.day}</span>
                          {isAvailable && !isSelected && (
                            <span className="w-1 h-1 rounded-full bg-black absolute bottom-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timezone Footer: Full Bleed End-to-End */}
                <div className="px-4 py-3 sm:px-5 flex items-center justify-between text-[10.5px] text-zinc-600 font-medium bg-zinc-50/50">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Asia/Kolkata (GMT+5:30)</span>
                  </div>
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">30 Min</span>
                </div>
              </div>

              {/* Right Column: Time Slots & Booking Panel */}
              <div className="flex flex-col justify-between divide-y divide-zinc-200 select-none">
                
                {/* Header: Full Bleed End-to-End */}
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black">
                      <Clock className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-black block leading-tight">Select Time</span>
                      <span className="text-[10.5px] text-zinc-500 font-medium">Wednesday, {selectedDate} July</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full">
                    <Video className="w-3.5 h-3.5 text-black" />
                    <span>Meet</span>
                  </div>
                </div>

                {/* Time Slots: Full Bleed Container */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-2 max-h-[195px] overflow-y-auto pr-0.5">
                    {timeSlots.map((slot) => {
                      const isSelected = slot.time === selectedSlot;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot.time);
                            setIsBooked(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-black border-black text-white shadow-xs'
                              : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50'
                          }`}
                        >
                          <span>{slot.time}</span>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          ) : (
                            <span className="text-[9px] font-medium text-zinc-400">{slot.period}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm Booking Action: Full Bleed End-to-End */}
                <div className="p-4 sm:p-5 bg-zinc-50/50">
                  <button
                    type="button"
                    onClick={() => setIsBooked(true)}
                    className="w-full py-2.5 sm:py-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-xs bg-black hover:bg-zinc-900 text-white active:scale-[0.98] cursor-pointer"
                  >
                    {isBooked ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Booked: {selectedDate} July @ {selectedSlot}</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Booking</span>
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Right Column: Description & Bullet Points (5 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 flex flex-col items-start text-left space-y-6"
          >
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A] tracking-tight leading-tight">
              Let Customers Book Time <br />
              With You, Automatically
            </h2>

            {/* Bullet List */}
            <ul className="space-y-4 pt-2">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E8FDE8] border border-[#4AE54A]/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  </div>
                  <span className="text-xs sm:text-sm text-[#0A0A0A] font-semibold leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
