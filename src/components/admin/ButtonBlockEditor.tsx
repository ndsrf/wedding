'use client';

import { useEffect } from 'react';
import type { ButtonBlock, SupportedLanguage } from '@/types/invitation-template';
import { loadFont } from '@/lib/fonts';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

const FONT_FAMILIES = [
  'Alex Brush, cursive',
  'Allura, cursive',
  'Cedarville Cursive, cursive',
  'Cormorant Garamond, serif',
  'Crimson Text, serif',
  'Dancing Script, cursive',
  'Dawning of a New Day, cursive',
  'EB Garamond, serif',
  'Great Vibes, cursive',
  'Homemade Apple, cursive',
  'Inter, sans-serif',
  'Licorice, cursive',
  'Libre Baskerville, serif',
  'Lora, serif',
  'Montserrat, sans-serif',
  'Nanum Pen Script, cursive',
  'Parisienne, cursive',
  'Playfair Display, serif',
  'Poppins, sans-serif',
  'Sacramento, cursive',
  'Tangerine, cursive',
];

interface ButtonBlockEditorProps {
  block: ButtonBlock;
  activeLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdate: (blockId: string, updates: Partial<ButtonBlock>) => void;
  canvasMode?: boolean;
}

/**
 * ButtonBlockEditor - Editor for button blocks with language support
 *
 * Features:
 * - Multi-language button text (ES, EN, FR, IT, DE)
 * - URL configuration
 * - Button color, text color, font family
 * - Button alignment (left, center, right)
 *
 * @component
 */
export function ButtonBlockEditor({
  block,
  activeLanguage,
  onLanguageChange,
  onUpdate,
  canvasMode,
}: ButtonBlockEditorProps) {
  const languageText = block.text[activeLanguage];
  const alignment = block.style.alignment || 'center';

  // Load all fonts when component mounts
  useEffect(() => {
    const fontNames = FONT_FAMILIES.map(f => f.split(',')[0].trim());
    fontNames.forEach(fontName => {
      try {
        // @ts-expect-error - fontName is a string from our list
        loadFont(fontName);
      } catch (e) {
        console.warn(`Failed to load font: ${fontName}`, e);
      }
    });
  }, []);

  // If in canvas mode, show preview
  if (canvasMode) {
    const alignmentClass =
      alignment === 'left' ? 'justify-start' :
      alignment === 'right' ? 'justify-end' :
      'justify-center';

    return (
      <div className="p-4 space-y-4">
        {/* Language Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isFilled = block.text[lang] && block.text[lang].trim().length > 0;
            return (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  activeLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } relative`}
              >
                {lang}
                {isFilled && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Button Text Input */}
        <input
          type="text"
          value={languageText}
          onChange={(e) =>
            onUpdate(block.id, {
              text: {
                ...block.text,
                [activeLanguage]: e.target.value,
              },
            })
          }
          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder={`Enter ${activeLanguage} button text...`}
        />

        {/* URL Input */}
        <input
          type="url"
          value={block.url}
          onChange={(e) => onUpdate(block.id, { url: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder="Button URL (e.g., https://example.com)"
        />

        {/* Button Preview */}
        <div className={`flex ${alignmentClass}`}>
          <a
            href={block.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-lg font-medium transition hover:opacity-90"
            style={{
              backgroundColor: block.style.buttonColor,
              color: block.style.textColor,
              fontFamily: block.style.fontFamily,
            }}
            onClick={(e) => e.preventDefault()}
          >
            {languageText || 'Button Text'}
          </a>
        </div>
      </div>
    );
  }

  // Sidebar mode
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Button Settings</h3>

      {/* Language Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isFilled = block.text[lang] && block.text[lang].trim().length > 0;
            return (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  activeLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } relative`}
              >
                {lang}
                {isFilled && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Button Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Button Text</label>
        <input
          type="text"
          value={languageText}
          onChange={(e) =>
            onUpdate(block.id, {
              text: {
                ...block.text,
                [activeLanguage]: e.target.value,
              },
            })
          }
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          placeholder={`Enter ${activeLanguage} button text...`}
        />
      </div>

      {/* URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">URL</label>
        <input
          type="url"
          value={block.url}
          onChange={(e) => onUpdate(block.id, { url: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          placeholder="https://example.com"
        />
      </div>

      {/* Font Family */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Font</label>
        <select
          value={block.style.fontFamily}
          onChange={(e) =>
            onUpdate(block.id, {
              style: { ...block.style, fontFamily: e.target.value },
            })
          }
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font.split(',')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* Button Color */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Button Color</label>
        <input
          type="color"
          value={block.style.buttonColor}
          onChange={(e) =>
            onUpdate(block.id, {
              style: { ...block.style, buttonColor: e.target.value },
            })
          }
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Text Color */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Text Color</label>
        <input
          type="color"
          value={block.style.textColor}
          onChange={(e) =>
            onUpdate(block.id, {
              style: { ...block.style, textColor: e.target.value },
            })
          }
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Alignment */}
      <div>
        <label className="block text-sm font-medium mb-2">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() =>
                onUpdate(block.id, {
                  style: { ...block.style, alignment: align },
                })
              }
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                alignment === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {align === 'left' && '⬅'}
              {align === 'center' && '⬆⬇'}
              {align === 'right' && '➡'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
