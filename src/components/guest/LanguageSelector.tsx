'use client';

import { useState, useRef, useEffect } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { Language } from '@prisma/client';

interface LanguageSelectorProps {
  token: string;
  currentLanguage: Language;
  onLanguageChange: () => void;
}

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSelector({
  token,
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [updating, setUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(language: Language) {
    setIsOpen(false);
    if (language === currentLanguage) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/guest/${token}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const result = await response.json();
      if (result.success) onLanguageChange();
    } catch (error) {
      console.error('Language update error:', error);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        disabled={updating}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updating ? (
          <WeddingSpinner size="sm" />
        ) : (
          <>
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{currentLang.code}</span>
            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[130px]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={lang.code === currentLanguage}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                lang.code === currentLanguage ? 'bg-gray-100 font-semibold' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
