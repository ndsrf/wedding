'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function Footer() {
  const t = useTranslations();
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8 text-left">
          <div>
            <h3 className="text-xl font-bold mb-4 font-['Playfair_Display']">{commercialName}</h3>
            <p className="text-gray-400">
              {t('landing.footer.tagline')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.product')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  {t('landing.nav.features')}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-white transition-colors">
                  {t('landing.nav.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/#testimonials" className="hover:text-white transition-colors">
                  {t('landing.nav.testimonials')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.company')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t('landing.footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-white transition-colors">
                  {t('news.title')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  {t('landing.footer.contact')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t('landing.footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.support')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  {t('landing.footer.help')}
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  {t('landing.footer.docs')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© 2026 {commercialName}. {t('landing.footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
