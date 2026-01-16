/**
 * Tracking Service
 *
 * Centralized event tracking for guest interactions and admin actions.
 * Creates TrackingEvent records for analytics and notifications.
 */

import { prisma } from '@/lib/db/prisma';
import type { EventType, Channel } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrackEventOptions {
  family_id: string;
  wedding_id: string;
  event_type: EventType;
  channel?: Channel;
  metadata?: Record<string, unknown>;
  admin_triggered?: boolean;
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track an event in the system
 * Creates a TrackingEvent record with all relevant data
 *
 * @param options - Event tracking options
 * @returns The created tracking event
 */
export async function trackEvent(options: TrackEventOptions) {
  const {
    family_id,
    wedding_id,
    event_type,
    channel,
    metadata,
    admin_triggered = false,
  } = options;

  try {
    const event = await prisma.trackingEvent.create({
      data: {
        family_id,
        wedding_id,
        event_type,
        channel: channel || null,
        metadata: metadata || null,
        admin_triggered,
      },
    });

    return event;
  } catch (error) {
    // Log error but don't throw - tracking failures shouldn't break user flow
    console.error('Failed to track event:', error);
    return null;
  }
}

/**
 * Track link opened event
 * Helper for tracking when a guest opens their magic link
 */
export async function trackLinkOpened(
  family_id: string,
  wedding_id: string,
  channel?: Channel
) {
  return trackEvent({
    family_id,
    wedding_id,
    event_type: 'LINK_OPENED',
    channel,
  });
}

/**
 * Track RSVP submitted event
 * Helper for tracking when a guest submits their RSVP
 */
export async function trackRSVPSubmitted(
  family_id: string,
  wedding_id: string,
  channel?: Channel,
  metadata?: Record<string, unknown>
) {
  return trackEvent({
    family_id,
    wedding_id,
    event_type: 'RSVP_SUBMITTED',
    channel,
    metadata,
  });
}

/**
 * Track guest added event
 * Helper for tracking when a guest adds a new family member
 */
export async function trackGuestAdded(
  family_id: string,
  wedding_id: string,
  member_name: string
) {
  return trackEvent({
    family_id,
    wedding_id,
    event_type: 'GUEST_ADDED',
    metadata: { member_name },
  });
}
