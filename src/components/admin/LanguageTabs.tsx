'use client';

export const RSVP_LANGUAGES = ['en', 'es', 'fr', 'it', 'de'] as const;
export type RsvpLanguage = typeof RSVP_LANGUAGES[number];

interface LanguageTabsProps {
  activeLanguage: RsvpLanguage;
  onChange: (lang: RsvpLanguage) => void;
  filledLanguages?: string[];
}

export function LanguageTabs({ activeLanguage, onChange, filledLanguages = [] }: LanguageTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {RSVP_LANGUAGES.map((lang) => {
        const isFilled = filledLanguages.includes(lang);
        return (
          <button
            key={lang}
            type="button"
            onClick={() => onChange(lang)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition relative ${
              activeLanguage === lang
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {lang.toUpperCase()}
            {isFilled && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
