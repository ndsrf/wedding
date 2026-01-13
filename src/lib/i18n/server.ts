/**
 * Server-side translation utilities for Next.js App Router
 * These functions can be used in Server Components and API routes
 */

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { Language, DEFAULT_LANGUAGE, isValidLanguage } from './config';

/**
 * Cache for loaded translations
 * Prevents loading the same translation file multiple times
 */
const translationCache = new Map<string, Record<string, any>>();

/**
 * Load translations from JSON file with caching
 */
async function loadTranslations(language: Language): Promise<Record<string, any>> {
  const cacheKey = language;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const messages = (await import(`../../../public/locales/${language}/common.json`)).default;
    translationCache.set(cacheKey, messages);
    return messages;
  } catch (error) {
    console.error(`Failed to load translations for ${language}:`, error);

    // Fallback to English if the requested language fails
    if (language !== DEFAULT_LANGUAGE) {
      return loadTranslations(DEFAULT_LANGUAGE);
    }

    return {};
  }
}

/**
 * Get translations for a specific language
 * This is the main function to use in Server Components
 */
export async function getTranslations(language: Language) {
  const messages = await loadTranslations(language);

  return {
    messages,
    /**
     * Translate a key with optional variables
     * @param key - Translation key (supports nested keys with dot notation)
     * @param variables - Variables to interpolate in the translation
     */
    t: (key: string, variables?: Record<string, string | number>) => {
      let translation = getNestedValue(messages, key);

      // Fallback to key if translation not found
      if (translation === undefined || translation === null) {
        console.warn(`Translation not found for key: ${key} in language: ${language}`);
        return key;
      }

      // Convert to string
      translation = String(translation);

      // Interpolate variables
      if (variables) {
        Object.entries(variables).forEach(([varKey, varValue]) => {
          translation = translation.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varValue));
        });
      }

      return translation;
    },
  };
}

/**
 * Standalone translation function for API routes and server actions
 * @param key - Translation key
 * @param language - Target language
 * @param variables - Optional variables for interpolation
 */
export async function t(
  key: string,
  language: Language,
  variables?: Record<string, string | number>
): Promise<string> {
  const { t: translate } = await getTranslations(language);
  return translate(key, variables);
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue(obj, 'user.profile.name')
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get language from request headers
 * Used for detecting user language preference
 */
export async function getLanguageFromRequest(): Promise<Language> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');

  if (acceptLanguage) {
    const preferredLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (isValidLanguage(preferredLang)) {
      return preferredLang as Language;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * next-intl request configuration
 * This is used by next-intl to determine the locale for each request
 */
export default getRequestConfig(async ({ locale }) => {
  const language = isValidLanguage(locale) ? (locale as Language) : DEFAULT_LANGUAGE;

  return {
    messages: await loadTranslations(language),
  };
});

/**
 * Clear the translation cache
 * Useful for development or when translations are updated
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}
