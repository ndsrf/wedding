/**
 * Tracking Service
 *
 * Centralized event tracking for guest interactions and admin actions.
 * Creates TrackingEvent records for analytics and notifications.
 */

import { prisma } from '@/lib/db/prisma';
import type { EventType, Channel, Prisma } from '@prisma/client';

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
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
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

/**
 * Track payment received event
 * Helper for tracking when a payment is received from a family
 */
export async function trackPaymentReceived(
  family_id: string,
  wedding_id: string,
  amount: number,
  metadata?: Record<string, unknown>
) {
  return trackEvent({
    family_id,
    wedding_id,
    event_type: 'PAYMENT_RECEIVED',
    metadata: { amount, ...metadata },
  });
}

/**
 * Track reminder sent event
 * Helper for tracking when a reminder is sent to a family
 */
export async function trackReminderSent(
  family_id: string,
  wedding_id: string,
  channel: Channel,
  admin_id?: string
) {
  return trackEvent({
    family_id,
    wedding_id,
    event_type: 'REMINDER_SENT',
    channel,
    metadata: admin_id ? { admin_id } : undefined,
    admin_triggered: true,
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export interface EventFilter {
  wedding_id: string; // Required for multi-tenancy
  family_id?: string;
  event_type?: EventType[];
  channel?: Channel;
  date_from?: Date;
  date_to?: Date;
}

/**
 * Get events with filtering
 * Query TrackingEvent records with various filters
 *
 * @param filter - Event filter options (wedding_id is required)
 * @returns Array of tracking events sorted by timestamp descending
 */
export async function getEvents(filter: EventFilter) {
  const {
    wedding_id,
    family_id,
    event_type,
    channel,
    date_from,
    date_to,
  } = filter;

  try {
    const events = await prisma.trackingEvent.findMany({
      where: {
        wedding_id,
        ...(family_id && { family_id }),
        ...(event_type && event_type.length > 0 && { event_type: { in: event_type } }),
        ...(channel && { channel }),
        ...(date_from || date_to
          ? {
              timestamp: {
                ...(date_from && { gte: date_from }),
                ...(date_to && { lte: date_to }),
              },
            }
          : {}),
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    console.error('Failed to get events:', error);
    throw error;
  }
}
