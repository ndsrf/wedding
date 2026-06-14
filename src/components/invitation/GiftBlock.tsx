'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GiftBlock as GiftBlockType, SupportedLanguage } from '@/types/invitation-template';

interface GiftBlockProps {
  block: GiftBlockType;
  language: SupportedLanguage;
  iban?: string;
}

export function GiftBlock({ block, iban }: GiftBlockProps) {
  const t = useTranslations('common.buttons');
  const [copied, setCopied] = useState(false);

  const { style } = block;

  const alignmentClass = 
    style.alignment === 'left' ? 'justify-start' :
    style.alignment === 'right' ? 'justify-end' :
    'justify-center';

  async function handleCopy() {
    if (!iban) return;
    try {
      await navigator.clipboard.writeText(iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy IBAN:', err);
    }
  }

  const isTransparent = !style.backgroundColor || style.backgroundColor === 'transparent';

  const displayIban = iban || 'ES00 0000 0000 0000 0000 0000';

  return (
    <div className={`px-4 py-6 w-full flex ${alignmentClass}`}>
      <div 
        className="w-full max-w-md p-2 rounded-lg border-2 shadow-sm transition-all"
        style={{
          backgroundColor: isTransparent ? 'transparent' : style.backgroundColor,
          borderColor: isTransparent && style.borderColor === '#E5E7EB' ? 'transparent' : style.borderColor,
          color: style.textColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
        }}
      >
        <div 
          className="flex flex-col sm:flex-row gap-3 p-2 rounded-lg"
          style={{ backgroundColor: style.textColor + '08' }}
        >
          <div 
            className="flex-1 px-4 py-3 font-mono font-bold break-all flex items-center justify-center sm:justify-start"
            style={{ fontSize: 'inherit' }}
          >
            {displayIban}
          </div>
          <button
            onClick={handleCopy}
            className="p-3 rounded-md font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center min-w-[44px]"
            style={{
              backgroundColor: style.buttonColor,
              color: style.buttonTextColor,
            }}
            title={t('copy')}
          >
            {copied ? (
              <span className="text-lg">✓</span>
            ) : (
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
