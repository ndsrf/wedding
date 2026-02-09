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

  const title = `${t('docs.title')} - AMP`;
  const description = t('docs.subtitle');

  const content = `
    <h1>${t('docs.title')}</h1>
    <p class="subtitle">${t('docs.subtitle')}</p>
    
    <section>
      <h2>${t('docs.overview.title')}</h2>
      <p>${t('docs.overview.content1')}</p>
      <p>${t('docs.overview.content2')}</p>
    </section>

    <section>
      <h2>${t('docs.targetUsers.title')}</h2>
      <div class="user-type">
        <h3>${t('docs.targetUsers.planner.title')}</h3>
        <p>${t('docs.targetUsers.planner.content')}</p>
      </div>
      <div class="user-type">
        <h3>${t('docs.targetUsers.couple.title')}</h3>
        <p>${t('docs.targetUsers.couple.content')}</p>
      </div>
    </section>

    <div class="cta">
      <a href="/${locale}/contact" class="cta-button">${t('docs.gettingStarted.button')}</a>
    </div>
  `;

  const styles = `
    .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 24px; }
    section { margin-top: 32px; }
    .user-type { margin-bottom: 20px; padding: 16px; border-left: 4px solid #e11d48; background: #fff5f7; }
    .user-type h3 { margin-top: 0; }
    .cta { text-align: center; margin-top: 40px; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/docs`,
    description,
    content,
    styles,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
