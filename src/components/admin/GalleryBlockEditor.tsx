'use client';

import { useTranslations } from 'next-intl';
import type { GalleryBlock } from '@/types/invitation-template';

interface GalleryBlockEditorProps {
  block: GalleryBlock;
  onUpdate: (blockId: string, updates: Partial<GalleryBlock>) => void;
}

/**
 * GalleryBlockEditor – sidebar editor for the gallery carousel block.
 *
 * Controls: columns (1/2/3), captions visibility, upload button,
 * auto-play speed, and corner radius.
 */
export function GalleryBlockEditor({ block, onUpdate }: GalleryBlockEditorProps) {
  const t = useTranslations('admin.invitationBuilder');
  const update = (updates: Partial<GalleryBlock>) => onUpdate(block.id, updates);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
      <h3 className="text-lg font-semibold">{t('galleryTitle')}</h3>

      {/* Columns */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('galleryColumns')}
        </label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => update({ columns: n })}
              className={`flex-1 py-2 rounded border text-sm font-medium transition ${
                (block.columns ?? 1) === n
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-play */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('galleryAutoPlay')}
        </label>
        <select
          value={block.autoPlayMs ?? 4000}
          onChange={(e) => update({ autoPlayMs: parseInt(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={0}>{t('galleryNoAutoPlay')}</option>
          <option value={3000}>{t('gallery3s')}</option>
          <option value={4000}>{t('gallery4s')}</option>
          <option value={6000}>{t('gallery6s')}</option>
          <option value={10000}>{t('gallery10s')}</option>
        </select>
      </div>

      {/* Show captions */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => update({ showCaptions: !(block.showCaptions ?? false) })}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            block.showCaptions ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              block.showCaptions ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
        <span className="text-sm">{t('galleryShowCaptions')}</span>
      </label>

      {/* Show upload button */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => update({ showUploadButton: !(block.showUploadButton ?? true) })}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            (block.showUploadButton ?? true) ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              (block.showUploadButton ?? true) ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
        <span className="text-sm">{t('galleryUploadButton')}</span>
      </label>

      {/* Border radius */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('galleryCornerRadius')}
        </label>
        <select
          value={block.style?.borderRadius ?? '0.75rem'}
          onChange={(e) =>
            update({ style: { ...(block.style ?? {}), borderRadius: e.target.value } })
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="0">{t('galleryNoRounding')}</option>
          <option value="0.375rem">{t('gallerySmall')}</option>
          <option value="0.75rem">{t('galleryMedium')}</option>
          <option value="1.25rem">{t('galleryLarge')}</option>
          <option value="9999px">{t('galleryCircular')}</option>
        </select>
      </div>

      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        {t('galleryHint')}{' '}
        <strong>{t('galleryHintPath')}</strong>.
      </p>
    </div>
  );
}
