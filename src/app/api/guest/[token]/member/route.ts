/**
 * Guest RSVP API - Add Family Member
 * POST /api/guest/:token/member
 *
 * Adds a new family member if allow_guest_additions is enabled.
 * Flags the member with added_by_guest=true and creates tracking event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/auth/magic-link';
import { trackGuestAdded } from '@/lib/tracking/events';
import { prisma } from '@/lib/db/prisma';
import type { AddFamilyMemberRequest, AddFamilyMemberResponse } from '@/types/api';

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
      return NextResponse.json<AddFamilyMemberResponse>(
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

    // Check if guest additions are allowed
    if (!wedding.allow_guest_additions) {
      return NextResponse.json<AddFamilyMemberResponse>(
        {
          success: false,
          error: {
            code: 'GUEST_ADDITIONS_DISABLED',
            message: 'Adding guests is not allowed for this wedding',
          },
        },
        { status: 403 }
      );
    }

    // Check if RSVP cutoff has passed
    const now = new Date();
    const cutoffDate = new Date(wedding.rsvp_cutoff_date);

    if (now > cutoffDate) {
      return NextResponse.json<AddFamilyMemberResponse>(
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
    const body: AddFamilyMemberRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json<AddFamilyMemberResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and type are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate member type
    if (!['ADULT', 'CHILD', 'INFANT'].includes(body.type)) {
      return NextResponse.json<AddFamilyMemberResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid member type',
          },
        },
        { status: 400 }
      );
    }

    // Create new family member
    const newMember = await prisma.familyMember.create({
      data: {
        family_id: family.id,
        name: body.name.trim(),
        type: body.type,
        age: body.age || null,
        attending: null, // Guest needs to set this in RSVP
        added_by_guest: true, // Flag for admin review
      },
    });

    // Track guest added event
    await trackGuestAdded(family.id, wedding.id, newMember.name);

    return NextResponse.json<AddFamilyMemberResponse>({
      success: true,
      data: newMember,
    });
  } catch (error) {
    console.error('Add family member error:', error);
    return NextResponse.json<AddFamilyMemberResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while adding the family member',
        },
      },
      { status: 500 }
    );
  }
}
