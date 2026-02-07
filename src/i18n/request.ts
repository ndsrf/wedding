import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { Language } from '@/lib/i18n/config';

export default getRequestConfig(async ({ locale }) => {
  // Ensure locale is a string and valid
  const targetLocale = (locale && routing.locales.includes(locale as Language)) 
    ? locale 
    : routing.defaultLocale;

  return {
    locale: targetLocale,
    messages: (await import(`../../public/locales/${targetLocale}/common.json`)).default
  };
});
