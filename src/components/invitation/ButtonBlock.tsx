'use client';

import type { ButtonBlock as ButtonBlockType, SupportedLanguage } from '@/types/invitation-template';

interface ButtonBlockProps {
  text: ButtonBlockType['text'];
  url: string;
  style: ButtonBlockType['style'];
  language: SupportedLanguage;
}

/**
 * ButtonBlock - Renders a customizable button in the invitation
 *
 * @component
 */
export function ButtonBlock({ text, url, style, language }: ButtonBlockProps) {
  const buttonText = text[language] || text['EN'] || '';
  const alignment = style.alignment || 'center';

  const alignmentClass =
    alignment === 'left' ? 'justify-start' :
    alignment === 'right' ? 'justify-end' :
    'justify-center';

  if (!buttonText || !url) {
    return null;
  }

  return (
    <div className={`flex ${alignmentClass} p-1`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-6 py-3 rounded-lg font-medium transition hover:opacity-90"
        style={{
          backgroundColor: style.buttonColor,
          color: style.textColor,
          fontFamily: style.fontFamily,
        }}
      >
        {buttonText}
      </a>
    </div>
  );
}
