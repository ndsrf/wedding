/**
 * Wedding Admin - Export Notifications API Route
 *
 * POST /api/admin/notifications/export - Export filtered notifications to Excel/CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

// Validation schema for export request
const exportNotificationsSchema = z.object({
  format: z.enum(['excel', 'csv']).default('excel'),
  filters: z
    .object({
      family_id: z.string().uuid().optional(),
      event_type: z
        .enum([
          'LINK_OPENED',
          'RSVP_STARTED',
          'RSVP_SUBMITTED',
          'RSVP_UPDATED',
          'GUEST_ADDED',
          'PAYMENT_RECEIVED',
          'REMINDER_SENT',
        ])
        .optional(),
      channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
      date_from: z.string().datetime().optional(),
      date_to: z.string().datetime().optional(),
    })
    .optional(),
});

/**
 * POST /api/admin/notifications/export
 * Export filtered notifications to Excel or CSV
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
    const { format, filters } = exportNotificationsSchema.parse(body);

    // Build where clause for filtering
    const whereClause: Prisma.TrackingEventWhereInput = {
      wedding_id: user.wedding_id,
    };

    if (filters?.family_id) {
      whereClause.family_id = filters.family_id;
    }

    if (filters?.event_type) {
      whereClause.event_type = filters.event_type;
    }

    if (filters?.channel) {
      whereClause.channel = filters.channel;
    }

    if (filters?.date_from || filters?.date_to) {
      whereClause.timestamp = {};
      if (filters.date_from) {
        whereClause.timestamp.gte = new Date(filters.date_from);
      }
      if (filters.date_to) {
        whereClause.timestamp.lte = new Date(filters.date_to);
      }
    }

    // Fetch all matching events
    const events = await prisma.trackingEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      include: {
        family: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform to export format
    const exportData = events.map((event) => ({
      Date: event.timestamp.toISOString(),
      'Event Type': event.event_type,
      'Family Name': event.family.name,
      'Family Email': event.family.email || '',
      Channel: event.channel || '',
      'Admin Triggered': event.admin_triggered ? 'Yes' : 'No',
      Details: JSON.stringify(event.metadata || {}),
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Date
      { wch: 20 }, // Event Type
      { wch: 25 }, // Family Name
      { wch: 30 }, // Family Email
      { wch: 12 }, // Channel
      { wch: 15 }, // Admin Triggered
      { wch: 50 }, // Details
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notifications');

    // Generate buffer based on format
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      buffer = Buffer.from(csvData, 'utf-8');
      contentType = 'text/csv';
      filename = `notifications-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `notifications-${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
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
    console.error('Error exporting notifications:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to export notifications',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
