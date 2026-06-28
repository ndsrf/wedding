/**
 * RSVP Page Cache
 *
 * In-memory cache for the per-wedding slice of the guest RSVP API response.
 * Keyed by wedding_id.  Invalidated explicitly when an admin mutates the
 * invitation template or wedding settings; a configurable TTL
 * (RSVP_CACHE_TTL_HOURS, default 1) acts as a safety net.
 *
 * What is cached:  wedding config fields, theme, invitation_template
 * What is NOT cached: family/member data, has_submitted_rsvp, trackLinkOpened
 */

import type { Language, PaymentMode } from '@prisma/client';
import type { ThemeConfig } from '@/types/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedInvitationTemplate {
  id: string;
  name: string;
  design: unknown;
  pre_rendered_html?: Record<string, string>;
}

export interface CachedWeddingPageData {
  wedding: {
    id: string;
    couple_names: string;
    wedding_date: string;
    wedding_time: string;
    location: string | null;
    rsvp_cutoff_date: string;
    dress_code: string | null;
    additional_info: string | null;
    allow_guest_additions: boolean;
    default_language: Language;
    payment_tracking_mode: PaymentMode;
    gift_iban: string | null;
    show_iban_on_rsvp: boolean;
    show_nupcibot_whatsapp_link: boolean;
    show_nupci_banner: boolean;
    transportation_question_enabled: boolean;
    transportation_question_text: Record<string, string> | null;
    dietary_restrictions_enabled: boolean;
    accessibility_needs_enabled: boolean;
    extra_question_1_enabled: boolean;
    extra_question_1_text: Record<string, string> | null;
    extra_question_2_enabled: boolean;
    extra_question_2_text: Record<string, string> | null;
    extra_question_3_enabled: boolean;
    extra_question_3_text: Record<string, string> | null;
    extra_info_1_enabled: boolean;
    extra_info_1_label: Record<string, string> | null;
    extra_info_2_enabled: boolean;
    extra_info_2_label: Record<string, string> | null;
    extra_info_3_enabled: boolean;
    extra_info_3_label: Record<string, string> | null;
    // Per-family dropdown
    family_dropdown_question_1_enabled: boolean;
    family_dropdown_question_1_label: Record<string, string> | null;
    family_dropdown_question_1_options: Record<string, string[]> | null;
    // Per-guest yes/no questions
    guest_yn_question_1_enabled: boolean;
    guest_yn_question_1_text: Record<string, string> | null;
    guest_yn_question_2_enabled: boolean;
    guest_yn_question_2_text: Record<string, string> | null;
    guest_yn_question_3_enabled: boolean;
    guest_yn_question_3_text: Record<string, string> | null;
    // Per-guest dropdown questions
    guest_dropdown_question_1_enabled: boolean;
    guest_dropdown_question_1_label: Record<string, string> | null;
    guest_dropdown_question_1_options: Record<string, string[]> | null;
    guest_dropdown_question_2_enabled: boolean;
    guest_dropdown_question_2_label: Record<string, string> | null;
    guest_dropdown_question_2_options: Record<string, string[]> | null;
    guest_dropdown_question_3_enabled: boolean;
    guest_dropdown_question_3_label: Record<string, string> | null;
    guest_dropdown_question_3_options: Record<string, string[]> | null;
    // Per-guest text input questions
    guest_text_question_1_enabled: boolean;
    guest_text_question_1_label: Record<string, string> | null;
    guest_text_question_2_enabled: boolean;
    guest_text_question_2_label: Record<string, string> | null;
    guest_text_question_3_enabled: boolean;
    guest_text_question_3_label: Record<string, string> | null;
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

import { getCached, setCached, invalidateCache, invalidateCachePattern, getClient } from './redis';

/**
 * Safety-net TTL driven by RSVP_CACHE_TTL_HOURS env var (default 1 h).
 * Parsed once at module load; changing the env var requires a restart.
 */
const CACHE_TTL_MS = (Number(process.env.RSVP_CACHE_TTL_HOURS) || 1) * 3_600_000;
const CACHE_TTL_SECONDS = (Number(process.env.RSVP_CACHE_TTL_HOURS) || 1) * 3600;

const localCache = new Map<string, CacheEntry>();

/**
 * Return cached per-wedding data for the given wedding, or null if missing / expired.
 */
export async function getWeddingPageCache(weddingId: string): Promise<CachedWeddingPageData | null> {
  if (getClient()) {
    try {
      const data = await getCached<CachedWeddingPageData>(`wedding:rsvp:page:${weddingId}`);
      if (data) return data;
    } catch (err) {
      console.warn('[RSVP Cache] Failed to get from Redis:', err);
    }
  }

  const entry = localCache.get(weddingId);
  if (!entry) return null;

  if (Date.now() - entry.cached_at.getTime() > CACHE_TTL_MS) {
    localCache.delete(weddingId);
    return null;
  }

  return entry.data;
}

/**
 * Store per-wedding data in the cache.
 */
export async function setWeddingPageCache(weddingId: string, data: CachedWeddingPageData): Promise<void> {
  if (getClient()) {
    try {
      await setCached(`wedding:rsvp:page:${weddingId}`, data, CACHE_TTL_SECONDS);
      return;
    } catch (err) {
      console.warn('[RSVP Cache] Failed to set to Redis:', err);
    }
  }

  localCache.set(weddingId, { data, cached_at: new Date() });
}

/**
 * Remove the cached entry for a wedding.  Call this whenever an admin
 * creates, updates, or deletes an invitation template, or updates wedding
 * settings (theme, active template, config fields, etc.).
 */
export async function invalidateWeddingPageCache(weddingId: string): Promise<void> {
  if (getClient()) {
    try {
      await invalidateCache(`wedding:rsvp:page:${weddingId}`);
    } catch (err) {
      console.warn('[RSVP Cache] Failed to invalidate in Redis:', err);
    }
  }

  localCache.delete(weddingId);
}

/**
 * Flush every RSVP page cache entry — both Redis and local.
 * Call on startup after schema-changing deploys so stale cached shapes
 * (missing new fields) are never served.
 */
export async function flushAllWeddingPageCaches(): Promise<void> {
  if (getClient()) {
    try {
      await invalidateCachePattern('wedding:rsvp:page:*');
    } catch (err) {
      console.warn('[RSVP Cache] Failed to flush all entries in Redis:', err);
    }
  }

  localCache.clear();
  console.log('[RSVP Cache] ✓ All wedding page cache entries flushed');
}
