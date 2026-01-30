/**
 * Guest Engagement Analytics
 * Helper functions to aggregate and display guest engagement data
 */

import { prisma } from '@/lib/db/prisma';
import type { Channel } from '@prisma/client';

export interface EngagementStep {
  status: 'pending' | 'completed';
  timestamp?: Date;
  channel?: Channel;
}

export interface GuestEngagement {
  family_id: string;
  family_name: string;
  invited: EngagementStep;
  delivered: EngagementStep;
  read: EngagementStep;
  link_opened: EngagementStep;
  rsvp_confirmed: EngagementStep;
  completion_percentage: number;
}

/**
 * Get full engagement status for a family
 * Returns timeline of all engagement events
 */
export async function getGuestEngagementStatus(
  family_id: string,
  wedding_id: string
): Promise<GuestEngagement | null> {
  try {
    // Fetch family name
    const family = await prisma.family.findUnique({
      where: { id: family_id },
      select: { id: true, name: true },
    });

    if (!family) {
      return null;
    }

    // Fetch all tracking events for this family
    const events = await prisma.trackingEvent.findMany({
      where: {
        family_id,
        wedding_id,
      },
      orderBy: { timestamp: 'asc' },
      select: {
        event_type: true,
        channel: true,
        timestamp: true,
      },
    });

    // Build engagement timeline
    const eventMap = new Map<string, { timestamp: Date; channel?: Channel }>();

    for (const event of events) {
      // Get the first occurrence of each event type (earliest timestamp)
      if (!eventMap.has(event.event_type)) {
        eventMap.set(event.event_type, {
          timestamp: event.timestamp,
          channel: event.channel || undefined,
        });
      }
    }

    // Build engagement object
    const engagement: GuestEngagement = {
      family_id,
      family_name: family.name,
      invited: eventMap.has('INVITATION_SENT')
        ? { status: 'completed', ...eventMap.get('INVITATION_SENT') }
        : { status: 'pending' },
      delivered: eventMap.has('MESSAGE_DELIVERED')
        ? { status: 'completed', ...eventMap.get('MESSAGE_DELIVERED') }
        : { status: 'pending' },
      read: eventMap.has('MESSAGE_READ')
        ? { status: 'completed', ...eventMap.get('MESSAGE_READ') }
        : { status: 'pending' },
      link_opened: eventMap.has('LINK_OPENED')
        ? { status: 'completed', ...eventMap.get('LINK_OPENED') }
        : { status: 'pending' },
      rsvp_confirmed: eventMap.has('RSVP_SUBMITTED')
        ? { status: 'completed', ...eventMap.get('RSVP_SUBMITTED') }
        : { status: 'pending' },
      completion_percentage: 0,
    };

    // Calculate completion percentage (5 steps total)
    const completedSteps = [
      engagement.invited,
      engagement.delivered,
      engagement.read,
      engagement.link_opened,
      engagement.rsvp_confirmed,
    ].filter((step) => step.status === 'completed').length;

    engagement.completion_percentage = Math.round((completedSteps / 5) * 100);

    return engagement;
  } catch (error) {
    console.error('[ENGAGEMENT] Error getting engagement status:', error);
    throw error;
  }
}

/**
 * Get engagement statistics for all families in a wedding
 * Useful for analytics dashboard
 */
export async function getWeddingEngagementStats(wedding_id: string) {
  try {
    const families = await prisma.family.findMany({
      where: { wedding_id },
      select: { id: true, name: true },
    });

    const engagements = await Promise.all(
      families.map((family) => getGuestEngagementStatus(family.id, wedding_id))
    );

    // Filter out null results
    const validEngagements = engagements.filter((e) => e !== null) as GuestEngagement[];

    // Calculate aggregate stats
    const stats = {
      total_families: validEngagements.length,
      invited_count: validEngagements.filter((e) => e.invited.status === 'completed').length,
      delivered_count: validEngagements.filter((e) => e.delivered.status === 'completed').length,
      read_count: validEngagements.filter((e) => e.read.status === 'completed').length,
      link_opened_count: validEngagements.filter((e) => e.link_opened.status === 'completed')
        .length,
      rsvp_confirmed_count: validEngagements.filter((e) => e.rsvp_confirmed.status === 'completed')
        .length,
      average_completion_percentage: Math.round(
        validEngagements.reduce((sum, e) => sum + e.completion_percentage, 0) /
          validEngagements.length
      ),
      engagements: validEngagements,
    };

    return stats;
  } catch (error) {
    console.error('[ENGAGEMENT] Error getting wedding engagement stats:', error);
    throw error;
  }
}

/**
 * Get channel-specific read rates
 * Compares MESSAGE_READ vs MESSAGE_SENT events by channel
 */
export async function getChannelReadRates(wedding_id: string) {
  try {
    const channels = ['WHATSAPP', 'SMS', 'EMAIL'] as const;
    const readRates = await Promise.all(
      channels.map(async (channel) => {
        const sentCount = await prisma.trackingEvent.count({
          where: {
            wedding_id,
            channel: channel as Channel,
            event_type: 'INVITATION_SENT',
          },
        });

        const readCount = await prisma.trackingEvent.count({
          where: {
            wedding_id,
            channel: channel as Channel,
            event_type: 'MESSAGE_READ',
          },
        });

        const deliveredCount = await prisma.trackingEvent.count({
          where: {
            wedding_id,
            channel: channel as Channel,
            event_type: 'MESSAGE_DELIVERED',
          },
        });

        const failedCount = await prisma.trackingEvent.count({
          where: {
            wedding_id,
            channel: channel as Channel,
            event_type: 'MESSAGE_FAILED',
          },
        });

        return {
          channel,
          sent_count: sentCount,
          delivered_count: deliveredCount,
          read_count: readCount,
          failed_count: failedCount,
          delivery_rate:
            sentCount > 0 ? Math.round(((sentCount - failedCount) / sentCount) * 100) : 0,
          read_rate: deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0,
        };
      })
    );

    return readRates;
  } catch (error) {
    console.error('[ENGAGEMENT] Error getting channel read rates:', error);
    throw error;
  }
}

/**
 * Get families with unread messages
 * Useful for identifying engagement gaps
 */
export async function getFamiliesWithUnreadMessages(wedding_id: string) {
  try {
    // Get all families with INVITATION_SENT but no MESSAGE_READ
    const families = await prisma.family.findMany({
      where: {
        wedding_id,
      },
    });

    // Get tracking events for families with INVITATION_SENT
    const familiesWithEvents = await Promise.all(
      families.map(async (family) => {
        const events = await prisma.trackingEvent.findMany({
          where: {
            family_id: family.id,
            event_type: {
              in: ['INVITATION_SENT', 'MESSAGE_READ', 'MESSAGE_DELIVERED'],
            },
          },
          orderBy: { timestamp: 'asc' },
          select: {
            event_type: true,
            timestamp: true,
            channel: true,
          },
        });

        return { ...family, events };
      })
    );

    // Filter to only those with INVITATION_SENT but no MESSAGE_READ
    const unreadFamilies = familiesWithEvents
      .filter((family) => {
        const hasInvitation = family.events.some((e) => e.event_type === 'INVITATION_SENT');
        const hasRead = family.events.some((e) => (e.event_type as string) === 'MESSAGE_READ');
        return hasInvitation && !hasRead;
      })
      .map((family) => {
        const invitationEvent = family.events.find(
          (e: { event_type: string; timestamp: Date; channel: Channel | null }) => e.event_type === 'INVITATION_SENT'
        );
        const deliveredEvent = family.events.find(
          (e: { event_type: string; timestamp: Date; channel: Channel | null }) => e.event_type === 'MESSAGE_DELIVERED'
        );

        return {
          family_id: family.id,
          family_name: family.name,
          channel_preference: family.channel_preference,
          invitation_sent_at: invitationEvent?.timestamp,
          delivered_at: deliveredEvent?.timestamp,
          days_since_sent: invitationEvent
            ? Math.floor((Date.now() - invitationEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
        };
      });

    return unreadFamilies;
  } catch (error) {
    console.error('[ENGAGEMENT] Error getting families with unread messages:', error);
    throw error;
  }
}
