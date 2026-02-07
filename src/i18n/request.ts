import { getRequestConfig } from 'next-intl/server';
import { Language } from '@/lib/i18n/config';

const messageImports = {
  en: () => import('../messages/en/common.json'),
  es: () => import('../messages/es/common.json'),
  fr: () => import('../messages/fr/common.json'),
  it: () => import('../messages/it/common.json'),
  de: () => import('../messages/de/common.json'),
};

export default getRequestConfig(async ({ locale }) => {
  const targetLocale = (locale as Language) || 'en';
  const importFn = messageImports[targetLocale as keyof typeof messageImports] || messageImports.en;
  const messages = (await importFn()).default;

  console.log(`[i18n] Loaded messages for locale: "${targetLocale}". Keys: ${Object.keys(messages).join(', ')}`);

  return {
    locale: targetLocale,
    messages
  };
});
