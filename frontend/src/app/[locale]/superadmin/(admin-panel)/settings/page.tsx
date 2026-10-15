'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';

export default function SuperadminSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/superadmin/settings/general');
  }, [router]);

  return null;
}
