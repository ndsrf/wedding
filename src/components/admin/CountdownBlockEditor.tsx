'use client';

import type { CountdownBlock } from '@/types/invitation-template';

const FONT_FAMILIES = [
  'Playfair Display, serif',
  'Crimson Text, serif',
  'Cormorant Garamond, serif',
  'Lora, serif',
  'Inter, sans-serif',
  'Poppins, sans-serif',
];

const FONT_SIZES = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem'];

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
      <h3 className="text-lg font-semibold mb-4">Countdown Settings</h3>

      {/* Font Family */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Font</label>
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
        <label className="block text-sm font-medium mb-2">Size</label>
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
        <label className="block text-sm font-medium mb-2">Color</label>
        <input
          type="color"
          value={block.style?.color || '#D4AF37'}
          onChange={(e) => handleUpdateStyle('color', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>
    </div>
  );
}
