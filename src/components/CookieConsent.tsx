'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CookieConsent() {
  const t = useTranslations('cookies');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md bg-white/90">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-['Playfair_Display']">
              {t('title')}
            </h3>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {t('message')}{' '}
              <Link
                href="/privacy"
                className="text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-4"
              >
                {t('privacy')}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleAccept}
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg font-semibold whitespace-nowrap"
            >
              {t('accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
