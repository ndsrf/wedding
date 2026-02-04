'use client';

import type { TextBlock, SupportedLanguage } from '@/types/invitation-template';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

const FONT_FAMILIES = [
  'Playfair Display, serif',
  'Crimson Text, serif',
  'Cormorant Garamond, serif',
  'Lora, serif',
  'Alex Brush, cursive',
  'Inter, sans-serif',
  'Poppins, sans-serif',
];

const FONT_SIZES = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem'];

interface TextBlockEditorProps {
  block: TextBlock;
  activeLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdate: (blockId: string, updates: Partial<TextBlock>) => void;
  canvasMode?: boolean;
}

/**
 * TextBlockEditor - Editor for text blocks with language support
 *
 * Features:
 * - Multi-language content editing (ES, EN, FR, IT, DE)
 * - Font family, size, color selection
 * - Text alignment options
 * - Language fill status indicators
 *
 * @component
 */
export function TextBlockEditor({
  block,
  activeLanguage,
  onLanguageChange,
  onUpdate,
  canvasMode,
}: TextBlockEditorProps) {
  const languageContent = block.content[activeLanguage];

  // If in canvas mode, show preview with editing
  if (canvasMode) {
    return (
      <div className="p-4 space-y-4">
        {/* Language Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isFilled = block.content[lang] && block.content[lang].trim().length > 0;
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

        {/* Text Input */}
        <textarea
          value={languageContent}
          onChange={(e) =>
            onUpdate(block.id, {
              content: {
                ...block.content,
                [activeLanguage]: e.target.value,
              },
            })
          }
          className="w-full p-3 border border-gray-300 rounded resize-none h-24 focus:outline-none focus:border-blue-500"
          placeholder={`Enter ${activeLanguage} text...`}
        />

        {/* Text Preview */}
        <div
          className="p-4 rounded border border-gray-200 text-center min-h-12"
          style={{
            fontFamily: block.style.fontFamily,
            fontSize: block.style.fontSize,
            color: block.style.color,
            textAlign: block.style.textAlign,
            fontWeight: block.style.fontWeight || 'normal',
            fontStyle: block.style.fontStyle || 'normal',
            textDecoration: block.style.textDecoration || 'none',
          }}
        >
          {languageContent || '(empty)'}
        </div>
      </div>
    );
  }

  // Sidebar mode
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Style</h3>

      {/* Language Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isFilled = block.content[lang] && block.content[lang].trim().length > 0;
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

      {/* Text Content */}
      <div className="mb-4">
        <textarea
          value={languageContent}
          onChange={(e) =>
            onUpdate(block.id, {
              content: {
                ...block.content,
                [activeLanguage]: e.target.value,
              },
            })
          }
          className="w-full p-3 border border-gray-300 rounded resize-none h-20 focus:outline-none focus:border-blue-500 text-sm"
          placeholder={`Enter ${activeLanguage} text...`}
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
            <option key={font} value={font}>
              {font.split(',')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Size</label>
        <select
          value={block.style.fontSize}
          onChange={(e) =>
            onUpdate(block.id, {
              style: { ...block.style, fontSize: e.target.value },
            })
          }
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Color</label>
        <input
          type="color"
          value={block.style.color}
          onChange={(e) =>
            onUpdate(block.id, {
              style: { ...block.style, color: e.target.value },
            })
          }
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Text Align */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() =>
                onUpdate(block.id, {
                  style: { ...block.style, textAlign: align },
                })
              }
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                block.style.textAlign === align
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

      {/* Text Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Style</label>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onUpdate(block.id, {
                style: { ...block.style, fontWeight: block.style.fontWeight === 'bold' ? 'normal' : 'bold' },
              })
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
              block.style.fontWeight === 'bold'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() =>
              onUpdate(block.id, {
                style: { ...block.style, fontStyle: block.style.fontStyle === 'italic' ? 'normal' : 'italic' },
              })
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-italic transition ${
              block.style.fontStyle === 'italic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Italic"
          >
            <span className="italic">I</span>
          </button>
          <button
            onClick={() =>
              onUpdate(block.id, {
                style: { ...block.style, textDecoration: block.style.textDecoration === 'underline' ? 'none' : 'underline' },
              })
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
              block.style.textDecoration === 'underline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Underline"
          >
            <span className="underline">U</span>
          </button>
        </div>
      </div>
    </div>
  );
}
