import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getLanguageFromRequest } from '@/lib/i18n/server';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../globals.css'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLanguageFromRequest();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
