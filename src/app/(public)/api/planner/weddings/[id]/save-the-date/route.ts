/**
 * Wedding Planner - Send Save the Date API Route
 *
 * POST /api/planner/weddings/:id/save-the-date - Send save the date messages to families
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
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PREFERRED']).optional(),
});

interface SendSaveTheDateResponse extends APIResponse {
  data?: {
    sent_count: number;
    failed_count: number;
    recipient_families: string[];
    errors?: { family_id: string; error: string }[];
    wa_links?: { family_name: string; wa_link: string }[];
  };
}

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
 * POST /api/planner/weddings/:id/save-the-date
 * Send save the date to families
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
    const { family_ids, channel } = sendSaveTheDateSchema.parse(body);

    // Get wedding details
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
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
        wedding_id: weddingId,
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
        wedding_id: weddingId,
        admin_id: user.id,
        channel,
      }))
    );

    // Map waLinks family_ids to family names
    const waLinksWithNames = result.waLinks.map((wl) => {
      const family = eligibleFamilies.find((f) => f.id === wl.family_id);
      return { family_name: family?.name || wl.family_id, wa_link: wl.waLink };
    });

    const response: SendSaveTheDateResponse = {
      success: true,
      data: {
        sent_count: result.successful,
        failed_count: result.failed,
        recipient_families: eligibleFamilies
          .filter((f) => !result.errors.some((e) => e.family_id === f.id))
          .map((f) => f.id),
        errors: result.errors,
        ...(waLinksWithNames.length > 0 && { wa_links: waLinksWithNames }),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
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
