/**
 * Guest RSVP API - Main Route
 * GET /api/guest/:token
 *
 * Returns family RSVP page data including family members, wedding details, and theme.
 * Validates magic token and tracks link_opened event with channel attribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/auth/magic-link';
import { trackLinkOpened } from '@/lib/tracking/events';
import { prisma } from '@/lib/db/prisma';
import { getWeddingPageCache, setWeddingPageCache } from '@/lib/cache/rsvp-page';
import type { GetGuestRSVPPageResponse, GuestRSVPPageData } from '@/types/api';
import type { Channel } from '@prisma/client';
import type { ThemeConfig } from '@/types/theme';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const params = await context.params;
  try {
    const token = params.token;

    // Validate magic token
    const validation = await validateMagicLink(token);

    if (!validation.valid || !validation.family || !validation.wedding) {
      return NextResponse.json<GetGuestRSVPPageResponse>(
        {
          success: false,
          error: {
            code: validation.error || 'INVALID_TOKEN',
            message: getErrorMessage(validation.error || 'INVALID_TOKEN'),
          },
        },
        { status: validation.error === 'TOKEN_EXPIRED' ? 410 : 404 }
      );
    }

    const { family, wedding, theme } = validation;

    // ── per-wedding cache ─────────────────────────────────────────────────
    // Wedding config, theme, and invitation template are identical for every
    // guest of the same wedding.  Cache them and skip the template DB query
    // on subsequent requests until an admin mutates them.
    let cachedData = getWeddingPageCache(wedding.id);

    if (!cachedData) {
      // Cache miss – fetch invitation template and assemble the per-wedding slice
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

      const themeData = theme ? {
        id: theme.id,
        planner_id: theme.planner_id,
        name: theme.name,
        description: theme.description,
        is_default: theme.is_default,
        is_system_theme: theme.is_system_theme,
        config: theme.config as unknown as ThemeConfig,
        preview_image_url: theme.preview_image_url,
        created_at: theme.created_at,
        updated_at: theme.updated_at,
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

      setWeddingPageCache(wedding.id, cachedData);
    }

    // ── always-fresh: tracking + per-family fields ────────────────────────
    const channel = request.nextUrl.searchParams.get('channel')?.toUpperCase() as Channel | null;

    await trackLinkOpened(
      family.id,
      wedding.id,
      channel || undefined
    );

    const rsvp_cutoff_passed = new Date() > new Date(cachedData.wedding.rsvp_cutoff_date);
    const has_submitted_rsvp = family.members.some(
      (member) => member.attending !== null
    );

    // ── assemble final response ───────────────────────────────────────────
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

    return NextResponse.json<GetGuestRSVPPageResponse>({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Guest RSVP page error:', error);
    return NextResponse.json<GetGuestRSVPPageResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while loading the RSVP page',
        },
      },
      { status: 500 }
    );
  }
}

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
