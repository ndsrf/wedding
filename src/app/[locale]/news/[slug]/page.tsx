import { getTranslations } from '@/lib/i18n/server'
import Link from 'next/link'
import Image from 'next/image'
import { getArticle, getAllArticles } from '@/lib/news/markdown'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { generateAMPMetadata } from '@/lib/amp'
import LanguageSelector from '@/components/LanguageSelector'
import { Language } from '@/lib/i18n/config'

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const locales = ['en', 'es', 'fr', 'it', 'de']
  const params: { locale: string; slug: string }[] = []

  for (const locale of locales) {
    const articles = getAllArticles(locale)
    for (const article of articles) {
      params.push({ locale, slug: article.slug })
    }
  }

  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com'

  try {
    const article = await getArticle(slug, locale)

    return generateAMPMetadata({
      canonical: `${baseUrl}/${locale}/news/${slug}`,
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      image: article.frontmatter.image,
      type: 'article',
      publishedTime: article.frontmatter.date,
      author: article.frontmatter.author,
    })
  } catch {
    return {
      title: 'Article Not Found',
    }
  }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  const { t } = await getTranslations(locale as Language)

  let article
  try {
    article = await getArticle(slug, locale)
  } catch {
    notFound()
  }

  const { frontmatter, content } = article

  return (
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

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-24 pb-4">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <Link href={`/${locale}`} className="hover:text-rose-600 transition">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${locale}/news`} className="hover:text-rose-600 transition">
            {t('news.title')}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{frontmatter.title}</span>
        </nav>
      </div>

      {/* Article Header */}
      <article className="pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Hero Image */}
            <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
              <Image
                src={frontmatter.image}
                alt={frontmatter.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Article Content Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mb-6">
                <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full font-medium">
                  {frontmatter.category}
                </span>
                <span className="font-medium">{frontmatter.readTime}</span>
                <span>•</span>
                <span>
                  {new Date(frontmatter.date).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span>{frontmatter.author}</span>
              </div>

              {/* Title */}
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                {frontmatter.title}
              </h1>

              {/* Content */}
              <div
                className="prose prose-lg prose-rose max-w-none
                  prose-headings:font-serif prose-headings:font-bold prose-headings:text-gray-900
                  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                  prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-gray-900 prose-p:leading-relaxed prose-p:mb-6
                  prose-a:text-rose-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-strong:text-gray-900 prose-strong:font-bold
                  prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
                  prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
                  prose-li:text-gray-900 prose-li:mb-2 prose-li:leading-relaxed
                  prose-img:rounded-xl prose-img:shadow-lg
                  prose-blockquote:text-gray-800 prose-blockquote:border-rose-500
                  prose-code:text-gray-900 prose-code:bg-rose-50 prose-code:px-1 prose-code:rounded"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>
      </article>

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
  )
}
