'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';

export default function PrivacyPage() {
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

      {/* Privacy Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
              {t('privacy.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('privacy.lastUpdated')}: February 7, 2026
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.introduction.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t('privacy.introduction.content', { commercialName })}
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.dataCollection.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.dataCollection.intro')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>{t('privacy.dataCollection.items.0')}</li>
                <li>{t('privacy.dataCollection.items.1')}</li>
                <li>{t('privacy.dataCollection.items.2')}</li>
                <li>{t('privacy.dataCollection.items.3')}</li>
              </ul>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.dataUsage.title')}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>{t('privacy.dataUsage.items.0')}</li>
                <li>{t('privacy.dataUsage.items.1')}</li>
                <li>{t('privacy.dataUsage.items.2')}</li>
                <li>{t('privacy.dataUsage.items.3')}</li>
              </ul>
            </section>

            {/* Data Protection */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.dataProtection.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t('privacy.dataProtection.content')}
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.userRights.title')}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>{t('privacy.userRights.items.0')}</li>
                <li>{t('privacy.userRights.items.1')}</li>
                <li>{t('privacy.userRights.items.2')}</li>
                <li>{t('privacy.userRights.items.3')}</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.contact.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t('privacy.contact.content')}{' '}
                <Link href="/contact" className="text-rose-600 hover:text-rose-700 font-semibold">
                  {t('privacy.contact.link')}
                </Link>
              </p>
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
