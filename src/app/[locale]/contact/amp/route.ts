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

  const title = `${t('contact.title')} - AMP`;
  const description = t('contact.subtitle');

  const content = `
    <h1>${t('contact.title')}</h1>
    <p class="subtitle">${t('contact.subtitle')}</p>
    
    <div class="contact-info">
      <p>For inquiries, please visit our full contact page to send us a message.</p>
      <a href="/${locale}/contact" class="cta-button">Go to Full Contact Form</a>
    </div>

    <div class="support-info">
      <h2>Support</h2>
      <p>Need help? Check our <a href="/${locale}/docs">documentation</a> or reach out to our sales team.</p>
    </div>
  `;

  const styles = `
    .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 24px; }
    .contact-info { margin-top: 32px; padding: 24px; background: #fff5f7; border-radius: 8px; text-align: center; }
    .support-info { margin-top: 40px; }
    h2 { color: #e11d48; }
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}/contact`,
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
