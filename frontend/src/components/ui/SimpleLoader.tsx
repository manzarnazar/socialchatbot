'use client';

import React from 'react';

interface SimpleLoaderProps {
  message?: string;
  minHeight?: string;
  fullScreen?: boolean;
  borderless?: boolean;
}

export default function SimpleLoader({ 
  message, 
  minHeight = 'min-h-[300px]', 
  fullScreen = false, 
  borderless = false 
}: SimpleLoaderProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 min-h-screen w-screen z-[99999] bg-white flex flex-col items-center justify-center overflow-hidden select-none font-sans'
    : `w-full flex-1 flex flex-col items-center justify-center gap-3 bg-white select-none ${minHeight}`;

  return (
    <div className={containerClasses}>
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Simple professional dual rotating spinner */}
        <div className="absolute inset-0 rounded-full border-2 border-neutral-100" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      {message && (
        <span className="text-[10px] text-zinc-500 font-bold tracking-tight uppercase select-none">{message}</span>
      )}
    </div>
  );
}
