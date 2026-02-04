'use client';

import type { LocationBlock } from '@/types/invitation-template';

const FONT_FAMILIES = [
  'Playfair Display, serif',
  'Crimson Text, serif',
  'Cormorant Garamond, serif',
  'Lora, serif',
  'Inter, sans-serif',
  'Poppins, sans-serif',
];

const FONT_SIZES = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem'];

interface LocationBlockEditorProps {
  block: LocationBlock;
  onUpdate: (blockId: string, updates: Partial<LocationBlock>) => void;
  canvasMode?: boolean;
}

/**
 * LocationBlockEditor - Editor for location blocks with styling options
 *
 * Features:
 * - Font family, size, color selection
 * - Google Map style (color or grayscale)
 *
 * @component
 */
export function LocationBlockEditor({
  block,
  onUpdate,
}: LocationBlockEditorProps) {
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
      <h3 className="text-lg font-semibold mb-4">Location Settings</h3>

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
          value={block.style?.fontSize || '1.25rem'}
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
          value={block.style?.color || '#3A4F3C'}
          onChange={(e) => handleUpdateStyle('color', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Map Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Map Style</label>
        <div className="flex gap-2">
          {(['color', 'grayscale'] as const).map((mapStyle) => (
            <button
              key={mapStyle}
              onClick={() => handleUpdateStyle('mapStyle', mapStyle)}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                (block.style?.mapStyle || 'color') === mapStyle
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mapStyle === 'color' ? 'Color' : 'Grayscale'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
