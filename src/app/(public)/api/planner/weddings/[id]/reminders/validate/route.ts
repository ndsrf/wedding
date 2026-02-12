/**
 * Wedding Planner - Validate Reminders API Route
 *
 * POST /api/planner/weddings/:id/reminders/validate - Validate families have required contact information
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

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * POST /api/planner/weddings/:id/reminders/validate
 * Validate families have required contact information for selected channel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Parse and validate request body
    const body = await request.json();
    const { channel, family_ids } = validateRemindersSchema.parse(body);

    // Get all families to validate
    const families = await prisma.family.findMany({
      where: {
        wedding_id: weddingId,
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

    interface ValidFamily {
      id: string;
      name: string;
      channel: Channel;
    }

    interface InvalidFamily {
      id: string;
      name: string;
      missing_info: 'email' | 'phone' | 'whatsapp_number';
      expected_channel: Channel;
    }

    const validFamilies: ValidFamily[] = [];
    const invalidFamilies: InvalidFamily[] = [];

    // Validate each family
    for (const family of families) {
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

    const result = {
      valid_families: validFamilies,
      invalid_families: invalidFamilies,
      summary: {
        total: families.length,
        valid: validFamilies.length,
        invalid: invalidFamilies.length,
      },
    };

    const response: APIResponse = {
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
          message: 'Planner role required',
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
