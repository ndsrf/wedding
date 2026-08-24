import { processSpotifySync } from '@/lib/spotify/sync';
import type { CronJob } from '../types';

/**
 * Resolves PENDING_AI song suggestions and syncs READY ones into each
 * wedding's Spotify playlist. Scoped to weddings whose planner has
 * `spotify_sync_enabled` (toggle lives in /planner/alert-settings).
 * Sends no notifications — this is a silent background job.
 */
export const spotifySyncJob: CronJob = {
  name: 'spotify-sync',
  async run() {
    const result = await processSpotifySync();
    return { ...result };
  },
};
