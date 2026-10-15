import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { routing } from '@/i18n/routing';
import { 
  Plus_Jakarta_Sans, 
  Sarala, 
  Noto_Sans_Arabic, 
  Noto_Sans_JP, 
  Noto_Sans_Hebrew 
} from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import NavigationProgressBar from '@/components/layout/NavigationProgressBar';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import BrandingThemeProvider from '@/components/BrandingThemeProvider';
import { PaddleGlobalCheckout } from '@/components/billing/PaddleGlobalCheckout';
import '../globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  variable: '--font-plus-jakarta-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const sarala = Sarala({
  subsets: ['devanagari'],
  variable: '--font-sarala',
  weight: ['400', '700'],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  weight: ['400', '500', '600', '700', '800'],
});

const notoJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-jp',
  weight: ['400', '500', '700'],
});

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-noto-hebrew',
  weight: ['400', '500', '600', '700', '800'],
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Get messages on the server side
  const messages = await getMessages();

  // Read server-side cookie cache if available for instant SSR rendering
  let ssrBranding: any = null;
  try {
    const cookieStore = await cookies();
    const brandingCookie = cookieStore.get('whatsomni_branding_cache');
    if (brandingCookie?.value) {
      ssrBranding = JSON.parse(decodeURIComponent(brandingCookie.value));
    }
  } catch {}

  // If no cookie present, fetch public settings directly on the server for 0ms SSR branding!
  if (!ssrBranding) {
    try {
      const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const backendUrl = rawBackendUrl.replace(/\/$/, '');
      const res = await fetch(`${backendUrl}/api/platform/settings`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        ssrBranding = {
          brandingName: data.branding_name || 'WhatsOmni',
          tabName: data.tab_name || data.branding_name || 'WhatsOmni',
          logoUrl: data.logo_url || '',
          faviconUrl: data.favicon_url || '',
          primaryColor: data.primary_color || '#4AE54A',
          accentColor: data.accent_color || '#0A0A0A',
        };
      }
    } catch {
      // Fallback to default if backend is unavailable during build
    }
  }

  // Set RTL direction if Arabic or Hebrew
  const isRtl = locale === 'ar' || locale === 'he';

  // Map locale to its corresponding font variable name
  const fontVariables: Record<string, string> = {
    hi: 'var(--font-sarala)',
    ar: 'var(--font-noto-arabic)',
    ja: 'var(--font-noto-jp)',
    he: 'var(--font-noto-hebrew)',
  };

  const activeFontVar = fontVariables[locale]
    ? `${fontVariables[locale]}, var(--font-plus-jakarta-sans), sans-serif`
    : 'var(--font-plus-jakarta-sans), sans-serif';

  return (
    <html 
      lang={locale} 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className={`${plusJakartaSans.variable} ${sarala.variable} ${notoArabic.variable} ${notoJP.variable} ${notoHebrew.variable}`}
      style={{
        ['--font-app-sans' as any]: activeFontVar,
      }}
      suppressHydrationWarning
    >
      <head>
        {ssrBranding?.faviconUrl ? (
          <link rel="icon" href={ssrBranding.faviconUrl} />
        ) : null}
        <title>{ssrBranding?.tabName || ssrBranding?.brandingName || 'WhatsOmni'}</title>
        {/* Synchronous 0ms branding boot before body render */}
        <script
          id="whatsomni-branding-boot"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var b = ${ssrBranding ? JSON.stringify(ssrBranding) : 'null'};
    if (!b) {
      var raw = localStorage.getItem('whatsomni_branding_cache');
      if (!raw) {
        var match = document.cookie.match(/(^|;)\\s*whatsomni_branding_cache=([^;]+)/);
        if (match) raw = decodeURIComponent(match[2]);
      }
      if (raw) b = JSON.parse(raw);
    }
    if (b && typeof b === 'object') {
      window.__WHATSMONI_INITIAL_BRANDING__ = b;
      var prim = b.primaryColor || '#4AE54A';
      var acc = b.accentColor || '#0A0A0A';
      var root = document.documentElement;
        
        function hexToRgb(hex) {
          var res = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec((hex || '').trim());
          return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) } : null;
        }
        function adjustBrightness(hex, percent) {
          var rgb = hexToRgb(hex);
          if (!rgb) return hex;
          var r = Math.min(255, Math.max(0, Math.round(rgb.r + (rgb.r * percent) / 100)));
          var g = Math.min(255, Math.max(0, Math.round(rgb.g + (rgb.g * percent) / 100)));
          var b = Math.min(255, Math.max(0, Math.round(rgb.b + (rgb.b * percent) / 100)));
          return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        var rgb = hexToRgb(prim) || { r: 74, g: 229, b: 74 };
        var primHover = adjustBrightness(prim, -8);
        var primBg = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.12)';
        var primGlow = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.25)';
        var primBorder = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.35)';
        var lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        var primFg = lum > 0.55 ? '#0A0A0A' : '#FFFFFF';

        var accRgb = hexToRgb(acc) || { r: 10, g: 10, b: 10 };
        var accLum = (0.2126 * accRgb.r + 0.7152 * accRgb.g + 0.0722 * accRgb.b) / 255;
        var accFg = accLum > 0.55 ? '#0A0A0A' : '#FFFFFF';
        var accHover = adjustBrightness(acc, accLum > 0.5 ? -12 : 14);

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

        var title = b.tabName || b.brandingName;
        if (title) document.title = title;

        var style = document.getElementById('whatsomni-dynamic-branding-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'whatsomni-dynamic-branding-style';
          document.head.appendChild(style);
        }
        style.textContent = ':root, .dark, [data-theme="dark"], html.dark, body.dark { --primary: ' + prim + ' !important; --color-primary: ' + prim + ' !important; --primary-foreground: ' + primFg + ' !important; --color-primary-foreground: ' + primFg + ' !important; --accent-green: ' + prim + ' !important; --color-accent-green: ' + prim + ' !important; --accent-green-2: ' + primHover + ' !important; --color-accent-green-2: ' + primHover + ' !important; --accent-green-bg: ' + primBg + ' !important; --color-accent-green-bg: ' + primBg + ' !important; --accent-green-glow: ' + primGlow + ' !important; --color-accent-green-glow: ' + primGlow + ' !important; --accent-color: ' + acc + ' !important; --color-accent-color: ' + acc + ' !important; --accent-color-foreground: ' + accFg + ' !important; --accent-color-hover: ' + accHover + ' !important; --secondary-accent: ' + acc + ' !important; --secondary-accent-foreground: ' + accFg + ' !important; --border-focus: ' + acc + ' !important; --color-border-focus: ' + acc + ' !important; --chart-line-2: ' + prim + ' !important; --color-chart-line-2: ' + prim + ' !important; } .bg-primary, .bg-accent-green, [class~="bg-[#4AE54A]"], [class~="bg-[#4ae54a]"], .bg-\\\\[\\\\#4AE54A\\\\] { background-color: ' + prim + ' !important; } .text-primary, .text-accent-green, [class~="text-[#4AE54A]"], [class~="text-[#4ae54a]"], .text-\\\\[\\\\#4AE54A\\\\] { color: ' + prim + ' !important; } .border-primary, .border-accent-green, [class~="border-[#4AE54A]"], [class~="border-[#4ae54a]"], .border-\\\\[\\\\#4AE54A\\\\] { border-color: ' + prim + ' !important; } .border-t-primary, [class~="border-t-[#4AE54A]"], [class~="border-t-[#4ae54a]"], .border-t-\\\\[\\\\#4AE54A\\\\] { border-top-color: ' + prim + ' !important; } .decoration-primary, [class~="decoration-[#4AE54A]"], [class~="decoration-[#4ae54a]"] { text-decoration-color: ' + prim + ' !important; } [fill="#4AE54A"], [fill="#4ae54a"] { fill: ' + prim + ' !important; } [stroke="#4AE54A"], [stroke="#4ae54a"] { stroke: ' + prim + ' !important; } .bg-accent-green-bg, [class~="bg-[#E8FDE8]"], .bg-\\\\[\\\\#E8FDE8\\\\], [class~="bg-[#4AE54A]/10"], [class~="bg-[#4AE54A]/20"], .bg-\\\\[\\\\#4AE54A\\\\]\\\\/10, .bg-\\\\[\\\\#4AE54A\\\\]\\\\/20, .bg-\\\\[\\\\#4AE54A\\\\]\\\\/30 { background-color: ' + primBg + ' !important; } [class~="border-[#4AE54A]/10"], [class~="border-[#4AE54A]/20"], [class~="border-[#4AE54A]/30"], .border-\\\\[\\\\#4AE54A\\\\]\\\\/10, .border-\\\\[\\\\#4AE54A\\\\]\\\\/20, .border-\\\\[\\\\#4AE54A\\\\]\\\\/30, .border-\\\\[\\\\#4AE54A\\\\]\\\\/40 { border-color: ' + primBorder + ' !important; } [class~="bg-[#E8FDE8]"], [class~="bg-[#E8FDE8]"] [class*="text-emerald-"], [class~="bg-primary/10"] [class*="text-emerald-"] { color: ' + prim + ' !important; } [class~="bg-[#E8FDE8]"] svg, [class~="bg-primary/10"] svg { color: ' + prim + ' !important; stroke: ' + prim + ' !important; } button[role="switch"][aria-checked="true"], button[role="switch"][data-state="checked"] { background-color: ' + prim + ' !important; } .shadow-accent-glow, [class~="shadow-[0_0_8px_#4AE54A]"], [class~="shadow-[0_0_6px_#4AE54A]"], [class~="shadow-[0_0_4px_#4AE54A]"] { box-shadow: 0 0 10px ' + primGlow + ' !important; } ::selection, .selection\\\\:bg-\\\\[\\\\#4AE54A\\\\]::selection { background-color: ' + prim + ' !important; color: ' + primFg + ' !important; } button[class~="bg-[#0A0A0A]"], a[class~="bg-[#0A0A0A]"], button[class~="bg-black"], a[class~="bg-black"], button[class~="bg-zinc-955"], a[class~="bg-zinc-955"], div[class*="rounded-full"][class~="bg-[#0A0A0A]"], [data-button-variant="primary"] { background-color: ' + acc + ' !important; color: ' + accFg + ' !important; border-color: transparent !important; } button[class~="bg-[#0A0A0A]"]:hover, a[class~="bg-[#0A0A0A]"]:hover, button[class~="bg-black"]:hover, a[class~="bg-black"]:hover, button[class~="bg-zinc-955"]:hover, a[class~="bg-zinc-955"]:hover, [data-button-variant="primary"]:hover { background-color: ' + accHover + ' !important; color: ' + accFg + ' !important; } button[class~="bg-[#0A0A0A]"] svg, a[class~="bg-[#0A0A0A]"] svg, button[class~="bg-black"] svg, a[class~="bg-black"] svg, button[class~="bg-zinc-955"] svg, a[class~="bg-zinc-955"] svg, div[class*="rounded-full"][class~="bg-[#0A0A0A]"] svg { color: ' + accFg + ' !important; stroke: ' + accFg + ' !important; }';

        if (b.faviconUrl) {
          var links = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
          if (links.length > 0) {
            links.forEach(function(l) { l.href = b.faviconUrl; });
          } else {
            var l = document.createElement('link');
            l.rel = 'icon';
            l.href = b.faviconUrl;
            document.head.appendChild(l);
          }
        }
      }
    }
  } catch(e) {}
})();
            `,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <BrandingThemeProvider initialBranding={ssrBranding}>
          <NextIntlClientProvider messages={messages}>
            <NavigationProgressBar />
            <Suspense fallback={null}>
              <PaddleGlobalCheckout />
            </Suspense>
            {children}
            <CookieConsentBanner />
            <Toaster position="top-right" richColors />
          </NextIntlClientProvider>
        </BrandingThemeProvider>
      </body>
    </html>
  );
}
