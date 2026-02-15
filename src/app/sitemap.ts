import { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/news/markdown'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com'
const locales = ['en', 'es', 'fr', 'it', 'de']

// Revalidate sitemap every hour (3600 seconds)
// This ensures new articles appear in the sitemap within an hour of publishing
export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = []

  // Static routes for each locale
  const staticPages = [
    '',           // Home
    '/about',
    '/contact',
    '/docs',
    '/news',
    '/privacy',
  ]

  for (const locale of locales) {
    for (const page of staticPages) {
      // Regular page
      routes.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      })

      // AMP version
      routes.push({
        url: `${baseUrl}/${locale}${page}/amp`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 0.9 : 0.7,
      })
    }
  }

  // News articles for each locale
  for (const locale of locales) {
    try {
      const articles = getAllArticles(locale)

      for (const article of articles) {
        // Regular article page
        routes.push({
          url: `${baseUrl}/${locale}/news/${article.slug}`,
          lastModified: new Date(article.date),
          changeFrequency: 'monthly',
          priority: 0.6,
        })

        // AMP article page
        routes.push({
          url: `${baseUrl}/${locale}/news/${article.slug}/amp`,
          lastModified: new Date(article.date),
          changeFrequency: 'monthly',
          priority: 0.5,
        })
      }
    } catch (error) {
      console.error(`Error loading articles for locale ${locale}:`, error)
    }
  }

  return routes
}
