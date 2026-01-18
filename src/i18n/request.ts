import { getRequestConfig } from 'next-intl/server';
import { getLanguageFromRequest, getTranslations } from '@/lib/i18n/server';

export default getRequestConfig(async () => {
  // Use our custom detection logic which includes headers, etc.
  // Note: We might not have access to search params here easily in all contexts,
  // but getLanguageFromRequest handles headers. 
  // We can also check cookies if needed.
  const locale = await getLanguageFromRequest();
  const { messages } = await getTranslations(locale);

  return {
    locale,
    messages
  };
});
