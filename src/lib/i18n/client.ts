/**
 * Client-side translation hooks for React Client Components
 * These hooks can be used in Client Components for reactive translations
 */

'use client';

import { useTranslations as useNextIntlTranslations, useLocale } from 'next-intl';
import { Language, isValidLanguage } from './config';

/**
 * Hook to get translations in Client Components
 *
 * @example
 * const t = useTranslations();
 * return <h1>{t('welcome.title')}</h1>
 *
 * @example with variables
 * const t = useTranslations();
 * return <p>{t('welcome.greeting', { name: 'John' })}</p>
 */
export function useTranslations() {
  const t = useNextIntlTranslations();

  return (key: string, variables?: Record<string, string | number>) => {
    try {
      return t(key, variables);
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key;
    }
  };
}

/**
 * Hook to get the current locale/language
 *
 * @example
 * const locale = useCurrentLocale();
 * console.log(locale); // 'es' | 'en' | 'fr' | 'it' | 'de'
 */
export function useCurrentLocale(): Language {
  const locale = useLocale();
  return isValidLanguage(locale) ? (locale as Language) : 'en';
}

/**
 * Hook to get translations with namespace support
 * Useful for organizing translations by feature/module
 *
 * @param namespace - Translation namespace (e.g., 'master', 'planner', 'admin', 'guest')
 *
 * @example
 * const t = useNamespacedTranslations('master');
 * return <h1>{t('dashboard.title')}</h1>
 * // This will look up 'master.dashboard.title' in the translation files
 */
export function useNamespacedTranslations(namespace: string) {
  const t = useNextIntlTranslations(namespace);

  return (key: string, variables?: Record<string, string | number>) => {
    try {
      return t(key, variables);
    } catch (error) {
      console.error(`Translation error for ${namespace}.${key}`, error);
      return key;
    }
  };
}

/**
 * Hook to format dates according to the current locale
 *
 * @example
 * const formatDate = useFormatDate();
 * const formatted = formatDate(new Date(), { dateStyle: 'long' });
 */
export function useFormatDate() {
  const locale = useCurrentLocale();

  return (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  };
}

/**
 * Hook to format numbers according to the current locale
 *
 * @example
 * const formatNumber = useFormatNumber();
 * const formatted = formatNumber(1234.56, { style: 'currency', currency: 'EUR' });
 */
export function useFormatNumber() {
  const locale = useCurrentLocale();

  return (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value);
  };
}

/**
 * Hook to format relative time (e.g., "2 hours ago", "in 3 days")
 *
 * @example
 * const formatRelativeTime = useFormatRelativeTime();
 * const formatted = formatRelativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"
 */
export function useFormatRelativeTime() {
  const locale = useCurrentLocale();

  return (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  };
}
