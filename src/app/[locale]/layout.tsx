import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { isValidLanguage } from '@/lib/i18n/config'
import { SpeedInsights } from '@vercel/speed-insights/next'
import CookieConsent from '@/components/CookieConsent'
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
    // Performance optimizations
    other: {
      // Preconnect to external domains for faster resource loading
      'link': [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      ].map(l => `<${l.href}>; rel="${l.rel}"${l.crossOrigin ? `; crossorigin` : ''}`).join(', '),
    },
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
        <link
          rel="preload"
          href="/fonts/playfair/playfair-display-400.woff2"
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}