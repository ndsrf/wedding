'use client';

import Image from 'next/image';
import type { ImageBlock } from '@/types/invitation-template';

interface ImageBlockEditorProps {
  block: ImageBlock;
  onUpdate: (blockId: string, updates: Partial<ImageBlock>) => void;
  onOpenPicker: () => void;
  canvasMode?: boolean;
}

/**
 * ImageBlockEditor - Editor for image blocks
 *
 * Features:
 * - Image preview
 * - Image picker integration
 * - Alt text editing
 *
 * @component
 */
export function ImageBlockEditor({
  block,
  onUpdate,
  onOpenPicker,
  canvasMode,
}: ImageBlockEditorProps) {
  const alignment = block.alignment || 'center';
  const zoom = block.zoom || 100;

  if (canvasMode) {
    const alignmentClass =
      alignment === 'left' ? 'mr-auto' :
      alignment === 'right' ? 'ml-auto' :
      'mx-auto';

    return (
      <div className="p-4 space-y-4">
        {block.src ? (
          <div
            className={`relative bg-gray-100 rounded overflow-hidden ${alignmentClass}`}
            style={{
              width: `${zoom}%`,
              maxWidth: '100%',
              aspectRatio: '16/9'
            }}
          >
            <Image
              src={block.src}
              alt={block.alt || 'Block image'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="mb-4">No image selected</p>
              <button
                onClick={onOpenPicker}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Pick Image
              </button>
            </div>
          </div>
        )}

        {block.src && (
          <div className="space-y-2">
            <button
              onClick={onOpenPicker}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Change Image
            </button>
            <input
              type="text"
              value={block.alt}
              onChange={(e) => onUpdate(block.id, { alt: e.target.value })}
              placeholder="Alt text..."
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
            {/* Zoom */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Zoom: {zoom}%
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={zoom}
                onChange={(e) => onUpdate(block.id, { zoom: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            {/* Alignment */}
            <div>
              <label className="block text-sm font-medium mb-2">Alignment</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdate(block.id, { alignment: align })}
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
        )}
      </div>
    );
  }

  // Sidebar mode
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Image Settings</h3>

      {block.src ? (
        <>
          <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden mb-4">
            <Image
              src={block.src}
              alt={block.alt || 'Block image'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <input
            type="text"
            value={block.alt}
            onChange={(e) => onUpdate(block.id, { alt: e.target.value })}
            placeholder="Alt text..."
            className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 mb-3"
          />

          {/* Zoom */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">
              Zoom: {zoom}%
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={zoom}
              onChange={(e) => onUpdate(block.id, { zoom: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Alignment */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Alignment</label>
            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdate(block.id, { alignment: align })}
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

          <button
            onClick={onOpenPicker}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Change Image
          </button>
        </>
      ) : (
        <button
          onClick={onOpenPicker}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
        >
          Pick Image
        </button>
      )}
    </div>
  );
}
