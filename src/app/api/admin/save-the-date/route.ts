/**
 * Wedding Admin - Send Save the Date API Route
 *
 * POST /api/admin/save-the-date - Send save the date messages to families
 *
 * Features:
 * - Sends save the date messages before formal invitations
 * - Creates TrackingEvents with event_type='SAVE_THE_DATE_SENT'
 * - Only sends to families who haven't received save the date or invitation
 * - Respects save_the_date_enabled setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { sendSaveTheDateBulk } from '@/lib/notifications/save-the-date';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for send save the date request
const sendSaveTheDateSchema = z.object({
  family_ids: z.array(z.string()).optional(),
});

interface SendSaveTheDateResponse extends APIResponse {
  data?: {
    sent_count: number;
    failed_count: number;
    recipient_families: string[];
    errors?: { family_id: string; error: string }[];
  };
}

/**
 * POST /api/admin/save-the-date
 * Send save the date to families
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
    const { family_ids } = sendSaveTheDateSchema.parse(body);

    // Get wedding details
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        id: true,
        save_the_date_enabled: true,
      },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if save the date is enabled
    if (!wedding.save_the_date_enabled) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Save the date feature is not enabled for this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Find eligible families
    const familiesQuery = await prisma.family.findMany({
      where: {
        wedding_id: user.wedding_id,
        ...(family_ids && family_ids.length > 0 ? { id: { in: family_ids } } : {}),
        // Only families that haven't received save the date
        save_the_date_sent: null,
      },
      include: {
        members: {
          select: {
            attending: true,
          },
        },
        tracking_events: {
          where: {
            event_type: 'INVITATION_SENT',
          },
          select: {
            id: true,
          },
        },
      },
    });

    // Filter out families that already received invitations
    const eligibleFamilies = familiesQuery.filter(
      (family) => family.tracking_events.length === 0
    );

    if (eligibleFamilies.length === 0) {
      const response: SendSaveTheDateResponse = {
        success: true,
        data: {
          sent_count: 0,
          failed_count: 0,
          recipient_families: [],
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Send save the date messages
    const result = await sendSaveTheDateBulk(
      eligibleFamilies.map((family) => ({
        family_id: family.id,
        wedding_id: user.wedding_id!,
        admin_id: user.id,
      }))
    );

    const response: SendSaveTheDateResponse = {
      success: true,
      data: {
        sent_count: result.successful,
        failed_count: result.failed,
        recipient_families: eligibleFamilies
          .filter((f) => !result.errors.some((e) => e.family_id === f.id))
          .map((f) => f.id),
        errors: result.errors,
      },
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
    console.error('Error sending save the date:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to send save the date',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
