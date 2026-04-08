'use client';

import { useState } from 'react';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import { ChevronDown } from 'lucide-react';

interface MobileNavProps {
  locale: string;
  translations: {
    features: string;
    pricing: string;
    resources: string;
    news: string;
    helpCenter: string;
    login: string;
  };
}

export default function MobileNav({ locale, translations }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center gap-2">
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:text-rose-600 transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            // X icon when menu is open
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            // Hamburger icon when menu is closed
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      <LanguageSelector />

      <Link
        href="/auth/signin"
        className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-sm"
      >
        {translations.login}
      </Link>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bg-white shadow-lg z-50 border-b border-rose-100 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col p-4 space-y-2">
              <Link
                href={`/${locale}#features`}
                className="text-gray-700 hover:text-rose-600 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {translations.features}
              </Link>
              <Link
                href={`/${locale}#pricing`}
                className="text-gray-700 hover:text-rose-600 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {translations.pricing}
              </Link>
              
              {/* Resources Dropdown */}
              <div className="flex flex-col">
                <button
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  className="flex items-center justify-between w-full text-gray-700 hover:text-rose-600 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50 font-medium"
                >
                  <span>{translations.resources}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isResourcesOpen ? 'rotate-180' : ''}`} />
                </button>

                {isResourcesOpen && (
                  <div className="pl-4 flex flex-col space-y-1 mt-1 border-l-2 border-rose-100 ml-4">
                    <Link
                      href={`/${locale}/news`}
                      className="text-gray-600 hover:text-rose-600 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50"
                      onClick={() => setIsOpen(false)}
                    >
                      {translations.news}
                    </Link>
                    <Link
                      href={`/${locale}/docs`}
                      className="text-gray-600 hover:text-rose-600 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50"
                      onClick={() => setIsOpen(false)}
                    >
                      {translations.helpCenter}
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
