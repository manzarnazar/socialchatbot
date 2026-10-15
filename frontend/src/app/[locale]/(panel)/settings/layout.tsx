'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { fetchWithCsrf } from '@/lib/api';
import { useTranslations } from 'next-intl';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Settings');
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const response = await fetchWithCsrf('/auth/me');
        if (response.ok) {
          const data = await response.json();
          const tenant = data.user?.tenant;
          if (tenant && tenant.onboarding_step !== 'complete' && tenant.onboarding_step !== '3') {
            router.push('/onboarding');
            return;
          }
        } else if (response.status === 401) {
          router.push('/login');
          return;
        }
      } catch (err) {
        console.error('Failed to verify onboarding status:', err);
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, [router]);

  if (loading) {
    return <SimpleLoader fullScreen={false} borderless={true} message={t('syncingSession')} />;
  }

  return (
    <div className="w-full bg-white font-sans">
      <div className="w-full bg-white">
        {children}
      </div>
    </div>
  );
}
