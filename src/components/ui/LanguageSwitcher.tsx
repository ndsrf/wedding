'use client';

import { useRef, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = LANGUAGES.find((lang) => lang.code === locale);

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    setIsPending(true);

    // Set the cookie for next-intl
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Force a full page reload to ensure the new locale is picked up by the server
    window.location.reload();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Flag-only button - 48x48px */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-xl">{currentLanguage?.flag || '🌐'}</span>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white bg-opacity-50">
            <WeddingSpinner size="sm" />
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              role="menuitem"
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                lang.code === locale
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {lang.code === locale && (
                <span className="text-blue-600" aria-label="Selected">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
