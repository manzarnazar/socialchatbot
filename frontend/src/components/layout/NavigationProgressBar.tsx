'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function ProgressBarContent() {
  const [navProgress, setNavProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    setVisible(true);
    setNavProgress(15); // Start immediately at 15%

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      setNavProgress((prev) => {
        if (prev >= 90) {
          elapsed += 50;
          if (elapsed >= 1000) { // Safety timeout: auto-complete if stuck at 90% for 1s
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => {
              completeProgress();
            }, 0);
            return 90;
          }
          return 90;
        }
        // Increment progress gradually and smoothly
        const diff = prev < 50 ? 8 : prev < 75 ? 4 : 1;
        return prev + diff;
      });
    }, 50);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setNavProgress(100);
    
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false);
      // Wait for fadeout animation to complete, then reset width to 0
      setTimeout(() => {
        setNavProgress(0);
      }, 150);
    }, 150);
  };

  // Intercept Next.js router navigations via History API overrides
  useEffect(() => {
    const handleStart = () => {
      setTimeout(() => {
        startProgress();
      }, 0);
    };

    // Store original history methods
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Intercept pushState (most Next.js navigations)
    window.history.pushState = function (...args) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          const currentUrl = new URL(window.location.href);
          if (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search) {
            handleStart();
          }
        } catch {
          // ignore parsing error
        }
      }
      return originalPushState.apply(this, args);
    };

    // Intercept replaceState
    window.history.replaceState = function (...args) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          const currentUrl = new URL(window.location.href);
          if (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search) {
            handleStart();
          }
        } catch {
          // ignore parsing error
        }
      }
      return originalReplaceState.apply(this, args);
    };

    // Listen to browser back/forward buttons
    window.addEventListener('popstate', handleStart);

    // Also support fallback anchor click interception for standard links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');
      const download = anchor.getAttribute('download');
      
      if (!href || targetAttr === '_blank' || download !== null || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href === '') {
        return;
      }
      
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      let targetUrl: URL;
      try {
        targetUrl = new URL(href, window.location.href);
      } catch {
        return;
      }
      
      if (currentUrl.origin === targetUrl.origin && (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search)) {
        handleStart();
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      // Restore original history methods on unmount
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handleStart);
      document.removeEventListener('click', handleAnchorClick);
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // Whenever the pathname or search parameters change, complete the progress bar
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  if (!visible && navProgress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 h-[3px] z-[999999] transition-[width,opacity] duration-150 ease-out pointer-events-none"
      style={{ 
        width: `${navProgress}%`,
        opacity: visible ? 1 : 0,
        backgroundColor: 'var(--primary, #0A0A0A)',
        boxShadow: '0 1px 10px var(--primary, #0A0A0A), 0 0 4px var(--primary, #0A0A0A)',
      }}
    />
  );
}

export default function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarContent />
    </Suspense>
  );
}
