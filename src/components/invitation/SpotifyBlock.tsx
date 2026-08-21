'use client';

import { useTranslations } from 'next-intl';
import { extractSpotifyPlaylistId, buildSpotifyPlaylistEmbedUrl } from '@/lib/spotify/embed-url';

interface SpotifyBlockProps {
  useWeddingPlaylist: boolean;
  /** Public playlist URL/URI/ID, used when useWeddingPlaylist is false. */
  playlistId?: string;
  autoplay?: boolean;
  size?: 'small' | 'medium' | 'large';
  /** The wedding's own Spotify playlist id (wedding.spotify_playlist_id), used when useWeddingPlaylist is true. */
  weddingPlaylistId?: string | null;
}

/** 'small' = compact height, no cover art. 'medium'/'large' = Spotify's normal player, differing only in block width. */
const SIZE_CONFIG: Record<'small' | 'medium' | 'large', { height: number; width: string }> = {
  small: { height: 152, width: '100%' },
  medium: { height: 352, width: '50%' },
  large: { height: 352, width: '100%' },
};

/**
 * SpotifyBlock — embeds a Spotify playlist player in an invitation.
 * Shared between the editor canvas and the public invitation page.
 */
export function SpotifyBlock({ useWeddingPlaylist, playlistId, autoplay = false, size = 'medium', weddingPlaylistId }: SpotifyBlockProps) {
  const t = useTranslations('admin.invitationBuilder');

  const resolvedId = useWeddingPlaylist ? (weddingPlaylistId || null) : extractSpotifyPlaylistId(playlistId ?? '');

  if (!resolvedId) {
    return (
      <div className="w-full py-6 px-4 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        {useWeddingPlaylist ? t('spotifyPendingWeddingPlaylist') : t('spotifyMissingPlaylistId')}
      </div>
    );
  }

  const { height, width } = SIZE_CONFIG[size];

  return (
    <div style={{ width, margin: '0 auto' }}>
      <iframe
        title="Spotify playlist"
        src={buildSpotifyPlaylistEmbedUrl(resolvedId, autoplay)}
        width="100%"
        height={height}
        style={{ border: 0, borderRadius: 12 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
