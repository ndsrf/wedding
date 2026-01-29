/**
 * Wedding Admin - Validate Reminders API Route
 *
 * POST /api/admin/reminders/validate - Validate families have required contact information
 *
 * Features:
 * - Pre-send validation before attempting to send reminders
 * - Checks contact info based on selected channel (PREFERRED mode uses each family's preference)
 * - Returns list of valid and invalid families with details
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import type { Channel } from '@prisma/client';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for validate reminders request
const validateRemindersSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'PREFERRED']),
  family_ids: z.array(z.string()).optional(),
});

export interface ValidateRemindersResult {
  valid_families: Array<{
    id: string;
    name: string;
    channel: Channel;
  }>;
  invalid_families: Array<{
    id: string;
    name: string;
    missing_info: 'email' | 'phone' | 'whatsapp_number';
    expected_channel: Channel;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

/**
 * POST /api/admin/reminders/validate
 * Validate families have required contact information for selected channel
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { channel, family_ids } = validateRemindersSchema.parse(body);

    // Get all families to validate
    const families = await prisma.family.findMany({
      where: {
        wedding_id: user.wedding_id,
        ...(family_ids && family_ids.length > 0 ? { id: { in: family_ids } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        channel_preference: true,
        members: {
          select: {
            attending: true,
          },
        },
      },
    });

    const validFamilies: ValidateRemindersResult['valid_families'] = [];
    const invalidFamilies: ValidateRemindersResult['invalid_families'] = [];

    // Validate each family
    console.log('[VALIDATE] Processing', families.length, 'families');
    for (const family of families) {
      console.log('[VALIDATE] Family:', { id: family.id, name: family.name, email: !!family.email, phone: !!family.phone, whatsapp: !!family.whatsapp_number, channel_preference: family.channel_preference });

      // Determine the channel to use for this family
      let targetChannel: Channel;
      if (channel === 'PREFERRED') {
        targetChannel = (family.channel_preference || 'EMAIL') as Channel;
      } else {
        targetChannel = channel as Channel;
      }

      // Check if family has required contact info for the target channel
      let isValid = false;
      let missingInfo: 'email' | 'phone' | 'whatsapp_number' | null = null;

      if (targetChannel === 'EMAIL') {
        isValid = !!family.email;
        if (!isValid) missingInfo = 'email';
      } else if (targetChannel === 'SMS') {
        isValid = !!family.phone;
        if (!isValid) missingInfo = 'phone';
      } else if (targetChannel === 'WHATSAPP') {
        isValid = !!family.whatsapp_number;
        if (!isValid) missingInfo = 'whatsapp_number';
      }

      console.log('[VALIDATE] Result:', { id: family.id, name: family.name, targetChannel, isValid, missingInfo });

      if (isValid) {
        validFamilies.push({
          id: family.id,
          name: family.name,
          channel: targetChannel,
        });
      } else if (missingInfo) {
        invalidFamilies.push({
          id: family.id,
          name: family.name,
          missing_info: missingInfo,
          expected_channel: targetChannel,
        });
      }
    }

    console.log('[VALIDATE] Final results:', { validFamilies, invalidFamilies });

    const result: ValidateRemindersResult = {
      valid_families: validFamilies,
      invalid_families: invalidFamilies,
      summary: {
        total: families.length,
        valid: validFamilies.length,
        invalid: invalidFamilies.length,
      },
    };

    const response: APIResponse<ValidateRemindersResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error validating reminders:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to validate reminders',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
