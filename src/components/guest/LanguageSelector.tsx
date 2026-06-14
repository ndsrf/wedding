/**
 * Language Selector Component
 *
 * Dropdown for guests to change their preferred language.
 * Updates persist to database for future visits.
 */

'use client';

import { useState } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { Language } from '@prisma/client';

interface LanguageSelectorProps {
  token: string;
  currentLanguage: Language;
  onLanguageChange: () => void;
  textColor?: string;
  fontFamily?: string;
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
  textColor,
  fontFamily,
}: LanguageSelectorProps) {
  const [updating, setUpdating] = useState(false);

  async function handleLanguageChange(language: Language) {
    if (language === currentLanguage) return;

    setUpdating(true);

    try {
      const response = await fetch(`/api/guest/${token}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload page to apply new language
        onLanguageChange();
      }
    } catch (error) {
      console.error('Language update error:', error);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value as Language)}
        disabled={updating}
        className="appearance-none px-4 py-2 pr-10 text-base font-semibold border-2 rounded-lg bg-transparent hover:bg-black/5 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          color: textColor ?? '#111827',
          fontFamily: fontFamily,
          borderColor: textColor ? textColor + '33' : '#d1d5db'
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      {updating && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <WeddingSpinner size="sm" />
        </div>
      )}
    </div>
  );
}
