import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { renderAMPPage } from '@/lib/amp';
import { getAllArticles } from '@/lib/news/markdown';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  if (!isValidLanguage(locale)) {
    return new NextResponse('Invalid language', { status: 404 });
  }

  const { t } = await getTranslations(locale as Language);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';
  const articles = getAllArticles(locale);

  const title = `${t('news.title')} - AMP`;
  const description = t('news.subtitle');

  const articlesHtml = articles.map(article => `
    <div class="article-card">
      <amp-img src="${article.image}" width="400" height="225" layout="responsive" alt="${article.title}"></amp-img>
      <div class="article-content">
        <h2><a href="/${locale}/news/${article.slug}">${article.title}</a></h2>
        <p>${article.description}</p>
        <div class="meta">${article.date} • ${article.readTime}</div>
      </div>
    </div>
  `).join('');

  const content = `
    <h1>${t('news.title')}</h1>
    <p>${t('news.subtitle')}</p>
    <div class="articles-grid">
      ${articlesHtml}
    </div>
  `;

  const styles = `
    .articles-grid { margin-top: 24px; }
    .article-card { margin-bottom: 32px; background: #fff; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
    .article-content { padding: 16px; }
    .article-content h2 { margin-top: 0; font-size: 1.5rem; }
    .article-content h2 a { color: #111; text-decoration: none; }
    .article-content p { color: #666; margin: 8px 0; }
    .meta { font-size: 0.85rem; color: #999; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/news`,
    description,
    content,
    styles,
    scripts: ['amp-img'],
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
