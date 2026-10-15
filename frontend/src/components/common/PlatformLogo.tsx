'use client';

import React, { useState, useEffect } from 'react';
import { useBranding } from '@/components/BrandingThemeProvider';

interface PlatformLogoProps {
  className?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  alt?: string;
  showText?: boolean;
  textClassName?: string;
  invertOnDark?: boolean;
}

export function PlatformLogo({
  className = 'h-5 w-auto object-contain',
  containerClassName = 'flex items-center gap-2.5',
  fallbackClassName = '',
  alt,
  showText = false,
  textClassName = 'font-black text-sm tracking-tight uppercase',
  invertOnDark = false,
}: PlatformLogoProps) {
  const { logoUrl, brandingName } = useBranding();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const renderLogo = () => {
    if (logoUrl && !imageError) {
      let resolvedSrc = logoUrl;
      if (resolvedSrc.startsWith('storage/')) {
        resolvedSrc = '/' + resolvedSrc;
      }
      return (
        <img
          src={resolvedSrc}
          alt={alt || brandingName || 'Logo'}
          className={`${className} ${invertOnDark ? 'brightness-0 invert' : ''}`}
          onError={() => setImageError(true)}
          suppressHydrationWarning
        />
      );
    }

    return null;
  };

  if (!showText) {
    return renderLogo();
  }

  const logoEl = renderLogo();

  return (
    <div className={containerClassName} suppressHydrationWarning>
      {logoEl}
      <span className={textClassName} suppressHydrationWarning>{brandingName}</span>
    </div>
  );
}
