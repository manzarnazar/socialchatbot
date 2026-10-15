'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Bell, 
  Trash2, 
  MailOpen, 
  MessageSquare, 
  UserPlus, 
  AlertCircle, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { echo } from '@/lib/echo';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface AdminNotificationItem {
  id: number;
  type: 'support_ticket_created' | 'support_ticket_reply' | 'new_merchant_signup' | 'system_alert' | string;
  title: string;
  body: string;
  data?: {
    ticket_id?: number;
    tenant_id?: number;
    user_name?: string;
    company_name?: string;
    action_url?: string;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
}

export default function AdminNotificationBell() {
  const t = useTranslations('Superadmin');
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wiggling, setWiggling] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithCsrf('/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count ?? (data.notifications || []).filter((n: AdminNotificationItem) => !n.read_at).length);
      }
    } catch (err) {
      console.error('Failed to fetch admin notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    let cleanupEcho: (() => void) | undefined;

    const initEcho = async () => {
      try {
        const res = await fetchWithCsrf('/admin/me');
        if (res.ok) {
          const data = await res.json();
          const admin = data.admin;
          if (admin && echo) {
            const token = localStorage.getItem('whatsomni_admin_token');
            echo.options.auth = {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
                Accept: 'application/json',
              }
            };

            const channelName = 'admin.notifications';
            const channel = echo.private(channelName);

            channel.listen(
              'AdminNotificationBroadcastEvent',
              (event: AdminNotificationItem | { notification?: AdminNotificationItem }) => {
                const newNotif = (event as any).notification || (event as AdminNotificationItem);

                setNotifications((prev) => [newNotif, ...prev]);
                setUnreadCount((prev) => prev + 1);
                toast.custom((id) => {
                  const actionUrl = newNotif.data?.action_url;
                  return (
                    <div 
                      className="flex flex-col bg-white border border-[#E8E8E6] p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] w-[340px] sm:w-[360px] relative select-none text-left font-sans"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-md bg-slate-50 shrink-0 mt-0.5 border border-[#E8E8E6]">
                          {getIconForType(newNotif.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs truncate font-black text-slate-900">
                              {newNotif.title}
                            </p>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A] shrink-0" />
                          </div>
                          <p className="text-[10px] text-slate-550 leading-relaxed mt-1 break-words">
                            {newNotif.body}
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
        console.error('Failed to initialize admin Echo:', err);
      }
    };

    initEcho();

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
      const res = await fetchWithCsrf(`/admin/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        if (typeof data.unread_count === 'number') {
          setUnreadCount(data.unread_count);
        } else {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithCsrf('/admin/notifications/mark-all-read', {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success(t('notifications.markAllReadSuccess'));
      }
    } catch {}
  };

  const handleDismiss = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchWithCsrf(`/admin/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const wasUnread = !notifications.find((n) => n.id === id)?.read_at;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch {}
  };

  const handleNotificationClick = (item: AdminNotificationItem) => {
    if (!item.read_at) {
      handleMarkAsRead(item.id);
    }

    if (item.data?.action_url) {
      setIsOpen(false);
      router.push(item.data.action_url);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'support_ticket_created':
        return <MessageSquare className="h-3.5 w-3.5 text-slate-500" />;
      case 'support_ticket_reply':
        return <MessageSquare className="h-3.5 w-3.5 text-blue-600" />;
      case 'new_merchant_signup':
        return <UserPlus className="h-3.5 w-3.5 text-emerald-600" />;
      case 'system_alert':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read_at) 
    : notifications;

  return (
    <>
      {/* Trigger Button (Ghost Variant - Exact Tenant Notification Bell Copy) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative p-2 text-zinc-500 hover:text-black hover:bg-slate-100/50 rounded-md transition-all cursor-pointer outline-none ${
          wiggling ? 'animate-bounce' : ''
        }`}
        title={t('notifications.title')}
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

      {/* Side Drawer Panel (Right aligned - Exact Tenant Design Copy) */}
      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 w-80 md:w-96 bg-white border-l border-[#E8E8E6] shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#E8E8E6] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                {t('notifications.newCount', { count: unreadCount })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-slate-500 hover:text-black font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title={t('notifications.markAllRead')}
              >
                <MailOpen className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-black hover:bg-slate-100/50 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs Subheader */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-[#E8E8E6] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-white text-slate-900 shadow-3xs border border-[#E8E8E6]' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('notifications.filterAll')} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'unread' 
                ? 'bg-white text-slate-900 shadow-3xs border border-[#E8E8E6]' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('notifications.filterUnread')} ({unreadCount})
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-full select-none">
              <Bell className="h-6 w-6 text-slate-300 shrink-0" />
              <p className="font-semibold text-slate-500">{t('notifications.emptyTitle')}</p>
              <p className="text-[10px] text-slate-400">{t('notifications.emptySub')}</p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = !item.read_at;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-slate-50/50 ${
                    isUnread ? 'bg-slate-50/30' : 'bg-white'
                  }`}
                >
                  <div className="p-2 rounded-md bg-slate-50 shrink-0 mt-0.5 border border-[#E8E8E6]">
                    {getIconForType(item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>
                        {item.title}
                      </p>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1 break-words">
                      {item.body}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.data?.action_url && (
                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 hover:underline">
                          <span>{t('notifications.viewAction')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(item.id, e)}
                    className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer self-start shrink-0"
                    title={t('notifications.dismiss')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
