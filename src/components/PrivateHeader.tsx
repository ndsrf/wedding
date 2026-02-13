'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ReactNode } from 'react';

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

interface PrivateHeaderProps {
  /** Optional title to display (e.g., couple names, planner name) */
  title?: string;
  /** Optional subtitle (e.g., wedding date, business info) */
  subtitle?: string;
  /** Additional content to display in the header (e.g., stats, custom buttons) */
  additionalContent?: ReactNode;
  /** Custom back URL, defaults to going back in history */
  backUrl?: string;
  /** Hide the back button */
  hideBackButton?: boolean;
}

export default function PrivateHeader({
  title,
  subtitle,
  additionalContent,
  backUrl,
  hideBackButton = false
}: PrivateHeaderProps) {
  const t = useTranslations();
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and Back Button */}
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-rose-600 transition-colors"
                aria-label={t('common.navigation.back')}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="ml-1 hidden sm:inline text-sm font-medium">
                  {t('common.navigation.back')}
                </span>
              </button>
            )}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/nupci.webp"
                alt={commercialName}
                width={400}
                height={160}
                className="h-24 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Center: Title and Subtitle */}
          {(title || subtitle) && (
            <div className="hidden md:block flex-1 text-center px-4">
              {title && (
                <h1 className="text-lg font-bold text-gray-900 font-['Playfair_Display']">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {additionalContent}
            <LanguageSwitcher />
            <Link
              href="/api/auth/signout"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-rose-300 transition-all"
            >
              {t('common.navigation.logout')}
            </Link>
          </div>
        </div>

        {/* Mobile Title - shown below on mobile devices */}
        {(title || subtitle) && (
          <div className="md:hidden pb-3 border-t border-gray-100 pt-3 mt-1">
            {title && (
              <h1 className="text-lg font-bold text-gray-900 font-['Playfair_Display']">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
