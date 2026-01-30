/**
 * Twilio Webhook Status Callback
 * Receives delivery and read receipt updates for SMS and WhatsApp messages
 *
 * POST /api/webhooks/twilio/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  validateTwilioSignature,
  mapTwilioStatusToEventType,
  type MessageStatus,
} from '@/lib/webhooks/twilio-validator';

export const runtime = 'nodejs';

/**
 * Handle Twilio status callback webhook
 * Validates signature and creates tracking events for message status changes
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw URL with query parameters
    const url = request.url;

    // Get form data from request
    const formData = await request.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = value as string;
    }

    // Get signature from headers
    const signature = request.headers.get('x-twilio-signature');

    // Validate Twilio signature
    if (!signature) {
      console.warn('[TWILIO_WEBHOOK] Missing X-Twilio-Signature header');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Validate signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[TWILIO_WEBHOOK] TWILIO_AUTH_TOKEN not configured');
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const isValid = validateTwilioSignature(url, params, signature, authToken);

    if (!isValid) {
      console.warn('[TWILIO_WEBHOOK] Invalid Twilio signature', {
        messageSid: params.MessageSid,
        status: params.MessageStatus,
      });
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // Extract relevant fields
    const messageSid = params.MessageSid;
    const messageStatus = (params.MessageStatus || '').toLowerCase() as MessageStatus;

    console.log('[TWILIO_WEBHOOK] Received status callback', {
      messageSid,
      messageStatus,
      to: params.To,
      timestamp: new Date().toISOString(),
    });

    // Map status to our event type
    const eventType = mapTwilioStatusToEventType(messageStatus);

    // Ignore statuses that don't map to events
    if (!eventType) {
      console.log('[TWILIO_WEBHOOK] Ignoring status:', messageStatus);
      return NextResponse.json({ success: true });
    }

    if (!messageSid) {
      console.warn('[TWILIO_WEBHOOK] Missing MessageSid');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Find the original tracking event by message_sid
    const originalEvent = await prisma.trackingEvent.findFirst({
      where: {
        metadata: {
          path: ['message_sid'],
          equals: messageSid,
        },
      },
      select: {
        id: true,
        family_id: true,
        wedding_id: true,
        channel: true,
        metadata: true,
      },
    });

    if (!originalEvent) {
      console.warn('[TWILIO_WEBHOOK] Original message not found for SID:', messageSid);
      // Return 200 to acknowledge receipt (prevent Twilio from retrying)
      return NextResponse.json({ success: true });
    }

    // Check for duplicate status event (idempotency)
    const existingStatusEvent = await prisma.trackingEvent.findFirst({
      where: {
        family_id: originalEvent.family_id,
        wedding_id: originalEvent.wedding_id,
        event_type: eventType!,
        metadata: {
          path: ['message_sid'],
          equals: messageSid,
        },
      },
    });

    if (existingStatusEvent) {
      console.log('[TWILIO_WEBHOOK] Status event already exists for SID:', messageSid);
      return NextResponse.json({ success: true });
    }

    // Validate family and wedding still exist
    const family = await prisma.family.findUnique({
      where: { id: originalEvent.family_id },
      select: { id: true, name: true },
    });

    if (!family) {
      console.warn('[TWILIO_WEBHOOK] Family not found:', originalEvent.family_id);
      return NextResponse.json({ success: true });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: originalEvent.wedding_id },
      select: { id: true },
    });

    if (!wedding) {
      console.warn('[TWILIO_WEBHOOK] Wedding not found:', originalEvent.wedding_id);
      return NextResponse.json({ success: true });
    }

    // Create status tracking event
    const statusEvent = await prisma.trackingEvent.create({
      data: {
        family_id: originalEvent.family_id,
        wedding_id: originalEvent.wedding_id,
        event_type: eventType!,
        channel: originalEvent.channel,
        metadata: {
          message_sid: messageSid,
          original_event_id: originalEvent.id,
          original_event_type: (originalEvent.metadata as unknown as Record<string, unknown>)?.template_type || 'UNKNOWN',
          error_code: params.ErrorCode,
          error_message: params.ErrorMessage,
        },
        admin_triggered: false,
      },
    });

    console.log('[TWILIO_WEBHOOK] Created status event', {
      eventId: statusEvent.id,
      eventType: statusEvent.event_type,
      familyId: originalEvent.family_id,
      familyName: family.name,
      messageSid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TWILIO_WEBHOOK] Error processing webhook:', error);
    // Return 200 to acknowledge receipt and prevent Twilio from retrying
    // Errors logged will be visible in the application logs
    return NextResponse.json({ success: true });
  }
}
