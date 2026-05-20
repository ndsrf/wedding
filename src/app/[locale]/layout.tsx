import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { isValidLanguage } from '@/lib/i18n/config'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import CookieConsent from '@/components/CookieConsent'
import HyperDXProvider from '@/components/observability/HyperDXProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { UniversalNupciBot } from '@/components/shared/UniversalNupciBot'
import { SessionWrapper } from '@/components/auth/SessionWrapper'
import '../globals.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  // Basic validation for metadata as well
  if (!isValidLanguage(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!isValidLanguage(locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages({ locale })

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
      </head>
      <body>
        <HyperDXProvider />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionWrapper>
            <ToastProvider>
              {children}
              <CookieConsent />
              <UniversalNupciBot />
            </ToastProvider>
          </SessionWrapper>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}