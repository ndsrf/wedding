import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { generateAMPMetadata } from '@/lib/amp';
import Footer from '@/components/Footer';
import AMPLink from '@/components/AMPLink';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
  const title = `Documentation - ${commercialName}`;
  const description = `Learn how to use ${commercialName} for wedding management. Complete documentation for planners, couples, and guests.`;

  return generateAMPMetadata({
    canonical: `${baseUrl}/${locale}/docs`,
    title,
    description,
    type: 'website',
  });
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  guests: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  configure: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  templates: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  invitationBuilder: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  notifications: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  reports: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  seating: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  checklist: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  providers: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  payments: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  gallery: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  nupcibot: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

const FEATURE_COLORS: Record<string, { icon: string; border: string; bg: string; badge: string; badgeText: string }> = {
  guests:            { icon: 'text-rose-600',   border: 'border-rose-100',   bg: 'bg-rose-50',    badge: 'bg-rose-100',   badgeText: 'text-rose-700' },
  configure:         { icon: 'text-orange-600', border: 'border-orange-100', bg: 'bg-orange-50',  badge: 'bg-orange-100', badgeText: 'text-orange-700' },
  templates:         { icon: 'text-pink-600',   border: 'border-pink-100',   bg: 'bg-pink-50',    badge: 'bg-pink-100',   badgeText: 'text-pink-700' },
  invitationBuilder: { icon: 'text-fuchsia-600',border: 'border-fuchsia-100',bg: 'bg-fuchsia-50', badge: 'bg-fuchsia-100',badgeText: 'text-fuchsia-700' },
  notifications:     { icon: 'text-amber-600',  border: 'border-amber-100',  bg: 'bg-amber-50',   badge: 'bg-amber-100',  badgeText: 'text-amber-700' },
  reports:           { icon: 'text-emerald-600',border: 'border-emerald-100',bg: 'bg-emerald-50', badge: 'bg-emerald-100',badgeText: 'text-emerald-700' },
  seating:           { icon: 'text-cyan-600',   border: 'border-cyan-100',   bg: 'bg-cyan-50',    badge: 'bg-cyan-100',   badgeText: 'text-cyan-700' },
  checklist:         { icon: 'text-teal-600',   border: 'border-teal-100',   bg: 'bg-teal-50',    badge: 'bg-teal-100',   badgeText: 'text-teal-700' },
  providers:         { icon: 'text-indigo-600', border: 'border-indigo-100', bg: 'bg-indigo-50',  badge: 'bg-indigo-100', badgeText: 'text-indigo-700' },
  payments:          { icon: 'text-yellow-600', border: 'border-yellow-100', bg: 'bg-yellow-50',  badge: 'bg-yellow-100', badgeText: 'text-yellow-700' },
  gallery:           { icon: 'text-purple-600', border: 'border-purple-100', bg: 'bg-purple-50',  badge: 'bg-purple-100', badgeText: 'text-purple-700' },
  nupcibot:          { icon: 'text-rose-600',   border: 'border-rose-100',   bg: 'bg-gradient-to-br from-rose-50 to-pink-50', badge: 'bg-rose-100', badgeText: 'text-rose-700' },
};

const FEATURE_KEYS = [
  'guests', 'configure', 'templates', 'invitationBuilder',
  'notifications', 'reports', 'seating', 'checklist',
  'providers', 'payments', 'gallery', 'nupcibot',
] as const;

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
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
      <AMPLink ampUrl={`${baseUrl}/${locale}/docs/amp`} />
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

        {/* Docs Content */}
        <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Page title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                {t('docs.title')}
              </h1>
              <p className="text-xl text-gray-600">
                {t('docs.subtitle', { commercialName })}
              </p>
            </div>

            <div className="space-y-8">
              {/* Overview */}
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <section>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4 font-['Playfair_Display']">
                    {t('docs.overview.title', { commercialName })}
                  </h2>
                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    {t('docs.overview.content1', { commercialName })}
                  </p>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {t('docs.overview.content2', { commercialName })}
                  </p>
                </section>
              </div>

              {/* Target Users */}
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <section>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
                    {t('docs.targetUsers.title', { commercialName })}
                  </h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{t('docs.targetUsers.planner.title')}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{t('docs.targetUsers.planner.content')}</p>
                    </div>
                    <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{t('docs.targetUsers.couple.title')}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{t('docs.targetUsers.couple.content')}</p>
                    </div>
                    <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{t('docs.targetUsers.guest.title')}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{t('docs.targetUsers.guest.content')}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Key Features summary */}
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <section>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 font-['Playfair_Display']">
                    {t('docs.keyFeatures.title')}
                  </h2>
                  <ul className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{t(`docs.keyFeatures.items.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Detailed Feature Pages */}
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
                <section>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 font-['Playfair_Display']">
                    {t('docs.features.title')}
                  </h2>
                  <p className="text-gray-500 mb-8 text-sm">
                    {commercialName} admin panel at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-rose-600">/admin</code>
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {FEATURE_KEYS.map((key) => {
                      const colors = FEATURE_COLORS[key];
                      const icon = FEATURE_ICONS[key];
                      // nupcibot has no admin path
                      const rawPath = key !== 'nupcibot' ? t(`docs.features.${key}.path`) : '';
                      const featurePath = rawPath && rawPath !== `docs.features.${key}.path` ? rawPath : null;

                      const cardContent = (
                        <div className={`p-5 rounded-xl border ${colors.border} ${colors.bg} h-full flex flex-col gap-3 ${featurePath ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.badge}`}>
                                <span className={colors.icon}>{icon}</span>
                              </div>
                              <h3 className="font-bold text-gray-900 text-base leading-tight">
                                {t(`docs.features.${key}.title`)}
                              </h3>
                            </div>
                            {featurePath && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0 ${colors.badge} ${colors.badgeText}`}>
                                {featurePath}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed flex-1">
                            {t(`docs.features.${key}.content`)}
                          </p>
                          {featurePath && (
                            <span className={`text-xs font-semibold flex items-center gap-1 ${colors.icon}`}>
                              Go to {featurePath}
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      );

                      if (featurePath) {
                        return (
                          <Link key={key} href={featurePath}>
                            {cardContent}
                          </Link>
                        );
                      }
                      return <div key={key}>{cardContent}</div>;
                    })}
                  </div>
                </section>
              </div>

              {/* Getting Started */}
              <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-8 md:p-10 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-4 font-['Playfair_Display']">
                  {t('docs.gettingStarted.title')}
                </h2>
                <p className="leading-relaxed mb-6 text-rose-50">
                  {t('docs.gettingStarted.content')}
                </p>
                <Link
                  href="/contact"
                  className="inline-block px-8 py-3 bg-white text-rose-600 rounded-full font-semibold hover:bg-rose-50 transition-all shadow-lg hover:shadow-xl"
                >
                  {t('docs.gettingStarted.button')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
