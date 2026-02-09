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

  const title = `${commercialName} - AMP Landing Page`;
  const description = t('landing.hero.subtitle', { commercialName });

  const content = `
    <h1>${t('landing.hero.title')}</h1>
    <p class="subtitle">${description}</p>
    
    <div class="hero-image">
      <amp-img src="/images/novios.webp" width="800" height="533" layout="responsive" alt="Wedding planning"></amp-img>
    </div>

    <div class="features">
      <h2>${t('landing.features.title')}</h2>
      <p>${t('landing.features.subtitle')}</p>
      
      <div class="feature-item">
        <h3>${t('landing.features.items.guestManagement.title')}</h3>
        <p>${t('landing.features.items.guestManagement.description')}</p>
      </div>
      
      <div class="feature-item">
        <h3>${t('landing.features.items.invitationDesigner.title')}</h3>
        <p>${t('landing.features.items.invitationDesigner.description')}</p>
      </div>
    </div>

    <div class="cta">
      <a href="/${locale}/contact" class="cta-button">${t('landing.hero.cta.primary')}</a>
    </div>
  `;

  const styles = `
    .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 24px; }
    .features { margin-top: 40px; }
    .feature-item { margin-bottom: 24px; padding: 16px; background: #fff5f7; border-radius: 8px; }
    .feature-item h3 { color: #e11d48; margin-top: 0; }
    .cta { text-align: center; margin-top: 40px; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}`,
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
