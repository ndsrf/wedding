import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Footer from '@/components/Footer';
import AMPLink from '@/components/AMPLink';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
  
  return {
    title: `About ${commercialName}`,
    description: `Learn about ${commercialName}`,
    alternates: {
      canonical: `/${locale}/about`,
    }
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isValidLanguage(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const { t } = await getTranslations(locale as Language);
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';

  return (
    <>
      <AMPLink ampUrl={`${baseUrl}/${locale}/about/amp`} />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/images/nupci.webp" alt={commercialName} width={400} height={160} className="h-32 w-auto" />
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

      {/* About Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
              {t('about.title', { commercialName })}
            </h1>
            <p className="text-xl text-gray-600">
              {t('about.subtitle')}
            </p>
          </div>

          {/* About Image */}
          <div className="mb-12 relative w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-xl">
            <Image
              src="/images/about.webp"
              alt={t('about.title', { commercialName })}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-rose-100 space-y-8">
            {/* Mission */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('about.mission.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('about.mission.content', { commercialName })}
              </p>
            </section>

            {/* Story */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('about.story.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {t('about.story.content1', { commercialName })}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('about.story.content2', { commercialName })}
              </p>
            </section>

            {/* Values */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
                {t('about.values.title')}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('about.values.items.0.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('about.values.items.0.content')}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('about.values.items.1.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('about.values.items.1.content')}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('about.values.items.2.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('about.values.items.2.content')}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t('about.values.items.3.title')}
                  </h3>
                  <p className="text-gray-700">
                    {t('about.values.items.3.content')}
                  </p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('about.cta.title')}
              </h2>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
              >
                {t('about.cta.button')}
              </Link>
            </section>
          </div>
        </div>
      </div>

      <Footer />
      </div>
    </>
  );
}
