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
        className="appearance-none px-3 py-1.5 pr-8 text-sm font-semibold border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:border-blue-500 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-w-[160px]"
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
