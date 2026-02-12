/**
 * Wedding Planner - Guest Additions API Route
 *
 * GET /api/planner/weddings/:id/guest-additions - List guest-added family members
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, ListGuestAdditionsResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true, allow_guest_additions: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true, allow_guest_additions: wedding.allow_guest_additions };
}

/**
 * GET /api/planner/weddings/:id/guest-additions
 * List all family members added by guests
 */
export async function GET(
  _request: NextRequest,
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

    // If guest additions are disabled, return empty list with message
    if (!accessCheck.allow_guest_additions) {
      const response: ListGuestAdditionsResponse = {
        success: true,
        data: [],
        meta: {
          message: 'Guest additions are disabled for this wedding',
          feature_enabled: false,
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Find all family members added by guests
    const guestAddedMembers = await prisma.familyMember.findMany({
      where: {
        added_by_guest: true,
        family: {
          wedding_id: weddingId,
        },
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Get tracking events for when members were added
    const memberIds = guestAddedMembers.map((m) => m.id);
    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        wedding_id: weddingId,
        event_type: 'GUEST_ADDED',
      },
      orderBy: { timestamp: 'desc' },
    });

    // Create a map of member additions with their tracking info
    const memberTrackingMap = new Map<string, { timestamp: Date }>();
    trackingEvents.forEach((event) => {
      const metadata = event.metadata as { member_id?: string } | null;
      if (metadata?.member_id && memberIds.includes(metadata.member_id)) {
        if (!memberTrackingMap.has(metadata.member_id)) {
          memberTrackingMap.set(metadata.member_id, { timestamp: event.timestamp });
        }
      }
    });

    // Check which members have been "reviewed" (have a notification marked as read)
    const reviewedNotifications = await prisma.notification.findMany({
      where: {
        wedding_id: weddingId,
        event_type: 'GUEST_ADDED',
        read: true,
      },
    });

    const reviewedMemberIds = new Set<string>();
    reviewedNotifications.forEach((notification) => {
      const details = notification.details as { member_id?: string } | null;
      if (details?.member_id) {
        reviewedMemberIds.add(details.member_id);
      }
    });

    // Transform to response format
    const guestAdditions = guestAddedMembers.map((member) => ({
      id: member.id,
      family_id: member.family_id,
      name: member.name,
      type: member.type,
      attending: member.attending,
      age: member.age,
      dietary_restrictions: member.dietary_restrictions,
      accessibility_needs: member.accessibility_needs,
      added_by_guest: member.added_by_guest,
      table_id: member.table_id,
      seating_group: member.seating_group,
      created_at: member.created_at,
      // Extended fields
      family_name: member.family.name,
      is_new: !reviewedMemberIds.has(member.id),
    }));

    const response: ListGuestAdditionsResponse = {
      success: true,
      data: guestAdditions,
      meta: {
        feature_enabled: true,
        total_additions: guestAdditions.length,
        new_additions: guestAdditions.filter((a) => a.is_new).length,
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
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching guest additions:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch guest additions',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
