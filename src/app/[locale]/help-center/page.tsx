'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import LanguageSelector from '@/components/LanguageSelector';
import Footer from '@/components/Footer';

export default function HelpCenterPage() {
  const t = useTranslations();
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center">
              <Image src="/images/nupci.webp" alt={commercialName} width={668} height={374} className="h-16 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <Link
                href="/auth/signin"
                className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
              >
                {t('landing.nav.login')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-16">
        <div className="bg-gray-900 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-['Playfair_Display']">
              {t('helpCenter.title')}
            </h1>
            <p className="text-xl text-gray-300">
              {t('helpCenter.subtitle')}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-16 px-4">
          <div className="prose prose-lg max-w-none text-gray-600 mb-16">
            <p className="text-xl leading-relaxed">
              {t('helpCenter.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('helpCenter.statusTitle')}</h2>
              <p className="text-gray-600 mb-6 flex-grow">
                {t('helpCenter.statusDescription')}
              </p>
              <a
                href="https://status.nupci.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-rose-600 font-semibold hover:text-rose-700 transition-colors"
              >
                {t('helpCenter.statusLink')}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('helpCenter.contactTitle')}</h2>
              <p className="text-gray-600 mb-6 flex-grow">
                {t('helpCenter.contactDescription')}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center text-rose-600 font-semibold hover:text-rose-700 transition-colors"
              >
                {t('helpCenter.contactLink')}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
