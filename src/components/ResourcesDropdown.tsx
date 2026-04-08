'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface ResourcesDropdownProps {
  locale: string;
  translations: {
    resources: string;
    news: string;
    helpCenter: string;
  };
}

export default function ResourcesDropdown({ locale, translations }: ResourcesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-gray-700 hover:text-rose-600 transition-colors focus:outline-none"
      >
        {translations.resources}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-rose-100 py-2 z-50">
          <Link
            href={`/${locale}/news`}
            className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            {translations.news}
          </Link>
          <Link
            href={`/${locale}/docs`}
            className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            {translations.helpCenter}
          </Link>
        </div>
      )}
    </div>
  );
}
