'use client';

import type { SpacerBlock } from '@/types/invitation-template';

interface SpacerBlockEditorProps {
  block: SpacerBlock;
  onUpdate: (blockId: string, updates: Partial<SpacerBlock>) => void;
  canvasMode?: boolean;
}

const PRESET_HEIGHTS = ['0.5rem', '1rem', '2rem', '3rem', '4rem', '6rem', '8rem'];

export function SpacerBlockEditor({ block, onUpdate, canvasMode }: SpacerBlockEditorProps) {
  const currentPx = parseFloat(block.height) * (block.height.endsWith('rem') ? 16 : 1);

  if (canvasMode) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded" style={{ height: block.height, minHeight: '1rem' }}>
          <span className="text-xs text-gray-400">{block.height}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESET_HEIGHTS.map((h) => (
            <button
              key={h}
              onClick={() => onUpdate(block.id, { height: h })}
              className={`px-2 py-1 text-xs rounded transition ${block.height === h ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {h}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={block.height}
          onChange={(e) => onUpdate(block.id, { height: e.target.value })}
          placeholder="e.g. 2rem, 40px"
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Spacer</h3>
      <label className="block text-sm font-medium mb-2">Height: {block.height} ({Math.round(currentPx)}px)</label>
      <input
        type="range"
        min="8"
        max="128"
        step="4"
        value={Math.min(Math.round(currentPx), 128)}
        onChange={(e) => onUpdate(block.id, { height: `${e.target.value}px` })}
        className="w-full mb-3"
      />
      <div className="flex gap-2 flex-wrap mb-3">
        {PRESET_HEIGHTS.map((h) => (
          <button
            key={h}
            onClick={() => onUpdate(block.id, { height: h })}
            className={`px-3 py-1 text-sm rounded transition ${block.height === h ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {h}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={block.height}
        onChange={(e) => onUpdate(block.id, { height: e.target.value })}
        placeholder="e.g. 2rem, 40px"
        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
