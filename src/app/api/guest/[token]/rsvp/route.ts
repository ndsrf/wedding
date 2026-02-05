/**
 * Guest RSVP API - RSVP Submission
 * POST /api/guest/:token/rsvp
 *
 * Submits or updates RSVP for a family.
 * Validates RSVP cutoff date and updates member attending flags and dietary/accessibility info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/auth/magic-link';
import { trackRSVPSubmitted } from '@/lib/tracking/events';
import { prisma } from '@/lib/db/prisma';
import { sendConfirmation } from '@/lib/notifications/confirmation';
import type { SubmitRSVPRequest, SubmitRSVPResponse } from '@/types/api';
import type { Channel } from '@prisma/client';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const params = await context.params;
  try {
    const token = params.token;

    // Validate magic token
    const validation = await validateMagicLink(token);

    if (!validation.valid || !validation.family || !validation.wedding) {
      return NextResponse.json<SubmitRSVPResponse>(
        {
          success: false,
          error: {
            code: validation.error || 'INVALID_TOKEN',
            message: 'Invalid or expired link',
          },
        },
        { status: 404 }
      );
    }

    const { family, wedding } = validation;

    // Check if RSVP cutoff has passed
    const now = new Date();
    const cutoffDate = new Date(wedding.rsvp_cutoff_date);

    if (now > cutoffDate) {
      return NextResponse.json<SubmitRSVPResponse>(
        {
          success: false,
          error: {
            code: 'RSVP_CUTOFF_PASSED',
            message: 'The RSVP deadline has passed. Please contact the couple directly.',
          },
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body: SubmitRSVPRequest = await request.json();

    if (!body.members || !Array.isArray(body.members)) {
      return NextResponse.json<SubmitRSVPResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
          },
        },
        { status: 400 }
      );
    }

    // Update each family member
    const updatePromises = body.members.map((memberUpdate) => {
      return prisma.familyMember.update({
        where: {
          id: memberUpdate.id,
          family_id: family.id, // Ensure member belongs to this family
        },
        data: {
          attending: memberUpdate.attending,
          dietary_restrictions: memberUpdate.attending
            ? memberUpdate.dietary_restrictions || null
            : null,
          accessibility_needs: memberUpdate.attending
            ? memberUpdate.accessibility_needs || null
            : null,
        },
      });
    });

    await Promise.all(updatePromises);

    // Update family with question answers
    await prisma.family.update({
      where: { id: family.id },
      data: {
        transportation_answer: body.transportation_answer ?? null,
        extra_question_1_answer: body.extra_question_1_answer ?? null,
        extra_question_2_answer: body.extra_question_2_answer ?? null,
        extra_question_3_answer: body.extra_question_3_answer ?? null,
        extra_info_1_value: body.extra_info_1_value ?? null,
        extra_info_2_value: body.extra_info_2_value ?? null,
        extra_info_3_value: body.extra_info_3_value ?? null,
      },
    });

    // Extract channel from URL query parameter
    const channel = request.nextUrl.searchParams.get('channel')?.toUpperCase() as Channel | null;

    // Track RSVP submitted event (fire-and-forget for better performance)
    const attendingCount = body.members.filter((m) => m.attending).length;
    void trackRSVPSubmitted(
      family.id,
      wedding.id,
      channel || undefined,
      {
        total_members: body.members.length,
        attending_count: attendingCount,
      }
    );

    // Send RSVP confirmation via preferred channel
    try {
      const confirmationResult = await sendConfirmation({
        family_id: family.id,
        wedding_id: wedding.id,
      });

      if (!confirmationResult.success) {
        console.error('Failed to send RSVP confirmation:', confirmationResult.error);
        // Don't fail the RSVP submission if confirmation sending fails
      }
    } catch (error) {
      console.error('Failed to send RSVP confirmation:', error);
      // Don't fail the RSVP submission if confirmation sending fails
    }

    return NextResponse.json<SubmitRSVPResponse>({
      success: true,
      data: {
        success: true,
        confirmation_message: `Thank you for your RSVP! We have received your response for ${attendingCount} attending ${attendingCount === 1 ? 'guest' : 'guests'}.`,
      },
    });
  } catch (error) {
    console.error('RSVP submission error:', error);
    return NextResponse.json<SubmitRSVPResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while submitting your RSVP',
        },
      },
      { status: 500 }
    );
  }
}
