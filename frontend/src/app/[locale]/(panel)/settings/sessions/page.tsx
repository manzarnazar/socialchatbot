'use client';

import { useEffect, useState, useTransition } from 'react';
import { Smartphone, Laptop, LogOut, RefreshCw } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SimpleLoader from '@/components/ui/SimpleLoader';

interface UserSession {
  id: string;
  ip_address: string;
  device: string;
  last_active_at: string;
  is_current: boolean;
}

export default function SessionsSettingsPage() {
  const t = useTranslations('Settings');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/settings/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        toast.error(t('failedLoadSessions') || 'Failed to load active sessions.');
      }
    } catch {
      toast.error(t('networkErrorSessions') || 'Network error. Failed to retrieve active sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/settings/sessions/${id}`, {
          method: 'DELETE',
        });
        const data = await res.json();

        if (res.ok) {
          toast.success(t('sessionRevokedTitle') || 'Session Revoked', {
            description: data.message || t('deviceLoggedOutDesc') || 'The device has been successfully logged out.',
          });
          // Refresh lists
          setSessions((prev) => prev.filter((s) => s.id !== id));
        } else {
          toast.error(t('failedRevokeSession') || 'Failed to revoke session', {
            description: data.message,
          });
        }
      } catch {
        toast.error(t('networkErrorRevokeSession') || 'Network error. Failed to revoke session.');
      }
    });
  };

  return (
    <div className="w-full p-8 space-y-6 animate-fade-in font-sans text-black flex-1 overflow-y-auto">

      <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-[var(--shadow-card)]">
        <div className="px-6 py-4 border-b border-[#E8E8E6] flex justify-between items-center bg-[#FAFAFA] select-none">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{t('activeDeviceRegisters')}</span>
          <button 
            onClick={fetchSessions} 
            disabled={loading} 
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold border border-zinc-200 rounded-[6px] text-[10px] transition-all cursor-pointer shadow-3xs"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-zinc-400' : 'text-zinc-550'}`} /> 
            <span>{t('refresh')}</span>
          </button>
        </div>
 
        <div className="divide-y divide-[#E8E8E6]">
          {loading ? (
            <SimpleLoader message={t('loadingSessions')} minHeight="min-h-[150px]" />
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B6B6B]">
              {t('noActiveSessions')}
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="px-6 py-5 flex items-center justify-between hover:bg-[#FAFAFA]/40 transition-all select-none">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-800 border border-zinc-200 shrink-0 select-none shadow-3xs">
                    {session.device.toLowerCase().includes('mobile') || session.device.toLowerCase().includes('android') || session.device.toLowerCase().includes('ios') ? (
                      <Smartphone className="h-5 w-5 text-zinc-650" />
                    ) : (
                      <Laptop className="h-5 w-5 text-zinc-650" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-955">{session.device}</span>
                      {session.is_current && (
                        <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-50 border border-emerald-250 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('currentSession')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-450 font-semibold leading-relaxed">
                      {t('ipAddressLabel')} <code className="font-mono bg-zinc-50 border border-zinc-150 px-1.5 py-0.5 rounded text-[10px] text-zinc-600">{session.ip_address}</code> &bull; {t('lastActivityLabel')} {session.last_active_at}
                    </p>
                  </div>
                </div>
 
                {!session.is_current && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50/50 hover:border-red-200 rounded-[6px] text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                  >
                    <LogOut className="h-3 w-3" /> 
                    <span>{t('revokeSession')}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
