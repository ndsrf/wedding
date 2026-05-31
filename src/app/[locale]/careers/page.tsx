import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Footer from '@/components/Footer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
  
  return {
    title: `Careers at ${commercialName}`,
    description: `Join our team at ${commercialName} and help us build the future of wedding management.`,
    alternates: {
      canonical: `/${locale}/careers`,
    }
  };
}

export default async function CareersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isValidLanguage(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const { t } = await getTranslations(locale as Language);
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
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

      {/* Careers Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
              {t('careers.title', { commercialName })}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('careers.subtitle')}
            </p>
          </div>

          <div className="space-y-16">
            {/* How We Work */}
            <section className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
                {t('careers.howWeWork.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-10">
                {t('careers.howWeWork.description', { commercialName })}
              </p>
              <div className="space-y-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="group">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm">
                        {i + 1}
                      </span>
                      {t(`careers.howWeWork.sections.${i}.title`)}
                    </h3>
                    <p className="text-gray-700 pl-11 leading-relaxed">
                      {t(`careers.howWeWork.sections.${i}.content`)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Culture & Values */}
            <section className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
                {t('careers.culture.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-10 italic border-l-4 border-rose-300 pl-6">
                {t('careers.culture.description', { commercialName })}
              </p>
              <div className="grid md:grid-cols-1 gap-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-8 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {t(`careers.culture.sections.${i}.title`)}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {t(`careers.culture.sections.${i}.content`, { commercialName })}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Compensation & Development */}
            <div className="grid md:grid-cols-2 gap-8">
              <section className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                  {t('careers.compensation.title')}
                </h2>
                <p className="text-gray-700 mb-4 font-semibold">
                  {t('careers.compensation.description')}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  {t('careers.compensation.content')}
                </p>
              </section>

              <section className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                  {t('careers.development.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t('careers.development.content')}
                </p>
              </section>
            </div>

            {/* Open Positions */}
            <section className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 font-['Playfair_Display']">
                {t('careers.positions.title')}
              </h2>
              
              <div className="p-8 rounded-xl border-2 border-rose-100 bg-rose-50/30">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {t('careers.positions.softwareEngineer.title')}
                    </h3>
                    <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 text-sm font-semibold rounded-full mt-2">
                      {t('careers.positions.softwareEngineer.location')}
                    </span>
                  </div>
                </div>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  {t('careers.positions.softwareEngineer.description')}
                </p>
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 text-xl">{t('careers.positions.requirements')}:</h4>
                  <ul className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                        {t(`careers.positions.softwareEngineer.requirements.${i}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-gray-900 text-white rounded-2xl shadow-xl p-12">
              <h2 className="text-3xl font-bold mb-6 font-['Playfair_Display']">
                {t('careers.cta.title')}
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('careers.cta.description')}
              </p>
              <Link
                href="/contact"
                className="inline-block px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-bold text-lg hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {t('careers.cta.button')}
              </Link>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
