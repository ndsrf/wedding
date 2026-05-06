'use client';

import { useState } from 'react';
import type { EmbedBlock } from '@/types/invitation-template';

interface EmbedBlockEditorProps {
  block: EmbedBlock;
  onUpdate: (blockId: string, updates: Partial<EmbedBlock>) => void;
  canvasMode?: boolean;
}

export function EmbedBlockEditor({ block, onUpdate, canvasMode }: EmbedBlockEditorProps) {
  const [showRaw, setShowRaw] = useState(false);

  const preview = (
    <div
      className="w-full overflow-hidden rounded border border-gray-200 bg-white"
      style={block.height ? { minHeight: block.height } : undefined}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );

  const htmlEditor = (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">HTML / SVG</label>
      <textarea
        value={block.html}
        onChange={(e) => onUpdate(block.id, { html: e.target.value })}
        rows={8}
        placeholder="Paste HTML, SVG, or CSS from Claude Design here..."
        className="w-full p-2 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500 resize-y"
        spellCheck={false}
      />
      <label className="block text-sm font-medium text-gray-700 mt-2">Reserved height (optional)</label>
      <input
        type="text"
        value={block.height ?? ''}
        onChange={(e) => onUpdate(block.id, { height: e.target.value || undefined })}
        placeholder="e.g. 80px, 6rem"
        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );

  if (canvasMode) {
    return (
      <div className="p-4 space-y-3">
        {block.html ? (
          <>
            {preview}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-blue-600 underline"
            >
              {showRaw ? 'Hide HTML' : 'Edit HTML'}
            </button>
            {showRaw && htmlEditor}
          </>
        ) : (
          htmlEditor
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-1">Embed HTML</h3>
      <p className="text-sm text-gray-500 mb-4">
        Paste HTML, SVG, or CSS from Claude Design — ornaments, borders, decorative elements.
      </p>
      {block.html && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preview</label>
          {preview}
        </div>
      )}
      {htmlEditor}
    </div>
  );
}
