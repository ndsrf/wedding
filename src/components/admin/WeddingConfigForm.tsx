/**
 * Wedding Configuration Form Component
 *
 * Wrapper component with tabbed interface for configuring wedding settings
 * Switches between Basic Settings and RSVP Settings tabs
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { BasicSettingsForm } from './BasicSettingsForm';
import { RsvpSettingsForm } from './RsvpSettingsForm';
import { GooglePhotosSettings } from './GooglePhotosSettings';
import { SpotifyPlaylistSettings } from './SpotifyPlaylistSettings';

interface WeddingConfigFormProps {
  wedding: Wedding;
  themes: Theme[];
  /** true only when SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN are all set */
  spotifyConfigured: boolean;
  /** GET endpoint for the song suggestions list (role-scoped) */
  spotifySuggestionsApiUrl: string;
  /** POST endpoint to run the Spotify playlist sync immediately (role-scoped) */
  spotifySyncTriggerUrl: string;
  /** Danger Zone tab content — owned by the caller since it manages the delete-all-guests flow */
  dangerZone: React.ReactNode;
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
  deleteCacheRsvpUrl: string;
}

type Tab = 'basic' | 'rsvp' | 'gallery' | 'danger';

export function WeddingConfigForm({ wedding, themes, spotifyConfigured, spotifySuggestionsApiUrl, spotifySyncTriggerUrl, dangerZone, onSubmit, onCancel, deleteCacheRsvpUrl }: WeddingConfigFormProps) {
  const t = useTranslations('admin.configure');
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  // Support ?tab=gallery query param (used after OAuth redirect) — the tab id
  // stays "gallery" even though its label is now "Pictures & Music", since
  // the Google Photos OAuth callback redirects back to ?tab=gallery.
  useEffect(() => {
    const tab = searchParams.get('tab') as Tab | null;
    if (tab === 'gallery' || tab === 'basic' || tab === 'rsvp' || tab === 'danger') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabClass = (tab: Tab) =>
    activeTab === tab
      ? 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600'
      : 'px-4 py-2 font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 cursor-pointer';

  const dangerTabClass =
    activeTab === 'danger'
      ? 'px-4 py-2 font-medium text-red-600 border-b-2 border-red-600'
      : 'px-4 py-2 font-medium text-red-500 border-b-2 border-transparent hover:text-red-700 cursor-pointer';

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0">
          <button onClick={() => setActiveTab('basic')} className={tabClass('basic')}>
            {t('tabs.basic')}
          </button>
          <button onClick={() => setActiveTab('rsvp')} className={tabClass('rsvp')}>
            {t('tabs.rsvp')}
          </button>
          <button onClick={() => setActiveTab('gallery')} className={tabClass('gallery')}>
            📷 {t('tabs.gallery')}
          </button>
          <button onClick={() => setActiveTab('danger')} className={dangerTabClass}>
            ⚠️ {t('dangerZone.title')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <BasicSettingsForm
          wedding={wedding}
          themes={themes}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}

      {activeTab === 'rsvp' && (
        <RsvpSettingsForm
          wedding={wedding}
          spotifyConfigured={spotifyConfigured}
          onSubmit={onSubmit}
          onCancel={onCancel}
          deleteCacheUrl={deleteCacheRsvpUrl}
        />
      )}

      {activeTab === 'gallery' && (
        <>
          <GooglePhotosSettings />
          <SpotifyPlaylistSettings
            spotifyConfigured={spotifyConfigured}
            playlistUrl={wedding.spotify_playlist_url}
            suggestionsApiUrl={spotifySuggestionsApiUrl}
            syncTriggerUrl={spotifySyncTriggerUrl}
          />
        </>
      )}

      {activeTab === 'danger' && dangerZone}
    </div>
  );
}