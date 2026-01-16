/**
 * Wedding Admin - Guest Additions API Route
 *
 * GET /api/admin/guest-additions - List guest-added family members
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse, ListGuestAdditionsResponse } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';

/**
 * GET /api/admin/guest-additions
 * List all family members added by guests
 */
export async function GET() {
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

    // Check if guest additions are enabled for this wedding
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { allow_guest_additions: true },
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

    // If guest additions are disabled, return empty list with message
    if (!wedding.allow_guest_additions) {
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
          wedding_id: user.wedding_id,
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
        wedding_id: user.wedding_id,
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
        wedding_id: user.wedding_id,
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
          message: 'Wedding admin role required',
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
