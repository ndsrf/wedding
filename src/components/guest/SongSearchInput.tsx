/**
 * Song Search Input
 *
 * Free-text input with a debounced Spotify search dropdown, used for the
 * RSVP "song suggestion" questions (family-level and per-guest). Guests can
 * either pick a track from the dropdown (stored with full Spotify metadata,
 * status READY) or submit free text without selecting anything (stored as
 * raw_input only, status PENDING_AI — resolved later by the nightly job).
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SongSuggestionInput } from '@/types/api';

interface SpotifyTrackResult {
  id: string;
  uri: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
}

export interface SongSearchStyle {
  textColor?: string;
  fontFamily?: string;
  backgroundColor?: string;
  borderColor: string;
}

interface SongSearchInputProps {
  value: SongSuggestionInput | null;
  onChange: (value: SongSuggestionInput | null) => void;
  market: string;
  placeholder?: string;
  style: SongSearchStyle;
}

export function SongSearchInput({ value, onChange, market, placeholder, style }: SongSearchInputProps) {
  const t = useTranslations('guest.rsvp');
  const [query, setQuery] = useState(value?.raw_input ?? '');
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Once results were shown and the guest keeps typing instead of picking
  // one, assume they're writing their own answer (e.g. "lo que quieran los
  // novios") and stop reopening the dropdown for the rest of it — avoids
  // interrupting free-text answers with irrelevant search results.
  const suppressedRef = useRef(false);

  const isTrackSelected = !!value?.spotify_uri;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleQueryChange(text: string) {
    const dropdownWasOpen = showResults;
    setQuery(text);
    onChange(text.trim() ? { raw_input: text } : null);
    setShowResults(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      suppressedRef.current = false;
      setResults([]);
      return;
    }

    if (dropdownWasOpen) suppressedRef.current = true;

    if (suppressedRef.current || text.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(text.trim())}&market=${encodeURIComponent(market)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          if (!suppressedRef.current) setShowResults(true);
        }
      } catch {
        // Search is a convenience — guests can still submit free text.
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && showResults) {
      setShowResults(false);
      suppressedRef.current = true;
    }
  }

  function handleSelect(track: SpotifyTrackResult) {
    const display = `${track.title} — ${track.artist}`;
    setQuery(display);
    setResults([]);
    setShowResults(false);
    onChange({
      raw_input: display,
      spotify_track_id: track.id,
      spotify_uri: track.uri,
      track_title: track.title,
      artist_name: track.artist,
      album_art_url: track.albumArtUrl ?? undefined,
    });
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    suppressedRef.current = false;
    onChange(null);
  }

  const inputStyle: React.CSSProperties = {
    borderColor: style.borderColor,
    color: style.textColor,
    fontFamily: style.fontFamily,
    backgroundColor: style.backgroundColor ?? 'transparent',
  };

  return (
    <div className="relative" ref={containerRef}>
      {isTrackSelected && value ? (
        <div className="flex items-center gap-3 px-3 py-2 border-2 rounded-lg" style={inputStyle}>
          {value.album_art_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.album_art_url} alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: style.textColor }}>{value.track_title}</p>
            <p className="text-xs truncate" style={{ color: style.textColor, opacity: 0.7 }}>{value.artist_name}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm px-2 flex-shrink-0"
            style={{ color: style.textColor }}
            aria-label={t('songClear')}
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => !suppressedRef.current && results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-none"
          style={inputStyle}
          autoComplete="off"
        />
      )}

      {showResults && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => handleSelect(track)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
              >
                {track.albumArtUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.albumArtUrl} alt="" className="w-8 h-8 rounded flex-shrink-0 object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{track.title}</p>
                  <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <p className="text-xs mt-1" style={{ color: style.textColor, opacity: 0.6 }}>{t('songSearching')}</p>
      )}
      {!isTrackSelected && query.trim().length > 0 && !loading && (
        <p className="text-xs mt-1" style={{ color: style.textColor, opacity: 0.6 }}>{t('songFreeTextHint')}</p>
      )}
    </div>
  );
}
