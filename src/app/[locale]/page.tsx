import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';
import { Metadata } from 'next';
import { isValidLanguage } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import AMPLink from '@/components/AMPLink';
import LandingFeatureCard from '@/components/LandingFeatureCard';
import { ArcadeEmbed } from '@/components/ArcadeEmbed';
import VideoHero from '@/components/guest/VideoHero';
import ResourcesDropdown from '@/components/ResourcesDropdown';
import TrialSignupButton from '@/components/TrialSignupButton';
import { ChevronsRight } from 'lucide-react';

const LANDING_FEATURES: Array<{
  key: string;
  bg: string;
  border: string;
  iconGradient: string;
  iconPaths: string[];
}> = [
  {
    key: 'guestManagement',
    bg: 'from-rose-50 to-pink-50',
    border: 'border-rose-100',
    iconGradient: 'from-rose-500 to-pink-500',
    iconPaths: ['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'],
  },
  {
    key: 'invitationDesigner',
    bg: 'from-purple-50 to-indigo-50',
    border: 'border-purple-100',
    iconGradient: 'from-purple-500 to-indigo-500',
    iconPaths: ['M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'],
  },
  {
    key: 'multiChannel',
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-100',
    iconGradient: 'from-blue-500 to-cyan-500',
    iconPaths: ['M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
  },
  {
    key: 'taskManagement',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-100',
    iconGradient: 'from-emerald-500 to-teal-500',
    iconPaths: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'],
  },
  {
    key: 'seatingPlanner',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-100',
    iconGradient: 'from-amber-500 to-orange-500',
    iconPaths: ['M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z'],
  },
  {
    key: 'giftTracking',
    bg: 'from-fuchsia-50 to-pink-50',
    border: 'border-fuchsia-100',
    iconGradient: 'from-fuchsia-500 to-pink-500',
    iconPaths: ['M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'],
  },
  {
    key: 'clientManagement',
    bg: 'from-violet-50 to-purple-50',
    border: 'border-violet-100',
    iconGradient: 'from-violet-500 to-purple-500',
    iconPaths: ['M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
  },
  {
    key: 'locations',
    bg: 'from-green-50 to-lime-50',
    border: 'border-green-100',
    iconGradient: 'from-green-500 to-lime-500',
    iconPaths: [
      'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
      'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    ],
  },
  {
    key: 'quotesAndBudgets',
    bg: 'from-sky-50 to-blue-50',
    border: 'border-sky-100',
    iconGradient: 'from-sky-500 to-blue-500',
    iconPaths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'],
  },
  {
    key: 'contractsSignature',
    bg: 'from-slate-50 to-gray-50',
    border: 'border-slate-100',
    iconGradient: 'from-slate-500 to-gray-500',
    iconPaths: ['M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'],
  },
  {
    key: 'invoicesPayments',
    bg: 'from-yellow-50 to-amber-50',
    border: 'border-yellow-100',
    iconGradient: 'from-yellow-500 to-amber-500',
    iconPaths: ['M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'],
  },
  {
    key: 'menuTasting',
    bg: 'from-orange-50 to-red-50',
    border: 'border-orange-100',
    iconGradient: 'from-orange-500 to-red-500',
    iconPaths: ['M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'],
  },
];

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: `${commercialName} - Wedding Management Platform`,
    description: `Transform your wedding planning business with ${commercialName}`,
    alternates: {
      canonical: `/${locale}`,
    }
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isValidLanguage(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: '' });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';

  return (
    <>
      <AMPLink ampUrl={`${baseUrl}/${locale}/amp`} />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/images/nupci.webp" alt={commercialName} width={668} height={374} className="h-12 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-rose-600 transition-colors">
                {t('landing.nav.features')}
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-rose-600 transition-colors">
                {t('landing.nav.pricing')}
              </a>
              <ResourcesDropdown
                locale={locale}
                translations={{
                  resources: t('landing.nav.resources'),
                  news: t('landing.nav.news'),
                  helpCenter: t('landing.nav.helpCenter'),
                }}
              />
              <LanguageSelector />
              <Link
                href="/auth/signin"
                className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
              >
                {t('landing.nav.login')}
              </Link>
            </nav>
            <MobileNav
              locale={locale}
              translations={{
                features: t('landing.nav.features'),
                pricing: t('landing.nav.pricing'),
                resources: t('landing.nav.resources'),
                news: t('landing.nav.news'),
                helpCenter: t('landing.nav.helpCenter'),
                login: t('landing.nav.login'),
              }}
            />
          </div>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <VideoHero
        title={t('landing.hero.title')}
        subtitle={t('landing.hero.subtitle', { commercialName })}
        ctaPrimary={t('landing.hero.cta.primary')}
        ctaSecondary={t('landing.hero.cta.secondary')}
        locale={locale}
      />

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-playfair">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-20 relative group">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-12 ring-rose-50/30 transform hover:scale-[1.01] transition-transform duration-500">
              <ArcadeEmbed />
            </div>
            <Link
              href={`/${locale}/docs`}
              className="absolute -right-4 lg:-right-32 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-rose-500 hover:text-rose-600 transition-all duration-300 transform hover:translate-x-2 font-medium group/link"
            >
              <span className="whitespace-nowrap">{t('landing.features.seeMore')}</span>
              <ChevronsRight className="w-5 h-5" />
            </Link>
            <div className="mt-12 flex justify-center md:hidden">
              <Link
                href={`/${locale}/docs`}
                className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-medium"
              >
                <span>{t('landing.features.seeMore')}</span>
                <ChevronsRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {LANDING_FEATURES.map((feature) => (
              <LandingFeatureCard
                key={feature.key}
                title={t(`landing.features.items.${feature.key}.title`)}
                description={t(`landing.features.items.${feature.key}.description`)}
                iconPaths={feature.iconPaths}
                bg={feature.bg}
                border={feature.border}
                iconGradient={feature.iconGradient}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-playfair">
              {t('landing.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('landing.testimonials.subtitle', { commercialName })}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow border border-rose-100">
              <div className="flex items-center mb-4">
                <div className="flex text-rose-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                {t('landing.testimonials.items.0.text', { commercialName })}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                  {t('landing.testimonials.items.0.name').charAt(0)}
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">{t('landing.testimonials.items.0.name')}</p>
                  <p className="text-gray-600 text-sm">{t('landing.testimonials.items.0.role')}</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow border border-rose-100">
              <div className="flex items-center mb-4">
                <div className="flex text-rose-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                {t('landing.testimonials.items.1.text')}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold text-lg">
                  {t('landing.testimonials.items.1.name').charAt(0)}
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">{t('landing.testimonials.items.1.name')}</p>
                  <p className="text-gray-600 text-sm">{t('landing.testimonials.items.1.role')}</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow border border-rose-100">
              <div className="flex items-center mb-4">
                <div className="flex text-rose-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                {t('landing.testimonials.items.2.text', { commercialName })}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
                  {t('landing.testimonials.items.2.name').charAt(0)}
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">{t('landing.testimonials.items.2.name')}</p>
                  <p className="text-gray-600 text-sm">{t('landing.testimonials.items.2.role')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-playfair">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Trial */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('landing.pricing.plans.trial.name')}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{t('landing.pricing.plans.trial.price')}</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.trial.features.0')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.trial.features.1')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.trial.features.2')}</span>
                </li>
              </ul>
              <TrialSignupButton
                label={t('landing.pricing.cta')}
                locale={locale}
                className="block w-full py-3 px-6 text-center bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
              />
            </div>

            {/* Standard Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white transform md:scale-105 shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                {t('landing.pricing.popular')}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {t('landing.pricing.plans.standard.name')}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t('landing.pricing.contactUs')}</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-white mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('landing.pricing.plans.standard.features.0')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-white mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('landing.pricing.plans.standard.features.1')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-white mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('landing.pricing.plans.standard.features.2')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-white mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('landing.pricing.plans.standard.features.3')}</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full py-3 px-6 text-center bg-white text-rose-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('landing.pricing.cta')}
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('landing.pricing.plans.pro.name')}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{t('landing.pricing.plans.pro.price')}</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.pro.features.0')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.pro.features.1')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.pro.features.2')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{t('landing.pricing.plans.pro.features.3')}</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full py-3 px-6 text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                {t('landing.pricing.contactUs')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-rose-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-playfair">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-white/90 mb-10">
            {t('landing.cta.subtitle', { commercialName })}
          </p>
          <TrialSignupButton
            label={t('landing.cta.button')}
            locale={locale}
            className="inline-block px-10 py-4 bg-white text-rose-600 rounded-full text-lg font-semibold hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          />
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
}
