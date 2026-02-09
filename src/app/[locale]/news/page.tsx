import { getTranslations } from '@/lib/i18n/server'
import Link from 'next/link'
import Image from 'next/image'
import { getAllArticles } from '@/lib/news/markdown'
import { Metadata } from 'next'
import { generateAMPMetadata, generateStructuredData } from '@/lib/amp'
import LanguageSelector from '@/components/LanguageSelector'
import { Language } from '@/lib/i18n/config'

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const { t } = await getTranslations(locale as Language)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com'
  const title = t('news.title')
  const description = t('news.subtitle')

  return generateAMPMetadata({
    canonical: `${baseUrl}/${locale}/news`,
    title,
    description,
    image: `${baseUrl}/images/news/wedding-planner.jpg`,
    type: 'website',
  })
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { t } = await getTranslations(locale as Language)
  const articles = getAllArticles(locale)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com'
  const structuredData = generateStructuredData({
    type: 'WebPage',
    name: t('news.title'),
    description: t('news.subtitle'),
    url: `${baseUrl}/${locale}/news`,
    image: `${baseUrl}/images/news/wedding-planner.jpg`,
  })

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/${locale}`} className="flex items-center">
              <Image src="/images/nupci.webp" alt={commercialName} width={400} height={160} className="h-32 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href={`/${locale}#features`} className="text-gray-700 hover:text-rose-600 transition-colors">
                {t('landing.nav.features')}
              </Link>
              <Link href={`/${locale}#pricing`} className="text-gray-700 hover:text-rose-600 transition-colors">
                {t('landing.nav.pricing')}
              </Link>
              <Link href={`/${locale}#testimonials`} className="text-gray-700 hover:text-rose-600 transition-colors">
                {t('landing.nav.testimonials')}
              </Link>
              <Link href={`/${locale}/news`} className="text-rose-600 font-semibold transition-colors">
                {t('news.title')}
              </Link>
              <LanguageSelector />
              <Link
                href="/auth/signin"
                className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
              >
                {t('landing.nav.login')}
              </Link>
            </nav>
            <div className="md:hidden flex items-center gap-2">
              <LanguageSelector />
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-sm"
              >
                {t('landing.nav.login')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pb-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('news.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('news.subtitle')}
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/${locale}/news/${article.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span>{article.category}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3 group-hover:text-rose-600 transition">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(article.date).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-rose-600 font-medium group-hover:underline">
                      {t('news.readMore')} →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-rose-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-6">
            {t('news.cta.title')}
          </h2>
          <Link
            href={`/${locale}`}
            className="inline-block px-8 py-4 bg-white text-rose-600 rounded-full font-semibold hover:bg-gray-50 transition-all hover:scale-105"
          >
            {t('news.cta.button')}
          </Link>
        </div>
      </section>
      </div>
    </>
  )
}
