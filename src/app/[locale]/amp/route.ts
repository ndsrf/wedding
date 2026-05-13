import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from '@/lib/i18n/server';
import { Language, isValidLanguage } from '@/lib/i18n/config';
import { renderAMPPage } from '@/lib/amp';

const FEATURE_KEYS = [
  'guestManagement',
  'invitationDesigner',
  'multiChannel',
  'taskManagement',
  'seatingPlanner',
  'giftTracking',
  'clientManagement',
  'locations',
  'quotesAndBudgets',
  'contractsSignature',
  'invoicesPayments',
  'menuTasting',
];

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

  const title = t('landing.title', { commercialName });
  const description = t('landing.hero.subtitle', { commercialName });

  const featuresHtml = FEATURE_KEYS.map((key) => `
    <div class="feature-card">
      <h3 class="feature-title">${t(`landing.features.items.${key}.title`)}</h3>
      <p class="feature-desc">${t(`landing.features.items.${key}.description`)}</p>
    </div>
  `).join('');

  const testimonialsHtml = [0, 1, 2].map((i) => `
    <div class="testimonial-card">
      <div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p class="testimonial-text">&ldquo;${t(`landing.testimonials.items.${i}.text`, { commercialName })}&rdquo;</p>
      <div class="testimonial-author">
        <div class="author-avatar">${t(`landing.testimonials.items.${i}.name`).charAt(0)}</div>
        <div>
          <p class="author-name">${t(`landing.testimonials.items.${i}.name`)}</p>
          <p class="author-role">${t(`landing.testimonials.items.${i}.role`)}</p>
        </div>
      </div>
    </div>
  `).join('');

  const pricingTrialFeatures = [0, 1, 2].map((i) => `
    <li class="plan-feature"><span class="check">&#10003;</span> ${t(`landing.pricing.plans.trial.features.${i}`)}</li>
  `).join('');

  const pricingStandardFeatures = [0, 1, 2, 3].map((i) => `
    <li class="plan-feature plan-feature-white"><span class="check">&#10003;</span> ${t(`landing.pricing.plans.standard.features.${i}`)}</li>
  `).join('');

  const pricingProFeatures = [0, 1, 2, 3].map((i) => `
    <li class="plan-feature"><span class="check check-purple">&#10003;</span> ${t(`landing.pricing.plans.pro.features.${i}`)}</li>
  `).join('');

  const content = `
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-image">
        <amp-img src="/images/novios.webp" width="800" height="533" layout="responsive" alt="Wedding planning"></amp-img>
      </div>
      <h1 class="hero-title">${t('landing.hero.title')}</h1>
      <p class="hero-subtitle">${description}</p>
      <div class="hero-cta">
        <a href="/${locale}/auth/signup" class="btn-primary">${t('landing.hero.cta.primary')}</a>
        <a href="/${locale}/docs" class="btn-secondary">${t('landing.hero.cta.secondary')}</a>
      </div>
      <p class="hero-trial">${t('landing.hero.trial')}</p>
    </section>

    <!-- Features Section -->
    <section class="section" id="features">
      <h2 class="section-title">${t('landing.features.title')}</h2>
      <p class="section-subtitle">${t('landing.features.subtitle')}</p>
      <div class="features-grid">
        ${featuresHtml}
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="section section-pink">
      <h2 class="section-title">${t('landing.testimonials.title')}</h2>
      <p class="section-subtitle">${t('landing.testimonials.subtitle', { commercialName })}</p>
      <div class="testimonials-grid">
        ${testimonialsHtml}
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="section" id="pricing">
      <h2 class="section-title">${t('landing.pricing.title')}</h2>
      <p class="section-subtitle">${t('landing.pricing.subtitle')}</p>

      <div class="pricing-grid">
        <!-- Free Trial -->
        <div class="plan-card">
          <h3 class="plan-name">${t('landing.pricing.plans.trial.name')}</h3>
          <div class="plan-price">${t('landing.pricing.plans.trial.price')}</div>
          <ul class="plan-features">
            ${pricingTrialFeatures}
          </ul>
          <a href="/${locale}/auth/signup" class="btn-dark">${t('landing.pricing.cta')}</a>
        </div>

        <!-- Standard (Popular) -->
        <div class="plan-card plan-card-featured">
          <div class="plan-badge">${t('landing.pricing.popular')}</div>
          <h3 class="plan-name">${t('landing.pricing.plans.standard.name')}</h3>
          <div class="plan-price">${t('landing.pricing.contactUs')}</div>
          <ul class="plan-features">
            ${pricingStandardFeatures}
          </ul>
          <a href="/${locale}/contact" class="btn-white">${t('landing.pricing.cta')}</a>
        </div>

        <!-- Pro -->
        <div class="plan-card">
          <h3 class="plan-name">${t('landing.pricing.plans.pro.name')}</h3>
          <div class="plan-price">${t('landing.pricing.plans.pro.price')}</div>
          <ul class="plan-features">
            ${pricingProFeatures}
          </ul>
          <a href="/${locale}/contact" class="btn-purple">${t('landing.pricing.contactUs')}</a>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="cta-section">
      <h2 class="cta-title">${t('landing.cta.title')}</h2>
      <p class="cta-subtitle">${t('landing.cta.subtitle', { commercialName })}</p>
      <a href="/${locale}/auth/signup" class="btn-cta">${t('landing.cta.button')}</a>
    </section>
  `;

  const styles = `
    /* Hero */
    .hero { text-align: center; padding: 20px 0 40px; }
    .hero-image { margin: 0 0 24px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .hero-title { font-family: Georgia, serif; font-size: 2rem; color: #111; margin: 0 0 16px; line-height: 1.2; }
    .hero-subtitle { font-size: 1.1rem; color: #555; margin: 0 0 24px; line-height: 1.6; }
    .hero-cta { display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .hero-trial { font-size: 0.85rem; color: #999; margin-top: 16px; }
    .btn-primary { display: inline-block; background: linear-gradient(to right, #f43f5e, #ec4899); color: #fff; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1rem; }
    .btn-secondary { display: inline-block; background: #fff; color: #f43f5e; border: 2px solid #f43f5e; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1rem; }

    /* Sections */
    .section { padding: 48px 0; }
    .section-pink { background: linear-gradient(135deg, #fff1f2 0%, #fdf2f8 100%); margin: 0 -20px; padding: 48px 20px; }
    .section-title { font-family: Georgia, serif; font-size: 1.8rem; color: #111; text-align: center; margin: 0 0 12px; }
    .section-subtitle { font-size: 1rem; color: #666; text-align: center; margin: 0 0 32px; }

    /* Features Grid */
    .features-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .feature-card { background: #fff5f7; border: 1px solid #ffe4e6; border-radius: 12px; padding: 20px; }
    .feature-title { font-size: 1rem; font-weight: 700; color: #e11d48; margin: 0 0 8px; }
    .feature-desc { font-size: 0.9rem; color: #555; margin: 0; line-height: 1.5; }

    /* Testimonials */
    .testimonials-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .testimonial-card { background: #fff; border: 1px solid #ffe4e6; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .stars { color: #f43f5e; font-size: 1.1rem; margin-bottom: 12px; letter-spacing: 2px; }
    .testimonial-text { font-style: italic; color: #444; line-height: 1.6; margin: 0 0 16px; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .author-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(to right, #f43f5e, #ec4899); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 1.1rem; flex-shrink: 0; }
    .author-name { font-weight: 600; color: #111; margin: 0 0 2px; font-size: 0.95rem; }
    .author-role { color: #888; font-size: 0.8rem; margin: 0; }

    /* Pricing */
    .pricing-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .plan-card { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 16px; padding: 28px; position: relative; }
    .plan-card-featured { background: linear-gradient(135deg, #f43f5e, #ec4899); border-color: transparent; color: #fff; }
    .plan-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #fbbf24; color: #111; font-size: 0.7rem; font-weight: 700; padding: 4px 14px; border-radius: 9999px; white-space: nowrap; }
    .plan-name { font-size: 1.3rem; font-weight: 700; margin: 0 0 8px; }
    .plan-price { font-size: 2rem; font-weight: 700; margin: 0 0 20px; }
    .plan-features { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 10px; }
    .plan-feature { font-size: 0.9rem; color: #444; display: flex; align-items: flex-start; gap: 8px; }
    .plan-feature-white { color: #fff; }
    .check { color: #22c55e; font-weight: 700; flex-shrink: 0; }
    .check-purple { color: #8b5cf6; }
    .btn-dark { display: block; text-align: center; background: #111; color: #fff; padding: 12px 20px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.95rem; }
    .btn-white { display: block; text-align: center; background: #fff; color: #e11d48; padding: 12px 20px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.95rem; }
    .btn-purple { display: block; text-align: center; background: linear-gradient(to right, #7c3aed, #4f46e5); color: #fff; padding: 12px 20px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.95rem; }

    /* Final CTA */
    .cta-section { background: linear-gradient(to right, #e11d48, #db2777); color: #fff; text-align: center; padding: 48px 20px; margin: 0 -20px; }
    .cta-title { font-family: Georgia, serif; font-size: 1.8rem; margin: 0 0 16px; }
    .cta-subtitle { font-size: 1rem; opacity: 0.9; margin: 0 0 28px; line-height: 1.5; }
    .btn-cta { display: inline-block; background: #fff; color: #e11d48; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 1rem; }

    /* Nav links */
    .header-nav { display: flex; gap: 20px; justify-content: center; padding: 10px 0 0; flex-wrap: wrap; }
    .header-nav a { color: #555; text-decoration: none; font-size: 0.9rem; }
    .header-login { display: inline-block; background: linear-gradient(to right, #f43f5e, #ec4899); color: #fff !important; padding: 8px 20px; border-radius: 9999px; font-weight: 600; font-size: 0.85rem !important; }
  `;

  const headerNav = `
    <nav class="header-nav">
      <a href="#features">${t('landing.nav.features')}</a>
      <a href="#pricing">${t('landing.nav.pricing')}</a>
      <a href="/${locale}/news">${t('landing.nav.news')}</a>
      <a href="/${locale}/auth/signin" class="header-login">${t('landing.nav.login')}</a>
    </nav>
  `;

  const html = renderAMPPage({
    locale,
    title,
    canonical: `${baseUrl}/${locale}`,
    description,
    content,
    styles,
    scripts: [],
    headerNav,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
