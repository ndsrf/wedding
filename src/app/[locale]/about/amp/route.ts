import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { renderAMPPage } from '@/lib/amp';

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
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  const title = `${t('about.title', { commercialName })} - AMP`;
  const description = t('about.subtitle');

  const content = `
    <h1>${t('about.title', { commercialName })}</h1>
    <p class="subtitle">${t('about.subtitle')}</p>
    
    <div class="hero-image">
      <amp-img src="/images/about.webp" width="800" height="450" layout="responsive" alt="About ${commercialName}"></amp-img>
    </div>

    <section>
      <h2>${t('about.mission.title')}</h2>
      <p>${t('about.mission.content', { commercialName })}</p>
    </section>

    <section>
      <h2>${t('about.story.title')}</h2>
      <p>${t('about.story.content1', { commercialName })}</p>
      <p>${t('about.story.content2', { commercialName })}</p>
    </section>

    <div class="cta">
      <a href="/${locale}/contact" class="cta-button">${t('about.cta.button')}</a>
    </div>
  `;

  const styles = `
    .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 24px; }
    section { margin-top: 32px; }
    h2 { color: #e11d48; border-bottom: 2px solid #fff5f7; padding-bottom: 8px; }
    .cta { text-align: center; margin-top: 40px; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/about`,
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
