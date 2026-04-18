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
        className="flex items-center gap-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ padding: '4px 8px', fontSize: '13px', lineHeight: '18px' }}
      >
        {updating ? (
          <WeddingSpinner size="sm" />
        ) : (
          <>
            <span style={{ fontSize: '16px', lineHeight: '1' }}>{currentLang.flag}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', letterSpacing: '0.05em' }}>{currentLang.code}</span>
            <svg className="flex-shrink-0" style={{ width: '10px', height: '10px', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
