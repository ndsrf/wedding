/**
 * Alert System — delivery dispatcher
 *
 * Sends one AlertDelivery via the appropriate channel (email/SMS/WhatsApp)
 * and updates its status in the database.
 *
 * This module is intentionally stateless: it receives a fully-loaded
 * AlertDelivery row and writes the result back to the DB.
 */

import { prisma } from '@/lib/db/prisma';
import { sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage, MessageType } from '@/lib/sms/twilio';
import type { AlertDelivery } from '@prisma/client';

const RETRY_DELAYS_MINUTES = [5, 15, 60]; // backoff per attempt

/**
 * Dispatch a single AlertDelivery.
 * Updates the delivery row to reflect the outcome.
 * Never throws — errors are captured and stored in last_error.
 */
export async function dispatchDelivery(delivery: AlertDelivery): Promise<void> {
  // Mark as SENDING to prevent double-processing by concurrent cron runs
  const result = await prisma.alertDelivery.updateMany({
    where: { id: delivery.id, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'SENDING', attempts: { increment: 1 }, updated_at: new Date() },
  });

  if (result.count === 0) return;

  let success = false;
  let externalId: string | undefined;
  let errorMessage: string | undefined;

  try {
    // Fetch parent alert to get planner/wedding context for license checks
    const deliveryWithAlert = await prisma.alertDelivery.findUnique({
      where: { id: delivery.id },
      include: { alert: true },
    });

    if (!deliveryWithAlert?.alert) {
      throw new Error('Associated alert not found');
    }

    const { planner_id: plannerId, wedding_id: weddingId } = deliveryWithAlert.alert;

    switch (delivery.channel) {
      case 'EMAIL': {
        if (!delivery.recipient_email) {
          errorMessage = 'No email address for recipient';
          break;
        }
        const platformName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME ?? 'Nupci';
        const result = await sendDynamicEmail(
          delivery.recipient_email,
          delivery.subject ?? '(No subject)',
          delivery.body,
          delivery.recipient_language.toLowerCase() as import('@/lib/i18n/config').Language,
          platformName,
          null,
          plannerId || undefined,
          weddingId || undefined,
        );
        success = result.success;
        externalId = result.messageId;
        errorMessage = result.error;
        break;
      }

      case 'SMS': {
        if (!delivery.recipient_phone) {
          errorMessage = 'No phone number for recipient';
          break;
        }
        const result = await sendDynamicMessage(
          delivery.recipient_phone,
          delivery.body,
          MessageType.SMS,
          undefined,
          plannerId || undefined,
          weddingId || undefined,
        );
        success = result.success;
        externalId = result.messageId;
        errorMessage = result.error;
        break;
      }

      case 'WHATSAPP': {
        const phone = delivery.recipient_phone; // whatsapp number stored in recipient_phone
        if (!phone) {
          errorMessage = 'No WhatsApp number for recipient';
          break;
        }
        const result = await sendDynamicMessage(
          phone,
          delivery.body,
          MessageType.WHATSAPP,
          undefined,
          plannerId || undefined,
          weddingId || undefined,
        );
        success = result.success;
        externalId = result.messageId;
        errorMessage = result.error;
        break;
      }

      default:
        errorMessage = `Unsupported channel: ${delivery.channel}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    success = false;
  }

  const now = new Date();
  const attempts = delivery.attempts + 1; // already incremented above in DB but use local copy for logic
  const canRetry = !success && attempts < delivery.max_attempts;
  const delayMinutes = RETRY_DELAYS_MINUTES[attempts - 1] ?? 60;

  await prisma.alertDelivery.update({
    where: { id: delivery.id },
    data: {
      status: success ? 'SENT' : canRetry ? 'FAILED' : 'FAILED',
      external_id: externalId ?? null,
      sent_at: success ? now : null,
      failed_at: success ? null : now,
      last_error: errorMessage ?? null,
      next_retry_at: canRetry
        ? new Date(now.getTime() + delayMinutes * 60 * 1000)
        : null,
      updated_at: now,
    },
  });

  if (success) {
    console.log(
      `[ALERT] Delivered ${delivery.channel} to ${delivery.recipient_name ?? delivery.recipient_id} (delivery ${delivery.id})`,
    );
  } else {
    console.warn(
      `[ALERT] Failed ${delivery.channel} to ${delivery.recipient_name ?? delivery.recipient_id}: ${errorMessage} — attempts ${attempts}/${delivery.max_attempts}`,
    );
  }
}
