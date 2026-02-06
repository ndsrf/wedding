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
 * Fetch all data required for the RSVP page
 * 
 * @param token - Magic link token
 * @param channel - Attribution channel
 * @param skipTracking - Whether to skip tracking (useful for some server-side pre-fetches if any)
 */
export const getRSVPPageData = cache(async (
  token: string,
  channel?: string | null,
  skipTracking = false
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
        include: { theme: true },
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

      let invitationTemplate: { id: string; name: string; design: unknown } | undefined;
      if (wedding.invitation_template_id) {
        try {
          const template = await prisma.invitationTemplate.findUnique({
            where: { id: wedding.invitation_template_id },
            select: { id: true, name: true, design: true },
          });
          if (template) {
            invitationTemplate = template;
          }
        } catch (err) {
          console.error('Failed to fetch invitation template:', err);
        }
      }

      const themeData = wedding.theme ? {
        id: wedding.theme.id,
        planner_id: wedding.theme.planner_id,
        name: wedding.theme.name,
        description: wedding.theme.description,
        is_default: wedding.theme.is_default,
        is_system_theme: wedding.theme.is_system_theme,
        config: wedding.theme.config as unknown as ThemeConfig,
        preview_image_url: wedding.theme.preview_image_url,
        created_at: wedding.theme.created_at,
        updated_at: wedding.theme.updated_at,
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
        ...(invitationTemplate && { invitation_template: invitationTemplate }),
      };

      setWeddingPageCache(weddingId, cachedData);
    }

    // 3. Tracking (Fire-and-forget)
    if (!skipTracking) {
      const channelEnum = channel?.toUpperCase() as Channel | null;
      void trackLinkOpened(family.id, weddingId, channelEnum || undefined);
    }

    const rsvp_cutoff_passed = new Date() > new Date(cachedData.wedding.rsvp_cutoff_date);
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
      wedding: cachedData.wedding,
      theme: cachedData.theme,
      ...(cachedData.invitation_template && { invitation_template: cachedData.invitation_template }),
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
