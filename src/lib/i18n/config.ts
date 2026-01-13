/**
 * Internationalization configuration for the Wedding Management Platform
 * Supports 5 languages: Spanish, English, French, Italian, and German
 */

export type Language = 'es' | 'en' | 'fr' | 'it' | 'de';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['es', 'en', 'fr', 'it', 'de'] as const;

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  it: '🇮🇹',
  de: '🇩🇪',
};

/**
 * Language detection priority:
 * 1. User preference (from database)
 * 2. URL parameter (?lang=es)
 * 3. Browser language (Accept-Language header)
 * 4. Wedding default language
 * 5. Platform default (English)
 */
export function detectLanguage(
  userPreference?: string,
  urlParameter?: string,
  browserLanguage?: string,
  weddingDefault?: string
): Language {
  // Priority 1: User preference
  if (userPreference && isValidLanguage(userPreference)) {
    return userPreference as Language;
  }

  // Priority 2: URL parameter
  if (urlParameter && isValidLanguage(urlParameter)) {
    return urlParameter as Language;
  }

  // Priority 3: Browser language
  if (browserLanguage) {
    const browserLang = browserLanguage.split('-')[0].toLowerCase();
    if (isValidLanguage(browserLang)) {
      return browserLang as Language;
    }
  }

  // Priority 4: Wedding default
  if (weddingDefault && isValidLanguage(weddingDefault)) {
    return weddingDefault as Language;
  }

  // Priority 5: Platform default
  return DEFAULT_LANGUAGE;
}

/**
 * Validate if a language code is supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
}

/**
 * Get the fallback language for a given language
 * Always falls back to English
 */
export function getFallbackLanguage(lang: Language): Language {
  return lang === DEFAULT_LANGUAGE ? DEFAULT_LANGUAGE : DEFAULT_LANGUAGE;
}

/**
 * next-intl configuration
 */
export const i18nConfig = {
  locales: SUPPORTED_LANGUAGES as unknown as string[],
  defaultLocale: DEFAULT_LANGUAGE,
};
