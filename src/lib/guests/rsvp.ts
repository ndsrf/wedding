/**
 * RSVP Page Data Fetching Utility
 *
 * Shared logic for fetching all data needed for the guest RSVP page.
 * Used by both the API route and the Server Component.
 */

import { prisma } from '@/lib/db/prisma';
import { cache } from 'react';
import { validateMagicLinkLite } from '@/lib/auth/magic-link';
import { trackLinkOpened } from '@/lib/tracking/events';
import { getWeddingPageCache, setWeddingPageCache } from '@/lib/cache/rsvp-page';
import type { GuestRSVPPageData } from '@/types/api';
import type { Channel } from '@prisma/client';
import type { ThemeConfig } from '@/types/theme';

export interface RSVPPageDataResult {
  success: boolean;
  data?: GuestRSVPPageData;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Check if a User-Agent string appears to be a bot/crawler/prefetch
 * WhatsApp and other platforms prefetch links to generate previews
 */
function isBotOrPrefetch(userAgent?: string | null): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  // WhatsApp link preview bots
  if (ua.includes('whatsapp')) return true;

  // Common crawlers and bots
  const botPatterns = [
    'bot', 'crawler', 'spider', 'preview', 'fetcher',
    'linkedinbot', 'facebookexternalhit', 'twitterbot',
    'slackbot', 'telegrambot', 'discordbot'
  ];

  return botPatterns.some(pattern => ua.includes(pattern));
}

/**
 * Fetch all data required for the RSVP page
 *
 * @param token - Magic link token
 * @param channel - Attribution channel
 * @param skipTracking - Whether to skip tracking (useful for some server-side pre-fetches if any)
 * @param userAgent - User-Agent header to detect bots/prefetch (optional)
 */
export const getRSVPPageData = cache(async (
  token: string,
  channel?: string | null,
  skipTracking = false,
  userAgent?: string | null
): Promise<RSVPPageDataResult> => {
  try {
    // 1. Validate magic token (lightweight)
    const validation = await validateMagicLinkLite(token);

    if (!validation.valid || !validation.family || !validation.weddingId) {
      return {
        success: false,
        error: {
          code: validation.error || 'INVALID_TOKEN',
          message: getErrorMessage(validation.error || 'INVALID_TOKEN'),
        },
      };
    }

    const { family, weddingId } = validation;

    // 2. Per-wedding cache
    let cachedData = getWeddingPageCache(weddingId);

    if (!cachedData) {
      // Cache miss – fetch the full wedding row (with theme) and the active
      // invitation template, assemble, and populate the cache.
      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        include: { theme: true, wedding_day_theme: true },
      });

      if (!wedding) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while loading the RSVP page',
          },
        };
      }

      let invitationTemplate: { id: string; name: string; design: unknown; pre_rendered_html: unknown } | undefined;
      if (wedding.invitation_template_id) {
        try {
          const template = await prisma.invitationTemplate.findUnique({
            where: { id: wedding.invitation_template_id },
            select: { id: true, name: true, design: true, pre_rendered_html: true },
          });
          if (template) {
            invitationTemplate = template;
          }
        } catch (err) {
          console.error('Failed to fetch invitation template:', err);
        }
      }

      // Use wedding_day_theme if today is the wedding day and a day-of theme is set
      const today = new Date();
      const weddingDate = new Date(wedding.wedding_date);
      const isWeddingDay =
        today.getFullYear() === weddingDate.getFullYear() &&
        today.getMonth() === weddingDate.getMonth() &&
        today.getDate() === weddingDate.getDate();
      const activeTheme = isWeddingDay && wedding.wedding_day_theme
        ? wedding.wedding_day_theme
        : wedding.theme;

      const themeData = activeTheme ? {
        id: activeTheme.id,
        planner_id: activeTheme.planner_id,
        name: activeTheme.name,
        description: activeTheme.description,
        is_default: activeTheme.is_default,
        is_system_theme: activeTheme.is_system_theme,
        config: activeTheme.config as unknown as ThemeConfig,
        preview_image_url: activeTheme.preview_image_url,
        created_at: activeTheme.created_at,
        updated_at: activeTheme.updated_at,
      } : {
        id: 'default',
        planner_id: null,
        name: 'Default Theme',
        description: 'Default system theme',
        is_default: true,
        is_system_theme: true,
        config: {
          colors: {
            primary: '#4F46E5',
            secondary: '#EC4899',
            accent: '#F59E0B',
            background: '#FFFFFF',
            text: '#1F2937',
          },
          fonts: {
            heading: 'Georgia, serif',
            body: 'system-ui, sans-serif',
          },
          styles: {
            buttonRadius: '0.5rem',
            cardShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            spacing: '1rem',
          },
        } as ThemeConfig,
        preview_image_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      cachedData = {
        wedding: {
          id: wedding.id,
          couple_names: wedding.couple_names,
          wedding_date: wedding.wedding_date.toISOString(),
          wedding_time: wedding.wedding_time,
          location: wedding.location,
          rsvp_cutoff_date: wedding.rsvp_cutoff_date.toISOString(),
          dress_code: wedding.dress_code,
          additional_info: wedding.additional_info,
          allow_guest_additions: wedding.allow_guest_additions,
          default_language: wedding.default_language,
          payment_tracking_mode: wedding.payment_tracking_mode,
          gift_iban: wedding.gift_iban,
          transportation_question_enabled: wedding.transportation_question_enabled,
          transportation_question_text: wedding.transportation_question_text,
          dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
          extra_question_1_enabled: wedding.extra_question_1_enabled,
          extra_question_1_text: wedding.extra_question_1_text,
          extra_question_2_enabled: wedding.extra_question_2_enabled,
          extra_question_2_text: wedding.extra_question_2_text,
          extra_question_3_enabled: wedding.extra_question_3_enabled,
          extra_question_3_text: wedding.extra_question_3_text,
          extra_info_1_enabled: wedding.extra_info_1_enabled,
          extra_info_1_label: wedding.extra_info_1_label,
          extra_info_2_enabled: wedding.extra_info_2_enabled,
          extra_info_2_label: wedding.extra_info_2_label,
          extra_info_3_enabled: wedding.extra_info_3_enabled,
          extra_info_3_label: wedding.extra_info_3_label,
        },
        theme: themeData,
        ...(invitationTemplate && { 
          invitation_template: {
            id: invitationTemplate.id,
            name: invitationTemplate.name,
            design: invitationTemplate.design,
            pre_rendered_html: invitationTemplate.pre_rendered_html as Record<string, string>,
          } 
        }),
      };

      setWeddingPageCache(weddingId, cachedData);
    }

    // 3. Tracking (Fire-and-forget)
    // Skip tracking if explicitly disabled or if request is from a bot/prefetch
    const isBot = isBotOrPrefetch(userAgent);
    if (!skipTracking && !isBot) {
      const channelEnum = channel?.toUpperCase() as Channel | null;
      void trackLinkOpened(family.id, weddingId, channelEnum || undefined);
    } else if (isBot) {
      console.log('[RSVP] Skipping LINK_OPENED tracking for bot/prefetch request:', {
        userAgent: userAgent?.substring(0, 100),
        familyId: family.id,
      });
    }

    // cachedData is guaranteed to be set at this point (freshly built or from cache)
    const resolvedCache = cachedData!;

    const rsvp_cutoff_passed = new Date() > new Date(resolvedCache.wedding.rsvp_cutoff_date);
    const has_submitted_rsvp = family.members.some(
      (member) => member.attending !== null
    );

    // 4. Assemble final response
    const responseData: GuestRSVPPageData = {
      family: {
        ...family,
        members: family.members.map((member) => ({
          ...member,
          created_at: member.created_at,
        })),
      },
      wedding: resolvedCache.wedding,
      theme: resolvedCache.theme,
      ...(resolvedCache.invitation_template && { invitation_template: resolvedCache.invitation_template }),
      rsvp_cutoff_passed,
      has_submitted_rsvp,
    };

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    console.error('getRSVPPageData error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while loading the RSVP page',
      },
    };
  }
});

/**
 * Get user-friendly error message for error codes
 */
function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    INVALID_TOKEN_FORMAT: 'Invalid link format. Please check your link and try again.',
    TOKEN_NOT_FOUND: 'This link is not valid. Please contact the couple for a new link.',
    TOKEN_EXPIRED: 'This link has expired. The wedding date has passed.',
    VALIDATION_ERROR: 'Unable to validate your link. Please try again later.',
    INVALID_TOKEN: 'Invalid link. Please check your link and try again.',
  };

  return messages[errorCode] || 'An error occurred. Please try again.';
}
