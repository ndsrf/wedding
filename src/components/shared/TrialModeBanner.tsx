'use client';

/**
 * TrialModeBanner
 *
 * Shows a persistent amber banner at the top of all planner/admin screens when
 * the account is in demo/trial mode (max_weddings === 0 && can_delete_weddings === false).
 *
 * Clicking "Learn more" opens a modal explaining the restrictions and offers a
 * "Chat with us" button that opens a Crisp live-chat window so the master admin
 * can be notified and jump into a real-time conversation with the trial user.
 *
 * Requirements:
 *   NEXT_PUBLIC_CRISP_WEBSITE_ID  — your Crisp website ID (from app.crisp.chat)
 *   If not set, falls back to a link to the /contact page.
 */

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

interface TrialModeBannerProps {
  /** Which API endpoint to call to determine trial status */
  statusEndpoint: '/api/planner/trial-status' | '/api/admin/trial-status';
}

export function TrialModeBanner({ statusEndpoint }: TrialModeBannerProps) {
  const t = useTranslations('trialBanner');
  const locale = useLocale();
  const { data: session } = useSession();

  const [isTrialMode, setIsTrialMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const crispConfigured = Boolean(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID);

  // Determine trial status once on mount
  useEffect(() => {
    fetch(statusEndpoint)
      .then(r => r.json())
      .then(d => setIsTrialMode(d.isTrialMode === true))
      .catch(() => {});
  }, [statusEndpoint]);

  // Load and configure Crisp once trial mode is confirmed
  useEffect(() => {
    if (!isTrialMode) return;
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId || typeof window === 'undefined') return;

    // Initialise the command queue before the script arrives
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Pre-fill user identity from session so the agent sees it immediately
    if (session?.user?.email) {
      window.$crisp.push(['set', 'user:email', [session.user.email]]);
    }
    if (session?.user?.name) {
      window.$crisp.push(['set', 'user:nickname', [session.user.name]]);
    }

    // Tag the session for easy filtering in the Crisp inbox
    window.$crisp.push(['set', 'session:segments', [['trial']]]);
    window.$crisp.push(['set', 'session:data', [[['mode', 'trial']]]]);

    // Inject script once
    if (!document.querySelector('script[src*="crisp.chat"]')) {
      const script = document.createElement('script');
      script.src = 'https://client.crisp.chat/l.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isTrialMode, session]);

  if (!isTrialMode) return null;

  const handleChatClick = () => {
    setModalOpen(false);
    if (typeof window !== 'undefined' && window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
    }
  };

  return (
    <>
      {/* ── Persistent banner ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <svg
            className="w-4 h-4 text-amber-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <span className="text-amber-800 font-medium">{t('message')}</span>

          <button
            onClick={() => setModalOpen(true)}
            className="text-amber-700 underline hover:text-amber-900 font-semibold transition-colors whitespace-nowrap"
          >
            {t('learnMore')}
          </button>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-modal-title"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h2
                  id="trial-modal-title"
                  className="text-xl font-bold font-['Playfair_Display']"
                >
                  {t('modal.title')}
                </h2>
              </div>
              <p className="mt-1 text-white/85 text-sm">{t('modal.subtitle')}</p>
            </div>

            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label={t('modal.close')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="px-6 py-5 space-y-5">
              {/* Restrictions list */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {t('modal.restrictions.title')}
                </p>
                <ul className="space-y-2">
                  {(['notifications', 'ai', 'realWeddings'] as const).map(key => (
                    <li key={key} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      {t(`modal.restrictions.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-gray-100" />

              {/* CTA */}
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-500">{t('modal.ctaText')}</p>

                {crispConfigured ? (
                  <button
                    onClick={handleChatClick}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
                  >
                    {/* Chat bubble icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {t('modal.chatWithUs')}
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/contact?reason=trial`}
                    onClick={() => setModalOpen(false)}
                    className="inline-block w-full py-2.5 px-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-full hover:from-rose-600 hover:to-pink-600 transition-all shadow-md text-center"
                  >
                    {t('modal.contactAdmin')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
