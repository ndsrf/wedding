'use client';

import { useTranslations } from 'next-intl';
import type { SpotifyBlock } from '@/types/invitation-template';

interface SpotifyBlockEditorProps {
  block: SpotifyBlock;
  onUpdate: (blockId: string, updates: Partial<SpotifyBlock>) => void;
}

const SIZE_OPTIONS = [
  { value: 'small', labelKey: 'spotifySizeSmall' },
  { value: 'medium', labelKey: 'spotifySizeMedium' },
  { value: 'large', labelKey: 'spotifySizeLarge' },
] as const;

/**
 * SpotifyBlockEditor – sidebar editor for the Spotify player block.
 *
 * Controls: use the wedding's own playlist vs. a pasted public playlist URL/ID,
 * autoplay, and player size.
 */
export function SpotifyBlockEditor({ block, onUpdate }: SpotifyBlockEditorProps) {
  const t = useTranslations('admin.invitationBuilder');
  const update = (updates: Partial<SpotifyBlock>) => onUpdate(block.id, updates);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
      <h3 className="text-lg font-semibold">{t('spotifyTitle')}</h3>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={block.useWeddingPlaylist}
          onChange={(e) => update({ useWeddingPlaylist: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm">{t('spotifyUseWeddingPlaylist')}</span>
      </label>

      {!block.useWeddingPlaylist && (
        <div>
          <label className="block text-sm font-medium mb-1">{t('spotifyPlaylistIdLabel')}</label>
          <input
            type="text"
            value={block.playlistId ?? ''}
            onChange={(e) => update({ playlistId: e.target.value })}
            placeholder={t('spotifyPlaylistIdPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={block.autoplay ?? false}
          onChange={(e) => update({ autoplay: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm">{t('spotifyAutoplay')}</span>
      </label>

      <div>
        <label className="block text-sm font-medium mb-1">{t('spotifySize')}</label>
        <div className="flex gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ size: opt.value })}
              className={`flex-1 py-2 rounded border text-sm font-medium transition ${
                (block.size ?? 'medium') === opt.value
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{t('spotifyHint')}</p>
    </div>
  );
}
