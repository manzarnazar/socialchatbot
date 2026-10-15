'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Check } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', name: 'English', label: 'EN', flagCode: 'gb' },
  { code: 'hi', name: 'हिन्दी', label: 'HI', flagCode: 'in' },
  { code: 'es', name: 'Español', label: 'ES', flagCode: 'es' },
  { code: 'ar', name: 'العربية', label: 'AR', flagCode: 'sa' },
  { code: 'fr', name: 'Français', label: 'FR', flagCode: 'fr' },
  { code: 'he', name: 'עברית', label: 'HE', flagCode: 'il' },
  { code: 'id', name: 'Bahasa Indonesia', label: 'ID', flagCode: 'id' },
  { code: 'it', name: 'Italiano', label: 'IT', flagCode: 'it' },
  { code: 'pt', name: 'Português', label: 'PT', flagCode: 'pt' },
  { code: 'vi', name: 'Tiếng Việt', label: 'VI', flagCode: 'vn' },
];

export default function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    try {
      // Set NEXT_LOCALE cookie
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      
      // Update backend user preference profile if available
      await fetchWithCsrf('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ language: newLocale }),
      }).catch(() => {
        // Fail silently or log if not logged in
      });

      setIsOpen(false);
      
      // Navigate to the same path with the new locale
      router.replace(pathname, { locale: newLocale });
      
      toast.success(newLocale === 'hi' ? 'भाषा बदलकर हिन्दी कर दी गई है।' : 'Language changed to English.');
    } catch (err) {
      console.error('Failed to change language:', err);
      toast.error(t('toasts.switchLanguageFailed'));
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 text-zinc-500 hover:text-black hover:bg-slate-100/50 rounded-md transition-all cursor-pointer outline-none text-xs font-bold"
        title={t('titles.switchLanguage')}
      >
        <Globe className="h-4 w-4 text-zinc-550" />
        <span className="uppercase tracking-wider">{currentLang.label}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E8E8E6] rounded-lg shadow-lg py-1 z-[9999] animate-scale-up">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === locale;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/${lang.flagCode}.svg`}
                    alt={lang.name}
                    className="w-4.5 h-3.5 object-cover rounded-[2px] border border-neutral-200"
                  />
                  <span className={`${isSelected ? 'font-bold text-black' : 'text-zinc-500 font-semibold'} whitespace-nowrap`}>
                    {lang.name}
                  </span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
