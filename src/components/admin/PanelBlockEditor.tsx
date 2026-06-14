'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { PanelBlock, SupportedLanguage } from '@/types/invitation-template';
import { loadFont } from '@/lib/fonts';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

const FONT_FAMILIES = [
  'Cormorant Garamond, serif',
  'Crimson Text, serif',
  'EB Garamond, serif',
  'Georgia, serif',
  'Great Vibes, cursive',
  'Inter, sans-serif',
  'Libre Baskerville, serif',
  'Lora, serif',
  'Montserrat, sans-serif',
  'Playfair Display, serif',
];

interface PanelBlockEditorProps {
  block: PanelBlock;
  activeLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdate: (blockId: string, updates: Partial<PanelBlock>) => void;
  onOpenImageModal: (blockId: string) => void;
}

export function PanelBlockEditor({ block, activeLanguage, onLanguageChange, onUpdate, onOpenImageModal }: PanelBlockEditorProps) {
  useEffect(() => {
    FONT_FAMILIES.forEach(f => {
      const name = f.split(',')[0].trim();
      try {
        // @ts-expect-error - fontName is a string from our list
        loadFont(name);
      } catch { /* ignore */ }
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Panel Settings</h3>
      <p className="text-xs text-gray-500 mb-4">
        Panel blocks are hidden in the invitation. They open as a modal when a button or image-map hotspot triggers them.
      </p>

      {/* Language Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const hasTitleContent = block.title[lang]?.trim().length > 0;
          return (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`px-3 py-1 rounded text-sm font-medium transition relative ${
                activeLanguage === lang ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {lang}
              {hasTitleContent && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Title ({activeLanguage})</label>
        <input
          type="text"
          value={block.title[activeLanguage] ?? ''}
          onChange={(e) =>
            onUpdate(block.id, { title: { ...block.title, [activeLanguage]: e.target.value } })
          }
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          placeholder="Panel title..."
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Content ({activeLanguage}) — HTML allowed</label>
        <textarea
          value={block.content[activeLanguage] ?? ''}
          onChange={(e) =>
            onUpdate(block.id, { content: { ...block.content, [activeLanguage]: e.target.value } })
          }
          rows={6}
          className="w-full p-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
          placeholder="Panel content (HTML supported)..."
        />
      </div>

      {/* Border Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Border Style</label>
        <div className="flex gap-2">
          {(['frame', 'simple'] as const).map((style) => (
            <button
              key={style}
              onClick={() => onUpdate(block.id, { style: { ...block.style, borderStyle: style } })}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium border transition ${
                block.style.borderStyle === style
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {style === 'frame' ? '🖼 Ornate Frame' : '▭ Simple Border'}
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Font</label>
        <select
          value={block.style.fontFamily}
          onChange={(e) => onUpdate(block.id, { style: { ...block.style, fontFamily: e.target.value } })}
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0]}</option>
          ))}
        </select>
      </div>

      {/* Background Image */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Background Image</label>
        {block.style.backgroundImage ? (
          <div className="space-y-2">
            <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden">
              <Image
                src={block.style.backgroundImage}
                alt="Panel background"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onOpenImageModal(block.id)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                Change
              </button>
              <button
                onClick={() => onUpdate(block.id, { style: { ...block.style, backgroundImage: undefined, backgroundSize: undefined } })}
                className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Remove
              </button>
            </div>
            {/* Cover / Tile selector */}
            <div className="flex rounded overflow-hidden border border-gray-300 text-sm">
              {(['cover', 'tile'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdate(block.id, { style: { ...block.style, backgroundSize: mode } })}
                  className={`flex-1 py-1.5 capitalize transition ${
                    (block.style.backgroundSize ?? 'cover') === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'cover' ? 'Cover (expand)' : 'Tile (repeat)'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => onOpenImageModal(block.id)}
            className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-sm"
          >
            + Choose Image
          </button>
        )}
        <p className="text-xs text-gray-500 mt-1">
          When set, replaces the background color. Color is still used as fallback.
        </p>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1">Background</label>
          <input
            type="color"
            value={block.style.backgroundColor}
            onChange={(e) => onUpdate(block.id, { style: { ...block.style, backgroundColor: e.target.value } })}
            className="w-full h-9 rounded cursor-pointer border border-gray-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Text Color</label>
          <input
            type="color"
            value={block.style.textColor}
            onChange={(e) => onUpdate(block.id, { style: { ...block.style, textColor: e.target.value } })}
            className="w-full h-9 rounded cursor-pointer border border-gray-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Border Color</label>
          <input
            type="color"
            value={block.style.borderColor}
            onChange={(e) => onUpdate(block.id, { style: { ...block.style, borderColor: e.target.value } })}
            className="w-full h-9 rounded cursor-pointer border border-gray-200"
          />
        </div>
      </div>
    </div>
  );
}
