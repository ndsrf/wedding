/**
 * Guest RSVP API - Update Language Preference
 * PATCH /api/guest/:token/language
 *
 * Updates the family's preferred language for all communications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/auth/magic-link';
import { prisma } from '@/lib/db/prisma';
import type { UpdateLanguageRequest, UpdateLanguageResponse } from '@/types/api';
import type { Language } from '@prisma/client';

const VALID_LANGUAGES: Language[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Validate magic token
    const validation = await validateMagicLink(token);

    if (!validation.valid || !validation.family) {
      return NextResponse.json<UpdateLanguageResponse>(
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

    const { family } = validation;

    // Parse request body
    const body: UpdateLanguageRequest = await request.json();

    // Validate language
    if (!body.language || !VALID_LANGUAGES.includes(body.language)) {
      return NextResponse.json<UpdateLanguageResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid language. Must be one of: ES, EN, FR, IT, DE',
          },
        },
        { status: 400 }
      );
    }

    // Update family language preference
    await prisma.family.update({
      where: { id: family.id },
      data: {
        preferred_language: body.language,
      },
    });

    return NextResponse.json<UpdateLanguageResponse>({
      success: true,
      data: {
        preferred_language: body.language,
      },
    });
  } catch (error) {
    console.error('Update language error:', error);
    return NextResponse.json<UpdateLanguageResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating language preference',
        },
      },
      { status: 500 }
    );
  }
}
