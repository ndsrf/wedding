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

  const title = `${t('privacy.title')} - AMP`;
  const description = `${commercialName} privacy policy.`;

  const content = `
    <h1>${t('privacy.title')}</h1>
    <p class="meta">${t('privacy.lastUpdated')}: February 7, 2026</p>
    
    <section>
      <h2>${t('privacy.introduction.title')}</h2>
      <p>${t('privacy.introduction.content', { commercialName })}</p>
    </section>

    <section>
      <h2>${t('privacy.dataCollection.title')}</h2>
      <p>${t('privacy.dataCollection.intro')}</p>
      <ul>
        <li>${t('privacy.dataCollection.items.0')}</li>
        <li>${t('privacy.dataCollection.items.1')}</li>
        <li>${t('privacy.dataCollection.items.2')}</li>
        <li>${t('privacy.dataCollection.items.3')}</li>
      </ul>
    </section>

    <section>
      <h2>${t('privacy.dataUsage.title')}</h2>
      <ul>
        <li>${t('privacy.dataUsage.items.0')}</li>
        <li>${t('privacy.dataUsage.items.1')}</li>
        <li>${t('privacy.dataUsage.items.2')}</li>
        <li>${t('privacy.dataUsage.items.3')}</li>
      </ul>
    </section>

    <section>
      <h2>${t('privacy.dataProtection.title')}</h2>
      <p>${t('privacy.dataProtection.content')}</p>
    </section>

    <div class="cta">
      <a href="/${locale}/contact" class="cta-button">Contact Us</a>
    </div>
  `;

  const styles = `
    .meta { color: #999; font-size: 0.9rem; margin-bottom: 24px; }
    section { margin-top: 32px; }
    h2 { color: #e11d48; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .cta { text-align: center; margin-top: 40px; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/privacy`,
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
