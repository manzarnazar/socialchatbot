'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { BRANDING_CONFIG } from '@/config/branding';

export interface Branding {
  brandingName: string;
  tabName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
}

export interface BrandingContextType extends Branding {
  syncBranding: () => Promise<void>;
}

export const BRANDING_STORAGE_KEY = 'whatsomni_branding_cache';

export const defaultBranding: Branding = {
  brandingName: BRANDING_CONFIG.defaultName,
  tabName: BRANDING_CONFIG.defaultTabName || BRANDING_CONFIG.defaultName,
  logoUrl: BRANDING_CONFIG.defaultLogo,
  faviconUrl: '',
  primaryColor: BRANDING_CONFIG.defaultPrimaryColor,
  accentColor: BRANDING_CONFIG.defaultAccentColor,
};

/**
 * Retrieve cached branding from window initial global, localStorage, or cookie.
 */
export function getCachedBranding(): Branding | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check window global preloaded by synchronous head script
    if ((window as any).__WHATSMONI_INITIAL_BRANDING__) {
      const b = (window as any).__WHATSMONI_INITIAL_BRANDING__;
      if (b && typeof b === 'object') {
        return {
          brandingName: b.brandingName || BRANDING_CONFIG.defaultName,
          tabName: b.tabName || b.brandingName || BRANDING_CONFIG.defaultName,
          logoUrl: b.logoUrl || BRANDING_CONFIG.defaultLogo,
          faviconUrl: b.faviconUrl || '',
          primaryColor: b.primaryColor || BRANDING_CONFIG.defaultPrimaryColor,
          accentColor: b.accentColor || BRANDING_CONFIG.defaultAccentColor,
        };
      }
    }

    // 2. Check localStorage
    const rawLocal = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed === 'object') {
        return {
          brandingName: parsed.brandingName || BRANDING_CONFIG.defaultName,
          tabName: parsed.tabName || parsed.brandingName || BRANDING_CONFIG.defaultName,
          logoUrl: parsed.logoUrl || BRANDING_CONFIG.defaultLogo,
          faviconUrl: parsed.faviconUrl || '',
          primaryColor: parsed.primaryColor || BRANDING_CONFIG.defaultPrimaryColor,
          accentColor: parsed.accentColor || BRANDING_CONFIG.defaultAccentColor,
        };
      }
    }

    // 3. Fallback to cookie check
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^|;)\\s*' + BRANDING_STORAGE_KEY + '=([^;]+)'));
      if (match) {
        const parsed = JSON.parse(decodeURIComponent(match[2]));
        if (parsed && typeof parsed === 'object') {
          return {
            brandingName: parsed.brandingName || BRANDING_CONFIG.defaultName,
            tabName: parsed.tabName || parsed.brandingName || BRANDING_CONFIG.defaultName,
            logoUrl: parsed.logoUrl || BRANDING_CONFIG.defaultLogo,
            faviconUrl: parsed.faviconUrl || '',
            primaryColor: parsed.primaryColor || BRANDING_CONFIG.defaultPrimaryColor,
            accentColor: parsed.accentColor || BRANDING_CONFIG.defaultAccentColor,
          };
        }
      }
    }
  } catch (err) {
    console.debug('Error reading cached branding:', err);
  }

  return null;
}

/**
 * Persist branding to localStorage, cookie, and dispatch instant sync event across all tabs.
 */
export function setCachedBranding(branding: Branding) {
  if (typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify(branding);
    localStorage.setItem(BRANDING_STORAGE_KEY, serialized);

    // Also persist in long-lived cookie for server-side layout preloading
    if (typeof document !== 'undefined') {
      document.cookie = `${BRANDING_STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
    }

    (window as any).__WHATSMONI_INITIAL_BRANDING__ = branding;

    // Dispatch custom event for immediate same-window subscribers
    window.dispatchEvent(new CustomEvent('whatsomni:branding-updated', { detail: branding }));
  } catch (err) {
    console.debug('Error saving cached branding:', err);
  }
}

const BrandingContext = createContext<BrandingContextType>({
  ...defaultBranding,
  syncBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r + (rgb.r * percent) / 100)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g + (rgb.g * percent) / 100)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b + (rgb.b * percent) / 100)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyBrandingToDOM(branding: Branding) {
  if (typeof document === 'undefined') return;

  const { brandingName, tabName, faviconUrl, primaryColor, accentColor } = branding;

  // 1. Update Document Tab Title safely without infinite DOM mutation loops
  const activeTabName = tabName || brandingName;
  if (activeTabName && document.title !== activeTabName) {
    document.title = activeTabName;
  }

  // 2. Update Favicon Link Elements if configured
  if (faviconUrl && typeof window !== 'undefined') {
    try {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']");
      const targetHref = new URL(faviconUrl, window.location.origin).href;
      if (iconLinks.length > 0) {
        iconLinks.forEach(link => {
          if (link.href !== targetHref) {
            link.href = faviconUrl;
          }
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.appendChild(link);
      }
    } catch {}
  }

  // 3. Compute Color Tokens
  const prim = primaryColor || BRANDING_CONFIG.defaultPrimaryColor;
  const acc = accentColor || BRANDING_CONFIG.defaultAccentColor;
  const rgb = hexToRgb(prim) || { r: 74, g: 229, b: 74 };
  const primHover = adjustBrightness(prim, -8);
  const primBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  const primGlow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
  const primBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  
  // Calculate contrast foreground color (dark text on light primary, light text on dark primary)
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  const primFg = luminance > 0.55 ? '#0A0A0A' : '#FFFFFF';

  // Calculate accent color attributes
  const accRgb = hexToRgb(acc) || { r: 10, g: 10, b: 10 };
  const accLuminance = (0.2126 * accRgb.r + 0.7152 * accRgb.g + 0.0722 * accRgb.b) / 255;
  const accFg = accLuminance > 0.55 ? '#0A0A0A' : '#FFFFFF';
  const accHover = adjustBrightness(acc, accLuminance > 0.5 ? -12 : 14);
  const accBg = `rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.12)`;
  const accBorder = `rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.35)`;

  const root = document.documentElement;
  root.style.setProperty('--primary', prim);
  root.style.setProperty('--color-primary', prim);
  root.style.setProperty('--primary-foreground', primFg);
  root.style.setProperty('--color-primary-foreground', primFg);
  root.style.setProperty('--accent-green', prim);
  root.style.setProperty('--color-accent-green', prim);
  root.style.setProperty('--accent-green-2', primHover);
  root.style.setProperty('--color-accent-green-2', primHover);
  root.style.setProperty('--accent-green-bg', primBg);
  root.style.setProperty('--color-accent-green-bg', primBg);
  root.style.setProperty('--accent-green-glow', primGlow);
  root.style.setProperty('--color-accent-green-glow', primGlow);
  root.style.setProperty('--accent-color', acc);
  root.style.setProperty('--color-accent-color', acc);
  root.style.setProperty('--accent-color-foreground', accFg);
  root.style.setProperty('--accent-color-hover', accHover);
  root.style.setProperty('--secondary-accent', acc);
  root.style.setProperty('--secondary-accent-foreground', accFg);
  root.style.setProperty('--secondary-accent-hover', accHover);
  root.style.setProperty('--border-focus', acc);
  root.style.setProperty('--color-border-focus', acc);
  root.style.setProperty('--chart-line-2', prim);
  root.style.setProperty('--color-chart-line-2', prim);

  // 4. Inject Dynamic Global CSS Rule
  let styleTag = document.getElementById('whatsomni-dynamic-branding-style') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'whatsomni-dynamic-branding-style';
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    :root,
    .dark,
    [data-theme="dark"],
    html.dark,
    body.dark {
      --primary: ${prim} !important;
      --color-primary: ${prim} !important;
      --primary-foreground: ${primFg} !important;
      --color-primary-foreground: ${primFg} !important;
      --accent-green: ${prim} !important;
      --color-accent-green: ${prim} !important;
      --accent-green-2: ${primHover} !important;
      --color-accent-green-2: ${primHover} !important;
      --accent-green-bg: ${primBg} !important;
      --color-accent-green-bg: ${primBg} !important;
      --accent-green-glow: ${primGlow} !important;
      --color-accent-green-glow: ${primGlow} !important;
      --accent-color: ${acc} !important;
      --color-accent-color: ${acc} !important;
      --accent-color-foreground: ${accFg} !important;
      --accent-color-hover: ${accHover} !important;
      --secondary-accent: ${acc} !important;
      --secondary-accent-foreground: ${accFg} !important;
      --border-focus: ${acc} !important;
      --color-border-focus: ${acc} !important;
      --chart-line-2: ${prim} !important;
      --color-chart-line-2: ${prim} !important;
    }

    .bg-primary,
    .bg-accent-green,
    [class~="bg-[#4AE54A]"],
    [class~="bg-[#4ae54a]"],
    .bg-\\[\\#4AE54A\\] {
      background-color: ${prim} !important;
    }

    .text-primary,
    .text-accent-green,
    [class~="text-[#4AE54A]"],
    [class~="text-[#4ae54a]"],
    .text-\\[\\#4AE54A\\] {
      color: ${prim} !important;
    }

    .border-primary,
    .border-accent-green,
    [class~="border-[#4AE54A]"],
    [class~="border-[#4ae54a]"],
    .border-\\[\\#4AE54A\\] {
      border-color: ${prim} !important;
    }

    .border-t-primary,
    [class~="border-t-[#4AE54A]"],
    [class~="border-t-[#4ae54a]"],
    .border-t-\\[\\#4AE54A\\] {
      border-top-color: ${prim} !important;
    }

    /* Underline and Text Decoration in Primary Color */
    .decoration-primary,
    [class~="decoration-[#4AE54A]"],
    [class~="decoration-[#4ae54a]"] {
      text-decoration-color: ${prim} !important;
    }

    /* SVG Fill and Stroke Overrides for Primary Color */
    [fill="#4AE54A"],
    [fill="#4ae54a"] {
      fill: ${prim} !important;
    }

    [stroke="#4AE54A"],
    [stroke="#4ae54a"] {
      stroke: ${prim} !important;
    }

    /* Primary Chips, Badges, and Pill Counters */
    .bg-accent-green-bg,
    [class~="bg-[#E8FDE8]"],
    .bg-\\[\\#E8FDE8\\],
    [class~="bg-[#4AE54A]/10"],
    [class~="bg-[#4AE54A]/20"],
    .bg-\\[\\#4AE54A\\]\\/10,
    .bg-\\[\\#4AE54A\\]\\/20,
    .bg-\\[\\#4AE54A\\]\\/30 {
      background-color: ${primBg} !important;
    }

    [class~="border-[#4AE54A]/10"],
    [class~="border-[#4AE54A]/20"],
    [class~="border-[#4AE54A]/30"],
    .border-\\[\\#4AE54A\\]\\/10,
    .border-\\[\\#4AE54A\\]\\/20,
    .border-\\[\\#4AE54A\\]\\/30,
    .border-\\[\\#4AE54A\\]\\/40 {
      border-color: ${primBorder} !important;
    }

    /* Force Chip Text & SVG Icons to Match Primary Color */
    [class*="bg-[#E8FDE8]"],
    [class*="bg-[#E8FDE8]"] [class*="text-emerald-"],
    [class*="bg-primary/10"] [class*="text-emerald-"] {
      color: ${prim} !important;
    }

    [class*="bg-[#E8FDE8]"] svg,
    [class*="bg-primary/10"] svg {
      color: ${prim} !important;
      stroke: ${prim} !important;
    }

    button[role="switch"][aria-checked="true"],
    button[role="switch"][data-state="checked"] {
      background-color: ${prim} !important;
    }

    .shadow-accent-glow,
    [class*="shadow-[0_0_8px_#4AE54A]"],
    [class*="shadow-[0_0_6px_#4AE54A]"],
    [class*="shadow-[0_0_4px_#4AE54A]"] {
      box-shadow: 0 0 10px ${primGlow} !important;
    }

    ::selection,
    .selection\\:bg-\\[\\#4AE54A\\]::selection {
      background-color: ${prim} !important;
      color: ${primFg} !important;
    }

    /* ============================================================ */
    /* SECONDARY ACCENT COLOR DYNAMIC OVERRIDES FOR ACTION BUTTONS   */
    /* Applies user's secondary color (e.g. Red) to action buttons   */
    /* ============================================================ */
    button[class*="bg-[#0A0A0A]"]:not([class*="bg-[#0A0A0A]/"]):not([class*="bg-[#0A0A0A]\\/"]):not([class*="backdrop"]),
    a[class*="bg-[#0A0A0A]"]:not([class*="bg-[#0A0A0A]/"]):not([class*="bg-[#0A0A0A]\\/"]):not([class*="backdrop"]),
    button[class*="bg-black"]:not([class*="bg-black/"]):not([class*="bg-black\\/"]):not([class*="backdrop"]),
    a[class*="bg-black"]:not([class*="bg-black/"]):not([class*="bg-black\\/"]):not([class*="backdrop"]),
    button[class*="bg-zinc-955"]:not([class*="bg-zinc-955/"]):not([class*="bg-zinc-955\\/"]),
    a[class*="bg-zinc-955"]:not([class*="bg-zinc-955/"]):not([class*="bg-zinc-955\\/"]),
    div[class*="rounded-full"][class*="bg-[#0A0A0A]"],
    [data-button-variant="primary"] {
      background-color: ${acc} !important;
      color: ${accFg} !important;
      border-color: transparent !important;
    }

    button[class*="bg-[#0A0A0A]"]:hover,
    button[class*="bg-[#0A0A0A]"][class*="hover:"]:hover,
    a[class*="bg-[#0A0A0A]"]:hover,
    a[class*="bg-[#0A0A0A]"][class*="hover:"]:hover,
    button[class*="bg-black"]:hover,
    button[class*="bg-black"][class*="hover:"]:hover,
    a[class*="bg-black"]:hover,
    button[class*="bg-zinc-955"]:hover,
    a[class*="bg-zinc-955"]:hover,
    [data-button-variant="primary"]:hover {
      background-color: ${accHover} !important;
      color: ${accFg} !important;
    }

    button[class*="bg-[#0A0A0A]"] svg,
    a[class*="bg-[#0A0A0A]"] svg,
    button[class*="bg-black"] svg,
    a[class*="bg-black"] svg,
    button[class*="bg-zinc-955"] svg,
    a[class*="bg-zinc-955"] svg,
    div[class*="rounded-full"][class*="bg-[#0A0A0A]"] svg {
      color: ${accFg} !important;
      stroke: ${accFg} !important;
    }
  `;
}

export default function BrandingThemeProvider({ 
  children,
  initialBranding,
}: { 
  children: React.ReactNode;
  initialBranding?: Branding | null;
}) {
  const pathname = usePathname();
  
  // Safe initial state that matches SSR perfectly to avoid hydration mismatches
  const [branding, setBranding] = useState<Branding>(() => {
    if (initialBranding) {
      return initialBranding;
    }
    return defaultBranding;
  });

  const brandingRef = useRef<Branding>(branding);
  brandingRef.current = branding;

  const loadBranding = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/platform/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const brandingName = data.branding_name || BRANDING_CONFIG.defaultName;
        const tabName = data.tab_name || brandingName;
        const logoUrl = data.logo_url || BRANDING_CONFIG.defaultLogo;
        const faviconUrl = data.favicon_url || '';
        const primaryColor = data.primary_color || BRANDING_CONFIG.defaultPrimaryColor;
        const accentColor = data.accent_color || BRANDING_CONFIG.defaultAccentColor;

        const updatedBranding: Branding = {
          brandingName,
          tabName,
          logoUrl,
          faviconUrl,
          primaryColor,
          accentColor,
        };

        const current = brandingRef.current;
        const isChanged =
          current.brandingName !== updatedBranding.brandingName ||
          current.tabName !== updatedBranding.tabName ||
          current.logoUrl !== updatedBranding.logoUrl ||
          current.faviconUrl !== updatedBranding.faviconUrl ||
          current.primaryColor !== updatedBranding.primaryColor ||
          current.accentColor !== updatedBranding.accentColor;

        setBranding(updatedBranding);
        applyBrandingToDOM(updatedBranding);
        setCachedBranding(updatedBranding);
      }
    } catch (err) {
      console.debug('Failed to load platform branding settings in background:', err);
    }
  }, []);

  useEffect(() => {
    // On client mount, check if localStorage has a cached version and apply
    const cached = getCachedBranding();
    if (cached) {
      setBranding(cached);
      applyBrandingToDOM(cached);
    } else if (initialBranding) {
      setBranding(initialBranding);
      applyBrandingToDOM(initialBranding);
      setCachedBranding(initialBranding);
    } else {
      applyBrandingToDOM(brandingRef.current);
    }

    // Stale-while-revalidate background refresh
    loadBranding();

    // Multi-tab storage synchronization listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BRANDING_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            const updated: Branding = {
              brandingName: parsed.brandingName || BRANDING_CONFIG.defaultName,
              tabName: parsed.tabName || parsed.brandingName || BRANDING_CONFIG.defaultName,
              logoUrl: parsed.logoUrl || BRANDING_CONFIG.defaultLogo,
              faviconUrl: parsed.faviconUrl || '',
              primaryColor: parsed.primaryColor || BRANDING_CONFIG.defaultPrimaryColor,
              accentColor: parsed.accentColor || BRANDING_CONFIG.defaultAccentColor,
            };
            setBranding(updated);
            applyBrandingToDOM(updated);
          }
        } catch {}
      }
    };

    // Same-window custom event listener
    const handleCustomBrandingEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Branding>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
        applyBrandingToDOM(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('whatsomni:branding-updated', handleCustomBrandingEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('whatsomni:branding-updated', handleCustomBrandingEvent);
    };
  }, [loadBranding]);

  // Safely update document title on route transitions or when branding changes without infinite MutationObserver loops
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeTabName = branding.tabName || branding.brandingName;
    if (activeTabName && document.title !== activeTabName) {
      document.title = activeTabName;
    }
  }, [pathname, branding.tabName, branding.brandingName]);

  return (
    <BrandingContext.Provider value={{ ...branding, syncBranding: loadBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
