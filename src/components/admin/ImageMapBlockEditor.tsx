'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { ImageMapBlock, ImageMapHotspot, SupportedLanguage } from '@/types/invitation-template';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

interface AvailablePanel {
  id: string;
  title: string;
}

interface ImageMapBlockEditorProps {
  block: ImageMapBlock;
  activeLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdate: (blockId: string, updates: Partial<ImageMapBlock>) => void;
  onOpenImageModal: (blockId: string, hotspotId?: string) => void;
  availablePanels: AvailablePanel[];
}

function newHotspot(): ImageMapHotspot {
  return {
    id: crypto.randomUUID(),
    top: 40,
    left: 10,
    width: 30,
    height: 15,
    action: 'url',
  };
}

export function ImageMapBlockEditor({
  block,
  activeLanguage,
  onLanguageChange,
  onUpdate,
  onOpenImageModal,
  availablePanels,
}: ImageMapBlockEditorProps) {
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; top: number; left: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentSrc = typeof block.src === 'string'
    ? block.src
    : (block.src[activeLanguage] || block.src['EN'] || '');

  const selectedHotspot = block.hotspots.find((h) => h.id === selectedHotspotId) ?? null;

  const updateHotspot = useCallback((hotspotId: string, updates: Partial<ImageMapHotspot>) => {
    onUpdate(block.id, {
      hotspots: block.hotspots.map((h) => h.id === hotspotId ? { ...h, ...updates } : h),
    });
  }, [block, onUpdate]);

  const addHotspot = useCallback(() => {
    const h = newHotspot();
    onUpdate(block.id, { hotspots: [...block.hotspots, h] });
    setSelectedHotspotId(h.id);
  }, [block, onUpdate]);

  const deleteHotspot = useCallback((hotspotId: string) => {
    onUpdate(block.id, { hotspots: block.hotspots.filter((h) => h.id !== hotspotId) });
    if (selectedHotspotId === hotspotId) setSelectedHotspotId(null);
  }, [block, onUpdate, selectedHotspotId]);

  function handleMouseDown(e: React.MouseEvent, hotspot: ImageMapHotspot) {
    e.preventDefault();
    setSelectedHotspotId(hotspot.id);
    setIsDragging(true);
    setDragStart({ mouseX: e.clientX, mouseY: e.clientY, top: hotspot.top, left: hotspot.left });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart || !selectedHotspotId || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.mouseY) / rect.height) * 100;
    const hotspot = block.hotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;
    updateHotspot(selectedHotspotId, {
      top: Math.max(0, Math.min(100 - hotspot.height, dragStart.top + dy)),
      left: Math.max(0, Math.min(100 - hotspot.width, dragStart.left + dx)),
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
    setDragStart(null);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Image Map Settings</h3>

      {/* Language tabs (for per-language images) */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const src = typeof block.src === 'string' ? block.src : block.src[lang];
          return (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`px-3 py-1 rounded text-sm font-medium transition relative ${
                activeLanguage === lang ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {lang}
              {src && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Image source selector */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Image ({activeLanguage})</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentSrc}
            onChange={(e) => {
              const newSrc = e.target.value;
              if (typeof block.src === 'string') {
                onUpdate(block.id, { src: newSrc });
              } else {
                onUpdate(block.id, { src: { ...block.src, [activeLanguage]: newSrc } });
              }
            }}
            className="flex-1 p-2 border border-gray-300 rounded text-sm"
            placeholder="Image URL..."
          />
          <button
            onClick={() => onOpenImageModal(block.id)}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition whitespace-nowrap"
          >
            Choose Image
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use the same image for all languages, or upload a per-language image by switching tabs above.
        </p>
      </div>

      {/* Alt text */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Alt text</label>
        <input
          type="text"
          value={block.alt}
          onChange={(e) => onUpdate(block.id, { alt: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded text-sm"
          placeholder="Describe the image for screen readers"
        />
      </div>

      {/* Visual hotspot editor */}
      {currentSrc && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Hotspots ({block.hotspots.length})</label>
            <button
              onClick={addHotspot}
              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
            >
              + Add Hotspot
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">Drag hotspots to position them. Click to select and configure.</p>

          {/* Image with hotspot overlays */}
          <div
            ref={imageContainerRef}
            className="relative w-full border border-gray-200 rounded overflow-hidden select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <Image
              src={currentSrc}
              alt={block.alt || 'invitation'}
              width={0}
              height={0}
              sizes="100%"
              className="w-full h-auto block"
              style={{ width: '100%', height: 'auto' }}
              unoptimized
            />
            {block.hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className={`absolute cursor-move border-2 rounded transition-colors ${
                  selectedHotspotId === hotspot.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                }`}
                style={{
                  top: `${hotspot.top}%`,
                  left: `${hotspot.left}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, hotspot)}
              >
                <span className="absolute -top-5 left-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
                  {hotspot.action === 'open-panel'
                    ? `Panel: ${availablePanels.find(p => p.id === hotspot.panelId)?.title || hotspot.panelId || '?'}`
                    : hotspot.action === 'scroll-to-rsvp'
                    ? 'Scroll → RSVP'
                    : hotspot.action === 'switch-image'
                    ? 'Switch Image'
                    : hotspot.url || 'URL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected hotspot editor */}
      {selectedHotspot && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-800">Configure Hotspot</h4>
            <button
              onClick={() => deleteHotspot(selectedHotspot.id)}
              className="text-red-500 text-xs hover:text-red-700"
            >
              Delete
            </button>
          </div>

          {/* Action */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Action</label>
            <select
              value={selectedHotspot.action}
              onChange={(e) => updateHotspot(selectedHotspot.id, { action: e.target.value as ImageMapHotspot['action'] })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="open-panel">Open Panel</option>
              <option value="scroll-to-rsvp">Scroll to RSVP</option>
              <option value="url">Open URL</option>
              <option value="switch-image">Switch Image</option>
            </select>
          </div>

          {/* Switch Image picker */}
          {selectedHotspot.action === 'switch-image' && (
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Target Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedHotspot.targetImage ?? ''}
                  onChange={(e) => updateHotspot(selectedHotspot.id, { targetImage: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded text-xs"
                  placeholder="Image URL..."
                />
                <button
                  onClick={() => onOpenImageModal(block.id, selectedHotspot.id)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                >
                  Choose
                </button>
              </div>
            </div>
          )}

          {selectedHotspot.action === 'switch-image' && (
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Transition</label>
              <select
                value={selectedHotspot.transition ?? 'none'}
                onChange={(e) => updateHotspot(selectedHotspot.id, { transition: e.target.value as ImageMapHotspot['transition'] })}
                className="w-full p-2 border border-gray-300 rounded text-xs"
              >
                <option value="none">Direct (No effect)</option>
                <option value="fade">Fade</option>
              </select>
            </div>
          )}

          {/* Panel selector */}
          {selectedHotspot.action === 'open-panel' && (
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Panel</label>
              {availablePanels.length === 0 ? (
                <p className="text-xs text-orange-600">No panel blocks found. Add a Panel block first.</p>
              ) : (
                <select
                  value={selectedHotspot.panelId ?? ''}
                  onChange={(e) => updateHotspot(selectedHotspot.id, { panelId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">— Select panel —</option>
                  {availablePanels.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* URL */}
          {selectedHotspot.action === 'url' && (
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">URL</label>
              <input
                type="url"
                value={selectedHotspot.url ?? ''}
                onChange={(e) => updateHotspot(selectedHotspot.id, { url: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="https://..."
              />
            </div>
          )}

          {/* Position & size */}
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'left', 'width', 'height'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium mb-1 capitalize">{field} (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Math.round(selectedHotspot[field] * 10) / 10}
                  onChange={(e) => updateHotspot(selectedHotspot.id, { [field]: parseFloat(e.target.value) || 0 })}
                  className="w-full p-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hotspot list */}
      {block.hotspots.length > 0 && (
        <div className="mt-4">
          <label className="block text-xs font-medium mb-2 text-gray-600">All Hotspots</label>
          <div className="space-y-1">
            {block.hotspots.map((h, i) => (
              <button
                key={h.id}
                onClick={() => setSelectedHotspotId(h.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition ${
                  selectedHotspotId === h.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{i + 1} — {h.action === 'open-panel' ? `Panel: ${availablePanels.find(p => p.id === h.panelId)?.title || '?'}` : h.action === 'scroll-to-rsvp' ? 'Scroll to RSVP' : h.action === 'switch-image' ? 'Switch Image' : h.url || 'URL'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
