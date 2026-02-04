/**
 * Language-aware date formatting utility
 */

import type { Language } from '@/lib/i18n/config';

// Map Language type to locale strings
const LOCALE_MAP: Record<Language, string> = {
  ES: 'es-ES',
  EN: 'en-US',
  FR: 'fr-FR',
  IT: 'it-IT',
  DE: 'de-DE',
};

/**
 * Format a date in the specified language
 *
 * @param date - Date to format
 * @param language - Language code (ES, EN, FR, IT, DE)
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 *
 * @example
 * formatDateByLanguage(new Date('2024-06-15'), 'ES')
 * // => "sábado, 15 de junio de 2024"
 *
 * formatDateByLanguage(new Date('2024-06-15'), 'EN')
 * // => "Saturday, June 15, 2024"
 */
export function formatDateByLanguage(
  date: Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = LOCALE_MAP[language];
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString(locale, options || defaultOptions);
}
