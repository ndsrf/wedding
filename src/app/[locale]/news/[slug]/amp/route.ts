import { NextRequest, NextResponse } from 'next/server';
import { isValidLanguage } from '@/lib/i18n/config';
import { renderAMPPage, convertToAMPHtml } from '@/lib/amp';
import { getArticle } from '@/lib/news/markdown';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;

  if (!isValidLanguage(locale)) {
    return new NextResponse('Invalid language', { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';

  let article;
  try {
    article = await getArticle(slug, locale);
  } catch {
    return new NextResponse('Article not found', { status: 404 });
  }

  const { frontmatter, content: articleContent } = article;

  const title = `${frontmatter.title} - AMP`;
  const description = frontmatter.description;

  const content = `
    <div class="breadcrumb">
      <a href="/${locale}/news">News</a> / ${frontmatter.title}
    </div>
    <h1>${frontmatter.title}</h1>
    <div class="meta">
      By ${frontmatter.author} on ${new Date(frontmatter.date).toLocaleDateString(locale)}
    </div>
    <div class="hero-image">
      <amp-img src="${frontmatter.image}" width="800" height="450" layout="responsive" alt="${frontmatter.title}"></amp-img>
    </div>
    <div class="article-body">
      ${convertToAMPHtml(articleContent)}
    </div>
  `;

  const styles = `
    .breadcrumb { font-size: 0.9rem; color: #666; margin-bottom: 16px; }
    .meta { font-size: 0.9rem; color: #999; margin-bottom: 24px; }
    .article-body { font-size: 1.1rem; line-height: 1.8; }
    .article-body img { max-width: 100%; height: auto; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/news/${slug}`,
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
