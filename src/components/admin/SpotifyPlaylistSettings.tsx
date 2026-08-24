'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const SpotifySuggestionsModal = dynamic(
  () => import('./SpotifySuggestionsModal').then((m) => m.SpotifySuggestionsModal),
  { ssr: false }
);

interface SpotifyPlaylistSettingsProps {
  /** true only when SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN are all set */
  spotifyConfigured: boolean;
  playlistUrl: string | null;
  /** GET endpoint for the song suggestions list (role-scoped) */
  suggestionsApiUrl: string;
  /** POST endpoint to run the Spotify playlist sync immediately (role-scoped) */
  syncTriggerUrl: string;
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

/**
 * SpotifyPlaylistSettings — "Spotify Playlist" card in the Gallery tab.
 * Read-only: the playlist is created and filled by the nightly cron job
 * (src/lib/spotify/sync.ts), not from this panel.
 */
export function SpotifyPlaylistSettings({ spotifyConfigured, playlistUrl, suggestionsApiUrl, syncTriggerUrl }: SpotifyPlaylistSettingsProps) {
  const t = useTranslations('admin.gallery');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const playlistId = playlistUrl ? extractPlaylistId(playlistUrl) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span>🎵</span> {t('spotifyPlaylistTitle')}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">{t('spotifyPlaylistDesc')}</p>
      </div>

      {!spotifyConfigured ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('spotifyNotConfigured')}
        </p>
      ) : !playlistUrl || !playlistId ? (
        <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
          {t('spotifyPlaylistPending')}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 hover:text-green-800 underline break-all"
            >
              {playlistUrl}
            </a>
          </div>
          <a
            href={`spotify:playlist:${playlistId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.719-.66 13.439 1.62.361.181.54.78.302 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.72-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.42 1.56-.301.421-1.021.599-1.559.3z"/>
            </svg>
            {t('spotifyOpenButton')}
          </a>
          <div className="rounded-lg overflow-hidden">
            <iframe
              title="Spotify playlist"
              src={`https://open.spotify.com/embed/playlist/${playlistId}`}
              width="100%"
              height="352"
              style={{ border: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setShowSuggestions(true)}
        className="text-sm font-medium text-purple-600 hover:text-purple-800"
      >
        {t('spotifySuggestionsButton')}
      </button>

      {showSuggestions && (
        <SpotifySuggestionsModal
          apiUrl={suggestionsApiUrl}
          syncTriggerUrl={syncTriggerUrl}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
