/**
 * Spotify Song Suggestions Modal
 *
 * Debug + fix-up listing behind "Abrir listado" on the Spotify Playlist
 * gallery card: what each guest/family entered, the resolved track (if
 * any), the suggestion's status, and any ai_error. Artist/track are
 * editable — "Reintentar" re-searches Spotify directly with the corrected
 * values (no AI step involved, since the admin already supplied clean
 * text) and updates the row in place. "Descartar" marks a row DISCARDED —
 * if it had already been synced to the playlist, the track is also removed
 * from Spotify. "Actualizar playlist" runs the same sync the nightly cron
 * job runs (resolve pending suggestions, sync READY ones into the playlist)
 * immediately, so changes made here don't have to wait for the next cron
 * tick.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { SongSuggestionListItem } from '@/types/api';

interface SpotifySuggestionsModalProps {
  /** GET endpoint for the list; PATCH/DELETE `${apiUrl}/${id}` act on one suggestion. */
  apiUrl: string;
  /** POST endpoint to run the Spotify playlist sync immediately. */
  syncTriggerUrl: string;
  onClose: () => void;
}

const STATUS_STYLES: Record<SongSuggestionListItem['status'], string> = {
  READY: 'bg-blue-50 text-blue-700',
  PENDING_AI: 'bg-amber-50 text-amber-700',
  SYNCED: 'bg-green-50 text-green-700',
  DISCARDED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-50 text-red-700',
};

interface RowState {
  busy: boolean;
  error: string | null;
}

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export function SpotifySuggestionsModal({ apiUrl, syncTriggerUrl, onClose }: SpotifySuggestionsModalProps) {
  const t = useTranslations('admin.gallery');
  const [suggestions, setSuggestions] = useState<SongSuggestionListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMetrics, setSyncMetrics] = useState<{ processed_ai: number; added_to_playlist: number } | null>(null);

  const loadSuggestions = async () => {
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to load suggestions');
      setSuggestions(data.data.suggestions);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load suggestions');
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [apiUrl]);

  const updateDraft = (id: string, field: 'artist_name' | 'track_title', value: string) => {
    setSuggestions((prev) => prev?.map((s) => (s.id === id ? { ...s, [field]: value } : s)) ?? prev);
  };

  const handleRetry = async (suggestion: SongSuggestionListItem) => {
    const artist_name = suggestion.artist_name?.trim() || null;
    const track_title = suggestion.track_title?.trim() || null;
    if (!artist_name && !track_title) {
      setRowState((prev) => ({ ...prev, [suggestion.id]: { busy: false, error: t('spotifySuggestionsRetryMissing') } }));
      return;
    }

    setRowState((prev) => ({ ...prev, [suggestion.id]: { busy: true, error: null } }));
    try {
      const res = await fetch(`${apiUrl}/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', artist_name, track_title }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Retry failed');
      setSuggestions((prev) => prev?.map((s) => (s.id === suggestion.id ? data.data.suggestion : s)) ?? prev);
      setRowState((prev) => ({ ...prev, [suggestion.id]: { busy: false, error: null } }));
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [suggestion.id]: { busy: false, error: err instanceof Error ? err.message : 'Retry failed' },
      }));
    }
  };

  const handleDiscard = async (id: string) => {
    setRowState((prev) => ({ ...prev, [id]: { busy: true, error: null } }));
    try {
      const res = await fetch(`${apiUrl}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Discard failed');
      setSuggestions((prev) => prev?.map((s) => (s.id === id ? data.data.suggestion : s)) ?? prev);
      setRowState((prev) => ({ ...prev, [id]: { busy: false, error: null } }));
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [id]: { busy: false, error: err instanceof Error ? err.message : 'Discard failed' },
      }));
    }
  };

  const handleAddRow = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: t('spotifySuggestionsManualPlaceholder') }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to add row');
      setSuggestions((prev) => [data.data.suggestion, ...(prev ?? [])]);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add row');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('spotifySuggestionsDeleteConfirm'))) return;
    try {
      const res = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to delete row');
      setSuggestions((prev) => prev?.filter((s) => s.id !== id) ?? prev);
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [id]: { busy: false, error: err instanceof Error ? err.message : 'Failed to delete row' },
      }));
    }
  };

  const handleUpdatePlaylist = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMetrics(null);
    try {
      const res = await fetch(syncTriggerUrl, { method: 'POST' });
      const data = await res.json() as {
        success: boolean;
        reason?: string;
        metrics?: { processed_ai: number; added_to_playlist: number };
      };
      if (!res.ok || !data.success) throw new Error(data.reason || 'Sync failed');
      setSyncStatus('done');
      setSyncMetrics(data.metrics ?? null);
      await loadSuggestions();
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-medium text-gray-900">{t('spotifySuggestionsTitle')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{t('spotifySuggestionsDesc')}</p>

          <div className="mb-3 flex flex-wrap items-center gap-4">
            <button
              onClick={handleAddRow}
              disabled={adding || suggestions === null}
              className="text-sm font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? t('spotifySuggestionsAdding') : `+ ${t('spotifySuggestionsAddRow')}`}
            </button>
            <button
              onClick={handleUpdatePlaylist}
              disabled={syncStatus === 'syncing' || suggestions === null}
              className="text-sm font-medium text-green-700 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncStatus === 'syncing' ? t('spotifySuggestionsSyncing') : `↻ ${t('spotifySuggestionsUpdatePlaylist')}`}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 -mt-2 mb-3">{addError}</p>}
          {syncStatus === 'done' && (
            <p className="text-xs text-emerald-600 -mt-2 mb-3">
              {t('spotifySuggestionsSyncDone')}
              {syncMetrics && ` ${t('spotifySuggestionsSyncDoneDetail', { added: syncMetrics.added_to_playlist, resolved: syncMetrics.processed_ai })}`}
            </p>
          )}
          {syncStatus === 'error' && (
            <p className="text-xs text-red-600 -mt-2 mb-3">
              {syncError === 'not_configured'
                ? t('spotifyNotConfigured')
                : syncError === 'sync_not_enabled'
                  ? t('spotifySuggestionsSyncNotEnabled')
                  : syncError === 'wedding_inactive'
                    ? t('spotifySuggestionsSyncInactive')
                    : t('spotifySuggestionsSyncError')}
            </p>
          )}

          {loadError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{loadError}</p>
            </div>
          ) : suggestions === null ? (
            <div className="py-8 text-center">
              <WeddingSpinner size="md" className="mx-auto" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t('spotifySuggestionsEmpty')}</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                    <th className="py-2 pr-3">{t('spotifySuggestionsColWho')}</th>
                    <th className="py-2 pr-3">{t('spotifySuggestionsColInput')}</th>
                    <th className="py-2 pr-3">{t('spotifySuggestionsColArtist')}</th>
                    <th className="py-2 pr-3">{t('spotifySuggestionsColSong')}</th>
                    <th className="py-2 pr-3">{t('spotifySuggestionsColStatus')}</th>
                    <th className="py-2 pr-3">{t('spotifySuggestionsColError')}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suggestions.map((s) => {
                    const state = rowState[s.id];
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-3 align-top text-gray-700 whitespace-nowrap">{s.who || '—'}</td>
                        <td className="py-2 pr-3 align-top text-gray-900 max-w-[16rem] break-words">{s.raw_input}</td>
                        <td className="py-2 pr-3 align-top">
                          <input
                            type="text"
                            value={s.artist_name ?? ''}
                            onChange={(e) => updateDraft(s.id, 'artist_name', e.target.value)}
                            placeholder={t('spotifySuggestionsFieldOptional')}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <input
                            type="text"
                            value={s.track_title ?? ''}
                            onChange={(e) => updateDraft(s.id, 'track_title', e.target.value)}
                            placeholder={t('spotifySuggestionsFieldOptional')}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                            {t(`spotifySuggestionsStatus.${s.status}`)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 align-top max-w-[12rem]">
                          {(state?.error || s.ai_error) && (
                            <p className="text-xs text-red-600 break-words mb-1">{state?.error || s.ai_error}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRetry(s)}
                              disabled={state?.busy}
                              className="text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {state?.busy ? t('spotifySuggestionsRetrying') : t('spotifySuggestionsRetryButton')}
                            </button>
                            {s.status !== 'DISCARDED' && (
                              <button
                                onClick={() => handleDiscard(s.id)}
                                disabled={state?.busy}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {t('spotifySuggestionsDiscardButton')}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 align-top">
                          <button
                            onClick={() => handleDelete(s.id)}
                            title={t('spotifySuggestionsDeleteButton')}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
