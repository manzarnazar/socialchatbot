'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  CheckCircle2, 
  CheckCheck,
  Send
} from 'lucide-react';

interface ChatMessage {
  sender: 'customer' | 'agent';
  text: string;
  time: string;
}

interface ChatThread {
  id: string;
  name: string;
  phoneOrHandle: string;
  avatar: string;
  channel: 'whatsapp' | 'instagram' | 'tiktok' | 'telegram';
  channelIcon: string;
  channelName: string;
  channelColor: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  messages: ChatMessage[];
}

export function UnifiedInboxSection() {
  const threads: ChatThread[] = [
    {
      id: 'thread-1',
      name: 'Sarah Jenkins',
      phoneOrHandle: '+1 (555) 382-9014',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      channel: 'whatsapp',
      channelIcon: '/channels/whatsapp.webp',
      channelName: 'WhatsApp',
      channelColor: '#25D366',
      lastMessage: 'Perfect, book me in for 3:00 PM tomorrow.',
      time: '10:07 AM',
      unreadCount: 2,
      messages: [
        { sender: 'customer', text: 'Hi! Are there cardiology consultation slots available tomorrow afternoon?', time: '10:05 AM' },
        { sender: 'agent', text: 'Yes, Sarah! Dr. Elena has openings at 11:00 AM and 3:00 PM. Shall I reserve 3:00 PM for you?', time: '10:06 AM' },
        { sender: 'customer', text: 'Perfect, book me in for 3:00 PM tomorrow.', time: '10:07 AM' },
        { sender: 'agent', text: 'Confirmed! You will receive a calendar invite & pre-visit checklist shortly.', time: '10:07 AM' },
      ],
    },
    {
      id: 'thread-2',
      name: 'Marcus Brody',
      phoneOrHandle: '@marcus.brody',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      channel: 'instagram',
      channelIcon: '/channels/instagram.svg',
      channelName: 'Instagram',
      channelColor: '#E1306C',
      lastMessage: 'Can we schedule for Saturday morning?',
      time: '02:10 PM',
      messages: [
        { sender: 'customer', text: 'Hello! I saw your story on the Grand Villa penthouse. Is the walkthrough private?', time: '02:05 PM' },
        { sender: 'agent', text: 'Hi Marcus! Yes, all VIP penthouse tours are 100% private and guided by our lead broker.', time: '02:08 PM' },
        { sender: 'customer', text: 'Awesome! Can we schedule for Saturday morning at 10:00 AM?', time: '02:10 PM' },
        { sender: 'agent', text: 'Reserved! Confirmation sent to your Instagram inbox & registered SMS.', time: '02:10 PM' },
      ],
    },
    {
      id: 'thread-3',
      name: 'Liam Vance',
      phoneOrHandle: '@liam.creator',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
      channel: 'tiktok',
      channelIcon: '/channels/tiktok.webp',
      channelName: 'TikTok',
      channelColor: '#000000',
      lastMessage: 'Sent brand collaboration media kit.',
      time: '11:18 AM',
      messages: [
        { sender: 'customer', text: 'Hey! Loved your latest TikTok campaign. Do you have creator sponsorship slots open?', time: '11:15 AM' },
        { sender: 'agent', text: 'Hi Liam! Yes, our summer creator brand partnership program is currently accepting applications.', time: '11:17 AM' },
        { sender: 'customer', text: 'Awesome! Where can I submit our analytics & media kit?', time: '11:18 AM' },
        { sender: 'agent', text: 'Application portal link & submission checklist sent to your TikTok DM!', time: '11:18 AM' },
      ],
    },
    {
      id: 'thread-4',
      name: 'Elena Rostova',
      phoneOrHandle: '@elena_ecom',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      channel: 'telegram',
      channelIcon: '/channels/telegram.webp',
      channelName: 'Telegram',
      channelColor: '#229ED9',
      lastMessage: 'Can we trigger Shopify notifications?',
      time: '09:22 AM',
      messages: [
        { sender: 'customer', text: 'Can we trigger automated Telegram order notifications directly from Shopify webhook events?', time: '09:20 AM' },
        { sender: 'agent', text: 'Yes Elena! You can configure automatic abandoned cart recovery, order dispatch alerts, and live tracking in 2 clicks.', time: '09:22 AM' },
        { sender: 'customer', text: 'Does it support real-time courier tracking URLs dynamically?', time: '09:23 AM' },
        { sender: 'agent', text: 'Yes, dynamic courier tracking links are automatically injected in the message.', time: '09:23 AM' },
      ],
    },
  ];

  const [activeThreadId, setActiveThreadId] = useState('thread-1');
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const [typedMessage, setTypedMessage] = useState('');

  const handleSendMessage = () => {
    if (!typedMessage.trim()) return;
    activeThread.messages.push({
      sender: 'agent',
      text: typedMessage,
      time: 'Just now',
    });
    activeThread.lastMessage = typedMessage;
    setTypedMessage('');
  };

  const bullets = [
    'WhatsApp, Instagram, Messenger, Telegram, TikTok, SMS, and Email — all in one stream',
    'Zero context switching with real-time bidirectional syncing',
    'Assign conversations to teammates or route automatically with AI',
    'Internal notes and @mentions to collaborate without customer visibility',
    'Proactive outreach to initiate messaging across any connected channel',
  ];

  return (
    <section id="unified-inbox" className="relative bg-white py-20 sm:py-28 border-b border-[#E8E8E6] overflow-hidden">
      
      {/* Subtle Blueprint Cross Grid Backdrop Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-60" 
        style={{
          backgroundImage: 'linear-gradient(to right, #E2FDE2 1.2px, transparent 1.2px), linear-gradient(to bottom, #E2FDE2 1.2px, transparent 1.2px)',
          backgroundSize: '4rem 4rem'
        }} 
      />

      {/* Luminous Glow Touch */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(74,229,74,0.15) 0%, rgba(200,250,200,0.18) 45%, transparent 75%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Description & Bullet Points */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 flex flex-col items-start text-left space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A0A0A] tracking-tight leading-tight">
              Every Conversation. <br />
              <span className="relative inline-block text-[#4AE54A]">
                One Screen.
                <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#4AE54A] rounded-full shadow-[0_0_8px_rgba(74,229,74,0.6)]" />
              </span>
            </h2>

            <p className="text-sm sm:text-base text-[#4B4B4B] leading-relaxed">
              Consolidate messages across all customer touchpoints into a unified conversation stream. Reply instantly, auto-assign chats, and never lose a lead again.
            </p>

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

          {/* Right Column: Column of Contact Tiles + Fixed Height Chat Window */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start justify-center lg:justify-end gap-5 w-full"
          >
            {/* Contact Tiles Column */}
            <div className="w-full sm:w-[250px] flex flex-col gap-2 shrink-0">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                Shared Inbox
              </div>
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`relative text-left p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2.5 w-full ${
                      isActive 
                        ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border-2 border-black' 
                        : 'bg-white/80 hover:bg-white border border-[#E8E8E6]'
                    }`}
                  >
                    {/* Avatar with Channel Badge */}
                    <div className="relative shrink-0">
                      <img 
                        src={thread.avatar} 
                        alt={thread.name} 
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-white border border-[#E8E8E6] p-0.5 flex items-center justify-center shadow-2xs">
                        <Image
                          src={thread.channelIcon}
                          alt={thread.channel}
                          width={12}
                          height={12}
                          className="w-3 h-3 object-contain"
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${isActive ? 'font-bold text-[#0A0A0A]' : 'font-semibold text-zinc-800'}`}>
                          {thread.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                          {thread.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate leading-tight font-normal">
                        {thread.lastMessage}
                      </p>
                    </div>

                    {thread.unreadCount && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#25D366] text-white text-[11px] font-bold flex items-center justify-center text-center shadow-2xs leading-none">
                        <span className="translate-y-[0.5px]">{thread.unreadCount}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fixed Height WhatsApp Chat Window (Same fixed height across all channels) */}
            <div className="w-full sm:w-[340px] h-[465px] flex flex-col rounded-2xl bg-white border border-[#E8E8E6] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden shrink-0">
              
              {/* WhatsApp Chat Window Header (Fixed 56px) */}
              <div className="h-[56px] flex items-center justify-between px-3.5 py-2.5 border-b border-[#E8E8E6] bg-white shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={activeThread.avatar} 
                      alt={activeThread.name} 
                      className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center p-0.5 shadow-2xs">
                      <Image
                        src={activeThread.channelIcon}
                        alt={activeThread.channel}
                        width={12}
                        height={12}
                        className="w-3 h-3 object-contain"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0A0A0A] truncate">
                      {activeThread.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      <span>online via {activeThread.channelName}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#E7FFDB] text-[#128C7E] font-bold border border-[#C2EBA2]">
                  Live
                </span>
              </div>

              {/* Chat Message Stream (Flex-1 with auto scroll, anchored to bottom) */}
              <div className="flex-1 p-3.5 flex flex-col justify-end bg-[#FAFAF8]/60 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeThread.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2.5"
                  >
                    {activeThread.messages.map((msg, idx) => {
                      const isCustomer = msg.sender === 'customer';
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[90%] ${
                            isCustomer ? 'mr-auto items-start' : 'ml-auto items-end'
                          }`}
                        >
                          <div
                            className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed shadow-2xs ${
                              isCustomer
                                ? 'bg-white text-[#111B21] border border-[#E8E8E6] rounded-tl-xs'
                                : 'bg-[#E7FFDB] text-[#111B21] border border-[#C2EBA2] rounded-tr-xs'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <div
                              className={`flex items-center gap-1 text-[9px] mt-0.5 ${
                                isCustomer ? 'text-zinc-400 justify-start' : 'text-zinc-500 justify-end'
                              }`}
                            >
                              <span>{msg.time}</span>
                              {!isCustomer && (
                                <CheckCheck className="w-3 h-3 text-[#53BDEB]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Chat Window Reply Input Footer (Fixed 56px) */}
              <div className="h-[56px] p-2.5 border-t border-[#E8E8E6] bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Message via ${activeThread.channelName}...`}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 text-xs px-3 py-2 bg-[#F4F4F2] rounded-full border border-transparent focus:border-black focus:bg-white focus:outline-none placeholder:text-zinc-400 font-normal transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  className="w-8 h-8 rounded-full bg-black hover:bg-zinc-800 text-white flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
