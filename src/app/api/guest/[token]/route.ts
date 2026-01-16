/**
 * Guest RSVP API - Main Route
 * GET /api/guest/:token
 *
 * Returns family RSVP page data including family members, wedding details, and theme.
 * Validates magic token and tracks link_opened event with channel attribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink, extractChannelFromUrl } from '@/lib/auth/magic-link';
import { trackLinkOpened } from '@/lib/tracking/events';
import type { GetGuestRSVPPageResponse, GuestRSVPPageData } from '@/types/api';
import type { Channel } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
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

    // Extract channel from URL query parameter
    const channel = request.nextUrl.searchParams.get('channel')?.toUpperCase() as Channel | null;

    // Track link opened event with channel attribution
    await trackLinkOpened(
      family.id,
      wedding.id,
      channel || undefined
    );

    // Check if RSVP cutoff has passed
    const now = new Date();
    const cutoffDate = new Date(wedding.rsvp_cutoff_date);
    const rsvp_cutoff_passed = now > cutoffDate;

    // Check if family has submitted RSVP (any member has attending status set)
    const has_submitted_rsvp = family.members.some(
      (member) => member.attending !== null
    );

    // Prepare response data
    const responseData: GuestRSVPPageData = {
      family: {
        ...family,
        members: family.members.map((member) => ({
          ...member,
          // Ensure dates are serializable
          created_at: member.created_at,
        })),
      },
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
      },
      theme: theme || {
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
        },
        preview_image_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
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
