import {createNavigation} from 'next-intl/navigation';
import {SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE} from '@/lib/i18n/config';

export const routing = {
  // A list of all locales that are supported
  locales: SUPPORTED_LANGUAGES as unknown as string[],

  // Used when no locale matches
  defaultLocale: DEFAULT_LANGUAGE,
  
  // Always include the locale in the URL (e.g., /es, /en)
  localePrefix: 'always' as const,

  // Enable locale detection based on browser headers for public pages.
  // This is specifically used in middleware for SEO-friendly public routes.
  localeDetection: true
};

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);