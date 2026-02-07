import { getRequestConfig } from 'next-intl/server';
import { Language, isValidLanguage, DEFAULT_LANGUAGE } from '@/lib/i18n/config';

const messageImports = {
  en: () => import('../messages/en/common.json'),
  es: () => import('../messages/es/common.json'),
  fr: () => import('../messages/fr/common.json'),
  it: () => import('../messages/it/common.json'),
  de: () => import('../messages/de/common.json'),
};

export default getRequestConfig(async ({ locale }) => {
  // Validate locale - handle undefined or empty string
  const isValid = typeof locale === 'string' && isValidLanguage(locale);
  const targetLocale = (isValid ? locale : DEFAULT_LANGUAGE) as Language;
  
  const importFn = messageImports[targetLocale] || messageImports.en;
  const messages = (await importFn()).default;

  if (isValid) {
    console.log(`[i18n] Loaded messages for locale: "${targetLocale}". Keys: ${Object.keys(messages).join(', ')}`);
  }

  return {
    locale: targetLocale,
    messages
  };
});
