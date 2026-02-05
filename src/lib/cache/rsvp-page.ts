/**
 * RSVP Page Cache
 *
 * In-memory cache for the per-wedding slice of the guest RSVP API response.
 * Keyed by wedding_id.  Invalidated explicitly when an admin mutates the
 * invitation template or wedding settings; a configurable TTL
 * (RSVP_CACHE_TTL_MINUTES, default 60) acts as a safety net.
 *
 * What is cached:  wedding config fields, theme, invitation_template
 * What is NOT cached: family/member data, has_submitted_rsvp, trackLinkOpened
 */

import type { ThemeConfig } from '@/types/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedInvitationTemplate {
  id: string;
  name: string;
  design: unknown;
}

export interface CachedWeddingPageData {
  wedding: {
    id: string;
    couple_names: string;
    wedding_date: string;
    wedding_time: string;
    location: string;
    rsvp_cutoff_date: string;
    dress_code: string | null;
    additional_info: string | null;
    allow_guest_additions: boolean;
    default_language: string;
    payment_tracking_mode: string;
    gift_iban: string | null;
    transportation_question_enabled: boolean;
    transportation_question_text: string | null;
    dietary_restrictions_enabled: boolean;
    extra_question_1_enabled: boolean;
    extra_question_1_text: string | null;
    extra_question_2_enabled: boolean;
    extra_question_2_text: string | null;
    extra_question_3_enabled: boolean;
    extra_question_3_text: string | null;
    extra_info_1_enabled: boolean;
    extra_info_1_label: string | null;
    extra_info_2_enabled: boolean;
    extra_info_2_label: string | null;
    extra_info_3_enabled: boolean;
    extra_info_3_label: string | null;
  };
  theme: {
    id: string;
    planner_id: string | null;
    name: string;
    description: string;
    is_default: boolean;
    is_system_theme: boolean;
    config: ThemeConfig;
    preview_image_url: string | null;
    created_at: Date;
    updated_at: Date;
  };
  invitation_template?: CachedInvitationTemplate;
}

interface CacheEntry {
  data: CachedWeddingPageData;
  cached_at: Date;
}

// ============================================================================
// CACHE
// ============================================================================

/**
 * Safety-net TTL driven by RSVP_CACHE_TTL_MINUTES env var (default 60).
 * Parsed once at module load; changing the env var requires a restart.
 */
const CACHE_TTL_MS = (Number(process.env.RSVP_CACHE_TTL_MINUTES) || 60) * 60_000;

const cache = new Map<string, CacheEntry>();

/**
 * Return cached per-wedding data for the given wedding, or null if missing / expired.
 */
export function getWeddingPageCache(weddingId: string): CachedWeddingPageData | null {
  const entry = cache.get(weddingId);
  if (!entry) return null;

  if (Date.now() - entry.cached_at.getTime() > CACHE_TTL_MS) {
    cache.delete(weddingId);
    return null;
  }

  return entry.data;
}

/**
 * Store per-wedding data in the cache.
 */
export function setWeddingPageCache(weddingId: string, data: CachedWeddingPageData): void {
  cache.set(weddingId, { data, cached_at: new Date() });
}

/**
 * Remove the cached entry for a wedding.  Call this whenever an admin
 * creates, updates, or deletes an invitation template, or updates wedding
 * settings (theme, active template, config fields, etc.).
 */
export function invalidateWeddingPageCache(weddingId: string): void {
  cache.delete(weddingId);
}
