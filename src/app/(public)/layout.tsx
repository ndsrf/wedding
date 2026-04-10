import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getLanguageFromRequest } from '@/lib/i18n/server';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import HyperDXProvider from '@/components/observability/HyperDXProvider';
import { ToastProvider } from '@/components/ui/Toast';
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
      <head>
        {/* Preload critical fonts for optimal FCP */}
        <link
          rel="preload"
          href="/fonts/playfair/playfair-display-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Resource hints for external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <HyperDXProvider />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
