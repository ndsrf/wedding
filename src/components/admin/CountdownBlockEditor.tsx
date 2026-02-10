'use client';

import { useTranslations } from 'next-intl';
import type { CountdownBlock } from '@/types/invitation-template';

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

const FONT_SIZES = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem'];
const LABEL_FONT_SIZES = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem'];

interface CountdownBlockEditorProps {
  block: CountdownBlock;
  onUpdate: (blockId: string, updates: Partial<CountdownBlock>) => void;
  canvasMode?: boolean;
}

/**
 * CountdownBlockEditor - Editor for countdown blocks with styling options
 *
 * Features:
 * - Font family, size, color selection
 *
 * @component
 */
export function CountdownBlockEditor({
  block,
  onUpdate,
}: CountdownBlockEditorProps) {
  const t = useTranslations('admin.invitationBuilder');

  const handleUpdateStyle = (key: string, value: string) => {
    onUpdate(block.id, {
      style: {
        ...block.style,
        [key]: value,
      },
    });
  };

  // Sidebar mode
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">{t('countdownSettings')}</h3>

      {/* Font Family */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('font')}</label>
        <select
          value={block.style?.fontFamily || 'Lora, serif'}
          onChange={(e) => handleUpdateStyle('fontFamily', e.target.value)}
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
        <label className="block text-sm font-medium mb-2">{t('size')}</label>
        <select
          value={block.style?.fontSize || '2.25rem'}
          onChange={(e) => handleUpdateStyle('fontSize', e.target.value)}
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
        <label className="block text-sm font-medium mb-2">{t('color')}</label>
        <input
          type="color"
          value={block.style?.color || '#D4AF37'}
          onChange={(e) => handleUpdateStyle('color', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Text Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('textStyle')}</label>
        <div className="flex gap-2">
          <button
            onClick={() =>
              handleUpdateStyle('fontWeight', (block.style?.fontWeight || 'normal') === 'bold' ? 'normal' : 'bold')
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
              (block.style?.fontWeight || 'normal') === 'bold'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={t('bold')}
          >
            B
          </button>
          <button
            onClick={() =>
              handleUpdateStyle('fontStyle', (block.style?.fontStyle || 'normal') === 'italic' ? 'normal' : 'italic')
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-italic transition ${
              (block.style?.fontStyle || 'normal') === 'italic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={t('italic')}
          >
            <span className="italic">I</span>
          </button>
          <button
            onClick={() =>
              handleUpdateStyle('textDecoration', (block.style?.textDecoration || 'none') === 'underline' ? 'none' : 'underline')
            }
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
              (block.style?.textDecoration || 'none') === 'underline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={t('underline')}
          >
            <span className="underline">U</span>
          </button>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 my-6"></div>
      <h4 className="text-md font-semibold mb-4">{t('labelSettings')}</h4>

      {/* Label Font Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('labelSize')}</label>
        <select
          value={block.style?.labelFontSize || '0.875rem'}
          onChange={(e) => handleUpdateStyle('labelFontSize', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        >
          {LABEL_FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Label Color */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('labelColor')}</label>
        <input
          type="color"
          value={block.style?.labelColor || '#6B7280'}
          onChange={(e) => handleUpdateStyle('labelColor', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>
    </div>
  );
}
