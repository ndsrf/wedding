'use client';

import { useState } from 'react';
import type { IframeBlock } from '@/types/invitation-template';

interface IframeBlockEditorProps {
  block: IframeBlock;
  onUpdate: (blockId: string, updates: Partial<IframeBlock>) => void;
  canvasMode?: boolean;
}

const HEIGHT_PRESETS = ['400px', '600px', '800px', '100vh'];

function isValidHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function IframeBlockEditor({ block, onUpdate, canvasMode }: IframeBlockEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const urlValid = isValidHttpsUrl(block.url);

  const urlField = (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL (https://)</label>
        <input
          type="url"
          value={block.url}
          onChange={(e) => onUpdate(block.id, { url: e.target.value })}
          placeholder="https://your-app.lovable.app"
          className={`w-full p-2 border rounded text-sm focus:outline-none focus:border-blue-500 ${
            block.url && !urlValid ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
          spellCheck={false}
        />
        {block.url && !urlValid && (
          <p className="text-xs text-red-500 mt-1">URL must start with https://</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {HEIGHT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onUpdate(block.id, { height: preset })}
              className={`px-2 py-1 text-xs rounded border transition ${
                block.height === preset
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={block.height}
          onChange={(e) => onUpdate(block.id, { height: e.target.value })}
          placeholder="e.g. 600px, 80vh"
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`iframe-scroll-${block.id}`}
          checked={block.scrolling ?? false}
          onChange={(e) => onUpdate(block.id, { scrolling: e.target.checked })}
          className="rounded"
        />
        <label htmlFor={`iframe-scroll-${block.id}`} className="text-sm text-gray-700">
          Allow scrolling inside frame
        </label>
      </div>

      <p className="text-xs text-gray-500">
        If the page doesn&apos;t load, it may have iframe restrictions. Lovable-published apps work by default.
      </p>
    </div>
  );

  if (canvasMode) {
    return (
      <div className="p-4 space-y-3">
        {block.url && urlValid ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 truncate max-w-[70%]">{block.url}</p>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 underline shrink-0"
              >
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            {showPreview && (
              <iframe
                src={block.url}
                style={{ width: '100%', height: block.height, border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
                scrolling={block.scrolling ? 'yes' : 'no'}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            )}
            {!showPreview && (
              <div
                className="w-full rounded border border-dashed border-blue-300 bg-blue-50 flex items-center justify-center text-blue-600 text-sm"
                style={{ height: block.height }}
              >
                🔗 Lovable / iframe — {block.height}
              </div>
            )}
          </>
        ) : (
          urlField
        )}
        {block.url && <button onClick={() => setShowPreview(false)} className="hidden">{/* reset */}</button>}
        {block.url && urlValid && (
          <details className="text-xs">
            <summary className="text-blue-600 cursor-pointer">Edit settings</summary>
            <div className="mt-2">{urlField}</div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-1">Lovable / Iframe</h3>
      <p className="text-sm text-gray-500 mb-4">
        Embed an external page (e.g. your Lovable-designed invitation) as a full-width frame.
        The RSVP form will appear below it.
      </p>

      {block.url && urlValid && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Preview</label>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-blue-600 underline"
            >
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPreview && (
            <iframe
              src={block.url}
              style={{ width: '100%', height: block.height, border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
              scrolling={block.scrolling ? 'yes' : 'no'}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
        </div>
      )}

      {urlField}
    </div>
  );
}
