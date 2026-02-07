'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';

export default function DocsPage() {
  const t = useTranslations();
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/images/nupci.png" alt={commercialName} width={400} height={160} className="h-32 w-auto" />
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

      {/* Docs Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
              {t('docs.title')}
            </h1>
            <p className="text-xl text-gray-600">
              {t('docs.subtitle')}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100 space-y-8">
            {/* Overview */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('docs.overview.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {t('docs.overview.content1')}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('docs.overview.content2')}
              </p>
            </section>

            {/* Target Users */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('docs.targetUsers.title')}
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('docs.targetUsers.planner.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('docs.targetUsers.planner.content')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('docs.targetUsers.couple.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('docs.targetUsers.couple.content')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('docs.targetUsers.guest.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('docs.targetUsers.guest.content')}
                  </p>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('docs.keyFeatures.title')}
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-rose-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('docs.keyFeatures.items.0')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-rose-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('docs.keyFeatures.items.1')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-rose-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('docs.keyFeatures.items.2')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-rose-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('docs.keyFeatures.items.3')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-rose-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('docs.keyFeatures.items.4')}</span>
                </li>
              </ul>
            </section>

            {/* Getting Started */}
            <section className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-xl border border-rose-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('docs.gettingStarted.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('docs.gettingStarted.content')}
              </p>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
              >
                {t('docs.gettingStarted.button')}
              </Link>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">© 2026 {commercialName}. {t('landing.footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
