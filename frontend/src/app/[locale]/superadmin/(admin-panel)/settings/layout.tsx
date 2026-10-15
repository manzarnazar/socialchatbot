'use client';

import React from 'react';
import { usePathname, useRouter } from '@/i18n/routing';

export default function SuperadminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full text-left select-none">
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
