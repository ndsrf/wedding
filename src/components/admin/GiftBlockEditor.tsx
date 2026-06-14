'use client';

import { useTranslations } from 'next-intl';
import type { GiftBlock } from '@/types/invitation-template';

interface GiftBlockEditorProps {
  block: GiftBlock;
  onUpdate: (blockId: string, updates: Partial<GiftBlock>) => void;
}

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

const FONT_SIZES = ['0.625rem', '0.75rem', '0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem'];

export function GiftBlockEditor({
  block,
  onUpdate,
}: GiftBlockEditorProps) {
  const handleStyleChange = (updates: Partial<GiftBlock['style']>) => {
    onUpdate(block.id, {
      style: { ...block.style, ...updates },
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Gift Block (IBAN)</h3>
      <p className="text-sm text-gray-500 mb-6">
        This block displays the wedding's bank account number.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Background</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={block.style.backgroundColor === 'transparent' ? '#ffffff' : block.style.backgroundColor}
                onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                className="flex-1 h-9 rounded cursor-pointer border border-gray-200"
                disabled={block.style.backgroundColor === 'transparent'}
              />
              <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.style.backgroundColor === 'transparent'}
                  onChange={(e) => handleStyleChange({ 
                    backgroundColor: e.target.checked ? 'transparent' : '#ffffff' 
                  })}
                />
                Transp.
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Text Color</label>
            <input
              type="color"
              value={block.style.textColor}
              onChange={(e) => handleStyleChange({ textColor: e.target.value })}
              className="w-full h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Border Color</label>
            <input
              type="color"
              value={block.style.borderColor}
              onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
              className="w-full h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Button Color</label>
            <input
              type="color"
              value={block.style.buttonColor}
              onChange={(e) => handleStyleChange({ buttonColor: e.target.value })}
              className="w-full h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Button Text</label>
            <input
              type="color"
              value={block.style.buttonTextColor}
              onChange={(e) => handleStyleChange({ buttonTextColor: e.target.value })}
              className="w-full h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Alignment</label>
            <select
              value={block.style.alignment || 'center'}
              onChange={(e) => handleStyleChange({ alignment: e.target.value as 'left' | 'center' | 'right' })}
              className="w-full p-2 border border-gray-300 rounded text-xs"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium mb-1">Font</label>
          <select
            value={block.style.fontFamily}
            onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium mb-1">Size</label>
          <select
            value={block.style.fontSize}
            onChange={(e) => handleStyleChange({ fontSize: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
