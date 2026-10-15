'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { 
  Loader2, 
  Save, 
  Upload,
  Globe,
  Trash2
} from 'lucide-react';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useBranding, applyBrandingToDOM, setCachedBranding } from '@/components/BrandingThemeProvider';

export default function CustomizationSettingsPage() {
  const t = useTranslations('Superadmin');
  const { syncBranding } = useBranding();

  const [loading, setLoading] = useState(true);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  // Customization fields
  const [brandingName, setBrandingName] = useState('Platform');
  const [tabName, setTabName] = useState('Platform — Unified Omnichannel');
  const [primaryColor, setPrimaryColor] = useState('#4AE54A');
  const [accentColor, setAccentColor] = useState('#0A0A0A');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  useEffect(() => {
    setFaviconError(false);
  }, [faviconUrl]);



  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/admin/settings');
      if (res.ok) {
        const d = await res.json();
        const settings = d.settings || {};
        const bName = settings.branding_name || 'WhatsOmni';
        const tName = settings.tab_name || bName;
        const pColor = settings.primary_color || '#4AE54A';
        const aColor = settings.accent_color || '#0A0A0A';
        const lUrl = settings.logo_url || '';
        const fUrl = settings.favicon_url || '';

        setBrandingName(bName);
        setTabName(tName);
        setPrimaryColor(pColor);
        setAccentColor(aColor);
        setLogoUrl(lUrl);
        setFaviconUrl(fUrl);

        // Synchronize cache with verified server data
        setCachedBranding({
          brandingName: bName,
          tabName: tName,
          primaryColor: pColor,
          accentColor: aColor,
          logoUrl: lUrl,
          faviconUrl: fUrl,
        });
      }
    } catch {
      toast.error(t('settings.messages.loadBrandingFailed') || 'Failed to load customization settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update theme colors in real-time as user picks or tests colors
  useEffect(() => {
    if (primaryColor) {
      applyBrandingToDOM({
        brandingName,
        tabName,
        primaryColor,
        accentColor,
        logoUrl,
        faviconUrl,
      });
    }
  }, [primaryColor, accentColor]);

  const handleUpdatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatform(true);
    try {
      const payload = {
        branding_name: brandingName.trim() || 'WhatsOmni',
        tab_name: tabName.trim() || brandingName.trim() || 'WhatsOmni',
        primary_color: primaryColor,
        accent_color: accentColor,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
      };

      const updatedObj = {
        brandingName: payload.branding_name,
        tabName: payload.tab_name,
        primaryColor: payload.primary_color,
        accentColor: payload.accent_color,
        logoUrl: payload.logo_url,
        faviconUrl: payload.favicon_url,
      };

      // Apply and cache immediately for 0ms local response
      applyBrandingToDOM(updatedObj);
      setCachedBranding(updatedObj);

      const res = await fetchWithCsrf('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: payload })
      });

      if (res.ok) {
        await syncBranding();
        toast.success(t('settings.saveSuccess') || 'Platform customization saved successfully.');
      } else {
        toast.error(t('settings.saveFailed') || 'Failed to save platform customization.');
      }
    } catch {
      toast.error(t('settings.saveFailed') || 'Network error while saving settings.');
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setLogoUploading(true);
    try {
      const res = await fetchWithCsrf('/admin/settings/logo', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.url);
        setLogoError(false);

        // Update cache immediately with new logo
        setCachedBranding({
          brandingName,
          tabName,
          primaryColor,
          accentColor,
          logoUrl: data.url,
          faviconUrl,
        });

        toast.success(t('settings.messages.logoSuccess') || 'Platform logo uploaded successfully.');
      } else {
        const errData = await res.json().catch(() => null);
        const errorMsg = errData?.message || (errData?.errors?.logo ? errData.errors.logo[0] : t('settings.messages.logoFailed'));
        toast.error(errorMsg || 'Failed to upload logo.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Failed to upload logo.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('favicon', file);

    setFaviconUploading(true);
    try {
      const res = await fetchWithCsrf('/admin/settings/favicon', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFaviconUrl(data.url);
        setFaviconError(false);

        // Update cache immediately with new favicon
        const updated = {
          brandingName,
          tabName,
          primaryColor,
          accentColor,
          logoUrl,
          faviconUrl: data.url,
        };
        applyBrandingToDOM(updated);
        setCachedBranding(updated);

        toast.success('Platform favicon uploaded successfully.');
      } else {
        const errData = await res.json().catch(() => null);
        const errorMsg = errData?.message || (errData?.errors?.favicon ? errData.errors.favicon[0] : 'Failed to upload favicon.');
        toast.error(errorMsg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Failed to upload favicon.');
    } finally {
      setFaviconUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <SimpleLoader message={t('settings.loadingBranding') || 'Loading platform customization...'} />;
  }

  return (
    <div className="w-full text-zinc-750 selection:bg-zinc-100 animate-fade-in font-sans flex-1 overflow-y-auto pb-16">
      <form onSubmit={handleUpdatePlatform}>
        
        {/* SECTION 1: Platform Identity (Name & Tab Name) */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">{t('settings.branding.platformIdentity') || 'Platform Identity'}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              Define the brand name and browser tab title that appears across all tenant workspaces, login pages, and notifications.
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-5 text-left">
            {/* Brand Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Platform Name
              </label>
              <input
                type="text"
                required
                value={brandingName}
                onChange={(e) => setBrandingName(e.target.value)}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                placeholder="e.g. MyPlatform"
              />
              <p className="text-[10px] text-zinc-400">{t('settings.branding.platformIdentityDesc') || 'Used across navigation bars, footers, system emails, and auth screens.'}</p>
            </div>

            {/* Tab Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Platform Tab Name (Browser Title)
              </label>
              <input
                type="text"
                required
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                placeholder="e.g. MyPlatform — AI Omnichannel CRM"
              />
              <p className="text-[10px] text-zinc-400">Displayed in the browser tab title bar and bookmark manager.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Platform Visual Assets (Logo & Favicon) */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">{t('settings.branding.platformVisualAssets') || 'Platform Visual Assets'}</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              Upload custom logo and favicon files to fully white-label the application. All logos and favicons will be served dynamically without code changes.
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-6 text-left">
            {/* Logo Upload Box */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Platform Logo
              </label>
              <div className="border border-dashed border-[#E8E8E6] hover:border-black rounded-lg p-5 bg-[#FAFAFA] flex items-center gap-6 transition-all duration-300">
                <div className="h-16 w-16 rounded-lg border border-[#E8E8E6] bg-white flex items-center justify-center p-2.5 relative shrink-0 shadow-3xs overflow-hidden">
                  {logoUrl && !logoError ? (
                    <img 
                      src={logoUrl} 
                      alt="Platform Logo" 
                      className="h-full w-auto object-contain max-w-full" 
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="text-[10px] font-bold text-zinc-400 uppercase text-center leading-tight">
                      {logoError ? 'Invalid Image' : 'No Logo'}
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-black" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      id="logo-upload-input-file"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <label
                      htmlFor="logo-upload-input-file"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all"
                    >
                      <Upload className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{t('settings.branding.uploadLogo') || 'Upload Logo'}</span>
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Recommended: SVG, PNG or WebP with transparent background (max 10MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Favicon Upload Box */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Platform Favicon
              </label>
              <div className="border border-dashed border-[#E8E8E6] hover:border-black rounded-lg p-5 bg-[#FAFAFA] flex items-center gap-6 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg border border-[#E8E8E6] bg-white flex items-center justify-center p-2 relative shrink-0 shadow-3xs overflow-hidden">
                  {faviconUrl && !faviconError ? (
                    <img 
                      src={faviconUrl} 
                      alt="Favicon" 
                      className="h-full w-auto object-contain max-w-full" 
                      onError={() => setFaviconError(true)}
                    />
                  ) : (
                    <Globe className="h-5 w-5 text-zinc-300" />
                  )}
                  {faviconUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".ico,image/x-icon,image/png,image/svg+xml,image/webp"
                      id="favicon-upload-input-file"
                      className="hidden"
                      onChange={handleFaviconUpload}
                    />
                    <label
                      htmlFor="favicon-upload-input-file"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-xs font-semibold shadow-3xs cursor-pointer transition-all"
                    >
                      <Upload className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{t('settings.branding.uploadFavicon') || 'Upload Favicon'}</span>
                    </label>
                    {faviconUrl && (
                      <button
                        type="button"
                        onClick={() => setFaviconUrl('')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Recommended: .ico, .png (32×32 or 64×64), or SVG with crisp borders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Platform Color Palette */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-[#E8E8E6] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-zinc-955 uppercase tracking-tight">Theme & Color Palette</h3>
            <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
              Customize the platform color styling. Primary color powers buttons, active tabs, and call-to-actions. Accent color powers dark capsules, headers, and focus rings.
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-6 text-left">
            {/* Primary Color */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-md border border-[#E8E8E6] relative overflow-hidden shadow-3xs cursor-pointer shrink-0 transition-transform active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono uppercase focus:outline-none focus:border-black font-semibold"
                  placeholder="#4AE54A"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2 pt-3 border-t border-[#E8E8E6]">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Secondary Accent Color
              </label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-md border border-[#E8E8E6] relative overflow-hidden shadow-3xs cursor-pointer shrink-0 transition-transform active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-32 h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-mono uppercase focus:outline-none focus:border-black font-semibold"
                  placeholder="#0A0A0A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Save Actions Bar */}
        <div className="px-4 sm:px-6 md:px-8 py-4 flex items-center justify-end gap-3 bg-white sticky bottom-0 z-20 border-t border-[#E8E8E6] shadow-sm">
          <button
            type="submit"
            disabled={savingPlatform || logoUploading || faviconUploading}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-zinc-955 hover:bg-zinc-900 text-white rounded-[6px] text-xs font-semibold shadow-2xs cursor-pointer transition-all disabled:opacity-50 min-w-[160px] justify-center"
          >
            {savingPlatform ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Changes</span>
          </button>
        </div>

      </form>
    </div>
  );
}
