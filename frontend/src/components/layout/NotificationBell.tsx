'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2, MailOpen, AlertCircle, Megaphone, UserPlus, Sparkles, X, ExternalLink } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { echo } from '@/lib/echo';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: 'assignment' | 'mention' | 'campaign_complete' | 'payment_failed';
  read_at: string | null;
  created_at: string;
  metadata?: any;
}

export default function NotificationBell() {
  const t = useTranslations();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wiggling, setWiggling] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithCsrf('/notifications');
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read_at).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    let cleanupEcho: (() => void) | undefined;

    const initEcho = async () => {
      try {
        const res = await fetchWithCsrf('/auth/me');
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          if (user && echo) {
            const token = localStorage.getItem('whatsomni_token');
            echo.options.auth = {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
                Accept: 'application/json',
              }
            };

            const channelName = `tenant.${user.tenant_id}.user.${user.id}`;
            
            echo.private(channelName).listen(
              'NotificationBroadcastEvent',
              (event: any) => {
                const newNotification = event.notification || event;
                
                setNotifications((prev) => [newNotification, ...prev]);
                setUnreadCount((prev) => prev + 1);
                
                // Trigger wiggle animation & audio/toast
                setWiggling(true);
                setTimeout(() => setWiggling(false), 1000);

                toast.custom((id) => {
                  const actionUrl = newNotification.metadata?.action_url;
                  return (
                    <div 
                      className="flex flex-col bg-white border border-[#E8E8E6] p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] w-[340px] sm:w-[360px] relative select-none text-left font-sans"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-md bg-slate-50 shrink-0 mt-0.5 border border-[#E8E8E6]">
                          {getIconForType(newNotification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs truncate font-black text-slate-900">
                              {newNotification.title}
                            </p>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shrink-0" />
                          </div>
                          <p className="text-[10px] text-slate-550 leading-relaxed mt-1 break-words">
                            {newNotification.body}
                          </p>
                          <p className="text-[8px] text-slate-400 mt-2 uppercase font-bold tracking-wider">
                            Just Now
                          </p>
                        </div>

                        <button
                          onClick={() => toast.dismiss(id)}
                          className="p-1 rounded-md text-slate-300 hover:text-black hover:bg-slate-100/50 transition-all cursor-pointer self-start shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      {actionUrl && (
                        <div className="mt-3 border-t border-[#E8E8E6] pt-2.5 flex justify-end">
                          <button
                            onClick={() => {
                              router.push(actionUrl);
                              toast.dismiss(id);
                            }}
                            className="text-[10px] font-bold text-black hover:text-[#4AE54A] transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                          >
                            <span>{t('viewDetails') || 'View Details'}</span>
                            <ExternalLink className="h-3 w-3 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              }
            );
   
            const activeEcho = echo;
            cleanupEcho = () => {
              if (activeEcho) {
                activeEcho.leave(channelName);
              }
            };
          }
        }
      } catch (err) {
        console.error('Failed to initialize tenant Echo:', err);
      }
    };

    initEcho();

    // Close drawer on escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (cleanupEcho) {
        cleanupEcho();
      }
    };
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetchWithCsrf(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithCsrf('/notifications/mark-all-read', {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success(t('toasts.allNotificationsRead'));
      }
    } catch {}
  };

  const handleDismiss = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchWithCsrf(`/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        const wasUnread = !notifications.find((n) => n.id === id)?.read_at;
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch {}
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'assignment':
        return <UserPlus className="h-3.5 w-3.5 text-zinc-500" />;
      case 'mention':
        return <Sparkles className="h-3.5 w-3.5 text-zinc-500" />;
      case 'campaign_complete':
        return <Megaphone className="h-3.5 w-3.5 text-zinc-500" />;
      case 'payment_failed':
        return <AlertCircle className="h-3.5 w-3.5 text-zinc-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  return (
    <>
      {/* Trigger Button (Ghost Variant - Simple icon button with no circle border) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative p-2 text-zinc-500 hover:text-black hover:bg-slate-100/50 rounded-md transition-all cursor-pointer outline-none ${
          wiggling ? 'animate-bounce' : ''
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-red-500">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          </span>
        )}
      </button>

      {/* Side Drawer Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs z-[9999] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Drawer Panel (Right aligned) */}
      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 w-80 md:w-96 bg-white border-l border-[#E8E8E6] shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#E8E8E6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t('Notifications.title')}</span>
            {unreadCount > 0 && (
              <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                {t('Notifications.newCount', { count: unreadCount })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-slate-500 hover:text-black font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title={t('Notifications.markAllRead')}
              >
                <MailOpen className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-black hover:bg-slate-100/50 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-full">
              <Bell className="h-6 w-6 text-slate-300 shrink-0" />
              <p className="font-semibold text-slate-500">{t('Notifications.inboxEmpty')}</p>
              <p className="text-[10px] text-slate-400">{t('Notifications.syncDynamically')}</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.read_at && handleMarkAsRead(item.id)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-slate-50/50 ${
                  !item.read_at ? 'bg-slate-50/30' : ''
                }`}
              >
                <div className="p-2 rounded-md bg-slate-50 shrink-0 mt-0.5 border border-[#E8E8E6]">
                  {getIconForType(item.type)}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${!item.read_at ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>
                      {item.title}
                    </p>
                    {!item.read_at && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1 break-words">
                    {item.body}
                  </p>
                  <p className="text-[8px] text-slate-400 mt-2 uppercase font-bold tracking-wider">
                    {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDismiss(item.id, e)}
                  className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer self-start shrink-0"
                  title={t('titles.dismissAlert')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
